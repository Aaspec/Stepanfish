import importlib
import os
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server

class SeaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.original = server.DB
        server.DB = os.path.join(self.tmp.name, 'test.db')
        server.init_db()

    def tearDown(self):
        server.DB = self.original
        self.tmp.cleanup()

    def sql(self, query, args=()):
        c = server.conn()
        result = c.execute(query, args).fetchall()
        c.commit(); c.close()
        return result

    def test_existing_save_migration(self):
        os.remove(server.DB)
        c = sqlite3.connect(server.DB)
        for name in ('schema.sql','seed.sql'):
            with open(os.path.join(server.BASE,'db',name), encoding='utf-8') as f:
                c.executescript(f.read())
        c.execute('UPDATE player SET money=4321,tutorial_done=1')
        c.execute('UPDATE player_bait SET qty=47 WHERE bait_id=1')
        c.execute('INSERT INTO catch(fish_id,location_id,weight_kg,kept,price) VALUES (1,1,0.5,1,100)')
        c.commit(); c.close()
        server.init_db(); server.init_db()
        state=server.get_state()
        self.assertEqual(state['money'],4321)
        self.assertEqual(state['baits']['worm'],47)
        self.assertEqual(state['inventory'][0]['n'],1)
        self.assertTrue(state['tutorial_done'])
        self.assertFalse(state['boat_owned'])
        self.assertEqual(len(server.get_config()['fish']),12)  # 10 прежних + налим и форель

    def test_purchase_insufficient_persistent_and_not_repeated(self):
        self.assertEqual(server.post_buy({'item':'boat'})[0],400)
        self.assertEqual(server.get_state()['money'],200)
        self.sql('UPDATE player SET money=6500')
        self.assertEqual(server.post_buy({'item':'boat'})[0],200)
        self.assertEqual(server.get_state()['money'],500)
        self.assertTrue(server.get_state()['boat_owned'])
        server.init_db()
        self.assertTrue(server.get_state()['boat_owned'])
        self.assertEqual(server.post_buy({'item':'boat'})[0],409)
        self.assertEqual(server.get_state()['money'],500)

    def test_sea_locked_and_species_exclusive(self):
        self.assertEqual(server.post_cast({'location':'sea','bait':'worm'})[0],403)
        self.assertEqual(server.get_state()['baits']['worm'],10)
        self.assertNotEqual(server.post_catch({'location':'sea','fish_id':7,'weight':1,'kept':True})[0],200)
        config=server.get_config()
        self.assertEqual(len(config['locations']),4)
        for f in config['fish']:
            self.assertEqual(f['locs']==['sea'], 7 <= f['id'] <= 10)  # налим и форель — пресноводные
            self.assertTrue(f['baits'])
        self.assertIn('shrimp',[b['code'] for b in config['baits']])

    def test_real_cast_catch_and_duplicate(self):
        self.sql('UPDATE player SET boat_owned=1,money=600')
        self.assertEqual(server.post_buy({'bait':'shrimp','qty':1})[0],200)
        with patch('server.time.time',return_value=1000):
            self.assertEqual(server.post_cast({'location':'sea','bait':'shrimp'})[0],200)
        catch={'location':'sea','fish_id':7,'weight':1,'kept':True}
        with patch('server.time.time',return_value=1011):
            self.assertEqual(server.post_catch(catch)[0],400)
        with patch('server.time.time',return_value=1012):
            self.assertEqual(server.post_catch(dict(catch,location='lake'))[0],400)
            self.assertEqual(server.post_catch(dict(catch,fish_id=1))[0],400)
            self.assertEqual(server.post_catch(dict(catch,weight=90))[0],400)
            self.assertEqual(server.post_catch(catch)[0],200)
            self.assertEqual(server.post_catch(catch)[0],400)
        self.assertEqual(server.get_state()['money'],760)
        self.assertEqual(server.get_state()['baits']['shrimp'],0)

    def test_three_minute_economy_upper_bound(self):
        config=server.get_config()
        highest=max(f['price'] for f in config['fish'] if 'sea' not in f['locs'])
        # Conservative bound: no bait costs, instant reeling, maximum fish every cast.
        self.assertLess(200+(180//config['min_catch_seconds'])*highest, config['boat_price'])
        self.sql('UPDATE player_bait SET qty=99 WHERE bait_id=1')
        with patch('server.time.time',return_value=0):
            server.post_cast({'location':'lake','bait':'worm'})
        with patch('server.time.time',return_value=1):
            self.assertEqual(server.post_catch({'location':'lake','fish_id':1,'weight':1,'kept':True})[0],400)

if __name__=='__main__':
    unittest.main()

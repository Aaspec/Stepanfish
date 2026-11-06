"""Изолированный браузерный стенд: не меняет настоящий игровой прогресс."""
import os
import sys
import tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import server
sandbox = tempfile.TemporaryDirectory(prefix='fishing-sea-')
server.DB = os.path.join(sandbox.name, 'test.db')
server.init_db()
c = server.conn()
c.execute('UPDATE player SET money=6000,tutorial_done=1')
c.execute('UPDATE player_bait SET qty=20')
c.commit(); c.close()
httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
print('Isolated sea test: http://127.0.0.1:%s' % httpd.server_port, flush=True)
httpd.serve_forever()

"""Идемпотентное расширение существующих сохранений морской рыбалкой."""
BOAT_PRICE = 6000
MIN_CATCH_SECONDS = 12

def migrate(c):
    columns = {r[1] for r in c.execute('PRAGMA table_info(player)')}
    if 'boat_owned' not in columns:
        c.execute('ALTER TABLE player ADD COLUMN boat_owned INTEGER NOT NULL DEFAULT 0')
    c.execute('''CREATE TABLE IF NOT EXISTS active_cast(
        id INTEGER PRIMARY KEY CHECK(id=1), location_id INTEGER NOT NULL,
        bait_id INTEGER NOT NULL, ready_at REAL NOT NULL)''')
    c.execute("INSERT OR IGNORE INTO location VALUES (4,'sea','Морская рыбалка','#7daec9','#e8eee9','#367e9e','#123e60',0,0)")
    c.execute("INSERT OR IGNORE INTO bait VALUES (5,'shrimp','Креветка',80)")
    c.execute('INSERT OR IGNORE INTO player_bait VALUES (5,0)')
    # times/weather: активность по времени суток и погоде (NULL — всегда); тунец охотится днём.
    c.executemany('INSERT OR IGNORE INTO fish VALUES (?,?,?,?,?,?,?,?,?,?)', [
        (7,'Скумбрия',0.4,2.0,2.5,0.45,'#79abb5',240,None,None),
        (8,'Треска',1.0,7.0,1.6,0.72,'#a29b76',420,None,None),
        (9,'Морской окунь',0.5,3.5,2.0,0.58,'#d18369',320,None,None),
        (10,'Тунец',3.0,15.0,0.65,0.95,'#537e9a',700,'day',None)])
    c.executemany('INSERT OR IGNORE INTO fish_location VALUES (?,4)', [(i,) for i in range(7,11)])
    c.executemany('INSERT OR IGNORE INTO fish_bait VALUES (?,?,?)', [
        (7,5,1),(7,4,0.7),(8,5,0.8),(9,5,1),(9,4,0.6),(10,4,0.4),(10,5,0.25)])
    c.commit()

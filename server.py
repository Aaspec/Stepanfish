"""Сервер игры «Рыбалка»: только стандартная библиотека Python 3.8+.
Запуск: python server.py  ->  http://localhost:8000"""
import json, os, sqlite3, time
from sea import migrate as migrate_sea, BOAT_PRICE, MIN_CATCH_SECONDS
import world
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, 'db', 'fishing.db')
STATIC = os.path.join(BASE, 'static')

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c

def init_db():
    fresh = not os.path.exists(DB)
    c = conn()
    if fresh:
        for name in ('schema.sql', 'seed.sql'):
            with open(os.path.join(BASE, 'db', name), encoding='utf-8') as f:
                c.executescript(f.read())
    migrate_sea(c)
    world.migrate(c)
    c.close()

# ---------- чтение ----------
def get_config():
    c = conn()
    locs = [{'id': r['id'], 'code': r['code'], 'name': r['name'],
             'sky': [r['sky_top'], r['sky_bottom']], 'water': [r['water_top'], r['water_bottom']],
             'current': bool(r['has_current']), 'forest': bool(r['has_forest'])}
            for r in c.execute('SELECT * FROM location ORDER BY id')]
    rods = [dict(r) for r in c.execute(
        'SELECT id,name,max_range AS rng,strength AS str,reel_speed AS spd FROM rod ORDER BY id')]
    baits = [dict(r) for r in c.execute('SELECT id,code,name,price FROM bait ORDER BY price')]
    fish = []
    for r in c.execute('SELECT * FROM fish ORDER BY price'):
        fish.append({'id': r['id'], 'name': r['name'], 'min': r['min_kg'], 'max': r['max_kg'],
                     'freq': r['bite_freq'], 'res': r['resistance'], 'color': r['color'], 'price': r['price'],
                     'times': r['times'].split(',') if r['times'] else None,
                     'weather': r['weather'].split(',') if r['weather'] else None,
                     'locs': [x['code'] for x in c.execute(
                         'SELECT l.code FROM fish_location fl JOIN location l ON l.id=fl.location_id WHERE fl.fish_id=?', (r['id'],))],
                     'baits': {x['code']: x['bite_weight'] for x in c.execute(
                         'SELECT b.code,fb.bite_weight FROM fish_bait fb JOIN bait b ON b.id=fb.bait_id WHERE fb.fish_id=?', (r['id'],))}})
    c.close()
    return {'locations': locs, 'rods': rods, 'baits': baits, 'fish': fish,
            'boat_price': BOAT_PRICE, 'min_catch_seconds': MIN_CATCH_SECONDS,
            'world': {'day_parts': [{'code': p, 'name': world.DAY_PART_NAMES[p]} for p in world.DAY_PARTS],
                      'day_part_seconds': world.DAY_PART_SECONDS,
                      'weathers': [{'code': w, 'name': world.WEATHER_NAMES[w]} for w in world.WEATHER_CODES]}}

def get_state():
    c = conn()
    p = c.execute('SELECT money,tutorial_done,boat_owned FROM player WHERE id=1').fetchone()
    baits = {r['code']: r['qty'] for r in c.execute(
        'SELECT b.code,pb.qty FROM player_bait pb JOIN bait b ON b.id=pb.bait_id')}
    inv = [dict(r) for r in c.execute(
        '''SELECT f.name, COUNT(*) n, ROUND(SUM(c.weight_kg),2) kg, MAX(c.weight_kg) best, SUM(c.price) earned
           FROM catch c JOIN fish f ON f.id=c.fish_id WHERE c.kept=1 GROUP BY f.id ORDER BY f.price''')]
    last = [dict(r) for r in c.execute(
        '''SELECT f.name fish, l.name location, c.weight_kg weight, c.kept, c.price, c.caught_at
           FROM catch c JOIN fish f ON f.id=c.fish_id JOIN location l ON l.id=c.location_id
           ORDER BY c.id DESC LIMIT 8''')]
    weather, weather_until = world.roll_weather(c)
    world.ensure_quests(c)
    now = time.time()
    quests = [{'id': q['id'], 'text': q['text'], 'goal': q['goal'], 'progress': q['progress'],
               'claimed': bool(q['claimed']),
               'reward': {'money': q['reward_money'], 'bait': q['reward_bait'], 'bait_qty': q['reward_bait_qty']}}
              for q in c.execute('SELECT * FROM quest ORDER BY id')]
    unlocked = {r['code']: r['unlocked_at'] for r in c.execute('SELECT * FROM achievement')}
    achievements = [{'code': code, 'name': name, 'hint': hint, 'unlocked_at': unlocked.get(code)}
                    for code, name, hint in world.ACHIEVEMENTS]
    diary = world.diary(c)
    c.close()
    return {'money': p['money'], 'tutorial_done': bool(p['tutorial_done']),
            'baits': baits, 'inventory': inv, 'last': last, 'boat_owned': bool(p['boat_owned']),
            'world': {'day_part': world.day_part(now), 'day_part_left': world.day_part_left(now),
                      'weather': weather, 'weather_left': max(0, int(weather_until - now))},
            'quests': quests, 'achievements': achievements, 'diary': diary}

# ---------- запись: каждая функция возвращает (http_code, json) ----------
def post_cast(d):                       # заброс: -1 наживка
    c = conn()
    c.execute('BEGIN IMMEDIATE')
    loc = c.execute('SELECT id,code FROM location WHERE code=?', (d.get('location'),)).fetchone()
    owned = c.execute('SELECT boat_owned FROM player WHERE id=1').fetchone()[0]
    if not loc or (loc['code'] == 'sea' and not owned):
        c.close(); return 403, {'ok': False, 'error': 'Для морской рыбалки необходимо приобрести лодку за 6 000 ₽.'}
    cur = c.execute('UPDATE player_bait SET qty=qty-1 WHERE qty>0 AND bait_id=(SELECT id FROM bait WHERE code=?)', (d.get('bait'),))
    if cur.rowcount != 1:
        c.close(); return 400, {'ok': False, 'error': 'Наживка закончилась'}
    c.execute('INSERT OR REPLACE INTO active_cast VALUES (1,?,?,?)',
              (loc['id'], c.execute('SELECT id FROM bait WHERE code=?', (d.get('bait'),)).fetchone()[0], time.time()+MIN_CATCH_SECONDS))
    c.commit(); c.close()
    return 200, {'ok': True}

def post_buy(d):
    n = int(d.get('qty', 1))
    c = conn()
    c.execute('BEGIN IMMEDIATE')
    if d.get('item') == 'boat':
        p = c.execute('SELECT money,boat_owned FROM player WHERE id=1').fetchone()
        if p['boat_owned']:
            c.close(); return 409, {'ok': False, 'error': 'Лодка уже приобретена'}
        if p['money'] < BOAT_PRICE:
            c.close(); return 400, {'ok': False, 'error': 'Не хватает денег: лодка стоит 6 000 ₽.'}
        c.execute('UPDATE player SET money=money-?,boat_owned=1 WHERE id=1', (BOAT_PRICE,))
        c.commit(); c.close()
        return 200, {'ok': True}
    b = c.execute('SELECT id,price FROM bait WHERE code=?', (d.get('bait'),)).fetchone()
    money = c.execute('SELECT money FROM player WHERE id=1').fetchone()['money']
    if not b or not 1 <= n <= 99 or money < b['price'] * n:
        c.close(); return 400, {'ok': False, 'error': 'Не хватает денег'}
    c.execute('UPDATE player SET money=money-? WHERE id=1', (b['price'] * n,))
    c.execute('UPDATE player_bait SET qty=qty+? WHERE bait_id=?', (n, b['id']))
    c.commit(); c.close()
    return 200, {'ok': True}

def post_catch(d):                      # «Забрать» -> деньги, «Отпустить» -> 0
    c = conn()
    c.execute('BEGIN IMMEDIATE')
    active = c.execute('SELECT * FROM active_cast WHERE id=1').fetchone()
    valid = c.execute('''SELECT 1 FROM fish_location fl JOIN location l ON l.id=fl.location_id
        JOIN fish_bait fb ON fb.fish_id=fl.fish_id WHERE fl.fish_id=? AND l.code=?
        AND fb.bait_id=? AND fl.location_id=?''',
        (d.get('fish_id'), d.get('location'), active['bait_id'] if active else -1,
         active['location_id'] if active else -1)).fetchone()
    owned = c.execute('SELECT boat_owned FROM player WHERE id=1').fetchone()[0]
    if not active or not valid or time.time() < active['ready_at'] or (d.get('location') == 'sea' and not owned):
        c.close(); return 400, {'ok': False, 'error': 'Улов не соответствует забросу или рыбалка ещё не завершена.'}
    f = c.execute('SELECT min_kg,max_kg,price FROM fish WHERE id=?', (d.get('fish_id'),)).fetchone()
    l = c.execute('SELECT id FROM location WHERE code=?', (d.get('location'),)).fetchone()
    w = float(d.get('weight', 0))
    if not f or not l or not (f['min_kg'] - 0.01 <= w <= f['max_kg'] + 0.01):
        c.close(); return 400, {'ok': False}
    kept = 1 if d.get('kept') else 0
    price = f['price'] if kept else 0
    c.execute('INSERT INTO catch(fish_id,location_id,weight_kg,kept,price,bait_id) VALUES (?,?,?,?,?,?)',
              (d['fish_id'], l['id'], round(w, 2), kept, price, active['bait_id']))
    c.execute('DELETE FROM active_cast WHERE id=1')
    c.execute('UPDATE player SET money=money+? WHERE id=1', (price,))
    # Прогресс ежедневных заданий и достижения считаются тем же уловом.
    world.quest_progress(c, d['fish_id'], w, active['bait_id'], d.get('location'))
    new_achievements = world.check_achievements(c)
    c.commit(); c.close()
    return 200, {'ok': True, 'price': price, 'new_achievements': new_achievements}

def post_quest_claim(d):                # забор награды выполненного задания
    c = conn()
    c.execute('BEGIN IMMEDIATE')
    q = c.execute('SELECT * FROM quest WHERE id=? AND day=?',
                  (d.get('id'), time.strftime('%Y-%m-%d'))).fetchone()
    if not q or q['claimed'] or q['progress'] < q['goal']:
        c.close(); return 400, {'ok': False, 'error': 'Задание ещё не выполнено'}
    c.execute('UPDATE quest SET claimed=1 WHERE id=?', (q['id'],))
    c.execute('UPDATE player SET money=money+? WHERE id=1', (q['reward_money'],))
    if q['reward_bait']:
        bait = c.execute('SELECT id FROM bait WHERE code=?', (q['reward_bait'],)).fetchone()
        if bait:
            c.execute('INSERT INTO player_bait(bait_id,qty) VALUES (?,0) ON CONFLICT(bait_id) DO NOTHING', (bait['id'],))
            c.execute('UPDATE player_bait SET qty=qty+? WHERE bait_id=?', (q['reward_bait_qty'], bait['id']))
    c.commit(); c.close()
    return 200, {'ok': True, 'money': q['reward_money'],
                 'bait': q['reward_bait'], 'bait_qty': q['reward_bait_qty']}

def post_tutorial(d):
    c = conn()
    c.execute('UPDATE player SET tutorial_done=? WHERE id=1', (1 if d.get('done') else 0,))
    c.commit(); c.close()
    return 200, {'ok': True}

POST = {'/api/cast': post_cast, '/api/buy': post_buy, '/api/catch': post_catch,
        '/api/quest/claim': post_quest_claim, '/api/tutorial': post_tutorial}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=STATIC, **kw)

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/config': return self.send_json(get_config())
        if self.path == '/api/state': return self.send_json(get_state())
        super().do_GET()

    def do_POST(self):
        fn = POST.get(self.path)
        if not fn:
            return self.send_json({'error': 'not found'}, 404)
        try:
            n = int(self.headers.get('Content-Length', 0))
            code, obj = fn(json.loads(self.rfile.read(n) or b'{}'))
        except (ValueError, KeyError, TypeError):
            code, obj = 400, {'ok': False}
        self.send_json(obj, code)

if __name__ == '__main__':
    init_db()
    print('Игра: http://localhost:8000')
    ThreadingHTTPServer(('', 8000), Handler).serve_forever()

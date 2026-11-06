"""Мир игры: время суток, погода, ежедневные задания, достижения, дневник."""
import random
import time

# Время суток: 4 части по 180 с, детерминированно из серверных часов —
# цикл продолжается между сессиями без записи в БД.
DAY_PARTS = ('morning', 'day', 'evening', 'night')
DAY_PART_NAMES = {'morning': 'Утро', 'day': 'День', 'evening': 'Вечер', 'night': 'Ночь'}
DAY_PART_SECONDS = 180

# Погода: хранится в world_state, перекатывается по истечении срока.
WEATHER_CODES = ('clear', 'rain', 'fog', 'wind')
WEATHER_NAMES = {'clear': 'Ясно', 'rain': 'Дождь', 'fog': 'Туман', 'wind': 'Ветер'}
WEATHER_WEIGHTS = {'clear': .40, 'rain': .25, 'fog': .20, 'wind': .15}
WEATHER_MIN_SECONDS, WEATHER_MAX_SECONDS = 120, 240

# Новые виды: налим клюёт только ночью, форель — только в дождь.
# Цена налима 300 ₽: экономики 200 + 15×300 за 3 минуты должно не хватать на лодку.
NEW_FISH = [
    (11, 'Налим', 1.0, 7.0, 1.2, 0.80, '#7d8a6e', 300, 'night', None),
    (12, 'Форель', 0.5, 4.0, 1.8, 0.62, '#8fa8b8', 350, None, 'rain'),
]
NEW_FISH_LOCATION = [(11, 1), (11, 2), (12, 2), (12, 3)]
NEW_FISH_BAIT = [(11, 2, 1), (11, 1, .7), (11, 4, .5), (12, 4, 1), (12, 2, .5), (12, 1, .4)]

# Мягкие ограничения существующих видов: id → части суток.
EXISTING_FISH_TIMES = {3: 'morning,evening', 5: 'morning,day', 10: 'day'}  # окунь, плотва, тунец

# Каталог ежедневных заданий: (kind, target, goal, text, money, bait_code, bait_qty)
QUEST_POOL = [
    ('species', '1', 3, 'Поймать 3 карасей', 200, 'maggot', 5),
    ('weight', '2.0', 1, 'Поймать рыбу тяжелее 2 кг', 300, 'corn', 5),
    ('bait', 'corn', 2, 'Поймать 2 рыбы на кукурузу', 250, 'worm', 6),
    ('total', None, 5, 'Поймать 5 рыб любого вида', 200, 'worm', 10),
    ('sea', None, 1, 'Поймать рыбу в море', 400, 'shrimp', 5),
    ('bait', 'spin', 1, 'Поймать рыбу на блесну', 220, 'spin', 3),
    ('bait', 'worm', 2, 'Поймать 2 рыбы на червя', 180, 'maggot', 4),
]
DAILY_QUEST_COUNT = 3

SEA_MASTER_FISH_ID = 10  # «Мастер моря» — поймать тунца

ACHIEVEMENTS = [
    ('first_catch', 'Первый улов', 'Поймать первую рыбу.'),
    ('hundred', '100 пойманных рыб', 'Поймать суммарно 100 рыб.'),
    ('sea_master', 'Мастер моря', 'Поймать тунца — самую крупную морскую рыбу.'),
    ('collector', 'Коллекционер', 'Поймать все виды рыб в игре.'),
]


def migrate(c):
    """Идемпотентное расширение существующих сохранений."""
    cols = {r[1] for r in c.execute('PRAGMA table_info(fish)')}
    if 'times' not in cols:
        c.execute('ALTER TABLE fish ADD COLUMN times TEXT')     # CSV частей суток; NULL — всегда
        c.execute('ALTER TABLE fish ADD COLUMN weather TEXT')   # CSV погод; NULL — всегда
    cols = {r[1] for r in c.execute('PRAGMA table_info(catch)')}
    if 'bait_id' not in cols:
        c.execute('ALTER TABLE catch ADD COLUMN bait_id INTEGER')  # приманка заброса, для заданий
    c.execute('''CREATE TABLE IF NOT EXISTS world_state(
        id INTEGER PRIMARY KEY CHECK(id=1),
        weather TEXT NOT NULL DEFAULT 'clear', weather_until REAL)''')
    c.execute('''CREATE TABLE IF NOT EXISTS quest(
        id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, kind TEXT NOT NULL,
        target TEXT, goal INTEGER NOT NULL, text TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0,
        reward_money INTEGER NOT NULL DEFAULT 0, reward_bait TEXT,
        reward_bait_qty INTEGER NOT NULL DEFAULT 0)''')
    c.execute('''CREATE TABLE IF NOT EXISTS achievement(
        code TEXT PRIMARY KEY, unlocked_at TEXT NOT NULL)''')
    c.execute("INSERT OR IGNORE INTO world_state VALUES (1,'clear',0)")
    c.executemany('INSERT OR IGNORE INTO fish VALUES (?,?,?,?,?,?,?,?,?,?)', NEW_FISH)
    c.executemany('INSERT OR IGNORE INTO fish_location VALUES (?,?)', NEW_FISH_LOCATION)
    c.executemany('INSERT OR IGNORE INTO fish_bait VALUES (?,?,?)', NEW_FISH_BAIT)
    for fish_id, times in EXISTING_FISH_TIMES.items():
        c.execute('UPDATE fish SET times=? WHERE id=? AND times IS NULL', (times, fish_id))
    c.commit()


# ---------- время суток ----------
def day_part(now=None):
    now = time.time() if now is None else now
    return DAY_PARTS[int(now // DAY_PART_SECONDS) % len(DAY_PARTS)]


def day_part_left(now=None):
    now = time.time() if now is None else now
    return DAY_PART_SECONDS - int(now % DAY_PART_SECONDS)


# ---------- погода ----------
def roll_weather(c, now=None):
    """Возвращает (код погоды, время окончания); перекатывает истёкшую погоду."""
    now = time.time() if now is None else now
    row = c.execute('SELECT weather, weather_until FROM world_state WHERE id=1').fetchone()
    if row and row['weather_until'] and row['weather_until'] > now:
        return row['weather'], row['weather_until']
    weather = random.choices(WEATHER_CODES, weights=[WEATHER_WEIGHTS[w] for w in WEATHER_CODES])[0]
    until = now + random.randint(WEATHER_MIN_SECONDS, WEATHER_MAX_SECONDS)
    c.execute('INSERT OR REPLACE INTO world_state VALUES (1,?,?)', (weather, until))
    c.commit()
    return weather, until


# ---------- ежедневные задания ----------
def ensure_quests(c, today=None):
    """Генерирует 3 случайных задания на сегодняшний день, старые дни удаляет."""
    today = time.strftime('%Y-%m-%d') if today is None else today
    c.execute('DELETE FROM quest WHERE day != ?', (today,))
    if c.execute('SELECT COUNT(*) FROM quest WHERE day=?', (today,)).fetchone()[0]:
        return
    for kind, target, goal, text, money, bait, qty in random.sample(QUEST_POOL, DAILY_QUEST_COUNT):
        c.execute('''INSERT INTO quest(day,kind,target,goal,text,reward_money,reward_bait,reward_bait_qty)
                     VALUES (?,?,?,?,?,?,?,?)''', (today, kind, target, goal, text, money, bait, qty))
    c.commit()


def quest_progress(c, fish_id, weight, bait_id, location_code, today=None):
    """Двигает прогресс сегодняшних заданий после улова (без commit — внутри post_catch)."""
    today = time.strftime('%Y-%m-%d') if today is None else today
    for q in c.execute('SELECT * FROM quest WHERE day=? AND claimed=0', (today,)).fetchall():
        kind, target = q['kind'], q['target']
        if kind == 'total':
            inc = 1
        elif kind == 'species':
            inc = 1 if str(fish_id) == target else 0
        elif kind == 'weight':
            inc = 1 if weight >= float(target) else 0
        elif kind == 'bait':
            bait = c.execute('SELECT id FROM bait WHERE code=?', (target,)).fetchone()
            inc = 1 if bait and bait_id == bait['id'] else 0
        elif kind == 'sea':
            inc = 1 if location_code == 'sea' else 0
        else:
            inc = 0
        if inc:
            c.execute('UPDATE quest SET progress=progress+1 WHERE id=?', (q['id'],))


# ---------- достижения ----------
def check_achievements(c):
    """Открывает новые достижения по статистике уловов; возвращает коды новых."""
    total = c.execute('SELECT COUNT(*) FROM catch').fetchone()[0]
    species = c.execute('SELECT COUNT(DISTINCT fish_id) FROM catch').fetchone()[0]
    all_species = c.execute('SELECT COUNT(*) FROM fish').fetchone()[0]
    tuna = c.execute('SELECT 1 FROM catch WHERE fish_id=? LIMIT 1', (SEA_MASTER_FISH_ID,)).fetchone()
    have = {r['code'] for r in c.execute('SELECT code FROM achievement')}
    unlocked = []

    def try_unlock(code):
        if code not in have:
            c.execute('INSERT INTO achievement VALUES (?,?)',
                      (code, time.strftime('%Y-%m-%d %H:%M:%S')))
            unlocked.append(code)

    if total >= 1:
        try_unlock('first_catch')
    if total >= 100:
        try_unlock('hundred')
    if tuna:
        try_unlock('sea_master')
    if species >= all_species:
        try_unlock('collector')
    return unlocked


# ---------- дневник ----------
def diary(c):
    """Статистика рыбалки: суммарный улов, рекорд, счётчики и открытые виды."""
    total = c.execute('SELECT COUNT(*) FROM catch').fetchone()[0]
    best = c.execute('''SELECT f.name fish, c.weight_kg weight FROM catch c
        JOIN fish f ON f.id=c.fish_id ORDER BY c.weight_kg DESC LIMIT 1''').fetchone()
    species = [{'id': r['id'], 'name': r['name'], 'n': r['n'], 'best': r['best']}
               for r in c.execute('''SELECT f.id, f.name, COUNT(*) n, MAX(c.weight_kg) best
                   FROM catch c JOIN fish f ON f.id=c.fish_id GROUP BY f.id ORDER BY f.price''')]
    return {'total': total,
            'heaviest': {'name': best['fish'], 'weight': best['weight']} if best else None,
            'species': species,
            'species_total': c.execute('SELECT COUNT(*) FROM fish').fetchone()[0],
            'discovered': len(species)}

PRAGMA foreign_keys=ON;
CREATE TABLE location(
  id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  sky_top TEXT, sky_bottom TEXT, water_top TEXT, water_bottom TEXT,
  has_current INTEGER DEFAULT 0, has_forest INTEGER DEFAULT 0);
CREATE TABLE rod(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  max_range INTEGER NOT NULL, strength REAL NOT NULL, reel_speed REAL NOT NULL);
CREATE TABLE bait(
  id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  price INTEGER NOT NULL);                       -- цена за 1 шт, 10..100 ₽
CREATE TABLE fish(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  min_kg REAL NOT NULL, max_kg REAL NOT NULL,
  bite_freq REAL NOT NULL, resistance REAL NOT NULL, color TEXT,
  price INTEGER NOT NULL,                        -- 50, 100, 150, ... ₽
  times TEXT, weather TEXT);                     -- CSV частей суток / погод; NULL — клюёт всегда
CREATE TABLE fish_location(
  fish_id INTEGER REFERENCES fish(id), location_id INTEGER REFERENCES location(id),
  PRIMARY KEY(fish_id,location_id));
CREATE TABLE fish_bait(                          -- какая рыба клюёт на какую наживку
  fish_id INTEGER REFERENCES fish(id), bait_id INTEGER REFERENCES bait(id),
  bite_weight REAL NOT NULL DEFAULT 1, PRIMARY KEY(fish_id,bait_id));
CREATE TABLE player(                             -- единственный игрок (id=1)
  id INTEGER PRIMARY KEY CHECK(id=1), money INTEGER NOT NULL DEFAULT 0,
  tutorial_done INTEGER NOT NULL DEFAULT 0);
CREATE TABLE player_bait(                        -- запас наживки
  bait_id INTEGER PRIMARY KEY REFERENCES bait(id), qty INTEGER NOT NULL DEFAULT 0 CHECK(qty>=0));
CREATE TABLE catch(                              -- улов; kept=1 — лежит в инвентаре
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fish_id INTEGER NOT NULL REFERENCES fish(id),
  location_id INTEGER NOT NULL REFERENCES location(id),
  weight_kg REAL NOT NULL, kept INTEGER NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,              -- начислено денег (0, если отпущена)
  bait_id INTEGER,                               -- приманка заброса (для заданий)
  caught_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE world_state(                        -- погода мира; перекатывается по истечении срока
  id INTEGER PRIMARY KEY CHECK(id=1),
  weather TEXT NOT NULL DEFAULT 'clear', weather_until REAL);
CREATE TABLE quest(                              -- ежедневные задания на один день
  id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, kind TEXT NOT NULL,
  target TEXT, goal INTEGER NOT NULL, text TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0,
  reward_money INTEGER NOT NULL DEFAULT 0, reward_bait TEXT,
  reward_bait_qty INTEGER NOT NULL DEFAULT 0);
CREATE TABLE achievement(                        -- открытые достижения
  code TEXT PRIMARY KEY, unlocked_at TEXT NOT NULL);

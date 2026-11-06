INSERT INTO location(id,code,name,sky_top,sky_bottom,water_top,water_bottom,has_current,has_forest) VALUES
(1,'lake','Озеро','#9fd3f0','#e6f4fa','#2f7fa8','#1b4d6b',0,0),
(2,'river','Река','#a8d8ea','#f0f7e8','#3b8f8a','#1f5c5a',1,0),
(3,'pond','Лесной пруд','#6f9a78','#b9d1a8','#37604a','#1d3a2c',0,1);
INSERT INTO rod(id,name,max_range,strength,reel_speed) VALUES
(1,'Бамбуковая',300,1.0,1.0),(2,'Спиннинг',400,1.3,1.2),(3,'Карбон',500,1.7,1.5);
INSERT INTO bait(id,code,name,price) VALUES
(1,'worm','Червь',10),(2,'maggot','Опарыш',30),(3,'corn','Кукуруза',60),(4,'spin','Блесна',100);
-- times/weather: активность по времени суток и погоде; NULL — клюёт всегда.
-- Окунь ловится утром и вечером, плотва — утром и днём.
INSERT INTO fish(id,name,min_kg,max_kg,bite_freq,resistance,color,price,times,weather) VALUES
(1,'Карась',0.3,1.2,3,0.30,'#d8a23a',100,NULL,NULL),(2,'Карп',1,8,1.5,0.75,'#a9733b',250,NULL,NULL),
(3,'Окунь',0.2,1.5,2,0.40,'#6a9a3c',150,'morning,evening',NULL),
(4,'Щука',1,9,1,0.90,'#4f7d4a',300,NULL,NULL),
(5,'Плотва',0.1,0.7,3,0.20,'#b8c4cc',50,'morning,day',NULL),(6,'Лещ',0.5,4,1.5,0.50,'#c9b27a',200,NULL,NULL),
(11,'Налим',1,7,1.2,0.80,'#7d8a6e',300,'night',NULL),        -- налим клюёт только ночью
(12,'Форель',0.5,4,1.8,0.62,'#8fa8b8',350,NULL,'rain');      -- форель клюёт только в дождь
INSERT INTO fish_location VALUES (1,1),(1,3),(2,1),(2,2),(3,1),(3,2),(3,3),(4,1),(4,2),(5,1),(5,2),(5,3),(6,1),(6,2),
(11,1),(11,2),(12,2),(12,3);
-- дешёвая наживка: только дешёвая рыба; дорогая: и дешёвая, и дорогая (но дорогая клюёт реже)
INSERT INTO fish_bait(fish_id,bait_id,bite_weight) VALUES
(5,1,1),(1,1,.8),                       -- червь: плотва, карась
(5,2,1),(1,2,1),(3,2,.7),               -- опарыш: + окунь
(5,3,.6),(1,3,.8),(6,3,1),(2,3,.6),     -- кукуруза: + лещ, карп
(5,4,.5),(3,4,1),(4,4,.6),              -- блесна: плотва, окунь, щука
(11,2,1),(11,1,.7),(11,4,.5),           -- налим: опарыш, червь, блесна
(12,4,1),(12,2,.5),(12,1,.4);           -- форель: блесна, опарыш, червь
INSERT INTO player(id,money,tutorial_done) VALUES (1,200,0);
INSERT INTO player_bait(bait_id,qty) VALUES (1,10),(2,5),(3,0),(4,0);
INSERT OR IGNORE INTO world_state VALUES (1,'clear',0);

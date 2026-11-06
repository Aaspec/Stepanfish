import json, urllib.request
from pathlib import Path
base = 'http://127.0.0.1:8000'
for route in ('/', '/style.css', '/scenery.js', '/game.js', '/api/config', '/api/state'):
    with urllib.request.urlopen(base + route, timeout=10) as response:
        data = response.read()
        assert response.status == 200
        if route.startswith('/api/'):
            json.loads(data.decode('utf-8'))
        print(route, response.status, len(data))
print('Preview verified: ' + base)

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import server
server.init_db()
httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
print('Preview: http://127.0.0.1:%s' % httpd.server_port, flush=True)
httpd.serve_forever()

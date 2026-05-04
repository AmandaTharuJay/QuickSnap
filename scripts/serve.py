from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os


ROOT = Path(__file__).resolve().parent.parent / "web"
PORT = int(os.environ.get("PORT", "4173"))


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        requested = ROOT / self.path.lstrip("/").split("?", 1)[0]
        if self.path == "/" or not requested.suffix:
            self.path = "/index.html"
        super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SpaHandler)
    print(f"AI QA Assistant available at http://localhost:{PORT}")
    server.serve_forever()

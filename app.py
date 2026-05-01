"""Serve the static California Talks website without Streamlit dependencies."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path


ROOT = Path(__file__).parent / "public"
PORT = int(os.environ.get("PORT", "8000"))


class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "public, max-age=300")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), StaticHandler)
    print(f"Serving California Talks static site from {ROOT} on port {PORT}")
    server.serve_forever()

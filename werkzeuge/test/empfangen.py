#!/usr/bin/env python3
"""Nimmt Dateien von der Testmaschine entgegen.

    werkzeuge/test/empfangen.py 8782 &
    konsole.py "curl -sS --data-binary @/pfad/datei http://10.0.2.2:8782/name.yaml"

Der Weg Mac -> Maschine geht ueber einen gewoehnlichen Dateiserver; zurueck
ging bisher gar nichts. Eine Datei von der Maschine zu lesen hiess: sie in
Bloecken durch die serielle Konsole schieben, 47 KB in sechzehn Stuecken.

Alles landet unter werkzeuge/sicherungen/von-der-maschine/ - also im Ordner,
den .gitignore schon ausschliesst. Der Name kommt aus dem Pfad der Anfrage und
wird auf seinen letzten Teil gekuerzt: Ein ../ im Namen hat hier nichts zu
suchen.
"""
import http.server, pathlib, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8782
ZIEL = pathlib.Path(__file__).resolve().parents[2] / "werkzeuge/sicherungen/von-der-maschine"
ZIEL.mkdir(parents=True, exist_ok=True)


class Empfang(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        name = pathlib.Path(self.path.lstrip("/")).name or "ohne-namen"
        laenge = int(self.headers.get("Content-Length") or 0)
        if laenge > 20_000_000:
            self.send_error(413, "zu gross")
            return
        (ZIEL / name).write_bytes(self.rfile.read(laenge))
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()
        print(f"empfangen: {name} ({laenge} Bytes)", flush=True)

    def log_message(self, *a):
        pass


print(f"Empfang auf {PORT}, Ziel: {ZIEL}", flush=True)
http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Empfang).serve_forever()

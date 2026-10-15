"""Der Umzug der Hintergrundbilder in HATGs Ordner.

Eigenes Modul OHNE Home-Assistant-Import, wie datei.py und karte.py: Was mit
Dateien umgeht, soll sich gegen ein echtes Verzeichnis prüfen lassen und nicht
gegen einen Nachbau. tests/hats-bilder.test.js fährt es mit python3.

Auf Ansage vom 15.10.2026: "können wir hier die upload funktion benutzen und
den upload ordner von HATG verwenden. Dann haben beide systeme den selben
bilderpfad."

Der Ordner heißt weiter `hatg`, obwohl beide ihn benutzen - ihn umzubenennen
wäre der größere Eingriff, denn in jeder HATG-Theme steht `/local/hatg/<datei>`
und HATG schreibt dorthin weiter.

DIE ADRESSEN ZIEHEN MIT, und das ist der eigentliche Teil. Eine Theme, die
`/local/hats/bild.jpg` nennt, zeigte nach dem Umzug auf nichts - und ein
fehlendes Bild tut in CSS einfach nichts, also sucht man den Fehler in der
Theme. Deshalb werden beide Seiten in EINEM Durchgang angefasst.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

__all__ = ["pruefsumme", "umziehen"]


def pruefsumme(pfad: Path) -> str:
    h = hashlib.sha256()
    with pfad.open("rb") as f:
        for block in iter(lambda: f.read(131072), b""):
            h.update(block)
    return h.hexdigest()


def _freier_name(ordner: Path, name: str) -> Path:
    """Zählt durch, statt zu überschreiben - wie beim Hochladen.

    Zwei Bilder mit demselben Namen und verschiedenem Inhalt gehören zwei
    Leuten; eines von beiden zu verlieren ist keine Option.
    """
    stamm, punkt, endung = name.rpartition(".")
    stamm = stamm or name
    zaehler = 2
    while (ordner / f"{stamm}-{zaehler}{punkt}{endung}").exists():
        zaehler += 1
    return ordner / f"{stamm}-{zaehler}{punkt}{endung}"


def umziehen(
    alt_ordner: Path,
    neu_ordner: Path,
    themes: Path,
    alt_url: str,
    neu_url: str,
    marke: str,
    schreibe,
) -> dict:
    """Verschiebt die Bilder und zieht die Adressen in den eigenen Themes nach.

    `schreibe(name, text)` schreibt eine Theme-Datei - in der Integration ist
    das datei.theme_schreiben mit Sicherung davor. Hier hereingereicht, damit
    dieses Modul nichts über Sicherungen wissen muss.

    zurück  {"bilder": n, "doppelt": n, "umbenannt": [...], "themes": [...]}
    """
    bericht: dict = {"bilder": 0, "doppelt": 0, "umbenannt": [], "themes": []}
    if not alt_ordner.is_dir():
        return bericht

    neu_ordner.mkdir(parents=True, exist_ok=True)
    umbenannt: dict[str, str] = {}
    for datei in sorted(alt_ordner.iterdir()):
        if not datei.is_file():
            continue
        ziel = neu_ordner / datei.name
        if ziel.exists():
            # Gleicher Inhalt: Das Bild ist schon da, die Kopie kann weg -
            # sonst liegt es zweimal auf der Platte.
            if pruefsumme(ziel) == pruefsumme(datei):
                datei.unlink()
                bericht["doppelt"] += 1
                continue
            ziel = _freier_name(neu_ordner, datei.name)
            umbenannt[datei.name] = ziel.name
            bericht["umbenannt"].append(f"{datei.name} -> {ziel.name}")
        datei.replace(ziel)
        bericht["bilder"] += 1

    if themes.is_dir():
        for datei in sorted(themes.glob("*.yaml")):
            try:
                text = datei.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            # NUR EIGENE DATEIEN. Eine fremde Theme, die zufällig dieselbe
            # Adresse nennt, gehört jemand anderem - und ihre Bilder liegen
            # vielleicht gar nicht in unserem Ordner.
            if alt_url + "/" not in text or marke not in text:
                continue
            neu_text = text
            for alt_name, neu_name in umbenannt.items():
                neu_text = neu_text.replace(f"{alt_url}/{alt_name}", f"{neu_url}/{neu_name}")
            neu_text = neu_text.replace(alt_url + "/", neu_url + "/")
            if neu_text == text:
                continue
            try:
                schreibe(datei.stem, neu_text)
            except OSError:
                continue
            bericht["themes"].append(datei.name)

    # Leer gewordenen Ordner wegräumen. Steht noch etwas darin - ein
    # Unterordner etwa -, bleibt er; rmdir wirft dann und wir fangen es.
    try:
        alt_ordner.rmdir()
    except OSError:
        pass
    return bericht

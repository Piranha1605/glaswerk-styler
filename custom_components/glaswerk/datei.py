"""Eine Theme-Datei schreiben - in einem Schritt, und mit Sicherung davor.

Bis zum 14.10.2026 schrieb `ws_save_theme` direkt in die Datei
(`Path.write_text`). Zwei Luecken, beide vor dem grossen Einstellungsfenster
der Steuerkarte geschlossen, das viel mehr schreibt als vorher (eine Palette
sind Dutzende Felder):

- **Kein Schreiben in einem Schritt.** Brach es mittendrin ab - ein Neustart,
  eine volle Platte -, stand eine halbe Datei im Themes-Ordner. Mit
  `!include_dir_merge_named themes` startet Home Assistant dann im
  Wiederherstellungsmodus, dem schwersten Ausfall, den Glaswerk ausloesen kann.
  Jetzt geht der Text erst in eine Hilfsdatei daneben und wird dann mit
  `os.replace` an ihren Platz gesetzt. Das ist auf demselben Dateisystem ein
  einziger Schritt: Danach steht die neue Datei da oder die alte, nie eine
  halbe.
- **Keine Sicherung.** Die alte Fassung war nach dem Schreiben weg. Jetzt liegt
  sie vorher in `sicherungen/<name>/`, die letzten `SICHERUNGEN_BEHALTEN`.

Die Hilfsdatei endet NICHT auf `.yaml`: Home Assistant liest aus dem
Themes-Ordner nur solche, und eine liegengebliebene Hilfsdatei waere sonst beim
naechsten Start eine zweite, kaputte Theme. Die Sicherungen liegen ausserhalb
des Themes-Ordners - `!include_dir_merge_named` liest auch Unterordner.

Dieses Modul importiert Home Assistant absichtlich nicht; ein Test faehrt es mit
python3 gegen ein Verzeichnis auf der Platte.
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path

SICHERUNGEN_BEHALTEN = 10
HILFSENDUNG = ".glaswerk-neu"


def _hilfsdatei(pfad: Path) -> Path:
    # Versteckt und ohne .yaml am Ende - zweimal nicht als Theme lesbar.
    return pfad.with_name(f".{pfad.name}{HILFSENDUNG}")


def sicherungsordner(sicherungen: Path, name: str) -> Path:
    # Je Theme ein Ordner: Ein gemeinsamer Ordner mit "glas-*" faende auch die
    # Sicherungen von "glas-dunkel".
    return sicherungen / name


def _ordnung(pfad: Path) -> tuple[str, int]:
    # Nach Zeit, dann nach Zaehler. Nach dem Namen allein stuende
    # "200005.yaml" vor "200005-2.yaml" - der Punkt kommt nach dem Strich -,
    # und die NEUERE Sicherung derselben Sekunde fiele beim Aufraeumen zuerst.
    treffer = re.fullmatch(r"(\d{8}-\d{6})(?:-(\d+))?", pfad.stem)
    if not treffer:
        return ("", 0)
    return (treffer.group(1), int(treffer.group(2) or 1))


def sicherungen_von(sicherungen: Path, name: str) -> list[Path]:
    """Die Sicherungen einer Theme, die neueste zuerst."""
    ordner = sicherungsordner(sicherungen, name)
    if not ordner.is_dir():
        return []
    return sorted(ordner.glob("*.yaml"), key=_ordnung, reverse=True)


def _sichere(sicherungen: Path, name: str, inhalt: bytes, jetzt: datetime) -> Path:
    ordner = sicherungsordner(sicherungen, name)
    ordner.mkdir(parents=True, exist_ok=True)
    stempel = jetzt.strftime("%Y%m%d-%H%M%S")
    ziel = ordner / f"{stempel}.yaml"
    zaehler = 2
    # Zwei Schreibvorgaenge in derselben Sekunde - der Regler der Steuerkarte
    # schafft das - duerfen einander nicht ueberschreiben.
    while ziel.exists():
        ziel = ordner / f"{stempel}-{zaehler}.yaml"
        zaehler += 1
    ziel.write_bytes(inhalt)
    for alt in sicherungen_von(sicherungen, name)[SICHERUNGEN_BEHALTEN:]:
        alt.unlink(missing_ok=True)
    return ziel


def theme_schreiben(
    themes: Path,
    sicherungen: Path,
    name: str,
    text: str,
    ueberschreiben: bool,
    jetzt: datetime | None = None,
) -> str | None:
    """Schreibt `<themes>/<name>.yaml`.

    zurueck  None       geschrieben (oder schon genau so vorhanden)
             "exists"   die Datei gibt es, und ueberschreiben war aus

    Fehler der Platte kommen als OSError heraus; die alte Datei ist dann
    unberuehrt.
    """
    themes.mkdir(parents=True, exist_ok=True)
    pfad = themes / f"{name}.yaml"
    neu = text.encode("utf-8")
    if pfad.exists():
        if not ueberschreiben:
            return "exists"
        alt = pfad.read_bytes()
        # Nichts zu tun - und keine Sicherung, die nur dasselbe noch einmal
        # traegt. Sonst verdraengten zehn Klicks ohne Aenderung die Fassung,
        # die man zurueckhaben will.
        if alt == neu:
            return None
        _sichere(sicherungen, name, alt, jetzt or datetime.now())

    hilf = _hilfsdatei(pfad)
    try:
        with open(hilf, "wb") as datei:
            datei.write(neu)
            datei.flush()
            os.fsync(datei.fileno())
        os.replace(hilf, pfad)
    except OSError:
        hilf.unlink(missing_ok=True)
        raise
    return None

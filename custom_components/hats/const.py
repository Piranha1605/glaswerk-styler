"""Konstanten von HATS.

Die Domain ist bewusst nicht `hatg`: Nur mit eigener Domain lassen sich HATG und
HATS nebeneinander installieren. Sie nachtraeglich zu aendern kostet die
Konfigurationseintraege der Nutzer - also vor dem ersten Release festlegen.
"""

DOMAIN = "hats"
NAME = "HATS"
VERSION = "0.2.0b5"

PANEL_URL = "hats"
PANEL_TITLE = "HATS"
PANEL_ICON = "mdi:palette-outline"
PANEL_TAG = "hats-panel"
STATIC_PATH = "/hats_static"
PANEL_FILE = "hats-panel.js"
# Die unversionierte Adresse. Benutzt wird sie nur als Rueckfall, wenn sich die
# Pruefsumme ueber den www-Ordner nicht rechnen laesst - sonst steht sie im Pfad
# (siehe __init__.py). Sie bleibt als Literal stehen, weil ein Test sie gegen
# das Manifest prueft.
FRONTEND_MODULE = "/hats_static/hats-panel.js?v=0.2.0b5"

# Die Steuerkarte. Ihre Adresse wird aus STATIC_PATH und VERSION gebaut, nicht
# hier ausgeschrieben - die Versionsnummer steht schon an vier Stellen, und
# eine fuenfte waere die naechste, die auseinanderlaeuft.
CARD_FILE = "hats-control-card.js"

THEMES_SUBDIR = "themes"

# Die Fassung vor jedem Ueberschreiben einer Theme, die letzten zehn je Theme.
# Ausserhalb von themes/: !include_dir_merge_named liest auch Unterordner, und
# eine Sicherung waere dort beim naechsten Start eine zweite Theme gleichen
# Namens. Siehe datei.py.
SICHERUNGEN_SUBDIR = "hats/sicherungen"

# Hintergrundbilder liegen in config/www/hats und kommen unter /local/hats von
# Home Assistant SELBST. Das ist der ganze Punkt: Eine Adresse, die nur HATS
# ausliefert, macht eine weitergegebene Theme unbrauchbar - beim Empfaenger
# bliebe der Hintergrund leer, ohne Fehlermeldung, weil ein fehlendes Bild in
# CSS einfach nichts tut. HATG hat das 2026-09-30 an einer weitergegebenen
# Theme gelernt.
WWW_SUBDIR = "www"
BILDER_SUBDIR = "hats"
BILDER_LOCAL_PATH = "/local/hats"

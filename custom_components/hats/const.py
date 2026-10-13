"""Konstanten von HATS.

Die Domain ist bewusst nicht `hatg`: Nur mit eigener Domain lassen sich HATG und
HATS nebeneinander installieren. Sie nachtraeglich zu aendern kostet die
Konfigurationseintraege der Nutzer - also vor dem ersten Release festlegen.
"""

DOMAIN = "hats"
NAME = "HATS"
VERSION = "0.2.0b3"

PANEL_URL = "hats"
PANEL_TITLE = "HATS"
PANEL_ICON = "mdi:palette-outline"
PANEL_TAG = "hats-panel"
STATIC_PATH = "/hats_static"
FRONTEND_MODULE = "/hats_static/hats-panel.js?v=0.2.0b3"

# Die Steuerkarte. Ihre Adresse wird aus STATIC_PATH und VERSION gebaut, nicht
# hier ausgeschrieben - die Versionsnummer steht schon an vier Stellen, und
# eine fuenfte waere die naechste, die auseinanderlaeuft.
CARD_FILE = "hats-control-card.js"

THEMES_SUBDIR = "themes"

# Hintergrundbilder liegen in config/www/hats und kommen unter /local/hats von
# Home Assistant SELBST. Das ist der ganze Punkt: Eine Adresse, die nur HATS
# ausliefert, macht eine weitergegebene Theme unbrauchbar - beim Empfaenger
# bliebe der Hintergrund leer, ohne Fehlermeldung, weil ein fehlendes Bild in
# CSS einfach nichts tut. HATG hat das 2026-09-30 an einer weitergegebenen
# Theme gelernt.
WWW_SUBDIR = "www"
BILDER_SUBDIR = "hats"
BILDER_LOCAL_PATH = "/local/hats"

"""Konstanten von HATS.

Die Domain ist bewusst nicht `hatg`: Nur mit eigener Domain lassen sich HATG und
HATS nebeneinander installieren. Sie nachtraeglich zu aendern kostet die
Konfigurationseintraege der Nutzer - also vor dem ersten Release festlegen.
"""

DOMAIN = "hats"
NAME = "HATS"
VERSION = "0.2.0b1"

PANEL_URL = "hats"
PANEL_TITLE = "HATS"
PANEL_ICON = "mdi:palette-outline"
PANEL_TAG = "hats-panel"
STATIC_PATH = "/hats_static"
FRONTEND_MODULE = "/hats_static/hats-panel.js?v=0.2.0b1"

THEMES_SUBDIR = "themes"

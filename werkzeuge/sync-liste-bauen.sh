#!/usr/bin/env bash
# Erzeugt werkzeuge/sync-dateien.txt aus dem, was wirklich im Repo liegt.
#
# Von Hand gepflegt war die Liste zweimal falsch: einmal fehlte www/uix.js
# (die Datei kam nie an, und der Fehler sah aus wie ein Fehler im Panel),
# einmal stand ein Pfad im falschen Format drin. Beides sind Fehler, die
# nichts melden - die Datei ist einfach alt.
set -euo pipefail
cd "$(dirname "$0")/.."

{
  echo "# Erzeugt von werkzeuge/sync-liste-bauen.sh - nicht von Hand aendern."
  echo "# Links der Pfad beim Entwicklungsrechner, rechts nach | das Ziel auf"
  echo "# der Instanz. Ohne | landet die Datei unter /config/custom_components/glaswerk."
  echo
  # Alles, was zur Integration gehoert
  for f in $(cd custom_components/glaswerk && find . -type f \
      \( -name '*.js' -o -name '*.py' -o -name '*.json' -o -name '*.jpg' -o -name '*.png' \) \
      | sed 's|^\./||' | sort); do
    echo "$f"
  done
  echo
  # Und was daneben gebraucht wird
  echo "werkzeuge/vorschau.js|/config/www/glaswerk-vorschau.js"
  for t in werkzeuge/themes/*.yaml; do
    [ -e "$t" ] || continue
    echo "$t|/config/themes/$(basename "$t")"
  done
  echo
  # Die Grundlage fuer jede neue Theme. Sie liegt NICHT unter werkzeuge/themes,
  # und sie heisst auf der Instanz anders - mit Unterstrich, weil Glaswerk sie
  # ueber glaswerk/load_theme_file unter diesem Namen sucht. Am 13.10.2026 hat
  # dieses Skript den Eintrag einmal weggeworfen, weil er von Hand dazukam:
  # Danach meldete das Panel nur "Grundlage nicht geladen", und jede neue Theme
  # blieb leer. Deshalb steht er jetzt hier und nicht in der Datei.
  echo "# Die Grundlage fuer jede neue Theme. Glaswerk laedt sie ueber"
  echo "# glaswerk/load_theme_file aus dem Themes-Ordner und erwartet den Namen MIT"
  echo "# Unterstrich - lokal heisst sie mit Bindestrich. Fehlt sie, meldet das"
  echo "# Panel nur \"Grundlage nicht geladen\" und jede neue Theme bleibt leer."
  echo "docs/beispiele/ha-blanko.yaml|/mnt/data/supervisor/homeassistant/themes/ha_blanko.yaml"
} > werkzeuge/sync-dateien.txt

echo "$(grep -cv '^#\|^$' werkzeuge/sync-dateien.txt) Eintraege"

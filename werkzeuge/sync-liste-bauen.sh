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
  echo "# der Instanz. Ohne | landet die Datei unter /config/custom_components/hats."
  echo
  # Alles, was zur Integration gehoert
  for f in $(cd custom_components/hats && find . -type f \
      \( -name '*.js' -o -name '*.py' -o -name '*.json' -o -name '*.jpg' -o -name '*.png' \) \
      | sed 's|^\./||' | sort); do
    echo "$f"
  done
  echo
  # Und was daneben gebraucht wird
  echo "werkzeuge/vorschau.js|/config/www/hats-vorschau.js"
  for t in werkzeuge/themes/*.yaml; do
    [ -e "$t" ] || continue
    echo "$t|/config/themes/$(basename "$t")"
  done
} > werkzeuge/sync-dateien.txt

echo "$(grep -cv '^#\|^$' werkzeuge/sync-dateien.txt) Eintraege"

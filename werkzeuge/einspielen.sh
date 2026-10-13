#!/usr/bin/env bash
# Dateien auf die Instanz bringen - und nachsehen, ob sie angekommen sind.
#
#   werkzeuge/einspielen.sh                 alle geaenderten
#   werkzeuge/einspielen.sh www/theme.js    nur diese
#
# Vom Mac aus gibt es KEINEN Schreibweg: SSH und Samba sind zu, die REST-API
# will einen Token. Der einzige Weg ist der Terminal im Studio Code Server -
# die Instanz holt sich die Dateien von einem kurzlebigen Server hier.
#
# Dieses Skript nimmt einem dabei die drei Fehler ab, die sonst immer wieder
# passieren:
#   1. Der Terminal verfremdet ein getipptes ";" zu "\;". Der erzeugte Befehl
#      enthaelt deshalb KEINE Semikolons und KEINE Schleife, nur "&&".
#   2. "Ist es angekommen?" war bisher Raten. /hats_static ist von hier aus
#      ohne Anmeldung lesbar - das Skript vergleicht byteweise.
#   3. Die Adresse des Panels traegt eine Pruefsumme, die nur beim SETUP der
#      Integration gerechnet wird. Ohne Reload sieht der Browser die alte
#      Datei, obwohl auf der Platte die neue liegt.

set -uo pipefail
cd "$(dirname "$0")/.."

HOST=192.168.178.31
PORT=8778
ZIEL=/config/custom_components/hats

ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
[ -n "$ip" ] || { echo "Keine LAN-Adresse gefunden."; exit 1; }

if [ $# -gt 0 ]; then
  dateien=("$@")
else
  # Die Liste kommt aus sync-dateien.txt - DERSELBEN Quelle wie die
  # Sync-Schleife. Vorher stand hier eine zweite, von Hand gepflegte Liste,
  # und sie war am 13.10.2026 veraltet: www/vorlagen.js und www/uix.js fehlten.
  # Wer ueber dieses Skript einspielte, bekam Vorlagen nie auf die Instanz -
  # und merkte es nicht, weil der Rest ankam und gruen gemeldet wurde.
  liste="$(dirname "$0")/sync-dateien.txt"
  [ -f "$liste" ] || { echo "sync-dateien.txt fehlt - sync-liste-bauen.sh laufen lassen."; exit 1; }
  dateien=()
  while IFS= read -r zeile; do
    case "$zeile" in ""|\#*) continue ;; esac
    case "$zeile" in *"|"*) continue ;; esac   # eigenes Ziel: nicht unter custom_components
    dateien+=("$zeile")
  done < "$liste"
  [ ${#dateien[@]} -gt 0 ] || { echo "sync-dateien.txt ist leer."; exit 1; }
fi

pkill -f "http.server $PORT" 2>/dev/null
python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
sleep 1

echo "Diesen Befehl in den Terminal des Studio Code Server:"
echo
befehl="cd $ZIEL"
for f in "${dateien[@]}"; do
  befehl="$befehl && curl -sSf -o $f http://$ip:$PORT/custom_components/hats/$f"
done
befehl="$befehl && cd /config"
printf "  %s\n\n" "$befehl"

echo "Warte, bis die Dateien ankommen (Abbruch mit Strg-C) ..."
for i in $(seq 1 90); do
  alle_gleich=1
  for f in "${dateien[@]}"; do
    case "$f" in
      www/*) url="http://$HOST/hats_static/${f#www/}" ;;
      *)     continue ;;   # Python und JSON liefert HA nicht aus - nicht pruefbar
    esac
    tmp=$(mktemp)
    curl -s --max-time 5 -o "$tmp" "$url"
    cmp -s "$tmp" "custom_components/hats/$f" || alle_gleich=0
    rm -f "$tmp"
  done
  if [ "$alle_gleich" = "1" ]; then
    echo
    for f in "${dateien[@]}"; do
      case "$f" in www/*) printf "  \033[32mangekommen\033[0m  %s\n" "$f" ;; esac
    done
    echo
    echo "Jetzt die Integration neu laden, sonst sieht der Browser die alte Datei."
    echo "Die Pruefsumme in der Adresse wird nur beim Setup gerechnet:"
    echo
    echo "  hass.callService('homeassistant','reload_config_entry',{entry_id:'...'})"
    echo
    echo "Python-Aenderungen brauchen zusaetzlich homeassistant.restart -"
    echo "ein Reload tauscht das schon importierte Modul nicht aus."
    exit 0
  fi
  sleep 2
done

echo
echo "Nach 3 Minuten nicht angekommen. Haeufigste Gruende:"
echo "  - die Meldung von code-server hat den Klick abgefangen (erst wegklicken)"
echo "  - die Shell haengt in einer Fortsetzungszeile (dann 'done' eingeben;"
echo "    Strg-C kommt im Browser nicht bis zur Shell durch)"
exit 1

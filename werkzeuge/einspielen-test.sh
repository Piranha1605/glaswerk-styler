#!/bin/sh
# Spielt HATS auf die Testinstanz ein - die virtuelle Maschine auf dem Mac.
#
#   werkzeuge/einspielen-test.sh              alles aus sync-dateien.txt
#   werkzeuge/einspielen-test.sh www/theme.js nur diese
#
# Der Unterschied zu einspielen.sh: Hier muss NIEMAND etwas in einen Terminal
# tippen. Die serielle Konsole der Maschine haengt an einem Socket, und
# konsole.py schickt Befehle direkt hinein. Damit faellt der Umweg weg, der
# bei der Instanz im Heimnetz jede Aenderung ausgebremst hat - und mit ihm die
# Sync-Schleife, deren Ausfall man erst merkt, wenn eine Messung nicht passt.
#
# Die Maschine erreicht den Mac unter 10.0.2.2 (QEMUs Benutzernetz).

set -e
cd "$(dirname "$0")/.." || exit 1
PROJEKT="$(pwd)"
VM=/Users/enricofischer/Projekte/haos-test
ZIEL=/mnt/data/supervisor/homeassistant/custom_components/hats
PORT=8778
MAC_AUS_VM=10.0.2.2

[ -d "$VM" ] || { echo "Die Testmaschine fehlt: $VM"; exit 1; }
pgrep -f "qemu-system-aarch64 -name haos-test" >/dev/null || {
  echo "Die Maschine laeuft nicht - $VM/starten.sh"; exit 1; }

# Dateiserver: einen laufenden NICHT abschiessen. Genau das hat einspielen.sh
# frueher getan und damit die Sync-Schleife der Heimnetz-Instanz mitgerissen.
if curl -s --max-time 2 -o /dev/null "http://127.0.0.1:$PORT/manifest.json" 2>/dev/null; then
  echo "Dateiserver laeuft bereits auf $PORT"
else
  ( cd "$PROJEKT" && nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 & )
  sleep 2
  curl -s --max-time 3 -o /dev/null "http://127.0.0.1:$PORT/manifest.json" \
    || { echo "Dateiserver kam nicht hoch"; exit 1; }
  echo "Dateiserver gestartet auf $PORT"
fi

if [ $# -gt 0 ]; then
  dateien="$*"
else
  # Dieselbe Quelle wie die Sync-Schleife - keine zweite Liste von Hand.
  dateien=$(awk '/^#/ || /^$/ { next } /\|/ { next } { print }' werkzeuge/sync-dateien.txt | tr '\n' ' ')
fi

echo "Hole $(echo "$dateien" | wc -w | tr -d " ") Dateien in die Maschine ..."

# Ein Befehl mit && statt ; - der Terminal verfremdet Semikolons, und eine
# Schleife bleibt in ihrer Fortsetzungszeile haengen.
#
# UND: in BLOECKEN. Die serielle Konsole schneidet eine zu lange Zeile ab, ohne
# das zu melden - sie fuehrt den Rest einfach nicht aus. Am 13.10.2026 mit 19
# Dateien in einem Befehl gemessen: "curl: (2) no URL specified", und sieben
# Dateien fehlten. Der Fehler sieht aus wie ein curl-Problem und ist ein
# Laengenproblem.
anzahl=0
block=""
schicke() {
  [ -n "$1" ] || return 0
  "$VM/konsole.py" "cd $ZIEL && $1" 90 >/dev/null
}
for f in $dateien; do
  teil="curl -sSf --create-dirs -o $f http://$MAC_AUS_VM:$PORT/custom_components/hats/$f"
  if [ -z "$block" ]; then block="$teil"; else block="$block && $teil"; fi
  anzahl=$((anzahl + 1))
  if [ $anzahl -ge 3 ]; then schicke "$block"; block=""; anzahl=0; printf "."; fi
done
schicke "$block"
echo

# Gegenprobe: byteweise, nicht geraten.
echo
fehler=0
for f in $dateien; do
  case "$f" in www/*) ;; *) continue ;; esac   # nur was HA ausliefert
  tmp=$(mktemp)
  curl -s --max-time 6 -o "$tmp" "http://localhost:8123/hats_static/${f#www/}" || true
  if cmp -s "$tmp" "custom_components/hats/$f"; then
    printf "  \033[32mangekommen\033[0m  %s\n" "$f"
  else
    printf "  \033[31mABWEICHEND\033[0m  %s\n" "$f"; fehler=1
  fi
  rm -f "$tmp"
done

[ "$fehler" = "0" ] || { echo; echo "Nicht alles angekommen."; exit 1; }
echo
echo "Jetzt die Integration neu laden - der Cache-Buster wird nur beim Setup gerechnet:"
echo "  werkzeuge/test-reload.sh"

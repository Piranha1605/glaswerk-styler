#!/bin/sh
# Spielt die Horizon-Cards auf die Testmaschine ein und meldet sie als
# Lovelace-Ressourcen an.
#
# Der Ablageort ist der von HACS - www/community/<repo>/, ausgeliefert unter
# /hacsfiles/<repo>/. Damit sieht es fuer Home Assistant aus wie eine echte
# Installation, und eine spaetere Installation ueber HACS tritt an dieselbe
# Stelle statt daneben.

set -e
QUELLE=/Users/enricofischer/Projekte/ha-karten/dist
VM=/Users/enricofischer/Projekte/haos-test
ZIEL=/mnt/data/supervisor/homeassistant/www/community/horizon-cards
# Eigener Port: 8778 steht auf dem HATS-Projekt, 8779 auf demselben. Dieser
# hier steht eine Ebene hoeher, damit beide Projekte erreichbar sind.
PORT=8780
MAC_AUS_VM=10.0.2.2

[ -d "$QUELLE" ] || { echo "Die Karten fehlen: $QUELLE"; exit 1; }
pgrep -f "qemu-system-aarch64 -name haos-test" >/dev/null || { echo "Die Maschine laeuft nicht"; exit 1; }

# Ein Server, der AUF DEM ELTERNORDNER steht - sonst kommt man nicht an zwei
# Projekte gleichzeitig. Einen laufenden nicht abschiessen.
# MIT -f pruefen. Ohne das meldet curl auch einen 404 als Erfolg, und dann
# gilt ein Server am falschen Ort als der richtige - am 13.10.2026 genau so
# passiert: Der Check war gruen, angekommen ist nichts, und der Fehler stand
# erst im leeren Zielordner. Dieselbe Fehlerklasse wie ein git status, das am
# Text statt am Rueckgabewert geprueft wird.
if curl -sf --max-time 2 -o /dev/null "http://127.0.0.1:$PORT/ha-karten/dist/horizon-cards.js" 2>/dev/null; then
  echo "Dateiserver laeuft bereits auf $PORT"
else
  ( cd /Users/enricofischer/Projekte && nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 & )
  sleep 2
  curl -sf --max-time 3 -o /dev/null "http://127.0.0.1:$PORT/ha-karten/dist/horizon-cards.js" \
    || { echo "Dateiserver liefert die Buendel nicht aus - steht er am richtigen Ort?"; exit 1; }
  echo "Dateiserver gestartet auf $PORT"
fi

dateien="horizon-cards.js horizon-cards.js.LICENSE.txt horizon-claude.js horizon-dashboard.js horizon-remix.js horizon-widgets.js remix-icons.json"

echo "Hole die Buendel in die Maschine ..."
"$VM/konsole.py" "mkdir -p $ZIEL && echo bereit" 40 >/dev/null
# Einzeln: horizon-cards.js ist ueber 500 KB, und die serielle Konsole
# schneidet lange Zeilen stumm ab.
for f in $dateien; do
  "$VM/konsole.py" "curl -sSf -o $ZIEL/$f http://$MAC_AUS_VM:$PORT/ha-karten/dist/$f && echo ok" 90 >/dev/null
  printf "."
done
echo

echo
# Gegenprobe: Groesse vergleichen, nicht nur "liegt da".
fehler=0
for f in $dateien; do
  soll=$(wc -c < "$QUELLE/$f" | tr -d " ")
  ist=$("$VM/konsole.py" "wc -c < $ZIEL/$f" 40 | grep -o "^[0-9]*" | head -1)
  if [ "$soll" = "$ist" ]; then
    printf "  \033[32mangekommen\033[0m  %-32s %s Bytes\n" "$f" "$soll"
  else
    printf "  \033[31mABWEICHEND\033[0m  %-32s soll %s, ist %s\n" "$f" "$soll" "${ist:-0}"; fehler=1
  fi
done
[ "$fehler" = "0" ] || { echo; echo "Nicht alles angekommen."; exit 1; }

echo
echo "Jetzt als Lovelace-Ressourcen anmelden:"
echo "  node werkzeuge/test/karten-anmelden.mjs"

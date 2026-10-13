#!/bin/sh
# Laeuft AUF DER INSTANZ und holt Aenderungen von selbst.
#
# Hintergrund: Vom Entwicklungsrechner gibt es keinen Schreibweg auf die
# Instanz - Port 22 und 445 sind zu, die REST-API will einen Token. Bisher
# musste deshalb fuer jede Aenderung ein curl-Befehl in den Terminal des
# Studio Code Server getippt werden. Das ist der Flaschenhals.
#
# Diese Schleife dreht die Richtung um: Die Instanz fragt alle paar Sekunden
# beim Entwicklungsrechner nach und holt, was sich geaendert hat.
#
# Starten (eine Zeile, ohne Semikolon - der Terminal verfremdet die):
#
#   curl -sSf -o /config/sync-hats.sh http://<IP>:8778/werkzeuge/sync-instanz.sh && chmod +x /config/sync-hats.sh && /config/sync-hats.sh <IP> > /config/sync-hats.log 2>&1 &
#
# Beenden: eine Datei /config/sync-hats.stop anlegen, oder den Prozess killen.
# Sie endet ausserdem von allein - nach MAX_LAEUFE oder wenn der Server
# zwanzig Mal hintereinander nicht antwortet.

IP="${1:-192.168.178.47}"
PORT="${2:-8778}"
QUELLE="http://$IP:$PORT/custom_components/hats"
ZIEL="/config/custom_components/hats"
STOPP="/config/sync-hats.stop"

# Acht Stunden bei drei Sekunden Takt. Eine Schleife ohne Ende auf einem
# fremden System waere unhoeflich.
MAX_LAEUFE=9600
# Die Liste kommt vom Entwicklungsrechner, nicht aus diesem Skript. Sonst
# muesste die Schleife neu gestartet werden, sobald eine Datei dazukommt - und
# genau das ist am 13.10.2026 passiert: www/uix.js stand nicht drin, die Datei
# kam nie an, und der Fehler sah aus wie ein Fehler im Panel.
DATEIEN_FALLBACK="www/hats-panel.js www/theme.js www/bedienelemente.js www/palette.js www/zuordnung.js www/uix.js __init__.py const.py config_flow.py manifest.json"
LISTE="http://$IP:$PORT/werkzeuge/sync-dateien.txt"

echo "$(date '+%H:%M:%S') Sync gestartet, Quelle $QUELLE"
rm -f "$STOPP"

lauf=0
stumm=0
while [ "$lauf" -lt "$MAX_LAEUFE" ]; do
  lauf=$((lauf + 1))
  [ -f "$STOPP" ] && { echo "$(date '+%H:%M:%S') Stoppdatei gefunden - Ende"; rm -f "$STOPP"; exit 0; }

  # Jede Runde neu holen - so wirkt eine ergaenzte Liste sofort.
  DATEIEN=$(curl -sSf --max-time 8 "$LISTE" 2>/dev/null | grep -v '^#' | tr '\n' ' ')
  [ -z "$DATEIEN" ] && DATEIEN="$DATEIEN_FALLBACK"

  erreichbar=0
  geaendert=""
  for f in $DATEIEN; do
    tmp="/tmp/sync-hats-$$"
    if curl -sSf --max-time 8 -o "$tmp" "$QUELLE/$f" 2>/dev/null; then
      erreichbar=1
      # Nur schreiben, wenn sich wirklich etwas geaendert hat. Sonst wuerde
      # jeder Durchlauf die Zeitstempel anfassen, und HA haelt Dateien fuer
      # neu, die es nicht sind.
      if ! cmp -s "$tmp" "$ZIEL/$f"; then
        mkdir -p "$(dirname "$ZIEL/$f")"
        cp "$tmp" "$ZIEL/$f"
        geaendert="$geaendert $f"
      fi
    fi
    rm -f "$tmp"
  done

  if [ "$erreichbar" = "0" ]; then
    stumm=$((stumm + 1))
    [ "$stumm" -ge 20 ] && { echo "$(date '+%H:%M:%S') Server zwanzigmal stumm - Ende"; exit 0; }
  else
    stumm=0
  fi

  if [ -n "$geaendert" ]; then
    echo "$(date '+%H:%M:%S') neu:$geaendert"
    # Eine Marke fuer den Entwicklungsrechner: Er kann sie ueber /hats_static
    # nicht lesen, wohl aber die Datei selbst vergleichen. Der Log hier ist
    # fuer den Menschen.
  fi
  sleep 3
done
echo "$(date '+%H:%M:%S') Hoechstzahl erreicht - Ende"

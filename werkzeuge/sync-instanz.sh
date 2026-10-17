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
#   curl -sSf -o /config/sync-glaswerk.sh http://<IP>:8778/werkzeuge/sync-instanz.sh && chmod +x /config/sync-glaswerk.sh && /config/sync-glaswerk.sh <IP> > /config/sync-glaswerk.log 2>&1 &
#
# Beenden: eine Datei /config/sync-glaswerk.stop anlegen, oder den Prozess killen.
# Sie endet ausserdem von allein - nach MAX_LAEUFE oder wenn der Server
# zwanzig Mal hintereinander nicht antwortet.
#
# Die IP ist Pflicht und steht absichtlich nicht im Skript: welche Adresse der
# Entwicklungsrechner hat, weiss nur das jeweilige Netz.

IP="${1:?IP des Entwicklungsrechners angeben: sync-instanz.sh <IP> [PORT]}"
PORT="${2:-8778}"
BASIS="http://$IP:$PORT"
QUELLE="$BASIS/custom_components/glaswerk"
ZIEL="/config/custom_components/glaswerk"
STOPP="/config/sync-glaswerk.stop"

# Acht Stunden bei drei Sekunden Takt. Eine Schleife ohne Ende auf einem
# fremden System waere unhoeflich.
MAX_LAEUFE=9600
# Die Liste kommt vom Entwicklungsrechner, nicht aus diesem Skript. Sonst
# muesste die Schleife neu gestartet werden, sobald eine Datei dazukommt - und
# genau das ist am 13.10.2026 passiert: www/uix.js stand nicht drin, die Datei
# kam nie an, und der Fehler sah aus wie ein Fehler im Panel.
DATEIEN_FALLBACK="www/glaswerk-panel.js www/theme.js www/bedienelemente.js www/palette.js www/zuordnung.js www/uix.js __init__.py const.py config_flow.py manifest.json"
LISTE="http://$IP:$PORT/werkzeuge/sync-dateien.txt"

echo "$(date '+%H:%M:%S') Sync gestartet, Quelle $QUELLE"
rm -f "$STOPP"

lauf=0
stumm=0
while [ "$lauf" -lt "$MAX_LAEUFE" ]; do
  lauf=$((lauf + 1))
  [ -f "$STOPP" ] && { echo "$(date '+%H:%M:%S') Stoppdatei gefunden - Ende"; rm -f "$STOPP"; exit 0; }

  # Sich selbst erneuern. Ohne das kostet jede Aenderung am Skript einen Gang
  # in den Terminal des Studio Code Server - und genau den soll die Schleife
  # ja ersetzen. Die Syntaxpruefung davor ist Pflicht: Ein kaputtes Skript
  # wuerde sich sonst starten, sofort sterben und waere nicht mehr erreichbar.
  neu="/tmp/sync-glaswerk-selbst-$$"
  if curl -sSf --max-time 8 -o "$neu" "$BASIS/werkzeuge/sync-instanz.sh" 2>/dev/null; then
    if ! cmp -s "$neu" "$0" && sh -n "$neu" 2>/dev/null; then
      echo "$(date '+%H:%M:%S') neue Fassung des Skripts - starte neu"
      cp "$neu" "$0"
      chmod +x "$0"
      rm -f "$neu"
      exec "$0" "$IP" "$PORT"
    fi
    rm -f "$neu"
  fi

  # Jede Runde neu holen - so wirkt eine ergaenzte Liste sofort.
  DATEIEN=$(curl -sSf --max-time 8 "$LISTE" 2>/dev/null | grep -v '^#' | tr '\n' ' ')
  [ -z "$DATEIEN" ] && DATEIEN="$DATEIEN_FALLBACK"

  erreichbar=0
  geaendert=""
  for eintrag in $DATEIEN; do
    # Zwei Formate in einer Liste:
    #   www/theme.js                        -> /config/custom_components/glaswerk/www/theme.js
    #   werkzeuge/themes/x.yaml|/config/themes/x.yaml   explizites Ziel
    # Trennzeichen ist | und nicht >, damit die Zeile keine Umleitung wird,
    # falls jemand die Liste versehentlich in eine Shell kippt.
    case "$eintrag" in
      *"|"*) f="${eintrag%%|*}" ; ziel="${eintrag#*|}" ; quelle="$BASIS/$f" ;;
      *)     f="$eintrag"       ; ziel="$ZIEL/$f"      ; quelle="$QUELLE/$f" ;;
    esac
    tmp="/tmp/sync-glaswerk-$$"
    if curl -sSf --max-time 8 -o "$tmp" "$quelle" 2>/dev/null; then
      erreichbar=1
      # Nur schreiben, wenn sich wirklich etwas geaendert hat. Sonst wuerde
      # jeder Durchlauf die Zeitstempel anfassen, und HA haelt Dateien fuer
      # neu, die es nicht sind.
      if ! cmp -s "$tmp" "$ziel"; then
        mkdir -p "$(dirname "$ziel")"
        cp "$tmp" "$ziel"
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
    # Eine Marke fuer den Entwicklungsrechner: Er kann sie ueber /glaswerk_static
    # nicht lesen, wohl aber die Datei selbst vergleichen. Der Log hier ist
    # fuer den Menschen.
  fi
  sleep 3
done
echo "$(date '+%H:%M:%S') Hoechstzahl erreicht - Ende"

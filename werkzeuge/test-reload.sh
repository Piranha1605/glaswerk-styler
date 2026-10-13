#!/bin/sh
# Laedt die HATS-Integration auf der Testinstanz neu und meldet den Stand.
#
#   werkzeuge/test-reload.sh            Integration neu laden (JS-Aenderungen)
#   werkzeuge/test-reload.sh --neustart ganz neu starten (Python-Aenderungen)
#
# Warum ueberhaupt: /hats_static traegt kein Cache-Control, und dann darf ein
# Browser heuristisch cachen - Chrome tut das. Erst eine neue Pruefsumme in der
# Adresse bringt den neuen Stand durch, und die wird nur beim Setup gerechnet.
#
# Fuer Python reicht ein Reload NICHT: Er ruft async_unload_entry und
# async_setup_entry auf demselben, schon importierten Modul auf.

set -e
VM=/Users/enricofischer/Projekte/haos-test
cd "$VM" || exit 1

if [ "$1" = "--neustart" ]; then
  echo "Starte Home Assistant neu (dauert ein bis zwei Minuten) ..."
  python3 -c "
import sys; sys.path.insert(0, '$VM')
import ha
print(ha.ruf('/api/services/homeassistant/restart', {}))"
  for i in $(seq 1 60); do
    sleep 5
    code=$(curl -s --max-time 4 -o /dev/null -w "%{http_code}" http://localhost:8123/ 2>/dev/null || echo 000)
    [ "$code" = "200" ] && { echo "wieder da"; break; }
    printf "."
  done
  echo
else
  python3 - <<'PY'
import sys, json
sys.path.insert(0, "/Users/enricofischer/Projekte/haos-test")
import ha
# Den Konfigurationseintrag suchen - die ID steht nicht fest.
eintraege = ha.ruf("/api/config/config_entries/entry")
if isinstance(eintraege, dict) and eintraege.get("_fehler"):
    print("Die REST-Schnittstelle listet keine Eintraege:", eintraege.get("_fehler"))
    print("Weg ueber den Dienst statt ueber die ID:")
    print(ha.ruf("/api/services/homeassistant/reload_config_entry",
                 {"entry_id": None}) if False else "  -> bitte ueber das Panel neu laden")
else:
    treffer = [e for e in eintraege if e.get("domain") == "hats"]
    if not treffer:
        print("Kein hats-Eintrag gefunden.")
    else:
        for e in treffer:
            r = ha.ruf("/api/services/homeassistant/reload_config_entry", {"entry_id": e["entry_id"]})
            print("neu geladen:", e["entry_id"], "->", "ok" if not isinstance(r, dict) or not r.get("_fehler") else r)
PY
fi

echo
python3 - <<'PY'
import sys
sys.path.insert(0, "/Users/enricofischer/Projekte/haos-test")
import ha
z = ha.ruf("/api/")
print("Home Assistant:", z.get("message", z))
PY
echo "Oberflaeche: http://localhost:8123"

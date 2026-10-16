#!/usr/bin/env bash
# Alles, was ohne laufende Instanz prüfbar ist. Vor jedem Einspielen.
#
# Ein Fehlschlag heißt: nicht einspielen.

set -uo pipefail
cd "$(dirname "$0")/.."

rot=0
ok()   { printf "  \033[32mok\033[0m   %s\n" "$1"; }
fehl() { printf "  \033[31mROT\033[0m  %s\n" "$1"; rot=1; }

echo "== Syntax =="
# node --check reicht NICHT. Es laesst eine doppelte Deklaration im selben
# Gueltigkeitsbereich durch - ein const mit dem Namen eines Parameters -, und
# erst der Browser wirft dann "Identifier ... has already been declared". Die
# Datei laedt dann gar nicht, und das Panel bleibt eine leere Flaeche.
# Ueber stdin als Modul geparst faellt es sofort auf.
for f in custom_components/glaswerk/www/*.js; do
  if node --input-type=module --check < "$f" 2>/dev/null; then
    ok "$(basename "$f")"
  else
    fehl "$(basename "$f")"
    node --input-type=module --check < "$f" 2>&1 | head -4 | sed 's/^/       /'
  fi
done

for f in custom_components/glaswerk/*.py; do
  if python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$f" 2>/dev/null; then
    ok "$(basename "$f")"
  else
    fehl "$(basename "$f")"
  fi
done

for f in custom_components/glaswerk/manifest.json custom_components/glaswerk/translations/*.json hacs.json; do
  [ -f "$f" ] || continue
  if python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null; then
    ok "$(basename "$f")"
  else
    fehl "$(basename "$f")"
  fi
done

echo
echo "== Tests =="
# Ein Test mit NULL Pruefungen gilt hier nicht als bestanden. Eine Testdatei
# koennte sich sonst selbst stilllegen, ohne rot zu werden - in HATG ist genau
# das einmal passiert.
gesamt=0
for t in tests/*.test.js; do
  if aus=$(node "$t" 2>&1); then
    zahl=$(printf '%s\n' "$aus" | grep -c '^ok')
    gesamt=$((gesamt + zahl))
    if [ "$zahl" -eq 0 ]; then
      fehl "$(basename "$t") - null Pruefungen gelaufen"
    else
      ok "$(basename "$t")  ($zahl)"
    fi
  else
    fehl "$(basename "$t")"
    printf '%s\n' "$aus" | grep -E "AssertionError|message:" | head -3 | sed 's/^/       /'
  fi
done

echo
echo "== Versionen =="
# Die Nummer steht an VIER Stellen. Dieser Pruefer kannte am 13.10.2026 nur
# drei und meldete gruen, waehrend GLASWERK_VERSION im Panel noch auf der alten
# stand - genau die Sorte Fehler, gegen die er gebaut ist. Gefunden hat es
# tests/glaswerk-version.test.js, nicht dieses Skript.
v_const=$(grep -oE 'VERSION = "([^"]+)"' custom_components/glaswerk/const.py | cut -d'"' -f2)
v_modul=$(grep -oE 'glaswerk-panel\.js\?v=([^"]+)' custom_components/glaswerk/const.py | cut -d= -f2)
v_mani=$(python3 -c "import json;print(json.load(open('custom_components/glaswerk/manifest.json')).get('version',''))")
v_panel=$(grep -oE '^const GLASWERK_VERSION = "([^"]+)"' custom_components/glaswerk/www/glaswerk-panel.js | cut -d'"' -f2)
if [ -n "$v_const" ] && [ "$v_const" = "$v_modul" ] && [ "$v_const" = "$v_mani" ] && [ "$v_const" = "$v_panel" ]; then
  ok "ueberall $v_const (vier Stellen)"
else
  fehl "const.py=$v_const  FRONTEND_MODULE=$v_modul  manifest=$v_mani  Panel=$v_panel"
fi

# Steht die Nummer noch auf dem Stand von vor zig Aenderungen? Die
# Pruefsumme in der Adresse faengt das meistens ab - aber nur, wenn die
# Integration auch neu geladen wurde. Die Nummer ist der Hebel, der
# unabhaengig davon greift. Am 13.10.2026 standen 28 Commits dazwischen.
letzte=$(git log --format=%H -1 -S"VERSION = \"$v_const\"" -- custom_components/glaswerk/const.py 2>/dev/null)
if [ -n "$letzte" ]; then
  seitdem=$(git log --oneline "$letzte..HEAD" -- custom_components/glaswerk/www custom_components/glaswerk/*.py 2>/dev/null | wc -l | tr -d ' ')
  if [ "${seitdem:-0}" -gt 12 ]; then
    printf "  \033[33mhinweis\033[0m  %s Commits seit dem letzten Versionssprung - Zeit fuer eine neue Nummer\n" "$seitdem"
  else
    ok "$seitdem Commits seit dem Versionssprung"
  fi
fi

echo
if [ $rot -eq 0 ]; then
  printf "\033[32mAlles gruen\033[0m - %s Pruefungen\n" "$gesamt"
else
  printf "\033[31mFehlschlag\033[0m - nicht einspielen\n"
fi
exit $rot

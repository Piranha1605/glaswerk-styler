#!/bin/sh
# Legt den zuletzt aufgenommenen Screenshot unter einem sprechenden Namen in
# docs/making-of ab.
#
#   werkzeuge/test/bild-ablegen.sh vergleich-vorher "Die drei Familien, bevor die Vorlage greift"
#
# Hintergrund: Screenshots aus dem Browser-Bereich landen als Blob im
# Ergebnisordner der Sitzung, mit einem Namen aus Zeitstempel und Zufall.
# Dort findet sie niemand wieder. Dieses Skript holt den juengsten, benennt
# ihn und schreibt eine Zeile in den Index - damit aus einer Sammlung Bilder
# eine Erzaehlung wird.
#
# Auf Ansage vom 13.10.2026: "mach auch von dieser seite immer screenshots.
# ich will davon am ende einen Making of film machen und eine vorankuendigung."

set -e
cd "$(dirname "$0")/../.." || exit 1
NAME="$1"
TEXT="$2"
[ -n "$NAME" ] || { echo "Aufruf: $0 <name> [beschreibung]"; exit 1; }

QUELLE="$HOME/.claude/projects/-Users-enricofischer-Projekte-ha-theme-studio"
ZIEL=docs/making-of
mkdir -p "$ZIEL"

# Das JUENGSTE reicht nicht als Regel.
#
# Ein Stapel Aktionen nimmt oft zwei Bilder auf: erst ein kleines, nur um die
# Seite zum Zeichnen zu bringen (der eingebaute Browser malt nicht, solange
# sein Fenster verdeckt ist), dann das richtige. Beide tragen DENSELBEN
# Zeitstempel im Namen und oft dieselbe Sekunde als mtime - welches "ls -t"
# dann vorn hat, ist Zufall.
#
# Am 14.10.2026 bezahlt: Zwei von drei Vergleichsbildern waren die Miniatur,
# 240 x 168 statt 800 x 560, und sie lagen schon im Commit. Am Dateinamen sieht
# man es nicht, an der Dateigroesse schon - 6 statt 37 kB.
#
# Also: unter den Bildern aus DERSELBEN Sekunde das groesste nehmen.
neustes=$(find "$QUELLE" -name "mcp-Claude_Browser-blob-*" -type f 2>/dev/null \
          | xargs ls -t 2>/dev/null | head -1)
[ -n "$neustes" ] || { echo "Kein Screenshot gefunden - erst einen aufnehmen."; exit 1; }
grenze=$(( $(stat -f %m "$neustes") - 2 ))
juengstes=$(find "$QUELLE" -name "mcp-Claude_Browser-blob-*" -type f -newermt "@$grenze" 2>/dev/null \
            | xargs ls -S 2>/dev/null | head -1)
[ -n "$juengstes" ] || juengstes="$neustes"

# Alter pruefen: ein Bild von gestern ist fast immer das falsche.
alter=$(( $(date +%s) - $(stat -f %m "$juengstes") ))
[ "$alter" -lt 600 ] || echo "Hinweis: Das juengste Bild ist $((alter / 60)) Minuten alt."

endung="${juengstes##*.}"
stand=$(date +%Y-%m-%d)
ziel="$ZIEL/${stand}-${NAME}.${endung}"
cp "$juengstes" "$ziel"

index="$ZIEL/README.md"
[ -f "$index" ] || cat > "$index" <<'KOPF'
# Making-of

Bilder aus der Entwicklung, in der Reihenfolge, in der sie entstanden sind.
Angelegt am 13.10.2026 fuer einen Film und eine Vorankuendigung.

| Bild | Was darauf zu sehen ist |
|---|---|
KOPF
printf '| [`%s`](%s) | %s |\n' "$(basename "$ziel")" "$(basename "$ziel")" "${TEXT:-—}" >> "$index"

echo "abgelegt: $ziel"
[ -n "$TEXT" ] && echo "   $TEXT"

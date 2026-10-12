# HATS — Home Assistant Theme Studio

Grafisches Panel für die Seitenleiste von Home Assistant, mit dem sich ein
komplettes Theme visuell bauen lässt — aufgesetzt auf die Farbebene von
HA 2026 (`--ha-color-*`), nicht auf die klassischen Einzelvariablen.
Entwickelt von Enrico Fischer (GitHub `Piranha1605`), MIT-Lizenz.

**Der Leitsatz: nur ändern, was man sieht.** HATG bietet 798 Variablen an. HATS
soll mit 15 Entscheidungen dasselbe erreichen, weil Home Assistant seit 2026
selbst so rechnet.

## Das Schwesterprojekt: HATG

HATS entsteht **getrennt** von HATG, in einem eigenen Repository. Entschieden am
12.10.2026, auf Ansage des Maintainers: ein Umbau über den Bestand wäre zu
riskant. HATG bleibt in Betrieb und wird weiter gepflegt — die HACS-Einreichung
läuft noch ([PR #9706](https://github.com/hacs/default/pull/9706)).

**Beide Projekte werden zusammen entwickelt.** HATG ist nicht das Altsystem, das
man abschaltet, sondern die Quelle: dort steckt das gemessene Wissen über Home
Assistant, UI eXtension, Bubble Card und Mushroom aus Monaten Arbeit an einer
laufenden Instanz.

### Wo das Wissen liegt

    /Users/enricofischer/Projekte/ha-theme-generator

| Datei | Was darin steht |
|---|---|
| `docs/uebergabe-neues-projekt.md` | **zuerst lesen.** Die Regeln, die unabhängig von HATGs Code gelten, mit den Kosten, die ihre Verletzung einmal hatte |
| `CLAUDE.md` | das vollständige Messwissen: HA-Variablen, UIX-Auflöser, Shadow-DOM-Eigenheiten, Fallen |
| `docs/zuordnung-neue-ebene.md` | Bubble und Mushroom auf die neue Ebene, jede Zahl an der Instanz nachgemessen |
| `docs/beispiele/ha-blanko.yaml` | HA 2026.10 ohne Altlasten, drei Ebenen richtig aufgeteilt — der Startpunkt |
| `docs/beispiele/zuordnung-bubble-mushroom.yaml` | die Zuordnung als lauffähige Theme, 159 Felder |
| `werkzeuge/` | `kopflos.js`, `theme-pruefen.js`, `live-messung.js` — die Muster lohnen, der Code nicht |

**Vor jeder Entscheidung dort nachsehen, nicht neu messen.** Fast jede Falle, in
die HATS laufen kann, ist dort schon beschrieben. Was dort nicht steht, wird an
der laufenden Instanz gemessen und danach **in beiden** Projekten notiert.

### Was aus HATG nicht übernommen wird

Vorlagen, Marker, Stilziele, `-yaml`-Felder, Shadow-DOM-Pfade. Am 12.10.2026
gemessen: die Zuordnung auf die neue Ebene läuft über gewöhnliche Theme-Felder,
weil CSS-Variablen durch jede Shadow-Grenze erben — ein Wert auf `html` kam
zwölf Ebenen tief an. Damit entfällt der größte und fehleranfälligste Teil von
HATG. **Solange es bei Rollen und Lautstärken bleibt, braucht HATS kein UIX.**

### Eine Theme gehört einem Werkzeug

Schickt man eine HATS-Theme durch HATGs Import, kommen dessen Vorgaben dazu —
gemessen 140 → 358 Bubble- und Mushroom-Felder. Kaputt wird nichts, alle
`var()`-Verweise überleben wörtlich, und von 57 Feldern, die HATG kennt, wurde
keines überschrieben. Die Datei wird nur fett und zweideutig.

Beide Panels können nebeneinander in der Seitenleiste stehen. Die Regel lautet
bloß: dieselbe Datei nicht in beiden bearbeiten.

## Aufbau

```
custom_components/hats/
├── __init__.py           Einstiegspunkt, Panel-Registrierung, Websocket
├── config_flow.py        Einrichtung über die Oberfläche
├── const.py              Domain, Version, Pfade
├── manifest.json         Domain hats
├── translations/         de.json und en.json
└── www/
    └── hats-panel.js     das Panel
docs/beispiele/           Start-Themes
werkzeuge/                Prüfwerkzeuge
```

**Die Domain ist `hats`** — nicht `hatg`, sonst lassen sich beide Integrationen
nicht nebeneinander installieren. Sie steckt in `manifest.json`, `const.py`, der
`panel_custom`-Registrierung und in HACS. Nachträglich zu ändern kostet die
Konfigurationseinträge der Nutzer: **vor dem ersten Release festlegen, danach
nicht mehr.** Bis dahin ist der Name frei verhandelbar.

Die Versionsnummer steht an drei Stellen und muss überall gleich sein:
`manifest.json`, `VERSION` in `const.py` und `HATS_VERSION` im Panel. Ein Test
vergleicht sie.

**Der Cache-Buster hängt am Inhalt, nicht nur an der Version.** HA liefert
statische Panel-Dateien mit `max-age=2678400` aus. Wer die Datei innerhalb
derselben Version austauscht — beim Entwickeln die Regel —, bekommt 31 Tage lang
den alten Stand, während die Kopfzeile die neue Version zeigt. `__init__.py`
rechnet deshalb eine kurze Prüfsumme über das Panel und hängt sie an.

## Das Gerüst: sechs Rollen, drei Lautstärken, drei Zustände

HAs eigenes Farbdenken, aus den Stylesheets auf `html` gelesen:

| | |
|---|---|
| Rollen | `primary`, `neutral`, `success`, `warning`, `danger`, `disabled` |
| Lautstärken | `quiet`, `normal`, `loud` |
| Zustände | `resting`, `hover`, `active` |

Die Abstufung rechnet HA vor — sie muss nicht erfunden werden:

    quiet    hell  95 -> 90        dunkel  05 -> 10
    normal   hell  90 -> 80        dunkel  10 -> 20
    loud     hell  40 -> 30        dunkel  40 -> 30

Überfahren ist eine Stufe kräftiger: im Hellen abwärts in der Zahl, im Dunkeln
aufwärts. Die Schrift darauf folgt mechanisch — `loud` → Weiß, `normal` → Stufe
40/60, `quiet` → 50/70.

Aus **15 Entscheidungen** werden damit 51 Füllfarben und 19 Schriftfarben
gerechnet.

**Noch nicht sauber, vor dem Einbau zu klären:** `active` kam in der Messung vom
12.10.2026 meist gleich `resting` heraus, was nach einem Messfehler riecht (die
zuletzt gefundene Regel gelesen, nicht die gültige); und
`ha-color-fill-primary-loud-*` fehlt in HAs 143 Dunkelwerten ganz. Beides steht
in `semantic.globals.ts`.

### Die Farbvielfalt kommt nicht aus der neuen Ebene

Sie hat fünf Töne — primary, neutral, red, green, orange — plus Schwarz und
Weiß. Mushroom will zwanzig, Bubbles Klimazustände brauchen Blau und Bernstein.
Die 22 klassischen Töne (`--red-color` … `--blue-grey-color`) leben weiter, am
12.10.2026 im inline-Stylesheet auf `html` gemessen, keiner leer.

**Ein vollständiger harter Cut auf die neue Ebene geht deshalb nicht.** Die
klassischen Töne gehören als eigene Gruppe für Zustandsfarben in HATS.

## Regeln, die ab Tag eins gelten

Ausführlich in `docs/uebergabe-neues-projekt.md` von HATG, hier das Nötigste:

- **Der Backslash ist das Fluchtzeichen in doppelt gequotetem YAML** und muss
  vor dem Anführungszeichen verdoppelt werden. Sonst entsteht eine ungültige
  Fluchtfolge, und wer `!include_dir_merge_named themes` benutzt, bekommt beim
  nächsten Start den **Wiederherstellungsmodus**. Das ist der schwerste Ausfall,
  den dieses Werkzeug auslösen kann. Gegenprobe mit PyYAML gehört in die CI.
- **Nur Felder schreiben, die Home Assistant, Bubble Card oder Mushroom selbst
  lesen.** Keine eigenen Hilfsfelder — sie hinterlassen beim Abschalten
  Verweise, die ins Leere laufen. Das gilt auch für Werte: eine Adresse, die nur
  die eigene Integration ausliefert, macht die Theme unübertragbar.
- **Am Ende steht eine ganz normale Theme-Datei.** Daran lässt sich jede
  Entscheidung messen.
- **`modes.light` gilt nur im Hellmodus.** Modusunabhängige Werte gehören auf
  die flache Ebene, über `modes:`. Sonst fehlen sie im Dunkeln — und mit ihnen
  die Tripel, die HA daraus ableitet.
- **Tripel entstehen nur aus Werten mit `#`.** `rgba()` und benannte Farben
  nicht. Mushroom baut seine Zustandsfarben aus genau diesen Tripeln, also
  entweder Hex erzwingen oder beim Speichern umrechnen.
- **Idempotenz ab dem zweiten Durchlauf.** Der erste darf normieren; danach darf
  sich nichts mehr ändern. In HATG lief ein Fehler lange mit, der pro Durchlauf
  1027 Zeichen anhängte.
- **Nie gegen dasselbe Orakel prüfen, das der Code benutzt**, und jeder Test
  braucht eine Gegenprobe. Ein Test mit null Prüfungen darf nicht grün sein.
- **Gemessen, nicht gelesen.** Ein Ausweichwert aus dem Quelltext ist nur eine
  Vorgabe, wenn er der einzige ist und die Variable nirgends blank gelesen wird.
  Ein Feld mit leerer Vorgabe wird gar nicht geschrieben, bleibt aber
  einstellbar.
- **Die Seite muss gemalt sein.** In einem Hintergrund-Tab baut ein
  Sections-Dashboard nicht auf, und dann ist jede DOM-Messung wertlos — erkennbar
  daran, dass alles leer aussieht, auch das Funktionierende.

## Die Instanz

`http://192.168.178.31/` — **Port 80, nicht 8123.** Ein Dashboard liegt unter
`/dashboard-home/ubersicht`. Der Browser-Bereich der Claude-App hält die
Anmeldung über Sitzungen hinweg; nie nach einem Token oder Passwort fragen und
nie eines eintragen.

```js
const hass = document.querySelector("home-assistant").hass;
hass.themes.theme        // die geladene Theme
hass.themes.darkMode     // der Modus
```

**Vor jedem Schreiben `hass.themes.theme` neu lesen**, nicht aus dem Gedächtnis —
die aktive Theme wechselt mitten in der Sitzung. Gegenprobe immer über
`getComputedStyle(document.documentElement)`, nicht über das Theme-Objekt: nur
das Berechnete beweist, dass ein Wert ankommt.

Das Ereignis `settheme` bleibt tabu — die Theme des Nutzers wird nicht
umgeschaltet.

## Schreibstil

Sachlich, per du, **keine Emojis, kein Marketing-Sprech**. Funktionen
beschreiben, was sie tun, nicht wie großartig sie sind.

Alles, was nach außen geht — README, Release Notes, Issue-Antworten,
Dokumentation — **immer in beiden Sprachen, deutsch und englisch**. Das
Repository hat dafür `README.md` und `README.en.md`.

## Umgang mit GitHub

Nichts auf GitHub anlegen, beantworten, kommentieren oder schließen, ohne dass
der Maintainer es sagt. Antwortentwürfe vorschlagen ist erwünscht.

Das Repository auf GitHub ist zum 12.10.2026 **noch nicht angelegt** — das
geschieht erst auf Ansage.

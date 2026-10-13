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

Die Abstufung rechnet HA vor — sie muss nicht erfunden werden. Am 12.10.2026 aus
`src/resources/theme/color/semantic.globals.ts` gelesen, nicht aus dem
berechneten Stylesheet geraten.

**`quiet` und `normal` sind für jede Rolle dieselben Stufen:**

    quiet    hell  95 -> 90 -> 95        dunkel  05 -> 10 -> 05
    normal   hell  90 -> 80 -> 90        dunkel  10 -> 20 -> 10

Gelesen als `resting -> hover -> active`. Überfahren ist eine Stufe kräftiger:
im Hellen abwärts in der Zahl, im Dunkeln aufwärts.

**`active` ist gleich `resting`, und das ist Absicht.** Die Rückmeldung beim
Drücken kommt aus der Klick-Welle (`--ha-ripple-*`), nicht aus der Fläche. Wer
hier einen dritten Wert einbaut, weicht von HA ab.

**Nur `loud` hängt an der Rolle:**

    Rolle       hell                    dunkel
    primary     primary-40 -> -30       (kein Eintrag - siehe unten)
    neutral     neutral-40 -> -30       neutral-60 -> -70
    danger      red-50 -> -40           red-40 -> -30
    warning     orange-70 -> -50        orange-40 -> -30
    success     green-50 -> -40         green-40 -> -30
    disabled    neutral-80              neutral-30 -> -40

**`fill-primary-loud-*` fehlt im Dunkelblock, weil es dort nichts zu ändern
gibt** — hell steht es auf `primary-40`, und die Palette ist modusunabhängig, der
Wert passt im Dunkeln schon. HAs Dunkelblock ist ein Minimal-Diff, genau wie die
flache Ebene in `docs/beispiele/ha-blanko.yaml`. Ein fehlender Eintrag ist dort
also eine Aussage, kein Loch.

Die Schrift darauf folgt mechanisch: `loud` → Weiß, `normal` → Stufe 40/60,
`quiet` → 50/70.

Aus **15 Entscheidungen** werden damit 51 Füllfarben und 19 Schriftfarben
gerechnet — und weil `quiet` und `normal` rollenunabhängig sind, reduziert sich
die Eingabe weiter: je Rolle ein Farbton plus eine Entscheidung für `loud`.

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

### Kein eigenes `rgb-`Feld — es blockiert HAs Ableitung

Gemeldet am 12.10.2026: „im Dunkelmodus ist die Menüleiste dunkel". Gemessen war
es schlimmer, als es klingt — HAs Seitenleiste färbt ihre Symbole mit

    --sidebar-icon-color: rgba(var(--rgb-primary-text-color), .6)

und `--rgb-primary-text-color` stand im Dunkeln auf `33, 33, 33`, obwohl
`--primary-text-color` auf `#e1e1e1` stand. Dunkelgrau auf `#1c1c1c`: Kontrast
**1.19 : 1**, also unsichtbar.

**Der Grund.** Home Assistant rechnet die Tripel selbst, je Modus
(`apply_themes_on_element.ts`) — und überspringt einen Namen, sobald die Theme
ihn mitbringt:

```js
if (!value.startsWith("#")) continue;
if (combinedTheme[`rgb-${key}`] !== undefined) continue;   // ← hier
styles[`--rgb-${key}`] = hex2rgb(value).join(",");
```

`ha_blanko` brachte **zehn** solche Felder flach mit, mit festen Hell-Werten.
Drei davon haben eine modusabhängige Quelle (`primary-text-color`,
`secondary-text-color`, `card-background-color`) — die nagelten den Hell-Wert in
den Dunkelmodus. Sechs waren nur redundant, gingen aber schief, sobald der
Nutzer die Farbe änderte: `rgb-accent-color` stand auf `255, 152, 0`, während
`--accent-color` längst `#e8833a` war.

**Die Regel: gar kein `rgb-`Feld schreiben.** HA definiert alle zehn Namen
ohnehin selbst auf `html` (am 12.10.2026 aus `document.styleSheets` gelesen), es
geht also nichts verloren. Woran man eine Ableitung erkennt: HAs eigene Werte
tragen Leerzeichen (`33, 33, 33`), abgeleitete nicht (`232,131,58`).

**Die eine Ausnahme ist `rgb-primary-color`**, und zwar aus dem umgekehrten
Grund: `primary-color` steht als `var(--ha-color-primary-40)` in HAs Stylesheet
und **nicht** im Theme, also leitet HA auch kein Tripel dafür ab — es bliebe auf
HAs altem Cyan `0, 154, 199`. Ein fester Wert ist dort richtig, weil die Palette
in beiden Modi dieselbe ist. Für alles mit modusabhängiger Quelle wäre er falsch.

Dabei gefunden, beide stumm: `var(--ha-color-90)` statt `--ha-color-neutral-90`
und `var(--ha-color-neutral-00)` — die Palette hat keine Stufe `00`, sie fängt
bei `05` an. Beide lösen zu nichts auf, ohne Meldung.
`tests/hats-blanko.test.js` hält alles fest, mit Gegenproben.

**Den Modus umzuschalten geht von außen nicht.** Weder `frontend.set_theme`
(setzt nur die globale Zuordnung) noch `frontend/set_user_data` noch
`localStorage` noch die `prefers-color-scheme`-Emulation des Browsers greifen
durch: HA schreibt seinen aufgelösten Stand bei jedem Laden zurück. Der einzige
Weg wäre das `settheme`-Ereignis, und das ist verboten. Wer im Dunkeln messen
will, lässt den Nutzer einmal im Profil umschalten.

### Erst Bubbles eigene Rückfallkette lesen, dann zuordnen

Am 12.10.2026 an `bubble-card.js` 3.2.0 nachgelesen (1 MB, klammernzählend
gesucht). Zwei Dinge, die die Zuordnungstabelle um sechs Einträge kürzer und um
einiges richtiger gemacht haben:

**Bubble ist an vielen Stellen schon an HA gebunden.** Die Kette lautet

    var(--bubble-state-climate-auto-color, var(--state-climate-auto-color, …))

Bubble fällt also von sich aus auf HAs Zustandsfarbe zurück. Eine eigene
Zuordnung dorthin ist nicht nur überflüssig, sie **überschreibt** einen
richtigen Wert — in diesem Fall HAs `#4caf50` mit einem Fast-Schwarz. Dasselbe
innerhalb von Bubble selbst: `--bubble-button-accent-color` fällt auf
`--bubble-accent-color` zurück, das muss man nicht dreimal setzen.

**Ein Akzent ist ein Vordergrund, eine Fläche ist ein Hintergrund.**
`--ha-color-fill-<rolle>-normal-*` ist bei HA eine dezent getönte Fläche für
Überfahr-Zustände. Bubble benutzt seine `--bubble-*-accent-color` dagegen als
Füllfarbe — Slider-Füllung, Rahmen, Dropdown-Pfeil, Sub-Button. Sieben Einträge
zeigten auf die Fläche; im Dunkeln ergab das

    #090f35 auf einer Karte in #1c1c1c   ->  Kontrast 1.09 : 1

also unsichtbar. Zum Vergleich an derselben Stelle: `fill-primary-loud-resting`
1.68 : 1, `--accent-color` **6.28 : 1**. Bei einem blauen Primärton reicht auch
die laute Stufe nicht — Blau hat von allen Farbtönen die geringste
Wahrnehmungshelligkeit, und eine HSL-Rampe gleicht das nicht aus.

Die Unterscheidung macht der **Name des Ziels**, nicht der Wert:
`bubble-button-background-color` auf `fill-neutral-quiet-resting` ist genau
richtig. `tests/hats-zuordnung.test.js` prüft deshalb nur Namen mit „accent",
mit Gegenprobe.

**Und: der Ausweichwert steht im Bauteil, nicht in der Variablen.**
`--ha-card-background`, `--ha-dialog-surface-background` und
`--ha-card-backdrop-filter` setzt HA **nirgends** — `ha-card` liest
`var(--ha-card-background, var(--card-background-color))`. Ein nacktes
`var(--ha-card-background)` in der Zuordnung löste deshalb zu nichts auf, und
Bubble nahm seine eigene Vorgabe statt der Theme. Sechs Einträge waren so tot.
Die Ausweichwerte gehören aus `customElements.get(tag).elementStyles` gelesen,
nicht geraten. `--ha-dialog-scrim-color` gibt es übrigens gar nicht; HA liest
`--mdc-dialog-scrim-color`, darunter `--wa-color-overlay-modal` mit `#00000040`.

### Zwei Felder, die nur auf Lovelace ankommen

Am 12.10.2026 beim Bau von `hats_studio` gemessen, beide sehen gesetzt aus und
wirken trotzdem nicht überall:

**`--ha-font-family-body` erreicht `body` nicht.** Im globalen Stylesheet von
Home Assistant steht

    body { font-family: Roboto, Noto, sans-serif }

ohne Variable davor. Gelesen wird der Name nur von `hui-root` und `ha-tooltip`.
Auf einem Lovelace-Dashboard kommt die Schrift also an, auf der neuen
**Home-Seite** (`ha-panel-home`) und auf den Einstellungsseiten nicht.

**`--lovelace-background` liest genau ein Bauteil**, `hui-view-background`. Das
entsteht nur unter `ha-panel-lovelace`. Dazu: Ein Hintergrundbild aus der
**Dashboard-Konfiguration** liegt darüber — der Theme-Wert ist dann zwar
gesetzt und wird auch gelesen, man sieht ihn nur nicht. Wer den Verlauf sucht
und das Bild vergisst, hält das Feld für kaputt.

Das Feld steht nicht in `ha_blanko`, weil HA es nicht vorbelegt; aufgenommen ist
es trotzdem, weil es der einzige Weg zu einem Verlauf hinter dem Dashboard ist.

### Drei Fallen beim Einspielen, alle am 12.10.2026 bezahlt

**`node --check` fängt nicht alles.** Eine doppelte Deklaration im selben
Gültigkeitsbereich — ein `const` mit dem Namen eines Parameters — kam damit
durch. Erst der Browser warf

    Uncaught SyntaxError: Identifier 'schluessel' has already been declared

und das Panel war eine leere blaue Fläche. Dieselbe Quelle über stdin geprüft
fällt sofort auf:

```bash
node --input-type=module --check < custom_components/hats/www/hats-panel.js
```

`tests/hats-syntax.test.js` fährt das über alle Dateien, mit Gegenprobe — und
mit einer zweiten Prüfung, die festhält, dass `node --check` es wirklich nicht
findet. Wird node irgendwann strenger, fällt die um, und der Umweg kann weg.

**Python lädt Home Assistant nur beim Start.** Ein Reload des
Konfigurationseintrags ruft `async_unload_entry` und `async_setup_entry` auf
demselben, schon importierten Modul auf. Geänderter Python-Code kommt damit
nicht an. Dazu kam eine selbstgebaute Falle: `_registriere_websocket` hatte
eine Sperre, die beim zweiten Mal heraussprang — ein Reload liess die **alte**
Funktion registriert, und ein geänderter Websocket-Befehl antwortete weiter
wie vorher, ohne Fehlermeldung. Die Sperre ist weg; mehrfaches Anmelden ist
unschädlich, weil `async_register_command` nur in ein Dict schreibt.

Und: **`config_entries/reload` gibt es als Websocket-Befehl nicht** („Unknown
command"). Der Weg ist der Dienst `homeassistant.reload_config_entry`. Für
Python-Änderungen hilft ohnehin nur `homeassistant.restart`.

**Der Terminal im Studio Code Server verfremdet `;` zu `\;`.** Eine Schleife
zerlegt es damit, und die Shell hängt in ihrer Fortsetzungszeile fest — aus der
kommt man nicht mit Ctrl+C heraus, weil der Browser das abfängt, sondern nur,
indem man ihr das fehlende `done` gibt. Also: **keine Semikolons, keine
Schleifen, nur `&&`.**

### Das Panel setzt seine Schriftfarbe selbst

`input`, `textarea`, `select` und `button` erben ihre Farbe sonst aus Home
Assistant, und in einem dunklen Theme ist das Weiss. Am 12.10.2026 stand der
Hexwert `#5468e0` weiss auf durchsichtigem Grund im Farbwähler: Der Wert war da,
zu sehen war nichts. Dieselbe Falle wie `.modal-box` in HATG. Der Speichern-Knopf
ist die Ausnahme — er ist dunkel und braucht weiter weisse Schrift.

### Flach oder je Modus ist eine Wahl, keine Eigenschaft

Gefragt am 12.10.2026: „wie kann ich hell und dunkel getrennt einstellen". Die
Antwort war: gar nicht — ob ein Feld flach steht oder unter `modes`, stand fest
in der Felddefinition. Jetzt ist es ein Umschalter, und der Stand kommt aus dem
**Modell**, nicht aus `f.ebene`; die Definition sagt nur noch, womit begonnen
wird.

**Aufteilen muss erst kopieren.** `setze(modell, name, wert, "light")` löscht
den flachen Eintrag und schreibt nur nach hell — der Dunkelmodus stünde danach
ohne Wert da, still und ohne Meldung. `teileAuf()` kopiert den geltenden Wert
deshalb in **beide** Modi, bevor der flache wegfällt. Ein Test hält das fest,
und eine Gegenprobe hält fest, dass `setze` allein es wirklich verliert.

**`aendere` folgt der Wahl, nicht der Definition.** Stünde dort weiter
`f.ebene === "getrennt" ? … : "beide"`, führte jede Änderung an einem als
„beide" definierten Feld es sofort wieder zusammen: Der Nutzer hätte
umgeschaltet und trotzdem beide Modi überschrieben.

**Die fünf Rollen bleiben flach.** Jede setzt elf Palettenstufen auf einmal,
und HA rechnet daraus die RGB-Tripel, aus denen Mushroom lebt — eine halb
aufgeteilte Rampe wäre in einem Modus unvollständig. Der Knopf steht dort
allein und trägt die Begründung als `title`; ohne sie sähe es nach einem
Versehen aus.

### Ein- und Ausgabe: der Bericht ist der eigentliche Teil

Lesen konnte HATS fremde Themes immer — `leseTheme` legt jedes Feld ins
Modell, `schreibeTheme` gibt es wieder aus, ob die Oberfläche es kennt oder
nicht. Was fehlte, war nicht die Fähigkeit, sondern die **Auskunft**: Ohne
Bericht glaubt man, ein Feld sei weg, nur weil keine Kachel dafür da ist.

`berichtUeberTheme()` trennt deshalb vier Dinge, und nur eines davon ist rot:

    bedienbar      hat eine Kachel
    mitgenommen    bleibt unveraendert in der Datei, ist hier nicht aenderbar
    stilziele      uix-* oder card-mod-* - die Theme gehoert HATG
    unklar         Zeilen, die der Leser nicht einordnen konnte - DIE sind weg

**Mehrzeilige Werte brauchen einen Blockskalar.** Beim ersten Import einer
HATG-Theme am 13.10.2026 meldete der Bericht **155 unlesbare Zeilen** — es war
der Rumpf der `uix-`Blöcke. Zwei Fehler an derselben Stelle:

- `leseTheme` war zeilenweise und kannte `|` nicht. Der Schlüssel kam an, der
  Rumpf fiel weg.
- `quote()` hätte beim Zurückschreiben die Umbrüche mitten in einen gequoteten
  Skalar gelegt. **YAML faltet die zu Leerzeichen** — aus einem CSS-Block wird
  eine Zeile, und ein `/* … */` frisst alles dahinter.

Geschrieben wird jetzt `|-`, und `|` nur, wenn der Wert auf einen Umbruch
endet: Ohne das Minus hängt YAML beim Lesen einen an, und der Rundlauf stimmt
nicht mehr. Die PyYAML-Gegenprobe deckt die mehrzeiligen Fälle mit ab — das ist
die Prüfung, die zählt, denn ein falscher Blockskalar kostet nicht ein Feld,
sondern die ganze Datei.

Nach der Korrektur: dieselbe Datei, **null unlesbare Zeilen**, 287 bedienbar,
400 mitgenommen, 13 Stilziele.

## Der Aufbau der Oberfläche

Am 13.10.2026 festgelegt: **oben HA, rechts die Add-ons.**

```
┌───────────────────────────────────────────────┐
│ ● [8 Stufen]            │ [6 Aktionen]        │   Menüleiste
├──────────────────────────────────┬────────────┤
│  Guten Tag / Startbild           │  Add-ons   │
│  Kennzahlen                      │  Bubble    │
│  Stufenliste                     │  Mushroom  │
│                                  │  UIX  ○○○  │
└──────────────────────────────────┴────────────┘
```

**Eine Leiste statt dreier Stellen.** Vorher gab es eine Symbolleiste links,
eine runde Schalterreihe oben und Startkarten in der Mitte — drei Orte für
dasselbe. Jetzt eine Pille oben, nach dem Vorbild der Menükarte auf dem
Dashboard des Nutzers: links die acht Stufen, rechts die Aktionen, die
aktuelle Stufe im Akzent.

**Nur Symbole, keine Beschriftung** — die Übersichtsseite darunter nennt jede
Stufe ohnehin beim Namen, und so passt die Leiste in jede Breite. Dafür trägt
jeder Knopf `title` und `aria-label`.

**Speichern steht im Kopf, nicht in der Leiste.** Zweimal derselbe Knopf
nebeneinander ist einer zu viel.

### Die Starteinstellungen gehören aufs Startbild

Name, Herkunft, Modus und die beiden Hintergrundbilder entscheiden sich,
**bevor** man an Farben geht. Sie standen als Kachelgruppe in Stufe 1 und
sitzen jetzt dort, wo man eine Theme öffnet. Ohne offene Theme sind die Felder
gesperrt, nicht versteckt — dieselbe Entscheidung wie bei der Menüleiste.

`--popup-custom-wallpaper` ist dafür dazugekommen. Es steht wie
`--lovelace-background` nicht in `ha_blanko`, weil HA es nicht vorbelegt;
Bubble liest es vor `lovelace-background` für seine Pop-ups.

### UIX: Stilziele an- und abschalten, mehr nicht

Rechts, unter den Add-ons, stehen die **28 Stilziele** von UI eXtension, jedes
mit einem Schalter und einem Feld für CSS. `custom_components/hats/www/uix.js`
hält die Namen — zeichengenau aus HATG übernommen, denn es sind die Typnamen
von UIX. Stimmt einer nicht, entsteht ein Feld, das nie gelesen wird; HATG hat
das mit `uix-states-history-charts` teuer gelernt.

**Nur die einfache Form, kein `-yaml`.** Ein `-yaml`-Feld verdeckt sein
einfaches Feld vollständig: Liegt `uix-<typ>-yaml` im Theme, wird `uix-<typ>`
nie mehr gelesen. Wer Shadow-DOM-Pfade braucht, nimmt HATG.

**Abschalten vernichtet nichts.** Das CSS wandert nach `ZUSTAND.uixAus` und
kommt beim Wiedereinschalten wortgetreu zurück — ein Schalter, der Arbeit
vernichtet, ist kein Schalter.

### Bilder liegen in `config/www/hats`

Denselben Weg wie HATG, und aus demselben Grund. Sie kommen unter
**`/local/hats/<name>`** von Home Assistant **selbst**.

**Warum das wichtig ist:** Eine Adresse, die nur HATS ausliefert, macht eine
weitergegebene Theme unbrauchbar — beim Empfänger bliebe der Hintergrund leer,
ohne Fehlermeldung, weil ein fehlendes Bild in CSS einfach nichts tut. HATG hat
das am 2026-09-30 an einer weitergegebenen Theme gelernt. Das Versprechen „am
Ende steht eine ganz normale Theme-Datei" gilt eben auch für die Werte, nicht
nur für die Feldnamen.

Drei Websocket-Befehle: `hats/list_images`, `hats/upload_image`,
`hats/delete_image`. Am 13.10.2026 an der Instanz durchgespielt:

    probe bild!.png   ->  probe_bild.png      Name gesaeubert
    ganz anders.png   ->  probe_bild.png      doppelt erkannt, eine Datei
    ../../boese.sh    ->  invalid_name        abgewiesen, auch beim Loeschen

- **Kein Pfadausbruch.** `Path(...).name` wirft jedes Verzeichnis weg, die
  Endungsliste jede ausführbare Datei. Beides zusammen, nicht eins davon.
- **Inhaltsgleiche Bilder landen nicht doppelt auf der Platte.** Geprüft wird
  über die SHA-256 des Inhalts, nicht über den Namen; bei gleichem Namen und
  anderem Inhalt wird durchgezählt (`-2`, `-3`), nicht überschrieben.
- **`/local` hängt an `config/www` zum Startzeitpunkt.** Legt HATS den Ordner
  gerade erst an, bleibt `/local` bis zum nächsten Neustart tot — das steht als
  Warnung im Log, sonst sucht man den Fehler in der Theme.

## Werkzeuge

```bash
werkzeuge/pruefen.sh                   alles ohne Instanz: Syntax, Tests, Versionen
werkzeuge/einspielen.sh                Dateien auf die Instanz, mit Gegenprobe
werkzeuge/einspielen.sh www/theme.js   nur eine
```

`werkzeuge/README.md` hält die Schleife und die Fallen fest — angelegt am
13.10.2026 auf Ansage: *„kannst du die Werkzeuge die du ständig brauchst mal
dokumentieren. Du machst immer die selben fehler."* Zu Recht; es waren immer
dieselben vier.

**Die Schleife:** ändern → `pruefen.sh` → `einspielen.sh` → Befehl in den
Terminal → **Integration neu laden** → im Browser messen. Schritt fünf ist der,
den man vergisst; dann sucht man den Fehler im Code, und er liegt im Cache.

**Was die Skripte abnehmen**, statt dass man es sich merken muss:

- Der erzeugte Befehl enthält **keine Semikolons und keine Schleife** — der
  Terminal im Studio Code Server verfremdet ein getipptes `;` zu `\;`.
- „Ist es angekommen?" war Raten. `/hats_static` ist vom Mac aus **ohne
  Anmeldung lesbar**, also wird byteweise verglichen statt gehofft.
- `pruefen.sh` parst jede Datei **als Modul über stdin**, nicht mit
  `node --check` — das lässt eine doppelte Deklaration durch, und dann lädt das
  Panel gar nicht.
- Ein Test mit **null** Prüfungen gilt als Fehlschlag, nicht als bestanden.

**Was vom Mac aus nicht geht:** schreiben. Port 22 und 445 sind zu, die
REST-API will einen Token. Lesen geht über Port 80. Würde SSH oder Samba
eingerichtet, fiele der Terminal-Umweg weg.

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

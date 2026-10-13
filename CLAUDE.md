# HATS — Home Assistant Theme Studio

Grafisches Panel für die Seitenleiste von Home Assistant, mit dem sich ein
komplettes Theme visuell bauen lässt — aufgesetzt auf die Farbebene von
HA 2026 (`--ha-color-*`), nicht auf die klassischen Einzelvariablen.
Entwickelt von Enrico Fischer (GitHub `Piranha1605`), MIT-Lizenz.

**Der Leitsatz: nur ändern, was man sieht.** HATG bietet 798 Variablen an. HATS
soll mit 15 Entscheidungen dasselbe erreichen, weil Home Assistant seit 2026
selbst so rechnet.

> **Mehrere Sitzungen arbeiten hier.** Die Absprache steht in
> `/Users/enricofischer/Projekte/TEAM.md` — wer koordiniert, wo gearbeitet wird
> und was angemeldet gehört, bevor es losgeht. Zuerst lesen.

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
    ├── hats-panel.js     das Panel
    └── hats-control-card.js   die Steuerkarte fuer Dashboards
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

**Den Modus von außen umzuschalten geht — der Satz, der hier stand, war
falsch.** Er lautete „geht von außen nicht", und gemessen war er mit dem
falschen Schlüssel. Der richtige steht unten im Abschnitt *Die Steuerkarte*:
`frontend/set_user_data` mit dem Schlüssel `theme`. Was weiter stimmt:
`frontend.set_theme` setzt nur die globale Zuordnung, und in den `localStorage`
schreibt HA seinen aufgelösten Stand zurück.

An der Instanz im Heimnetz bleibt es trotzdem dabei, dass der Nutzer selbst im
Profil umschaltet: Die Wahl gilt für **jedes** Gerät, an dem er angemeldet ist.

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

Am 13.10.2026 festgelegt und noch am selben Tag nachgeschärft: **alles oben,
nichts rechts.**

```
┌───────────────────────────────────────────────┐
│ ● [8 Stufen]        │ [UIX] [6 Aktionen]      │   Menüleiste
├───────────────────────────────────────────────┤
│  Guten Tag / Startbild                        │
│  Kennzahlen                                   │
│  Stufenliste                                  │
└───────────────────────────────────────────────┘
```

Zuerst stand rechts eine Add-on-Spalte mit Bubble, Mushroom und UIX. Sie ist
wieder weg, auf Ansage: *„UIX kann auch hoch ins Menü da bubble und Mushroom da
auch schon in Fremdkarten liegen. so haben wir rechts frei."* Bubble und
Mushroom sind über Stufe 6 erreichbar, UIX über ein eigenes Symbol oben — und
die Fläche gehört wieder dem Inhalt.

**UIX braucht die Breite.** Zehn Vorlagen als Karten mit Bild, darunter die
28 Stilziele hinter einem Aufklapper. In einer 290px-Spalte war davon nichts
lesbar; im Dialog über die ganze Breite stehen vier Karten nebeneinander.

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
werkzeuge/sync-instanz.sh              die Schleife: die Instanz holt von selbst
werkzeuge/vorschau.js                  eine Theme ansehen, ohne sie zu aktivieren
werkzeuge/liquid-glass-bauen.mjs       die Beispiel-Theme bauen
werkzeuge/test/vollbild-messen.mjs     das Vollbild der Steuerkarte an einem echten Chrome
```

**Die Schleife ist der Hebel.** Ohne sie kostet jede Änderung einen Gang in den
Terminal des Studio Code Server. Mit ihr liegt eine lokale Änderung nach **neun
Sekunden** auf der Instanz — am 13.10.2026 gemessen. Sie holt ihre Dateiliste
jede Runde neu (`werkzeuge/sync-dateien.txt`) und erneuert sich selbst, wenn
das Skript sich ändert. Wie sie gestartet wird, steht in `werkzeuge/README.md`.

**Ein Reload des Konfigurationseintrags bleibt trotzdem nötig.** `/hats_static`
ist mit `cache_headers=False` registriert und trägt kein `Cache-Control` — aber
genau dann darf ein Browser heuristisch cachen, und Chrome tut es. Die Datei lag
byteweise neu auf der Instanz, und die Seite zeigte nach zwei vollen Reloads
weiter den alten Stand. Erst die neue Prüfsumme in der Adresse brachte ihn durch.

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

## Nie ein Feld schreiben, das HATS nicht anbietet

Am 13.10.2026 beim Bau der Liquid-Glass-Theme aufgefallen: Das Build-Skript
setzte `--primary-color`, und der Bericht meldete es zu Recht als „kennt HATS
nicht". Das Feld wäre in der Datei gelandet, hätte gewirkt — und niemand hätte
es je wieder ändern oder entfernen können, weil es im Panel nicht vorkommt.

**Die Regel gilt in beide Richtungen.** Entweder das Feld ist nötig, dann
gehört es in die Feldliste. Oder es ist es nicht, dann gehört es aus der Datei.
Ein Mittelweg ist kein Mittelweg, sondern eine Sackgasse für den Nutzer.

Dieselbe Falle hat HATG erlebt: `--ha-color-fill-primary-loud-*` und
`--ha-color-border-primary-loud` sind keine HATG-Felder; wer sie von Hand ins
Theme schreibt, bekommt sie beim nächsten Speichern nicht wieder heraus.

**Der Bericht ist die Prüfung dafür** — er zählt beim Einlesen jedes Feld, das
HATS nicht kennt, und nennt es beim Namen. Wer eine Theme baut, liest ihn.

## Ein Hintergrund an der Ansicht gewinnt über `lovelace-background`

Am 13.10.2026 aufgefallen, als die Theme ihren Farbverlauf nicht zeigte: Die
Ansicht trug ein eigenes Bild.

```yaml
views:
  - title: Musterseite
    background:
      image: {media_content_id: …}
      attachment: fixed
      size: cover
```

Das ist eine Dashboard-Einstellung, kein Theme-Feld — und es überdeckt
`--lovelace-background` vollständig. Die Theme ist dabei völlig in Ordnung; das
Feld steht korrekt am `html`-Element und lässt sich auch dort auslesen.

**Das Erkennungsmerkmal:** `getComputedStyle(document.documentElement)` liefert
den Verlauf aus der Theme, und auf dem Bildschirm ist er trotzdem nicht zu
sehen. Dann liegt es nicht an der Theme. Nachsehen mit:

```js
const panel = document.querySelector('home-assistant').shadowRoot
  .querySelector('home-assistant-main').shadowRoot
  .querySelector('partial-panel-resolver').children[0];
panel.lovelace.config.views.map(v => [v.path, !!v.background]);
```

## `uix-theme` ist der Schalter — ohne ihn kommt keine Vorlage an

**Das Wichtigste über UIX-Vorlagen, und es stand nirgends.** UIX wendet seine
Felder nur an, wenn die Theme sich auf Theme-Ebene mit ihrem eigenen Namen
ausweist:

```yaml
liquid_glass:
  uix-theme: "liquid_glass"     # ← ohne das ist jede Vorlage wirkungslos
  uix-card: |
    …
```

**Der Ausfall ist vollständig und lautlos.** Am 13.10.2026 gemessen, nachdem
der Maintainer meldete, Bubble laufe nicht richtig:

- 39 von 39 `uix-node`-Knoten leer — auch `drawer`, `sidebar` und `root`, die
  sonst sofort stehen
- die Felder lagen korrekt als `--uix-card` usw. am `html`-Element
- UIX war geladen und meldete in der Konsole nichts
- auch eine triviale Regel (`ha-card { outline: 3px solid lime }`) kam nicht an
  — es lag also nicht am CSS
- nach dem Ergänzen von `uix-theme`: **31 von 39 gefüllt**

**Und es sieht fast richtig aus.** Die *Felder* wirken ja — Glasflächen,
Rundungen, Farben, alles da. Nur die Vorlagen fehlen, und man sucht den Fehler
im CSS.

`uixSchalterSetzen()` in `theme.js` setzt ihn bei jeder Ausgabe, sobald ein
Stilziel im Theme steht, und nimmt ihn wieder heraus, wenn die letzte Vorlage
ausgeht. Vier Prüfungen halten es fest, Umbenennung eingeschlossen — ein
`uix-theme`, das auf den alten Namen zeigt, schaltet nämlich auch nichts.

### Was daraus für die Arbeit an HATS folgt

**Wenn HATS etwas nachbaut, was HATG schon kann, gehört HATGs AUSGABE daneben,
nicht nur seine Dokumentation.** Der Schalter stand seit jeher in HATGs Code
(`HATG_UIX_THEME_KEY`), und in HATGs CLAUDE.md wird `uix-theme` beiläufig
erwähnt — aber nirgends steht, dass ohne ihn nichts funktioniert. Ein Blick in
eine von HATG erzeugte Theme hätte die Zeile sofort gezeigt. Stattdessen habe
ich das Vorlagensystem aus der Beschreibung nachgebaut und den Tag damit
verloren.

Der billigste Abgleich dafür, in jeder Sitzung zu haben:

```js
// Was haben die Themes, die auf dieser Instanz funktionieren, und meine nicht?
const t = document.querySelector('home-assistant').hass.themes.themes;
Object.fromEntries(Object.entries(t).map(([n, v]) =>
  [n, Object.keys(v).filter(k => k.startsWith('uix-'))]));
```

## Jede Vorlage bekommt sofort ihr Bild

**Auf Ansage vom 13.10.2026:** *„Mach dir immer gleich screenshots für eine
datenbank unserer vorlagen da haben wir immer gleich ein bild dazu."*

Der Grund ist nicht Kosmetik. Ein Vorlagenname sagt niemandem, was er bekommt —
„Lichtkante auf Karten" kann alles heißen. Und ein Bild, das erst Wochen später
nachgereicht wird, entsteht nie: Am 13.10. hatten acht von zwölf Vorlagen keins,
weil der Zustand dafür erst wieder hergestellt werden müsste.

**Der Ablauf, sobald eine Vorlage steht:**

1. An der laufenden Instanz anwenden — mit `werkzeuge/vorschau.js`, das die
   Vorlage einzeln schalten kann (`nur(theme, [id])`) und die `uix-node`-Knoten
   der aktiven Theme stilllegt.
2. **Zwei** Bilder: dieselbe Stelle einmal ohne und einmal mit der Vorlage.
   Beide mit derselben Theme — ein Vorher-Bild aus einer anderen Theme
   vergleicht zwei Dinge auf einmal und schreibt der Vorlage zu, was die
   Felder getan haben.
3. Ausschnitt mit `sips` auf 16:10, dort wo die Wirkung sitzt. Bei Icons der
   Bubble-Bereich, bei Flächen die Karten, bei der Leiste die Seitenleiste.
4. Beide als Asset in die Werkbank laden, die zurückgegebene URL in die
   `vorlagen`-Sammlung ihrer Datenbank schreiben.

**Wenn kein Unterschied zu sehen ist, gehört das notiert statt beschönigt.**
Bei `glas-toast` und `glas-badges` gibt es auf der Musterseite keinen Wirt —
`ha-badge` und `ha-toast` entstehen erst im Betrieb. Ein Bild ohne erkennbaren
Unterschied ist schlechter als keines: Es behauptet, geprüft zu sein.

## Vorlagen für UIX

Seit dem 13.10.2026 bringt HATS zehn fertige CSS-Blöcke mit, Gruppe **Liquid
Glass**. Sie stehen in `custom_components/hats/www/vorlagen.js`, die Mechanik
dazu in `theme.js`.

**Eine Vorlage schreibt zwischen zwei Marker in das Feld ihres Stilziels:**

```
/* HATS:glas-karten:START */
ha-card { … }
/* HATS:glas-karten:ENDE */
```

Drei Regeln, jede davon in HATG teuer gelernt:

1. **Einschalten hängt an, es ersetzt nicht.** Eigenes CSS daneben bleibt
   stehen — sonst wäre ein Fehlklick der Verlust einer Stunde Arbeit.
2. **Von doppelten Blöcken bleibt nur der letzte.** In HATG lagen einmal 23
   Glas-Vorlagen doppelt in einer Theme.
3. **Eine fremde Vorsilbe wird mitgelesen.** Eine umbenannte Kopie trägt
   `/* HORIZON:glas-karten:START */`; wer nur auf die eigene schaut, hängt die
   Vorlage ein zweites Mal an.

**Eine Vorlage liest Theme-Felder, sie nagelt keine Farben fest.**
`var(--ha-card-background)` statt `rgba(255,255,255,.5)`. Sonst wäre die Vorlage
ein zweiter Ort, an dem dieselbe Farbe steht — der Nutzer ändert das Feld, und
nichts tut sich. Nur was HA gar nicht als Feld anbietet (die Weichzeichnung der
Seitenleiste etwa), steht als fester Wert da, mit `var()` davor.

**Und ein `uix-`Feld gilt für Hell und Dunkel zugleich.** Was sich zwischen den
Modi unterscheiden muss, gehört in ein Theme-Feld. `light-dark()` hilft nicht:
Es folgt dem Betriebssystem, und HA setzt kein `color-scheme`.

`tests/hats-vorlageninhalt.test.js` prüft die Vorlagen gegen die bekannten
Fallen — kein Filter auf blankem `:host` (das lässt Bubble-Pop-ups auf Höhe 0
zusammenfallen), keine Weichzeichnung auf einer Dialogfläche (die legt die
Auswahllisten darin neben den Bildschirm), beide Klassennamen der Kopfleiste,
kein `--card-background-color`, `pointer-events` auf jeder Schicht.

### Bubble: die Kette ist dreistufig, die erste Stufe ist typspezifisch

Am 13.10.2026 gemessen, nachdem der Maintainer darauf hinwies, dass Bubble „für
jeden Schalter eine eigene Bezeichnung" hat. `--bubble-icon-border-radius` auf
28 % gesetzt: **zwei von fünf** Icons wurden eckig, drei blieben rund — obwohl
die Variable an jedem der fünf auf 28 % stand.

```css
border-radius: var(--bubble-card-type-icon-border-radius,
                   var(--bubble-icon-border-radius,
                       var(--bubble-border-radius, 50%)));
```

Die erste Stufe setzt Bubble selbst, je Kartentyp — ein Wert von außen kommt
dort **nie** an. Je Variable einzeln gesetzt und gemessen:

    --bubble-card-type-icon-border-radius   0 von 5   wirkungslos
    --bubble-icon-border-radius             5 von 5
    --bubble-button-icon-border-radius      3 von 5   nur card_type: button

**Richtig ist die allgemeine Stufe, und nur sie.** Sie erreicht alle
Kartentypen und lässt Bubbles Typlogik in Ruhe. Die typspezifischen Namen
treffen genau ihren Typ — nützlich, wenn man einen Typ anders haben will.

**Die Falle beim Messen:** Ein erster Lauf ergab „2 von 5" und führte zu dem
Schluss, man müsse die card-type-Stufe mitsetzen. Gemessen wurde dabei die
Wirkung der laufenden Theme, die genau diese Stufe belegt hatte — nicht die der
eigenen Vorlage. Deshalb legt `werkzeuge/vorschau.js` die `uix-node`-Knoten der
aktiven Theme still, bevor es misst.

**Und dasselbe gilt für die Kartenfläche.** Am 13.10.2026 an acht
Bubble-Karten durchprobiert — je Variable einzeln gesetzt, den berechneten
Radius an `.bubble-container` abgelesen (nicht an der `ha-card` darüber, die
trägt `--ha-card-border-radius`):

    --bubble-card-type-border-radius       0 von 8   wirkungslos
    --bubble-border-radius                 8 von 8
    --bubble-button-border-radius          3 von 8   genau die button-Karten
    --bubble-separator-border-radius       3 von 8   genau die Separatoren
    --bubble-climate-border-radius         1 von 8   genau die Klimakarte
    --bubble-media-player-border-radius    1 von 8   genau der Player

Jeder Kartentyp hat seinen eigenen Namen, und jeder trifft genau seinen Typ.
Die allgemeine Stufe erreicht alle. Die `card-type`-Stufe ist von außen in
beiden Fällen — Icons wie Flächen — wirkungslos.

**Bubble hat keine Weichzeichnungs-Variable für die Kartenfläche.** Am
13.10.2026 in `bubble-card.js` 3.4.1 nachgesehen: Es gibt genau drei Namen mit
„backdrop", und alle drei gehören zum Abdunkel-Schleier hinter einem Pop-up
(`.bubble-backdrop`, `position: fixed`). `.bubble-container` trägt überhaupt
kein `backdrop-filter`. Glas für Bubble-Karten geht deshalb **nur über eine
Regel** — und die gehört auf `.bubble-container`, nicht auf `:host`: Ein Filter
am Wirt macht ihn zum Bezugsrahmen für `position: fixed`, und die Pop-ups
fallen zusammen.

**Jeder Kartentyp trägt seine eigene Container-Klasse**, an acht Karten
abgelesen — damit lässt sich ein Typ ansprechen, ohne die Variablenkette zu
bemühen:

    separator      bubble-container bubble-separator separator-container
    button         bubble-button-container bubble-container …
    climate        bubble-climate-container bubble-container
    media-player   bubble-media-player-container bubble-container

`.bubble-separator-container` gibt es dagegen **nicht** — ein erster Versuch
zielte darauf und traf nichts.

### Eine Theme lässt sich von außen nicht aktivieren

**Die Überschrift stimmt nicht mehr.** Am 13.10.2026 standen hier drei Wege,
„keiner greift durch". Zwei davon stimmen: `frontend.set_theme` setzt nur
`default_theme`, und in den `localStorage` schreibt HA seinen aufgelösten Stand
zurück. Der dritte war mit dem falschen Schlüssel gemessen —
`frontend/set_user_data` unter `selectedTheme`, den Home Assistant nie liest.
Unter **`theme`** greift er sofort und ohne Neuladen; siehe *Die Steuerkarte*.

Für eine Messung an einer einzelnen Vorlage bleibt die Vorschau trotzdem der
bessere Weg: Sie schaltet nichts um, was der Nutzer danach zurückstellen müsste.

Dafür gibt es `werkzeuge/vorschau.js`: Es schreibt die Felder selbst auf
`<html>` und hängt das `uix-`CSS von Hand in die Shadow Roots. Zwei Dinge sind
dabei nötig, sonst lügt die Messung:

- **Dort einhängen, wo UIX es täte** — unter einer `hui-card` an das
  Karten-Element, sonst an die `ha-card`. Wer beide nimmt, bemalt doppelt, und
  die Ausnahmen treffen nicht: `:host(hui-heading-card)` passt in der inneren
  `ha-card` nicht mehr, und Überschriftenkarten behalten ihre Fläche.
- **Die `uix-node`-Knoten der aktiven Theme stilllegen** (auf der Instanz des
  Nutzers 39 Stück). Sonst misst man einen Kampf statt eine Vorlage.

## Die Steuerkarte

Seit dem 13.10.2026 bringt HATS eine Karte für Dashboards mit. Sie schaltet im
Moment zwei Dinge: den Modus (automatisch, hell, dunkel) und das Vollbild.

```yaml
type: custom:hats-control-card
controls: [mode, fullscreen]    # Auswahl und Reihenfolge; fehlt die Zeile: beide
kiosk_only: false               # true: kein Vollbild des Browsers
```

Sie liegt in `custom_components/hats/www/hats-control-card.js` und wird mit
`frontend.add_extra_js_url` angemeldet, **nicht** als Lovelace-Ressource: Eine
Ressource stünde in der Konfiguration des Nutzers und bliebe liegen, wenn HATS
geht. Der Name `hats-control-card` steht in jedem Dashboard, das die Karte
benutzt — wie die Domain ist er **bis zum ersten Release** frei, danach nicht.

### Die Regel: alles, was sie benutzt, stellt Home Assistant

Auf Ansage vom 13.10.2026: *„bedenke das alles was benutzt wird von ha gestellt
werden muss"*. Keine Bibliothek, keine fremde Karte, kein eigenes Symbol, keine
eigene Farbe.

| | |
|---|---|
| Bauteile | `ha-card`, `ha-icon` (mdi), `ha-ripple` |
| Farben und Maße | dieselben Variablen, die `ha-control-select` und `ha-control-button` lesen — aus deren `elementStyles` abgeschrieben |
| Modus | das Ereignis `settheme` |
| Vollbild | das Ereignis `hass-kiosk-mode` |
| Meldung | das Ereignis `hass-notification` (HAs Toast) |
| Editor | `getConfigForm` — Home Assistant zeichnet das Formular selbst |

`tests/hats-steuerkarte.test.js` hält das fest: nur diese drei Bauteile, nur
diese drei Ereignisse, keine Farbe außer dem Weiß, das auch in
`ha-control-select` fest steht, und jede gelesene Variable muss in der Liste
der gemessenen stehen.

**Die Maße, an der Testinstanz neben einer Kachel abgelesen:** Spur
`rgb(70,70,70)` bei 20 Prozent und 12px Rundung — bei der Karte wie bei HAs
eigener Auswahlleiste. 40px hoch, 20px-Symbole, die ganze Karte 56px, also
genau eine Zeile im Sections-Raster. UIX hängt seinen Knoten von selbst in den
Shadow Root der Karte; Fläche, Weichzeichnung, Rundung und Schatten waren
dieselben wie an der Kachel daneben, ohne eine Zeile dafür.

**Warum nicht `ha-control-select` selbst:** Ein nicht angemeldetes Element
zeichnet nichts, ohne Meldung. Ob Home Assistant dieses Bauteil auf jedem
Dashboard anmeldet, ließ sich nicht klären — an der Testinstanz war es auch
auf einer Ansicht ohne Kachel da, aber dort laden Mushroom und Bubble mit.

### `settheme`: was Home Assistant damit tut

Aus dem Bündel von 2026.10.1 gelesen und an der Testinstanz nachgemessen. Die
Funktionsnamen sind dort verkürzt; `storeState` und `saveThemePreferences`
sind meine Lesart dessen, was die beiden Aufrufe tun:

```js
this.addEventListener("settheme", (e) => {
  this._updateHass({ selectedTheme: { ...this.hass.selectedTheme, ...e.detail } });
  this._applyTheme(mql.matches);
  storeState(this.hass);                          // localStorage
  saveThemePreferences(this.hass, selectedTheme); // frontend/set_user_data, key "theme"
});
```

- **Der Hörer sitzt am Element `<home-assistant>`.** Das Ereignis muss
  aufsteigen und `composed` sein, sonst bleibt es im Shadow Root der Karte.
- **Das Detail wird gemischt.** Die Karte schickt nur `{dark: …}`, der
  Theme-Name bleibt stehen. Für „automatisch" muss der Schlüssel **da** sein
  und `undefined` tragen — fehlt er, bleibt der alte Wert.
- **Die Wahl liegt beim Nutzer auf dem Server, nicht im Browser.** Schlüssel
  `theme` in den Nutzerdaten, und Home Assistant abonniert ihn. Gemessen: Ein
  Schreiben über eine **zweite** Verbindung schaltete den offenen Browser von
  hell auf dunkel, ohne dass ihn jemand anfasste.

      nach Klick „Hell"        Server {"dark":false,"theme":"liquid_glass"}
      nach Klick „Automatisch" Server {"theme":"liquid_glass"}
      Schreiben von außen      Browser folgt in unter zwei Sekunden

  **Wer auf dem Wandtablett umschaltet, schaltet also auch sein Telefon um**,
  wenn beide denselben Nutzer haben. Das ist Home Assistants Verhalten, nicht
  das der Karte — aber es gehört gesagt, bevor es jemand als Fehler meldet.

Gemessen ist das Umschalten des **Modus**. Dass derselbe Weg auch den
Theme-Namen trägt, steht im selben Code, ist aber nicht nachgemessen: Auf der
Testinstanz gibt es nur eine Theme.

**Das Verbot von `settheme` gilt weiter für das Messen.** Die Karte löst es
aus, wenn der Nutzer drückt — genau wie die Zeile im Profil. Ich löse es nicht
aus, um an der Instanz im Heimnetz etwas anzusehen.

### Wann der Modus überhaupt schaltbar ist

Das entscheidet die Theme, nach HAs `_applyTheme`:

```js
if (theme) {
  if (theme.modes && "dark" in theme.modes) {
    if (!("light" in theme.modes)) dunkel = true;
  } else dunkel = false;
}
```

Eine Theme ohne `modes.dark` ist **immer** hell, eine nur mit `modes.dark`
immer dunkel. Das Ereignis käme an und würde gespeichert, zu sehen wäre nichts.
Die Karte sperrt die Wahl dann, zeigt den Modus, der gilt, und sagt beim
Drücken über HAs Toast, warum. Gesperrt, nicht versteckt, und **nicht**
`disabled`: Ein abgeschalteter Knopf kann nichts mehr melden.

Gelesen wird `hass.themes.theme` — die **wirksame** Theme, nicht die Wahl im
Profil. Die Standard-Theme hat keinen Eintrag in `themes.themes` und kann beides.

Der Test dazu prüft nicht gegen die eigene Regel: Er rechnet mit HAs
Funktion aus, was am Ende angezeigt wird, und verlangt, dass „schaltbar" genau
dann gilt, wenn hell und dunkel zu verschiedenen Ergebnissen führen.

### `hass-kiosk-mode`: Home Assistants Vollbild ist keins

```js
window.addEventListener("hass-kiosk-mode",
  (e) => this._updateHass({ kioskMode: e.detail.enable }));
```

An einem 1024px breiten Fenster gemessen:

    Seitenleiste     255px -> 0
    Kopfzeile        bleibt, 57px hoch
    darin bleiben    die Reiter und Assist
    darin gehen      Menüknopf, Hinzufügen, Suchen, Bearbeiten

- **Es wird nicht gespeichert.** Ein Neuladen stellt alles zurück.
- **Es gibt keinen Menüknopf mehr.** Wer im Kiosk-Modus auf eine Ansicht ohne
  die Karte wechselt, kommt nur über ein Neuladen wieder heraus.
- **Die Kopfzeile bleibt.** Dafür hat Home Assistant keinen Schalter; sie
  auszublenden hieße, CSS in `hui-root` zu legen, und das stellt HA nicht.
- **Ein eigenes Vollbild hat Home Assistant nicht.** In den 107 Bündeln, die
  ein Dashboard lädt, kommt `requestFullscreen` nicht vor.

Deshalb die **eine Ausnahme** von der Regel oben: Die Karte fragt zusätzlich
den Browser nach seinem Vollbild. Mit `kiosk_only: true` bleibt es bei dem, was
Home Assistant selbst kann. Die beiden sind gekoppelt — wer das Vollbild mit
Esc verlässt, verlässt auch den Kiosk-Modus —, und die Karte räumt nur auf, was
sie selbst geöffnet hat: Ein Kamerabild im Vollbild beendet sie nicht.

**Das Vollbild des Browsers lässt sich im eingebauten Browser der Claude-App
nicht messen.** Dort blieb `requestFullscreen()` offen: echter Klick,
`navigator.userActivation.isActive` war `true`, und das Versprechen wurde weder
erfüllt noch abgelehnt. Gemessen ist es deshalb an einem echten Chrome, kopflos
und ohne Home Assistant:

```bash
node werkzeuge/test/vollbild-messen.mjs
```

Das Skript öffnet `werkzeuge/test/vollbild-probe.html` — die Karte mit einem
nachgebauten `hass` — und klickt über das Debug-Protokoll. Am 13.10.2026 mit
Chrome 155, acht Prüfungen:

    Klick auf die Karte          Kiosk an, <html> im Vollbild
    Vollbild endet von außen     Kiosk aus            (das, was Esc tut)
    Klick, Klick                 Vollbild zu, Kiosk aus, nichts doppelt
    kiosk_only                   Kiosk an, kein Vollbild
    fremdes Vollbild auf und zu  Kiosk bleibt         (Gegenprobe)

Dieselbe Seite lässt sich von Hand öffnen, solange der Dateiserver läuft:
`http://localhost:8778/werkzeuge/test/vollbild-probe.html`.

**Zwei Fallen beim Messen, beide bezahlt.** `fullscreenchange` kommt erst mit
dem nächsten gezeichneten Bild, und ein kopfloser Chrome zeichnet nur, wenn ihn
etwas dazu bringt: Nach festen 700 ms stand `fullscreenElement` schon, das
Ereignis kam erst im nächsten Schritt an und verfälschte den. Das Skript wartet
jetzt auf den Zustand und stößt das Zeichnen mit einem Bildschirmfoto an. Und
ein Klick auf eine ausgerechnete Stelle traf daneben — das Fenster ist 700
Pixel hoch, der sichtbare Bereich nicht. Koordinaten kommen aus der Seite.

`tests/hats-steuerkarte-vollbild.test.js` fährt dieselbe Kopplung ohne Browser
gegen ein nachgebautes `document`, zwölf Fälle. Dort stehen die, die sich an
einem Browser nicht herstellen lassen: die Anfrage, die offen bleibt, und die
Erlaubnis, die erst nach dem Abwählen kommt.

**Nicht gemessen:** Safari, Firefox und die Companion-Apps. Wo es
`requestFullscreen` nicht gibt, bleibt es beim Kiosk-Modus — das ist geprüft,
aber an keinem solchen Gerät angesehen.

### `kiosk_only` heißt so herum, weil ein Formular Fehlendes als „aus" zeigt

HAs Schalter im Editor zeigt ein fehlendes Feld als aus. Hieße das Feld
`browser_fullscreen` mit Vorgabe an, stünde der Schalter auf aus, während die
Karte das Gegenteil täte. Dieselbe Überlegung bei `controls`: Der Kartenwähler
legt die Liste ausdrücklich an (`getStubConfig`), sonst zeigte der Editor ein
leeres Auswahlfeld neben einer Karte mit beiden Teilen.

Ein unbekannter Name in `controls` ist ein **Fehler**, kein stilles Nichts —
sonst verschwände bei einem Tippfehler einfach ein Knopf.

### Dabei gefunden: `ws.mjs` hielt jedes Skript zwei Minuten fest

`ruf()` stellte seine Uhr nicht ab, wenn die Antwort kam. `dashboard-bauen.mjs`
war nach 60 Millisekunden fertig und kehrte nach 120 Sekunden zurück — und mit
`| tail` dahinter sah man bis dahin keine Zeile. Zweimal für einen Hänger
gehalten und abgebrochen, obwohl beide Läufe längst geschrieben hatten. Die
Uhr wird jetzt mit der Antwort gelöscht. Und `{type: "ping"}` beantwortet Home
Assistant mit `pong`, nicht mit `result`; `ruf()` kannte nur das zweite.

## Zustand im DOM: drei Familien, drei Marken

Am 13.10.2026 an der Instanz gemessen, mit echtem CSS im UIX-Einhängepunkt
gegengeprüft (29 Karten, kein Fehlschlag). Das ist die Grundlage für jede
zustandsabhängige Vorlage — Icon-Animationen, Glühen, Drehen.

| Familie | aktiv | inaktiv | Domäne |
|---|---|---|---|
| HA-Kachel | `ha-tile-icon:not([data-state="off"])` | `[data-state="off"]` | `[data-domain="fan"]` |
| Bubble | `ha-card.is-on` | `ha-card:not(.is-on)` | `.is-light` (nur `card_type: button`) |
| Mushroom | `mushroom-shape-icon[style*="--icon-color"]` | `:not([style*="--icon-color"])` | Tagname: `:host(mushroom-fan-card)` |

Alle drei sind von `uix-card` aus erreichbar, ohne Shadow-Grenze: UIX hängt
seinen Knoten in den Shadow Root des **Karten-Elements** (`mushroom-light-card`,
`bubble-card`, `hui-tile-card`), und die Icons liegen darin. `ha-state-icon`
sitzt im **Licht-DOM** von `ha-tile-icon` und von `mushroom-shape-icon` — ein
Nachfahrenselektor trifft es.

**Die Mushroom-Falle: `[style]` trifft beide Zustände.** Bei „aus" ist das
Attribut nicht weg, sondern **leer**:

    an:   style="--icon-color:rgb(129,173,255);--shape-color:rgba(…, 0.25);"
    aus:  style=""

`hasAttribute("style")` ist in beiden Fällen `true`, nur `getAttribute` liefert
einmal `""`. Wer `[style]` als Hook nimmt, markiert jede Karte als aktiv.
`[style*="--icon-color"]` trennt sauber. Die aussagekräftigere Marke
`div.shape.disabled` liegt eine Shadow-Grenze tiefer und ist von außen nicht
erreichbar.

**Was der Mushroom-Hook wirklich sagt, ist „hat eine Farbe", nicht
„eingeschaltet".** Eine Sensorkarte fällt damit in den Aktiv-Zweig, weil
Mushroom ihr eine Farbe gibt. Für Animationen taugt das; für eine Aussage über
den Schaltzustand nicht.

**Bei HA reicht `[data-state="on"]` nicht.** Eine Heizung steht auf `auto`,
`heat` oder `cool` — gemessen: `data-state="auto"` fiel damit in den Aus-Zweig,
obwohl die Heizung läuft. `:not([data-state="off"]):not([data-state="unavailable"])`
ist die richtige Form.

**Bei Bubble trägt nur `card_type: button` die Domäne.** `climate` und
`media-player` bekommen bloß `is-on`/`is-off`. Wer die Domäne braucht, nimmt
`div.bubble-main-icon-container[data-entity^="fan."]` — der Container trägt die
volle Entitäts-ID als `data-entity`.

## Bubbles Slider: `--bubble-slider-color` gibt es nicht

Am 13.10.2026 im Stylesheet der laufenden Karte gezählt: **null** Vorkommen von
`--bubble-slider-color`, zwei von `--bubble-slider-fill-color`. Bubble 3.2.0
liest für die Füllung:

```css
background-color: var(--bubble-slider-fill-color,
                      var(--bubble-light-color, rgb(225, 225, 210))) !important;
```

und setzt `--bubble-slider-fill-color` **inline am Element**, aus der Lichtfarbe
selbst umgerechnet. Gemessen an derselben Lampe: HA und Mushroom standen beide
auf `#81adff`, Bubble auf `rgb(119, 160, 237)` — dieselbe Farbe, von Bubble
abgedunkelt. **Die drei laufen also schon im Auslieferungszustand auseinander.**

Was dagegen hilft, gemessen mit drei Gegenproben an derselben Karte:

| Versuch | Ergebnis |
|---|---|
| `background-color: X` | verliert — Bubbles eigene Regel trägt `!important` |
| `background-color: X !important` | **gewinnt** |
| `--bubble-slider-fill-color: X !important` | **gewinnt** |

Der zweite Weg ist der sauberere: Er lässt Bubbles Regel stehen und tauscht nur
die Farbe. Ohne `!important` kommt nichts an — **zweimal** nicht, denn inline
schlägt jede Regel und Bubbles Regel trägt selbst `!important`.

**Praktische Folge:** Ein `styles:`-Block in einer Kartenkonfiguration, der
`var(--bubble-slider-color, var(--accent-color))` schreibt, trifft nie die
Lichtfarbe — der erste Name ist tot, also greift immer der Ausweichwert.

## Gearbeitet wird auf der Testinstanz, nicht am laufenden Haus

**Auf Ansage vom 13.10.2026**, nachdem ein Nachmittag an Terminal-Umwegen,
einer abgerissenen Sync-Schleife und einem leer geschriebenen Dashboard
verloren ging: *„warum arbeiten wir nicht auf dem system da hast du vollen
zugriff ohne netzwerk. und unser aktiefes system hat ruhe"*

    http://localhost:8123        Home Assistant OS 18.3, HA 2026.10.1
    /Users/enricofischer/Projekte/haos-test/

**Achtung bei den Ports — die beiden Instanzen machen es genau umgekehrt:**

| | Adresse | warum |
|---|---|---|
| Testmaschine | `localhost:**8123**` | QEMU reicht Mac-8123 auf **VM-Port 80** durch |
| Heimnetz | `192.168.178.31` (**Port 80**) | HAOS liefert dort direkt auf 80 aus |

Innerhalb beider Maschinen laeuft Home Assistant auf Port 80. Die Notiz „Port
80, nicht 8123" weiter unten gilt **nur fuer das Heimnetz**; bei der
Testmaschine fuehrt sie in die Irre. Port 80 am Mac ist frei und soll es
bleiben — ihn zu belegen braucht Admin-Rechte und bringt nichts.

Eine QEMU-Maschine auf dem Mac, kein Container. HACS, UIX 8.4.0, Bubble Card,
Mushroom, HATG und HATS sind installiert. Die Instanz im Heimnetz
(`192.168.178.31`) bleibt in Ruhe und wird nur noch angefasst, wenn
ausdrücklich etwas **dort** zu prüfen ist.

**Was dadurch wegfällt — jede dieser Stellen hat schon Zeit gekostet:**

| vorher, Heimnetz | jetzt, Testinstanz |
|---|---|
| Befehl in den Terminal des Studio Code Server tippen lassen | `konsole.py` schickt ihn direkt |
| Sync-Schleife, deren Ausfall man erst an einer falschen Messung merkt | ein Aufruf, mit byteweiser Gegenprobe |
| Dateiserver, den `einspielen.sh` beim Start selbst abschoss | ein laufender Server wird erkannt und behalten |
| `fetch()` ins LAN, vom Browser blockiert | alles auf `localhost` |
| ein Fehlgriff trifft das Dashboard des Hauses | ein Fehlgriff trifft eine Testmaschine |

### Die Werkzeuge der Maschine

Sie liegen bei der Maschine, nicht im Projekt — sie gehören ihr, nicht HATS:

    ./starten.sh / ./stoppen.sh     Maschine an und aus
    ./konsole.py "<befehl>"         Shell in der Maschine, ueber die serielle Konsole
    ha.py                           REST-Zugang (Token aus zugang.conf, wird nie ausgegeben)
    ws.mjs                          Websocket

Die Konfiguration liegt in der Maschine unter
`/mnt/data/supervisor/homeassistant`. Den Mac erreicht sie unter **`10.0.2.2`**
— darüber holt sie sich Dateien, ohne dass etwas durchs Heimnetz muss.

### Einspielen

```bash
werkzeuge/einspielen-test.sh              alles aus sync-dateien.txt
werkzeuge/einspielen-test.sh www/theme.js nur diese
werkzeuge/test-reload.sh                  Integration neu laden (JS)
werkzeuge/test-reload.sh --neustart       ganz neu starten (Python)
```

**Die serielle Konsole schneidet eine zu lange Zeile ab, ohne es zu melden.**
Am 13.10.2026 mit 19 Dateien in einem Befehl gemessen: `curl: (2) no URL
specified`, und sieben Dateien fehlten. Der Fehler sieht aus wie ein
curl-Problem und ist ein Längenproblem. Deshalb geht das Einspielen in Blöcken
zu drei Dateien.

**Der Reload bleibt nötig**, aus demselben Grund wie im Heimnetz: `/hats_static`
trägt kein `Cache-Control`, und dann darf ein Browser heuristisch cachen. Erst
eine neue Prüfsumme in der Adresse bringt den neuen Stand durch, und die wird
nur beim Setup gerechnet. Für Python reicht ein Reload nicht — er ruft
`async_unload_entry` und `async_setup_entry` auf demselben, schon importierten
Modul auf.

## Die Instanz im Heimnetz

**Nur noch fuer Messungen, die wirklich dort stattfinden muessen** — der
Arbeitsplatz ist die Testinstanz oben.

**Und seit dem 13.10.2026 gibt es dorthin keinen Dateizugang mehr.** HATG und
HATS sind als Integration entfernt und ihre Ordner nach
`/config/entfernt-2026-10-13/` verschoben (samt `sync-hats.sh`); das Add-on
Studio Code Server ist deinstalliert. Was bleibt, ist die Weboberflaeche und
die Websocket-Schnittstelle — also Dashboards, Entitaeten und Einstellungen,
aber **keine Datei**. Die Theme `liquid_glass` liegt dort autark und auf dem
Stand vom 13.10.2026; sie braucht keinen Generator, es steht keine Adresse und
kein `var(--hats-*)` darin.

Wer dort wieder schreiben muss, braucht erst wieder ein Add-on (Studio Code
Server oder File Editor) oder Samba. Das ist Absicht: Das Haus soll Ruhe
haben.

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

### Ein toter Tab sieht aus wie ein lebender

Am 13.10.2026 gemessen, nachdem die Musterseite serverseitig auf `{"views":[]}`
stand — 12 Bytes — während ein offener Tab sie noch vollständig zeigte.

**Eine abgerissene WebSocket-Verbindung ist von außen nicht zu sehen.** Der Tab
war angemeldet (`hass.user` gesetzt), die Seite gezeichnet, alle 25 Karten da.
Jede Anfrage scheiterte trotzdem — und zwar mit der **nackten Zahl 3**:

    try { await conn.sendMessagePromise({type: "lovelace/config", url_path: "x"}) }
    catch (e) { e.message }      // undefined
                                 // JSON.stringify(e)  ->  "3"

`3` ist `ERR_CONNECTION_LOST` aus `home-assistant-js-websocket` (1 =
`ERR_CANNOT_CONNECT`, 2 = `ERR_INVALID_AUTH`, 4 = `ERR_HASS_HOST_REQUIRED`, 5 =
`ERR_INVALID_HTTPS_TO_HTTP`). Wer `e.message` loggt, bekommt `undefined` und
sucht den Fehler an der falschen Stelle. **Vor jeder Messung an einer Instanz
erst `conn.sendMessagePromise({type: "ping"})`** — sonst misst man den Tod der
Leitung und hält ihn für einen Befund.

**Der gerenderte Zustand überlebt den Verlust.** Das ist die Falle: Ein Tab
zeigt weiter alles, was beim letzten erfolgreichen Laden ankam. Zwei Tabs auf
derselben Seite können deshalb Verschiedenes zeigen, und der, der noch etwas
zeigt, ist nicht der mit der besseren Verbindung — nur der mit dem älteren
Stand.

**Gerettet werden konnte sie nur durch Glück:** Jedes `hui-card`-Element trägt
seine `config` als Eigenschaft, auch wenn der Server nichts mehr hergibt.

```js
[...document.querySelectorAll("hui-card")].map((k) => k.config)
```

Daraus ließen sich 4 Abschnitte und 25 Karten rekonstruieren, samt des langen
`styles`-Blocks auf der Bubble-Karte. Ein Neuladen des Tabs hätte das vernichtet.

**Was daraus folgt: vorher sichern, nicht hinterher rekonstruieren.**
`werkzeuge/dashboards-sichern.js` holt jede Dashboard-Konfiguration über
`lovelace/dashboards/list` und `lovelace/config` als Download. Die Sicherungen
liegen in `werkzeuge/sicherungen/dashboards/` und sind **nicht** committet. Am
13.10.2026 standen dort 195 Karten in 10 Ansichten allein für das
Haupt-Dashboard — das ist die Größenordnung, um die es geht.

**Was offen bleibt: wodurch die Seite leer wurde.** Nicht bewiesen. Was dafür
spricht, dass der Editor es war: Der tote Tab stand auf `?edit=1`, und ein
Lovelace-Editor, der mit leerer Konfiguration öffnet und dann speichert,
schreibt leer zurück. Was dagegen spricht: Der Hergang ließ sich nicht
nachstellen, und ein Schreibbefehl scheitert auf einer toten Leitung genauso wie
ein Lesebefehl. Bis das geklärt ist, gilt die Vorsichtsregel: **einen Tab im
Bearbeitungsmodus nicht offen stehen lassen**, erst recht keinen, dessen
Verbindung gezuckt hat.

Zurückgeschrieben wird mit demselben Befehl, den der Editor benutzt — und
danach **vom Server gegengelesen**, nicht aus dem Speicher:

```js
await conn.sendMessagePromise({ type: "lovelace/config/save",
                                url_path: "musterseite", config: gerettet });
await conn.sendMessagePromise({ type: "lovelace/config",
                                url_path: "musterseite", force: true });
```

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

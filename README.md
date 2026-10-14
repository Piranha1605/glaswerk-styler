# HATS — Home Assistant Theme Studio

Grafisches Panel für die Seitenleiste von Home Assistant, mit dem sich ein
komplettes Theme visuell bauen lässt — aufgesetzt auf die Farbebene von
HA 2026, nicht auf die klassischen Einzelvariablen.

**Stand: 0.2.0b5, in Arbeit.** HATS liest und schreibt Themes, bringt einen
Baukasten mit fertigen Teilen mit und eine Steuerkarte für Dashboards.
Veröffentlicht ist es noch nicht.

## Worum es geht

Home Assistant rechnet seine Oberfläche seit 2026 aus einer eigenen Farbebene:
sechs Rollen (`primary`, `neutral`, `success`, `warning`, `danger`, `disabled`),
drei Lautstärken (`quiet`, `normal`, `loud`), drei Zustände (`resting`, `hover`,
`active`). Aus **15 Entscheidungen** entstehen so 51 Füllfarben und 19
Schriftfarben.

HATS setzt genau darauf auf. Der Leitsatz: **nur ändern, was man sieht.**

Und weil Bubble Card und Mushroom ihre Variablen aus derselben Ebene lesen
können, gilt eine Zuweisung für Hell und Dunkel zugleich — ohne UI eXtension,
ohne CSS-Regeln, ohne Shadow-DOM-Pfade. CSS-Variablen erben durch jede
Shadow-Grenze; nachgemessen kommt ein Wert von `html` zwölf Ebenen tief an.

Am Ende steht eine ganz normale Theme-Datei.

## Verhältnis zu HATG

[HATG](https://github.com/Piranha1605/ha-theme-generator) bleibt in Betrieb und
wird weiter gepflegt. HATS ist kein Ersatz, der HATG abschaltet, sondern ein
zweiter, einfacherer Weg — bewusst in einem eigenen Repository, mit eigener
Integrations-Domain, damit beide nebeneinander installiert sein können.

Die eine Regel beim Nebeneinander: **eine Theme gehört einem Werkzeug.** Eine
HATS-Theme übersteht HATGs Import unbeschadet — alle Verweise bleiben wörtlich
stehen —, HATG hängt aber seine eigenen Vorgaben an. Dieselbe Datei nicht in
beiden bearbeiten.

Das gemessene Wissen über Home Assistant, Bubble Card und Mushroom liegt in
HATGs `CLAUDE.md` und in `docs/uebergabe-neues-projekt.md`. HATS baut darauf auf,
statt es neu zu erarbeiten.

## Was dabei herauskommt

Dieselbe Ansicht, dieselbe Fenstergröße, dieselben Karten — nur die Theme
wechselt. Drei Bilder, nicht zwei: Ohne das mittlere schreibt man den
UIX-Vorlagen zu, was die Felder getan haben.

**Home Assistant, wie es ausgeliefert wird.**

![Dasselbe Dashboard ohne Theme, im dunklen Modus](docs/bilder/vergleich-1-vorher.jpg)

**Mit einer HATS-Theme — nur die Felder.** Apples Systemfarben, Glas auf den
Karten, Rundungen, Schatten, ein Hintergrund aus vier Farbinseln. Das ist eine
gewöhnliche Theme-Datei: kein UI eXtension, keine CSS-Regel, kein
Shadow-DOM-Pfad.

![Dasselbe Dashboard mit der Theme macos, ohne UIX](docs/bilder/vergleich-2-nur-felder.jpg)

**Dieselbe Theme mit UI eXtension.** Die Seitenleiste wird durchscheinend und
die aktive Zeile zur Pille im Akzent; dazu Trennlinien zwischen den
Abschnitten. UIX ist der Feinschliff — der größere Teil steht schon im Bild
davor.

![Dasselbe Dashboard mit der Theme macos und UIX](docs/bilder/vergleich-3-mit-uix.jpg)

## Der Baukasten

Wer nicht bei null anfangen will, steckt eine Theme aus fertigen Teilen
zusammen: Farben, Schrift, Kartenaufbau, Hintergrund. Die fünfzehn Paletten
zeigen ihre Farben als Tupfer — der große vorn ist der Akzent.

![Der Baukasten im Panel, mit fünfzehn Farbpaletten](docs/bilder/baukasten-farben.jpg)

Fünf davon sind **übernommen** und nachprüfbar: macOS und Android, dazu Nord,
Solarized, Catppuccin und Gruvbox. Apples Werte sind am System ausgelesen, nicht
abgeschrieben — `werkzeuge/test/macos-farben.swift` holt sie aus AppKit, und
mehrere der bekannten stimmen seit macOS 26 nicht mehr.

## Die Steuerkarte

HATS bringt eine Karte für Dashboards mit: eine Leiste aus Knöpfen. Jeder ist
ein Ziel, ein Schalter oder eine eingebaute Funktion — Modus, Hell/Dunkel,
Vollbild, Wetter.

![Die Leiste im dunklen Modus](docs/bilder/steuerleiste-dunkel.jpg)
![Die Leiste im hellen Modus, im Vollbild](docs/bilder/steuerleiste-hell.jpg)

```yaml
type: custom:hats-control-card
buttons:
  - name: Home
    icon: mdi:home-outline
    link: /dashboard-home
  - name: Licht
    icon: mdi:ceiling-light-multiple
    link: /dashboard-home/licht
  - entity: light.kueche          # leuchtet, solange die Lampe an ist
    align_end: true
    separator_before: true
  - function: weather
    entity: weather.forecast_home
    align_end: true
  - function: fullscreen
    align_end: true
  - function: mode
    align_end: true
collapse: narrow
```

Ohne `buttons` zeigt sie Modus und Vollbild — die kurze Form:

![Die kurze Form im hellen Modus](docs/bilder/steuerkarte-hell.jpg)
![Die kurze Form im dunklen Modus](docs/bilder/steuerkarte-dunkel.jpg)

**Knöpfe**

| Feld | |
|---|---|
| `name`, `icon` | Beschriftung und Symbol; eins von beiden genügt |
| `link` | ein Pfad wechselt die Ansicht. Die Kapsel sitzt auf dem Knopf, dessen Ziel offen ist |
| `entity` | macht den Knopf zum Schalter: Antippen schaltet um, und er leuchtet, solange sie an ist |
| `tap_action` | jede Aktion von Home Assistant; sie schlägt `link` und das Umschalten |
| `state_background` | Vorgabe `true`: ein eingeschalteter Knopf wird gefüllt |
| `light_background` | Vorgabe `true`: in der Farbe der Lampe, sonst in Home Assistants Zustandsfarbe |
| `function` | `mode` (automatisch/hell/dunkel), `theme` (ein Knopf, hin und her), `fullscreen`, `weather`, `motion` |
| `temperature`, `temperature_source` | nur bei `weather`: eigener Sensor, und ob der Wert von dort (`sensor`) oder aus der Wetterentität (`weather`) kommt |
| `align_end`, `separator_before` | ans Ende der Leiste; dünner Strich davor |

**Die Leiste**

Sie steht im Kartenwähler, sobald die Integration eingerichtet und die Seite
einmal neu geladen ist — unter dem Reiter **„Nach Karte"**, Suche „HATS". Der
Dialog öffnet auf „Nach Entität", und dort steht sie nicht: Sie hat keine
Entität.

Eine Ressource muss niemand eintragen. HATS trägt die Karte selbst in die Liste
unter Einstellungen → Dashboards → Ressourcen ein und nimmt sie wieder heraus,
wenn die Integration entfernt wird. Nur wer seine Ressourcen in YAML führt,
trägt sie von Hand ein; die Zeile dafür steht im Log.

| Feld | Vorgabe | |
|---|---|---|
| `collapse` | `never` | `narrow` oder `always`: die Ziele wandern in eine Liste unter einem Menüknopf |
| `collapse_width` | `500` | bei `narrow`: unter dieser **Kartenbreite**, nicht Fensterbreite |
| `menu_shape` | `theme` | `pill` für ganz runde Enden |
| `menu_size` | `normal` | `small`, `normal`, `large` |
| `show_highlight` | `true` | die Kapsel auf der aktuellen Ansicht |
| `kiosk_only` | `false` | `true`: Vollbild nur in Home Assistant, das Browserfenster bleibt |
| `controls` | `[mode, fullscreen]` | die kurze Form, wenn es keine `buttons` gibt |

**Die Bewegung des Hintergrunds** stellt ein Knopf mit `function: motion`. Er
klappt vier Regler auf — Treiben, Farbpunkte, Farbwechsel und Ausschlag:

![Die Regler für die Bewegung des Hintergrunds](docs/bilder/steuerleiste-bewegung.jpg)

Die Werte gelten dauerhaft: Die Karte schreibt sie beim Loslassen in die Datei
der wirksamen Theme, mit denselben Funktionen wie das Panel. Das geht nur als
Administrator und nur bei einer Theme, die mit HATS erzeugt wurde; sonst sagt
der Regler, warum nicht.

Im Editor lassen sich die Knöpfe anlegen, sortieren und bearbeiten:

![Der Editor mit der Liste der Knöpfe](docs/bilder/steuerleiste-editor.jpg)

Die Felder sind die der Menü-Karte aus den Horizon-Cards. Eine Leiste von dort
läuft weiter, wenn `type` auf `custom:hats-control-card` steht. Noch nicht
übernommen sind `visibility`, `#anker`-Links, `hold_action`,
`double_tap_action` und `placement: bottom`.

### Als Badge

Dieselbe Steuerung gibt es in klein, für die Badge-Reihe über den Karten:

![Das Badge im hellen Modus](docs/bilder/steuerbadge-hell.jpg)
![Das Badge im dunklen Modus](docs/bilder/steuerbadge-dunkel.jpg)

```yaml
type: custom:hats-control-badge
```

Das Badge ist die kleine Steuerung, nicht die Leiste: Es kennt `controls`
(`mode`, `fullscreen`) und `kiosk_only`. Ziele, Schalter und Wetter gehören in
die Karte. Im Badge-Wähler steht es unter **„Nach Badge"**, Abschnitt
Community-Badges, als „HATS Steuerung":

![Der Badge-Wähler mit HATS Steuerung](docs/bilder/steuerbadge-waehler.jpg)

Alles, was die Karte benutzt, stellt Home Assistant: die Bauteile, die Symbole,
die Farbvariablen und die beiden Schalter dahinter. Sie passt sich deshalb jeder
Theme an und braucht keine weitere Karte aus HACS.

Was man wissen sollte:

- **Der Modus gilt für den Nutzer, nicht für das Gerät.** Home Assistant legt
  die Wahl seit 2026.10 beim Nutzer auf dem Server ab. Wer auf dem Wandtablett
  umschaltet, schaltet auch jedes andere Gerät um, an dem derselbe Nutzer
  angemeldet ist.
- **Eine Theme mit nur einem Modus lässt sich nicht umschalten.** Die Karte
  sperrt die Wahl dann und sagt beim Drücken, warum.
- **Vollbild heißt dreierlei.** Home Assistant blendet die Seitenleiste aus
  (sein Kiosk-Modus), die Karte nimmt die Kopfzeile weg, und der Browser geht
  ins Vollbild, wo er das anbietet. Im Bearbeitungsmodus bleibt die Kopfzeile.
- **Das Vollbild wird je Gerät gemerkt.** Ein Wandtablett startet nach dem
  Neuladen wieder im Vollbild, sobald die Karte auf der Ansicht steht. Zurück
  geht es über denselben Knopf oder mit Esc.

## Installation

Noch nicht über HACS. Zum Ausprobieren den Ordner `custom_components/hats` nach
`config/custom_components/` kopieren, Home Assistant neu starten und die
Integration unter Einstellungen → Geräte & Dienste hinzufügen.

Voraussetzung: Home Assistant 2026.10.0 oder neuer.

## Lizenz

MIT

---

Englische Fassung: [README.en.md](README.en.md)

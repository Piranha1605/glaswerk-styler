# HATS — Home Assistant Theme Studio

Grafisches Panel für die Seitenleiste von Home Assistant, mit dem sich ein
komplettes Theme visuell bauen lässt — aufgesetzt auf die Farbebene von
HA 2026, nicht auf die klassischen Einzelvariablen.

**Stand: früher Aufbau.** Dieser Stand liest nur. Er zeigt das Gerüst, auf dem
alles weitere aufsetzt.

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

## Die Steuerkarte

HATS bringt eine Karte für Dashboards mit. Sie schaltet den Modus
(automatisch, hell, dunkel) und das Vollbild.

![Die Steuerkarte im hellen Modus](docs/bilder/steuerkarte-hell.jpg)
![Die Steuerkarte im dunklen Modus](docs/bilder/steuerkarte-dunkel.jpg)

Oben dreimal die Karte, darunter zum Vergleich zwei Kacheln von Home Assistant.

```yaml
type: custom:hats-control-card
```

Sie steht im Kartenwähler, sobald die Integration eingerichtet ist — unter
dem Reiter **„Nach Karte"**, Suche „HATS". Der Dialog öffnet auf „Nach
Entität", und dort steht sie nicht: Sie hat keine Entität. Eine Ressource muss
niemand eintragen.

| Feld | Vorgabe | |
|---|---|---|
| `controls` | `[mode, fullscreen]` | welche Bedienteile, in welcher Reihenfolge |
| `kiosk_only` | `false` | `true`: Vollbild nur in Home Assistant, das Browserfenster bleibt |

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
- **Vollbild heißt zweierlei.** Home Assistant blendet Seitenleiste und
  Kopfknöpfe aus (sein Kiosk-Modus), und der Browser geht ins Vollbild, wo er
  das anbietet. Die Kopfzeile mit den Reitern bleibt stehen — dafür hat Home
  Assistant keinen Schalter.
- **Das Vollbild wird nicht gespeichert.** Ein Neuladen der Seite stellt alles
  zurück. Das ist auch der Ausweg, wenn man im Vollbild auf eine Ansicht ohne
  die Karte gewechselt ist: Einen Menüknopf gibt es dort nicht mehr.

## Installation

Noch nicht über HACS. Zum Ausprobieren den Ordner `custom_components/hats` nach
`config/custom_components/` kopieren, Home Assistant neu starten und die
Integration unter Einstellungen → Geräte & Dienste hinzufügen.

Voraussetzung: Home Assistant 2026.10.0 oder neuer.

## Lizenz

MIT

---

Englische Fassung: [README.en.md](README.en.md)

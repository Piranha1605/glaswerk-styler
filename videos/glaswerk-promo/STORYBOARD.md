---
format: 1920x1080
duration: 30s
message: "Der Name Glaswerk wird Programm - Theme, App, Karten und Widgets werden zu Glaswerk"
arc: Aufsicht → Handschrift → Beide Modi → Zoom auf den Knopf → Feuerwerk → Der Rest läuft mit → Name
audience: Home-Assistant-Nutzer, die ihre Oberflaeche selbst gestalten
mode: collaborative
---

## Frame 1 — Aufsicht

- scene: Das Dashboard als gekippte Glasebene, schraeg von oben, Licht wandert darueber
- duration: 5s
- poster: 3s
- transition_in: cut
- status: outline
- src: compositions/frames/01-aufsicht.html
- blueprint: device-surface-showcase
- rules: 3d-camera-flight, ambient-glow-bloom

Kalter Einstieg, kein Text. Die Ebene steht im Raum (`rotateX` 52°, leicht
`rotateZ`), die Kamera sinkt langsam ab und dreht zwei Grad mit. Ueber das Glas
laeuft **ein** Lichtstreifen — der traveling sheen aus `ambient-glow-bloom`,
nicht blinkend, einmal.

**NUR UNSERE KARTEN UND WIDGETS** — Horizon-Cards, Horizon-Widgets und die
Glaswerk Bar. Kein Bubble, kein Mushroom.

Hier stand bis zum 15.10.2026 das Gegenteil ("nur Karten, die Home Assistant
selbst mitbringt"), und das war meine Fehllesung einer Ansage. Die Ansage
lautete: *"stop du sollst nur unsere zeigen kein bubble kein mushromm nur
unsere widgets und karten"*. Der Maintainer hat sie beim Durchgehen des
Ablaufs ein zweites Mal richtiggestellt - deshalb steht die alte Fassung hier
noch als Mahnung und nicht nur korrigiert da.

Der Grund ist derselbe geblieben, er zeigt nur in die andere Richtung: Das
Video wirbt fuer Glaswerk, und Glaswerk sind Theme, App, Karten und Widgets
aus EINEM Haus. Fremde Karten im Bild versprechen etwas, das nicht dazugehoert.

Auf der Ebene stehen deshalb: die Steuerleiste oben, Widgets im Raster
(Uhr, Wetter, Kalender, Wert- und Gauge-Kacheln), eine Zeilen-Karte mit
Schaltern und Schiebereglern, die Wortuhr. Englische Beschriftung (Ceiling
Lights, Front Door, Kitchen Door). Alle Flaechen in `rgba(22,28,46,.46)` mit
der Lichtkante oben, darunter das diagonale Raster und die drei Farbinseln.

## Frame 2 — Die Handschrift

- scene: Der Kartenstil wechselt fuenfmal; Flaeche und Schattenart aendern sich sichtbar
- duration: 6s
- poster: 3s
- transition_in: cut
- status: outline
- src: compositions/frames/02-handschrift.html
- blueprint: device-surface-showcase
- rules: theme-crossfade-morph

Das Herzstueck. Die Kamera haelt fast still, die Ebene treibt weiter — und die
Karten wechseln ihren Stil: **Glas → Liquid Glass → macOS → Gepraegt →
Kontur**, je 1,4 s. `theme-crossfade-morph` ist dafuer gebaut: gestapelte,
fertig gestylte Schichten, nur die Deckkraft blendet, ein Anker bewegt sich
nie. Der Anker ist hier die Steuerleiste oben — sie bleibt auf dem Pixel
stehen, waehrend sich unter ihr die Welt haeutet.

Links unten ein kleines Schild mit dem Namen des Stils, 28 px, gesperrt. Es
wechselt mit.

Bei 1,5 s erscheint oben links die erste Zeile: **„Eine Handschrift."**

## Frame 3 — Hell und dunkel

- scene: Ein Lichtstrich faehrt durch die Ebene, dahinter liegt der Hellmodus
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/03-modi.html
- blueprint: device-surface-showcase
- rules: theme-crossfade-morph, ambient-glow-bloom

Derselbe Aufbau, zwei Schichten: dunkel und hell. Ein Lichtstrich laeuft
diagonal durch das Bild und schiebt die Helligkeit vor sich her — dieselbe
Geometrie, andere Welt. Nach 2,4 s laeuft er zurueck.

Zeile: **„Hell wie dunkel."**

## Frame 4 — Der Zoom

- scene: Die Ebene richtet sich auf, die Kamera fliegt auf den Einstellungsknopf zu
- duration: 6s
- poster: 5s
- transition_in: cut
- status: outline
- src: compositions/frames/04-zoom.html
- blueprint: camera-journey
- rules: 3d-camera-flight, depth-of-field-blur

Die lange Fahrt, und sie darf Zeit haben. `3d-camera-flight` in seiner Form
*tilt-to-flatten*: Die Ebene dreht aus 52° auf 0°, waehrend die Kamera naeher
kommt. Ziel ist das Zahnrad der Steuerkarte.

Alles ausser dem Knopf geht ueber `depth-of-field-blur` weich — am Ende steht
das Zahnrad scharf im Bild, die Weichzeichnung des Glases wird dabei zum ersten
Mal als echte Tiefe sichtbar statt als Effekt.

Die Fahrt LANDET auf einer zweiten Aufnahme (`bilder/steuerkarte/01-leiste.png`,
6576 x 512), die bei 3,6 s einschwebt, waehrend der scharfe Fleck im Hintergrund
ausgeht. Grund: In der Aufsicht sitzt das Zahnrad 85 px vom rechten Rand — um es
in die Mitte zu holen, muesste elffach vergroessert werden, und dann ist der
Knopf Brei. Gemessen bei 2,6-fach: Zahnrad mittig, rechts daneben 740 px Nichts.

Zeile, bei 3 s, dann mitgezogen: **„Und alles an einem Knopf."**

## Frame 5 — Was der Knopf tut

- scene: Das Einstellungsfenster geht auf und baut die Theme um, live
- duration: 12s
- poster: 6s
- transition_in: cut
- status: built
- src: compositions/frames/05-der-knopf.html
- blueprint: screen-demo
- rules: slow-push-in, timed-caption

Gemeldet am 15.10.2026: *„aber der ganze wichtige teil die funktion des
knopfes und der karte fehlt. da sollte es normal weiter gehen."* Vorher sprang
der Film vom Zoom auf das Zahnrad direkt ins Feuerwerk — der Knopf wurde
gezeigt und nie benutzt.

Das Material ist eine **echte Aufnahme der Testmaschine**
(`werkzeuge/test/film-aufnehmen.mjs --fenster`, 18,4 s, hier mit Faktor 1,5):
Zahnrad, Fenster, drei Kartenstile, die zehn Hintergruende, Hell, Dunkel, zu.
Jeder Klick hat dabei wirklich die Theme-Datei geschrieben; die Datei der
Maschine war vorher gesichert und ist Byte fuer Byte zurueck (md5
`6b789a9d…`).

Drei Zeilen, auf Glas statt auf dem Bild — die Theme schaltet mittendrin auf
Hell, und weisse Schrift auf hellem Grund faellt der Kontrastpruefung nicht
auf, weil ein Video dahinterliegt und kein Farbwert.

## Frame 6 — Das Feuerwerk

- scene: Der Knopf wird gedrueckt, aus ihm platzt die Palette
- duration: 4.5s
- poster: 1.2s
- transition_in: cut
- status: outline
- src: compositions/frames/05-feuerwerk.html
- blueprint: null
- rules: press-release-spring, particle-burst, depth-scatter-assemble

Der Bruch. `press-release-spring` staucht das Zahnrad linear und federt zurueck
— und im Moment der Rueckfederung zuendet `particle-burst`: 36 Teilchen in den
sieben klassischen Toenen, ballistisch, index-gesaet, scrub-sicher.

Dazu fliegen die fuenf Kartenstile als Glassplitter durchs Bild
(`depth-scatter-assemble`, radial-explode) — jeder Splitter traegt die Flaeche
und den Schatten seines Stils. Das ist das Spektakel, und es besteht aus nichts
als dem, was die Theme ohnehin kann.

Kein Text.

## Frame 7 — Der Rest laeuft mit

- scene: Dieselbe Flaeche, aber mit fremden Karten - Bubble, Mushroom, HAs eigene
- duration: 2s
- poster: 1.2s
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-der-rest.html
- blueprint: device-surface-showcase
- rules: theme-crossfade-morph

Auf Ansage vom 15.10.2026: *"wir machen den hauptfilm mit den Glaswerk karten
und am ende Blenden wir ein paar sekunden den rest ein mit dem zusatz die
laufen natuerlich auch."*

Zwei Sekunden, und sie raeumen den groessten Einwand gegen die 28 davor aus:
Ein Video, das nur die eigenen Karten zeigt, laesst offen, ob die Theme mit
dem umgeht, was der Zuschauer schon hat. Hier steht die Antwort.

Dieselbe Geometrie wie Rahmen 1, nur die Karten sind andere: eine Bubble-Karte,
zwei Mushroom-Kacheln, eine HA-Kachel und eine entities-Karte. Sie tragen
dieselbe Glasflaeche, dieselbe Rundung, denselben Schatten - das ist der ganze
Punkt. `theme-crossfade-morph` blendet sie an die Stelle der Glaswerk-Karten,
ein Anker bleibt stehen: wieder die Steuerleiste.

Zeile, 44 px, unten links: **"Und was du sonst nutzt, laeuft mit."**

## Frame 8 — Der Name

- scene: Die Teilchen sammeln sich zur Wortmarke GLASWERK
- duration: 2.5s
- poster: 1.8s
- transition_in: cut
- status: outline
- src: compositions/frames/06-name.html
- blueprint: logo-assemble-lockup
- rules: depth-scatter-assemble, ambient-glow-bloom

Die Splitter kehren um und setzen sich zusammen — `depth-scatter-assemble` in
seiner Zusammenbau-Richtung. Daraus steht **GLASWERK**, 180 px, in Glas: die
Wortmarke traegt dieselbe Flaeche, dieselbe Lichtkante, denselben Schatten wie
eine Karte.

Darunter, 44 px: **Theme. App. Karten. Widgets.**
Klein darunter: **Home Assistant Theme Studio**

Ein letzter Lichtstreifen laeuft ueber die Schrift, dann steht das Bild.

## Ton

Ein Bett aus HeyGens Musikkatalog und fuenf Klaenge aus seinem SFX-Katalog.
Alles liegt in `index.html` in der Wurzel, nicht in den Szenen: Beide Riser
laufen ueber eine Szenengrenze, und ein `data-start` in einer Szene ist
szenenlokal.

**Die Regel fuer jeden Klang: `start = Zeitpunkt - Gipfel`.** Ein Klang wird
auf den Moment gesetzt, an dem er am lautesten ist, nicht auf den, an dem er
anfaengt. Der SFX-Katalog nennt den Gipfel selbst (`peak_offset`) - beim Bett
und bei der lokalen Bibliothek muss man ihn messen.

**Zweimal danebengelegen, beide Male zu grob gemessen:**

- Der erste Riser kam aus der lokalen Bibliothek, und ich hatte seinen Gipfel
  mit Fenstern von 50 ms bestimmt: 3,55 s. Richtig war ein Plateau bei
  2,50 - 3,00 s. Im fertigen Film war zu hoeren, dass der Riser VOR dem
  Schnitt gipfelt. Ein einzelnes schmales Fenster ist fuer eine Huellkurve
  das falsche Mass.
- Der Einsatz des Bettes stand mit Fenstern von 2 s auf "30 s", tatsaechlich
  liegt er bei 31,9. Das Bett kam dadurch anderthalb Sekunden nach dem
  Einschlag.

**Das Bett ist nach seiner Form gewaehlt, nicht nach seinem Namen.** Fuenf
Stuecke standen zur Wahl; drei waren von der ersten Sekunde an gleich laut
und haetten den Film flachgedrueckt. Das gewaehlte (75 s) traegt 31 Sekunden
ruhigen Flaechenklang, faellt dann fuer eine halbe Sekunde auf -53 dB ab und
setzt bei 31,9 voll ein. Gestartet bei Filmsekunde 1,6 faellt diese Atempause
auf den Druck des Knopfes und der Einsatz auf Sekunde 33,5, in der die
Teilchen zuenden. Am fertigen Film nachgemessen:

    32,50s  -42,3
    33,00s  -50,1      Szene Feuerwerk beginnt
    33,25s  -30,0
    33,50s   -8,7      Teilchen zuenden

Die Lautstaerke des Bettes faehrt ueber eine Automationsspur: 2,9 s Einblende,
voll bis zum Endbild, dort auf 0,66 zurueck, damit der Glasklang im Wort noch
zu hoeren ist, dann aus.

## Sprache der Aufnahmen

Die Oberflaeche in allen Standbildern und Filmen laeuft auf **Englisch**, und
zwar ohne das Profil auf der Testmaschine anzufassen: Die Aufnahmewerkzeuge
setzen `localStorage.selectedLanguage` auf `"en"`, bevor das Dashboard laedt.
Das gilt nur fuer den kopflosen Browser - andere Sitzungen auf derselben
Maschine merken davon nichts.

Dazu zwei Dinge, die derselbe Lauf gekostet hat:

- **Der Dunkelmodus hing am Browser, nicht am Skript.** Die Theme steht auf
  "automatisch", und "automatisch" fragt `prefers-color-scheme` - ein frischer
  Chrome sagt dort HELL. Jetzt wird `Emulation.setEmulatedMedia` gesetzt;
  ueber `settheme` zu gehen haette die Nutzerdaten auf dem Server beruehrt.
- **`bilder-schiessen.mjs` startet seinen eigenen Chrome** und importiert
  `chrome.mjs` nicht. Die beiden Einstellungen stehen deshalb doppelt, mit
  einem Hinweis an beiden Stellen. Beim ersten Versuch war genau das der
  Fehler: Die Filme kamen englisch, die Standbilder deutsch und hell.

**Die Theme wird fuer die Aufnahme umgeschaltet und danach zurueckgegeben.**
Auf der Testmaschine arbeiten mehrere Sitzungen; die wirksame Theme stand bei
einem Lauf auf `glaswerk2`. Beide Werkzeuge merken sich, was vorher galt,
schalten auf `glaswerk` und stellen es am Ende wieder her - mit Gegenprobe in
der Ausgabe.

**Was deutsch bleibt, und warum:** Die Wortuhr. Ihr Buchstabenfeld ist
absichtlich keine Uebersetzung - eine englische Wortuhr braucht ein eigenes
Gitter ("IT IS HALF PAST TWO"), das steht so im Quelltext der Karte. Dazu die
Namen der Ansichten, der Dashboards und der Entitaeten: Das ist die Wohnung
des Maintainers, nicht die Oberflaeche.

## Die Overlays

Auf Ansage vom 15.10.2026: *"leg die overlays auf eine glasplatte und macht
die schriftfarbe auch zum glaslook"*. Jede Beschriftung sitzt auf einer
dunklen Glasplatte, und die Schrift selbst ist Glas - hell an der Oberkante,
matter im Bauch, wieder hell an der Unterkante, mit feinem Schliff und einem
Schein nach aussen.

**Platte und Schrift muessen ZWEI Elemente sein.** Im ersten Versuch trugen
sie beide Klassen, und `background-clip: text` schnitt damit auch die Flaeche
der Platte auf die Glyphen - die Platte hatte gar keinen Grund mehr, nur
Weichzeichnung. Auf dem dunklen Theme fiel das nicht auf, weil der
`backdrop-filter` einen dunklen Grund weichzeichnet. Auf dem hellen wurde die
Platte hellblau und die helle Schrift darauf unsichtbar, gemessen bei 13 s.

**Die Platte traegt 0,84 Deckkraft**, nicht 0,62: Sie muss dunkel sein, egal
was dahinterliegt. Die Weichzeichnung macht die Kanten, nicht die Farbe.

**Nebenwirkung, die genannt gehoert:** Die Kontrastpruefung meldet jetzt
`0/0 text checks` - eine Schrift mit durchsichtiger Fuellung kann sie nicht
messen. Geprueft ist stattdessen am Bild, auf beiden Modi.

Rahmen 3 ist dadurch **einfacher** geworden: Dort standen zwei Zeilen, eine
helle und eine dunkle, beide vom selben Schnitt wie die Blende geschnitten.
Mit der Platte stellt sich die Frage nicht mehr - zwei Elemente, zwei
clip-path-Rechnungen und zwei Marker weniger.

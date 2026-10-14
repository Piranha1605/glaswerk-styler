# Making-of

Bilder aus der Entwicklung, in der Reihenfolge, in der sie entstanden sind.
Angelegt am 13.10.2026 fuer einen Film und eine Vorankuendigung.

| Bild | Was darauf zu sehen ist |
|---|---|
| [`2026-10-13-vergleich-dunkel.jpg`](2026-10-13-vergleich-dunkel.jpg) | Die Vergleichsansicht im Dunkelmodus: dieselbe Entitaet in HA, Mushroom und Bubble Card untereinander, in sechs Zustaenden. Kanten, Flaechen und Schatten kommen aus der Projektwerkbank. |
| [`2026-10-13-vergleich-dunkel-kanten-gleich.png`](2026-10-13-vergleich-dunkel-kanten-gleich.png) | Nach der Korrektur: HA, Mushroom und Bubble tragen dieselben Kanten. Die weisse Kante bei HA und Mushroom kam aus glas-lichtkante, von der Bubble ausgenommen war. |
| [`2026-10-13-baukasten.jpg`](2026-10-13-baukasten.jpg) | Der Baukasten im Panel: vier Sorten Teile zum Zusammenstecken. Gewaehlt sind Liquid Glass, Kartenstil Glas und Farbinseln - die Haken sitzen, der Zaehler steht auf 68 Aenderungen. |
| [`2026-10-13-baukasten-seite-karten.jpg`](2026-10-13-baukasten-seite-karten.jpg) | Die Seite einer Sorte: das gewaehlte Teil oben, darunter die Stellschrauben und die sechs Tweaks, die zu Karten gehoeren. Ein Klick auf eine Kachel wendet an und oeffnet diese Seite. |
| [`2026-10-13-kopie-laeuft.jpg`](2026-10-13-kopie-laeuft.jpg) | Die ueber das Panel gebaute Kopie, geladen und gemessen: 52 von 52 UIX-Knoten gefuellt, alle Werte identisch mit der laufenden Theme. |
| [`2026-10-13-startseite-wege.jpg`](2026-10-13-startseite-wege.jpg) | Die Startseite mit vier grossen Wegen statt einem Satz in der Mitte. Der Zaehler nennt die Themes auf der Instanz, 'Mit dem Baukasten' legt eine Theme an und oeffnet ihn in einem Zug. |
| [`2026-10-14-vergleich-1-vorher.jpg`](2026-10-14-vergleich-1-vorher.jpg) | Home Assistant pur, dunkel - dieselben Karten ohne Theme |
| [`2026-10-14-vergleich-2-nur-felder.jpg`](2026-10-14-vergleich-2-nur-felder.jpg) | Theme macos, nur die Felder - Apples Farben, Glas, Rundungen, Schatten. Kein UIX. |
| [`2026-10-14-vergleich-3-mit-uix.jpg`](2026-10-14-vergleich-3-mit-uix.jpg) | Dieselbe Theme mit UI eXtension - Trennlinien, Glas auf den Karten, Kopf- und Seitenleiste |

## Die drei Vergleichsbilder vom 14.10.2026

Dieselbe Ansicht, dieselbe Fenstergroesse (800 x 1171), dieselben Karten -
nur die Theme wechselt. **Drei** Bilder, nicht zwei, und der mittlere ist der
Punkt: Ohne ihn schreibt man den UIX-Vorlagen zu, was die FELDER getan haben,
und das ist bei HATS der groessere Teil.

Dafuer gibt es `macos_ohne_uix` - dieselbe Theme ohne ein einziges Stilziel,
gebaut mit `node werkzeuge/macos-bauen.mjs --ohne-uix`. Kein zweites Produkt,
sondern das mittlere Bild.

Gemessen beim dritten Bild, damit die Bildunterschrift nicht behauptet, was
nicht da ist: 48 uix-node-Knoten, 40 gefuellt, neun Stilziele mit dreizehn
Vorlagen.

**Was man auf den Bildern NICHT sieht:** `glas-seitenleiste`. Die Seitenleiste
war bei dieser Fensterbreite eingeklappt (gemessen: 0 px breit). Ihre Wirkung
steht also in keinem der drei Bilder - das gehoert dazugesagt, statt sie in die
Unterschrift zu schreiben.


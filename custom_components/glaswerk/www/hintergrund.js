// Der Hintergrund: fest oder mitlaufend, bewegt, im Farbwechsel, nach dem Himmel.
//
// Alles hier ist am 13.10.2026 an der Testmaschine gemessen (HA 2026.10.1,
// UIX 8.4.0). Die Herleitung steht in CLAUDE.md, Abschnitt "Der Hintergrund";
// hier steht nur, was man wissen muss, um die Datei zu aendern.
//
// Wer malt: hui-view-background. Es liegt unter hui-view-container im Shadow
// Root von hui-root, ist also ueber das Stilziel uix-root erreichbar. hui-root
// gibt es unter ha-panel-lovelace UND unter ha-panel-home - auf den
// Einstellungsseiten nicht.
//
// Drei Dinge gehen ueber ein gewoehnliches Theme-Feld gar nicht und brauchen
// deshalb UIX:
//   Bewegung     ein Feld traegt einen Wert, keine Regel - @keyframes passt
//                nicht hinein
//   Farbwechsel  dasselbe
//   Himmel       eine Theme-Datei ist statisch; UIX rechnet Jinja-Vorlagen in
//                seinen Stilzielen ueber render_template aus
//
// Die Theme bleibt ohne alle drei vollstaendig: --lovelace-background steht als
// gewoehnliches Feld da, und ohne UIX sieht man genau das.
//
// Die Funktionen hier liefern Vorlagen in derselben Form wie vorlagen.js -
// { id, ziel, css, ... } -, damit vorlageAn() und vorlageAus() aus theme.js sie
// ohne Sonderweg schalten. Der Unterschied: Diese Vorlagen haben Stellgroessen,
// und die werden aus dem CSS im Theme zurueckgelesen. Ein eigenes Feld dafuer
// gaebe es nur als Hilfsfeld, und das schreibt Glaswerk nicht.

export const HINTERGRUND_ZIEL = "root";
export const HINTERGRUND_GRUPPE = "hintergrund";

// ---------------------------------------------------------------------------
// Fest oder mitlaufend
//
// hui-view-background haengt von sich aus absolut und ist so hoch wie der
// ganze Seiteninhalt. Gemessen auf /hats-test/alles: 757 x 1774 px bei einem
// Fenster von 768 px Hoehe - von vier Farbinseln lagen zwei unter dem ersten
// Bildschirm (Mittelpunkte bei 1383 und 1525 px).
//
// Fest wird es durch EIN Wort im Wert von --lovelace-background. Home Assistant
// prueft das so, aus dem Buendel von 2026.10.1:
//
//   _isFixedBackground(e) { return "string" == typeof e
//     ? e.split(" ").includes("fixed") : ... }
//
// Getrennt wird am Leerzeichen, an nichts sonst. "fixed," mit Komma dahinter
// zaehlt nicht, ein Zeilenumbruch davor auch nicht. Dann steht das Bauteil
// auf position: fixed, deckt das ganze Fenster (auch unter der Seitenleiste)
// und bekommt background-attachment: scroll !important.

// Was Home Assistant aus dem Wert macht. Bewusst dieselbe Regel, nicht eine
// kluegere: Die Funktion soll HAs Verhalten vorhersagen, nicht verbessern.
export function istFest(wert) {
  if (typeof wert !== "string") return false;
  for (const teil of wert.split(" ")) if (teil === "fixed") return true;
  return false;
}

// Steht "fixed" im Wert, ohne dass Home Assistant es erkennt? Dann ist die
// Ebene nach CSS fest, das Bauteil aber nicht - der Hintergrund steht still,
// waehrend seine Flaeche weiter mitlaeuft. Adressen werden ausgenommen: ein
// Bild darf "fixed" im Namen tragen.
export function festUnerkannt(wert) {
  if (typeof wert !== "string" || istFest(wert)) return false;
  const ohneAdressen = wert.replace(/url\([^)]*\)/g, "url()");
  return /(^|[\s,])fixed($|[\s,])/.test(ohneAdressen);
}

// Das Wort setzen oder nehmen. Gesetzt wird es ans Ende - dort gehoert es zur
// letzten Ebene, und dahinter steht kein Komma, das die Erkennung verhindert.
// Zweimal dasselbe verlangt aendert nichts.
//
// Adressen bleiben woertlich stehen. Ein Bild mit Leerzeichen und "fixed" im
// Namen wuerde sonst zerlegt und sein Name gekuerzt - und zwar still.
export function stelleFest(wert, an) {
  if (typeof wert !== "string") return wert;
  const glatt = wert.trim();
  if (!glatt) return glatt;
  const adressen = [];
  const geschuetzt = glatt.replace(/url\([^)]*\)/g, (a) => {
    adressen.push(a);
    return `url(${adressen.length - 1})`;
  });
  const ohne = geschuetzt.split(" ").filter((t) => t !== "" && t !== "fixed").join(" ")
    .replace(/url\((\d+)\)/g, (_, i) => adressen[Number(i)]);
  return an ? `${ohne} fixed` : ohne;
}

// Derselbe Wert ohne das Wort - zum Vergleichen. Der Baukasten erkennt ein Teil
// an seinen Werten wieder; mit und ohne "fixed" ist es derselbe Hintergrund,
// nur anders aufgehaengt.
export function ohneFest(wert) {
  return typeof wert === "string" ? stelleFest(wert, false) : wert;
}

// ---------------------------------------------------------------------------
// Die Hintergruende des Baukastens
//
// Am 13.10.2026 von der Sitzung "Glaswerk Aufbau" hierher uebergeben, auf Ansage
// des Maintainers. baukasten.js fuehrt sie weiter unter demselben Namen - es
// liest sie von hier.
//
// Jeder Teil setzt genau ein Feld, --lovelace-background, je Modus. Ein leerer
// Wert heisst "Feld weg", nicht "Feld leer": Das Panel entfernt es dann, statt
// Home Assistants Vorgabe mit nichts zu ueberschreiben.
//
// Die Farbpunkte stehen FEST. Ohne das Wort haengt die Flaeche absolut und ist
// so hoch wie der ganze Inhalt - gemessen 1774 px bei 768 px Fensterhoehe. In
// der alten Schreibweise sassen die Punkte bei 86 % und 78 % dann bei 1525 und
// 1383 px, zwei von vier unter dem ersten Bildschirm.
//
// Der ruhige Verlauf steht ebenfalls fest - aus einem anderen Grund. Fuer zwei
// Toene ist die Hoehe der Flaeche gleichgueltig, fuer die Seitenleiste nicht:
// Mitlaufend beginnt die Flaeche erst rechts von ihr, und eine durchscheinende
// Leiste steht dann vor Home Assistants flachem Grund statt vor dem Verlauf.
// Gemessen von der Sitzung "Glaswerk Aufbau" am 13.10.2026, ueber _applyTheme():
// ohne das Wort 658 x 2557 px ab x = 256, mit ihm 914 x 863 px ab x = 0.
// Gemeldet war es als Kante neben der Leiste.
//
// Glas braucht einen dieser Hintergruende: Eine durchscheinende Flaeche vor
// einer einfarbigen Wand sieht aus wie eine etwas hellere Wand. Der Kartenstil
// "glas" in baukasten.js traegt dafuer braucht.hintergrund, und das Panel
// warnt, wenn dazu "keiner" gewaehlt ist.
//
// Und: Ein Bild aus der DASHBOARD-Konfiguration liegt ueber allem hier. Der
// Theme-Wert ist dann gesetzt, wird gelesen und ist trotzdem nicht zu sehen.

// ---------------------------------------------------------------------------
// Die Farbpunkte
//
// Vier weiche Flecke in den Ecken, darunter ein schraeger Grundverlauf. Jeder
// Fleck ist eine EIGENE Ebene mit eigener Lage und Groesse:
//
//   radial-gradient(closest-side, <Farbe>, transparent)
//       left -413px top -310px / 990px 682px no-repeat
//
// Frueher stand jeder Fleck als Verlauf ueber die ganze Flaeche da
// ("radial-gradient(900px 620px at 8% 4%, ...)"). So laesst er sich nicht
// einzeln bewegen: Verschiebt man die Ebene, laeuft ihr Rand als harte Kante
// durchs Bild. Eine Ebene, die nur so gross ist wie ihr Fleck und zum Rand hin
// durchsichtig wird, hat keine Kante.
//
// Die Lage haengt an den ECKEN der Flaeche, nicht an Prozenten ihrer Groesse:
// Die Flecke sitzen damit auf jedem Bildschirm gleich weit in der Ecke. Die
// Zahlen sind die alten Flecke bei 1024 x 768 umgerechnet (Radius mal dem
// Anteil, bei dem der alte Verlauf auf null war), nicht neu gewaehlt.
//
// "weg" sind drei Wegpunkte, in px von der Ruhelage aus, nach rechts und nach
// unten positiv. Jeder Fleck laeuft ein eigenes kleines Viereck ab - liefen
// alle denselben Weg, bewegte sich das Bild als Ganzes. Die Wege sind eine
// Entscheidung, keine Messung: unter 55 px Ausschlag, damit es "leicht" bleibt.
export const PUNKTE = [
  { x: "left", dx: -413, y: "top", dy: -310, b: 990, h: 682, weg: [[36, 22], [18, 48], [-14, 26]] },
  { x: "right", dx: -344, y: "top", dy: -199, b: 853, h: 582, weg: [[-30, 30], [-52, 8], [-20, -18]] },
  { x: "right", dx: -123, y: "bottom", dy: -270, b: 821, h: 756, weg: [[-24, -36], [12, -52], [30, -20]] },
  { x: "left", dx: -139, y: "bottom", dy: -101, b: 728, h: 541, weg: [[34, -20], [52, 10], [20, 30]] },
];

// Wo eine Ebene steht, wenn ihr Fleck um (rechts, unten) verschoben ist.
// Gemessen wird von der Kante aus, an der die Ebene haengt - von rechts und
// von unten zaehlt es deshalb umgekehrt.
function punktLage(p, rechts = 0, unten = 0) {
  const ax = p.x === "left" ? p.dx + rechts : p.dx - rechts;
  const ay = p.y === "top" ? p.dy + unten : p.dy - unten;
  return `${p.x} ${ax}px ${p.y} ${ay}px`;
}

// Der Wert fuer --lovelace-background: vier Farben fuer die Punkte, drei fuer
// den Grund. Ohne "fixed" - das haengt stelleFest() an.
export function punkteBild(farben, grund) {
  const ebenen = PUNKTE.map((p, i) =>
    `radial-gradient(closest-side, ${farben[i]}, transparent) ${punktLage(p)} / ${p.b}px ${p.h}px no-repeat`);
  ebenen.push(`linear-gradient(155deg, ${grund[0]} 0%, ${grund[1]} 50%, ${grund[2]} 100%)`);
  return ebenen.join(", ");
}

// An den Kommas der obersten Ebene trennen - die in rgba(...) zaehlen nicht.
function ebenenVon(wert) {
  const teile = [];
  let tiefe = 0, ab = 0;
  for (let i = 0; i < wert.length; i++) {
    const z = wert[i];
    if (z === "(") tiefe++;
    else if (z === ")") tiefe--;
    else if (z === "," && tiefe === 0) { teile.push(wert.slice(ab, i).trim()); ab = i + 1; }
  }
  teile.push(wert.slice(ab).trim());
  return teile;
}

// Ist das ein Bild aus Farbpunkten - mit genau dieser Lage und Groesse?
//
// Die Farben sind frei, die Geometrie nicht: Die Bewegung der Punkte faehrt
// feste Wegpunkte ab und beginnt in der Ruhelage. Auf ein anderes Bild
// angewendet, verschoebe sie dessen erste Ebene - ein Foto rutschte dann aus
// seinem Rahmen.
export function istPunkteBild(wert) {
  if (typeof wert !== "string") return false;
  const ebenen = ebenenVon(ohneFest(wert));
  if (ebenen.length !== PUNKTE.length + 1) return false;
  if (!ebenen[PUNKTE.length].startsWith("linear-gradient(")) return false;
  return PUNKTE.every((p, i) => {
    const e = ebenen[i];
    const ende = `) ${punktLage(p)} / ${p.b}px ${p.h}px no-repeat`;
    return e.startsWith("radial-gradient(closest-side, ") && e.endsWith(", transparent" + ende);
  });
}

// ---------------------------------------------------------------------------
// Zehn Farbverlaeufe
//
// Auf Ansage vom 13.10.2026: "als erstes sollen die farbpunkte sich leicht
// bewegen und die farben aendern. dafuer in den einstellungen 10
// farbverlaeufe als auswahl anbieten."
//
// Jeder nennt vier Toene fuer die Punkte, als Farbwinkel und Saettigung. Hell
// und dunkel entstehen daraus mit fester Helligkeit - so ist ein Verlauf im
// Dunkelmodus derselbe wie im Hellmodus, nur tiefer, und kein Punkt faellt
// aus der Reihe, weil jemand eine Zahl anders gewaehlt hat.
//
// DIE TOENE SIND EINE ENTSCHEIDUNG, KEINE MESSUNG. Gemessen ist nur, was
// daraus folgt: Der Grund bleibt im Hellmodus hell genug fuer dunkle Schrift
// und im Dunkelmodus dunkel genug fuer helle (tests/glaswerk-hintergrund.test.js).
//
// Der erste ist der bisherige, mit den Farben der Projektwerkbank - woertlich,
// nicht gerechnet, damit Panel und Theme dieselbe Sprache sprechen.

function hsl(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const wert = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * wert).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Helligkeit der Punkte und des Grundes je Modus.
const STUFE_HELL = { punkt: 76, grund: 95, grundSatt: 0.75 };
const STUFE_DUNKEL = { punkt: 33, grund: 8, grundSatt: 0.6, punktSatt: 0.8 };

function ausToenen(toene) {
  const hell = punkteBild(
    toene.map(([h, s]) => hsl(h, s, STUFE_HELL.punkt)),
    [toene[0], toene[3], toene[2]].map(([h, s]) => hsl(h, s * STUFE_HELL.grundSatt, STUFE_HELL.grund)));
  const dunkel = punkteBild(
    toene.map(([h, s]) => hsl(h, s * STUFE_DUNKEL.punktSatt, STUFE_DUNKEL.punkt)),
    [toene[0], toene[3], toene[2]].map(([h, s]) => hsl(h, s * STUFE_DUNKEL.grundSatt, STUFE_DUNKEL.grund)));
  return { hell, dunkel };
}

const WERKBANK = {
  hell: punkteBild(["#7db5ff", "#ff9ec7", "#5ee0d0", "#c08cff"], ["#e6eeff", "#f3ecff", "#e3fbf6"]),
  dunkel: punkteBild(["#1f4d9e", "#7a2a5c", "#0d6b63", "#4b2a86"], ["#0b1020", "#140d26", "#07201f"]),
};

// id, deutsch, englisch, wozu, und die vier Toene: oben links, oben rechts,
// unten rechts, unten links.
const VERLAUF_LISTE = [
  ["inseln", "Werkbank", "Workbench", "Blau, Rosa, Tuerkis, Violett - die Farben des Panels.", "Blue, pink, teal, violet - the colours of the panel.", null],
  ["nordlicht", "Nordlicht", "Aurora", "Gruen ueber Tuerkis nach Violett.", "Green through teal to violet.", [[150, 70], [178, 72], [268, 62], [212, 78]]],
  ["abendrot", "Abendrot", "Sunset", "Orange, Rosa und ein spaetes Violett.", "Orange, pink and a late violet.", [[24, 92], [338, 82], [282, 58], [44, 90]]],
  ["ozean", "Ozean", "Ocean", "Vier Blautoene, vom Tiefen ins Helle.", "Four blues, from deep to bright.", [[222, 80], [192, 78], [170, 62], [246, 66]]],
  ["wald", "Wald", "Forest", "Gruentoene mit etwas Moos und Licht.", "Greens with a little moss and light.", [[136, 52], [96, 50], [166, 56], [58, 58]]],
  ["lavendel", "Lavendel", "Lavender", "Violett, Flieder und ein kuehles Blau.", "Violet, lilac and a cool blue.", [[266, 70], [318, 60], [230, 72], [290, 56]]],
  ["glut", "Glut", "Ember", "Rot, Orange und Bernstein.", "Red, orange and amber.", [[6, 80], [28, 90], [332, 68], [42, 88]]],
  ["pastell", "Pastell", "Candy", "Rosa, Himmelblau, Mint und Pfirsich - weich.", "Pink, sky blue, mint and peach - soft.", [[336, 68], [202, 70], [152, 52], [30, 76]]],
  ["sand", "Sand", "Dune", "Warme, gedeckte Erdtoene.", "Warm, muted earth tones.", [[38, 44], [18, 42], [350, 32], [88, 24]]],
  ["graphit", "Graphit", "Graphite", "Fast ohne Farbe: kuehle Grautoene.", "Almost colourless: cool greys.", [[214, 20], [200, 16], [276, 12], [182, 14]]],
  // Apples vier Systemfarben, am 14.10.2026 an macOS 26.5.2 ausgelesen
  // (werkzeuge/test/macos-farben.swift), nicht aus der Dokumentation:
  // systemBlue #0088ff, systemPurple #cb30e0, systemTeal #00c3d0,
  // systemIndigo #6155f5. Hier als Farbton und Saettigung, weil die Helligkeit
  // je Modus gerechnet wird.
  ["macos", "macOS", "macOS", "Apples Systemfarben: Blau, Violett, Tuerkis, Indigo.", "Apple's system colours: blue, purple, teal, indigo.", [[208, 100], [292, 74], [184, 100], [244, 89]]],
];

export const FARBVERLAEUFE = VERLAUF_LISTE.map(([id, de, en, zweckDe, zweckEn, toene]) => {
  const bild = toene ? ausToenen(toene) : WERKBANK;
  // Die vier Farben nebeneinander - fuer eine Kachel, die zeigt, was man waehlt.
  const streifen = (wert) => `linear-gradient(90deg, ${ebenenVon(wert).slice(0, PUNKTE.length)
    .map((e) => e.slice("radial-gradient(closest-side, ".length, e.indexOf(", transparent"))).join(", ")})`;
  return {
    id, de, en, zweckDe, zweckEn,
    // Fest: Ohne das Wort haengt die Flaeche absolut und ist so hoch wie der
    // ganze Inhalt. Die Punkte unten haengen dann am Ende der Seite.
    light: { "--lovelace-background": stelleFest(bild.hell, true) },
    dark: { "--lovelace-background": stelleFest(bild.dunkel, true) },
    vorschau: { light: streifen(bild.hell), dark: streifen(bild.dunkel) },
  };
});

// Der Grund fuer "Glaswerk". Steht hier und nicht in der Liste, weil acht
// Ebenen in einer Zeile niemand mehr liest.
// Der Grund fuer "Glaswerk". Steht hier und nicht in der Liste, weil acht
// Ebenen in einer Zeile niemand mehr liest.
//
// Die Zahlen sind am 14.10.2026 an der Testmaschine gegen die Vorlage
// gestellt worden, nicht geschaetzt. Der erste Versuch war zu hell: Grund
// #dbe6f3, Raster 1.5px bei .22 - auf dem Schirm sah das aus wie Weiss,
// und von den Kacheln war nichts zu sehen. Jetzt traegt der Grund
// erkennbar Blau, und die Fugen sind 2px bei .34.
const GLASWERK_HELL =
  "linear-gradient(118deg, rgba(255,255,255,.50) 0 5%, rgba(255,255,255,0) 15%), " +
  "linear-gradient(118deg, rgba(255,255,255,0) 18%, rgba(255,255,255,.30) 22%, rgba(255,255,255,0) 29%), " +
  "repeating-linear-gradient(45deg, rgba(255,255,255,.34) 0 2px, rgba(255,255,255,0) 2px 84px), " +
  "repeating-linear-gradient(-45deg, rgba(255,255,255,.24) 0 2px, rgba(255,255,255,0) 2px 84px), " +
  "radial-gradient(closest-side, rgba(96,150,220,.45), transparent) left -260px top -200px / 900px 640px no-repeat, " +
  "radial-gradient(closest-side, rgba(140,190,236,.38), transparent) right -200px top -120px / 820px 600px no-repeat, " +
  "radial-gradient(closest-side, rgba(78,122,186,.34), transparent) right -160px bottom -260px / 860px 700px no-repeat, " +
  "linear-gradient(145deg, #a8c0da 0%, #cbdaec 42%, #9db6d2 100%)";
const GLASWERK_DUNKEL =
  "linear-gradient(118deg, rgba(255,255,255,.12) 0 5%, rgba(255,255,255,0) 15%), " +
  "linear-gradient(118deg, rgba(255,255,255,0) 18%, rgba(255,255,255,.08) 22%, rgba(255,255,255,0) 29%), " +
  "repeating-linear-gradient(45deg, rgba(255,255,255,.085) 0 2px, rgba(255,255,255,0) 2px 84px), " +
  "repeating-linear-gradient(-45deg, rgba(255,255,255,.06) 0 2px, rgba(255,255,255,0) 2px 84px), " +
  "radial-gradient(closest-side, rgba(46,92,168,.52), transparent) left -260px top -200px / 900px 640px no-repeat, " +
  "radial-gradient(closest-side, rgba(62,114,190,.40), transparent) right -200px top -120px / 820px 600px no-repeat, " +
  "radial-gradient(closest-side, rgba(26,54,110,.46), transparent) right -160px bottom -260px / 860px 700px no-repeat, " +
  "linear-gradient(145deg, #0d141f 0%, #16202f 42%, #0a111a 100%)";

export const HINTERGRUENDE = [
  {
    id: "keiner",
    de: "Keiner", en: "None",
    zweckDe: "Home Assistants eigener Hintergrund.",
    zweckEn: "Home Assistant's own background.",
    light: { "--lovelace-background": "" }, dark: { "--lovelace-background": "" },
  },
  ...FARBVERLAEUFE,
  {
    id: "verlauf",
    de: "Ruhiger Verlauf", en: "Quiet gradient",
    zweckDe: "Ein schraeger Verlauf, zwei Toene. Genug fuer Glas, ruhiger als die Punkte.",
    zweckEn: "One diagonal gradient, two tones. Enough for glass, calmer than the dots.",
    light: { "--lovelace-background": stelleFest("linear-gradient(155deg, #e9eef7 0%, #f4f1f8 55%, #eaf4f2 100%)", true) },
    dark:  { "--lovelace-background": stelleFest("linear-gradient(155deg, #0e1220 0%, #151225 55%, #0c1d1f 100%)", true) },
  },
  {
    id: "glaswerk",
    de: "Glaswerk", en: "Glasswork",
    zweckDe: "Diagonal verlegte Kacheln unter zwei Lichtbaendern. Gemacht fuer Glas - das Raster ist das, was durchscheint.",
    zweckEn: "Diagonally laid tiles under two bands of light. Made for glass - the grid is what shows through.",
    // Am 14.10.2026 nach einer Vorlage des Maintainers gebaut. Vier Sorten
    // Ebene, von oben nach unten:
    //
    //   zwei Lichtbaender   schraeg von oben links, weich auslaufend
    //   das Raster          zwei Scharen Linien, 90 Grad zueinander, 96px
    //   drei Farbflecken    wie bei den Farbverlaeufen, nur groesser
    //   Grundverlauf        kuehles Blaugrau
    //
    // KEIN Punktebild: istPunkteBild() erkennt ihn nicht, und das ist richtig
    // so. Punktbewegung wuerde die erste Ebene verschieben, und das sind hier
    // die Lichtbaender - sie wuerden aus dem Rahmen laufen. Die passende
    // Bewegung ist das Treiben der ganzen Flaeche; dabei wandert das Raster,
    // und genau das soll man sehen.
    light: { "--lovelace-background": stelleFest(GLASWERK_HELL, true) },
    dark:  { "--lovelace-background": stelleFest(GLASWERK_DUNKEL, true) },
    // Vier Toene aus dem Grund, damit die Kachel im Baukasten zeigt, was
    // sie waehlt - wie bei den Farbverlaeufen.
    vorschau: {
      light: "linear-gradient(90deg, #c7d7ea, #76a8e4, #96c6f0, #dbe6f3)",
      dark:  "linear-gradient(90deg, #0b1018, #2c569e, #3a6ab4, #121a28)",
    },
  },
];

// ---------------------------------------------------------------------------
// Bewegung und Farbwechsel
//
// Beide stehen in EINEM Block, weil beide dasselbe Bauteil animieren: Zwei
// Bloecke mit je einem "animation:" auf hui-view-background wuerden einander
// ueberschreiben, und es liefe nur der letzte.
//
// Bewegt wird nur mit transform, gefaerbt nur mit filter - beides rechnet die
// Grafikkarte, ohne dass die Flaeche neu gemalt wird. @property, mit dem sich
// die Farben eines Verlaufs selbst ueberblenden liessen, geht nicht: In einem
// Shadow Root wird die Regel nicht registriert (gemessen - im Dokument ja, im
// Shadow Root von hui-root nein), und jedes Stilziel liegt in einem.
//
// Die Flaeche wird fuer die Bewegung fest gestellt und rundum 14 % groesser
// gemacht, damit beim Verschieben kein Rand ins Bild laeuft. Die Zahl und die
// Wegpunkte stammen aus HATG, dort seit dem 16.09.2026 im Betrieb.

export const BEWEGUNG_ID = "hintergrund-bewegung";
export const BEWEGUNG_STUFEN = 10;
export const BEWEGUNG_VORGABE = { drift: 4, punkte: 0, farbe: 0, weite: 40 };

const DRIFT_NAME = "glaswerk-hintergrund-drift";
const FARBE_NAME = "glaswerk-hintergrund-farbe";
const PUNKTE_NAME = "glaswerk-hintergrund-punkte";
// Wie oft je Sekunde die Punkte einen Schritt tun - siehe bewegung().
const PUNKTE_TAKT = 10;

function stufe(wert, vorgabe) {
  const z = Math.round(Number(wert));
  if (!Number.isFinite(z)) return vorgabe;
  return Math.min(BEWEGUNG_STUFEN, Math.max(0, z));
}

// Der Ausschlag des Farbwechsels in Grad. 360 heisst: einmal ganz herum und
// weiter, statt hin und zurueck.
function grad(wert) {
  const z = Math.round(Number(wert));
  if (!Number.isFinite(z)) return BEWEGUNG_VORGABE.weite;
  if (z >= 360) return 360;
  return Math.min(180, Math.max(5, z));
}

// Stufe 1 ist die langsamste. Die Bewegung braucht dann eine Minute fuer einen
// Weg, der Farbwechsel fuenf - er soll auffallen, wenn man hinsieht, nicht
// waehrenddessen.
// Ein Umlauf der Punkte. Langsamer als das Treiben: Sie legen nur ein paar
// Dutzend Pixel zurueck, und bei Stufe 4 sind das etwa drei in der Sekunde.
export function punkteDauer(st) {
  const s = stufe(st, 0);
  return s ? Math.round(240 / s) : 0;
}
export function driftDauer(st) {
  const s = stufe(st, BEWEGUNG_VORGABE.drift);
  return s ? Math.round(60 / s) : 0;
}
export function farbDauer(st) {
  const s = stufe(st, 0);
  return s ? Math.round(300 / s) : 0;
}

// bild.punkte sagt, ob der Hintergrund ein Bild aus Farbpunkten ist
// (istPunkteBild). Die Punkte einzeln zu bewegen geht nur dort - auf jedem
// anderen Bild verschoebe derselbe Block dessen erste Ebene. Der Aufrufer
// kennt den Hintergrund, diese Funktion nicht: Mit { punkte: false } faellt
// die Punktbewegung weg, auch wenn eine Stufe verlangt ist. Ohne die Angabe
// bleibt sie, wie sie verlangt ist - so verliert ein Aufrufer, der nur eine
// andere Groesse aendert und den Rest aus leseBewegung() durchreicht, sie
// nicht nebenbei.
export function bewegung(einstellung = {}, bild = {}) {
  const drift = stufe(einstellung.drift, BEWEGUNG_VORGABE.drift);
  const farbe = stufe(einstellung.farbe, BEWEGUNG_VORGABE.farbe);
  const weite = grad(einstellung.weite);
  const punkte = bild.punkte === false ? 0 : stufe(einstellung.punkte, BEWEGUNG_VORGABE.punkte);
  if (!drift && !farbe && !punkte) return null;

  const laeufe = [];
  if (drift) laeufe.push(`${DRIFT_NAME} ${driftDauer(drift)}s ease-in-out infinite alternate`);
  if (farbe) {
    laeufe.push(weite === 360
      ? `${FARBE_NAME} ${farbDauer(farbe)}s linear infinite`
      : `${FARBE_NAME} ${farbDauer(farbe)}s ease-in-out infinite alternate`);
  }
  if (punkte) {
    // In Schritten, zehnmal je Sekunde, nicht in jedem Bild. background-position
    // rechnet nicht die Grafikkarte: Jeder neue Wert malt die Flaeche neu, und
    // jede Glaskarte darueber zeichnet ihre Weichzeichnung mit. Bei drei Pixeln
    // in der Sekunde ist ein Schritt ein Drittel Pixel - zu sehen ist der
    // Unterschied nicht, gemalt wird ein Sechstel so oft.
    const dauer = punkteDauer(punkte);
    laeufe.push(`${PUNKTE_NAME} ${dauer}s steps(${Math.max(1, Math.round(dauer / (PUNKTE.length) * PUNKTE_TAKT))}) infinite`);
  }
  const wandel = [drift ? "transform" : "", farbe ? "filter" : ""].filter(Boolean).join(", ");

  const teile = [];
  teile.push(`/* Treiben und Farbwechsel bewegen die Flaeche selbst, mit transform und
   filter - beides rechnet die Grafikkarte, ohne dass neu gemalt wird. */
hui-view-background {${drift ? `
  /* Fest am Fenster und rundum 14 % groesser, damit beim Verschieben kein
     Rand ins Bild laeuft. Home Assistant deckelt die Breite sonst auf 100 %. */
  position: fixed !important;
  inset: -14% !important;
  width: 128% !important;
  height: 128% !important;
  max-width: none !important;
  max-height: none !important;` : ""}
  animation: ${laeufe.join(", ")};${wandel ? `
  will-change: ${wandel};` : ""}
}`);
  if (punkte) {
    // Jeder Punkt laeuft sein eigenes Viereck ab und kommt in der Ruhelage
    // wieder an. Die fuenfte Angabe gehoert dem Grundverlauf - er bleibt stehen.
    const lage = (k) => PUNKTE.map((p) => (k === 0 ? punktLage(p) : punktLage(p, p.weg[k - 1][0], p.weg[k - 1][1]))).join(", ") + ", 0 0";
    teile.push(`/* Die Farbpunkte, jeder auf seinem eigenen Weg - in Schritten, zehnmal je
   Sekunde. Jeder Schritt malt die Flaeche neu, und jede Glaskarte darueber
   zeichnet mit; bei wenigen Pixeln in der Sekunde sieht man den Takt nicht. */
@keyframes ${PUNKTE_NAME} {
  0%, 100% { background-position: ${lage(0)}; }
  25% { background-position: ${lage(1)}; }
  50% { background-position: ${lage(2)}; }
  75% { background-position: ${lage(3)}; }
}`);
  }
  if (drift) {
    teile.push(`@keyframes ${DRIFT_NAME} {
  0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
  33% { transform: translate3d(-7%, 4%, 0) scale(1.08) rotate(-3deg); }
  66% { transform: translate3d(6%, -4%, 0) scale(1.04) rotate(2deg); }
  100% { transform: translate3d(-3%, 7%, 0) scale(1.12) rotate(-1.5deg); }
}`);
  }
  if (farbe) {
    teile.push(weite === 360
      ? `@keyframes ${FARBE_NAME} {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
}`
      : `@keyframes ${FARBE_NAME} {
  from { filter: hue-rotate(-${weite / 2}deg); }
  to { filter: hue-rotate(${weite / 2}deg); }
}`);
  }
  teile.push(`/* Wer am Geraet "Bewegung reduzieren" eingestellt hat, bekommt keine. */
@media (prefers-reduced-motion: reduce) {
  hui-view-background { animation: none !important; }
}`);

  return {
    id: BEWEGUNG_ID,
    gruppe: HINTERGRUND_GRUPPE,
    ziel: HINTERGRUND_ZIEL,
    de: "Bewegter Hintergrund",
    en: "Moving background",
    zweckDe: "Der Hintergrund treibt langsam und kann dabei seine Farbe wechseln. Wirkt auf Dashboards und auf der Home-Seite.",
    zweckEn: "The background drifts slowly and can shift its colour while doing so. Applies to dashboards and the home page.",
    einstellung: { drift, punkte, farbe, weite },
    css: teile.join("\n"),
  };
}

// Die Vorsilbe eines Markers. Dieselbe Regel wie MARKE_VOR in theme.js - wer
// die eine aendert, aendert beide. Gemischte Schreibweisen gehoeren dazu: Bis
// zum 16.10.2026 stand hier nur [A-Z][A-Z0-9]{2,15}, und beim Rebranding von
// "HATS" auf "Glaswerk" fiel jeder Marker durch das Muster. leseBewegung gab
// dann null zurueck, und jede eingeschaltete Vorlage galt als aus.
const MARKE_VOR = "[A-Za-z][A-Za-z0-9]{2,15}";

// Der Block einer Vorlage aus dem Text eines Stilziels, ohne die Marker. Die
// Vorsilbe ist frei - eine umbenannte Kopie traegt eine fremde.
function leseBlock(text, id) {
  if (typeof text !== "string") return null;
  const re = new RegExp(`/\\* ${MARKE_VOR}:${id}:START \\*/([\\s\\S]*?)/\\* ${MARKE_VOR}:${id}:ENDE \\*/`, "g");
  let letzter = null, t;
  while ((t = re.exec(text))) letzter = t[1];
  return letzter;
}

// Die Stellgroessen aus dem Theme zuruecklesen. null heisst: aus.
export function leseBewegung(text) {
  const block = leseBlock(text, BEWEGUNG_ID);
  if (block === null) return null;
  const d = new RegExp(`${DRIFT_NAME}\\s+([\\d.]+)s`).exec(block);
  const f = new RegExp(`${FARBE_NAME}\\s+([\\d.]+)s`).exec(block);
  const pk = new RegExp(`${PUNKTE_NAME}\\s+([\\d.]+)s`).exec(block);
  const w = /hue-rotate\((-?[\d.]+)deg\)\s*;?\s*}\s*to\s*{\s*filter:\s*hue-rotate\((-?[\d.]+)deg\)/.exec(block);
  const ausDauer = (dauer, basis) => {
    const z = Number(dauer);
    if (!Number.isFinite(z) || z <= 0) return 0;
    return Math.min(BEWEGUNG_STUFEN, Math.max(1, Math.round(basis / z)));
  };
  return {
    drift: d ? ausDauer(d[1], 60) : 0,
    punkte: pk ? ausDauer(pk[1], 240) : 0,
    farbe: f ? ausDauer(f[1], 300) : 0,
    weite: w ? grad(Math.abs(Number(w[2]) - Number(w[1]))) : BEWEGUNG_VORGABE.weite,
  };
}

// Was einschalten, wenn jemand "die Farbpunkte sollen sich leicht bewegen und
// die Farben aendern" meint und sonst nichts sagt. Eine Entscheidung, keine
// Messung: ein Umlauf in 80 Sekunden, der Farbton pendelt in zweieinhalb
// Minuten um 40 Grad. Die Flaeche selbst bleibt stehen - beides zugleich zoege
// die Punkte aus ihren Ecken.
export const PUNKTE_VORGABE = { drift: 0, punkte: 3, farbe: 2, weite: 40 };

// Passt die Bewegung im Theme noch zum Hintergrund?
//
// Wechselt jemand von den Farbpunkten zu einem Foto oder einem einfachen
// Verlauf, waehrend die Punkte laufen, verschiebt der Block von da an die
// erste Ebene des neuen Bildes. Aufzurufen nach JEDER Aenderung am Hintergrund.
//
//   text    der Inhalt des Stilziels uix-root
//   werte   alle gesetzten Werte von lovelace-background (flach, hell, dunkel)
//
//   zurueck undefined   alles passt, nichts zu tun
//           Vorlage     mit vorlageAn() schreiben - dieselbe Bewegung ohne Punkte
//           null        mit vorlageAus() abschalten - es gab nur die Punkte
export function bewegungNachBild(text, werte) {
  const b = leseBewegung(text);
  if (!b || !b.punkte) return undefined;
  const gesetzt = (werte || []).filter((w) => typeof w === "string" && w.trim());
  if (gesetzt.length && gesetzt.every(istPunkteBild)) return undefined;
  return bewegung(b, { punkte: false });
}

// Ein Hintergrund wurde GEWAEHLT - was heisst das fuer die Bewegung?
//
// Ansage des Maintainers vom 13.10.2026, auf die Frage, ob die Punkte beim
// Waehlen von selbst loslaufen sollen: "ja die punkte sollen gleich starten".
//
// Die Regel ist deshalb eine einzige: Wer ein Punktebild waehlt, bekommt
// laufende Punkte. Nicht nur beim allerersten Mal - sonst steht jemand, der
// ueber den ruhigen Verlauf zu den Punkten zurueckkommt, vor Punkten, die
// stillstehen, weil vom vorigen Mal noch der Farbwechsel im Block liegt.
// Genau das war am 13.10.2026 der Fall: Nordlicht, Ruhiger Verlauf, Sand -
// und bei Sand standen die Punkte auf 0.
//
// Was bleibt, wie es ist: Laufen die Punkte schon, aendert sich nichts. Und
// wer die Flaeche treiben laesst, behaelt das - beides zugleich zoege die
// Punkte aus ihren Ecken, und eine Wahl soll keine Einstellung ueberschreiben.
//
// Der zweite Aufruf aendert nichts mehr. Rueckgabe wie bewegungNachBild().
export function bewegungNachWahl(text, werte) {
  const gesetzt = (werte || []).filter((w) => typeof w === "string" && w.trim());
  if (!gesetzt.length || !gesetzt.every(istPunkteBild)) return bewegungNachBild(text, werte);
  const b = leseBewegung(text);
  if (!b) return bewegung(PUNKTE_VORGABE, { punkte: true });
  if (b.punkte || b.drift) return undefined;
  return bewegung({ ...b, punkte: PUNKTE_VORGABE.punkte }, { punkte: true });
}

// ---------------------------------------------------------------------------
// Der Himmel
//
// Ein Schleier ueber dem Hintergrund, der Wetter und Tageszeit folgt. Die fuenf
// Lagen und ihre Anteile stammen aus der Wetterkachel der Horizon-Cards
// (ha-karten/docs/himmel-verlauf.md, Stand 21.09.2026). Die Farben kommen aus
// der Theme - eine andere Theme faerbt den Himmel mit.
//
// Der Schleier liegt in zwei Scheinelementen von hui-view-background, jedes
// mit EINER Farbe und einer festen Maske. Ein Verlauf mit zwei Farben waere
// kuerzer, aber ein Verlauf blendet nicht ueber: Beim Wetterwechsel spraenge
// das Bild. background-color blendet von selbst, und die Maske aendert sich
// nie.
//
// DIE FALLE, UND SIE IST TEUER: Sobald in einem Stilziel EINE Vorlage steht,
// schickt UIX das GANZE Feld durch Jinja. Ein Fehler darin - ein Tippfehler,
// ein unbekannter Filter - leert das Feld vollstaendig, auch die Bloecke, die
// gar keine Vorlage sind. Gemessen: "--davor: 1" und "--danach: 2" rund um
// eine kaputte Zeile kamen beide nicht an. Im Stilziel root liegt auch die
// Kopfleiste der Glas-Vorlagen.
//
// Deshalb benutzt die Vorlage nur states(), is_state() und "in" - nichts, was
// bei einer fehlenden Entitaet einen Fehler wirft. Eine unbekannte Entitaet
// liefert "unknown" und damit die Lage "ohne": kein Schleier.
//
// Und deshalb gibt es vertraegtVorlage() weiter unten.

export const HIMMEL_ID = "hintergrund-himmel";

// Zustaende der Wetter-Entitaet, wie Home Assistant sie nennt.
export const HIMMEL_NASS = ["rainy", "pouring", "lightning", "lightning-rainy", "hail", "snowy", "snowy-rainy"];
export const HIMMEL_WOLKEN = ["cloudy", "partlycloudy", "fog", "windy", "windy-variant", "exceptional"];
export const HIMMEL_OHNE = ["unknown", "unavailable", "none", ""];

export const HIMMEL_STUFEN = 10;
export const HIMMEL_VORGABE = { staerke: 6 };

const REGEN = "var(--info-color, var(--primary-color, #03a9f4))";
const SONNE = "var(--warning-color, #ffb300)";
const LEISE = "var(--secondary-text-color, #727272)";
// Das Nachtblau der Wetterkachel ist das Blau der Theme, in ein festes
// Dunkelblau gezogen - und ueber dem Nachthimmel stellt die Kachel ihre
// Schrift auf Weiss. Ein Hintergrund kann das nicht: Er liegt unter JEDER
// Karte. Im Hellmodus laege ein dunkler Himmel unter hellem Glas mit dunkler
// Schrift. Deshalb zieht das Nachtblau hier in den Grundton der Theme, und
// der ist je Modus ein anderer.
const NACHT = `color-mix(in srgb, ${REGEN} 40%, var(--primary-background-color, #0b1733))`;
// Die Anteile der Wetterkachel bei voller Staerke. Sie sind fuer 119 px Kachel
// gemacht; ueber einen ganzen Bildschirm ist das viel, deshalb die Stellgroesse.
const ANTEILE = {
  sonnig: [[REGEN, 55], [SONNE, 30]],
  bewoelkt: [[REGEN, 30], [LEISE, 26]],
  nass: [[LEISE, 48], [REGEN, 30]],
  nacht: [[NACHT, 62], [REGEN, 28]],
  klar: [[NACHT, 72], [REGEN, 34]],
};

function staerkeStufe(wert) {
  const z = Math.round(Number(wert));
  if (!Number.isFinite(z)) return HIMMEL_VORGABE.staerke;
  return Math.min(HIMMEL_STUFEN, Math.max(1, z));
}

// Lage -> [oben, unten]. "ohne" ist durchsichtig, nicht weggelassen: Die
// Vorlage schlaegt darin nach, und ein fehlender Schluessel waere leer.
export function himmelLagen(staerke = HIMMEL_VORGABE.staerke) {
  const s = staerkeStufe(staerke);
  const anteil = ([farbe, prozent]) => `color-mix(in srgb, ${farbe} ${Math.round(prozent * s / HIMMEL_STUFEN)}%, transparent)`;
  const lagen = {};
  for (const [lage, [oben, unten]] of Object.entries(ANTEILE)) lagen[lage] = [anteil(oben), anteil(unten)];
  lagen.ohne = ["transparent", "transparent"];
  return lagen;
}
export const HIMMEL_LAGEN = Object.keys(himmelLagen());

// Eine Entitaets-ID, wie Home Assistant sie zulaesst. Alles andere kaeme
// ungeprueft in eine Vorlage, die der Server ausfuehrt.
export function istWetterEntitaet(id) {
  return typeof id === "string" && /^weather\.[a-z0-9_]+$/.test(id);
}

const jinjaListe = (liste) => "[" + liste.map((z) => `'${z}'`).join(", ") + "]";
const jinjaLagen = (lagen, stelle) => "{" + Object.entries(lagen)
  .map(([lage, farben]) => `'${lage}': '${farben[stelle]}'`).join(", ") + "}";

// Nur der Teil, der die Lage bestimmt - getrennt, damit sich genau er an der
// Instanz pruefen laesst, mit jedem Wetter und zu jeder Tageszeit.
export function himmelLageVorlage(wetter) {
  return `{%- set w = states('${wetter}') -%}
{%- set dunkel = is_state('sun.sun', 'below_horizon') -%}
{%- if w in ${jinjaListe(HIMMEL_OHNE)} -%}{%- set lage = 'ohne' -%}
{%- elif w in ${jinjaListe(HIMMEL_NASS)} -%}{%- set lage = 'nass' -%}
{%- elif w in ${jinjaListe(HIMMEL_WOLKEN)} -%}{%- set lage = 'nacht' if dunkel else 'bewoelkt' -%}
{%- elif dunkel or w == 'clear-night' -%}{%- set lage = 'klar' -%}
{%- else -%}{%- set lage = 'sonnig' -%}
{%- endif -%}`;
}

export function himmel(einstellung = {}) {
  const wetter = einstellung.wetter;
  if (!istWetterEntitaet(wetter)) return null;
  const staerke = staerkeStufe(einstellung.staerke);
  const lagen = himmelLagen(staerke);
  const css = `/* Der Himmel: ein Schleier ueber dem Hintergrund, nach Wetter und Tageszeit.
   Die Zeilen in geschweiften Klammern rechnet Home Assistant aus, nicht der
   Browser. Ein Tippfehler darin leert das ganze Stilziel. */
${himmelLageVorlage(wetter)}
{%- set oben = ${jinjaLagen(lagen, 0)} -%}
{%- set unten = ${jinjaLagen(lagen, 1)} %}
hui-view-background::before,
hui-view-background::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Die Farbe blendet beim Wetterwechsel ueber, die Maske bleibt stehen. */
  transition: background-color 4s ease;
}
hui-view-background::before {
  background-color: {{ oben[lage] }};
  -webkit-mask-image: linear-gradient(170deg, #000, transparent);
  mask-image: linear-gradient(170deg, #000, transparent);
}
hui-view-background::after {
  background-color: {{ unten[lage] }};
  -webkit-mask-image: linear-gradient(170deg, transparent, #000);
  mask-image: linear-gradient(170deg, transparent, #000);
}
@media (prefers-reduced-motion: reduce) {
  hui-view-background::before,
  hui-view-background::after { transition: none; }
}`;
  return {
    id: HIMMEL_ID,
    gruppe: HINTERGRUND_GRUPPE,
    ziel: HINTERGRUND_ZIEL,
    de: "Himmel nach Wetter",
    en: "Sky by weather",
    zweckDe: "Ein Farbschleier ueber dem Hintergrund, der der Wetter-Entitaet und dem Sonnenstand folgt. Die Farben kommen aus der Theme.",
    zweckEn: "A colour veil over the background that follows the weather entity and the sun. The colours come from the theme.",
    einstellung: { wetter, staerke },
    css,
  };
}

export function leseHimmel(text) {
  const block = leseBlock(text, HIMMEL_ID);
  if (block === null) return null;
  const t = /states\('(weather\.[a-z0-9_]+)'\)/.exec(block);
  // Die Staerke steht nirgends als Zahl - sie steckt im Anteil der ersten
  // Lage. Voll sind es 55 %, jede Stufe ein Zehntel davon.
  const p = /'sonnig': '[^']*?\s(\d+)%, transparent\)'/.exec(block);
  return {
    wetter: t ? t[1] : "",
    staerke: p ? staerkeStufe(Number(p[1]) / (ANTEILE.sonnig[0][1] / HIMMEL_STUFEN)) : HIMMEL_VORGABE.staerke,
  };
}

// Welche Lage bei welchem Wetter herauskommt - dieselbe Zuordnung noch einmal
// in JavaScript, fuer die Vorschau im Panel. Sie ist NICHT das, was laeuft;
// was laeuft, rechnet Home Assistant. Der Test vergleicht beide an der
// Instanz, sonst liefen sie auseinander, ohne dass es jemand merkt.
export function himmelLage(wetter, dunkel) {
  const w = String(wetter ?? "");
  if (HIMMEL_OHNE.includes(w)) return "ohne";
  if (HIMMEL_NASS.includes(w)) return "nass";
  if (HIMMEL_WOLKEN.includes(w)) return dunkel ? "nacht" : "bewoelkt";
  if (dunkel || w === "clear-night") return "klar";
  return "sonnig";
}

// ---------------------------------------------------------------------------
// Vertraegt das Feld eine Vorlage?
//
// Steht eine Jinja-Vorlage in einem Stilziel, liest Jinja das ganze Feld - auch
// das CSS, das schon dort stand. Drei Zeichenfolgen haben dann eine Bedeutung,
// die sie in CSS nicht haben:
//
//   {#   Beginn eines Kommentars. In CSS harmlos und gar nicht selten:
//        "@media (...) {#view { ... }}". Gemessen: Mit einer Vorlage im selben
//        Feld kam von diesem CSS nichts mehr an, ohne Vorlage alles.
//   {{   Beginn eines Ausdrucks
//   {%   Beginn einer Anweisung
//
// Geprueft wird der Text OHNE den eigenen Block. Ein Treffer heisst: nicht
// einschalten, sondern dem Nutzer die Stelle zeigen.
export function vertraegtVorlage(text) {
  if (typeof text !== "string" || !text) return [];
  const re = new RegExp(`/\\* ${MARKE_VOR}:${HIMMEL_ID}:START \\*/[\\s\\S]*?/\\* ${MARKE_VOR}:${HIMMEL_ID}:ENDE \\*/`, "g");
  const rest = text.replace(re, "");
  const funde = [];
  const zeilen = rest.split("\n");
  zeilen.forEach((zeile, i) => {
    for (const zeichen of ["{#", "{{", "{%"]) {
      if (zeile.includes(zeichen)) funde.push({ zeile: i + 1, zeichen, text: zeile.trim().slice(0, 80) });
    }
  });
  return funde;
}

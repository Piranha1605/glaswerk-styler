// Baut die Theme "glaswerk" - Glaskarten auf einem diagonalen Raster.
//
//   node werkzeuge/glaswerk-bauen.mjs
//   node werkzeuge/glaswerk-bauen.mjs --ohne-uix
//
// Schreibt werkzeuge/themes/glaswerk.yaml.
//
// Entstanden am 14.10.2026 auf Ansage, mit einer Vorlage daneben: "bau mir
// mal wirklich eine lauffaehige theme zusammen das die karten aussehen wie auf
// dem screenshot." Die Vorlage zeigt eine helle Glasflaeche ueber diagonal
// verlegten Kacheln, mit Lichtbaendern von oben links.
//
// ---------------------------------------------------------------------------
// WAS AUS DEM BAUKASTEN KOMMT UND WAS HIER ENTSCHIEDEN WIRD
//
// Aus dem Baukasten, also genau das, was ein Nutzer im Panel anklicken wuerde:
//
//     Farben       glaswerk     Azur mit violettem Akzent
//     Hintergrund  glaswerk     das diagonale Raster, hell und dunkel
//     Karten       glas         Lichtkante oben, Schattenkante unten
//     Rundung      rund         die Leiter, grosszuegig
//     Dichte       weit         fuenf Pixel je Stufe
//     Schrift      system       die Schrift des Geraets
//
// Damit erkennt der Baukasten diese Theme spaeter in ALLEN SECHS Sorten
// wieder. Das ist nicht Kosmetik: Wer sie oeffnet, sieht sofort, woraus sie
// besteht, und kann ein Teil austauschen, ohne den Rest zu verlieren.
//
// Hier entschieden wird nur, was kein Teil hergibt - die Schriftfarben auf dem
// kuehlen Grund und die drei Schattenstufen.
//
// ---------------------------------------------------------------------------
// WAS AUS DER VORLAGE NICHT GEHT
//
// Der dicke Glasklotz in der Vorlage bricht das Licht und faechert es an den
// Kanten in Regenbogenfarben auf. Das ist in CSS nicht zu haben, auch nicht
// ueber UI eXtension:
//
// Echte Brechung braucht einen SVG-Filter mit feDisplacementMap, und der muss
// als Element IM DOKUMENT stehen - referenziert wird er mit
// backdrop-filter: url(#id). Am 14.10.2026 nachgelesen (kube.io/blog/
// liquid-glass-css-svg, dev.to/devyatov/liquid-glass-on-the-web): Es geht nur
// in Chromium, es steht in keiner Spezifikation, und Safari und Firefox fallen
// stumm auf eine gewoehnliche Weichzeichnung zurueck.
//
// Und HATS kann es ohnehin nicht liefern: Eine Theme schreibt CSS, keine
// Elemente. Ein SVG-Filter laesst sich mit keinem Stilziel in die Seite
// bringen. Was bleibt - Weichzeichnung, Saettigung, Saum, Lichtstreifen,
// Schatten - ist genau das, woraus die KARTEN in der Vorlage bestehen; der
// Klotz daneben ist ein Render, keine Flaeche.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { leseTheme, schreibeTheme, setze, vorlageAn } from "../custom_components/hats/www/theme.js";
import { VORLAGEN } from "../custom_components/hats/www/vorlagen.js";
import { PALETTEN, KARTENSTILE, SCHRIFTEN, BAUKASTEN, teilAnwenden }
  from "../custom_components/hats/www/baukasten.js";
import { HINTERGRUENDE, bewegung } from "../custom_components/hats/www/hintergrund.js";

const OHNE_UIX = process.argv.includes("--ohne-uix");
const NAME = OHNE_UIX ? "glaswerk_ohne_uix" : "glaswerk";

// --- Die Grundlage ---------------------------------------------------------
const roh = readFileSync("docs/beispiele/ha-blanko.yaml", "utf8");
const gelesen = leseTheme(roh);
const m = gelesen.modell ?? gelesen;
m.name = NAME;

let gesetzt = 0;
const schreibe = (name, wert, ebene) => {
  const k = name.replace(/^--/, "");
  if (wert === "" || wert === null || wert === undefined) {
    for (const e of ["flach", "light", "dark"]) delete m[e][k];
  } else {
    setze(m, k, wert, ebene);
  }
  gesetzt++;
};

const teil = (sorte, id) => {
  const t = (BAUKASTEN[sorte]?.teile || []).find((x) => x.id === id);
  if (!t) throw new Error(`${sorte}/${id} gibt es im Baukasten nicht`);
  return t;
};

// --- Die sechs Teile, in der Reihenfolge des Baukastens ---------------------
//
// Die Reihenfolge ist nicht beliebig: Der Kartenstil kommt NACH der Rundung,
// weil beide --ha-card-border-radius schreiben. "Glas" setzt 20px, und das
// soll stehen bleiben - die Leiter darunter bleibt trotzdem die von "rund",
// fuer Knoepfe, Felder und Dialoge.
//
// Hier stand bis zum 14.10.2026 "liquid". Der Maintainer hat beide auf
// demselben Grund verglichen, hell und dunkel, und sich fuer die Kante von
// "Glas" entschieden: Lichtkante oben, Schattenkante unten, Seiten offen,
// kein Rahmen - die Karte wirkt gewoelbt statt umrandet. Liquid Glass liegt
// weiter im Baukasten, es ist nur nicht die Wahl fuer diese Theme.
teilAnwenden("palette", teil("palette", "glaswerk"), schreibe);
teilAnwenden("schrift", teil("schrift", "system"), schreibe);
teilAnwenden("rundung", teil("rundung", "rund"), schreibe);
teilAnwenden("dichte", teil("dichte", "weit"), schreibe);
teilAnwenden("karten", teil("karten", "glas"), schreibe);
teilAnwenden("hintergrund", teil("hintergrund", "glaswerk"), schreibe);

// --- Schrift auf kuehlem Grund ---------------------------------------------
//
// ENTSCHEIDUNG. ha_blanko bringt HAs eigene Schriftfarben mit, und die sind
// neutral grau. Auf einem blaustichigen Grund wirkt neutrales Grau schmutzig -
// die Schrift bekommt denselben Stich wie die Flaeche, nur viel dunkler.
//
// Gegengerechnet gegen die hellste Stelle des Grundes (#dbe6f3) und die
// dunkelste des dunklen (#090e16):
//
//     #121a2b auf #dbe6f3   ->  14.1 : 1
//     #e8edf7 auf #090e16   ->  16.6 : 1
//
// Die Sekundaerfarbe liegt jeweils darueber, bleibt aber ueber 4.5 : 1.
const SCHRIFT = {
  "--primary-text-color": ["#121a2b", "#e8edf7"],
  "--secondary-text-color": ["#4b5873", "#a6b1c8"],
  "--ha-color-text-primary": ["#121a2b", "#e8edf7"],
  "--ha-color-text-secondary": ["#4b5873", "#a6b1c8"],
  "--sidebar-text-color": ["#121a2b", "#e8edf7"],
  "--sidebar-icon-color": ["#4b5873", "#a6b1c8"],
  "--app-header-text-color": ["#121a2b", "#e8edf7"],
  // Die Trennlinien tragen denselben Stich, nur als Deckkraft - eine feste
  // Farbe waere in einem der beiden Modi falsch.
  "--divider-color": ["rgba(16, 30, 60, .12)", "rgba(255, 255, 255, .12)"],
  "--ha-color-border-neutral-quiet": ["rgba(16, 30, 60, .10)", "rgba(255, 255, 255, .10)"],
  "--ha-color-border-neutral-normal": ["rgba(16, 30, 60, .18)", "rgba(255, 255, 255, .18)"],
  // Der Grund unter allem. Zu sehen ist er nur dort, wo kein Dashboard liegt -
  // auf den Einstellungsseiten etwa, die hui-view-background nicht haben.
  "--primary-background-color": ["#dbe6f3", "#0b1018"],
};

// --- Schatten ---------------------------------------------------------------
//
// ENTSCHEIDUNG. HAs eigene drei Stufen, auf dasselbe Licht abgestimmt wie der
// Kartenschatten: im Hellen blaustichig und flach, im Dunkeln schwarz und
// tief. Sie stehen in Dutzenden Bauteilen als Ausweichwert und lohnen deshalb,
// auch wenn man sie einzeln nie sieht.
const SCHATTEN = {
  "--ha-box-shadow-s": ["0 1px 2px rgba(26, 40, 72, .10)", "0 1px 2px rgba(0, 0, 0, .45)"],
  "--ha-box-shadow-m": ["0 6px 16px rgba(26, 40, 72, .14)", "0 6px 18px rgba(0, 0, 0, .52)"],
  "--ha-box-shadow-l": ["0 18px 44px rgba(26, 40, 72, .18)", "0 20px 50px rgba(0, 0, 0, .60)"],
};

for (const quelle of [SCHRIFT, SCHATTEN]) {
  for (const [name, wert] of Object.entries(quelle)) {
    if (Array.isArray(wert)) {
      schreibe(name, wert[0], "light");
      schreibe(name, wert[1], "dark");
    } else {
      schreibe(name, wert, "beide");
    }
  }
}

// --- NOCH NICHT IM PANEL ---------------------------------------------------
//
// Ab hier stehen Felder, die HATS noch nicht anbietet. Normalerweise ist das
// verboten (CLAUDE.md: "Nie ein Feld schreiben, das HATS nicht anbietet") -
// wer sie von Hand einträgt, bekommt sie im Panel nie wieder heraus.
//
// Auf Ansage vom 14.10.2026 gilt hier eine Ausnahme fuer die Bauphase: "du
// arbeitest erst einmal nur in der Theme ist schneller". Die Theme ist der
// Entwurf; wenn sie steht, wissen wir, was ins Panel gehoert. Diese Liste IST
// der Uebergabezettel - was hier steht, braucht am Ende eine Kachel.
//
//     --mush-control-border-radius   Stufe 6, Gruppe Mushroom Masse
//     --bubble-border-radius         Stufe 6, Gruppe Bubble Flaechen
//     --sidebar-selected-icon-color  Stufe 7, Gruppe Seitenleiste
//     --sidebar-selected-text-color  Stufe 7, Gruppe Seitenleiste
//     --state-cover-active-color     Stufe 5, Gruppe Zustandsfarben
//
const NOCH_OHNE_KACHEL = {
  // Am 14.10.2026 an der Vergleichsseite gemessen, auf Ansage ("wir gehen
  // jetzt an die slider"), mit zwei Kaestchen im Bild: HA-Kachel und
  // Mushroom, beide mit demselben Schieber, beide anders gerundet.
  //
  //     HA .slider             20px   = --ha-border-radius-lg, aus der Leiter
  //     HA .slider-track-bar   14px   = --ha-border-radius-md
  //     Mushroom .slider       12px   Mushrooms eigene Vorgabe, nicht die Leiter
  //
  // Beide sind 42px hoch, es ist WIRKLICH nur die Rundung. Mushroom liest
  // --mush-control-border-radius (Vorgabe 12px) - aus mushroom-light-card
  // gelesen, nicht geraten. Auf 20px gesetzt sitzt der Schieber genau auf HAs.
  "--mush-control-border-radius": "20px",

  // Dieselbe Sorte Abweichung eine Ebene hoeher, davor gemessen: Bubbles
  // .bubble-container stand auf 28px, waehrend Karte und Kachel auf 20 lagen.
  // Die allgemeine Stufe ist die richtige - sie erreicht alle Kartentypen und
  // laesst Bubbles Typlogik in Ruhe (CLAUDE.md, "die Kette ist dreistufig").
  "--bubble-border-radius": "20px",

  // --- Ein Blau, nicht vier -------------------------------------------------
  //
  // Auf Ansage vom 14.10.2026: "kannst du in der theme die blauen schalter
  // slider und menuepunkte alle auf die selbe farbe setzen wie bei mushroom
  // living room windows slider". Gemessen, was da nebeneinander stand:
  //
  //     Schalter, Seitenleiste   #004fc7   primary-40 der alten Rampe
  //     Akzent                   #7b5cf0   violett
  //     Rollladen (HA-Kachel)    #926bc7   --state-cover-active-color
  //     Mushrooms Rollladen      #2196f3   <- das Ziel
  //
  // Die Palette traegt jetzt #2196f3 als Primaerfarbe UND als Akzent. Was sie
  // nicht kann: den Ton auf einer bestimmten Stufe festnageln. HAs Rampe legt
  // die Helligkeit je Stufe fest - mit dieser Basis liegt Stufe 40 auf
  // #086ebf und Stufe 50 auf #2190e9. Wo HA die 40 nimmt (Seitenleiste,
  // Schalterfuellung), bleibt es also etwas dunkler als Mushrooms Regler.
  // Eine Basis, die Stufe 40 genau auf #2196f3 bringt, gibt es nicht; das ist
  // ausgerechnet, nicht geschaetzt.
  //
  // Diese drei Felder setzen den Ton deshalb direkt - sie gehen NICHT ueber
  // die Rampe:
  "--sidebar-selected-icon-color": "#2196f3",
  "--sidebar-selected-text-color": "#2196f3",
  // Die Zustandsfarbe des Rollladens, damit HAs Kachel nicht als einzige
  // violett bleibt.
  "--state-cover-active-color": "#2196f3",
};

// --- Schalter und Zeilensymbole -------------------------------------------
//
// Gemeldet am 14.10.2026: "nur die schalter passen noch nicht ganz und ich
// meine auch die icons und toogle in zeilen". Gemessen, was da stand:
//
//     Schalter Spur an    #e0effb   fill-primary-normal-resting, fast weiss
//     Schalter Daumen     #086ebf   on-primary-normal
//     Zeilensymbol        #086ebf   --state-icon-color
//     Modus-Pille         #086ebf   --primary-color, also Rampenstufe 40
//
// Der Schalter war damit als einziger ein BLASSER Trog mit dunklem Punkt,
// waehrend daneben alles voll gefaerbt war. Jetzt andersherum: volle Spur,
// weisser Daumen - das Bild, das jeder von einem Kippschalter hat.
//
// Die Pille bleibt auf #086ebf und das ist Absicht: HAs eigenes
// ha-control-select nimmt dort ebenfalls --primary-color (aus seinen
// elementStyles gelesen). Wer sie verschoebe, wiche von Home Assistant ab,
// nicht von der Theme.
const SCHALTER = {
  "--ha-switch-checked-background-color": "#2196f3",
  "--ha-switch-checked-background-color-hover": "#1b86de",
  "--ha-switch-checked-border-color": "#2196f3",
  // Weiss auf Blau - und im Dunkeln dasselbe, denn der Daumen liegt auf der
  // Spur, nicht auf dem Grund.
  "--ha-switch-checked-thumb-background-color": "#ffffff",
  "--ha-switch-checked-thumb-border-color": "#ffffff",
  // Das Zeilensymbol: dieselbe Farbe wie alles andere Aktive.
  "--state-icon-color": "#2196f3",
};
for (const [name, wert] of Object.entries(SCHALTER)) schreibe(name, wert, "beide");
for (const [name, wert] of Object.entries(NOCH_OHNE_KACHEL)) schreibe(name, wert, "beide");

// --- Vorlagen --------------------------------------------------------------
//
// glas-lichtkante bleibt aus, wie bei macos: Sie legt einen zweiten Saum mit
// festen Hell-Werten UEBER die Flaeche, und der Saum kommt hier schon aus
// --ha-card-box-shadow, je Modus.
const NICHT_AN = ["glas-lichtkante"];
if (!OHNE_UIX) for (const v of VORLAGEN) if (!NICHT_AN.includes(v.id)) vorlageAn(m, v);

// --- Bewegung: TREIBEN, nicht Punkte ---------------------------------------
//
// Punktbewegung verschiebt die erste Hintergrundebene einzeln. Bei den
// Farbverlaeufen ist das ein Farbfleck; hier waere es ein LICHTBAND, und das
// liefe aus dem Rahmen. istPunkteBild() sagt dasselbe: Der Grund ist keines.
//
// Das Treiben bewegt die ganze Flaeche, um 14 Prozent vergroessert. Dabei
// wandert das Raster schraeg durchs Bild - genau das, was man bei diesem
// Grund sehen soll. Stufe 3 von 10, also langsam: Ein Raster, das zu schnell
// wandert, macht die Seite unruhig statt lebendig.
if (!OHNE_UIX) vorlageAn(m, bewegung({ drift: 3, punkte: 0, farbe: 2, weite: 0 }, { punkte: false }));

// --- Der Kopf --------------------------------------------------------------
const version = /VERSION = "([^"]+)"/.exec(
  readFileSync("custom_components/hats/const.py", "utf8"))?.[1] ?? "0.0.0";
const heute = new Date().toLocaleString("de-DE");
m.kopf = [
  `Erzeugt mit HATS ${version} am ${heute}`,
  "Grundlage: ha_blanko (HA 2026.10 ohne Altlasten)",
  "",
  ...(OHNE_UIX ? [
    "OHNE UI eXtension. Dieselbe Theme wie glaswerk, aber ohne ein einziges",
    "Stilziel - nur die Felder. Sie ist das mittlere Bild eines Vergleichs,",
    "kein zweites Produkt.",
    "",
  ] : []),
  "Glaswerk. Glaskarten auf einem diagonalen Raster, hell und dunkel,",
  "gebaut mit werkzeuge/glaswerk-bauen.mjs - also mit HATS' eigenen",
  "Funktionen.",
  "",
  "Alle sechs Teile kommen aus dem Baukasten: Farben glaswerk, Schrift",
  "system, Rundung rund, Dichte weit, Karten glas, Hintergrund glaswerk.",
  "Wer die Theme im Panel oeffnet, sieht sie dort alle sechs angehakt und",
  "kann eines austauschen, ohne den Rest zu verlieren.",
  "",
  "Entschieden und nicht aus einem Teil: die Schriftfarben auf dem kuehlen",
  "Grund (gegengerechnet, 14.1:1 hell und 16.6:1 dunkel) und die drei",
  "Schattenstufen. Die Begruendung je Zahl steht im Build-Skript.",
];

// --- Schreiben -------------------------------------------------------------
mkdirSync("werkzeuge/themes", { recursive: true });
const text = schreibeTheme(m);
writeFileSync(`werkzeuge/themes/${NAME}.yaml`, text);

// --- Gegenprobe: zweimal durch und zurueck muss dasselbe liefern -----------
const zurueck = leseTheme(text);
const nochmal = schreibeTheme(zurueck.modell ?? zurueck);
const idempotent = text === nochmal;

// --- Gegenprobe: der Baukasten muss sich wiedererkennen --------------------
//
// Die schaerfere der beiden. Trifft eine Sorte nicht, stimmt irgendwo ein
// Wert nicht mit dem Teil ueberein - und der Nutzer saehe im Panel eine Theme
// ohne Haken, ohne zu wissen, woran es liegt.
const { erkenneTeil } = await import("../custom_components/hats/www/baukasten.js");
const zurueckM = zurueck.modell ?? zurueck;
const lies = (name, ebene) => {
  const k = name.replace(/^--/, "");
  return ebene === "beide" ? zurueckM.flach[k] : (zurueckM[ebene]?.[k] ?? zurueckM.flach[k]);
};
const soll = { palette: "glaswerk", schrift: "system", rundung: "rund",
               dichte: "weit", karten: "glas", hintergrund: "glaswerk" };
const treffer = Object.fromEntries(
  Object.keys(soll).map((s) => [s, erkenneTeil(s, lies)]));
const erkannt = Object.entries(soll).every(([s, id]) => treffer[s] === id);

console.log(`${gesetzt} Felder gesetzt, ${OHNE_UIX ? 0 : VORLAGEN.length - NICHT_AN.length} Vorlagen an`);
console.log(`${text.length} Bytes, ${text.split("\n").length} Zeilen`);
console.log(`idempotent: ${idempotent ? "ja" : "NEIN"}`);
console.log(`Baukasten erkennt: ${Object.entries(treffer).map(([s, v]) => `${s}=${v}`).join(" ")}`);
if (!idempotent || !erkannt) process.exit(1);

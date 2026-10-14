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

// --- Fassungen -------------------------------------------------------------
//
// Auf Ansage vom 14.10.2026: "koennen wir die glaswerk theme langsam mit
// versionsnummern versehen das ich optisch testen kann vorher nacher und so."
//
// Jeder Lauf schreibt ZWEI Dateien: glaswerk.yaml, die immer den neuesten
// Stand traegt, und glaswerk_vN.yaml, eine Kopie unter eigenem Namen. Eigener
// NAME, nicht nur eigener Dateiname - Home Assistant fuehrt Themes nach dem
// Wurzelschluessel, und nur so stehen sie im Waehler nebeneinander.
//
// Wer FASSUNG hochzaehlt, friert die vorige ein: Ihre Datei wird nicht mehr
// angefasst, sie bleibt auf der Instanz liegen und laesst sich jederzeit
// gegen die neue stellen.
//
// Die Zeile dahinter steht im Kopf jeder Datei. Sie ist der Grund, warum man
// eine Fassung ueberhaupt aufhebt - ohne sie weiss in einer Woche niemand
// mehr, was v2 von v3 unterscheidet.
const FASSUNG = 1;
const FASSUNGEN = {
  1: "Erste gezaehlte Fassung. Glas-Karten auf dem diagonalen Raster, ein Blau " +
     "ueberall (#2196f3), Regler glimmen und sind 28px schlank, Schalter mit " +
     "voller Spur und weissem Daumen.",
};

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
// Die Reihenfolge ist Teil der Aussage, deshalb eine Liste und kein Objekt:
// Der Kartenstil kommt NACH der Rundung, sonst verliert "Glas" seine 20px.
const TEILE = [
  ["palette",     "glaswerk-orange"],
  ["schrift",     "system"],
  ["rundung",     "rund"],
  ["dichte",      "weit"],
  ["karten",      "glas"],
  ["hintergrund", "glaswerk"],
];
for (const [sorte, id] of TEILE) teilAnwenden(sorte, teil(sorte, id), schreibe);

// Der Satz im Kopf der Datei, aus denselben Angaben wie die Theme selbst.
// Umgebrochen auf zwei Zeilen, damit der Kommentarblock seine Breite behaelt.
function kopfSatz() {
  const wort = { palette: "Farben", schrift: "Schrift", rundung: "Rundung",
                 dichte: "Dichte", karten: "Karten", hintergrund: "Hintergrund" };
  const satz = "Alle sechs Teile kommen aus dem Baukasten: "
    + TEILE.map(([sorte, id]) => `${wort[sorte]} ${id}`).join(", ") + ".";
  const zeilen = [];
  let zeile = "";
  for (const w of satz.split(" ")) {
    if ((zeile + " " + w).trim().length > 70) { zeilen.push(zeile.trim()); zeile = w; }
    else zeile += " " + w;
  }
  if (zeile.trim()) zeilen.push(zeile.trim());
  return zeilen;
}

// --- Die Rasterzeile unter dem, was "weit" vorgibt -------------------------
//
// Gemeldet am 14.10.2026: "ich glaub die karten sind etwas gross". Gemessen,
// woran das haengt - und es war nicht das Polster: dieselbe Ansicht bei 3, 4
// und 5 px je Stufe liess eine Kachel auf 120 px stehen. Die Hoehe kommt aus
// der Rasterzeile der Section, und die stand bis dahin auf HAs 56, weil die
// Dichte sie gar nicht anfasste.
//
// Seit demselben Tag tut sie es, und "weit" hiesse 64 - also MEHR als vorher.
// Das waere die falsche Richtung. Deshalb bleibt das Polster bei fuenf Pixeln
// je Stufe, und nur die Zeile geht auf 48:
//
//     Zeile 64   Kachel 134     zu wuchtig
//     Zeile 56   Kachel 120     der Stand, der zu gross war
//     Zeile 48   Kachel 104     an der Instanz verglichen, hell und dunkel
//
// Das Polster ist der Innenraum einer Karte und entscheidet, ob man mit dem
// Finger trifft; die Zeile ist ihre Hoehe. Der Vorwurf galt der Hoehe.
//
// Die Theme behaelt dabei ihren Haken bei "Dichte: weit" - erkenneTeil
// ueberspringt im zweiten Durchgang die Felder, die die Sorte als Regler
// fuehrt, und die Zeilenhoehe ist seit dem 14.10.2026 eines davon. Genau
// dafuer ist der zweite Durchgang da: Der Baukasten laedt zum Drehen ein.
schreibe("--ha-section-grid-row-height", "48px", "beide");

// --- Glas auf den Knoepfen --------------------------------------------------
//
// Auf Ansage vom 14.10.2026, mit einem Bild des Knopfs "Integration
// hinzufuegen": "kannst du all den buttons im system auch einen glastouch
// verpassen" - und gleich danach "ich dem menues" und "und schaltern".
//
// WAS GEMESSEN IST. HAs Knoepfe sind seit 2026 Web-Awesome-Bauteile. Ihre
// Flaeche kommt aus --wa-color-*, je nach appearance:
//
//     appearance=accent   --wa-color-brand-fill-loud     der schwebende Knopf
//     appearance=filled   --wa-color-brand-fill-normal   "Hinzufuegen" in Karten
//     appearance=plain    durchsichtig, ueberfahren -fill-quiet
//
// Drei der Namen traegt HA exakt aus seiner eigenen Farbebene (am Element
// gegengelesen), die beiden "quiet" zeigen auf die NORMAL-Stufe. Deshalb
// stehen hier Verweise statt Farben: Wer die Palette aendert, bekommt die
// Knoepfe mit.
//
// WARUM NUR DURCHSCHEINEND UND KEIN FILTER. Kein einziges der Bauteile liest
// backdrop-filter - ha-button, wa-dropdown und ha-switch alle ohne, gemessen.
// Und erreichbar waeren sie auch nicht: Auf den Einstellungsseiten haengt UIX
// nur in ha-drawer, ha-sidebar und home-assistant-main ein (drei Knoten
// gezaehlt), die Knoepfe liegen tiefer in ha-config-flow-card. Eine Variable
// erbt dagegen durch jede Grenze.
//
// Das reicht trotzdem: Ein durchscheinender Knopf auf einer Glaskarte zeigt
// deren Weichzeichnung durch. Das Glas kommt von unten, nicht vom Knopf.
//
// Die Prozente sind eine Entscheidung, keine Messung - der Akzent bleibt am
// dichtesten, weil er der einzige Knopf ist, der Weiss traegt.
for (const [feld, quelle, anteil] of [
  ["--wa-color-brand-fill-loud",     "--ha-color-fill-primary-loud-resting",   62],
  ["--wa-color-brand-fill-normal",   "--ha-color-fill-primary-normal-resting", 55],
  ["--wa-color-brand-fill-quiet",    "--ha-color-fill-primary-normal-resting", 40],
  ["--wa-color-neutral-fill-normal", "--ha-color-fill-neutral-normal-resting", 45],
  ["--wa-color-neutral-fill-quiet",  "--ha-color-fill-neutral-normal-resting", 35],
]) schreibe(feld, `color-mix(in srgb, var(${quelle}) ${anteil}%, transparent)`, "beide");

// Menues und Schalter bleiben, wie sie sind. Gemessen stehen ihre Flaechen
// schon auf rgba(26, 31, 48, .9) - durchscheinend genug. Weiter aufzumachen
// kostet mehr, als es bringt: Ein Aufklappmenue ohne Weichzeichnung laesst den
// Text darunter durchscheinen, und lesbar bleiben muss es. Die Felder stehen
// im Panel, zum Drehen fuer den, der es anders will.

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
  // Nur das Symbolfeld. --sidebar-selected-text-color sah aus wie das
  // Gegenstueck und ist keines: ha-sidebar liest es nicht, die Schrift des
  // gewaehlten Eintrags nimmt dasselbe Feld wie das Symbol. Am 14.10.2026 aus
  // den elementStyles gelesen, nachdem es einen halben Tag mitgeschrieben
  // wurde, ohne etwas zu tun.
  "--sidebar-selected-icon-color": "#2196f3",
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
  // GERECHNET, NICHT GETIPPT. Hier stand der Satz bis zum 14.10.2026
  // woertlich - und als die Palette auf glaswerk-orange wechselte, nannte er
  // weiter "Farben glaswerk". Ein Kopf, der sich selbst widerspricht, ist
  // schlimmer als keiner: Ein Test der Steuerkarte vergleicht genau ihn
  // gegen das, was der Baukasten erkennt.
  ...kopfSatz(),
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

// Dieselbe Theme noch einmal unter ihrem Fassungsnamen. Der Name steht im
// Modell, also wird er getauscht und neu geschrieben - nicht die Datei kopiert
// und der Schluessel mit einem Suchen-und-Ersetzen verbogen.
let fassungsText = null;
if (!OHNE_UIX) {
  const fname = `glaswerk_v${FASSUNG}`;
  m.name = fname;
  m.kopf = [
    ...m.kopf.slice(0, 2),
    "",
    `FASSUNG ${FASSUNG} - eingefroren, damit man sie gegen die naechste stellen kann.`,
    ...FASSUNGEN[FASSUNG].match(/.{1,70}(\s|$)/g).map((z) => z.trim()),
    "",
    "Dieselbe Theme wie glaswerk, nur unter eigenem Namen. Wer glaswerk",
    "weiterbaut, kann hier jederzeit zurueckschauen - im Theme-Waehler stehen",
    "beide nebeneinander.",
    "",
    ...m.kopf.slice(3),
  ];
  fassungsText = schreibeTheme(m);
  writeFileSync(`werkzeuge/themes/${fname}.yaml`, fassungsText);
  m.name = NAME;
}

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
if (fassungsText) console.log(`Fassung ${FASSUNG} mitgeschrieben: glaswerk_v${FASSUNG}.yaml`);
console.log(`${text.length} Bytes, ${text.split("\n").length} Zeilen`);
console.log(`idempotent: ${idempotent ? "ja" : "NEIN"}`);
console.log(`Baukasten erkennt: ${Object.entries(treffer).map(([s, v]) => `${s}=${v}`).join(" ")}`);
if (!idempotent || !erkannt) process.exit(1);

// Baut die Theme "macos" - Apples Systemfarben auf Home Assistant.
//
//   node werkzeuge/macos-bauen.mjs
//
// Schreibt werkzeuge/themes/macos.yaml.
//
// Wie liquid-glass-bauen.mjs mit HATS' eigenen Funktionen gebaut: Was hier
// herauskommt, kann das Panel auch. Farben und Hintergrund kommen aus dem
// Baukasten, nicht aus dieser Datei - sonst stuenden dieselben Werte an zwei
// Orten, und der Baukasten erkaennte seine eigene Theme nicht wieder.
//
// ---------------------------------------------------------------------------
// WAS GEMESSEN IST UND WAS ENTSCHIEDEN
//
// Die FARBEN sind gemessen. werkzeuge/test/macos-farben.swift liest die
// NSColor-Werte je Erscheinungsbild aus; am 14.10.2026 an macOS 26.5.2
// gelaufen. Mehrere bekannte Werte stimmen nicht mehr - systemRed ist #ff383c
// und nicht #ff3b30, systemBlue #0088ff und nicht #007aff.
//
// RADIEN, SCHATTEN und GLAS sind ENTSCHEIDUNGEN. Apple veroeffentlicht sie
// nicht als Zahlen, und aus dem System auslesen laesst sich beides nicht:
// Die Fensterrundung steckt im Fensterserver, die Weichzeichnung in
// NSVisualEffectView, und beide haben keine oeffentliche Schnittstelle. Was
// unten steht, ist nachempfunden, nicht abgelesen - jede Zahl mit ihrem Grund.
//
// Die wichtigste Einsicht dabei: macOS holt seine Tiefe nicht aus
// verschiedenen Grautoenen, sondern aus MATERIAL. windowBackgroundColor und
// controlBackgroundColor sind im Hellen beide #ffffff - eine Karte ist dort
// kein helleres Grau, sondern eine weichgezeichnete Schicht ueber dem, was
// darunter liegt. Deshalb ist diese Theme eine Glas-Theme, und deshalb braucht
// sie einen Hintergrund.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { leseTheme, schreibeTheme, setze, vorlageAn } from "../custom_components/hats/www/theme.js";
import { VORLAGEN } from "../custom_components/hats/www/vorlagen.js";
import { PALETTEN, teilAnwenden } from "../custom_components/hats/www/baukasten.js";
import { HINTERGRUENDE, bewegung } from "../custom_components/hats/www/hintergrund.js";

const NAME = "macos";

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

// --- Farben und Hintergrund aus dem Baukasten ------------------------------
//
// Genau die beiden Teile, die ein Nutzer im Panel anklicken wuerde. Damit
// erkennt der Baukasten diese Theme spaeter wieder - und das ist nicht Kosmetik:
// Am 14.10.2026 trug liquid_glass seine Farbinseln in einer eigenen
// Schreibweise, und der Baukasten zeigte bei KEINER der zwoelf Kacheln einen
// Haken. Der Nutzer sieht dann nicht, ob er keinen Hintergrund hat oder einen,
// den das Panel nicht einordnet.
teilAnwenden("palette", PALETTEN.find((p) => p.id === "macos"), schreibe);
teilAnwenden("hintergrund", HINTERGRUENDE.find((h) => h.id === "macos"), schreibe);

// --- Rundungen -------------------------------------------------------------
//
// ENTSCHEIDUNG, nicht gemessen. macOS 26 rundet deutlich staerker als die
// Versionen davor, und die Stufen stehen zueinander im Verhaeltnis: Was
// ineinander liegt, wird nach aussen hin runder, damit die Kanten parallel
// laufen statt sich zu schneiden.
//
// Home Assistant hat dafuer eine eigene Ebene (--ha-border-radius-*), die in
// Dutzenden Bauteilen als Ausweichwert steht. Ein Wert hier verschiebt die
// halbe Oberflaeche - deshalb lohnt sie besonders.
const RUNDUNG = {
  "--ha-border-radius-sm": "6px",       // Marken, kleine Felder
  "--ha-border-radius-md": "8px",       // Eingaben, Knoepfe
  "--ha-border-radius-lg": "10px",      // Listenzeilen
  "--ha-border-radius-xl": "12px",      // Karten
  "--ha-border-radius-2xl": "16px",     // Dialoge, Bloecke
  "--ha-border-radius-3xl": "20px",
  "--ha-border-radius-4xl": "24px",
  "--ha-border-radius-5xl": "28px",
  "--ha-border-radius-6xl": "32px",
  // Apple macht in 26 vieles zur Kapsel - Knoepfe, Suchfelder, Segmente.
  "--ha-border-radius-pill": "9999px",
  "--ha-border-radius-circle": "50%",
  "--ha-border-radius-square": "0",
  "--ha-card-border-radius": "12px",
};

// --- Glas ------------------------------------------------------------------
//
// ENTSCHEIDUNG. NSVisualEffectView gibt seinen Radius nicht preis; 30 px mit
// 180 % Saettigung ist der Wert, der dem "regular"-Material am naechsten
// kommt. Die Saettigung ist dabei das Entscheidende: Ohne sie wird alles, was
// durchscheint, grau - mit ihr bleiben die Farben dahinter lebendig.
//
// Die Flaechen sind DECKENDER als bei liquid_glass (dort 0.32). Apples
// Materialien lassen den Grund ahnen, nicht lesen; bei 0.32 wuerde man den
// Hintergrund durch die Karte hindurch lesen, und das tut macOS nirgends.
const FLAECHE = {
  // Die Karte. Hell auf Apples windowBackgroundColor (#ffffff), dunkel auf
  // seinem #1e1e1e - beide gemessen, nur die Deckkraft ist gewaehlt.
  "--ha-card-background": ["rgba(255, 255, 255, 0.62)", "rgba(30, 30, 30, 0.58)"],
  "--ha-card-backdrop-filter": "blur(30px) saturate(180%)",
  // Apples Trennlinien sind Haarlinien, nicht Striche: ein halber Punkt.
  "--ha-card-border-width": "0.5px",

  // Die Seitenleiste ist bei Apple durchscheinender als der Inhalt - sie liegt
  // ueber dem Schreibtisch, nicht ueber dem Dokument.
  "--sidebar-background-color": ["rgba(246, 246, 248, 0.72)", "rgba(28, 28, 30, 0.72)"],
  "--app-header-background-color": ["rgba(255, 255, 255, 0.72)", "rgba(30, 30, 30, 0.72)"],
  // Die Titelleiste zeichnet am staerksten weich - dort rutscht der Inhalt
  // darunter durch, und nur die Unschaerfe haelt die Schrift lesbar.
  "--app-header-backdrop-filter": "blur(40px) saturate(180%)",

  // Ein Blatt ("sheet") ist bei Apple fast deckend: Es verlangt eine Antwort,
  // also soll es nicht mit dem Hintergrund verschwimmen.
  "--ha-dialog-surface-background": ["rgba(255, 255, 255, 0.86)", "rgba(38, 38, 40, 0.86)"],
  "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.32)",

  // DECKEND, und das ist Absicht: Menues und Auswahllisten lesen dieses Feld
  // und haben keinen Grund, durch den sie scheinen koennten. Beide Werte sind
  // gemessen - windowBackgroundColor hell und dunkel.
  "--card-background-color": ["#ffffff", "#1e1e1e"],
  "--primary-background-color": ["#ffffff", "#1e1e1e"],
};

// --- Schatten --------------------------------------------------------------
//
// ENTSCHEIDUNG. Ein macOS-Fenster wirft einen grossen, sehr weichen Schatten
// mit geringer Deckkraft, und darueber liegt eine Haarlinie, die die Kante
// zeichnet. Beides zusammen macht den Eindruck - der Schatten allein wirkt
// schmutzig, die Linie allein flach.
//
// Im Dunkeln ist der Schatten kraeftiger und die Linie hell: Auf dunklem Grund
// traegt nicht mehr der Schatten die Kante, sondern das Licht darauf.
const SCHATTEN = {
  "--ha-card-box-shadow": [
    "0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)",
    "0 0 0 0.5px rgba(255, 255, 255, 0.10), 0 12px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)",
  ],
  // Die Stufen, die Home Assistant selbst als Ausweichwert benutzt.
  "--ha-box-shadow-s": [
    "0 1px 2px rgba(0, 0, 0, 0.08)",
    "0 1px 2px rgba(0, 0, 0, 0.40)",
  ],
  "--ha-box-shadow-m": [
    "0 4px 12px rgba(0, 0, 0, 0.12)",
    "0 4px 14px rgba(0, 0, 0, 0.48)",
  ],
  "--ha-box-shadow-l": [
    "0 12px 32px rgba(0, 0, 0, 0.18)",
    "0 14px 40px rgba(0, 0, 0, 0.58)",
  ],
};

for (const quelle of [RUNDUNG, FLAECHE, SCHATTEN]) {
  for (const [name, wert] of Object.entries(quelle)) {
    if (Array.isArray(wert)) {
      schreibe(name, wert[0], "light");
      schreibe(name, wert[1], "dark");
    } else {
      schreibe(name, wert, "beide");
    }
  }
}

// --- Vorlagen --------------------------------------------------------------
//
// Dieselbe Auswahl wie bei liquid_glass. glas-lichtkante bleibt aus: Sie legt
// einen zweiten Saum mit festen Hell-Werten UEBER die Flaeche, und die Kante
// kommt hier schon aus --ha-card-box-shadow, je Modus.
const NICHT_AN = ["glas-lichtkante"];
for (const v of VORLAGEN) if (!NICHT_AN.includes(v.id)) vorlageAn(m, v);

// Die Farbpunkte bewegen sich, wie in liquid_glass - aber ruhiger. Apples
// Oberflaeche bewegt sich nicht von selbst; was hier laeuft, soll man erst
// bemerken, wenn man eine Weile hinsieht.
vorlageAn(m, bewegung({ drift: 0, punkte: 4, farbe: 3, weite: 40 }, { punkte: true }));

// --- Der Kopf --------------------------------------------------------------
const version = /VERSION = "([^"]+)"/.exec(
  readFileSync("custom_components/hats/const.py", "utf8"))?.[1] ?? "0.0.0";
const heute = new Date().toLocaleString("de-DE");
m.kopf = [
  `Erzeugt mit HATS ${version} am ${heute}`,
  "Grundlage: ha_blanko (HA 2026.10 ohne Altlasten)",
  "",
  "macOS. Apples Systemfarben auf Home Assistant, gebaut mit",
  "werkzeuge/macos-bauen.mjs - also mit HATS' eigenen Funktionen.",
  "",
  "Die Farben sind an macOS 26.5.2 ausgelesen, nicht abgeschrieben:",
  "werkzeuge/test/macos-farben.swift. Mehrere bekannte Werte stimmen nicht",
  "mehr - systemRed ist #ff383c und nicht #ff3b30.",
  "",
  "Rundungen, Schatten und Glas sind dagegen nachempfunden: Apple",
  "veroeffentlicht sie nicht, und aus dem System auslesen laesst sich beides",
  "nicht. Die Begruendung je Zahl steht im Build-Skript.",
];

// --- Schreiben -------------------------------------------------------------
mkdirSync("werkzeuge/themes", { recursive: true });
const text = schreibeTheme(m);
writeFileSync(`werkzeuge/themes/${NAME}.yaml`, text);

// --- Gegenprobe: zweimal durch und zurueck muss dasselbe liefern -----------
const zurueck = leseTheme(text);
const nochmal = schreibeTheme(zurueck.modell ?? zurueck);
const idempotent = text === nochmal;

console.log(`${gesetzt} Felder gesetzt, ${VORLAGEN.length - NICHT_AN.length} Vorlagen an`);
console.log(`${text.length} Bytes, ${text.split("\n").length} Zeilen`);
console.log(`idempotent: ${idempotent ? "ja" : "NEIN"}`);
if (!idempotent) process.exit(1);

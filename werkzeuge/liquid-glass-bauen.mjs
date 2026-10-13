// Baut die Theme "liquid_glass" - mit HATS' eigenen Funktionen, nicht von Hand.
//
// Der Punkt dabei: Was hier herauskommt, kann das Panel auch. Eine von Hand
// geschriebene Theme waere kein Beweis dafuer, dass der Generator es kann.
//
//   node werkzeuge/liquid-glass-bauen.mjs
//
// Schreibt werkzeuge/themes/liquid_glass.yaml. Von dort holt die Sync-Schleife
// sie nach /config/themes.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { leseTheme, schreibeTheme, setze, vorlageAn } from "../custom_components/hats/www/theme.js";
import { VORLAGEN } from "../custom_components/hats/www/vorlagen.js";

const NAME = "liquid_glass";

// --- Die Grundlage: ha_blanko, also HA 2026.10 ohne Altlasten --------------
const roh = readFileSync("docs/beispiele/ha-blanko.yaml", "utf8");
const gelesen = leseTheme(roh);
const m = gelesen.modell ?? gelesen;
m.name = NAME;

// --- Was Liquid Glass ausmacht ---------------------------------------------
//
// Drei Dinge, und das erste wird am haeufigsten vergessen:
//
// 1. OHNE HINTERGRUND KEIN GLAS. Eine durchscheinende Flaeche vor einer
//    einfarbigen Wand sieht aus wie eine etwas hellere einfarbige Wand. Es
//    braucht etwas dahinter, das sich veraendert - hier ein weicher Verlauf
//    aus drei Farbinseln, wie in den Vorlagen aus der Vorlage.
// 2. Die Flaeche selbst muss DUENN sein. Ueber 0.5 Alpha wirkt sie wie
//    Milchglas, unter 0.3 verschwindet der Inhalt im Hintergrund.
// 3. Saettigung in der Weichzeichnung. Ohne saturate() wird das, was
//    durchscheint, grau - mit 170 % bleiben die Farben dahinter lebendig.
const W = {
  // --- Hintergrund ---
  "--lovelace-background": [
    // Kraeftige Farbinseln, nicht blasse. Der erste Anlauf hatte #cfe3ff auf
    // #eef4ff - zwei Toene, die sich um weniger als zehn Prozent Helligkeit
    // unterscheiden. Eine 42-%-Glasflaeche davor ergab: fast weiss vor fast
    // weiss. Man sah, dass etwas anders war, aber nicht, dass es Glas ist.
    //
    // Glas wird dort sichtbar, wo es eine KANTE bricht. Je staerker der
    // Hintergrund sich ueber die Flaeche einer Karte veraendert, desto
    // deutlicher ist der Effekt - deshalb mehrere Farbinseln statt eines
    // durchgehenden Verlaufs.
    "radial-gradient(900px 620px at 8% 4%, #7db5ff 0%, rgba(125,181,255,0) 55%), " +
    "radial-gradient(820px 560px at 92% 12%, #ff9ec7 0%, rgba(255,158,199,0) 52%), " +
    "radial-gradient(760px 700px at 72% 86%, #5ee0d0 0%, rgba(94,224,208,0) 54%), " +
    "radial-gradient(700px 520px at 22% 78%, #c08cff 0%, rgba(192,140,255,0) 52%), " +
    "linear-gradient(155deg, #e6eeff 0%, #f3ecff 50%, #e3fbf6 100%)",
    "radial-gradient(900px 620px at 8% 4%, #1f4d9e 0%, rgba(31,77,158,0) 55%), " +
    "radial-gradient(820px 560px at 92% 12%, #7a2a5c 0%, rgba(122,42,92,0) 52%), " +
    "radial-gradient(760px 700px at 72% 86%, #0d6b63 0%, rgba(13,107,99,0) 54%), " +
    "radial-gradient(700px 520px at 22% 78%, #4b2a86 0%, rgba(75,42,134,0) 52%), " +
    "linear-gradient(155deg, #0b1020 0%, #140d26 50%, #07201f 100%)",
  ],

  // --- Karten ---
  // 0.32 statt 0.42: Je weniger Eigenfarbe die Flaeche hat, desto mehr vom
  // Hintergrund kommt durch - und genau das ist der Effekt. Unter etwa 0.25
  // kippt es, dann verliert der Text seinen Grund.
  "--ha-card-background": ["rgba(255, 255, 255, 0.32)", "rgba(22, 28, 46, 0.38)"],
  "--ha-card-backdrop-filter": "blur(26px) saturate(190%)",
  "--ha-card-border-radius": "24px",
  "--ha-card-border-width": "0",
  // Zwei Schatten in einem Wert: der weiche grosse traegt die Karte, der
  // schmale dunkle direkt darunter gibt ihr eine Kante gegen den Hintergrund.
  // Ohne den zweiten schwimmt die Karte, ohne den ersten klebt sie.
  "--ha-card-box-shadow": [
    "0 18px 46px rgba(22, 40, 78, .16), 0 2px 6px rgba(22, 40, 78, .08)",
    "0 20px 52px rgba(0, 0, 0, .5), 0 2px 6px rgba(0, 0, 0, .3)",
  ],

  // --- Dialoge ---
  "--ha-dialog-surface-background": ["rgba(255, 255, 255, 0.86)", "rgba(26, 31, 48, 0.9)"],
  "--mdc-dialog-scrim-color": ["rgba(16, 24, 44, 0.32)", "rgba(0, 0, 0, 0.52)"],

  // --- Leisten ---
  "--sidebar-background-color": ["rgba(255, 255, 255, 0.4)", "rgba(20, 25, 40, 0.42)"],
  "--app-header-background-color": ["rgba(255, 255, 255, 0.3)", "rgba(20, 25, 40, 0.34)"],
  "--app-header-backdrop-filter": "blur(22px) saturate(170%)",

  // --- Farben ---
  // Der Akzent ist das Violett aus der Vorlage. Im Dunkeln eine Stufe heller:
  // Blau und Violett haben die geringste Wahrnehmungshelligkeit aller
  // Farbtoene, und derselbe Ton waere auf dunklem Grund kaum noch zu sehen.
  "--accent-color": ["#6f5cf0", "#8f7dff"],
  // --primary-color steht hier bewusst NICHT.
  //
  // HATS fuehrt es nicht als Feld - es gehoert zur alten Farbebene, und HATS
  // setzt auf --ha-color-*. Ein Feld in die Datei zu schreiben, das das Panel
  // nicht anbietet, ist die schlimmere Sorte Fehler: Es wirkt, aber niemand
  // bekommt es je wieder heraus oder kann es aendern. Der Bericht nannte es
  // zu Recht "kennt HATS nicht".
  //
  // Wenn sich zeigt, dass Karten es brauchen, gehoert es in die Feldliste -
  // nicht hierher.
  "--primary-text-color": ["#17203a", "#eef1f8"],
  "--secondary-text-color": ["#5a6480", "#a8b2c8"],
  "--divider-color": ["rgba(23, 32, 58, 0.1)", "rgba(255, 255, 255, 0.12)"],
  "--card-background-color": ["#ffffff", "#1c2234"],
};

let gesetzt = 0;
for (const [name, wert] of Object.entries(W)) {
  const k = name.replace(/^--/, "");
  if (Array.isArray(wert)) {
    setze(m, k, wert[0], "light");
    setze(m, k, wert[1], "dark");
  } else {
    setze(m, k, wert, "beide");
  }
  gesetzt++;
}

// --- Alle Vorlagen an ------------------------------------------------------
for (const v of VORLAGEN) vorlageAn(m, v);

// --- Der Kopf -------------------------------------------------------------
//
// Ohne ihn gilt die Datei dem Panel als "fremd": ws_list_themes meldet
// hats: false, und die Datei landet in der Liste der Themes, die man nur
// LESEN kann. Gemessen am 13.10.2026 - die erste Fassung hatte den Kopf von
// ha-blanko geerbt und war in HATS nicht als eigene Theme zu oeffnen.
//
// Die Versionsnummer kommt aus const.py, nicht aus einer Kopie hier. Sie steht
// an vier Stellen und muss ueberall gleich sein; eine fuenfte waere eine zu
// viel.
const version = /VERSION = "([^"]+)"/.exec(
  readFileSync("custom_components/hats/const.py", "utf8"))?.[1] ?? "0.0.0";
const heute = new Date().toLocaleString("de-DE");
m.kopf = [
  `Erzeugt mit HATS ${version} am ${heute}`,
  "Grundlage: ha_blanko (HA 2026.10 ohne Altlasten)",
  "",
  "Liquid Glass. Gebaut mit werkzeuge/liquid-glass-bauen.mjs, also mit HATS'",
  "eigenen Funktionen - was hier herauskommt, kann das Panel auch.",
  "",
  "Ohne Hintergrund kein Glas: Eine durchscheinende Flaeche vor einer",
  "einfarbigen Wand sieht aus wie eine etwas hellere einfarbige Wand. Der",
  "lovelace-background traegt deshalb vier Farbinseln, nicht einen Verlauf.",
];

// --- Schreiben -------------------------------------------------------------
mkdirSync("werkzeuge/themes", { recursive: true });
const text = schreibeTheme(m);
writeFileSync(`werkzeuge/themes/${NAME}.yaml`, text);

// --- Gegenprobe: zweimal durch und zurueck muss dasselbe liefern -----------
const zurueck = leseTheme(text);
const nochmal = schreibeTheme(zurueck.modell ?? zurueck);
const idempotent = text === nochmal;

console.log(`${gesetzt} Felder gesetzt, ${VORLAGEN.length} Vorlagen an`);
console.log(`${text.length} Bytes, ${text.split("\n").length} Zeilen`);
console.log(`idempotent: ${idempotent ? "ja" : "NEIN - der zweite Durchlauf aendert etwas"}`);
if (!idempotent) process.exit(1);

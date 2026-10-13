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
import { HINTERGRUENDE } from "../custom_components/hats/www/hintergrund.js";

// Der Hintergrund kommt aus dem Baukasten, nicht aus dieser Datei.
//
// Am 14.10.2026 beim Durchgehen aufgefallen: liquid_glass trug die Farbinseln
// in der alten Schreibweise, und seit dem Umbau auf einzeln bewegliche Punkte
// ist das ein anderer Wert. Der Baukasten zeigte daraufhin bei KEINER der
// zwoelf Kacheln einen Haken - auch bei "Keiner" nicht. Der Nutzer sieht dann
// nicht, ob er keinen Hintergrund hat oder einen, den das Panel nicht
// einordnet.
//
// Zwei Orte fuer dieselben vier Farben waren von Anfang an einer zu viel.
const INSELN = HINTERGRUENDE.find((h) => h.id === "inseln");

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
    //
    // Am Ende der Werte steht " fixed". Das eine Wort entscheidet, wo die
    // Flaeche haengt - Home Assistant liest es selbst:
    //
    //   _isFixedBackground(e) { return "string" == typeof e
    //     ? e.split(" ").includes("fixed") : ... }
    //
    // Am 13.10.2026 ueber HAs eigenen Weg gemessen (_applyTheme() am Bauteil):
    //
    //   ohne   hui-view-background  position: absolute   658 x 2557  ab x=256
    //   mit    hui-view-background  position: fixed      914 x  863  ab x=0
    //
    // Ohne das Wort faengt der Hintergrund erst rechts von der Seitenleiste
    // an, und die zeigt dann HAs flaches #111111 statt der Theme. Mit dem Wort
    // laeuft er unter ihr durch. Zweitens sassen zwei der vier Farbinseln
    // vorher unter dem ersten Bildschirm, weil die Flaeche so hoch war wie der
    // Inhalt. Das Wort steht im Baukasten-Teil, nicht hier.
    INSELN.light["--lovelace-background"],
    INSELN.dark["--lovelace-background"],
  ],

  // --- Karten ---
  // 0.32 statt 0.42: Je weniger Eigenfarbe die Flaeche hat, desto mehr vom
  // Hintergrund kommt durch - und genau das ist der Effekt. Unter etwa 0.25
  // kippt es, dann verliert der Text seinen Grund.
  "--ha-card-background": ["rgba(255, 255, 255, 0.42)", "rgba(22, 28, 46, 0.46)"],
  "--ha-card-backdrop-filter": "blur(26px) saturate(180%)",
  "--ha-card-border-radius": "20px",
  "--ha-card-border-width": "0",

  // VIER Schatten in einem Wert, und die Reihenfolge ist keine Geschmacksfrage:
  // zwei innere Kanten, dann zwei aeussere.
  //
  //   inset oben    die Lichtkante - laesst die Flaeche nach vorn treten
  //   inset unten   die Abschlusskante nach hinten
  //   aussen gross  traegt die Karte
  //   aussen klein  setzt sie gegen den Hintergrund ab
  //
  // DIE KANTEN GEHOEREN HIERHER, NICHT IN DIE VORLAGE. Ein uix-Feld gilt fuer
  // Hell und Dunkel zugleich; eine Kante in rgba(255,255,255,.72) ist im
  // Hellen richtig und im Dunkeln ein greller Strich. Am 13.10.2026 gemeldet:
  // "kannst du den karten im dunkelmodus die selbe farbe rahmen schatten und
  // alles was dazu gehoert von der werkbank geben". Die Vorlage liest
  // var(--ha-card-box-shadow) und bekommt damit je Modus die richtigen Werte.
  //
  // Die Zahlen sind die der Projektwerkbank, damit beide Oberflaechen
  // dieselbe Sprache sprechen (--kante-hell, --kante-dunkel, --schatten).
  "--ha-card-box-shadow": [
    "inset 0 1.5px 0 0 rgba(255, 255, 255, .72), " +
    "inset 0 -1.5px 0 0 rgba(10, 20, 45, .1), " +
    "0 18px 46px rgba(22, 40, 78, .16), 0 2px 6px rgba(22, 40, 78, .08)",

    "inset 0 1.5px 0 0 rgba(255, 255, 255, .16), " +
    "inset 0 -1.5px 0 0 rgba(0, 0, 0, .35), " +
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
  // #6350e4 statt des naheliegenden #6f5cf0: Letzteres kommt auf der hellen
  // Kartenflaeche nur auf 4.23 : 1 und verfehlt damit WCAG AA (4.5) fuer Text.
  // Am 13.10.2026 an der gerenderten Karte gemessen, nicht gerechnet - die
  // Flaeche ist durchscheinend, der Kontrast haengt also davon ab, was
  // dahinter liegt. Im Dunkeln ist derselbe Ton zu dunkel; dort eine Stufe
  // heller, weil Violett die geringste Wahrnehmungshelligkeit aller Farbtoene
  // hat und auf dunklem Grund sonst verschwindet.
  "--accent-color": ["#6350e4", "#8f7dff"],
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
// Nicht jede Vorlage gehoert in diese Theme.
//
// glas-lichtkante legt einen zweiten Saum als ::before UEBER die Flaeche, mit
// festen Werten - oben rgba(255,255,255,.72), dazu zwei helle Verlaufsbaender.
// Im Hellen ist das der Glaseindruck; im Dunkeln ist es ein greller Rahmen.
//
// Der Haken ist nicht die Vorlage, sondern dass ein uix-Feld fuer Hell UND
// Dunkel zugleich gilt. Modusabhaengige Werte muessen ueber ein Theme-Feld
// laufen, und fuer einen Glas-Saum gibt es bei Home Assistant keinen Namen -
// ein eigener waere ein Feld, das HATS nicht anbietet, und damit genau die
// Sorte Fehler, die oben beschrieben steht.
//
// Am 13.10.2026 gemeldet: "schau mal bei licht aus. bubble passt aber die
// anderen beiden haben noch die weise kante" - und auf Nachfrage: "nein das
// von bubble ist die richtige, die anderen sehen falsch aus". Bubble war
// ausgenommen (:host(.type-custom-bubble-card) ha-card::before) und sah
// deshalb als Einziges richtig aus.
//
// Die Kanten aus --ha-card-box-shadow leisten dasselbe und sind je Modus
// gesetzt. Die Vorlage bleibt im Panel waehlbar, nur nicht mehr in dieser
// Theme.
const NICHT_AN = ["glas-lichtkante"];
for (const v of VORLAGEN) if (!NICHT_AN.includes(v.id)) vorlageAn(m, v);

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

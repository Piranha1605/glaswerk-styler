// Der volle Durchlauf: alle Felder setzen, schreiben, zurueckleben, vergleichen.
//
// Die anderen Tests pruefen Teile. Dieser nimmt JEDES Feld, das die
// Oberflaeche anbietet, schreibt es ins Modell, erzeugt die Datei, liest sie
// wieder ein und vergleicht. Was dabei auffaellt, faellt sonst erst beim
// Nutzer auf - und zwar an einem einzelnen Feld, das niemand gezielt testet.
//
// Dazu die Idempotenz: Ab dem ZWEITEN Durchlauf darf sich nichts mehr aendern.
// Der erste darf normieren.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { leseTheme, schreibeTheme, setze, wirksam, teileAuf } from "../custom_components/glaswerk/www/theme.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");
const blanko = readFileSync(path.join(hier, "../docs/beispiele/ha-blanko.yaml"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// --- Die Felder aus STUFEN lesen -------------------------------------------
const block = panel.slice(panel.indexOf("const STUFEN = ["), panel.indexOf("const STAND_TEXT"));
// \s* zwischen den Teilen, nicht ein festes Leerzeichen: Fuenf Felder sind
// zur Ausrichtung mit mehreren Leerzeichen geschrieben, und ohne das blieben
// sie unerfasst - der Test haette gruen gemeldet und sie nie angefasst.
const felder = [...block.matchAll(/\{\s*t:\s*"([^"]+)",\s*art:\s*"([a-z]+)"[^}]*?v:\s*"--([a-z0-9-]+)"[^}]*?ebene:\s*"([a-z]+)"/g)]
  .map((m) => ({ t: m[1], art: m[2], v: m[3], ebene: m[4] }));

// Gegenprobe gegen genau diese Blindheit: Jedes v im Quelltext muss erfasst
// sein. Sonst prueft der Durchlauf weniger, als er zu pruefen vorgibt.
{
  const alle = new Set([...block.matchAll(/v: "--([a-z0-9-]+)"/g)].map((m) => m[1]));
  const erfasst = new Set(felder.map((f) => f.v));
  const fehlen = [...alle].filter((k) => !erfasst.has(k));
  assert.deepStrictEqual(fehlen, [], `${fehlen.length} Felder werden vom Durchlauf nicht erfasst: ${fehlen.slice(0, 8)}`);
}

pruefe("Es gibt genug Felder, um etwas auszusagen", () => {
  assert.ok(felder.length > 350, `nur ${felder.length} Felder gelesen - der Test prueft zu wenig`);
});

// --- Ein Wert je Art, der zur Art passt ------------------------------------
const WERT = {
  farbe: "#3f8ecc",
  mass: "12px",
  zahl: "1.25",
  text: "irgendwas",
  auswahl: "egal",
  bericht: null,
};
const probeWert = (f) => WERT[f.art] ?? "irgendwas";

pruefe("Jedes Feld ueberlebt schreiben und wieder einlesen", () => {
  const m = { name: "durchlauf", flach: {}, light: {}, dark: {}, kopf: ["Testlauf"], unklar: [] };
  const erwartet = {};
  for (const f of felder) {
    const w = probeWert(f);
    if (w === null) continue;               // Berichtsfelder stehen nicht im Theme
    setze(m, f.v, w, f.ebene === "getrennt" ? "light" : "beide");
    erwartet[f.v] = w;
  }
  const yaml = schreibeTheme(m);
  const zurueck = leseTheme(yaml);
  assert.ok(!zurueck.fehler, `Die erzeugte Datei liess sich nicht lesen: ${zurueck.fehler}`);

  const sicht = wirksam(zurueck, "light");
  const verloren = Object.keys(erwartet).filter((k) => sicht[k] !== erwartet[k]);
  assert.deepStrictEqual(verloren, [], `${verloren.length} Felder kamen nicht zurueck: ${verloren.slice(0, 8)}`);
});

pruefe("Ab dem zweiten Durchlauf aendert sich nichts mehr", () => {
  // Der erste Durchlauf darf normieren - sortieren, Leeres weglassen. Ab dem
  // zweiten muss die Datei stehen. In HATG lief ein Fehler lange mit, der pro
  // Durchlauf 1027 Zeichen anhaengte.
  const m = { name: "durchlauf", flach: {}, light: {}, dark: {}, kopf: ["Testlauf"], unklar: [] };
  for (const f of felder) {
    const w = probeWert(f);
    if (w !== null) setze(m, f.v, w, f.ebene === "getrennt" ? "light" : "beide");
  }
  const eins = schreibeTheme(m);
  const zwei = schreibeTheme(leseTheme(eins));
  const drei = schreibeTheme(leseTheme(zwei));
  assert.strictEqual(zwei, drei, "Der dritte Durchlauf liefert etwas anderes als der zweite");
  assert.ok(zwei.length > 2000, "Die Datei ist verdaechtig klein");
});

pruefe("Ein aufgeteiltes Feld ueberlebt den Durchlauf getrennt", () => {
  const m = { name: "d", flach: { "accent-color": "#8fd92a" }, light: {}, dark: {}, kopf: [], unklar: [] };
  teileAuf(m, "accent-color");
  setze(m, "accent-color", "#e85d9a", "dark");
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(wirksam(zurueck, "light")["accent-color"], "#8fd92a");
  assert.strictEqual(wirksam(zurueck, "dark")["accent-color"], "#e85d9a");
});

pruefe("Die Grundlage selbst laeuft sauber durch", () => {
  // Nicht nur erfundene Werte: die echte Datei, mit ihren var()-Ketten,
  // rgba()-Werten und mehrzeiligen Schatten.
  const m = leseTheme(blanko);
  assert.ok(!m.fehler, `ha-blanko liess sich nicht lesen: ${m.fehler}`);
  const eins = schreibeTheme(m);
  const zwei = schreibeTheme(leseTheme(eins));
  assert.strictEqual(eins, zwei, "Die Grundlage aendert sich beim zweiten Durchlauf");

  const a = wirksam(m, "dark");
  const b = wirksam(leseTheme(eins), "dark");
  const anders = Object.keys(a).filter((k) => a[k] !== b[k]);
  assert.deepStrictEqual(anders, [], `${anders.length} Werte haben sich veraendert: ${anders.slice(0, 8)}`);
});

pruefe("Werte mit Anfuehrungszeichen und Backslash ueberleben", () => {
  // Der schwerste Ausfall, den dieses Werkzeug ausloesen kann: Eine ungueltige
  // Fluchtfolge schickt Home Assistant beim naechsten Start in den
  // Wiederherstellungsmodus. Nicht das Feld faellt aus, sondern die Datei.
  const heikel = [
    'ha-card::before { content: "\\201C"; }',
    'url("/local/bild.png")',
    "endet mit backslash \\",
    "beides \" und \\ zusammen",
  ];
  const m = { name: "d", flach: {}, light: {}, dark: {}, kopf: [], unklar: [] };
  heikel.forEach((w, i) => setze(m, `feld-${i}`, w, "beide"));
  const zurueck = leseTheme(schreibeTheme(m));
  heikel.forEach((w, i) => assert.strictEqual(zurueck.flach[`feld-${i}`], w, `feld-${i} kam veraendert zurueck`));
});

pruefe("Jede Gruppe hat eine Beschreibung", () => {
  // Eine Gruppe ohne Beschreibung ist eine Ueberschrift ohne Aussage - und bei
  // 50 Gruppen faellt genau das nicht auf.
  const zb = panel.slice(panel.indexOf("const ZWECK = {"), panel.indexOf("const ANSICHTEN"));
  const zweck = new Set([...zb.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]));
  const gruppen = [...block.matchAll(/\{ name: "([^"]+)", felder: \[/g)].map((m) => m[1]);
  assert.ok(gruppen.length > 40, `nur ${gruppen.length} Gruppen gefunden`);
  const ohne = [...new Set(gruppen.filter((g) => !zweck.has(g)))];
  assert.deepStrictEqual(ohne, [], `ohne Beschreibung: ${ohne}`);
});

pruefe("Kein Gruppenname kommt in einer Stufe zweimal vor", () => {
  // ZWECK haengt am Namen: Zwei gleichnamige Gruppen teilen sich eine
  // Beschreibung, und der Nutzer sieht zweimal denselben Titel. Am 12.10.2026
  // standen so fuenf Gruppen doppelt, weil der Generator angelegt hat, was es
  // schon gab.
  const stufen = block.split(/\{ n: \d+, titel:/).slice(1);
  assert.strictEqual(stufen.length, 8, `${stufen.length} Stufen gefunden, erwartet 8`);
  for (const [i, st] of stufen.entries()) {
    const gr = [...st.matchAll(/\{ name: "([^"]+)", felder: \[/g)].map((m) => m[1]);
    const doppelt = [...new Set(gr.filter((g, j) => gr.indexOf(g) !== j))];
    assert.deepStrictEqual(doppelt, [], `Stufe ${i + 1}: ${doppelt}`);
  }
});

console.log(`\n${n} Pruefungen`);
if (n < 8) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

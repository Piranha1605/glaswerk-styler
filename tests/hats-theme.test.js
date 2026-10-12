// Das Theme-Modell. Jede Pruefung hat eine Gegenprobe - "Ballast fliegt" sagt
// nichts, solange niemand prueft, ob NUR Ballast fliegt.

import assert from "node:assert";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  quote, leeresModell, leseTheme, schreibeTheme, wirksam, setze, entferne, gibtTripel,
} from "../custom_components/hats/www/theme.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Der Backslash wird VOR dem Anfuehrungszeichen verdoppelt", () => {
  // \2 ist keine gueltige Fluchtfolge. Wer nur das Anfuehrungszeichen
  // maskiert, erzeugt eine Datei, die PyYAML - und damit Home Assistant -
  // nicht mehr liest. Das kostet nicht ein Feld, sondern die ganze Datei.
  assert.strictEqual(quote('content: "\\201C"'), '"content: \\"\\\\201C\\""');
  assert.strictEqual(quote("endet mit\\"), '"endet mit\\\\"');
  // Gegenprobe: ohne Sonderzeichen bleibt der Wert unveraendert
  assert.strictEqual(quote("#ff9800"), '"#ff9800"');
});

pruefe("Ein leeres Feld wird nicht geschrieben, ein gefuelltes schon", () => {
  const m = leeresModell("probe");
  m.flach = { leer: "", undef: undefined, gefuellt: "#fff" };
  const aus = schreibeTheme(m);
  assert.ok(!/leer:/.test(aus), "leeres Feld steht in der Ausgabe");
  assert.ok(!/undef:/.test(aus), "undefiniertes Feld steht in der Ausgabe");
  assert.ok(/gefuellt: "#fff"/.test(aus), "gefuelltes Feld fehlt - der Test sagt sonst nichts");
});

pruefe("Lesen und Schreiben ist ab dem zweiten Durchlauf stabil", () => {
  const eins = schreibeTheme(Object.assign(leeresModell("t"), {
    flach: { b: "2", a: "1" }, light: { c: "hell" }, dark: { c: "dunkel" },
  }));
  const zwei = schreibeTheme(leseTheme(eins));
  const drei = schreibeTheme(leseTheme(zwei));
  assert.strictEqual(zwei, drei, "zweiter und dritter Durchlauf unterscheiden sich");
  assert.strictEqual(eins, zwei, "schon der erste Durchlauf ist nicht stabil");
});

pruefe("Ein Wert mit Backslash ueberlebt den Durchlauf wortgetreu", () => {
  const m = leeresModell("t");
  m.flach = { x: 'ha-card::before { content: "\\201C"; }' };
  const gelesen = leseTheme(schreibeTheme(m));
  assert.strictEqual(gelesen.flach.x, m.flach.x);
});

pruefe("wirksam: der Modus sticht die flache Ebene", () => {
  const m = Object.assign(leeresModell("t"), {
    flach: { a: "flach", b: "nur flach" }, light: { a: "hell" }, dark: { a: "dunkel" },
  });
  assert.strictEqual(wirksam(m, "light").a, "hell");
  assert.strictEqual(wirksam(m, "dark").a, "dunkel");
  assert.strictEqual(wirksam(m, "light").b, "nur flach");
});

pruefe("setze auf beide raeumt die Modus-Eintraege weg", () => {
  // Sonst gewinnt der Modus, und die Aenderung kommt nicht an - sichtbar
  // waere nur, dass nichts passiert.
  const m = Object.assign(leeresModell("t"), { light: { a: "alt" }, dark: { a: "alt" } });
  setze(m, "a", "neu", "beide");
  assert.strictEqual(m.flach.a, "neu");
  assert.strictEqual(wirksam(m, "light").a, "neu");
  assert.strictEqual(wirksam(m, "dark").a, "neu");
});

pruefe("setze je Modus raeumt die flache Ebene weg", () => {
  const m = Object.assign(leeresModell("t"), { flach: { a: "beide" } });
  setze(m, "a", "nur hell", "light");
  assert.strictEqual(m.flach.a, undefined);
  assert.strictEqual(wirksam(m, "light").a, "nur hell");
  assert.strictEqual(wirksam(m, "dark").a, undefined);
});

pruefe("entferne loescht auf allen drei Ebenen", () => {
  const m = Object.assign(leeresModell("t"), { flach: { a: "1" }, light: { a: "2" }, dark: { a: "3" } });
  entferne(m, "a");
  assert.deepStrictEqual([m.flach.a, m.light.a, m.dark.a], [undefined, undefined, undefined]);
});

pruefe("Tripel entstehen nur aus Werten mit #", () => {
  // Home Assistant leitet --rgb-<name> nur daraus ab. Mushroom baut seine
  // Zustandsfarben aus genau diesen Tripeln.
  assert.strictEqual(gibtTripel("#ff9800"), true);
  assert.strictEqual(gibtTripel("rgba(255, 152, 0, 1)"), false);
  assert.strictEqual(gibtTripel("orange"), false);
  assert.strictEqual(gibtTripel("var(--x)"), false);
});

pruefe("Unverstandene Zeilen werden gemeldet, nicht verschluckt", () => {
  const r = leseTheme('t:\n  a: "1"\n  liste:\n    - eins\n');
  assert.ok(r.unklar.length >= 1, "die Listenzeile wurde stillschweigend verworfen");
  assert.strictEqual(r.flach.a, "1");
  // Gegenprobe: eine saubere Datei meldet nichts
  assert.strictEqual(leseTheme('t:\n  a: "1"\n').unklar.length, 0);
});

pruefe("Ohne Theme-Namen gibt es einen Fehler statt eines leeren Modells", () => {
  assert.ok(leseTheme("  a: 1\n").fehler);
});

assert.ok(n >= 11, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);

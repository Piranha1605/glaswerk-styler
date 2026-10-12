// Die Zuordnung von Bubble Card und Mushroom auf HAs Farbebene.

import assert from "node:assert";
import { ZUORDNUNG, BUBBLE, MUSHROOM, TOENE, ANZAHL } from "../custom_components/hats/www/zuordnung.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Umfang stimmt mit der gemessenen Erhebung", () => {
  assert.strictEqual(ANZAHL.bubble, 68);
  assert.strictEqual(ANZAHL.mushroom, 72);
  assert.strictEqual(ANZAHL.toene, 19);
  assert.strictEqual(Object.keys(ZUORDNUNG).length, 159);
});

pruefe("Bubble und Mushroom bekommen Verweise, keine Farben", () => {
  // Ein Verweis gilt in beiden Modi zugleich - das ist der ganze Gewinn.
  // Eine feste Farbe muesste je Modus doppelt stehen und liefe auseinander.
  for (const [k, v] of [...Object.entries(BUBBLE), ...Object.entries(MUSHROOM)])
    assert.match(v, /^var\(--/, `${k} = ${v} ist kein Verweis`);
});

pruefe("Die klassischen Toene sind Hex, keine Verweise", () => {
  // Home Assistant leitet --rgb-<name> NUR aus Werten ab, die mit # beginnen.
  // Stuende hier ein var(), gaebe es kein Tripel - und Mushroom baut seine
  // Zustandsfarben aus genau diesen Tripeln.
  for (const [k, v] of Object.entries(TOENE))
    assert.match(v, /^#[0-9a-f]{6}$/i, `${k} = ${v} liefert kein Tripel`);
});

pruefe("Mushrooms Tripelfelder zeigen auf rgb-Namen, nicht auf Farben", () => {
  // rgb(var(--mush-rgb-red)) braucht Zahlen. Ein var(--ha-color-red-60) waere
  // ein Hexwert und die Regel ungueltig - die Farbe fiele stumm aus.
  for (const [k, v] of Object.entries(MUSHROOM)) {
    if (!k.startsWith("mush-rgb-")) continue;
    assert.match(v, /^var\(--rgb-/, `${k} = ${v} zeigt nicht auf ein Tripel`);
  }
});

pruefe("Jeder Verweis zeigt auf einen Namen, den wir kennen", () => {
  const erlaubt = /^var\(--(ha-color-|ha-card-|ha-dialog-|ha-border-|ha-box-shadow-|ha-space-|ha-font-|ha-line-height-|rgb-|accent-color|light-blue-color|amber-color)/;
  for (const [k, v] of [...Object.entries(BUBBLE), ...Object.entries(MUSHROOM)])
    assert.match(v, erlaubt, `${k} zeigt auf etwas Unbekanntes: ${v}`);
});

pruefe("Kein Eintrag zeigt auf sich selbst", () => {
  for (const [k, v] of Object.entries(ZUORDNUNG))
    assert.ok(!v.includes(`--${k}`), `${k} verweist auf sich selbst`);
});

pruefe("Die Toene decken ab, was Mushroom an Farbtoenen braucht", () => {
  // HAs neue Ebene hat nur fuenf Toene. Alles, was Mushroom darueber hinaus
  // liest, muss aus der klassischen Ebene kommen - sonst faellt es aus.
  const gebraucht = Object.entries(MUSHROOM)
    .filter(([k, v]) => k.startsWith("mush-rgb-") && /var\(--rgb-[a-z-]+-color\)/.test(v))
    .map(([, v]) => v.replace(/var\(--rgb-(.+)\)/, "$1"));
  for (const ton of gebraucht)
    assert.ok(TOENE[ton], `${ton} wird gebraucht, steht aber nicht im Tonblock`);
  assert.ok(gebraucht.length >= 10, `nur ${gebraucht.length} Toene geprueft`);
});

assert.ok(n >= 7, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);

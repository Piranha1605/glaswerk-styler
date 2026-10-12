// Der Baukasten der Bedienelemente. Geprueft wird das erzeugte HTML - ohne
// Browser, damit es in der CI mitlaufen kann.

import assert from "node:assert";
import { regler, farbe, segmente, schalter, textfeld, fuerFeld, zuruecksetzen }
  from "../custom_components/hats/www/bedienelemente.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Jedes Element traegt einen Zurueck-Knopf", () => {
  // Zuruecksetzen heisst Feld leeren, und leer ist der Zustand, in dem Home
  // Assistant selbst entscheidet. Ohne diesen Knopf kommt man da nie wieder
  // hin - das ist die wichtigste Handlung, nicht die unwichtigste.
  for (const html of [
    regler({ id: "a", wert: 5 }),
    farbe({ id: "b", wert: "#ff9800" }),
    segmente({ id: "c", wert: "x", optionen: [{ wert: "x", name: "X" }] }),
    textfeld({ id: "d", wert: "hallo" }),
  ]) assert.match(html, /data-be-reset=/, `fehlt in: ${html.slice(0, 40)}`);
});

pruefe("Der Regler uebernimmt Grenzen, Schritt und Einheit", () => {
  const h = regler({ id: "r", wert: 12, min: 0, max: 48, schritt: 2, einheit: "px" });
  assert.match(h, /min="0"/); assert.match(h, /max="48"/);
  assert.match(h, /step="2"/); assert.match(h, /value="12"/);
  assert.match(h, />12px</);
});

pruefe("Ein Wert ausserhalb der Zahlen faellt auf das Minimum", () => {
  assert.match(regler({ id: "r", wert: "keine Zahl", min: 4 }), /value="4"/);
});

pruefe("Die Farbbahn zeigt den Verlauf, der Waehler den Wert", () => {
  const h = farbe({ id: "f", wert: "#ff9800", bahn: ["#000", "#ff9800", "#fff"] });
  assert.match(h, /linear-gradient\(90deg, #000, #ff9800, #fff\)/);
  assert.match(h, /type="color"[^>]*value="#ff9800"/);
});

pruefe("Ein nicht gesetzter Wert wird als solcher gezeigt, nicht erfunden", () => {
  const h = farbe({ id: "f", wert: "" });
  assert.match(h, /nicht gesetzt/);
  // Gegenprobe: ein gesetzter Wert steht da auch wirklich
  assert.match(farbe({ id: "f", wert: "#abcdef" }), />#abcdef</);
});

pruefe("Segmente markieren genau die gewaehlte Option", () => {
  const h = segmente({ id: "s", wert: "b", optionen: [
    { wert: "a", name: "A" }, { wert: "b", name: "B" }, { wert: "c", name: "C" }] });
  assert.strictEqual((h.match(/class="an"/g) || []).length, 1);
  assert.match(h, /data-wert="b" class="an"/);
});

pruefe("Der Schalter ist zwei Segmente", () => {
  assert.match(schalter({ id: "x", an: true }), /data-wert="an" class="an"/);
  assert.match(schalter({ id: "x", an: false }), /data-wert="aus" class="an"/);
});

pruefe("fuerFeld waehlt nach Art, Unbekanntes wird ein Textfeld", () => {
  assert.match(fuerFeld({ art: "farbe", v: "--x" }, "#fff"), /be-farbe/);
  assert.match(fuerFeld({ art: "mass", v: "--y" }, "8px"), /be-regler/);
  assert.match(fuerFeld({ art: "auswahl", v: "--z", optionen: [{ wert: "a", name: "A" }] }, "a"), /be-segmente/);
  assert.match(fuerFeld({ art: "schalter", v: "--s" }, "an"), /be-segmente/);
  assert.match(fuerFeld({ t: "Name" }, "x"), /be-text/);
});

pruefe("Die Art mass liest die Einheit aus dem Wert heraus", () => {
  assert.match(fuerFeld({ art: "mass", v: "--r", max: 40 }, "12px"), /value="12"/);
});

pruefe("HTML in Werten wird maskiert", () => {
  const h = textfeld({ id: "t", wert: '"><script>alert(1)</script>' });
  assert.ok(!h.includes("<script>"), "ungefiltertes HTML im Attribut");
  assert.match(h, /&quot;/);
});

assert.ok(n >= 10, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);

// --- Nachtrag: der Alpha-Regler ---
import { hexTeilen, hexFuegen } from "../custom_components/hats/www/bedienelemente.js";

pruefe("Alpha wird als achtstelliges Hex geschrieben, nicht als rgba()", () => {
  // Home Assistant leitet --rgb-<name> nur aus Werten ab, die mit # beginnen.
  // Aus rgba() entsteht kein Tripel - und Mushroom baut daraus seine
  // Zustandsfarben.
  assert.strictEqual(hexFuegen("#ff9800", 50), "#ff980080");
  assert.strictEqual(hexFuegen("#ff9800", 0), "#ff980000");
  assert.ok(hexFuegen("#ff9800", 50).startsWith("#"), "kein # am Anfang - kein Tripel");
});

pruefe("Bei voller Deckung bleibt es sechsstellig", () => {
  // Sonst stuende ueberall ein ff, das niemand gebeten hat.
  assert.strictEqual(hexFuegen("#ff9800", 100), "#ff9800");
});

pruefe("hexTeilen und hexFuegen sind zueinander umkehrbar", () => {
  for (const v of ["#ff9800", "#ff980080", "#00000000", "#ffffffff"]) {
    const { hex, alpha } = hexTeilen(v);
    assert.strictEqual(hexFuegen(hex, alpha), v.length === 9 && alpha === 100 ? hex : v.toLowerCase());
  }
});

pruefe("Eine Rolle bekommt keinen Alpha-Regler", () => {
  // Die elf Stufen entstehen deckend; eine durchsichtige Grundfarbe wirkte
  // nur auf den Grundton und nicht auf die Rampe - das waere irrefuehrend.
  assert.ok(!fuerFeld({ art: "farbe", v: "--x", rolle: "primary" }, "#ff9800").includes("data-be-alpha"));
  // Gegenprobe: ohne Rolle ist er da
  assert.ok(fuerFeld({ art: "farbe", v: "--y" }, "#ff9800").includes("data-be-alpha"));
});

console.log(`\n${n} Pruefungen (mit Alpha)`);

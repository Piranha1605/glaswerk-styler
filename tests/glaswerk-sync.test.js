// Die Vorlage sync-bedienelemente haelt drei Messungen fest, die jede fuer
// sich einen halben Nachmittag gekostet haben. Jede davon ist eine Stelle, an
// der ein naheliegender Weg stumm versagt - kein Fehler, keine Konsolenmeldung,
// nur: nichts aendert sich.

import assert from "node:assert";
import { VORLAGEN } from "../custom_components/glaswerk/www/vorlagen.js";

const v = VORLAGEN.find((x) => x.id === "sync-bedienelemente");
const css = v?.css || "";
// Kommentare raus - sonst prueft man Prosa statt Code. Dieselbe Falle hat
// glaswerk-vorlageninhalt.test.js schon einmal erwischt.
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Die Vorlage gibt es und sie zielt auf card", () => {
  assert.ok(v, "sync-bedienelemente fehlt");
  assert.strictEqual(v.ziel, "card");
  assert.ok(v.de && v.en && v.zweckDe && v.zweckEn, "eine Sprache fehlt");
});

pruefe("HA: gezielt wird auf hui-card-features, NICHT auf ha-card", () => {
  // Der Slider liegt zwei Shadow-Grenzen tiefer; erreichbar ist er nur ueber
  // die Variablenkette. --feature-color an der ha-card zu setzen sieht richtig
  // aus und kommt nie an: hui-card-features setzt es selbst neu.
  // Am 13.10.2026 beide Wege gemessen - ha-card: keine Wirkung,
  // hui-card-features: rgb(119,160,236).
  assert.match(code, /hui-card-features\s*\{[^}]*--feature-color/,
    "der Hebel --feature-color steht nicht auf hui-card-features");
  assert.doesNotMatch(code, /ha-card\s*\{[^}]*--feature-color/,
    "--feature-color an der ha-card ist der Weg, der nicht ankommt");
});

pruefe("HA: das !important fehlt nicht", () => {
  // Die Regel des Bauteils kommt aus adoptedStyleSheets und gilt bei
  // Gleichstand immer zuletzt. Ohne !important verliert die Vorlage.
  const zeile = code.match(/--feature-color:[^;]+;/)?.[0] || "";
  assert.match(zeile, /!important/, "--feature-color ohne !important verliert");
});

pruefe("Mushroom: filter statt Farbableitung", () => {
  // Mushroom schreibt die Lichtfarbe inline als --slider-color an genau das
  // Element, das ueberschrieben werden muesste. Jede Ableitung daraus ist ein
  // Zyklus, und CSS verwirft dann BEIDE Deklarationen stillschweigend.
  assert.match(code, /mushroom-light-brightness-control[\s\S]*?filter:\s*brightness/,
    "Mushroom braucht den filter-Weg");
  assert.doesNotMatch(code, /--slider-color:\s*color-mix[^;]*var\(--slider-color/,
    "eine Ableitung aus --slider-color ist ein Zyklus und wirkt nicht");
});

pruefe("Mushroom: der filter steht nur auf geprueften Elementen", () => {
  // Ein filter macht sein Element zum Bezugsrahmen fuer position: fixed. Auf
  // einem Pop-up-Traeger faellt der Inhalt damit auf Hoehe 0 zusammen - so
  // geschehen bei Bubble. Diese drei Steuerelemente sind nachgemessen:
  // kein fixed-Kind darin.
  const erlaubt = ["mushroom-light-brightness-control", "mushroom-cover-position-control",
                   "mushroom-fan-percentage-control"];
  const block = code.match(/([^{}]*)\{\s*filter:\s*brightness[^}]*\}/)?.[1] || "";
  const ziele = block.split(",").map((s) => s.trim()).filter(Boolean);
  assert.ok(ziele.length > 0, "kein filter-Block gefunden");
  for (const z of ziele)
    assert.ok(erlaubt.includes(z), `${z} traegt einen filter, ist aber nicht nachgemessen`);
});

pruefe("Der Faktor ist in beiden Wegen derselbe", () => {
  // color-mix(... 92.5%, black) und brightness(.925) muessen uebereinstimmen,
  // sonst laufen HA und Mushroom wieder auseinander - und zwar genau um den
  // Betrag, den die Vorlage angleichen soll.
  const mix = code.match(/color-mix\(in srgb,[^)]*\)\s*([\d.]+)%,\s*black/)?.[1]
           || code.match(/([\d.]+)%,\s*black/)?.[1];
  const bri = code.match(/brightness\(\.?([\d.]+)\)/)?.[1];
  assert.ok(mix, "kein color-mix-Faktor gefunden");
  assert.ok(bri, "kein brightness-Faktor gefunden");
  const a = parseFloat(mix) / 100;
  const b = parseFloat(bri.startsWith(".") ? bri : "." + bri.replace(/^0\./, ""));
  assert.ok(Math.abs(a - b) < 0.001, `Faktoren laufen auseinander: ${a} gegen ${b}`);
});

pruefe("Bubble: --bubble-slider-color kommt nicht vor", () => {
  // Den Namen gibt es in Bubble 3.2.0 nicht - null Vorkommen im Stylesheet.
  // Wer ihn benutzt, trifft immer nur den Ausweichwert.
  assert.doesNotMatch(code, /--bubble-slider-color\s*[:)]/,
    "--bubble-slider-color ist ein toter Name");
});

pruefe("Bubble: die Symbolflaeche kommt aus currentColor", () => {
  // Bubble haelt keine Zustandsfarbe als Variable bereit; alle naheliegenden
  // Namen sind leer. Die Farbe steht als color am Container.
  assert.match(code, /\.bubble-icon-container\s*\{[^}]*currentColor/,
    "die Symbolflaeche braucht currentColor als Quelle");
  assert.match(code, /\.bubble-icon-container\s*\{[^}]*min-width:\s*36px/,
    "Bubbles Symbolbehaelter muss auf 36px, er hat keine Groessen-Variable");
});

pruefe("Alle drei Symbolflaechen landen bei 25 Prozent", () => {
  assert.match(code, /--tile-icon-opacity:\s*\.25/, "HA fehlt (Vorgabe .2)");
  assert.match(code, /currentColor 25%/, "Bubble fehlt");
  // Mushroom steht bereits auf 25 % und wird absichtlich nicht angefasst.
  assert.doesNotMatch(code, /--shape-color/, "Mushroom braucht hier nichts");
});

pruefe("Gegenprobe: die Pruefungen wuerden anschlagen", () => {
  // Haelt fest, dass oben wirklich im CODE gesucht wird und nicht im Kommentar.
  // Der Kommentar nennt --bubble-slider-color und ha-card ausdruecklich.
  assert.match(css, /--bubble-slider-color/, "der Kommentar erwaehnt den toten Namen nicht mehr");
  assert.ok(code.length < css.length / 2, "die Kommentare wurden nicht entfernt");
  const gefaelscht = code.replace(/hui-card-features/, "ha-card");
  assert.doesNotMatch(gefaelscht, /hui-card-features\s*\{[^}]*--feature-color/);
});

// ---------------------------------------------------------------------------
// Feste helle Werte in Vorlagen: die Fehlerklasse, die am 13.10.2026 zweimal
// zugeschlagen hat.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const hier = path.dirname(fileURLToPath(import.meta.url));
const bauen = readFileSync(path.join(hier, "../werkzeuge/liquid-glass-bauen.mjs"), "utf8");

pruefe("Die Kanten der Karten stehen im Theme-Feld, nicht in einer Vorlage", () => {
  // Ein uix-Feld gilt fuer Hell UND Dunkel zugleich. Eine Kante in
  // rgba(255,255,255,.72) ist im Hellen richtig und im Dunkeln ein greller
  // Strich. Gemeldet: "kannst du den karten im dunkelmodus die selbe farbe
  // rahmen schatten und alles was dazu gehoert von der werkbank geben".
  const karten = VORLAGEN.find((v) => v.id === "glas-karten");
  const bubble = VORLAGEN.find((v) => v.id === "glas-bubble");
  for (const v of [karten, bubble]) {
    const code = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.match(code, /var\(--ha-card-box-shadow/,
      `${v.id}: liest den Schatten nicht aus dem Theme-Feld`);
    assert.doesNotMatch(code, /inset[^;]*rgba\(255,\s*255,\s*255/,
      `${v.id}: traegt eine feste helle Kante - die ist im Dunkelmodus falsch`);
  }
});

pruefe("--ha-card-box-shadow traegt die Kanten, je Modus verschieden", () => {
  // Vier Teile: zwei innere Kanten, zwei aeussere. Und hell != dunkel, sonst
  // waere die Trennung sinnlos.
  const block = bauen.slice(bauen.indexOf('"--ha-card-box-shadow"'),
                            bauen.indexOf("],", bauen.indexOf('"--ha-card-box-shadow"')));
  assert.ok(block.length > 100, "das Feld wurde nicht gefunden");
  const hell = block.slice(0, block.indexOf('"inset', block.indexOf('"inset') + 10));
  assert.match(hell, /inset 0 1\.5px/, "keine obere Kante im Hellmodus");
  assert.match(block, /rgba\(255, 255, 255, \.72\)/, "Hell-Kante fehlt");
  assert.match(block, /rgba\(255, 255, 255, \.16\)/, "Dunkel-Kante fehlt");
  assert.match(block, /rgba\(0, 0, 0, \.35\)/, "dunkle Abschlusskante fehlt");
});

pruefe("glas-lichtkante steht NICHT in der mitgelieferten Theme", () => {
  // Sie legt einen zweiten Saum als ::before ueber die Flaeche, mit festen
  // hellen Werten - und nimmt Bubble davon aus. Im Dunkeln sah deshalb nur
  // Bubble richtig aus: "nein das von bubble ist die richtige, die anderen
  // sehen falsch aus". Die Vorlage bleibt waehlbar, nur nicht als Vorgabe.
  assert.match(bauen, /const NICHT_AN = \[[^\]]*"glas-lichtkante"/,
    "glas-lichtkante gehoert auf die Ausnahmeliste");
  assert.ok(VORLAGEN.some((v) => v.id === "glas-lichtkante"),
    "die Vorlage selbst soll es weiter geben");
});

pruefe("Gegenprobe: die Kantenpruefung wuerde anschlagen", () => {
  const gefaelscht = "ha-card { box-shadow: inset 0 1.5px 0 0 rgba(255, 255, 255, .72); }";
  assert.match(gefaelscht, /inset[^;]*rgba\(255,\s*255,\s*255/);
});

console.log(`\n${n} Pruefungen`);
if (n < 14) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

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
  // Gegenprobe: ein gesetzter Wert steht da auch wirklich.
  // Seit dem 12.10.2026 steht er in einem Eingabefeld, nicht mehr als Text
  // zwischen Tags - deshalb value="…" statt >…<.
  assert.match(farbe({ id: "f", wert: "#abcdef" }), /value="#abcdef"/);
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

// ---------------------------------------------------------------------------
// Der Vertrag zwischen Bedienelement und Schreiber.
//
// Hier sass der Fehler vom 12.10.2026: Das Bedienelement streift die Einheit
// ab (ein <input type="range"> kann nur Zahlen), und der Schreiber muss sie
// wieder anhaengen. Tut er es nicht, steht "border-radius: 18" im Theme - der
// Browser verwirft die Regel stumm, und in der Oberflaeche sieht alles richtig
// aus, weil die Kachel die 18 ja anzeigt.
//
// Beide Seiten einzeln zu pruefen reicht nicht. Geprueft wird der Rundlauf,
// und die Regel des Schreibers wird aus seinem Quelltext gelesen statt
// nachgebaut - sonst prueft der Test seine eigene Kopie.

import { readFileSync } from "node:fs";
import { fileURLToPath as fuP } from "node:url";
import path2 from "node:path";

const quelle = readFileSync(
  path2.join(path2.dirname(fuP(import.meta.url)), "../custom_components/hats/www/hats-panel.js"), "utf8");

pruefe("Der Schreiber haengt die Einheit an, und zwar genau einmal", () => {
  const regel = /if \(f\.art === "mass"[\s\S]{0,260}?f\.einheit \?\? "px"\)/.exec(quelle);
  assert.ok(regel, "Die Einheiten-Regel steht nicht mehr in aendere()");
  // Nur Zahlen bekommen eine Einheit - ein Wert, der schon eine traegt, nicht.
  assert.match(regel[0], /\/\^-\?\[\\d\.\]\+\$\//, "Die Regel prueft nicht mehr auf eine nackte Zahl");
});

pruefe("Rundlauf Wert -> Regler -> Schreiber -> Wert", () => {
  // Die Regel des Schreibers, wie sie oben im Quelltext steht.
  const schreibe = (wert, einheit) =>
    (wert !== null && wert !== "" && /^-?[\d.]+$/.test(String(wert)))
      ? String(wert) + (einheit ?? "px") : wert;

  for (const [wert, einheit] of [["18px", undefined], ["14px", "px"], ["1.5rem", "rem"],
                                 ["250ms", "ms"], ["90vh", "vh"]]) {
    const html = fuerFeld({ t: "T", art: "mass", v: "--x", min: 0, max: 999, einheit }, wert);
    const m = /value="([^"]*)"/.exec(html);
    assert.ok(m, `kein Wert im Regler fuer ${wert}`);
    assert.doesNotMatch(m[1], /[a-z%]/i, `der Regler gibt ${m[1]} mit Einheit heraus`);
    assert.strictEqual(schreibe(m[1], einheit), wert,
      `Rundlauf gebrochen: ${wert} -> ${m[1]} -> ${schreibe(m[1], einheit)}`);
  }

  // Die eine Ausnahme, vom Test selbst gefunden: Eine nackte Null kommt als
  // "0px" zurueck. ha_blanko traegt ha-border-radius-square: "0", und wer den
  // Regler anfasst, macht "0px" daraus. In CSS ist das dasselbe - die Null
  // braucht als einzige Groesse keine Einheit, vertraegt sie aber. Deshalb
  // steht hier kein Rundlauf, sondern die Gleichwertigkeit.
  const nullHtml = fuerFeld({ t: "T", art: "mass", v: "--x", min: 0, max: 48 }, "0");
  assert.strictEqual(schreibe(/value="([^"]*)"/.exec(nullHtml)[1], undefined), "0px");
});

pruefe("Gegenprobe: ohne das Anhaengen bricht der Rundlauf", () => {
  // Ohne sie koennte die Pruefung oben gruen sein, weil beide Seiten denselben
  // Fehler machen.
  const html = fuerFeld({ t: "T", art: "mass", v: "--x", min: 0, max: 48 }, "18px");
  const roh = /value="([^"]*)"/.exec(html)[1];
  assert.notStrictEqual(roh, "18px", "der Regler streift die Einheit gar nicht ab");
  assert.strictEqual(roh, "18");
});

pruefe("Jede Einheit aus STUFEN ueberlebt den Rundlauf", () => {
  // Nicht nur px: in den Stufen steht auch ms. Waere dort eine Einheit, die
  // der Regler anders abstreift als der Schreiber anhaengt, liefe es
  // auseinander, ohne dass es jemand saehe.
  const blk = quelle.slice(quelle.indexOf("const STUFEN = ["), quelle.indexOf("const STAND_TEXT"));
  const einheiten = new Set();
  for (const m of blk.matchAll(/art: "mass"[^}]*/g)) {
    const e = /einheit: "([^"]*)"/.exec(m[0]);
    einheiten.add(e ? e[1] : "px");
  }
  assert.ok(einheiten.size >= 2, `nur ${einheiten.size} Einheit(en) gefunden - prueft zu wenig`);
  for (const e of einheiten) {
    const html = fuerFeld({ t: "T", art: "mass", v: "--x", min: 0, max: 999, einheit: e }, "42" + e);
    const roh = /value="([^"]*)"/.exec(html)[1];
    assert.strictEqual(roh + e, "42" + e, `Einheit ${e} bricht den Rundlauf`);
  }
});

pruefe("Der Hexwert ist eintippbar, nicht nur lesbar", () => {
  // Bis zum 12.10.2026 stand dort ein <code>. Die einzige Art, einen Ton zu
  // wechseln, war ein Klick auf das Farbquadrat - also der Waehler des
  // Betriebssystems. Gefragt wurde: "und wie kann ich die farbe anpassen?"
  const h = farbe({ id: "x", wert: "#8fd92a" });
  assert.match(h, /<input type="text"[^>]*class="be-hex"/, "kein Eingabefeld fuer den Hexwert");
  assert.match(h, /data-be-hex="x"/, "ohne data-be-hex findet binde() es nicht");
  assert.match(h, /value="#8fd92a"/, "der Wert steht nicht im Feld");
  assert.doesNotMatch(h, /<code data-be-aus/, "der Wert steht wieder nur als Text da");
});

pruefe("Das Farbquadrat bleibt daneben", () => {
  // Eintippen ERSETZT den Waehler nicht - wer eine Farbe sucht statt sie zu
  // kennen, braucht ihn weiter.
  const h = farbe({ id: "x", wert: "#8fd92a" });
  assert.match(h, /<input type="color" data-be-farbe="x"/);
});

pruefe("Ein leerer Wert erfindet keinen", () => {
  const h = farbe({ id: "x", wert: "" });
  assert.match(h, /value=""/, "statt leer steht dort etwas");
  assert.match(h, /placeholder="nicht gesetzt"/);
});

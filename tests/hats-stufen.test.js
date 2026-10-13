// Die Felddaten der acht Stufen. Geprueft wird am Quelltext, weil das Panel
// HTMLElement braucht und sich in node nicht laden laesst.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const quelle = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");
const block = quelle.slice(quelle.indexOf("const STUFEN = ["), quelle.indexOf("const STAND_TEXT"));
const stufen = block.split(/\{ n: \d+, titel:/).slice(1);

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

function felder(st) {
  return [...st.matchAll(/\{ t: "([^"]+)"((?:(?!\{ t: )[\s\S])*)/g)].map((m) => {
    const rest = m[2];
    const v = /v: "([^"]+)"/.exec(rest);
    return { t: m[1], v: v ? v[1] : null, rest };
  });
}

pruefe("Acht Stufen", () => assert.strictEqual(stufen.length, 8));

pruefe("Die Schluessel sind je Stufe eindeutig", () => {
  // Der Schluessel ist der Variablenname, nicht der Titel. Titel wiederholen
  // sich zwangslaeufig - "Klein", "Mittel", "Ruhend" stehen in mehreren
  // Gruppen. Waere der Titel der Schluessel, oeffnete jede dieser Kacheln
  // dieselbe Seite, und die zweite Gruppe waere unerreichbar. Genau so war es
  // am 12.10.2026, gefunden beim ersten Versuch, einen Schatten zu setzen.
  stufen.forEach((st, i) => {
    const k = felder(st).map((f) => f.v || f.t);
    const doppelt = k.filter((x, j) => k.indexOf(x) !== j);
    assert.deepStrictEqual(doppelt, [], `Stufe ${i + 1}: doppelte Schluessel ${doppelt}`);
  });
});

pruefe("Die Kacheln sind ueber den Variablennamen verschluesselt", () => {
  assert.ok(quelle.includes('data-feld="${f.v || f.t}"'), "data-feld haengt noch am Titel");
  assert.ok(quelle.includes('(x.v || x.t) === schluessel'), "Suche haengt noch am Titel");
});

pruefe("Jedes Feld mit Variable hat eine Art und eine Ebene", () => {
  stufen.forEach((st, i) => {
    for (const f of felder(st)) {
      if (!f.v) continue;
      assert.match(f.rest, /art: "/, `Stufe ${i + 1}, ${f.t}: keine Art`);
      assert.match(f.rest, /ebene: "(beide|getrennt)"/, `Stufe ${i + 1}, ${f.t}: keine Ebene`);
    }
  });
});

pruefe("Keine Variable kommt in zwei Stufen als einstellbares Feld vor", () => {
  // Zwei Stufen, die dieselbe Variable schreiben, widersprechen sich - wer
  // zuletzt klickt, gewinnt, und niemand sieht es.
  const gesehen = new Map();
  const mehrfach = [];
  stufen.forEach((st, i) => {
    for (const f of felder(st)) {
      if (!f.v) continue;
      if (gesehen.has(f.v)) mehrfach.push(`${f.v}: Stufe ${gesehen.get(f.v)} und ${i + 1}`);
      else gesehen.set(f.v, i + 1);
    }
  });
  assert.deepStrictEqual(mehrfach, []);
});

pruefe("Rollenfarben stehen flach, Textfarben je Modus", () => {
  // Die Palette ist modusunabhaengig - nur flach leitet HA in BEIDEN Modi die
  // RGB-Tripel ab. Schrift wechselt dagegen mit dem Modus.
  const s1 = stufen[0];
  for (const f of felder(s1)) {
    if (/rolle: "/.test(f.rest)) assert.match(f.rest, /ebene: "beide"/, `${f.t} ist eine Rolle und muss flach stehen`);
    if (f.v && f.v.startsWith("--ha-color-text-")) assert.match(f.rest, /ebene: "getrennt"/, `${f.t} muss je Modus stehen`);
  }
});

assert.ok(n >= 6, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);

pruefe("Jedes Mass-Feld hat eine Einheit oder nimmt die Vorgabe px", () => {
  // "border-radius: 18" ist ungueltiges CSS und wird stillschweigend
  // verworfen. Der Regler liefert eine nackte Zahl, also muss die Einheit
  // beim Schreiben dazukommen.
  assert.match(quelle, /f\.art === "mass".*\n.*wert = String\(wert\) \+ \(f\.einheit \?\? "px"\)/,
    "die Einheit wird beim Schreiben nicht angehaengt");
  // Gegenprobe: zahl-Felder duerfen KEINE Einheit bekommen - Skala und
  // Zeilenhoehe sind Verhaeltnisse.
  const zahlFelder = stufen.flatMap(felder).filter((f) => /art: "zahl"/.test(f.rest));
  assert.ok(zahlFelder.length >= 2, "keine zahl-Felder zum Gegenpruefen");
  for (const f of zahlFelder) assert.ok(!/einheit:/.test(f.rest), `${f.t} hat eine Einheit, ist aber ein Verhaeltnis`);
});

console.log(`\n${n} Pruefungen (mit Einheiten)`);

pruefe("Die Oberflaeche deckt die ganze Grundlage ab", () => {
  // Der Sinn der acht Stufen ist, eine komplette Theme durchzustylen. Ein Feld
  // der Grundlage, das nirgends auftaucht, laesst sich nie aendern - und faellt
  // nicht auf, weil die Datei trotzdem vollstaendig aussieht. Am 12.10.2026
  // waren das 314 von 376.
  const yaml = readFileSync(path.join(hier, "../docs/beispiele/ha-blanko.yaml"), "utf8");
  let b = "flach";
  const inBlanko = new Set();
  for (const l of yaml.split("\n")) {
    if (/^ {4}light:\s*$/.test(l)) { b = "hell"; continue; }
    if (/^ {4}dark:\s*$/.test(l)) { b = "dunkel"; continue; }
    const m = /^ +([a-z0-9-]+):\s*/.exec(l);
    if (m && m[1] !== "modes") inBlanko.add(m[1]);
  }
  assert.ok(inBlanko.size > 300, `nur ${inBlanko.size} Felder gelesen - der Test prueft zu wenig`);

  const inUi = new Set([...block.matchAll(/v: "--([a-z0-9-]+)"/g)].map((m) => m[1]));
  // Was die Zuordnung automatisch schreibt, braucht kein Bedienelement.
  const zu = readFileSync(path.join(hier, "../custom_components/hats/www/zuordnung.js"), "utf8");
  const auto = new Set([...zu.matchAll(/^\s*"([a-z0-9-]+)":/gm)].map((m) => m[1]));

  const fehlt = [...inBlanko].filter((k) => !inUi.has(k) && !auto.has(k));
  assert.deepStrictEqual(fehlt, [], `${fehlt.length} Felder ohne Bedienelement: ${fehlt.slice(0, 8)}`);
});

pruefe("Gegenprobe: ein fehlendes Feld wird gefunden", () => {
  const inUi = new Set([...block.matchAll(/v: "--([a-z0-9-]+)"/g)].map((m) => m[1]));
  assert.ok(!inUi.has("gibt-es-nicht-xyz"), "die Menge ist nicht das, was sie sein soll");
  assert.ok(inUi.size > 350, `nur ${inUi.size} Felder in der Oberflaeche`);
});

pruefe("Jede Stufe hat ein Symbol fuer die Leiste", () => {
  // Die Leiste trug bis zum 13.10.2026 drei leere Platzhalter. Jetzt ein
  // Symbol je Stufe, wie in HATG - und es steht in den Daten, nicht im
  // Markup, damit Leiste und Stufenliste nicht auseinanderlaufen koennen.
  const symbole = [...block.matchAll(/symbol: "(mdi:[a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.strictEqual(symbole.length, 8, `${symbole.length} Symbole statt 8`);
  assert.strictEqual(new Set(symbole).size, 8, `Symbole doppelt vergeben: ${symbole}`);
});

pruefe("Die Leiste wird aus STUFEN erzeugt, nicht getippt", () => {
  // Gegenprobe gegen eine handgeschriebene Knopfreihe: Die waere beim
  // naechsten Umbau still veraltet.
  assert.match(quelle, /STUFEN\.map\(\(st\) => `\s*\n\s*<button class="railknopf/);
  assert.doesNotMatch(quelle, /<button class="railknopf an" title="1">/, "Platzhalter sind zurueck");
});

console.log(`\n${n} Pruefungen`);

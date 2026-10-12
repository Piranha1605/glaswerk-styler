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
console.log(`\n${n} Pruefungen`);

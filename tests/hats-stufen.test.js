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

pruefe("Jede Stufe hat ein eigenes Symbol, und es wird auch gelesen", () => {
  const symbole = [...block.matchAll(/symbol: "(mdi:[a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.strictEqual(symbole.length, 8, `${symbole.length} Symbole statt 8`);
  assert.strictEqual(new Set(symbole).size, 8, `Symbole doppelt vergeben: ${symbole}`);
  // Bis zum 14.10.2026 sass es in der Menueleiste. Mit den Stufenknoepfen ist
  // es ins Pop-up gezogen - ein Feld, das niemand liest, gehoert weg und nicht
  // stehengelassen.
  assert.match(quelle, /<span class="dsymbol"><ha-icon icon="\$\{st\.symbol\}"/,
    "st.symbol wird nirgends mehr gelesen");
  // Gegenprobe: NICHT auf der Marke aus der Liste - die ist die Standfarbe,
  // und ein weisses Symbol auf ihrem Grau kam auf 1,9:1.
  assert.doesNotMatch(quelle, /class="dsymbol" style="background:\$\{st\.marke\}"/);
});

pruefe("Die Stufen stehen NUR in der Liste, nicht noch einmal in der Leiste", () => {
  // Ansage vom 14.10.2026: "eigendlich brauchen wir das menue oben link nicht
  // mehr da wir eh die seite haben und alles als popup auf geht."
  //
  // Nachgesehen: Beide Wege riefen oeffne(nr), also dasselbe Pop-up. Die
  // Zeile in der Liste nennt Name, Stand, Gruppen und Felder, der Knopf oben
  // hatte nur ein Symbol.
  assert.doesNotMatch(quelle, /data-rail=/, "die Stufenknoepfe sind zurueck in der Leiste");
  assert.doesNotMatch(quelle, /<button class="railknopf/, "die alte Seitenleiste ist zurueck");
  assert.doesNotMatch(quelle, /class="ml-stufen"/);
  // Gegenprobe: Die Zeile in der Liste fuehrt wirklich ins Pop-up - sonst
  // waere die Stufe jetzt gar nicht mehr zu erreichen.
  assert.match(quelle, /querySelectorAll\("\.zeile"\)[\s\S]{0,120}this\.oeffne\(Number\(z\.dataset\.stufe\)\)/,
    "die Zeile in der Liste oeffnet die Stufe nicht");
  assert.match(quelle, /<div class="zeile" data-stufe="\$\{s\.n\}">/);
  // Und die Aktionen sind geblieben, rechts: Die Leiste ist nicht leer.
  assert.match(quelle, /data-schalter="\$\{k\.id\}"/);
  assert.match(quelle, /\{ id: "baukasten",/);
  assert.match(quelle, /\.ml-aktionen \{[^}]*margin-left: auto/);
});

console.log(`\n${n} Pruefungen`);

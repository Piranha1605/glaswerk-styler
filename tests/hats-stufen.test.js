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
  // Und die Aktionen sind geblieben - seit dem 15.10.2026 ohne Leiste:
  // was zur Datei gehoert im Kopf, die Werkzeuge ueber der Liste.
  assert.match(quelle, /data-schalter="\$\{k\.id\}"/);
  assert.match(quelle, /\{ id: "baukasten",/);
  assert.match(quelle, /class="kopfknopf"/, "die Dateiknoepfe im Kopf fehlen");
  assert.match(quelle, /<div class="werkzeuge">/, "die Werkzeugzeile fehlt");
  assert.doesNotMatch(quelle, /\.ml-aktionen \{/, "die alte Leiste ist zurueck");
});

// --- Die Beschriftungen, 14.10.2026 ------------------------------------
// Beim Durchgehen der acht Stufen gefunden: Ein grosser Teil der Felder trug
// als Beschriftung den Variablennamen mit Leerzeichen statt Bindestrichen -
// "Weight bold", "Bar box shadow", "Ha moz osx font smoothing". Das stammt
// aus der Massenableitung aus ha-blanko.yaml vom 12.10.2026, bei der Art und
// Ebene gerechnet wurden und die Beschriftung gleich mit.
//
// Zwei Fehler kamen dabei heraus, die nicht nur haesslich sind:
//   - "Weight hell" fuer --ha-font-weight-light. Das ist eine falsche
//     Uebersetzung, nicht eine rohe: light heisst hier LEICHT, nicht hell.
//   - "Border style" zweimal in derselben Gruppe Rahmen, fuer --wa-border-style
//     und --wa-panel-border-style. Zwei Kacheln, eine Beschriftung.

function gruppen() {
  // Die Gruppen aus dem Quelltext, mit ihren Feldern. Die Stufenliste reicht
  // dafuer nicht: Doppelte Beschriftungen sind ueber Gruppen hinweg normal
  // ("Klein", "Ruhend"), innerhalb einer Gruppe nicht.
  const aus = [];
  let g = null;
  for (const z of quelle.split("\n")) {
    let m = z.match(/^      \{ name: "([^"]+)", felder:/);
    if (m) { g = { name: m[1], felder: [] }; aus.push(g); continue; }
    // Nicht jedes Feld hat eine Variable: "Name der Theme" ist eine Angabe,
    // und die Gruppen der Stufe 8 sind Knoepfe. Beschriftungen haben sie alle.
    m = z.match(/\{ t: "([^"]*)"/);
    if (m && g) g.felder.push({ t: m[1], v: (/v: "([^"]+)"/.exec(z) || [])[1] || null });
  }
  return aus;
}

pruefe("Keine Gruppe hat zwei Felder mit derselben Beschriftung", () => {
  const doppelt = [];
  for (const g of gruppen()) {
    const t = g.felder.map((f) => f.t);
    for (const x of new Set(t.filter((x, i) => t.indexOf(x) !== i)))
      doppelt.push(`${g.name}: "${x}"`);
  }
  assert.deepStrictEqual(doppelt, [], `nicht unterscheidbar: ${doppelt.join(", ")}`);
  // Gegenprobe: Die Gruppen sind wirklich gelesen worden, und sie tragen
  // Felder - sonst waere die Pruefung ueber einer leeren Liste gelaufen.
  assert.ok(gruppen().length >= 40, `nur ${gruppen().length} Gruppen gelesen`);
  assert.ok(gruppen().every((g) => g.felder.length > 0), "eine Gruppe ohne Felder");
});

pruefe("Keine Beschriftung traegt ein englisches Eigenschaftswort", () => {
  // Die Liste sind EIGENSCHAFTEN, keine Bauteilnamen: "Chip", "Badge",
  // "Panel" und "Pop-up" heissen auf deutsch genauso und bleiben.
  const engl = /\b(color|background|width|height|size|style|radius|shadow|opacity|padding|margin|border|weight|family|smoothing|float|direction|fill|line|ink|outlined|idle|dropdown|divider|secondary|default|inverted|low|lower|condensed|expanded|instant|slow|none|easing|box|header|scrollable|fade|thumb|title|ltr|rtl)\b/i;
  const schlecht = [];
  for (const g of gruppen())
    for (const f of g.felder)
      if (engl.test(f.t)) schlecht.push(`${g.name}: "${f.t}" (${f.v})`);
  assert.deepStrictEqual(schlecht, [], `roh geblieben:\n  ${schlecht.join("\n  ")}`);
  // Gegenprobe: Der Ausdruck trifft ueberhaupt etwas - sonst waere die
  // Pruefung ein gruener Haken ohne Inhalt.
  assert.ok(engl.test("Bar box shadow") && engl.test("Weight bold"),
    "der Ausdruck findet nicht einmal die alten Beschriftungen");
  assert.ok(!engl.test("Stil Panel") && !engl.test("Kreis"),
    "der Ausdruck trifft auch das Richtige");
});

pruefe("Die Leitern stehen in ihrer eigenen Reihenfolge, nicht alphabetisch", () => {
  // Auch das beim Durchgehen gefunden: Die Kacheln stehen in der Reihenfolge
  // der Quelle, und die stand in Zeichenfolge - "1, 10, 11 ... 20, 3, 5, 7".
  // Dazwischen die drei von Hand benannten Stufen (Eng=2, Normal=4, Weit=6)
  // ganz am Ende. Die Gruppe verspricht "von klein bis Karte" und hielt es
  // nicht.
  const RUNDUNG = ["-sm", "-md", "-lg", "-xl", "-2xl", "-3xl", "-4xl", "-5xl",
                   "-6xl", "-circle", "-pill", "-square"];
  const leitern = {
    Abstaende: (v) => Number(/-(\d+)$/.exec(v)[1]),
    Diagrammfarben: (v) => Number(/-(\d+)$/.exec(v)[1]),
    Rundung: (v) => RUNDUNG.findIndex((e) => v.endsWith(e)),
  };
  let gesehen = 0;
  for (const g of gruppen()) {
    const schl = leitern[g.name];
    if (!schl) continue;
    gesehen++;
    const w = g.felder.map((f) => schl(f.v));
    assert.ok(w.every((x) => x >= 0), `${g.name}: eine Stufe ist unbekannt`);
    assert.deepStrictEqual(w, [...w].sort((a, b) => a - b),
      `${g.name} steht nicht in seiner Reihenfolge: ${g.felder.map((f) => f.t).join(", ")}`);
  }
  // Gegenprobe: Die drei Gruppen gibt es wirklich - ein Tippfehler im Namen
  // haette hier sonst drei stille Nullpruefungen hinterlassen.
  assert.strictEqual(gesehen, 3, `nur ${gesehen} der drei Leitern gefunden`);
});

console.log(`\n${n} Pruefungen`);

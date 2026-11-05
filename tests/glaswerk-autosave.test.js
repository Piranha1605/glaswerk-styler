// Der Autosave: sichert er wirklich, und sichert er das Richtige?
//
// Geprueft wird am QUELLTEXT des Panels, nicht am laufenden Panel - dieselbe
// Grenze wie bei glaswerk-bar.test.js: glaswerk-panel.js ist ein Browser-Modul
// mit customElements und laedt in Node nicht. Was hier NICHT geprueft werden
// kann, ist, ob der Browser pagehide wirklich feuert. Das ist an der Instanz
// gemessen.
//
// Die Fragen, die zaehlen:
//
//   1. Haengt der Autosave am Set selbst?  Nur dann kann keine der fuenfzehn
//      Stellen, die geaendert.add rufen, daran vorbeigreifen - und die
//      sechzehnte auch nicht.
//   2. Wird VOR dem Schreiben geprueft, ob es etwas zu schreiben gibt?  Sonst
//      ueberschreibt ein frisch geoeffnetes Panel den Stand von gestern.
//   3. Schreiben Knopf und Autosave dasselbe Format?  Zwei Schreiber, die
//      sich unterscheiden, faellt erst auf, wenn einer den Stand des anderen
//      nicht mehr liest.
//   4. Wird beim Verlassen SYNCHRON geschrieben?  Ein setTimeout in einem
//      pagehide-Horcher laeuft nie.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// --- 1. Der Autosave haengt am Set ----------------------------------------

pruefe("add() ist umhuellt, nicht die fuenfzehn Aufrufstellen", () => {
  assert.ok(/ZUSTAND\.geaendert\.add\s*=\s*\(/.test(panel),
    "geaendert.add wird nicht ersetzt - dann greift jede neue Stelle daran vorbei");
  assert.ok(/const echtesAdd = ZUSTAND\.geaendert\.add\.bind/.test(panel),
    "das echte add wird nicht gebunden - die Huelle wuerde sich selbst rufen");
});

pruefe("Die Huelle ruft autoSichern UND gibt das Ergebnis zurueck", () => {
  const block = panel.slice(panel.indexOf("const echtesAdd"), panel.indexOf("const echtesAdd") + 300);
  assert.ok(/autoSichern\(\)/.test(block), "autoSichern wird nicht gerufen");
  assert.ok(/return r/.test(block),
    "der Rueckgabewert von add() faellt weg - Set.add gibt das Set zurueck, und verkettete Aufrufe braechen");
});

pruefe("Es gibt keine Aufrufstelle, die autoSichern selbst ruft", () => {
  // Wenn doch, waere das ein Zeichen, dass jemand der Huelle nicht traut -
  // und dann driften die beiden Wege auseinander.
  //
  // Gezaehlt wird zeilenweise und OHNE Definition und Kommentare: Der erste
  // Anlauf zaehlte "function autoSichern()" und eine Erwaehnung im
  // Kommentar mit und meldete 3 statt 1. Ein Test, der am eigenen Zaehlen
  // scheitert, sagt nichts ueber den Code.
  const rufe = panel.split("\n").filter((z) => {
    const ohneKommentar = z.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    if (/function autoSichern/.test(ohneKommentar)) return false;
    return /autoSichern\(\)/.test(ohneKommentar);
  }).length;
  assert.strictEqual(rufe, 1,
    `autoSichern wird ${rufe}x gerufen - erwartet genau einmal, aus der Huelle`);
});

// --- 2. Nicht schreiben, wenn es nichts zu schreiben gibt -----------------

pruefe("Ohne Modell oder ohne Aenderung wird nicht geschrieben", () => {
  const i = panel.indexOf("function autoSichern");
  const block = panel.slice(i, i + 900);
  assert.ok(/if \(!ZUSTAND\.modell \|\| !ZUSTAND\.geaendert\.size\) return/.test(block),
    "der Autosave prueft nicht, ob es etwas zu sichern gibt - ein frisch " +
    "geoeffnetes Panel wuerde den Stand des letzten Mals ueberschreiben");
});

pruefe("Auch der Verlassen-Horcher prueft das", () => {
  const i = panel.indexOf('for (const ereignis of ["pagehide"');
  assert.ok(i > 0, "der Verlassen-Horcher fehlt");
  const block = panel.slice(i, i + 900);
  assert.ok(/if \(!ZUSTAND\.modell \|\| !ZUSTAND\.geaendert\.size\) return/.test(block),
    "beim Verlassen wird ungeprueft geschrieben");
});

// --- 3. Ein Format, zwei Wege ---------------------------------------------

pruefe("Es gibt genau eine Stelle, die in den Zwischenspeicher schreibt", () => {
  const roh = [...panel.matchAll(/localStorage\.setItem\(ZWISCHEN_SPEICHER/g)].length;
  assert.strictEqual(roh, 1,
    `${roh} Stellen schreiben direkt in den localStorage - erwartet genau eine (zwischenSchreiben)`);
  assert.ok(/function zwischenSchreiben\(stand\)/.test(panel),
    "zwischenSchreiben fehlt");
});

pruefe("Knopf und Autosave legen dieselben Felder ab", () => {
  const felder = (block) => ["name:", "modell:", "meta:", "zeit:"].filter((f) => block.includes(f));
  const iAuto = panel.indexOf("function autoSichern");
  const autoBlock = panel.slice(iAuto, iAuto + 900);
  // Die METHODE, nicht die Menue-Registrierung: "zwischenstandSichern()"
  // kommt zuerst in spZwischen vor, und dort stehen die Felder natuerlich
  // nicht. Der erste Anlauf verglich deshalb gegen ein leeres Array.
  const iKnopf = panel.indexOf("\n  zwischenstandSichern() {");
  assert.ok(iKnopf > 0, "die Methode zwischenstandSichern wurde nicht gefunden");
  const knopfBlock = panel.slice(iKnopf, iKnopf + 900);
  assert.deepStrictEqual(felder(autoBlock), ["name:", "modell:", "meta:", "zeit:"],
    "dem Autosave fehlt ein Feld");
  assert.deepStrictEqual(felder(knopfBlock), ["name:", "modell:", "meta:", "zeit:"],
    "dem Knopf fehlt ein Feld");
});

pruefe("Gesichert wird das MODELL, nicht die fertige Theme", () => {
  const i = panel.indexOf("function autoSichern");
  const block = panel.slice(i, i + 900);
  assert.ok(/modell: ZUSTAND\.modell/.test(block),
    "es wird nicht das Modell gesichert");
  assert.ok(!/schreibeTheme\(/.test(block),
    "der Autosave schreibt eine fertige Theme - dann fehlen die Felder, " +
    "die noch nicht geschrieben wuerden, und genau die will man zurueck");
});

// --- 4. Beim Verlassen synchron ------------------------------------------

pruefe("Der Verlassen-Horcher schreibt ohne Timer", () => {
  const i = panel.indexOf('for (const ereignis of ["pagehide"');
  const block = panel.slice(i, i + 900);
  assert.ok(/zwischenSchreiben\(/.test(block),
    "beim Verlassen wird nicht geschrieben");
  assert.ok(!/setTimeout/.test(block),
    "beim Verlassen laeuft ein setTimeout - das feuert nie, die Arbeit waere weg");
  assert.ok(/clearTimeout\(autoUhr\)/.test(block),
    "der laufende Timer wird nicht abgeraeumt");
});

pruefe("pagehide statt beforeunload, und visibilitychange dazu", () => {
  assert.ok(/"pagehide"/.test(panel),
    "pagehide fehlt - beforeunload feuert auf Mobilgeraeten oft nicht");
  assert.ok(/"visibilitychange"/.test(panel), "visibilitychange fehlt");
  assert.ok(/document\.visibilityState !== "hidden"/.test(panel),
    "visibilitychange wird nicht auf 'hidden' gefiltert - dann sichert auch " +
    "das Zurueckkommen");
});

// --- Der Timer ------------------------------------------------------------

pruefe("Der Timer wird vor jedem Neustart abgeraeumt", () => {
  const i = panel.indexOf("function autoSichern");
  const block = panel.slice(i, i + 300);
  assert.ok(/clearTimeout\(autoUhr\)/.test(block),
    "ohne clearTimeout sammelt jedes Zeichen einen eigenen Timer an");
});

pruefe("Die Ruhezeit ist gesetzt und plausibel", () => {
  const m = panel.match(/const AUTO_RUHE = (\d+)/);
  assert.ok(m, "AUTO_RUHE fehlt");
  const ms = Number(m[1]);
  assert.ok(ms >= 300 && ms <= 5000,
    `AUTO_RUHE ist ${ms}ms - unter 300 kostet das Ziehen am Regler Leistung, ueber 5000 verliert man zu viel`);
});

// --- Die Anzeige ----------------------------------------------------------

pruefe("Der Autosave-Stand wird nur gezeigt, wenn wirklich gesichert wurde", () => {
  const i = panel.indexOf("zeichneAutoStand()");
  assert.ok(i > 0, "zeichneAutoStand fehlt");
  const block = panel.slice(panel.indexOf("zeichneAutoStand() {"), panel.indexOf("zeichneAutoStand() {") + 800);
  assert.ok(/if \(!ZUSTAND\.autoZeit\)/.test(block),
    "ohne diese Pruefung stuende eine Uhrzeit da, bevor etwas gesichert wurde");
  assert.ok(/ZUSTAND\.autoFehler/.test(block),
    "der Fehlerfall wird nicht angezeigt - ein privates Fenster nimmt nichts " +
    "entgegen, und wer das nicht sieht, arbeitet sorgloser als er darf");
});

pruefe("Die neuen Texte stehen im en-Block", () => {
  // Dieselbe Regel wie ueberall: ein deutscher Text ohne Uebersetzung faellt
  // im englischen Panel als deutscher Text auf.
  for (const text of ["Zwischenstand ", "Autosave aus: "]) {
    assert.ok(panel.includes(`"${text}":`),
      `"${text}" fehlt im en-Block`);
  }
});

pruefe("Der Horcher wird wieder abgemeldet", () => {
  assert.ok(/removeEventListener\("glaswerk-auto-gesichert"/.test(panel),
    "ohne Abmelden sammeln sich Horcher auf tote Shadow-DOMs - HA erzeugt " +
    "das Panel bei jedem Seitenwechsel neu");
  assert.ok(/disconnectedCallback\(\)/.test(panel), "disconnectedCallback fehlt");
});

// --- Gegenprobe gegen die eigene Blindheit --------------------------------

pruefe("Die geprueften Bezeichner gibt es wirklich", () => {
  // Jede Pruefung oben sucht nach einem Namen. Taeuscht man sich bei einem,
  // sucht der Test etwas, das nie existierte - und ist gruen.
  for (const name of ["autoSichern", "zwischenSchreiben", "AUTO_RUHE", "autoUhr",
                      "zeichneAutoStand", "ZUSTAND.autoZeit", "ZUSTAND.autoFehler"]) {
    assert.ok(panel.includes(name), `${name} kommt im Panel nicht vor`);
  }
});

assert.ok(n >= 14, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);

// Die Blanko-Grundlage. Zwei Fehlerklassen, beide am 12.10.2026 an einer
// laufenden Instanz gemessen, beide stumm:
//
//   1. Ein eigenes rgb-Feld blockiert HAs Ableitung.
//   2. Ein var()-Verweis auf einen Namen, den es nicht gibt, loest zu nichts auf.
//
// Beide Male sieht die Theme-Datei vollstaendig aus, und im Browser kommt der
// falsche Wert an. Siehe CLAUDE.md.

import assert from "node:assert";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const pfad = path.join(hier, "../docs/beispiele/ha-blanko.yaml");
const text = readFileSync(pfad, "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Ein schmaler Leser statt einer YAML-Abhaengigkeit: die Datei ist flach genug.
function lies(quelle) {
  let block = "flach";
  const B = { flach: {}, hell: {}, dunkel: {} };
  for (const zeile of quelle.split("\n")) {
    if (/^ {4}light:\s*$/.test(zeile)) { block = "hell"; continue; }
    if (/^ {4}dark:\s*$/.test(zeile)) { block = "dunkel"; continue; }
    const m = /^ +([a-z0-9-]+):\s*(.*)$/.exec(zeile);
    if (m) B[block][m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return B;
}

// Was HA selbst auf dem html-Element definiert und deshalb nicht in der Theme
// stehen muss. Am 12.10.2026 aus document.styleSheets der laufenden Instanz
// gelesen - genau diese zehn rgb-Namen und primary-color.
const HA_EIGENE = new Set([
  "primary-color",
  "rgb-accent-color", "rgb-card-background-color", "rgb-error-color",
  "rgb-info-color", "rgb-primary-color", "rgb-primary-text-color",
  "rgb-secondary-text-color", "rgb-success-color", "rgb-text-primary-color",
  "rgb-warning-color",
]);

function toteVerweise(quelle) {
  const B = lies(quelle);
  const tot = [];
  for (const modus of ["hell", "dunkel"]) {
    const sicht = { ...B.flach, ...B[modus] };
    for (const [feld, wert] of Object.entries(sicht)) {
      for (const m of wert.matchAll(/var\(\s*--([a-z0-9-]+)/g)) {
        const ziel = m[1];
        if (sicht[ziel] || HA_EIGENE.has(ziel)) continue;
        // Die Palette und ihre Tripel leitet HA selbst ab.
        if (/^ha-color-(primary|neutral|red|green|orange)-(05|10|20|30|40|50|60|70|80|90|95)$/.test(ziel)) continue;
        if (/^ha-color-(black|white)$/.test(ziel)) continue;
        if (/^rgb-/.test(ziel)) continue;
        tot.push(`${modus}: ${feld} -> --${ziel}`);
      }
    }
  }
  return tot;
}

pruefe("Kein eigenes rgb-Feld in der Grundlage", () => {
  // HA rechnet den Tripel aus jedem Hex-Feld selbst, je Modus
  // (apply_themes_on_element.ts) - und ueberspringt den Namen, sobald die
  // Theme ihn mitbringt. Zehn flache rgb-Felder nagelten deshalb am
  // 12.10.2026 die Hell-Werte in den Dunkelmodus: --rgb-primary-text-color
  // blieb bei "33, 33, 33", obwohl --primary-text-color auf #e1e1e1 stand.
  // HAs Seitenleiste faerbt ihre Symbole mit rgba(var(--rgb-primary-text-color), .6)
  // und war damit unsichtbar - dunkelgrau auf #1c1c1c.
  const B = lies(text);
  for (const block of ["flach", "hell", "dunkel"]) {
    const treffer = Object.keys(B[block]).filter((k) => k.startsWith("rgb-"));
    assert.deepStrictEqual(treffer, [], `${block} traegt rgb-Felder: ${treffer}`);
  }
});

pruefe("Jeder var()-Verweis loest auf, in beiden Modi", () => {
  assert.deepStrictEqual(toteVerweise(text), []);
});

pruefe("Gegenprobe: ein toter Verweis wird gefunden", () => {
  // Ohne diese Probe koennte die Pruefung oben leer laufen und trotzdem gruen
  // melden. Genau diese zwei Tippfehler standen in der Datei:
  // --ha-color-90 statt --ha-color-neutral-90 und --ha-color-neutral-00,
  // eine Stufe, die es in der Palette nicht gibt.
  const kaputt = text.replace(
    'ha-color-surface-lower-inverted: "var(--ha-color-neutral-90)"',
    'ha-color-surface-lower-inverted: "var(--ha-color-90)"',
  );
  assert.notStrictEqual(kaputt, text, "Die Ersetzung hat nicht gegriffen");
  const tot = toteVerweise(kaputt);
  assert.strictEqual(tot.length, 1, `erwartet 1 toter Verweis, gefunden ${tot.length}`);
  assert.match(tot[0], /--ha-color-90$/);
});

pruefe("Gegenprobe: ein rgb-Feld wird gefunden", () => {
  const kaputt = text.replace(/^  red-color:/m, '  rgb-red-color: "244, 67, 54"\n  red-color:');
  const B = lies(kaputt);
  assert.deepStrictEqual(Object.keys(B.flach).filter((k) => k.startsWith("rgb-")), ["rgb-red-color"]);
});

pruefe("Die Palette kennt keine Stufe 00", () => {
  // Die elf Stufen heissen 05, 10, 20 ... 95. Ein var(--ha-color-neutral-00)
  // sieht daneben richtig aus und loest zu nichts auf.
  assert.doesNotMatch(text, /--ha-color-[a-z]+-00\b/);
});

pruefe("Die Bloecke haben die erwarteten Groessen", () => {
  // Nicht als Selbstzweck: Faellt ein Block auf null, pruefen die Tests
  // darueber nichts mehr und melden trotzdem gruen.
  const B = lies(text);
  assert.ok(Object.keys(B.flach).length > 200, "flach zu klein");
  assert.ok(Object.keys(B.hell).length > 20, "hell zu klein");
  assert.ok(Object.keys(B.dunkel).length > 100, "dunkel zu klein");
});

pruefe("Flach heisst: in beiden Modi gleich", () => {
  // Ein Feld, das flach UND in einem Modus steht, ist entweder doppelt
  // gemoppelt oder ein Fehler. Gemessen: darf nicht vorkommen.
  const B = lies(text);
  const doppelt = Object.keys(B.flach).filter((k) => k in B.hell || k in B.dunkel);
  assert.deepStrictEqual(doppelt, []);
});

console.log(`\n${n} Pruefungen bestanden.`);
if (n === 0) { console.error("Keine Pruefung gelaufen."); process.exit(1); }

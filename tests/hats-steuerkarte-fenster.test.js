// Das Fenster hinter dem Knopf `settings`: Modus, Vollbild, Transparenz und
// Schrift, Bewegung - auf Ansage vom 14.10.2026, "in der menueleiste nur ein
// icon machen und der rest in einem fenster".
//
// Geprueft wird das Lesen und Schreiben beider Reglergruppen in EINEM Zug,
// mit dem echten theme.js und hintergrund.js und der echten glaswerk.yaml.
// Die Erwartungen sind Textersetzungen in der Datei, keine Aufrufe der Module.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as theme from "../custom_components/hats/www/theme.js";
import * as hintergrund from "../custom_components/hats/www/hintergrund.js";
import {
  leseReglerAusDatei, schreibeReglerInDatei, leseBewegungAusDatei, leseDarstellungAusDatei,
  aktuellerModus, knopfZeile, badgeKurzform, FUNKTIONEN, TEXTE, BEWEGUNG_REGLER, DARSTELLUNG_REGLER,
} from "../custom_components/hats/www/hats-control-card.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const w = { ...theme, ...hintergrund };
const DATEI = readFileSync(path.join(hier, "../werkzeuge/themes/glaswerk.yaml"), "utf8");
const NAME = "glaswerk";
const HELL = '      ha-card-background: "rgba(255, 255, 255, 0.42)"';
const SKALA = '  ha-font-size-scale: "1"';

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

function ersetze(text, alt, neu) {
  const teile = text.split(alt);
  assert.strictEqual(teile.length, 2, `"${alt.trim()}" steht nicht genau einmal in der Datei`);
  return teile.join(neu);
}

// Die Dauern im Bewegungsblock, aus dem Text gelesen - mit einem eigenen
// Ausdruck, nicht mit dem der Module.
const dauern = (yaml) => [...yaml.matchAll(/hats-hintergrund-(drift|punkte|farbe)\s+(\d+)s/g)]
  .map((m) => `${m[1]}:${m[2]}`).sort().join(" ");

pruefe("settings ist eine Funktion der Karte, das Badge nimmt sie nicht", () => {
  assert.ok(FUNKTIONEN.includes("settings"));
  assert.throws(() => badgeKurzform({ buttons: [{ function: "settings" }] }));
  for (const spr of ["de", "en"]) assert.ok(TEXTE[spr].alles && TEXTE[spr].funktion.settings, spr);
  assert.strictEqual(knopfZeile({ function: "settings" }, 0, undefined, TEXTE.de).titel,
    "Einstellungen (alles in einem Fenster)");
});

pruefe("Das Fenster liest beide Gruppen in einem Zug - dasselbe wie jede fuer sich", () => {
  const alles = leseReglerAusDatei(DATEI, NAME, "light", "alles", w);
  assert.strictEqual(alles.grund, undefined, "abgewiesen: " + alles.grund);
  const b = leseBewegungAusDatei(DATEI, NAME, w);
  const d = leseDarstellungAusDatei(DATEI, NAME, "light", w);
  assert.deepStrictEqual(alles.werte, { ...b.werte, ...d.werte });
  assert.deepStrictEqual(Object.keys(alles.werte).sort(), [...BEWEGUNG_REGLER, ...DARSTELLUNG_REGLER].sort());
  assert.strictEqual(alles.werte.transparenz, 58);
  assert.strictEqual(alles.punktebild, b.punktebild);
  assert.deepStrictEqual(alles.karte, d.karte);
  // Gegenprobe: Die Datei traegt ueberhaupt eine Bewegung, sonst prueft der
  // Rest nur die Haelfte.
  assert.ok(dauern(DATEI), "glaswerk hat keinen Bewegungsblock");
});

pruefe("Nur Transparenz gezogen: genau die eine Zeile, der Bewegungsblock bleibt", () => {
  const { werte } = leseReglerAusDatei(DATEI, NAME, "light", "alles", w);
  const { yaml, grund } = schreibeReglerInDatei(DATEI, NAME, "light", { ...werte, transparenz: 50 },
    new Set(["transparenz"]), w);
  assert.strictEqual(grund, undefined);
  assert.strictEqual(yaml, ersetze(DATEI, HELL, '      ha-card-background: "rgba(255, 255, 255, 0.5)"'));
});

pruefe("Nur die Bewegung gezogen: der Block aendert sich, Flaeche und Schrift nicht", () => {
  const { werte } = leseReglerAusDatei(DATEI, NAME, "light", "alles", w);
  const farbe = werte.farbe === 5 ? 6 : 5;
  const { yaml } = schreibeReglerInDatei(DATEI, NAME, "light", { ...werte, farbe }, new Set(["farbe"]), w);
  assert.notStrictEqual(dauern(yaml), dauern(DATEI), "die Bewegung hat sich nicht geaendert");
  assert.ok(yaml.includes(HELL + "\n") && yaml.includes(SKALA + "\n"));
  assert.ok(!yaml.includes("mush-card-primary-font-size"), "Mushroom ohne Zug an der Schrift");
});

pruefe("Beide gezogen: beide Aenderungen in einer Datei", () => {
  const { werte } = leseReglerAusDatei(DATEI, NAME, "dark", "alles", w);
  const farbe = werte.farbe === 5 ? 6 : 5;
  const { yaml } = schreibeReglerInDatei(DATEI, NAME, "dark", { ...werte, farbe, schrift: 110 },
    new Set(["farbe", "schrift"]), w);
  assert.notStrictEqual(dauern(yaml), dauern(DATEI));
  assert.ok(yaml.includes('  ha-font-size-scale: "1.1"\n'));
  // Die Flaeche blieb, in beiden Modi.
  assert.ok(yaml.includes(HELL + "\n") && yaml.includes('      ha-card-background: "rgba(22, 28, 46, 0.46)"\n'));
});

pruefe("Nichts gezogen: die Datei bleibt Byte fuer Byte", () => {
  const { werte } = leseReglerAusDatei(DATEI, NAME, "light", "alles", w);
  assert.strictEqual(schreibeReglerInDatei(DATEI, NAME, "light", werte, new Set(), w).yaml, DATEI);
});

pruefe("Eine fremde Datei sperrt beide Gruppen, die einzelnen Fenster wie bisher", () => {
  const fremd = DATEI.replace(/^# Erzeugt mit HATS .*\n/m, "# von Hand\n");
  assert.notStrictEqual(fremd, DATEI);
  for (const art of ["alles", "bewegung", "darstellung"]) {
    assert.strictEqual(leseReglerAusDatei(fremd, NAME, "light", art, w).grund, "fremd", art);
  }
  assert.strictEqual(schreibeReglerInDatei(fremd, NAME, "light", { transparenz: 40 }, new Set(["transparenz"]), w).grund, "fremd");
  assert.strictEqual(schreibeReglerInDatei(fremd, NAME, "light", { farbe: 3 }, new Set(["farbe"]), w).grund, "fremd");
});

pruefe("Eine Flaeche aus Verlaeufen sperrt nur die Transparenz - die Bewegung schreibt weiter", () => {
  const glas = ersetze(DATEI, HELL, '      ha-card-background: "linear-gradient(red, blue)"');
  const stand = leseReglerAusDatei(glas, NAME, "light", "alles", w);
  assert.strictEqual(stand.karte.grund, "form");
  const { werte } = stand;
  const farbe = werte.farbe === 5 ? 6 : 5;
  const ok = schreibeReglerInDatei(glas, NAME, "light", { ...werte, farbe }, new Set(["farbe"]), w);
  assert.strictEqual(ok.grund, undefined);
  assert.strictEqual(schreibeReglerInDatei(glas, NAME, "light", { ...werte, transparenz: 40 },
    new Set(["transparenz"]), w).grund, "form");
});

pruefe("Der Modus kommt aus hass.themes.darkMode", () => {
  assert.strictEqual(aktuellerModus({ themes: { darkMode: true } }), "dark");
  assert.strictEqual(aktuellerModus({ themes: { darkMode: false } }), "light");
  assert.strictEqual(aktuellerModus(undefined), "light");
});

console.log(`\n${n} Pruefungen`);
if (n < 9) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

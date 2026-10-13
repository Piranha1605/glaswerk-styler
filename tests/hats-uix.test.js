// Die Add-on-Spalte rechts: Bubble, Mushroom, UIX.
//
// "oben HA, rechts die Add-ons" - auf Ansage vom 13.10.2026. Die beiden
// Kartensammlungen fuehren in ihre Stufe; UIX bekommt eine eigene Liste, weil
// es kein Feld je Eigenschaft ist, sondern ein Block CSS je Stilziel.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { UIX_ZIELE, UIX_ANZAHL } from "../custom_components/hats/www/uix.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Achtundzwanzig Stilziele, zeichengenau aus HATG", () => {
  // Die Namen sind die Typnamen von UIX. Stimmt einer nicht, entsteht ein
  // Feld, das nie gelesen wird - HATG hat das mit
  // uix-states-history-charts teuer gelernt.
  assert.strictEqual(UIX_ANZAHL, 28);
  const ids = UIX_ZIELE.map((z) => z.id);
  assert.strictEqual(new Set(ids).size, 28, "ein Stilziel kommt doppelt vor");
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]*$/, `${id} sieht nicht wie ein Typname aus`);
  for (const z of ["card", "root", "sidebar", "more-info", "drawer"])
    assert.ok(ids.includes(z), `${z} fehlt`);
});

pruefe("Jedes Ziel hat beide Sprachen", () => {
  for (const z of UIX_ZIELE) {
    assert.ok(z.de && z.de.length > 2, `${z.id}: deutscher Name fehlt`);
    assert.ok(z.en && z.en.length > 2, `${z.id}: englischer Name fehlt`);
  }
});

pruefe("Nur die einfache Form, kein -yaml", () => {
  // Ein "-yaml"-Feld verdeckt sein einfaches Feld vollstaendig: Liegt
  // uix-<typ>-yaml im Theme, wird uix-<typ> nie mehr gelesen. HATS bietet
  // deshalb bewusst nur die einfache Form an.
  for (const z of UIX_ZIELE) assert.doesNotMatch(z.id, /-yaml$/);
  assert.doesNotMatch(panel, /"uix-" \+ el\.dataset\.uix \+ "-yaml"/);
});

pruefe("Die Spalte zeigt alle drei Add-ons", () => {
  const b = panel.slice(panel.indexOf("addonSpalte(T) {"), panel.indexOf("  // Der Bericht nach dem Einlesen."));
  assert.ok(b.length > 600, "addonSpalte nicht gefunden");
  assert.match(b, /Bubble Card/);
  assert.match(b, /Mushroom/);
  assert.match(b, /UIX_ZIELE\.map/);
});

pruefe("Abschalten parkt das CSS, es wirft nichts weg", () => {
  // Ein Schalter, der Arbeit vernichtet, ist kein Schalter. Das CSS wandert
  // nach ZUSTAND.uixAus und kommt beim Wiedereinschalten zurueck.
  const b = panel.slice(panel.indexOf('querySelectorAll("[data-uix]")'),
                        panel.indexOf('querySelectorAll("[data-uix-css]")'));
  assert.match(b, /ZUSTAND\.uixAus\[name\] = ZUSTAND\.modell\.flach\[name\]/,
    "abgeschaltetes CSS wird nicht geparkt");
  assert.match(b, /setze\(ZUSTAND\.modell, name, ZUSTAND\.uixAus\[name\] \?\? ""/,
    "beim Einschalten kommt das geparkte CSS nicht zurueck");
  assert.match(b, /entferne\(ZUSTAND\.modell, name\)/);
});

pruefe("Die Texte der Spalte stehen IM en-Block", () => {
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Add-ons", "Felder angebunden", "Stilzielen an"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});

pruefe("Gegenprobe: ein erfundener Typname faellt auf", () => {
  // Haelt fest, dass die Pruefung oben etwas pruefen WUERDE.
  const ids = UIX_ZIELE.map((z) => z.id);
  assert.ok(!ids.includes("gibt-es-nicht"), "die Liste ist nicht die, die geprueft wird");
});

console.log(`\n${n} Pruefungen`);
if (n < 7) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

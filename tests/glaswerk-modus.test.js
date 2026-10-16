// Hell und Dunkel getrennt einstellen.
//
// Gefragt am 12.10.2026: "wie kann ich hell und dunkel getrennt einstellen".
// Antwort war: gar nicht - ob ein Feld flach steht oder je Modus, war in der
// Felddefinition festgeschrieben. Jetzt ist es eine Wahl, und die steht im
// MODELL, nicht in der Definition.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { teileAuf, fuehreZusammen, setze, wirksam, schreibeTheme, loeseFarbe } from "../custom_components/glaswerk/www/theme.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }
const leer = () => ({ name: "t", flach: {}, light: {}, dark: {}, kopf: [], unklar: [] });

pruefe("Aufteilen kopiert den Wert in BEIDE Modi", () => {
  // Das Kopieren ist der ganze Punkt. setze(..., "light") loescht den flachen
  // Eintrag und schreibt nur nach hell - der Dunkelmodus stuende danach ohne
  // Wert da, still und ohne Meldung.
  const m = leer();
  m.flach["accent-color"] = "#d74941";
  teileAuf(m, "accent-color");
  assert.strictEqual(m.flach["accent-color"], undefined, "der flache Eintrag ist noch da");
  assert.strictEqual(m.light["accent-color"], "#d74941");
  assert.strictEqual(m.dark["accent-color"], "#d74941");
});

pruefe("Gegenprobe: setze allein verliert den anderen Modus", () => {
  // Haelt fest, warum teileAuf noetig ist. Faellt das weg, ist die Funktion
  // ueberfluessig - und das soll man sehen.
  const m = leer();
  m.flach["accent-color"] = "#d74941";
  setze(m, "accent-color", "#d74941", "light");
  assert.strictEqual(m.dark["accent-color"], undefined,
    "setze() verliert den anderen Modus nicht mehr - teileAuf kann vereinfacht werden");
});

pruefe("Danach laesst sich ein Modus allein aendern", () => {
  const m = leer();
  m.flach["accent-color"] = "#d74941";
  teileAuf(m, "accent-color");
  setze(m, "accent-color", "#8fd92a", "dark");
  assert.strictEqual(wirksam(m, "light")["accent-color"], "#d74941");
  assert.strictEqual(wirksam(m, "dark")["accent-color"], "#8fd92a");
});

pruefe("Zusammenfuehren nimmt den Wert des gewaehlten Modus", () => {
  const m = leer();
  m.light["accent-color"] = "#d74941";
  m.dark["accent-color"] = "#8fd92a";
  fuehreZusammen(m, "accent-color", "dark");
  assert.strictEqual(m.flach["accent-color"], "#8fd92a");
  assert.strictEqual(m.light["accent-color"], undefined);
  assert.strictEqual(m.dark["accent-color"], undefined);
});

pruefe("Ein aufgeteiltes Feld landet wirklich unter modes", () => {
  // Bis in die Datei geprueft, nicht nur im Modell: Dort entscheidet sich, ob
  // Home Assistant es je Modus liest.
  const m = leer();
  m.flach["accent-color"] = "#d74941";
  teileAuf(m, "accent-color");
  setze(m, "accent-color", "#8fd92a", "dark");
  const yaml = schreibeTheme(m);
  assert.match(yaml, /modes:/);
  assert.match(yaml, /light:\n\s+accent-color: "#d74941"/);
  assert.match(yaml, /dark:\n\s+accent-color: "#8fd92a"/);
  assert.doesNotMatch(yaml.split("modes:")[0], /accent-color/, "das Feld steht noch flach");
});

pruefe("Die Oberflaeche bietet drei Knoepfe statt einem", () => {
  assert.match(panel, /\{ wert: "beide", name: T\("Beide Modi"\) \},\s*\n\s*\{ wert: "light", name: T\("Hell"\) \}/,
    "Hell und Dunkel fehlen in der Auswahl");
});

pruefe("Rollen bleiben flach, mit Begruendung am Knopf", () => {
  // Eine Rolle setzt elf Palettenstufen auf einmal, und HA rechnet daraus die
  // RGB-Tripel, aus denen Mushroom lebt. Eine halb aufgeteilte Rampe waere in
  // einem Modus unvollstaendig.
  assert.match(panel, /f\.rolle\s*\n?\s*\? \[\{ wert: "beide"/, "Rollen bekommen auch Hell und Dunkel");
  assert.match(panel, /titel: T\("Eine Rolle setzt elf Palettenstufen/, "ohne Begruendung sieht es nach einem Versehen aus");
});

pruefe("Der Modus kommt aus dem Modell, nicht aus der Felddefinition", () => {
  assert.match(panel, /stand\.wo === "je Modus"/, "der Stand wird nicht am Modell abgelesen");
  assert.match(panel, /const ebene = this\._feldModus === "dark"/,
    "aendere folgt wieder f.ebene statt der Wahl im Dialog");
});

pruefe("Die Begruendung steht IM en-Block", () => {
  const tabelle = panel.slice(panel.indexOf("const TEXTE = {"));
  const enBlock = tabelle.slice(tabelle.indexOf("en: {"), tabelle.indexOf("\n  },"));
  assert.ok(enBlock.includes("A role sets eleven palette steps"), "Uebersetzung fehlt oder steht daneben");
});


// ---------------------------------------------------------------------------
// Verweise bis zur Farbe verfolgen.

pruefe("Ein var()-Verweis wird bis zur Farbe aufgeloest", () => {
  const m = leer();
  m.flach["ha-color-primary-05"] = "#eef1fc";
  m.flach["ha-color-fill-primary-quiet-resting"] = "var(--ha-color-primary-05)";
  assert.strictEqual(
    loeseFarbe(m, m.flach["ha-color-fill-primary-quiet-resting"]), "#eef1fc");
});

pruefe("Eine Kette ueber mehrere Stufen auch", () => {
  const m = leer();
  m.flach.a = "#123456";
  m.flach.b = "var(--a)";
  m.flach.c = "var(--b)";
  assert.strictEqual(loeseFarbe(m, "var(--c)"), "#123456");
});

pruefe("Je Modus wird der richtige Wert verfolgt", () => {
  const m = leer();
  m.light["ha-color-neutral-10"] = "#eeeeee";
  m.dark["ha-color-neutral-10"] = "#202020";
  assert.strictEqual(loeseFarbe(m, "var(--ha-color-neutral-10)", "light"), "#eeeeee");
  assert.strictEqual(loeseFarbe(m, "var(--ha-color-neutral-10)", "dark"), "#202020");
});

pruefe("Ein Kreis haengt die Oberflaeche nicht auf", () => {
  // Ohne Tiefenbegrenzung laeuft das endlos, und das Panel friert ein.
  const m = leer();
  m.flach.a = "var(--b)";
  m.flach.b = "var(--a)";
  assert.strictEqual(loeseFarbe(m, "var(--a)"), null);
});

pruefe("Was keine Farbe ist, bleibt null", () => {
  const m = leer();
  m.flach.x = "blur(18px)";
  assert.strictEqual(loeseFarbe(m, "var(--x)"), null);
  assert.strictEqual(loeseFarbe(m, "var(--gibtsnicht)"), null);
  assert.strictEqual(loeseFarbe(m, ""), null);
});

pruefe("Ein direkter Hexwert kommt unveraendert zurueck", () => {
  assert.strictEqual(loeseFarbe(leer(), "#8fd92a"), "#8fd92a");
  assert.strictEqual(loeseFarbe(leer(), "rgba(0,0,0,.5)"), "rgba(0,0,0,.5)");
});

console.log(`\n${n} Pruefungen`);
if (n < 15) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

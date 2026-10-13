// Die Ein- und Ausgaberoutine.
//
// HATS wirft beim Lesen nichts weg - leseTheme legt jedes Feld ins Modell,
// schreibeTheme gibt es wieder aus. Was lange fehlte, war nicht die
// Faehigkeit, sondern die AUSKUNFT: Ohne Bericht glaubt man, ein Feld sei weg,
// nur weil keine Kachel dafuer da ist.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { leseTheme, schreibeTheme, berichtUeberTheme } from "../custom_components/hats/www/theme.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const FREMD = `# Irgendein anderes Werkzeug
fremde_theme:
  primary-color: "#ff0000"
  voellig-unbekannt: "17px"
  uix-card: "ha-card { border: 0 }"

  modes:
    light:
      card-background-color: "#ffffff"
    dark:
      card-background-color: "#111111"
`;

pruefe("Eine fremde Theme wird vollstaendig gelesen", () => {
  const m = leseTheme(FREMD);
  assert.ok(!m.fehler, m.fehler);
  assert.strictEqual(m.name, "fremde_theme");
  assert.strictEqual(m.flach["voellig-unbekannt"], "17px");
  assert.strictEqual(m.dark["card-background-color"], "#111111");
});

pruefe("Was HATS nicht kennt, kommt unveraendert wieder heraus", () => {
  // Der Kern des Ganzen: Ein unbekanntes Feld zu BEHALTEN ist wichtiger, als
  // es zu verstehen. Wer eine fremde Theme hier oeffnet und speichert, darf
  // nichts verlieren.
  const m = leseTheme(FREMD);
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(zurueck.flach["voellig-unbekannt"], "17px");
  assert.strictEqual(zurueck.flach["uix-card"], "ha-card { border: 0 }");
  assert.strictEqual(zurueck.light["card-background-color"], "#ffffff");
  assert.strictEqual(zurueck.dark["card-background-color"], "#111111");
});

pruefe("Der Bericht trennt bedienbar von mitgenommen", () => {
  const m = leseTheme(FREMD);
  const b = berichtUeberTheme(m, new Set(["primary-color", "card-background-color"]));
  assert.strictEqual(b.felder, 4);
  assert.deepStrictEqual(b.bedienbar, ["card-background-color", "primary-color"]);
  assert.deepStrictEqual(b.mitgenommen, ["uix-card", "voellig-unbekannt"]);
});

pruefe("Stilziele fremder Werkzeuge werden benannt", () => {
  // Ein Theme mit uix- oder card-mod-Feldern gehoert HATG. Wer es hier
  // bearbeitet, verliert die Vorlagenpflege - das gehoert gesagt, nicht
  // stillschweigend hingenommen.
  const b = berichtUeberTheme(leseTheme(FREMD), new Set());
  assert.deepStrictEqual(b.stilziele, ["uix-card"]);
});

pruefe("Zeilen, die verloren gehen, werden gemeldet", () => {
  // Das Einzige, was beim Lesen wirklich wegfaellt. Deshalb steht es im
  // Bericht rot und mit Namen.
  const m = leseTheme("x:\n  a: 1\n  das hier ist kein feld\n");
  const b = berichtUeberTheme(m, new Set(["a"]));
  assert.strictEqual(b.unklar.length, 1);
  assert.match(b.unklar[0], /kein feld/);
});

pruefe("Gegenprobe: eine saubere Datei meldet nichts Unklares", () => {
  const b = berichtUeberTheme(leseTheme(FREMD), new Set());
  assert.deepStrictEqual(b.unklar, []);
});

pruefe("Die Zaehlung je Ebene stimmt", () => {
  const b = berichtUeberTheme(leseTheme(FREMD), new Set());
  assert.strictEqual(b.flach, 3);
  assert.strictEqual(b.hell, 1);
  assert.strictEqual(b.dunkel, 1);
  // 4, nicht 5: card-background-color steht in beiden Modi, ist aber EIN Feld.
  assert.strictEqual(b.felder, 4);
});

pruefe("Fremde Dateien sind nicht mehr gesperrt", () => {
  assert.doesNotMatch(panel, /zeile datei gesperrt/,
    "fremde Dateien lassen sich wieder nicht oeffnen");
  assert.match(panel, /class="weg importieren"/, "der dritte Startweg fehlt");
});

pruefe("Es gibt einen Ausgang ausser Speichern", () => {
  assert.match(panel, /herunterladen\(\) \{/, "Herunterladen fehlt");
  assert.match(panel, /async kopieren\(\) \{/, "Kopieren fehlt");
  // Der Dateiname ist der Theme-Name: Beim Zurueckspielen ist er der
  // Schluessel, und ein falscher legt eine zweite Theme an.
  assert.match(panel, /a\.download = `\$\{name\}\.yaml`/);
});

pruefe("Die Texte des Berichts stehen IM en-Block", () => {
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Datei oder Text", "Gelesen", "Einlesen", "Als Datei herunterladen", "lesen"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});


// ---------------------------------------------------------------------------
// Mehrzeilige Werte. Beim ersten Import einer HATG-Theme am 13.10.2026 meldete
// der Bericht 155 unlesbare Zeilen - es war der Rumpf von uix-Blöcken.

const CSS = ':host(ha-card) {\n  border: 0;\n  /* ein Kommentar */\n}\nha-card { color: red }';

pruefe("Ein mehrzeiliger Wert ueberlebt den Rundlauf", () => {
  const m = { name: "x", flach: { "uix-card": CSS }, light: {}, dark: {}, kopf: [], unklar: [] };
  const yaml = schreibeTheme(m);
  assert.match(yaml, /uix-card: \|-\n/, "kein Blockskalar geschrieben");
  const zurueck = leseTheme(yaml);
  assert.strictEqual(zurueck.flach["uix-card"], CSS);
  assert.deepStrictEqual(zurueck.unklar, [], "Zeilen gingen verloren");
});

pruefe("Auch je Modus, mit der tieferen Einrueckung", () => {
  const m = { name: "x", flach: {}, light: { "uix-root": CSS }, dark: { "uix-root": "a {\n  b: 1\n}" },
              kopf: [], unklar: [] };
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(zurueck.light["uix-root"], CSS);
  assert.strictEqual(zurueck.dark["uix-root"], "a {\n  b: 1\n}");
});

pruefe("Ein abschliessender Umbruch bleibt erhalten, oder eben nicht", () => {
  // "|" haengt beim Lesen einen Umbruch an, "|-" nicht. Wer das verwechselt,
  // bekommt bei jedem Durchlauf eine Leerzeile mehr.
  const mit = { name: "x", flach: { a: "eins\nzwei\n" }, light: {}, dark: {}, kopf: [], unklar: [] };
  const ohne = { name: "x", flach: { a: "eins\nzwei" }, light: {}, dark: {}, kopf: [], unklar: [] };
  assert.match(schreibeTheme(mit), /a: \|\n/);
  assert.match(schreibeTheme(ohne), /a: \|-\n/);
  assert.strictEqual(leseTheme(schreibeTheme(mit)).flach.a, "eins\nzwei\n");
  assert.strictEqual(leseTheme(schreibeTheme(ohne)).flach.a, "eins\nzwei");
});

pruefe("Leerzeilen im Block bleiben stehen", () => {
  const w = "eins\n\ndrei";
  const m = { name: "x", flach: { a: w }, light: {}, dark: {}, kopf: [], unklar: [] };
  assert.strictEqual(leseTheme(schreibeTheme(m)).flach.a, w);
});

pruefe("Ein Block beendet sich am naechsten Feld, nicht am Dateiende", () => {
  const m = { name: "x", flach: { a: "eins\nzwei", b: "#fff" }, light: {}, dark: {}, kopf: [], unklar: [] };
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(zurueck.flach.a, "eins\nzwei");
  assert.strictEqual(zurueck.flach.b, "#fff");
});

pruefe("Idempotent: der zweite Durchlauf aendert nichts", () => {
  const m = { name: "x", flach: { "uix-card": CSS, c: "#111" },
              light: { "uix-root": CSS }, dark: {}, kopf: ["Kopf"], unklar: [] };
  const eins = schreibeTheme(m);
  const zwei = schreibeTheme(leseTheme(eins));
  assert.strictEqual(eins, zwei);
});

pruefe("Gegenprobe: ohne Blockskalar waere es kaputt", () => {
  // Haelt fest, warum schreibeWert existiert. quote() legt die Umbrueche
  // mitten in einen gequoteten Skalar - YAML faltet die zu Leerzeichen.
  const falsch = `x:\n  a: ${JSON.stringify(CSS).replace(/\\n/g, "\n")}\n`;
  const gelesen = leseTheme(falsch);
  assert.notStrictEqual(gelesen.flach.a, CSS, "der naive Weg funktioniert doch - schreibeWert waere unnoetig");
});


// ---------------------------------------------------------------------------
// Die Schalterreihe oben links.

pruefe("Fuenf runde Schalter, immer im Markup", () => {
  // "Immer sichtbar" heisst: auch auf dem Startbild. Was dort nicht greift,
  // ist gedaempft statt weg - ein Knopf, der mal da ist und mal nicht, laesst
  // einen suchen.
  const block = panel.slice(panel.indexOf('<div class="schalter">'), panel.indexOf('<header class="kopf">'));
  const ids = [...block.matchAll(/id: "([a-z0-9]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(ids, ["oeffnen", "verwerfen", "speichern2", "laden2", "kopie2"]);
  assert.match(block, /ha-icon icon="\$\{k\.icon\}"/, "die Schalter tragen keine Symbole");
  assert.doesNotMatch(block, /ZUSTAND\.start \? "" :/, "die Reihe verschwindet auf dem Startbild");
});

pruefe("Rund, nicht eckig", () => {
  const css = panel.slice(panel.indexOf(".schalterknopf {"), panel.indexOf(".schalterknopf {") + 400);
  assert.match(css, /border-radius: 50%/);
});

pruefe("Verwerfen geht auf den Stand beim Oeffnen zurueck", () => {
  // _grundlage haelt die Datei, wie sie hereinkam - nicht die leere Vorlage.
  // Mit der falschen Quelle waere "verwerfen" ein Datenverlust.
  const b = panel.slice(panel.indexOf("  verwerfen() {"), panel.indexOf("  async neuBeginnen("));
  assert.match(b, /ZUSTAND\.modell = JSON\.parse\(JSON\.stringify\(this\._grundlage\)\)/);
  assert.match(b, /ZUSTAND\.geaendert\.clear\(\)/);
});

pruefe("Oeffnen fragt bei Ungespeichertem nach", () => {
  const b = panel.slice(panel.indexOf("  zumStart() {"), panel.indexOf("  verwerfen() {"));
  assert.match(b, /ZUSTAND\.geaendert\.size && !this\._startBestaetigt/,
    "zumStart wirft Ungespeichertes ohne Rueckfrage weg");
});

pruefe("Die Texte der Schalter stehen IM en-Block", () => {
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Oeffnen", "Aenderungen verwerfen", "Aenderungen verworfen"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});

console.log(`\n${n} Pruefungen`);
if (n < 22) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

// Der Regler fuer die Bewegung des Hintergrunds: Die Steuerkarte schreibt
// damit eine Theme-Datei - als erstes Bauteil ausserhalb des Panels.
//
// Geprueft wird die Strecke vom Text der Datei zum neuen Text der Datei, mit
// den ECHTEN Modulen theme.js und hintergrund.js und mit der echten Theme aus
// dem Repository. Was die Karte dabei verspricht:
//
//   - sie aendert nur den einen Block
//   - sie schreibt, was das Panel auch schriebe, und liest es wieder
//   - sie fasst keine Datei an, bei der etwas verloren gehen koennte
//
// Die Gegenprobe am Ende laeuft mit PyYAML - dem Parser, den Home Assistant
// beim Start benutzt. Eine Theme-Datei, die er nicht liest, kostet nicht ein
// Feld, sondern den Start.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as theme from "../custom_components/glaswerk/www/theme.js";
import * as hintergrund from "../custom_components/glaswerk/www/hintergrund.js";
import { leseBewegungAusDatei, schreibeBewegungInDatei, ausschlagStelle, AUSSCHLAEGE, FUNKTIONEN }
  from "../custom_components/glaswerk/www/glaswerk-bar.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.join(hier, "..");
const w = { ...theme, ...hintergrund };
const DATEI = readFileSync(path.join(wurzel, "werkzeuge/themes/liquid_glass.yaml"), "utf8");
const NAME = "liquid_glass";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Der Block der Bewegung, aus dem Text herausgeschnitten - mit einem eigenen
// Ausdruck, nicht mit dem der Module.
const BLOCK = /[ \t]*\/\* Glaswerk:hintergrund-bewegung:START \*\/[\s\S]*?\/\* Glaswerk:hintergrund-bewegung:ENDE \*\/[ \t]*\n?/g;
const ohneBlock = (yaml) => {
  const m = theme.leseTheme(yaml);
  m.flach["uix-root"] = String(m.flach["uix-root"] ?? "").replace(BLOCK, "").replace(/\n{3,}/g, "\n\n").trim();
  return JSON.stringify([m.name, m.kopf, m.flach, m.light, m.dark]);
};
const dauer = (yaml, name) => {
  const t = new RegExp(`glaswerk-hintergrund-${name}\\s+(\\d+)s`).exec(yaml);
  return t ? Number(t[1]) : null;
};

pruefe("Die Theme aus dem Repository laesst sich lesen, und sie ist von Glaswerk", () => {
  const stand = leseBewegungAusDatei(DATEI, NAME, w);
  assert.strictEqual(stand.grund, undefined, "abgewiesen: " + stand.grund);
  assert.strictEqual(typeof stand.punktebild, "boolean");
  for (const k of ["drift", "punkte", "farbe", "weite"]) assert.strictEqual(typeof stand.werte[k], "number", k);
});

pruefe("Die gelesenen Stufen passen zu den Dauern, die in der Datei stehen", () => {
  // Unabhaengig nachgerechnet: Stufe = Basis / Dauer, die Basen stehen in
  // hintergrund.js als Formel (60, 240, 300) und im Brief von Glaswerk Aufbau.
  const { werte } = leseBewegungAusDatei(DATEI, NAME, w);
  const soll = (name, basis) => { const d = dauer(DATEI, name); return d ? Math.min(10, Math.max(1, Math.round(basis / d))) : 0; };
  assert.strictEqual(werte.drift, soll("drift", 60));
  assert.strictEqual(werte.punkte, soll("punkte", 240));
  assert.strictEqual(werte.farbe, soll("farbe", 300));
  // Gegenprobe: Die Datei traegt ueberhaupt eine Bewegung, sonst prueft das nichts.
  assert.ok(werte.drift + werte.punkte + werte.farbe > 0, "die Theme hat keine Bewegung - andere Datei nehmen");
});

pruefe("Schreiben aendert nur den einen Block", () => {
  const { werte } = leseBewegungAusDatei(DATEI, NAME, w);
  const neu = schreibeBewegungInDatei(DATEI, NAME, { ...werte, farbe: werte.farbe === 3 ? 4 : 3 }, w);
  assert.strictEqual(neu.grund, undefined);
  assert.notStrictEqual(neu.yaml, DATEI, "es wurde gar nichts geaendert");
  assert.strictEqual(ohneBlock(neu.yaml), ohneBlock(DATEI), "ausserhalb des Blocks hat sich etwas geaendert");
});

pruefe("Ab dem zweiten Durchlauf aendert sich nichts mehr", () => {
  const { werte } = leseBewegungAusDatei(DATEI, NAME, w);
  const eins = schreibeBewegungInDatei(DATEI, NAME, werte, w).yaml;
  const zwei = schreibeBewegungInDatei(eins, NAME, leseBewegungAusDatei(eins, NAME, w).werte, w).yaml;
  const drei = schreibeBewegungInDatei(zwei, NAME, leseBewegungAusDatei(zwei, NAME, w).werte, w).yaml;
  assert.strictEqual(zwei, drei);
  assert.strictEqual(eins, zwei, "schon der erste Durchlauf ist nicht stabil");
});

pruefe("Was geschrieben wird, liest die Karte wieder - und das Panel auch", () => {
  const ziel = { drift: 2, punkte: 0, farbe: 5, weite: 180 };
  const neu = schreibeBewegungInDatei(DATEI, NAME, ziel, w);
  const zurueck = leseBewegungAusDatei(neu.yaml, NAME, w).werte;
  assert.deepStrictEqual(zurueck, ziel);
  assert.deepStrictEqual(neu.werte, ziel);
  // Das Panel liest mit leseBewegung auf dem Feld uix-root - derselbe Weg.
  assert.deepStrictEqual(hintergrund.leseBewegung(theme.leseTheme(neu.yaml).flach["uix-root"]), ziel);
  // Und in der Datei stehen die Dauern, die das Panel dafuer nennt.
  assert.strictEqual(dauer(neu.yaml, "drift"), hintergrund.driftDauer(2));
  assert.strictEqual(dauer(neu.yaml, "farbe"), hintergrund.farbDauer(5));
  assert.strictEqual(dauer(neu.yaml, "punkte"), null);
});

pruefe("Alles auf null nimmt den Block ganz heraus - und nur ihn", () => {
  const neu = schreibeBewegungInDatei(DATEI, NAME, { drift: 0, punkte: 0, farbe: 0, weite: 40 }, w);
  assert.ok(!/hintergrund-bewegung/.test(neu.yaml), "der Block steht noch da");
  assert.strictEqual(ohneBlock(neu.yaml), ohneBlock(DATEI));
  assert.deepStrictEqual(leseBewegungAusDatei(neu.yaml, NAME, w).werte, { drift: 0, punkte: 0, farbe: 0, weite: 40 });
  // Gegenprobe: Das Stilziel selbst bleibt, wenn dort noch anderes steht.
  const rest = theme.leseTheme(neu.yaml).flach["uix-root"];
  const vorher = theme.leseTheme(DATEI).flach["uix-root"].replace(BLOCK, "").trim();
  assert.strictEqual(Boolean(rest), Boolean(vorher));
});

pruefe("Punkte gibt es nur auf einem Punktebild", () => {
  const { modell } = leseBewegungAusDatei(DATEI, NAME, w);
  // Dieselbe Theme mit einem Foto statt der Punkte.
  for (const ebene of [modell.flach, modell.light, modell.dark]) {
    if (ebene["lovelace-background"]) ebene["lovelace-background"] = 'center / cover no-repeat url("/local/glaswerk/foto.jpg") fixed';
  }
  const mitFoto = theme.schreibeTheme(modell);
  const stand = leseBewegungAusDatei(mitFoto, NAME, w);
  assert.strictEqual(stand.punktebild, false);
  const neu = schreibeBewegungInDatei(mitFoto, NAME, { drift: 3, punkte: 7, farbe: 0, weite: 40 }, w);
  assert.strictEqual(neu.werte.punkte, 0, "die Punkte wurden auf ein Foto geschrieben");
  assert.strictEqual(dauer(neu.yaml, "punkte"), null);
  assert.strictEqual(dauer(neu.yaml, "drift"), hintergrund.driftDauer(3));
});

pruefe("Abgewiesen wird, was sich nicht ohne Verlust schreiben laesst", () => {
  const grund = (text, name = NAME) => leseBewegungAusDatei(text, name, w).grund;
  // Eine fremde Theme - kein "Erzeugt mit Glaswerk" im Kopf.
  assert.strictEqual(grund(DATEI.replace(/^# Erzeugt mit Glaswerk.*\n/m, "")), "fremd");
  // Die Datei traegt eine andere Theme als die wirksame.
  assert.strictEqual(grund(DATEI, "etwas_anderes"), "name");
  // Eine Zeile, die der Leser nicht einordnen kann, waere nach dem Schreiben weg.
  assert.strictEqual(grund(DATEI.replace(/\nliquid_glass:\n/, "\nliquid_glass:\n  - das ist keine Zeile einer Theme\n")), "unklar");
  // Gar keine Theme.
  assert.strictEqual(grund("# nur ein Kommentar\n"), "unlesbar");
  // Und Schreiben gibt denselben Grund zurueck statt einer Datei.
  const versuch = schreibeBewegungInDatei(DATEI, "etwas_anderes", { drift: 1, punkte: 0, farbe: 0, weite: 40 }, w);
  assert.strictEqual(versuch.grund, "name");
  assert.strictEqual(versuch.yaml, undefined);
  // Gegenprobe: Die unveraenderte Datei geht durch.
  assert.strictEqual(grund(DATEI), undefined);
});

pruefe("Der Ausschlag liegt auf dem Raster des Panels", () => {
  const seite = readFileSync(path.join(wurzel, "custom_components/glaswerk/www/hintergrund-seite.js"), "utf8");
  const m = /export const AUSSCHLAEGE = \[([^\]]+)\];/.exec(seite);
  assert.ok(m, "AUSSCHLAEGE in hintergrund-seite.js nicht gefunden");
  assert.deepStrictEqual(AUSSCHLAEGE, m[1].split(",").map((x) => Number(x.trim())));
  assert.strictEqual(ausschlagStelle(90), AUSSCHLAEGE.indexOf(90));
  assert.strictEqual(ausschlagStelle(360), AUSSCHLAEGE.length - 1);
  // Ein Wert neben dem Raster zeigt auf die naechste Stelle.
  assert.strictEqual(AUSSCHLAEGE[ausschlagStelle(100)], 90);
  assert.strictEqual(AUSSCHLAEGE[ausschlagStelle(5)], 20);
});

pruefe("motion ist eine Funktion der Karte", () => {
  assert.ok(FUNKTIONEN.includes("motion"));
});

pruefe("Gegenprobe mit PyYAML: Home Assistant liest, was die Karte schreibt", () => {
  const faelle = [
    { drift: 4, punkte: 10, farbe: 8, weite: 90 },
    { drift: 0, punkte: 0, farbe: 10, weite: 360 },
    { drift: 0, punkte: 0, farbe: 0, weite: 40 },
  ];
  for (const werte of faelle) {
    const { yaml } = schreibeBewegungInDatei(DATEI, NAME, werte, w);
    let aus;
    try {
      aus = execFileSync("python3", ["-c",
        "import sys, yaml, json\nd = yaml.safe_load(sys.stdin.read())\nt = d['liquid_glass']\nprint(json.dumps([sorted(d), len(t), t.get('uix-theme'), 'hintergrund-bewegung' in str(t.get('uix-root', ''))]))"],
        { input: yaml, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    } catch (e) {
      assert.fail("PyYAML liest die Datei nicht: " + String(e.stderr || e.message).trim().split("\n").slice(-3).join(" | "));
    }
    const [themes, felder, schalter, hatBlock] = JSON.parse(aus);
    assert.deepStrictEqual(themes, ["liquid_glass"]);
    assert.ok(felder > 100, `nur ${felder} Felder`);
    // Ohne uix-theme kaeme keine Vorlage an - auch die Bewegung nicht.
    assert.strictEqual(schalter, "liquid_glass");
    assert.strictEqual(hatBlock, werte.drift + werte.punkte + werte.farbe > 0);
  }
});

console.log(`\n${n} Pruefungen`);
if (n < 11) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

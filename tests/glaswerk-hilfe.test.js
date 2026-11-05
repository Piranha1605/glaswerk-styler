// Die Hilfeseite: was die Saetze einhalten muessen
//
// Drei Fehler aus dem ersten Wurf stehen hier als Pruefung, alle drei am
// 15.10.2026 an der laufenden Seite gesehen und keiner davon im Browser
// erkennbar als Fehler - die Seite sah jedes Mal fertig aus:
//
//   1. Die Bilder blieben leer. Ein relativer Import loest sich gegen die
//      Adresse SEINES Moduls auf, ein src im Markup gegen die der SEITE. Die
//      fuenf Bilder wurden also unter /hilfe/ gesucht statt unter
//      /glaswerk_static/<summe>/hilfe/ - und ein fehlendes Bild tut in HTML nichts.
//   2. Fuenf Merksaetze und alle drei Auslesen trugen ein doppelt gefluchtetes
//      \n. Das Panel tauscht \n gegen <br>; ein literales Backslash-n trifft
//      der Austausch nicht, und der Leser sah den Backslash im Text.
//   3. Die Saetze standen nur auf Deutsch. Die Hilfeseite ist Dokumentation.
//
// Jede Pruefung hat ihre Gegenprobe: Sie laeuft noch einmal gegen eine Kopie
// mit genau dem Fehler und muss dann rot werden.

import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { ERKLAERUNGEN, MERKSAETZE, AUSLESEN } from "../custom_components/glaswerk/www/hilfe.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }
function mussRotWerden(was, fn) {
  let rot = false;
  try { fn(); } catch { rot = true; }
  assert.ok(rot, `Gegenprobe: ${was} - der Fehler kam durch`);
}

const PANEL = readFileSync(new URL("../custom_components/glaswerk/www/glaswerk-panel.js", import.meta.url), "utf8");
const BILDER = new URL("../custom_components/glaswerk/www/hilfe/", import.meta.url);

// Die Pruefungen stehen als Funktionen da, damit die Gegenprobe dieselbe
// Funktion gegen eine veraenderte Kopie fahren kann - nicht eine nachgebaute.
const beideSprachen = (erk) => {
  for (const [v, e] of Object.entries(erk)) {
    assert.ok(e && typeof e === "object", `${v}: kein Objekt mit de und en`);
    for (const spr of ["de", "en"])
      assert.ok(typeof e[spr] === "string" && e[spr].length > 2, `${v}: ${spr} fehlt`);
  }
};

const keinLiteralesN = (merk, les) => {
  for (const m of merk)
    for (const spr of ["de", "en"])
      assert.ok(!m[spr].text.includes("\\n"),
        `${m[spr].titel}: literales Backslash-n - der Leser sieht den Backslash`);
  for (const a of les)
    for (const spr of ["de", "en"])
      assert.ok(!a[spr].text.includes("\\n"), `${a[spr].titel}: literales Backslash-n im Text`);
};

pruefe("Jede Erklaerung steht auf Deutsch und auf Englisch", () => {
  beideSprachen(ERKLAERUNGEN);
  assert.ok(Object.keys(ERKLAERUNGEN).length > 70, "die Saetze sind weniger geworden");
});
mussRotWerden("ein Satz nur auf Deutsch", () =>
  beideSprachen({ ...ERKLAERUNGEN, "--probe": { de: "nur deutsch" } }));

pruefe("Merksaetze und Auslesen stehen in beiden Sprachen", () => {
  for (const m of MERKSAETZE)
    for (const spr of ["de", "en"]) {
      assert.ok(m[spr] && m[spr].titel && m[spr].text, `Merksatz ohne ${spr}`);
      assert.notStrictEqual(m[spr].titel, undefined);
    }
  for (const a of AUSLESEN)
    for (const spr of ["de", "en"])
      assert.ok(a[spr] && a[spr].titel && a[spr].text, `Auslesen ohne ${spr}`);
  // Ein kopierter deutscher Satz waere keine Uebersetzung.
  for (const m of MERKSAETZE)
    assert.notStrictEqual(m.de.text, m.en.text, `${m.de.titel}: en ist eine Kopie von de`);
});

pruefe("Kein literales Backslash-n in Merksaetzen und Auslesen", () => {
  keinLiteralesN(MERKSAETZE, AUSLESEN);
  // Gegenprobe zur Gegenprobe: Es gibt ueberhaupt mehrzeilige Texte, sonst
  // pruefte der Satz oben ins Leere.
  assert.ok(MERKSAETZE.filter((m) => m.de.text.includes("\n")).length >= 5,
    "keine mehrzeiligen Merksaetze - die Pruefung traefe nichts");
});
mussRotWerden("ein Merksatz mit doppelt gefluchtetem n", () =>
  keinLiteralesN([{ de: { titel: "x", text: "a\\nb" }, en: { titel: "x", text: "a" } }], []));

pruefe("Im Code der Auslesen darf ein Backslash-n stehen", () => {
  // Das letzte Beispiel verbindet Stilblaetter mit join('\n') - dort gehoert
  // der Backslash hin. Die Pruefung oben fasst deshalb nur den TEXT an.
  const mit = AUSLESEN.filter((a) => a.code.includes("\\n"));
  assert.strictEqual(mit.length, 1, "das join-Beispiel ist weg oder doppelt");
  assert.ok(AUSLESEN.every((a) => a.code.includes("\n")), "ein Beispiel ist einzeilig geworden");
});

pruefe("Jedes genannte Bild liegt auch da", () => {
  const bilder = MERKSAETZE.map((m) => m.bild).filter(Boolean);
  assert.strictEqual(bilder.length, 5, "es sind nicht mehr fuenf Bilder");
  for (const b of bilder)
    assert.ok(existsSync(new URL(b, BILDER)), `${b} fehlt in www/hilfe/`);
});

pruefe("Die Bildadresse haengt am Modul, nicht an der Seite", () => {
  // Der Fehler, der die Bilder leer liess. Das Panel liegt unter
  // /glaswerk_static/<summe>/, die Seite unter /glaswerk - ein "./hilfe/..." im
  // Markup zeigt deshalb ins Leere.
  assert.match(PANEL, /const HILFE_BILDER = new URL\("\.\/hilfe\/", import\.meta\.url\)/,
    "die Bildadresse wird nicht mehr aus import.meta.url gerechnet");
  assert.doesNotMatch(PANEL, /<img src="\.\/hilfe\//,
    "ein Bild haengt wieder an der Adresse der Seite");
  assert.match(PANEL, /<img src="\$\{HILFE_BILDER\}/, "die Bilder benutzen die Adresse nicht");
});

pruefe("Saetze ohne Feld im Panel fallen nicht stumm weg", () => {
  // 17 Saetze beschreiben Felder, die HA kennt und Glaswerk nicht anbietet. Ohne
  // die Liste am Ende waeren sie in der Datei und nirgends zu sehen.
  assert.match(PANEL, /const fremd = Object\.keys\(ERKLAERUNGEN\)\.filter\(\(v\) => !benutzt\.has\(v\)\)/,
    "die verwaisten Saetze werden nicht mehr gesammelt");
  assert.match(PANEL, /\$\{ohneKachel\}/, "die Liste wird nicht ausgegeben");
  assert.match(PANEL, /benutzt\.add\(f\.v\)/, "es wird nicht mitgeschrieben, welches Feld eine Kachel hat");
});

pruefe("Die Beschriftung der Seite gibt es auf Englisch", () => {
  const en = PANEL.slice(PANEL.indexOf("const TEXTE = {"));
  for (const s of ["Was macht welche Variable?", "mit Satz", "noch offen", "noch kein Satz",
                   "Kennt Home Assistant, bietet Glaswerk nicht an"])
    assert.ok(en.includes(`"${s}":`), `"${s}" steht nicht in TEXTE.en`);
});

console.log(`\n${n} Pruefungen`);

// Vorlagen: ein Block CSS zwischen zwei Markern, an- und abschaltbar.
//
// Jede Pruefung hier steht fuer einen Fehler, den HATG schon gemacht hat.
// Die teuersten drei: eine Vorlage lag 23-mal in derselben Theme, weil eine
// umbenannte Kopie unter fremder Vorsilbe nicht erkannt wurde; ein Schalter
// warf das CSS daneben mit weg; und ein Block wuchs bei jedem Durchlauf.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  leeresModell, setze, schreibeTheme, leseTheme,
  vorlageAn, vorlageAus, vorlageIstAn, vereinheitlicheVorlagen, vorlagenImTheme, vorlagenMarke,
} from "../custom_components/hats/www/theme.js";

const hier = path.dirname(fileURLToPath(import.meta.url));

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const V = { id: "glas-karten", ziel: "card", css: "ha-card { border-radius: 28px; }" };
const W = { id: "glas-leiste", ziel: "card", css: "ha-card { opacity: .9; }" };

pruefe("Einschalten legt den Block an, Abschalten raeumt das Feld", () => {
  const m = leeresModell("t");
  assert.strictEqual(vorlageIstAn(m, V), false);
  vorlageAn(m, V);
  assert.strictEqual(vorlageIstAn(m, V), true);
  assert.match(m.flach["uix-card"], /\/\* HATS:glas-karten:START \*\//);
  assert.match(m.flach["uix-card"], /border-radius: 28px/);
  vorlageAus(m, V);
  assert.strictEqual(vorlageIstAn(m, V), false);
  // Ein leeres uix-Feld waere Ballast - UIX legt dafuer trotzdem einen Knoten an.
  assert.ok(!("uix-card" in m.flach), "das leere Feld blieb stehen");
});

pruefe("Abschalten laesst fremdes CSS im selben Feld stehen", () => {
  // Der Fehler, der eine Stunde Arbeit kostet: Der Schalter raeumt zu viel.
  const m = leeresModell("t");
  setze(m, "uix-card", "ha-card { color: red; }", "beide");
  vorlageAn(m, V);
  vorlageAus(m, V);
  assert.strictEqual(m.flach["uix-card"], "ha-card { color: red; }");
});

pruefe("Zwei Vorlagen im selben Feld stoeren einander nicht", () => {
  const m = leeresModell("t");
  vorlageAn(m, V);
  vorlageAn(m, W);
  assert.ok(vorlageIstAn(m, V) && vorlageIstAn(m, W));
  vorlageAus(m, V);
  assert.strictEqual(vorlageIstAn(m, V), false);
  assert.strictEqual(vorlageIstAn(m, W), true, "die zweite Vorlage ist mitgeflogen");
  assert.match(m.flach["uix-card"], /opacity: \.9/);
});

pruefe("Zweimal einschalten laesst den Block nicht wachsen", () => {
  // In HATG wuchs ein Block um 1027 Zeichen pro Durchlauf, und die einzige
  // Spur war eine Berichtszeile, die nach Normalbetrieb klang.
  const m = leeresModell("t");
  vorlageAn(m, V);
  const a = m.flach["uix-card"];
  vorlageAn(m, V);
  const b = m.flach["uix-card"];
  vorlageAn(m, V);
  assert.strictEqual(a, b);
  assert.strictEqual(b, m.flach["uix-card"]);
  assert.strictEqual((m.flach["uix-card"].match(/START/g) || []).length, 1);
});

pruefe("Einschalten frischt einen alten Block auf", () => {
  // Einschalten ist zugleich Auffrischen: Wer eine aeltere Fassung im Theme
  // hat, bekommt beim naechsten Mal die aktuelle.
  const m = leeresModell("t");
  vorlageAn(m, { ...V, css: "ha-card { outline: 1px solid lime; }" });
  vorlageAn(m, V);
  assert.doesNotMatch(m.flach["uix-card"], /lime/, "die alte Fassung steht noch da");
  assert.match(m.flach["uix-card"], /28px/);
});

pruefe("Eine fremde Vorsilbe wird erkannt, nicht ein zweites Mal angehaengt", () => {
  // Eine umbenannte Kopie traegt /* HORIZON:... */. HATG hat das nicht
  // erkannt und die Vorlage ein zweites Mal angehaengt - 23-mal in einer
  // einzigen Theme.
  const m = leeresModell("t");
  setze(m, "uix-card",
    "/* HORIZON:glas-karten:START */\nha-card { border-radius: 4px; }\n/* HORIZON:glas-karten:ENDE */",
    "beide");
  assert.strictEqual(vorlageIstAn(m, V), true, "die fremde Vorsilbe wurde nicht erkannt");
  vorlageAn(m, V);
  assert.strictEqual((m.flach["uix-card"].match(/:START/g) || []).length, 1,
    "die Vorlage liegt doppelt im Feld");
  assert.doesNotMatch(m.flach["uix-card"], /HORIZON/);
});

pruefe("Doppelte Bloecke werden auf den letzten eingedampft", () => {
  const m = leeresModell("t");
  setze(m, "uix-card",
    "/* HATS:glas-karten:START */\nalt\n/* HATS:glas-karten:ENDE */\n" +
    "/* HATS:glas-karten:START */\nneu\n/* HATS:glas-karten:ENDE */", "beide");
  const b = vereinheitlicheVorlagen(m, [V]);
  assert.deepStrictEqual(b.entdoppelt, ["glas-karten"]);
  assert.strictEqual((m.flach["uix-card"].match(/:START/g) || []).length, 1);
  assert.match(m.flach["uix-card"], /neu/);
  assert.doesNotMatch(m.flach["uix-card"], /\balt\b/, "der aeltere Block hat ueberlebt");
});

pruefe("vereinheitlichen meldet die fremde Vorsilbe und schreibt sie um", () => {
  const m = leeresModell("t");
  setze(m, "uix-card",
    "/* HORIZON:glas-karten:START */\nx\n/* HORIZON:glas-karten:ENDE */", "beide");
  const b = vereinheitlicheVorlagen(m, [V]);
  assert.deepStrictEqual(b.vereinheitlicht, ["glas-karten"]);
  assert.match(m.flach["uix-card"], /HATS:glas-karten:START/);
  assert.doesNotMatch(m.flach["uix-card"], /HORIZON/);
});

pruefe("Ein Durchlauf durch Datei und zurueck haelt die Vorlage", () => {
  // Der mehrzeilige Block muss als YAML-Blockskalar geschrieben werden.
  // Ein gequoteter Skalar faltet die Zeilenumbrueche zu Leerzeichen und
  // macht aus dem CSS eine einzige unbrauchbare Zeile.
  const m = leeresModell("t");
  vorlageAn(m, V);
  vorlageAn(m, W);
  const text = schreibeTheme(m);
  assert.match(text, /uix-card: \|/, "der Block steht nicht als Blockskalar in der Datei");
  const zurueck = leseTheme(text);
  assert.strictEqual(vorlageIstAn(zurueck.modell ?? zurueck, V), true);
  assert.strictEqual(vorlageIstAn(zurueck.modell ?? zurueck, W), true);
});

pruefe("Idempotent: zweimal durch Datei und zurueck aendert nichts mehr", () => {
  const m = leeresModell("t");
  vorlageAn(m, V);
  const eins = schreibeTheme(m);
  const m2 = leseTheme(eins);
  const zwei = schreibeTheme(m2.modell ?? m2);
  const m3 = leseTheme(zwei);
  const drei = schreibeTheme(m3.modell ?? m3);
  assert.strictEqual(zwei, drei, "der zweite Durchlauf hat etwas veraendert");
});

pruefe("vorlagenImTheme nennt genau die eingeschalteten", () => {
  const m = leeresModell("t");
  vorlageAn(m, W);
  assert.deepStrictEqual(vorlagenImTheme(m, [V, W]), ["glas-leiste"]);
});

pruefe("Gegenprobe: ohne Marker meldet nichts an", () => {
  // Haelt fest, dass die Pruefungen oben etwas pruefen WUERDEN.
  const m = leeresModell("t");
  setze(m, "uix-card", "ha-card { border-radius: 28px; }", "beide");
  assert.strictEqual(vorlageIstAn(m, V), false,
    "der blosse CSS-Inhalt gilt faelschlich als Vorlage");
});

// ---------------------------------------------------------------------------
// Der Bericht nach dem Einlesen: eigene Stilziele sind nicht fremd.

import { berichtUeberTheme } from "../custom_components/hats/www/theme.js";

pruefe("Eigene Stilziele gelten als bedienbar, nicht als fremd", () => {
  // Bis zum 13.10.2026 galt JEDES uix-Feld als fremd. Eine Theme aus HATS'
  // eigenem Generator meldete damit "7 Stilziele von HATG oder card-mod. Die
  // pflegt HATS nicht" - ueber ihre eigenen sieben. Eine Warnung, die bei der
  // eigenen Arbeit anschlaegt, lernt man weg; dann greift sie auch dann nicht
  // mehr, wenn sie recht hat.
  const m = leeresModell("t");
  vorlageAn(m, V);                                   // uix-card
  setze(m, "uix-sidebar", "x", "beide");
  const b = berichtUeberTheme(m, new Set(), new Set(["card", "sidebar"]));
  assert.deepStrictEqual(b.stilziele, [], "eigene Stilziele gelten als fremd");
  assert.ok(b.bedienbar.includes("uix-card"), "uix-card ist nicht bedienbar");
  assert.ok(b.bedienbar.includes("uix-sidebar"));
  assert.deepStrictEqual(b.mitgenommen, [], "ein eigenes Ziel wurde nur mitgenommen");
});

pruefe("Fremde Stilziele werden weiter gemeldet", () => {
  // Die Gegenprobe. Ohne sie koennte die Pruefung oben auch deshalb gruen
  // sein, weil gar nichts mehr gemeldet wird.
  const m = leeresModell("t");
  setze(m, "uix-card-yaml", "x", "beide");       // Pfadform - die kann HATS nicht
  setze(m, "card-mod-theme", "y", "beide");      // das alte Format
  setze(m, "uix-gibtesnicht", "z", "beide");     // kein Stilziel von UIX
  const b = berichtUeberTheme(m, new Set(), new Set(["card", "sidebar"]));
  assert.deepStrictEqual(b.stilziele.sort(),
    ["card-mod-theme", "uix-card-yaml", "uix-gibtesnicht"],
    "ein fremdes Stilziel wird nicht mehr gemeldet");
});

pruefe("Ohne Zielliste bleibt es beim alten, strengen Verhalten", () => {
  // Wer berichtUeberTheme ohne dritten Parameter ruft, bekommt weiter jedes
  // uix-Feld gemeldet. Sonst wuerde ein vergessener Parameter die Warnung
  // stumm abschalten.
  const m = leeresModell("t");
  setze(m, "uix-card", "x", "beide");
  const b = berichtUeberTheme(m, new Set());
  assert.deepStrictEqual(b.stilziele, ["uix-card"]);
});


// ---------------------------------------------------------------------------
// Der Schalter, ohne den keine einzige Vorlage ankommt.

import { uixSchalterSetzen } from "../custom_components/hats/www/theme.js";

pruefe("Eine Theme mit Vorlagen weist sich als UIX-Theme aus", () => {
  // UIX wendet seine Felder nur an, wenn uix-theme auf Theme-Ebene steht.
  // Fehlt der Schalter, bleibt JEDE Vorlage wirkungslos - und zwar lautlos:
  // Am 13.10.2026 gemessen, 39 von 39 uix-node-Knoten leer, keine Meldung in
  // der Konsole, die Felder korrekt am html. Nach dem Ergaenzen 31 von 39.
  const m = leeresModell("meine_theme");
  vorlageAn(m, V);
  const text = schreibeTheme(m);
  assert.match(text, /uix-theme: "meine_theme"/, "der Schalter fehlt in der Ausgabe");
});

pruefe("Ohne Vorlagen steht der Schalter nicht in der Datei", () => {
  // Gegenprobe: Eine Theme ohne Stilziel braucht ihn nicht, und ein Feld, das
  // nichts schaltet, ist Ballast.
  const m = leeresModell("schlicht");
  setze(m, "primary-text-color", "#111", "beide");
  assert.doesNotMatch(schreibeTheme(m), /uix-theme/);
});

pruefe("Der Schalter verschwindet wieder, wenn die letzte Vorlage ausgeht", () => {
  const m = leeresModell("meine_theme");
  vorlageAn(m, V);
  schreibeTheme(m);
  assert.strictEqual(m.flach["uix-theme"], "meine_theme");
  vorlageAus(m, V);
  assert.doesNotMatch(schreibeTheme(m), /uix-theme/, "der Schalter blieb ohne Vorlage stehen");
});

pruefe("Der Schalter folgt einer Umbenennung", () => {
  // Ein uix-theme, das auf den alten Namen zeigt, schaltet nichts - UIX
  // vergleicht mit dem Namen der aktiven Theme.
  const m = leeresModell("alt");
  vorlageAn(m, V);
  schreibeTheme(m);
  m.name = "neu";
  assert.match(schreibeTheme(m), /uix-theme: "neu"/, "der Schalter zeigt auf den alten Namen");
});

console.log(`\n${n} Pruefungen`);
if (n < 19) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

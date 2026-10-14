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
import * as baukasten from "../custom_components/hats/www/baukasten.js";
import * as hintergrundSeite from "../custom_components/hats/www/hintergrund-seite.js";
import { execFileSync } from "node:child_process";
import {
  leseReglerAusDatei, schreibeReglerInDatei, leseBewegungAusDatei, leseDarstellungAusDatei, schreibeDarstellungInDatei,
  aktuellerModus, knopfZeile, badgeKurzform, FUNKTIONEN, TEXTE, BEWEGUNG_REGLER, DARSTELLUNG_REGLER,
  leseFensterAusDatei, schreibeTeilInDatei, schreibeBildInDatei, leseUnschaerfe, mitUnschaerfe, FENSTER_SORTEN,
  BILD_ADRESSE,
} from "../custom_components/hats/www/hats-control-card.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const w = { ...theme, ...hintergrund, ...baukasten, ...hintergrundSeite };
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

// ---- Das grosse Fenster: Teile des Baukastens, Bilder, Weichzeichnung ----------

pruefe("Das Fenster erkennt die sechs Teile, aus denen glaswerk gebaut ist", () => {
  // Die Erwartung steht im Kopf der Datei selbst - und der wird seit dem
  // 14.10.2026 aus den angewendeten Teilen GERECHNET, nicht getippt. Vorher
  // stand er fest da und nannte weiter "Farben glaswerk", als die Palette
  // laengst glaswerk-orange war. Dieser Test hat das gefunden.
  assert.ok(/Farben glaswerk-orange, Schrift\s*#?\s*system, Rundung rund, Dichte weit, Karten glas, Hintergrund glaswerk/
    .test(DATEI.replace(/\n# /g, " ")), "der Kopf von glaswerk nennt andere Teile");
  for (const modus of ["light", "dark"]) {
    const stand = leseFensterAusDatei(DATEI, NAME, modus, w);
    assert.strictEqual(stand.grund, undefined);
    assert.deepStrictEqual(stand.sitzt, { palette: "glaswerk-orange", karten: "glas", schrift: "system",
      rundung: "rund", dichte: "weit", hintergrund: "glaswerk" }, modus);
    assert.ok(stand.bild.startsWith("linear-gradient"), modus);
  }
  assert.deepStrictEqual(FENSTER_SORTEN.slice().sort(), ["dichte", "hintergrund", "karten", "palette", "rundung", "schrift"]);
});

const sitzt = (yaml) => leseFensterAusDatei(yaml, NAME, "light", w).sitzt;

pruefe("Ein anderes Teil waehlen: dieses sitzt danach, die anderen fuenf bleiben", () => {
  const { yaml, grund } = schreibeTeilInDatei(DATEI, NAME, "karten", "kontur", w);
  assert.strictEqual(grund, undefined);
  const neu = sitzt(yaml);
  assert.strictEqual(neu.karten, "kontur");
  for (const s of ["palette", "schrift", "rundung", "dichte", "hintergrund"]) {
    assert.strictEqual(neu[s], sitzt(DATEI)[s], s);
  }
  // Und zurueck: Glas sitzt wieder. (Byte-gleich wird es nicht - kontur
  // setzt Felder, die glas leer laesst, und das Panel raeumt sie genauso.)
  assert.strictEqual(sitzt(schreibeTeilInDatei(yaml, NAME, "karten", "glas", w).yaml).karten, "glas");
});

pruefe("\"Keiner\" nimmt den Hintergrund heraus, statt ein leeres Feld zu schreiben", () => {
  // Ein geschriebenes leeres Feld stuende in der Datei und ueberschriebe HAs
  // eigene Vorgabe mit nichts - dieselbe Regel wie im Panel.
  const { yaml } = schreibeTeilInDatei(DATEI, NAME, "hintergrund", "keiner", w);
  const m = theme.leseTheme(yaml);
  for (const ebene of ["flach", "light", "dark"]) assert.strictEqual(m[ebene]["lovelace-background"], undefined, ebene);
  assert.ok(!/lovelace-background:\s*""/.test(yaml));
  assert.strictEqual(sitzt(yaml).hintergrund, "keiner");
});

pruefe("Eine Palette tauschen setzt den Akzent beider Modi", () => {
  const { yaml } = schreibeTeilInDatei(DATEI, NAME, "palette", "nord", w);
  const m = theme.leseTheme(yaml);
  const nord = baukasten.PALETTEN.find((p) => p.id === "nord");
  assert.strictEqual(m.light["accent-color"], nord.akzent.light);
  assert.strictEqual(m.dark["accent-color"], nord.akzent.dark);
  assert.strictEqual(sitzt(yaml).palette, "nord");
});

pruefe("Unbekannte Sorte oder unbekanntes Teil: nichts geschrieben", () => {
  assert.strictEqual(schreibeTeilInDatei(DATEI, NAME, "karten", "gibtsnicht", w).grund, "teil");
  assert.strictEqual(schreibeTeilInDatei(DATEI, NAME, "oberflaeche", "glas", w).grund, "teil");
  assert.strictEqual(schreibeTeilInDatei(DATEI, NAME, "__proto__", "x", w).grund, "teil");
  // Und eine fremde Datei sperrt wie ueberall.
  const fremd = DATEI.replace(/^# Erzeugt mit HATS .*\n/m, "# von Hand\n");
  assert.strictEqual(schreibeTeilInDatei(fremd, NAME, "karten", "kontur", w).grund, "fremd");
});

pruefe("Ein eigenes Bild: fuer hell und dunkel, fest am Fenster, nur aus /local/hats", () => {
  const { yaml, grund } = schreibeBildInDatei(DATEI, NAME, "/local/hats/strand.jpg", w);
  assert.strictEqual(grund, undefined);
  const m = theme.leseTheme(yaml);
  for (const modus of ["light", "dark"]) {
    assert.strictEqual(m[modus]["lovelace-background"], "url(/local/hats/strand.jpg) center / cover no-repeat fixed", modus);
  }
  // Ein Bild ist kein Punktebild: Die Punktbewegung faellt weg, wie im Panel.
  assert.ok(!/hats-hintergrund-punkte\s+\d/.test(m.flach["uix-root"] ?? ""));
  for (const boese of ["https://example.com/x.jpg", "/local/hats/../../secrets.yaml", "/local/hats/a b.jpg",
    "/local/hats/x.jpg) ; color: red", "/local/anderswo/x.jpg"]) {
    assert.strictEqual(schreibeBildInDatei(DATEI, NAME, boese, w).grund, "bild", boese);
    assert.ok(!BILD_ADRESSE.test(boese), boese);
  }
});

pruefe("Weichzeichnung: nur die Zahl im blur(), der Rest der Kette bleibt", () => {
  assert.strictEqual(leseUnschaerfe("blur(26px) saturate(180%)"), 26);
  assert.strictEqual(leseUnschaerfe("none"), 0);
  assert.strictEqual(leseUnschaerfe(undefined), 0);
  assert.strictEqual(leseUnschaerfe("saturate(150%)"), 0);
  assert.strictEqual(leseUnschaerfe("var(--meins)"), null);
  assert.strictEqual(mitUnschaerfe("blur(26px) saturate(180%)", 10), "blur(10px) saturate(180%)");
  assert.strictEqual(mitUnschaerfe("none", 8), "blur(8px)");
  assert.strictEqual(mitUnschaerfe("saturate(150%)", 8), "blur(8px) saturate(150%)");
  assert.strictEqual(mitUnschaerfe("", 0), "none");
  // In der Datei: genau die eine Zeile.
  const WEICH = '  ha-card-backdrop-filter: "blur(26px) saturate(180%)"';
  const { yaml } = schreibeDarstellungInDatei(DATEI, NAME, "light", { unschaerfe: 12 }, w);
  assert.strictEqual(yaml, DATEI.split(WEICH).join('  ha-card-backdrop-filter: "blur(12px) saturate(180%)"'));
});

pruefe("Gegenprobe mit PyYAML: Teil, Bild und Weichzeichnung liest Home Assistant", () => {
  let yaml = schreibeTeilInDatei(DATEI, NAME, "palette", "catppuccin", w).yaml;
  yaml = schreibeBildInDatei(yaml, NAME, "/local/hats/strand.jpg", w).yaml;
  yaml = schreibeDarstellungInDatei(yaml, NAME, "dark", { unschaerfe: 4 }, w).yaml;
  let aus;
  try {
    aus = execFileSync("python3", ["-c",
      "import sys, yaml, json\nd = yaml.safe_load(sys.stdin.read())\nt = d['glaswerk']\n"
      + "print(json.dumps([t['modes']['dark']['lovelace-background'], t.get('ha-card-backdrop-filter'), t['modes']['light'].get('accent-color')]))"],
      { input: yaml, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    assert.fail("PyYAML liest die Datei nicht: " + String(e.stderr || e.message).trim().split("\n").slice(-3).join(" | "));
  }
  const [bild, weich, akzent] = JSON.parse(aus);
  assert.strictEqual(bild, "url(/local/hats/strand.jpg) center / cover no-repeat fixed");
  assert.strictEqual(weich, "blur(4px) saturate(180%)");
  assert.strictEqual(akzent, baukasten.PALETTEN.find((p) => p.id === "catppuccin").akzent.light);
});

console.log(`\n${n} Pruefungen`);
if (n < 17) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

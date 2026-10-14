// Die Regler fuer Transparenz und Schrift in der Steuerkarte. Anders als der
// Bewegungsregler aendern sie gewoehnliche Theme-Felder, die auch im Panel
// stehen: --ha-card-background und --ha-font-size-scale.
//
// Geprueft wird die Strecke vom Text der Datei zum neuen Text der Datei, mit
// dem ECHTEN theme.js und der echten Theme glaswerk aus dem Repository. Was
// die Karte dabei verspricht:
//
//   - sie aendert genau die Zeile, an deren Feld gezogen wurde - und zwar
//     dort, wo sie steht (je Modus: nur im geltenden; flach: flach)
//   - sie schreibt den anderen Wert NICHT mit; was das Panel daran geaendert
//     hat, bleibt
//   - eine Kartenflaeche, die keine einfache Farbe ist, wird nicht angefasst
//   - Mushroom bekommt einmal einen Verweis auf HAs Leiter, ein eigener Wert
//     bleibt stehen
//
// Die Erwartungen sind Textersetzungen in der Datei selbst, nicht Aufrufe
// der Module - sonst pruefte der Test den Code gegen sich selbst. Am Ende
// PyYAML, der Parser, mit dem Home Assistant beim Start liest.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as theme from "../custom_components/hats/www/theme.js";
import * as hintergrund from "../custom_components/hats/www/hintergrund.js";
import {
  leseDarstellungAusDatei, schreibeDarstellungInDatei, leseFarbe, mitDeckkraft,
  TRANSPARENZ, SCHRIFT, MUSHROOM_SCHRIFT, FUNKTIONEN, badgeKurzform,
} from "../custom_components/hats/www/hats-control-card.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.join(hier, "..");
const w = { ...theme, ...hintergrund };
const DATEI = readFileSync(path.join(wurzel, "werkzeuge/themes/glaswerk.yaml"), "utf8");
const NAME = "glaswerk";

// Die drei Zeilen, um die es geht, woertlich aus der Datei.
const HELL = '      ha-card-background: "rgba(255, 255, 255, 0.42)"';
const DUNKEL = '      ha-card-background: "rgba(22, 28, 46, 0.46)"';
const SKALA = '  ha-font-size-scale: "1"';

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Eine Zeile ersetzen, die genau einmal vorkommt - sonst ist die Erwartung
// selbst zweideutig.
function ersetze(text, alt, neu) {
  const teile = text.split(alt);
  assert.strictEqual(teile.length, 2, `"${alt.trim()}" steht nicht genau einmal in der Datei`);
  return teile.join(neu);
}

pruefe("Die Datei traegt die drei Zeilen, auf die sich der Test stuetzt", () => {
  // Gegenprobe zu allem Folgenden: Baut jemand glaswerk um, faellt das hier
  // auf und nicht als Raetsel weiter unten.
  for (const z of [HELL, DUNKEL, SKALA]) assert.strictEqual(DATEI.split(z).length, 2, z);
});

pruefe("glaswerk laesst sich lesen: 58 % hell, 54 % dunkel, Schrift 100 %", () => {
  const hell = leseDarstellungAusDatei(DATEI, NAME, "light", w);
  const dunkel = leseDarstellungAusDatei(DATEI, NAME, "dark", w);
  assert.strictEqual(hell.grund, undefined, "abgewiesen: " + hell.grund);
  assert.deepStrictEqual(hell.werte, { transparenz: 58, schrift: 100 });
  assert.deepStrictEqual(dunkel.werte, { transparenz: 54, schrift: 100 });
  assert.strictEqual(hell.karte.ebene, "light");
  assert.strictEqual(dunkel.karte.ebene, "dark");
  assert.strictEqual(hell.karte.weich, true, "glaswerk zeichnet weich");
});

pruefe("Transparenz im Hellmodus aendert genau die eine Zeile", () => {
  const { yaml, grund } = schreibeDarstellungInDatei(DATEI, NAME, "light", { transparenz: 50 }, w);
  assert.strictEqual(grund, undefined);
  assert.strictEqual(yaml, ersetze(DATEI, HELL, '      ha-card-background: "rgba(255, 255, 255, 0.5)"'));
});

pruefe("Transparenz im Dunkelmodus aendert die Zeile im Dunkelblock, nicht die helle", () => {
  const { yaml } = schreibeDarstellungInDatei(DATEI, NAME, "dark", { transparenz: 70 }, w);
  assert.strictEqual(yaml, ersetze(DATEI, DUNKEL, '      ha-card-background: "rgba(22, 28, 46, 0.3)"'));
});

pruefe("Zurueck auf den alten Wert ist die Datei Byte fuer Byte die von vorher", () => {
  const eins = schreibeDarstellungInDatei(DATEI, NAME, "light", { transparenz: 20 }, w).yaml;
  assert.notStrictEqual(eins, DATEI);
  const zwei = schreibeDarstellungInDatei(eins, NAME, "light", { transparenz: 58 }, w).yaml;
  assert.strictEqual(zwei, DATEI);
});

pruefe("Die Enden der Spanne: 0 % ist deckend, 80 % ist Deckkraft 0,2", () => {
  const deckend = schreibeDarstellungInDatei(DATEI, NAME, "light", { transparenz: TRANSPARENZ.min }, w).yaml;
  assert.strictEqual(deckend, ersetze(DATEI, HELL, '      ha-card-background: "rgba(255, 255, 255, 1)"'));
  const duenn = schreibeDarstellungInDatei(DATEI, NAME, "light", { transparenz: TRANSPARENZ.max }, w).yaml;
  assert.strictEqual(duenn, ersetze(DATEI, HELL, '      ha-card-background: "rgba(255, 255, 255, 0.2)"'));
});

pruefe("Schrift: die Skala aendert sich, Mushroom bekommt zwei Verweise dazu - sonst nichts", () => {
  const { yaml } = schreibeDarstellungInDatei(DATEI, NAME, "light", { schrift: 110 }, w);
  const vorher = theme.leseTheme(DATEI);
  const nachher = theme.leseTheme(yaml);
  assert.strictEqual(nachher.flach["ha-font-size-scale"], "1.1");
  assert.strictEqual(nachher.flach["mush-card-primary-font-size"], "var(--ha-font-size-m)");
  assert.strictEqual(nachher.flach["mush-card-secondary-font-size"], "var(--ha-font-size-s)");
  // Alles andere wie vorher - Modi, Kopf, und jedes flache Feld ausser den dreien.
  const rest = (m) => {
    const flach = { ...m.flach };
    for (const k of ["ha-font-size-scale", ...Object.keys(MUSHROOM_SCHRIFT)]) delete flach[k];
    return JSON.stringify([m.name, m.kopf, flach, m.light, m.dark]);
  };
  assert.strictEqual(rest(nachher), rest(vorher));
  // Und die Zeile selbst: an ihrem Platz, nicht ans Ende gewandert.
  assert.ok(yaml.includes('  ha-font-size-scale: "1.1"\n'), "die Skala steht nicht in der Datei");
  assert.strictEqual(yaml.indexOf("ha-font-size-scale"), DATEI.indexOf("ha-font-size-scale"));
});

pruefe("Mushrooms Vorgaben sind bei Skala 1 genau die zwei Stufen der Leiter", () => {
  // 14px und 12px, am 14.10.2026 aus mushroom-light-card gelesen; die Leiter
  // ist calc(14px * scale) und calc(12px * scale), an der Testmaschine
  // abgelesen. Steht hier etwas anderes, waechst Mushroom nicht einfach mit,
  // sondern springt beim ersten Ziehen.
  assert.deepStrictEqual(MUSHROOM_SCHRIFT, {
    "mush-card-primary-font-size": "var(--ha-font-size-m)",
    "mush-card-secondary-font-size": "var(--ha-font-size-s)",
  });
});

pruefe("Ein eigener Mushroom-Wert bleibt stehen, und der Regler sagt, dass er nicht mitwaechst", () => {
  const mitEigenem = ersetze(DATEI, SKALA, `${SKALA}\n  mush-card-primary-font-size: "15px"`);
  const stand = leseDarstellungAusDatei(mitEigenem, NAME, "light", w);
  assert.strictEqual(stand.schrift.mushFest, "15px");
  const { yaml } = schreibeDarstellungInDatei(mitEigenem, NAME, "light", { schrift: 105 }, w);
  const m = theme.leseTheme(yaml);
  assert.strictEqual(m.flach["mush-card-primary-font-size"], "15px");
  assert.strictEqual(m.flach["mush-card-secondary-font-size"], "var(--ha-font-size-s)");
  // Gegenprobe: Ein Verweis auf die Leiter waechst mit, das ist kein Fall fuer den Hinweis.
  const mitLeiter = ersetze(DATEI, SKALA, `${SKALA}\n  mush-card-primary-font-size: "var(--ha-font-size-l)"`);
  assert.strictEqual(leseDarstellungAusDatei(mitLeiter, NAME, "light", w).schrift.mushFest, null);
});

pruefe("Nur das Feld, an dem gezogen wurde: der andere Wert aus der Datei bleibt", () => {
  // Das Panel hat die Kartenflaeche inzwischen auf 0,3 gestellt. Wer jetzt
  // nur an der Schrift zieht, darf das nicht auf den alten Stand zuruecksetzen.
  const vomPanel = ersetze(DATEI, HELL, '      ha-card-background: "rgba(255, 255, 255, 0.3)"');
  const { yaml } = schreibeDarstellungInDatei(vomPanel, NAME, "light", { schrift: 105 }, w);
  assert.strictEqual(theme.leseTheme(yaml).light["ha-card-background"], "rgba(255, 255, 255, 0.3)");
  // Und umgekehrt: Transparenz allein laesst Skala und Mushroom in Ruhe.
  const nurKarte = schreibeDarstellungInDatei(DATEI, NAME, "light", { transparenz: 40 }, w).yaml;
  assert.ok(nurKarte.includes(SKALA + "\n"));
  assert.ok(!nurKarte.includes("mush-card-primary-font-size"), "Mushroom-Feld ohne Zug an der Schrift");
});

pruefe("Eine Kartenflaeche aus Verlaeufen sperrt die Transparenz, nicht die Schrift", () => {
  // Der Kartenstil "Liquid Glass" legt zwei Verlaeufe ab; die vierte Zahl
  // darin zu ersetzen zerlegte ihn.
  const verlauf = "linear-gradient(150deg, rgba(255,255,255,.82) 0%, rgba(255,255,255,.4) 100%), "
    + "linear-gradient(0deg, rgba(255,255,255,.1), rgba(255,255,255,.1))";
  const glas = ersetze(DATEI, HELL, `      ha-card-background: "${verlauf}"`);
  const stand = leseDarstellungAusDatei(glas, NAME, "light", w);
  assert.strictEqual(stand.grund, undefined);
  assert.strictEqual(stand.karte.grund, "form");
  assert.strictEqual(stand.werte.transparenz, null);
  assert.strictEqual(schreibeDarstellungInDatei(glas, NAME, "light", { transparenz: 50 }, w).grund, "form");
  const schrift = schreibeDarstellungInDatei(glas, NAME, "light", { schrift: 95 }, w);
  assert.strictEqual(schrift.grund, undefined);
  assert.strictEqual(theme.leseTheme(schrift.yaml).light["ha-card-background"], verlauf);
  // Gegenprobe: Der Dunkelmodus derselben Datei ist eine einfache Farbe und frei.
  assert.strictEqual(leseDarstellungAusDatei(glas, NAME, "dark", w).karte.grund, undefined);
});

pruefe("Ohne Kartenflaeche erfindet der Regler keine", () => {
  const ohne = ersetze(ersetze(DATEI, HELL + "\n", ""), DUNKEL + "\n", "");
  const stand = leseDarstellungAusDatei(ohne, NAME, "light", w);
  assert.strictEqual(stand.karte.grund, "keineFlaeche");
  assert.strictEqual(schreibeDarstellungInDatei(ohne, NAME, "light", { transparenz: 30 }, w).grund, "keineFlaeche");
});

pruefe("Steht die Flaeche flach, bleibt sie flach - und gilt damit fuer beide Modi", () => {
  // Die Wahl "flach oder je Modus" gehoert dem Panel. Die Karte teilt nicht auf.
  const ohne = ersetze(ersetze(DATEI, HELL + "\n", ""), DUNKEL + "\n", "");
  // An ihren Platz in der Reihe: Flache Felder stehen sortiert, gleich nach
  // der Weichzeichnung.
  const WEICH = '  ha-card-backdrop-filter: "blur(26px) saturate(180%)"';
  const flach = ersetze(ohne, WEICH, `${WEICH}\n  ha-card-background: "rgba(40, 40, 40, 0.5)"`);
  const stand = leseDarstellungAusDatei(flach, NAME, "dark", w);
  assert.strictEqual(stand.karte.ebene, "flach");
  const { yaml } = schreibeDarstellungInDatei(flach, NAME, "dark", { transparenz: 30 }, w);
  assert.strictEqual(yaml, ersetze(flach, '  ha-card-background: "rgba(40, 40, 40, 0.5)"',
    '  ha-card-background: "rgba(40, 40, 40, 0.7)"'));
  const m = theme.leseTheme(yaml);
  assert.strictEqual(m.light["ha-card-background"], undefined);
  assert.strictEqual(m.dark["ha-card-background"], undefined);
});

pruefe("Farben lesen: nur einfache Formen, alles andere ist null", () => {
  assert.deepStrictEqual(leseFarbe("rgba(255, 255, 255, 0.42)"), { r: 255, g: 255, b: 255, a: 0.42 });
  assert.deepStrictEqual(leseFarbe("rgb(1,2,3)"), { r: 1, g: 2, b: 3, a: 1 });
  assert.deepStrictEqual(leseFarbe("rgba(1,2,3,.5)"), { r: 1, g: 2, b: 3, a: 0.5 });
  assert.deepStrictEqual(leseFarbe("rgb(1 2 3 / 40%)"), { r: 1, g: 2, b: 3, a: 0.4 });
  assert.deepStrictEqual(leseFarbe("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepStrictEqual(leseFarbe("#1C1C1C"), { r: 28, g: 28, b: 28, a: 1 });
  for (const nein of ["linear-gradient(red, blue)", "var(--card-background-color)", "white",
    "#ffffff80", "rgba(300, 0, 0, 1)", "rgba(1, 2, 3, 1.5)", "", undefined]) {
    assert.strictEqual(leseFarbe(nein), null, String(nein));
  }
  assert.strictEqual(mitDeckkraft({ r: 1, g: 2, b: 3 }, 0.456), "rgba(1, 2, 3, 0.46)");
});

pruefe("Eine Flaeche in Hex wird beim ersten Schreiben zu rgba(), danach ist die Datei stabil", () => {
  const hex = ersetze(DATEI, HELL, '      ha-card-background: "#ffffff"');
  assert.strictEqual(leseDarstellungAusDatei(hex, NAME, "light", w).werte.transparenz, 0);
  const eins = schreibeDarstellungInDatei(hex, NAME, "light", { transparenz: 40 }, w).yaml;
  assert.strictEqual(eins, ersetze(DATEI, HELL, '      ha-card-background: "rgba(255, 255, 255, 0.6)"'));
  const zwei = schreibeDarstellungInDatei(eins, NAME, "light", { transparenz: 40 }, w).yaml;
  assert.strictEqual(zwei, eins);
});

pruefe("Ab dem zweiten Durchlauf aendert sich nichts mehr", () => {
  const werte = { transparenz: 36, schrift: 115 };
  const eins = schreibeDarstellungInDatei(DATEI, NAME, "dark", werte, w).yaml;
  const zwei = schreibeDarstellungInDatei(eins, NAME, "dark", werte, w).yaml;
  const drei = schreibeDarstellungInDatei(zwei, NAME, "dark", werte, w).yaml;
  assert.strictEqual(eins, zwei);
  assert.strictEqual(zwei, drei);
  // Gegenprobe: Der erste Durchlauf hat ueberhaupt etwas geaendert.
  assert.notStrictEqual(eins, DATEI);
});

pruefe("Eine Skala, die keine Zahl ist, sperrt die Schrift", () => {
  const verweis = ersetze(DATEI, SKALA, '  ha-font-size-scale: "var(--meine-skala)"');
  const stand = leseDarstellungAusDatei(verweis, NAME, "light", w);
  assert.strictEqual(stand.schrift.grund, "skala");
  assert.strictEqual(schreibeDarstellungInDatei(verweis, NAME, "light", { schrift: 110 }, w).grund, "skala");
  // Die Transparenz bleibt frei.
  assert.strictEqual(schreibeDarstellungInDatei(verweis, NAME, "light", { transparenz: 50 }, w).grund, undefined);
});

pruefe("Dieselben Sperren wie beim Bewegungsregler: fremder Name, fremdes Werkzeug, unklare Zeilen", () => {
  assert.strictEqual(leseDarstellungAusDatei(DATEI, "macos", "light", w).grund, "name");
  const fremd = DATEI.replace(/^# Erzeugt mit HATS .*\n/m, "# von Hand\n");
  assert.notStrictEqual(fremd, DATEI, "die Kopfzeile stand nicht in der Datei");
  assert.strictEqual(leseDarstellungAusDatei(fremd, NAME, "light", w).grund, "fremd");
  const unklar = ersetze(DATEI, SKALA, `${SKALA}\n  das hier ist kein feld`);
  assert.strictEqual(schreibeDarstellungInDatei(unklar, NAME, "light", { schrift: 110 }, w).grund, "unklar");
});

pruefe("Die Spannen sind die aus dem Brief von HATS Aufbau", () => {
  // Deckkraft 0,20 bis 1,00 in Schritten von 0,02; Schrift 0,9 bis 1,2 in 0,05.
  assert.deepStrictEqual(TRANSPARENZ, { min: 0, max: 80, schritt: 2 });
  assert.deepStrictEqual(SCHRIFT, { min: 90, max: 120, schritt: 5 });
  // Beide Ausgangswerte von glaswerk liegen auf dem Raster, sonst sprang der
  // Schieber beim Oeffnen neben den Wert in der Datei.
  for (const p of [58, 54]) assert.strictEqual((p - TRANSPARENZ.min) % TRANSPARENZ.schritt, 0, p);
  assert.strictEqual((100 - SCHRIFT.min) % SCHRIFT.schritt, 0);
});

pruefe("appearance ist eine Funktion der Karte, das Badge nimmt sie nicht", () => {
  assert.ok(FUNKTIONEN.includes("appearance"));
  assert.throws(() => badgeKurzform({ buttons: [{ function: "appearance" }] }));
  // Gegenprobe: die Kurzform des Badges geht weiter.
  assert.deepStrictEqual(badgeKurzform({ buttons: [{ function: "mode" }] }).controls, ["mode"]);
});

pruefe("Jedes Feld, das die Karte schreibt, bietet das Panel an", () => {
  // Die Regel aus CLAUDE.md: Ein Feld, das HATS nicht anbietet, kann niemand
  // mehr aendern oder entfernen. Gelesen aus dem Panel selbst, nicht aus der Karte.
  const panel = readFileSync(path.join(wurzel, "custom_components/hats/www/hats-panel.js"), "utf8");
  const angeboten = new Set([...panel.matchAll(/\bv:\s*"--([a-z0-9-]+)"/g)].map((m) => m[1]));
  // Gegenprobe: Der Ausdruck findet ueberhaupt Felder, sonst prueft das nichts.
  assert.ok(angeboten.size > 50, `nur ${angeboten.size} Felder im Panel gefunden`);
  assert.ok(angeboten.has("ha-card-background"));
  const geschrieben = new Set();
  for (const [modus, werte] of [["light", { transparenz: 30, schrift: 110 }], ["dark", { transparenz: 30 }]]) {
    const vorher = theme.leseTheme(DATEI);
    const nachher = theme.leseTheme(schreibeDarstellungInDatei(DATEI, NAME, modus, werte, w).yaml);
    for (const ebene of ["flach", "light", "dark"]) {
      for (const [k, v] of Object.entries(nachher[ebene])) if (vorher[ebene][k] !== v) geschrieben.add(k);
    }
  }
  assert.ok(geschrieben.size >= 2, "es wurde nichts geschrieben");
  const fehlt = [...geschrieben].filter((k) => !angeboten.has(k));
  assert.deepStrictEqual(fehlt, [], "schreibt Felder, die das Panel nicht anbietet");
});

pruefe("Gegenprobe mit PyYAML: Home Assistant liest, was die Karte schreibt", () => {
  const faelle = [
    ["light", { transparenz: 80, schrift: 120 }],
    ["dark", { transparenz: 0, schrift: 90 }],
    ["dark", { transparenz: 46 }],
  ];
  for (const [modus, werte] of faelle) {
    const { yaml } = schreibeDarstellungInDatei(DATEI, NAME, modus, werte, w);
    let aus;
    try {
      aus = execFileSync("python3", ["-c",
        "import sys, yaml, json\nd = yaml.safe_load(sys.stdin.read())\nt = d['glaswerk']\n"
        + "print(json.dumps([sorted(d), t['modes']['light'].get('ha-card-background'), "
        + "t['modes']['dark'].get('ha-card-background'), t.get('ha-font-size-scale'), "
        + "t.get('mush-card-primary-font-size'), t.get('uix-theme')]))"],
        { input: yaml, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    } catch (e) {
      assert.fail("PyYAML liest die Datei nicht: " + String(e.stderr || e.message).trim().split("\n").slice(-3).join(" | "));
    }
    const [themes, hell, dunkel, skala, mush, schalter] = JSON.parse(aus);
    assert.deepStrictEqual(themes, ["glaswerk"]);
    // In ganzen Prozent gerechnet: 1 - 0.8 ist in JavaScript 0.19999999999999996.
    const a = String((100 - (werte.transparenz ?? 0)) / 100);
    assert.strictEqual(modus === "light" ? hell : dunkel,
      modus === "light" ? `rgba(255, 255, 255, ${a})` : `rgba(22, 28, 46, ${a})`);
    assert.strictEqual(modus === "light" ? dunkel : hell,
      modus === "light" ? "rgba(22, 28, 46, 0.46)" : "rgba(255, 255, 255, 0.42)");
    assert.strictEqual(skala, werte.schrift ? String(werte.schrift / 100) : "1");
    assert.strictEqual(mush, werte.schrift ? "var(--ha-font-size-m)" : null);
    assert.strictEqual(schalter, "glaswerk");
  }
});

console.log(`\n${n} Pruefungen`);
if (n < 22) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

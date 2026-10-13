// Der Baukasten: fertige Teile zum Zusammenstecken.
//
// Die Pruefungen hier halten fest, was einen Baukasten unbrauchbar macht,
// ohne dass es auffaellt: ein Teil, das nur die Haelfte setzt, und ein Feld,
// das geschrieben wird, obwohl Home Assistant es selbst ableitet.

import assert from "node:assert";
import { BAUKASTEN, PALETTEN, KARTENSTILE, SCHRIFTEN, HINTERGRUENDE,
         KARTENSTIL_FELDER, teilAnwenden, erkenneTeil } from "../custom_components/hats/www/baukasten.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Ein Modell aus drei Ebenen, wie theme.js es fuehrt.
function leer() { return { beide: {}, light: {}, dark: {} }; }
function schreiberFuer(m) { return (name, wert, ebene) => { m[ebene === "beide" ? "beide" : ebene][name] = wert; }; }
function leserFuer(m) { return (name, ebene) => (ebene === "beide" ? m.beide[name] : m[ebene][name]); }

pruefe("Vier Sorten, jede mit Teilen und beiden Sprachen", () => {
  assert.deepStrictEqual(Object.keys(BAUKASTEN), ["palette", "schrift", "karten", "hintergrund"]);
  for (const [sorte, s] of Object.entries(BAUKASTEN)) {
    assert.ok(s.de && s.en, `${sorte}: eine Sprache fehlt`);
    assert.ok(s.teile.length >= 3, `${sorte}: zu wenige Teile`);
    const ids = s.teile.map((t) => t.id);
    assert.strictEqual(new Set(ids).size, ids.length, `${sorte}: eine id kommt doppelt vor`);
    for (const t of s.teile) {
      assert.ok(t.de && t.en, `${sorte}/${t.id}: Name fehlt in einer Sprache`);
      assert.ok(t.zweckDe && t.zweckEn, `${sorte}/${t.id}: Zweck fehlt in einer Sprache`);
    }
  }
});

pruefe("JEDER Kartenstil setzt alle sechs Felder", () => {
  // Das ist die teuerste Falle des ganzen Baukastens: Ein fehlendes Feld
  // behaelt den Wert des VORIGEN Stils. Wer von Glas auf Flach wechselt und
  // die Weichzeichnung bliebe stehen, bekaeme eine deckende Flaeche mit
  // backdrop-filter - sichtbar wird das erst vor einem gemusterten
  // Hintergrund, also oft gar nicht.
  for (const s of KARTENSTILE) {
    const m = leer();
    teilAnwenden("karten", s, schreiberFuer(m));
    const gesetzt = new Set([...Object.keys(m.beide), ...Object.keys(m.light), ...Object.keys(m.dark)]);
    for (const f of KARTENSTIL_FELDER)
      assert.ok(gesetzt.has(f), `${s.id}: ${f} fehlt`);
  }
});

pruefe("Die Flaeche steht je Modus, die Form flach", () => {
  // Eine Kartenflaeche MUSS je Modus verschieden sein - dieselbe in Hell und
  // Dunkel ist in einem der beiden falsch. Rundung und Rahmenbreite dagegen
  // sind modusunabhaengig und gehoeren flach; stuenden sie je Modus, fehlten
  // sie im jeweils anderen.
  for (const s of KARTENSTILE) {
    assert.ok(s.light?.["--ha-card-background"], `${s.id}: keine helle Flaeche`);
    assert.ok(s.dark?.["--ha-card-background"], `${s.id}: keine dunkle Flaeche`);
    assert.notStrictEqual(s.light["--ha-card-background"], s.dark["--ha-card-background"],
      `${s.id}: gleiche Flaeche in beiden Modi - einer davon ist falsch`);
    assert.ok(s.flach?.["--ha-card-border-radius"], `${s.id}: Rundung nicht flach`);
  }
});

pruefe("Eine Palette setzt elf Stufen je Rolle, und zwar FLACH", () => {
  // Flach, weil Home Assistant nur dort in BEIDEN Modi die RGB-Tripel
  // ableitet, aus denen Mushroom seine Zustandsfarben baut.
  const m = leer();
  teilAnwenden("palette", PALETTEN.find((p) => p.id === "liquid"), schreiberFuer(m));
  for (const rolle of ["primary", "neutral", "red", "green", "orange"]) {
    const stufen = Object.keys(m.beide).filter((k) => k.startsWith(`--ha-color-${rolle}-`));
    assert.strictEqual(stufen.length, 11, `${rolle}: ${stufen.length} Stufen statt 11`);
  }
  assert.strictEqual(Object.keys(m.light).filter((k) => k.startsWith("--ha-color-")).length, 0,
    "Palettenstufen stehen je Modus - dort leitet HA keine Tripel ab");
});

pruefe("Der Akzent ist das Einzige je Modus - und er unterscheidet sich", () => {
  for (const p of PALETTEN) {
    assert.ok(p.akzent?.light && p.akzent?.dark, `${p.id}: Akzent fehlt`);
    assert.notStrictEqual(p.akzent.light, p.akzent.dark,
      `${p.id}: gleicher Akzent in beiden Modi - im Dunkeln braucht es eine hellere Stufe`);
  }
});

pruefe("primary-color wird NICHT geschrieben", () => {
  // Home Assistant deklariert es selbst als var(--ha-color-primary-40) und
  // folgt der Rampe von allein. Wer es schreibt, friert es ein - dieselbe
  // Falle, an der bei HATG gefuellte Knoepfe trotz grauem Akzent blau blieben.
  const m = leer();
  teilAnwenden("palette", PALETTEN[1], schreiberFuer(m));
  const alle = [...Object.keys(m.beide), ...Object.keys(m.light), ...Object.keys(m.dark)];
  assert.ok(!alle.includes("--primary-color"), "--primary-color darf nicht gesetzt werden");
  // rgb-primary-color dagegen MUSS dabei sein: HA rechnet Tripel nur aus
  // Feldern, die im Theme stehen - primary-color steht nach obigem gerade
  // nicht drin, also bliebe das Tripel auf HAs altem Cyan.
  assert.ok(alle.includes("--rgb-primary-color"), "--rgb-primary-color fehlt");
});

pruefe("Kein anderes rgb-Feld wird geschrieben", () => {
  // Ein eigenes rgb-Feld blockiert HAs Ableitung je Modus: HA ueberspringt
  // den Namen, sobald die Theme ihn mitbringt. Bei einer modusabhaengigen
  // Quelle nagelt das den Hell-Wert in den Dunkelmodus - gemessen an der
  // Seitenleiste, Kontrast 1.19:1.
  for (const sorte of Object.keys(BAUKASTEN)) {
    for (const teil of BAUKASTEN[sorte].teile) {
      const m = leer();
      teilAnwenden(sorte, teil, schreiberFuer(m));
      const rgb = [...Object.keys(m.beide), ...Object.keys(m.light), ...Object.keys(m.dark)]
        .filter((k) => k.startsWith("--rgb-") && k !== "--rgb-primary-color");
      assert.deepStrictEqual(rgb, [], `${sorte}/${teil.id}: schreibt ${rgb.join(", ")}`);
    }
  }
});

pruefe("Ein angewendetes Teil wird wiedererkannt", () => {
  for (const sorte of Object.keys(BAUKASTEN)) {
    for (const teil of BAUKASTEN[sorte].teile) {
      const m = leer();
      teilAnwenden(sorte, teil, schreiberFuer(m));
      assert.strictEqual(erkenneTeil(sorte, leserFuer(m)), teil.id,
        `${sorte}/${teil.id} wird nicht wiedererkannt`);
    }
  }
});

pruefe("Glas sagt, dass es einen Hintergrund braucht", () => {
  // Eine durchscheinende Flaeche vor einer einfarbigen Wand sieht aus wie eine
  // etwas hellere Wand. Wer Glas waehlt und keinen Hintergrund hat, sieht
  // nichts - und sucht den Fehler in der Theme.
  const glas = KARTENSTILE.find((s) => s.id === "glas");
  assert.ok(glas.braucht?.hintergrund, "glas traegt kein braucht.hintergrund");
  for (const s of KARTENSTILE.filter((x) => x.id !== "glas"))
    assert.ok(!s.braucht?.hintergrund, `${s.id} braucht keinen Hintergrund`);
  assert.ok(HINTERGRUENDE.some((h) => h.id !== "keiner"), "es gibt keinen Hintergrund zur Auswahl");
});

pruefe("Schriften kommen ohne Download aus", () => {
  // Eine Webschrift braucht uix-fonts und damit eine Datei auf der Instanz.
  // Das ist ein eigener Schritt, keine Auswahl - ein Teil, das eine fehlende
  // Datei voraussetzt, waere im Baukasten eine Falle.
  for (const s of SCHRIFTEN) {
    const f = s.felder?.["--ha-font-family-body"] || "";
    assert.doesNotMatch(f, /url\(|@import|https?:/, `${s.id}: verweist auf eine externe Schrift`);
    assert.ok(f.length > 3, `${s.id}: keine Schriftfamilie`);
  }
});

pruefe("Gegenprobe: ein unvollstaendiger Kartenstil faellt auf", () => {
  const kaputt = { id: "test", de: "x", en: "x", zweckDe: "x", zweckEn: "x",
                   flach: { "--ha-card-border-radius": "8px" }, light: {}, dark: {} };
  const m = leer();
  teilAnwenden("karten", kaputt, schreiberFuer(m));
  const gesetzt = new Set(Object.keys(m.beide));
  const fehlend = KARTENSTIL_FELDER.filter((f) => !gesetzt.has(f));
  assert.ok(fehlend.length >= 5, "die Vollstaendigkeitspruefung wuerde nichts finden");
});

pruefe("Gegenprobe: eine fremde Theme wird NICHT erkannt", () => {
  const m = leer();
  m.light["--ha-card-background"] = "#abcdef";
  assert.strictEqual(erkenneTeil("karten", leserFuer(m)), null,
    "erkenneTeil meldet einen Treffer, wo keiner ist");
});

console.log(`\n${n} Pruefungen`);
if (n < 11) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

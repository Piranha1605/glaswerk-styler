// Die Leiste an Stelle von Home Assistants Kopfzeile (replace_header).
// Auf Ansage vom 14.10.2026: "ja mach mal" - auf die Frage, ob wir HAs Leiste
// ersetzen.
//
// Was sie dabei versprechen muss, steht in der Kopfzeile selbst: Wer sie
// wegnimmt, nimmt ihren Menueknopf und ihren Stift mit. Am Telefon ist der
// Menueknopf der einzige Weg in die Seitenleiste; ohne Stift kaeme niemand mehr
// in den Bearbeitungsmodus. Die Pruefungen halten fest, dass beide nie fehlen.

import assert from "node:assert";
import {
  pruefeConfig, mitKopfKnoepfen, inDieListe, mehrInDieListe, badgeConfig, aktiverIndex, FUNKTIONEN, TEXTE,
} from "../custom_components/hats/www/hats-control-card.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const ZIELE = [
  { name: "Home", link: "/a" },
  { name: "Licht", link: "/b" },
];
const funktionen = (c) => pruefeConfig(c).knoepfe.map((k) => k.function || k.name);

pruefe("Ohne replace_header kommt nichts dazu", () => {
  assert.deepStrictEqual(funktionen({ buttons: ZIELE }), ["Home", "Licht"]);
  assert.strictEqual(pruefeConfig({ buttons: ZIELE }).kopf, false);
  // Nur true schaltet - ein Tippfehler wie "yes" nimmt niemandem die Kopfzeile.
  assert.strictEqual(pruefeConfig({ buttons: ZIELE, replace_header: "yes" }).kopf, false);
});

pruefe("Mit replace_header: Seitenleiste vorn, Stift am Ende", () => {
  const c = pruefeConfig({ buttons: ZIELE, replace_header: true });
  assert.strictEqual(c.kopf, true);
  assert.deepStrictEqual(c.knoepfe.map((k) => k.function || k.name), ["sidebar", "Home", "Licht", "edit"]);
  assert.strictEqual(c.knoepfe.at(-1).align_end, true);
  assert.ok(c.knoepfe[0].auto && c.knoepfe.at(-1).auto, "von selbst dazugekommen, nicht konfiguriert");
});

pruefe("Die Kapsel trifft auch mit dem Knopf davor das richtige Ziel", () => {
  // index ist die Stelle in der Liste; aktiverIndex sucht ueber die Stelle,
  // die Kapsel ueber index. Am 14.10.2026 sass sie einen Knopf zu weit rechts.
  const kn = pruefeConfig({ replace_header: true, buttons: [...ZIELE, { function: "settings", align_end: true }] }).knoepfe;
  kn.forEach((k, i) => assert.strictEqual(k.index, i, `${k.function || k.name} an Stelle ${i}`));
  const i = aktiverIndex(kn, "/b");
  assert.strictEqual(kn.find((k) => k.index === i).name, "Licht");
});

pruefe("Mit dem Einstellungsfenster kein zweiter Stift - er steht im Fenster", () => {
  assert.deepStrictEqual(funktionen({ replace_header: true, buttons: [...ZIELE, { function: "settings", align_end: true }] }),
    ["sidebar", "Home", "Licht", "settings"]);
});

pruefe("Wer sie selbst setzt, bekommt sie nicht doppelt - und an seiner Stelle", () => {
  const c = { replace_header: true, buttons: [...ZIELE, { function: "sidebar" }, { function: "edit", align_end: true }] };
  assert.deepStrictEqual(funktionen(c), ["Home", "Licht", "sidebar", "edit"]);
  // Gegenprobe: mitKopfKnoepfen laesst eine Liste ohne Kopfzeile unberuehrt.
  const liste = pruefeConfig({ buttons: ZIELE }).knoepfe;
  assert.strictEqual(mitKopfKnoepfen(liste, false), liste);
});

pruefe("Die Seitenleiste wandert nie ins Menue - auch eingeklappt nicht", () => {
  const kn = pruefeConfig({ replace_header: true, collapse: "always", buttons: ZIELE }).knoepfe;
  for (const weg of [0, 1]) {
    const liste = inDieListe(kn, true, weg);
    assert.ok(![...liste].some((k) => k.function === "sidebar"), `weg ${weg}`);
  }
  // Gegenprobe: Die Ziele wandern sehr wohl.
  assert.strictEqual([...inDieListe(kn, true, 0)].filter((k) => k.link).length, 2);
});

pruefe("Eine Leiste mit nur Seitenleiste und Rand hat keine Ziele zum Einklappen", () => {
  const e = pruefeConfig({ replace_header: true, collapse: "narrow", buttons: [{ function: "settings", align_end: true }] });
  // Der erste Schritt nimmt gleich einen Knopf vom Rand - "Ziele" gibt es keine.
  assert.deepStrictEqual(mehrInDieListe({ zu: false, weg: 0 }, e, true), { zu: true, weg: 1 });
});

pruefe("Das Badge ersetzt keine Kopfzeile", () => {
  // Das Badge nimmt seit dem 16.10. die ganze Knopfliste - replace_header
  // aber nie: Ein Badge, das HAs Kopfzeile ausblendet, waere von dort aus
  // nicht wieder einzuschalten, denn der Weg zurueck geht ueber den Stift.
  assert.strictEqual(badgeConfig({ controls: ["mode"], replace_header: true }).replace_header, undefined);
  assert.strictEqual(pruefeConfig(badgeConfig({ controls: ["mode"], replace_header: true })).kopf, false);
  // Gegenprobe: Bei der Karte kommt dasselbe Feld an.
  assert.strictEqual(pruefeConfig({ controls: ["mode"], replace_header: true }).kopf, true);
  // Der Seitenleisten-Knopf kommt jetzt durch - er blendet nur HAs
  // Seitenleiste ein und aus, das kann ein Badge. Die Kopfzeile bleibt davon
  // unberuehrt.
  assert.strictEqual(pruefeConfig(badgeConfig({ buttons: [{ function: "sidebar" }] })).kopf, false);
});

pruefe("Die drei Knoepfe aus HAs Kopfzeile sind Funktionen, mit Namen in beiden Sprachen", () => {
  for (const f of ["sidebar", "assist", "edit"]) {
    assert.ok(FUNKTIONEN.includes(f), f);
    for (const spr of ["de", "en"]) assert.ok(TEXTE[spr].funktion[f], `${spr}: ${f}`);
  }
  for (const spr of ["de", "en"]) assert.ok(TEXTE[spr].feld.replace_header && TEXTE[spr].hilfe.replace_header, spr);
});

console.log(`\n${n} Pruefungen`);
if (n < 9) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

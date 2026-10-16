// Die Leiste an Stelle von Home Assistants Kopfzeile (replace_header).
// Auf Ansage vom 14.10.2026: "ja mach mal" - auf die Frage, ob wir HAs Leiste
// ersetzen.
//
// Was sie dabei versprechen muss, steht in der Kopfzeile selbst: Wer sie
// wegnimmt, nimmt ihren Menueknopf und ihren Stift mit. Am Telefon ist der
// Menueknopf der einzige Weg in die Seitenleiste; ohne Stift kaeme niemand mehr
// in den Bearbeitungsmodus. Die Pruefungen halten fest, dass beide nie fehlen.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  pruefeConfig, mitKopfKnoepfen, inDieListe, mehrInDieListe, badgeConfig, aktiverIndex, FUNKTIONEN, TEXTE,
  BESCHRIFTUNGEN, zielTitel,
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

pruefe("Der Seitenleisten-Knopf laesst sich ablehnen, der Stift nicht aus Versehen", () => {
  const nur = (c) => pruefeConfig(c).knoepfe.map((k) => k.function);
  const leiste = { replace_header: true, collapse: "always",
    buttons: [{ name: "Home", link: "/a" }, { function: "settings", align_end: true }] };
  // Ohne das Feld kommt er dazu - das war und bleibt die Vorgabe.
  assert.ok(nur(leiste).includes("sidebar"));
  // Mit dem Feld nicht. Gemeldet am 16.10.2026: Mit eingeklappter Leiste
  // standen ZWEI Hamburger nebeneinander.
  assert.ok(!nur({ ...leiste, hide_sidebar_button: true }).includes("sidebar"));
  // Der Rest bleibt unberuehrt: Die eigenen Knoepfe stehen weiter da, und der
  // Stift entfaellt weiter nur, weil settings da ist.
  assert.deepStrictEqual(nur({ ...leiste, hide_sidebar_button: true }), ["", "settings"]);
  // Und ohne replace_header aendert das Feld gar nichts.
  assert.deepStrictEqual(nur({ buttons: leiste.buttons, hide_sidebar_button: true }), ["", "settings"]);
});

pruefe("Die Liste traegt immer Text, die Leiste nach Wahl", () => {
  const quelle = readFileSync(new URL("../custom_components/hats/www/hats-control-card.js", import.meta.url), "utf8");
  // Die Liste zuerst und ohne Bedingung - ein Eintrag aus einem einzigen
  // Symbol ist ein Raetsel. Gemeldet am 16.10.2026 mit einem Bild.
  assert.ok(/if \(e\._inListe\) name = name \|\| titel;/.test(quelle));
  assert.ok(/else if \(this\._config\?\.beschriftung === "icons"\) name = "";/.test(quelle));
  assert.ok(/else if \(this\._config\?\.beschriftung === "text"\) name = name \|\| titel;/.test(quelle));
  // Drei Werte, und "auto" ist die Vorgabe - eine bestehende Leiste aendert
  // sich also nicht.
  assert.deepStrictEqual(BESCHRIFTUNGEN, ["auto", "icons", "text"]);
  assert.strictEqual(pruefeConfig({}).beschriftung, "auto");
  assert.strictEqual(pruefeConfig({ labels: "icons" }).beschriftung, "icons");
  assert.strictEqual(pruefeConfig({ labels: "quatsch" }).beschriftung, "auto");
});

pruefe("Ein Ziel ohne Namen bekommt den Titel seines Dashboards", () => {
  // Sonst stuende dort sein Symbol als Text ("mdi:menu"). Gemessen an der
  // Hausinstallation: hass.panels["dashboard-glaswerk"].title ist "Glaswerk".
  const hass = { panels: { "dashboard-glaswerk": { title: "Glaswerk" }, lovelace: { title: null } } };
  assert.strictEqual(zielTitel("/dashboard-glaswerk", hass), "Glaswerk");
  // Auch mit Ansicht dahinter - genommen wird der erste Pfadteil.
  assert.strictEqual(zielTitel("/dashboard-glaswerk/0", hass), "Glaswerk");
  // Und sauber leer, wo nichts zu holen ist.
  assert.strictEqual(zielTitel("/lovelace", hass), "");
  assert.strictEqual(zielTitel("/gibtsnicht", hass), "");
  assert.strictEqual(zielTitel(undefined, hass), "");
  assert.strictEqual(zielTitel("/dashboard-glaswerk", undefined), "");
});

pruefe("Ohne Namen traegt der Menueknopf keinen Pfeil", () => {
  // Sonst nimmt der Pfeil im Quadrat von --_h Platz weg, und das Symbol
  // rutscht aus der Mitte. Gemeldet am 16.10.2026 mit einem Bild.
  const quelle = readFileSync(new URL("../custom_components/hats/www/hats-control-card.js", import.meta.url), "utf8");
  assert.ok(/\.menueknopf\.nur-symbol \.pfeil \{ display: none; \}/.test(quelle));
  // Gegenprobe: "nur-symbol" wird wirklich nur ohne Namen gesetzt.
  assert.ok(/e\.classList\.toggle\("nur-symbol", !name\);/.test(quelle));
});

pruefe("Unten geheftet klebt die Leiste nicht zusaetzlich oben fest", () => {
  // Beide setzen position: fixed an dieselbe ha-card - der eine top, der
  // andere bottom. Zusammen zerrten sie die Leiste ueber die ganze Hoehe.
  const quelle = readFileSync(new URL("../custom_components/hats/www/hats-control-card.js", import.meta.url), "utf8");
  assert.ok(/const untenGeheftet = this\._config\.platzierung === "bottom";/.test(quelle));
  assert.ok(/this\._klebe\(this\._config\.kopf && !bearbeiten && !untenGeheftet\);/.test(quelle));
  // Und beide Lagen gibt es wirklich.
  assert.strictEqual(pruefeConfig({ placement: "bottom" }).platzierung, "bottom");
  assert.strictEqual(pruefeConfig({}).platzierung, "inline");
  assert.strictEqual(pruefeConfig({ placement: "quatsch" }).platzierung, "inline");
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

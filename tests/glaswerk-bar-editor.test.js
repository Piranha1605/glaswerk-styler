// Der Editor der Steuerkarte und das Einklappen, wenn die Reihe nicht passt.
// Beides am 14.10.2026 auf einem Bild des Maintainers gesehen: vier leere
// Zeilen im Editor, und in der Vorschau ein Knopf halb hinter dem Rand.
//
// Die Erwartungen kommen aus zwei Stellen, nicht aus dem Code:
//   - die Leiste des Maintainers, woertlich vom Server der Testmaschine, dazu
//     der Knopf "appearance", den sie seit dem Abend traegt
//   - Home Assistants ha-selector-object und ha-selector-constant, aus dem
//     Buendel von 2026.10.1 gelesen (siehe CLAUDE.md)

import assert from "node:assert";
import {
  knopfZeile, mitZeilen, ohneZeilen, kartenFormular, mehrInDieListe, inDieListe,
  pruefeConfig, geordnet, FUNKTIONEN, TEXTE,
} from "../custom_components/glaswerk/www/glaswerk-bar.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const de = TEXTE.de;
const LEISTE = {
  type: "custom:glaswerk-bar",
  probe: 1,
  collapse: "narrow",
  buttons: [
    { icon: "mdi:home-outline", link: "/hats-test", name: "Home" },
    { icon: "mdi:compare-horizontal", link: "/hats-test/vergleich", name: "Vergleich" },
    { align_end: true, entity: "weather.forecast_home", function: "weather", name: "Bösel ",
      separator_before: true, temperature: "sensor.outside_temperature", temperature_source: "weather" },
    { icon: "mdi:view-grid", link: "/hats-test/alles", name: "Alles" },
    { icon: "mdi:hammer-wrench", link: "/hats-test/eigene", name: "Eigene" },
    { align_end: true, function: "fullscreen" },
    { align_end: true, function: "theme" },
    { function: "motion", align_end: true },
    { function: "appearance", align_end: true },
  ],
};

// So beschriftet Home Assistant eine Zeile, aus ha-selector-object gelesen:
// ein Feld, wenn label_field unter den Feldern steht, sonst alle mit " · ".
// Formatiert ist hier nur, was die Pruefung braucht: Text, Auswahl und
// Schalter als roher Wert, ein constant ebenso.
function zeileWieHA(selector, item) {
  const { fields, label_field: lf, description_field: df } = selector.object;
  const roh = (v) => (v == null ? "" : String(v));
  const label = lf && lf in fields ? roh(item[lf])
    : Object.keys(fields).map((k) => roh(item[k])).filter(Boolean).join(" · ");
  return { label, unter: df && df in fields ? roh(item[df]) : "" };
}
const knoepfeSchema = (formular) => formular.schema.find((f) => f.name === "buttons").selector;

pruefe("Gegenprobe: Mit name als Beschriftung bleiben vier Zeilen leer", () => {
  // Das war das Bild. Ohne diese Gegenprobe pruefte der Rest nichts.
  const alt = knoepfeSchema(kartenFormular(de, false));
  const leer = LEISTE.buttons.filter((b) => !zeileWieHA(alt, b).label);
  assert.strictEqual(leer.length, 4);
});

pruefe("Mit den Anzeigefeldern hat jede Zeile eine Beschriftung, und die richtige", () => {
  const sel = knoepfeSchema(kartenFormular(de, true));
  const daten = mitZeilen(LEISTE, undefined, de);
  const zeilen = daten.buttons.map((b) => zeileWieHA(sel, b));
  assert.deepStrictEqual(zeilen.map((z) => z.label), [
    "Home", "Vergleich", "Bösel", "Alles", "Eigene",
    "Vollbild", "Hell / Dunkel", "Bewegung des Hintergrunds", "Transparenz und Schrift",
  ]);
  // Darunter steht, was der Knopf tut - wenn oben ein Name steht.
  assert.deepStrictEqual(zeilen.map((z) => z.unter), [
    "/hats-test", "/hats-test/vergleich", "Wetter", "/hats-test/alles", "/hats-test/eigene", "", "", "", "",
  ]);
});

pruefe("Die Anzeigefelder zeichnet HA im Unterformular nicht", () => {
  // ha-selector-constant rendert `label ?? value` - mit "" als Beschriftung
  // also nichts. Mit undefined stuende der Wert da, mit einem Text der Text.
  const { fields } = knoepfeSchema(kartenFormular(de, true)).object;
  for (const name of ["_zeile", "_zeile_unter"]) {
    assert.deepStrictEqual(fields[name], { selector: { constant: { value: "", label: "" } } }, name);
  }
  // Gegenprobe: Ohne den eigenen Editor gibt es sie gar nicht.
  const ohne = knoepfeSchema(kartenFormular(de, false)).object.fields;
  assert.ok(!("_zeile" in ohne) && !("_zeile_unter" in ohne));
});

pruefe("In der Konfiguration landen die Anzeigefelder nie", () => {
  const mit = mitZeilen(LEISTE, undefined, de);
  assert.ok(mit.buttons.every((b) => "_zeile" in b && "_zeile_unter" in b), "mitZeilen hat nichts angelegt");
  assert.deepStrictEqual(ohneZeilen(mit), LEISTE);
  // Und HA reicht beim Bearbeiten das ganze Objekt zurueck, Anzeigefelder samt
  // geaenderter Werte - auch das kommt sauber heraus.
  const bearbeitet = { ...mit, buttons: [...mit.buttons.slice(0, 5), { ...mit.buttons[5], name: "Groß" }, ...mit.buttons.slice(6)] };
  const sauber = ohneZeilen(bearbeitet);
  assert.ok(!JSON.stringify(sauber).includes("_zeile"));
  assert.strictEqual(sauber.buttons[5].name, "Groß");
  // Die Eingabe selbst bleibt unangetastet.
  assert.ok(!JSON.stringify(LEISTE).includes("_zeile"));
});

pruefe("Ohne buttons und mit kaputten Eintraegen passiert nichts", () => {
  const kurz = { type: "custom:glaswerk-bar", controls: ["mode"] };
  assert.strictEqual(mitZeilen(kurz, undefined, de), kurz);
  assert.strictEqual(ohneZeilen(kurz), kurz);
  assert.deepStrictEqual(ohneZeilen(mitZeilen({ buttons: [null, "x"] }, undefined, de)), { buttons: [null, "x"] });
});

pruefe("Ein Schalter heisst wie seine Entitaet, ein Knopf ohne alles nach seiner Stelle", () => {
  const hass = { states: { "light.kueche": { attributes: { friendly_name: "Küche" } } } };
  assert.deepStrictEqual(knopfZeile({ entity: "light.kueche" }, 0, hass, de), { titel: "Küche", unter: "" });
  assert.deepStrictEqual(knopfZeile({ entity: "light.kueche", name: "Licht" }, 0, hass, de), { titel: "Licht", unter: "Küche" });
  // Ohne hass - das erste setConfig kommt vor ihm - die ID.
  assert.deepStrictEqual(knopfZeile({ entity: "light.kueche" }, 0, undefined, de), { titel: "light.kueche", unter: "" });
  assert.deepStrictEqual(knopfZeile({}, 2, undefined, de), { titel: "Knopf 3", unter: "" });
  assert.deepStrictEqual(knopfZeile({ icon: "mdi:x" }, 0, undefined, de), { titel: "mdi:x", unter: "" });
});

pruefe("Jede Funktion hat in beiden Sprachen einen Namen fuer Zeile und Auswahl", () => {
  for (const spr of ["de", "en"]) {
    for (const f of FUNKTIONEN) {
      assert.ok(TEXTE[spr].funktion[f], `${spr}: ${f}`);
      assert.strictEqual(knopfZeile({ function: f }, 0, undefined, TEXTE[spr]).titel, TEXTE[spr].funktion[f]);
    }
  }
});

pruefe("Die beiden Sprachbaeume tragen dieselben Schluessel", () => {
  // "Alles, was nach aussen geht, immer in beiden Sprachen" - bis zum
  // 16.10.2026 hat das niemand geprueft. Aufgefallen beim Gegenpruefen von
  // `in_menu`: Die DEUTSCHE Beschriftung zu loeschen machte den Test rot (das
  // Formular meldet ein Feld ohne Label), die ENGLISCHE nicht. Ein englischer
  // Nutzer haette ein Feld ohne Namen gesehen, und niemand haette es gemerkt.
  const wege = (o, vor = "") => Object.entries(o).flatMap(([k, v]) =>
    (v && typeof v === "object" && !Array.isArray(v)) ? wege(v, `${vor}${k}.`) : [`${vor}${k}`]);
  const de = wege(TEXTE.de).sort();
  const en = wege(TEXTE.en).sort();
  assert.deepStrictEqual(de.filter((k) => !en.includes(k)), [], "fehlt in TEXTE.en");
  assert.deepStrictEqual(en.filter((k) => !de.includes(k)), [], "fehlt in TEXTE.de");
  // Gegenprobe: Der Vergleich faendet ueberhaupt etwas - ohne sie waere ein
  // leerer Baum auf beiden Seiten auch "gleich".
  assert.ok(de.length > 100, `nur ${de.length} Schluessel gelesen - der Baum wird nicht gefunden`);
  assert.ok(de.includes("knopffeld.in_menu") && en.includes("knopffeld.in_menu"));
});

pruefe("Das Unterformular bietet auch tap_action und die Quelle der Temperatur an", () => {
  const { fields } = knoepfeSchema(kartenFormular(de, true)).object;
  assert.deepStrictEqual(fields.tap_action.selector, { ui_action: {} });
  assert.deepStrictEqual(fields.temperature_source.selector.select.options.map((o) => o.value), ["sensor", "weather"]);
  for (const o of fields.temperature_source.selector.select.options) assert.ok(o.label, o.value);
  // Jedes Feld des Unterformulars hat eine Beschriftung - bis auf die beiden,
  // die man nicht sehen soll.
  const ohneLabel = Object.entries(fields).filter(([, f]) => !f.label).map(([k]) => k);
  assert.deepStrictEqual(ohneLabel, ["_zeile", "_zeile_unter"]);
});

// ---- Einklappen, wenn die Reihe nicht passt -----------------------------------

const einstellung = (config) => pruefeConfig(config);

pruefe("Die Leiste des Maintainers: erst die Ziele, dann vom rechten Ende her", () => {
  const e = einstellung(LEISTE);
  const schritte = [];
  let plan = { zu: false, weg: 0 };
  for (let i = 0; i < 20 && plan; i++) {
    schritte.push(`${plan.zu ? "zu" : "auf"}/${plan.weg}`);
    plan = mehrInDieListe(plan, e, true);
  }
  // Fuenf Knoepfe am Rand: Wetter, Vollbild, Hell/Dunkel, Bewegung, Darstellung.
  assert.deepStrictEqual(schritte, ["auf/0", "zu/0", "zu/1", "zu/2", "zu/3", "zu/4", "zu/5"]);
});

pruefe("Was in der Liste steht: die Ziele, dazu die letzten am Rand - Darstellung zuerst", () => {
  const kn = einstellung(LEISTE).knoepfe;
  const namen = (menge) => kn.filter((k) => menge.has(k)).map((k) => k.name || k.function);
  assert.deepStrictEqual(namen(inDieListe(kn, false, 0)), []);
  assert.deepStrictEqual(namen(inDieListe(kn, true, 0)), ["Home", "Vergleich", "Alles", "Eigene"]);
  assert.deepStrictEqual(namen(inDieListe(kn, true, 1)), ["Home", "Vergleich", "Alles", "Eigene", "appearance"]);
  assert.deepStrictEqual(namen(inDieListe(kn, true, 2)), ["Home", "Vergleich", "Alles", "Eigene", "motion", "appearance"]);
  // "Vom rechten Ende" heisst in der Reihenfolge, in der die Reihe sie zeigt.
  const rechts = geordnet(kn).filter((k) => k.align_end).at(-1);
  assert.ok(inDieListe(kn, true, 1).has(rechts));
});

pruefe("`in_menu` legt einen Knopf ins Menue, ohne dass die Leiste einklappt", () => {
  // Auf Ansage vom 16.10.2026: "könnten wir hier eine option einbauen zum menü
  // hinzufügen. dann landen diese einträge im menü und der rest in der
  // leiste". Das Einklappen entscheidet nach PLATZ, `in_menu` entscheidet der
  // Nutzer - und zwar auch dann, wenn alles bequem passt.
  const e = einstellung({ collapse: "never", buttons: [
    { name: "Home", link: "/home" },
    { name: "Garten", link: "/garten", in_menu: true },
    { entity: "light.kueche", in_menu: true },
    { function: "fullscreen", align_end: true },
  ] });
  const kn = e.knoepfe;
  const namen = (menge) => kn.filter((k) => menge.has(k)).map((k) => k.name || k.entity || k.function);
  // Ausgeklappt steht genau das in der Liste, was gewaehlt wurde.
  assert.deepStrictEqual(namen(inDieListe(kn, false, 0)), ["Garten", "light.kueche"]);
  // Eingeklappt kommen die uebrigen Ziele dazu - und keines doppelt.
  assert.deepStrictEqual(namen(inDieListe(kn, true, 0)), ["Home", "Garten", "light.kueche"]);
  assert.deepStrictEqual(namen(inDieListe(kn, true, 1)), ["Home", "Garten", "light.kueche", "fullscreen"]);

  // Gegenprobe: ohne das Feld bleibt die Liste ausgeklappt leer.
  const ohne = einstellung({ collapse: "never", buttons: [
    { name: "Home", link: "/home" }, { name: "Garten", link: "/garten" }] });
  assert.deepStrictEqual(inDieListe(ohne.knoepfe, false, 0).size, 0);
});

pruefe("Die Seitenleiste bleibt in der Reihe, auch wenn jemand sie ins Menue schickt", () => {
  // Sie ersetzt HAs Menueknopf. Am Telefon ist sie der einzige Weg in die
  // Seitenleiste und damit zu den Einstellungen - in einer Liste, die man
  // ueber einen zweiten Menueknopf aufklappen muesste, waere sie verloren.
  const e = einstellung({ collapse: "never", buttons: [
    { function: "sidebar", in_menu: true }, { name: "Home", link: "/home", in_menu: true }] });
  const drin = inDieListe(e.knoepfe, false, 0);
  assert.deepStrictEqual([...drin].map((k) => k.name || k.function), ["Home"]);
  assert.ok(!inDieListe(e.knoepfe, true, 0).has(e.knoepfe[0]), "auch eingeklappt nicht");
});

pruefe("Was schon im Menue steht, ist kein Grund einzuklappen", () => {
  // Sonst klappte eine Leiste ein, die dadurch keinen einzigen Pixel gewinnt:
  // Der Eintrag liegt ja bereits in der Liste.
  const nurGewaehlt = einstellung({ collapse: "narrow", buttons: [
    { name: "Garten", link: "/garten", in_menu: true },
    { function: "fullscreen", align_end: true } ] });
  assert.deepStrictEqual(mehrInDieListe({ zu: false, weg: 0 }, nurGewaehlt, true), { zu: true, weg: 1 });
  // Gegenprobe: dasselbe ohne in_menu klappt erst einmal nur ein.
  const frei = einstellung({ collapse: "narrow", buttons: [
    { name: "Garten", link: "/garten" },
    { function: "fullscreen", align_end: true } ] });
  assert.deepStrictEqual(mehrInDieListe({ zu: false, weg: 0 }, frei, true), { zu: true, weg: 0 });
});

pruefe("'nie' heisst nie, und das Badge klappt nicht ein", () => {
  assert.strictEqual(mehrInDieListe({ zu: false, weg: 0 }, einstellung({ ...LEISTE, collapse: "never" }), true), null);
  assert.strictEqual(mehrInDieListe({ zu: false, weg: 0 }, einstellung(LEISTE), false), null);
  // Gegenprobe: Ohne Angabe ist es auch "nie" (einklappArt) - die Vorgabe
  // aendert sich durch das Passen nicht.
  const { collapse, ...ohne } = LEISTE;
  assert.strictEqual(collapse, "narrow");
  assert.strictEqual(mehrInDieListe({ zu: false, weg: 0 }, einstellung(ohne), true), null);
});

pruefe("Ohne Ziele kommt mit dem Menue gleich der erste Knopf, mit 'immer' geht es bei den Raendern weiter", () => {
  const nurRand = einstellung({ collapse: "narrow", buttons: [
    { function: "fullscreen", align_end: true }, { function: "theme", align_end: true }] });
  assert.deepStrictEqual(mehrInDieListe({ zu: false, weg: 0 }, nurRand, true), { zu: true, weg: 1 });
  const immer = einstellung({ ...LEISTE, collapse: "always" });
  assert.deepStrictEqual(mehrInDieListe({ zu: true, weg: 0 }, immer, true), { zu: true, weg: 1 });
});

console.log(`\n${n} Pruefungen`);
if (n < 12) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

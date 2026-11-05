// Die Leiste: was mit der Menueleiste der Horizon-Cards in die Steuerkarte
// gekommen ist - Ziele, Kapsel, Schalter, Wetter, Einklappen.
//
// DER MASSSTAB steht nicht hier, sondern in den Tests der Menueleiste
// (ha-karten, karten/menue-karte/quelle/helpers.test.js). Deren Erwartungen
// sind uebernommen, damit die zusammengefuegte Karte nachweislich dasselbe
// antwortet wie die alte. Wo sie mit Absicht ANDERS antwortet, steht es dabei.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  leseKnoepfe, pruefeConfig, knopfAktion, knopfPfad, normPfad, pfadwert, aktiverIndex,
  geordnet, einklappArt, eingeklappt, istAn, istHell, flaechenfarbe, wetterText, FUNKTIONEN,
} from "../custom_components/glaswerk/www/glaswerk-bar.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const knoepfe = (...liste) => leseKnoepfe({ buttons: liste });

// ---- Konfiguration ---------------------------------------------------------

pruefe("Eine Liste wird gelesen, und was kein Knopf ist, faellt heraus", () => {
  const k = leseKnoepfe({ buttons: [{ name: "Home" }, null, "nope"] });
  assert.strictEqual(k.length, 1);
  assert.strictEqual(k[0].name, "Home");
  assert.strictEqual(k[0].index, 0);
  assert.deepStrictEqual(leseKnoepfe({ buttons: [] }), []);
});

pruefe("ANDERS als die Menueleiste: ohne `buttons` gilt die Kurzform der Steuerkarte", () => {
  // Dort war eine Konfiguration ohne Knoepfe eine leere Leiste. Hier ist sie
  // die Steuerkarte, wie sie vor dem Zusammenfuegen war.
  assert.deepStrictEqual(leseKnoepfe({}).map((k) => k.function), ["mode", "fullscreen"]);
  assert.deepStrictEqual(leseKnoepfe({ controls: ["fullscreen"] }).map((k) => k.function), ["fullscreen"]);
  // Und `buttons` schlaegt `controls`, sobald es da ist - auch leer.
  assert.deepStrictEqual(leseKnoepfe({ buttons: [], controls: ["mode"] }), []);
});

pruefe("ANDERS als die Menueleiste: eine unbekannte Funktion ist ein Fehler", () => {
  // Dort blieb der Knopf stumm ein gewoehnlicher. Ein Tippfehler steht dann
  // als Knopf ohne Wirkung da, und niemand erfaehrt, warum.
  assert.throws(() => knoepfe({ function: "teleport", link: "/lovelace/0" }), /teleport/);
  assert.throws(() => leseKnoepfe({ buttons: "nope" }), /Liste|list/);
  // Gegenprobe: Die bekannten gehen alle durch.
  assert.deepStrictEqual(knoepfe(...FUNKTIONEN.map((f) => ({ function: f }))).map((k) => k.function), FUNKTIONEN);
});

pruefe("Fuellen und Lampenfarbe sind an, bis jemand ausdruecklich false sagt", () => {
  const [k] = knoepfe({ entity: "light.kitchen" });
  assert.strictEqual(k.state_background, true);
  assert.strictEqual(k.light_background, true);
  assert.strictEqual(knoepfe({ state_background: false })[0].state_background, false);
  assert.strictEqual(knoepfe({ light_background: false })[0].light_background, false);
  assert.strictEqual(knoepfe({ state_background: "nope" })[0].state_background, true);
});

pruefe("Ein Name mit Leerzeichen am Rand wird beschnitten", () => {
  // So steht es im Dashboard des Nutzers: name: "Bösel " - mit dem Wert
  // dahinter gaebe das zwei Leerzeichen.
  assert.strictEqual(knoepfe({ name: "Bösel " })[0].name, "Bösel");
});

// ---- Aktionen ---------------------------------------------------------------

pruefe("Ein Pfad navigiert, eine Entitaet schaltet um, eine Aktion schlaegt beides", () => {
  assert.deepStrictEqual(knopfAktion(knoepfe({ link: "/lovelace/0" })[0]).tap_action,
    { action: "navigate", navigation_path: "/lovelace/0" });
  assert.deepStrictEqual(knopfAktion(knoepfe({ entity: "light.kitchen" })[0]),
    { entity: "light.kitchen", tap_action: { action: "toggle" } });
  assert.deepStrictEqual(
    knopfAktion(knoepfe({ link: "/lovelace/0", tap_action: { action: "more-info" } })[0]).tap_action,
    { action: "more-info" });
  // Ohne alles: nichts tun, statt etwas zu raten.
  assert.deepStrictEqual(knopfAktion(knoepfe({ name: "x" })[0]).tap_action, { action: "none" });
});

pruefe("Das Ziel wird gefunden, ob als link oder in einer tap_action geschrieben", () => {
  assert.strictEqual(knopfPfad(knoepfe({ link: "/home" })[0]), "/home");
  assert.strictEqual(knopfPfad(knoepfe({ tap_action: { action: "navigate", navigation_path: "/home" } })[0]), "/home");
  // Ein #anker ist kein Pfad, und ein Funktionsknopf fuehrt nirgends hin.
  assert.strictEqual(knopfPfad(knoepfe({ link: "#kitchen" })[0]), "");
  assert.strictEqual(knopfPfad(knoepfe({ function: "theme", link: "/home" })[0]), "");
});

// ---- Pfade und Kapsel -------------------------------------------------------

pruefe("Schraegstrich am Ende und Abfrage sagen nichts ueber die Ansicht", () => {
  assert.strictEqual(normPfad("/lovelace/0/"), "/lovelace/0");
  assert.strictEqual(normPfad("/lovelace/0?edit=1"), "/lovelace/0");
  assert.strictEqual(normPfad(""), "");
});

pruefe("Der genaue Treffer schlaegt den Pfad darueber, die Unterseite haelt den Knopf", () => {
  assert.ok(pfadwert("/home/kitchen", "/home/kitchen") > pfadwert("/home", "/home/kitchen"));
  assert.ok(pfadwert("/home/kitchen", "/home/kitchen/1") > 0);
  // Ein Knopf, der nirgends hinzeigt, passt nie.
  assert.strictEqual(pfadwert("/", "/home"), 0);
  assert.strictEqual(pfadwert("", "/home"), 0);
  // Gegenprobe: Ein Name, der nur gleich ANFAENGT, ist keine Unterseite.
  assert.strictEqual(pfadwert("/home", "/homeoffice"), 0);
});

pruefe("Die Kapsel landet auf dem Ziel der Adresse - nie auf Schalter oder Funktion", () => {
  assert.strictEqual(aktiverIndex(knoepfe({ link: "/home" }, { link: "/home/kitchen" }), "/home/kitchen"), 1);
  assert.strictEqual(aktiverIndex(knoepfe({ entity: "light.kitchen", link: "/home" }), "/home"), -1);
  assert.strictEqual(aktiverIndex(knoepfe({ function: "theme" }, { function: "fullscreen" }), "/home"), -1);
  assert.strictEqual(aktiverIndex(knoepfe({ link: "/home" }), "/settings"), -1);
});

pruefe("Die Leiste des Nutzers: auf jeder Ansicht der richtige Knopf", () => {
  // Aus werkzeuge/sicherungen/dashboards/dashboard-home.json, gekuerzt.
  const leiste = knoepfe(
    { icon: "mdi:home-outline", link: "/dashboard-home", name: "Home" },
    { icon: "mdi:ceiling-light-multiple", link: "/dashboard-home/licht", name: "Licht" },
    { function: "weather", entity: "weather.forecast_home", align_end: true, separator_before: true },
    { icon: "mdi:radiator", link: "/dashboard-home/heizung", name: "Heizung" },
    { function: "fullscreen", align_end: true },
    { function: "theme", align_end: true },
  );
  const name = (adresse) => leiste[aktiverIndex(leiste, adresse)]?.name;
  assert.strictEqual(name("/dashboard-home/licht"), "Licht");
  assert.strictEqual(name("/dashboard-home/heizung"), "Heizung");
  // Die erste Ansicht hat einen eigenen Pfad unter dem Dashboard; "Home" zeigt
  // nur auf das Dashboard und haelt sie trotzdem.
  assert.strictEqual(name("/dashboard-home/uebersicht"), "Home");
  assert.strictEqual(name("/dashboard-home"), "Home");
  // Ans Ende geschoben heisst: hinten in der Anzeige, der index bleibt.
  assert.deepStrictEqual(geordnet(leiste).map((k) => k.index), [0, 1, 3, 2, 4, 5]);
});

pruefe("Ans Ende geschoben kommt zuletzt, und der index wandert mit", () => {
  const k = knoepfe({ name: "a", align_end: true }, { name: "b" }, { name: "c", align_end: true });
  assert.deepStrictEqual(geordnet(k).map((x) => x.name), ["b", "a", "c"]);
  assert.deepStrictEqual(geordnet(knoepfe({ name: "a", align_end: true }, { name: "b" })).map((x) => x.index), [1, 0]);
});

// ---- Einklappen -------------------------------------------------------------

const zu = (config, breite) => eingeklappt(pruefeConfig({ buttons: [], ...config }), breite);

pruefe("Das alte true und false meint, was es meinte", () => {
  assert.strictEqual(einklappArt({ collapse: true }), "always");
  assert.strictEqual(einklappArt({ collapse: false }), "never");
  assert.strictEqual(einklappArt({}), "never");
  assert.strictEqual(einklappArt({ collapse: "nonsense" }), "never");
});

pruefe("always und never fragen nicht nach der Breite, narrow schon", () => {
  assert.strictEqual(zu({ collapse: "always" }, 2000), true);
  assert.strictEqual(zu({ collapse: "never" }, 100), false);
  assert.strictEqual(zu({ collapse: "narrow" }, 380), true);
  assert.strictEqual(zu({ collapse: "narrow" }, 900), false);
  assert.strictEqual(zu({ collapse: "narrow", collapse_width: 300 }, 380), false);
});

pruefe("Eine ungemessene Karte bleibt ausgelegt", () => {
  assert.strictEqual(zu({ collapse: "narrow" }, 0), false);
  assert.strictEqual(zu({ collapse: "narrow" }, undefined), false);
});

// ---- Schalter ---------------------------------------------------------------

pruefe("An ist, was nicht ausdruecklich aus oder weg ist", () => {
  for (const s of ["on", "heat", "open", "playing", "home", "unlocked"]) assert.strictEqual(istAn({ state: s }), true, s);
  for (const s of ["off", "unavailable", "unknown", "closed", "locked", "idle"]) assert.strictEqual(istAn({ state: s }), false, s);
  assert.strictEqual(istAn(undefined), false);
});

pruefe("Die Lampenfarbe gewinnt, sonst Home Assistants Zustandsfarbe der Domaene", () => {
  const lampe = { state: "on", attributes: { rgb_color: [255, 164, 82] } };
  const [k] = knoepfe({ entity: "light.kueche" });
  assert.strictEqual(flaechenfarbe(k, lampe), "rgb(255, 164, 82)");
  // Ohne Farbe an der Lampe, oder wenn sie nicht gewollt ist:
  const hausfarbe = "var(--state-light-active-color, var(--state-active-color))";
  assert.strictEqual(flaechenfarbe(k, { state: "on", attributes: {} }), hausfarbe);
  assert.strictEqual(flaechenfarbe(knoepfe({ entity: "light.kueche", light_background: false })[0], lampe), hausfarbe);
  assert.strictEqual(flaechenfarbe(knoepfe({ entity: "switch.luefter" })[0], { state: "on", attributes: {} }),
    "var(--state-switch-active-color, var(--state-active-color))");
});

pruefe("Die Flaechenfarbe steht auch als Eigenschaft da - sonst verschwindet der Schalter", () => {
  // Am 16.10.2026 auf Ansage: "nur soll er den selben Farbverlauf bekommen
  // wie unsere andern schalter und button". Die Vorlage `verlauf-kapsel` baut
  // den Verlauf aus --glaswerk-flaeche; CSS kann die Flaechenfarbe eines Elements
  // nicht selbst in ein linear-gradient() hineinlesen.
  //
  // WARUM DAS EIN TEST IST UND KEINE NOTIZ: Faellt die Zeile in der Karte weg,
  // ist --glaswerk-flaeche nicht gesetzt, color-mix() damit ungueltig, und
  // background-image faellt auf `none` zurueck - waehrend das
  // `background-color: transparent !important` der Vorlage stehen BLEIBT. Der
  // eingeschaltete Schalter waere dann nicht flach, sondern UNSICHTBAR. Am
  // 16.10.2026 an Chrome nachgemessen, mit und ohne Eigenschaft:
  //
  //     ohne   background-color rgba(0, 0, 0, 0)   background-image none
  //     mit    background-color rgba(0, 0, 0, 0)   background-image der Verlauf
  //
  // Geprueft wird der Quelltext, weil die Stelle kein eigener Aufruf ist.
  const karte = readFileSync(new URL("../custom_components/glaswerk/www/glaswerk-bar.js", import.meta.url), "utf8");
  const stelle = karte.slice(karte.indexOf("const farbe = flaechenfarbe("), karte.indexOf("e.classList.toggle(\"hell\""));
  assert.ok(stelle.length > 0 && stelle.length < 2000, "die Stelle, an der gefuellt wird, ist nicht mehr zu finden");
  assert.match(stelle, /setProperty\("--glaswerk-flaeche", farbe\)/,
    "die Karte legt die Flaechenfarbe nicht mehr als --glaswerk-flaeche ab");
  assert.match(stelle, /backgroundColor = farbe/,
    "die Eigenschaft und die Flaeche tragen nicht mehr denselben Wert");

  // Und die Gegenseite: die Vorlage muss genau diesen Namen lesen. Ein
  // Tippfehler auf einer der beiden Seiten faellt sonst nirgends auf.
  const vorlagen = readFileSync(new URL("../custom_components/glaswerk/www/vorlagen.js", import.meta.url), "utf8");
  const v = vorlagen.slice(vorlagen.indexOf('id: "verlauf-kapsel"'));
  const block = v.slice(0, v.indexOf("\n  },"));
  assert.strictEqual((block.match(/var\(--glaswerk-flaeche\)/g) || []).length, 2,
    "verlauf-kapsel liest --glaswerk-flaeche nicht zweimal");
});

pruefe("Auf einer hellen Flaeche steht dunkle Schrift", () => {
  assert.strictEqual(istHell(255, 255, 255), true);
  assert.strictEqual(istHell(255, 193, 7), true);      // HAs Gelb fuer "an"
  assert.strictEqual(istHell(255, 164, 82), true);     // warmweisse Lampe
  // Gegenprobe: Auf diesen bleibt die Schrift weiss.
  assert.strictEqual(istHell(0, 0, 0), false);
  assert.strictEqual(istHell(30, 60, 160), false);
  assert.strictEqual(istHell(180, 30, 30), false);
  // Die Grenze ist gerechnet, nicht gefuehlt: Bei Leuchtdichte 0.179 haben
  // Schwarz und Weiss denselben Kontrast. Ein Mittelton wie HAs Cyan liegt
  // darueber - Schwarz steht darauf mit 6,4 : 1, Weiss mit 3,3 : 1. Ich hatte
  // hier zuerst das Gegenteil erwartet und lag falsch, nicht die Funktion.
  assert.strictEqual(istHell(0, 154, 199), true);
});

// ---- Wetter -----------------------------------------------------------------

// Home Assistants eigene Formatierer, nachgebaut nur so weit, dass man sieht,
// WELCHER gerufen wurde und womit.
const hassMit = (states) => ({
  states,
  formatEntityState: (z) => `[zustand ${z.entity_id}]`,
  formatEntityAttributeValue: (z, a) => `[${a} ${z.entity_id}]`,
});
const WETTER = { entity_id: "weather.daheim", state: "sunny", attributes: { temperature: 14.9 } };
const SENSOR = { entity_id: "sensor.aussen", state: "15.6", attributes: {} };

pruefe("Ohne Sensor kommt der Wert aus der Wetterentitaet", () => {
  const [k] = knoepfe({ function: "weather", entity: "weather.daheim" });
  const w = wetterText(hassMit({ "weather.daheim": WETTER }), k);
  assert.strictEqual(w.text, "[temperature weather.daheim]");
  assert.strictEqual(w.wetter, WETTER);
});

pruefe("Ein eingetragener Sensor gewinnt - bis temperature_source ihn abwaehlt", () => {
  const z = { "weather.daheim": WETTER, "sensor.aussen": SENSOR };
  const mit = knoepfe({ function: "weather", entity: "weather.daheim", temperature: "sensor.aussen" })[0];
  assert.strictEqual(wetterText(hassMit(z), mit).text, "[zustand sensor.aussen]");
  // So steht es im Dashboard des Nutzers: Sensor eingetragen, Quelle "weather".
  const ab = knoepfe({ function: "weather", entity: "weather.daheim", temperature: "sensor.aussen",
                       temperature_source: "weather", name: "Bösel " })[0];
  assert.strictEqual(wetterText(hassMit(z), ab).text, "Bösel [temperature weather.daheim]");
});

pruefe("Faellt der Sensor aus, uebernimmt die Wetterentitaet; faellt alles aus, steht ein Strich", () => {
  const k = knoepfe({ function: "weather", entity: "weather.daheim", temperature: "sensor.aussen" })[0];
  const weg = { ...SENSOR, state: "unavailable" };
  assert.strictEqual(wetterText(hassMit({ "weather.daheim": WETTER, "sensor.aussen": weg }), k).text,
    "[temperature weather.daheim]");
  const nichts = wetterText(hassMit({}), k);
  assert.strictEqual(nichts.text, "—");
  assert.strictEqual(nichts.wetter, null);
  // Eine Wetterentitaet, die nicht erreichbar ist, liefert auch kein Symbol.
  assert.strictEqual(wetterText(hassMit({ "weather.daheim": { ...WETTER, state: "unavailable" } }), k).wetter, null);
});

console.log(`\n${n} Pruefungen`);
if (n < 20) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

// Die Steuerkarte. Geprueft wird, was sich ohne Browser pruefen laesst: die
// Regel, wann der Modus schaltbar ist, was mit den Ereignissen mitgeht, und
// dass die Datei nichts benutzt, was Home Assistant nicht stellt.
//
// Was hier NICHT geprueft werden kann, ist, ob Home Assistant auf die
// Ereignisse hoert. Das ist an der Instanz gemessen und steht in CLAUDE.md.

import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BEDIENTEILE, modusLage, modusDetail, pruefeConfig, sprache }
  from "../custom_components/hats/www/hats-control-card.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.join(hier, "..");
const lies = (p) => readFileSync(path.join(wurzel, p), "utf8");
const quelle = lies("custom_components/hats/www/hats-control-card.js");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// ---- Das Orakel ---------------------------------------------------------
//
// HAs eigene Regel, am 13.10.2026 aus dem Buendel von 2026.10.1 abgeschrieben
// (_applyTheme). Sie steht hier ein zweites Mal und in anderer Form als in der
// Karte: Die Karte fragt "ist der Modus festgelegt?", das hier rechnet aus,
// was Home Assistant am Ende anzeigt. Schaltbar ist eine Theme genau dann,
// wenn die beiden Wahlen zu verschiedenen Ergebnissen fuehren.
function haZeigtDunkel(themes, selectedTheme, geraetDunkel) {
  let a = selectedTheme?.dark === undefined ? geraetDunkel : selectedTheme.dark;
  const r = selectedTheme?.theme
    || (a && themes.default_dark_theme ? themes.default_dark_theme : themes.default_theme);
  const o = r ? themes.themes[r] : undefined;
  if (o) {
    if (o.modes && "dark" in o.modes) { if (!("light" in o.modes)) a = true; }
    else a = false;
  }
  return { dunkel: a, theme: r };
}

const FORMEN = {
  beide:      { modes: { light: {}, dark: {} } },
  nur_dunkel: { modes: { dark: {} } },
  nur_hell:   { modes: { light: {} } },
  ohne_modes: { "primary-color": "#123456" },
  modes_leer: { modes: {} },
};

function hassMit(name, selectedTheme) {
  const themes = { default_theme: name, default_dark_theme: null, themes: FORMEN };
  // themes.theme ist die WIRKSAME Theme - Home Assistant traegt sie selbst ein.
  const wirksam = haZeigtDunkel(themes, selectedTheme, false).theme;
  return { themes: { ...themes, theme: wirksam }, selectedTheme, language: "de" };
}

pruefe("Schaltbar ist genau, was bei Home Assistant einen Unterschied macht", () => {
  const ergebnis = {};
  for (const name of [...Object.keys(FORMEN), "default"]) {
    const themes = { default_theme: name, default_dark_theme: null, themes: FORMEN };
    for (const geraetDunkel of [false, true]) {
      const hell = haZeigtDunkel(themes, { dark: false }, geraetDunkel).dunkel;
      const dunkel = haZeigtDunkel(themes, { dark: true }, geraetDunkel).dunkel;
      const lage = modusLage(hassMit(name, null));
      assert.strictEqual(lage.schaltbar, hell !== dunkel,
        `${name}: Karte sagt schaltbar=${lage.schaltbar}, HA zeigt hell->${hell} dunkel->${dunkel}`);
      if (!lage.schaltbar) {
        assert.strictEqual(lage.fest === "dark", dunkel, `${name}: fest=${lage.fest}`);
      }
      ergebnis[name] = lage.schaltbar;
    }
  }
  // Gegenprobe: Es muss beides vorkommen, sonst prueft die Schleife nichts.
  assert.deepStrictEqual(ergebnis, {
    beide: true, nur_dunkel: false, nur_hell: false, ohne_modes: false,
    modes_leer: false, default: true,
  });
});

pruefe("Angezeigt wird die Wahl - und bei einer festen Theme ihr Modus", () => {
  assert.strictEqual(modusLage(hassMit("beide", null)).aktiv, "auto");
  assert.strictEqual(modusLage(hassMit("beide", {})).aktiv, "auto");
  assert.strictEqual(modusLage(hassMit("beide", { dark: true })).aktiv, "dark");
  assert.strictEqual(modusLage(hassMit("beide", { dark: false })).aktiv, "light");
  // Eine Wahl, die nur die Theme nennt, ist fuer den Modus "automatisch".
  assert.strictEqual(modusLage(hassMit("beide", { theme: "beide" })).aktiv, "auto");
  // Fest: Die Wahl steht noch im Profil, gezeigt wird trotzdem, was gilt.
  assert.strictEqual(modusLage(hassMit("nur_dunkel", { dark: false })).aktiv, "dark");
  assert.strictEqual(modusLage(hassMit("ohne_modes", { dark: true })).aktiv, "light");
});

pruefe("Gelesen wird die wirksame Theme, nicht die Vorgabe des Servers", () => {
  // Der Server gibt "beide" vor, im Profil ist "nur_dunkel" gewaehlt.
  const hass = hassMit("beide", { theme: "nur_dunkel" });
  assert.strictEqual(hass.themes.theme, "nur_dunkel", "das Orakel setzt die Theme nicht");
  const lage = modusLage(hass);
  assert.strictEqual(lage.schaltbar, false);
  assert.strictEqual(lage.theme, "nur_dunkel");
  // Gegenprobe: ohne die Wahl im Profil ist dieselbe Instanz schaltbar.
  assert.strictEqual(modusLage(hassMit("beide", null)).schaltbar, true);
});

pruefe("Ohne hass faellt nichts um", () => {
  assert.deepStrictEqual(modusLage(undefined),
    { theme: "default", schaltbar: true, fest: null, aktiv: "auto" });
});

pruefe("Das Ereignis traegt nur dark - und fuer automatisch den Schluessel mit undefined", () => {
  assert.deepStrictEqual(modusDetail("dark"), { dark: true });
  assert.deepStrictEqual(modusDetail("light"), { dark: false });
  for (const w of ["auto", "light", "dark"]) {
    assert.deepStrictEqual(Object.keys(modusDetail(w)), ["dark"],
      `${w}: die Karte schaltet den Modus, nicht die Theme`);
  }

  // Home Assistant mischt: {...selectedTheme, ...detail}.
  const vorher = { theme: "liquid_glass", dark: true };
  const nachher = { ...vorher, ...modusDetail("auto") };
  assert.strictEqual(nachher.dark, undefined, "automatisch kommt nicht an");
  assert.strictEqual(nachher.theme, "liquid_glass", "der Theme-Name ging verloren");

  // Gegenprobe: Fehlt der Schluessel, bleibt der alte Wert stehen. Genau
  // deshalb muss er da sein.
  assert.strictEqual({ ...vorher, ...{} }.dark, true);
});

pruefe("Die Vorgabe sind alle Bedienteile, in der Reihenfolge der Liste", () => {
  assert.deepStrictEqual(BEDIENTEILE, ["mode", "fullscreen"]);
  assert.deepStrictEqual(pruefeConfig({}), { controls: ["mode", "fullscreen"], kiosk_only: false });
  assert.deepStrictEqual(pruefeConfig(undefined).controls, ["mode", "fullscreen"]);
  // Die Vorgabe ist eine Kopie - wer sie aendert, aendert nicht die Liste.
  pruefeConfig({}).controls.push("x");
  assert.deepStrictEqual(BEDIENTEILE, ["mode", "fullscreen"]);
});

pruefe("Reihenfolge und Auswahl kommen aus der Konfiguration", () => {
  assert.deepStrictEqual(pruefeConfig({ controls: ["fullscreen", "mode"] }).controls, ["fullscreen", "mode"]);
  assert.deepStrictEqual(pruefeConfig({ controls: ["mode"] }).controls, ["mode"]);
  assert.deepStrictEqual(pruefeConfig({ controls: ["mode", "mode"] }).controls, ["mode"]);
  // Eine leere Liste ist erlaubt: Im Editor entsteht sie mitten im Umbauen.
  assert.deepStrictEqual(pruefeConfig({ controls: [] }).controls, []);
});

pruefe("Ein unbekanntes Bedienteil ist ein Fehler, kein stilles Nichts", () => {
  assert.throws(() => pruefeConfig({ controls: ["mode", "vollbild"] }), /vollbild/);
  assert.throws(() => pruefeConfig({ controls: "mode" }), /Liste|list/);
  // Gegenprobe: Die bekannten gehen durch.
  assert.doesNotThrow(() => pruefeConfig({ controls: [...BEDIENTEILE] }));
});

pruefe("kiosk_only gilt nur bei einem echten true", () => {
  assert.strictEqual(pruefeConfig({ kiosk_only: true }).kiosk_only, true);
  for (const w of [false, undefined, null, "true", 1]) {
    assert.strictEqual(pruefeConfig({ kiosk_only: w }).kiosk_only, false, String(w));
  }
});

pruefe("Deutsch bei de, sonst englisch", () => {
  assert.strictEqual(sprache({ language: "de" }), "de");
  assert.strictEqual(sprache({ locale: { language: "de-CH" }, language: "en" }), "de");
  assert.strictEqual(sprache({ language: "fr" }), "en");
});

// ---- Was die Datei benutzt ------------------------------------------------

pruefe("Die Datei laedt nichts nach", () => {
  assert.ok(!/^\s*import\s/m.test(quelle), "ein import - die Karte muss allein stehen");
  assert.ok(!/\bimport\s*\(/.test(quelle), "ein dynamischer import");
  assert.ok(!/https?:\/\//.test(quelle), "eine fremde Adresse");
  assert.ok(!/@import|url\(/.test(quelle), "CSS, das etwas nachlaedt");
});

pruefe("Nur Bauteile, die Home Assistant auf jedem Dashboard anmeldet", () => {
  // Ohne die Kommentarzeilen: Dort steht <home-assistant> als Wort, nicht als
  // Bauteil, das die Karte anlegt.
  const code = quelle.split("\n").filter((z) => !/^\s*\/\//.test(z)).join("\n");
  const tags = [...new Set([...code.matchAll(/<([a-z]+(?:-[a-z]+)+)[\s>]/g)].map((m) => m[1]))].sort();
  // Gegenprobe: Der Ausdruck findet ueberhaupt etwas.
  assert.ok(tags.includes("ha-card"), "der Ausdruck findet ha-card nicht - die Pruefung waere leer");
  assert.deepStrictEqual(tags, ["ha-card", "ha-icon", "ha-ripple"]);
});

pruefe("Jede gelesene Variable ist an der Instanz gemessen", () => {
  // Am 13.10.2026 an HA 2026.10.1 mit getComputedStyle(html) abgelesen.
  const belegt = [
    "--ha-space-2", "--ha-border-radius-lg", "--primary-text-color", "--disabled-color",
    "--primary-color", "--ha-color-on-primary-loud", "--disabled-text-color",
    "--secondary-text-color", "--ha-font-size-m",
  ];
  // Home Assistant liest den Namen (hui-card-features), belegt ihn aber nicht.
  const nurGelesen = ["--ha-card-features-border-radius"];
  // Lebt nur in der Karte selbst und kommt in keiner Theme vor.
  const eigen = ["--_rund"];

  const gelesen = [...new Set([...quelle.matchAll(/var\(\s*(--[a-z0-9_-]+)/g)].map((m) => m[1]))];
  assert.ok(gelesen.length >= 8, `nur ${gelesen.length} Variablen gefunden - der Ausdruck greift nicht`);
  const fremd = gelesen.filter((v) => ![...belegt, ...nurGelesen, ...eigen].includes(v));
  assert.deepStrictEqual(fremd, [], "nicht gemessen: " + fremd.join(", "));
  // Und umgekehrt: Die Liste traegt nichts mit, was die Karte gar nicht liest.
  const tot = [...belegt, ...nurGelesen, ...eigen].filter((v) => !gelesen.includes(v));
  assert.deepStrictEqual(tot, [], "steht in der Liste, wird aber nicht gelesen: " + tot.join(", "));
});

pruefe("Keine eigene Farbe ausser HAs Weiss auf der Auswahl", () => {
  const stil = /const STIL = `([\s\S]*?)`;/.exec(quelle);
  assert.ok(stil, "STIL nicht gefunden");
  const farben = stil[1].match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [];
  // #fff steht in ha-control-select fest (.option.selected{color:#fff}); hier
  // ist es nur noch der Ausweichwert hinter --ha-color-on-primary-loud.
  assert.deepStrictEqual([...new Set(farben)], ["#fff"]);
  assert.ok(/var\(--ha-color-on-primary-loud, #fff\)/.test(stil[1]));
});

pruefe("Genau die drei Ereignisse von Home Assistant, und die richtigen steigen auf", () => {
  const namen = [...new Set([...quelle.matchAll(/new CustomEvent\("([^"]+)"/g)].map((m) => m[1]))].sort();
  assert.deepStrictEqual(namen, ["hass-kiosk-mode", "hass-notification", "settheme"]);

  // settheme und die Meldung hoert Home Assistant am Element <home-assistant>.
  // Ohne composed bleiben sie im Shadow Root der Karte stecken.
  for (const name of ["settheme", "hass-notification"]) {
    const stelle = quelle.indexOf(`new CustomEvent("${name}"`);
    const aufruf = quelle.slice(stelle, quelle.indexOf("));", stelle));
    assert.ok(/bubbles: true/.test(aufruf) && /composed: true/.test(aufruf), `${name} steigt nicht auf`);
  }
  // Der Kiosk-Modus haengt an window, nicht an einem Element.
  assert.ok(/window\.dispatchEvent\(new CustomEvent\("hass-kiosk-mode"/.test(quelle));
});

pruefe("Symbole kommen aus Home Assistants eigenem Satz", () => {
  const block = /const SYMBOL = \{([\s\S]*?)\};/.exec(quelle);
  assert.ok(block, "SYMBOL nicht gefunden");
  const symbole = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(symbole.length >= 5, `nur ${symbole.length} Symbole gefunden`);
  for (const s of symbole) assert.match(s, /^mdi:[a-z-]+$/, s);
});

pruefe("Beide Sprachen tragen dieselben Texte", () => {
  const block = /const TEXTE = \{([\s\S]*?)\n\};/.exec(quelle);
  assert.ok(block, "TEXTE nicht gefunden");
  const [de, en] = block[1].split(/\n  en: \{/);
  const schluessel = (s) => [...s.matchAll(/^\s{4,6}([a-zA-Z_]+):/gm)].map((m) => m[1]).sort();
  assert.ok(schluessel(de).length >= 10, "der Ausdruck findet die Schluessel nicht");
  assert.deepStrictEqual(schluessel(de), schluessel(en));
});

// ---- Die Anmeldung --------------------------------------------------------

pruefe("Die Integration meldet die Karte an und wieder ab", () => {
  const init = lies("custom_components/hats/__init__.py");
  const konst = lies("custom_components/hats/const.py");
  const datei = /^CARD_FILE\s*=\s*"([^"]+)"/m.exec(konst);
  assert.ok(datei, "CARD_FILE fehlt in const.py");
  assert.ok(existsSync(path.join(wurzel, "custom_components/hats/www", datei[1])),
    `${datei[1]} liegt nicht in www`);
  assert.ok(/frontend\.add_extra_js_url\(hass, karten_url\)/.test(init), "nicht angemeldet");
  assert.ok(/frontend\.remove_extra_js_url\(hass, karten_url\)/.test(init), "nicht abgemeldet");
  // Die Versionsnummer steht an vier Stellen. Die Adresse der Karte darf
  // keine fuenfte sein.
  assert.ok(!/hats-control-card\.js\?v=\d/.test(konst + init), "eine fuenfte Versionsnummer");
});

pruefe("Die Karte steht in der Einspielliste", () => {
  const liste = lies("werkzeuge/sync-dateien.txt").split("\n");
  assert.ok(liste.includes("www/hats-control-card.js"),
    "fehlt in sync-dateien.txt - werkzeuge/sync-liste-bauen.sh laufen lassen");
});

console.log(`\n${n} Pruefungen`);
if (n < 18) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

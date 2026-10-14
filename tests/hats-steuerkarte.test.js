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
import { BEDIENTEILE, modusLage, modusDetail, pruefeConfig, sprache, badgeKurzform }
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

// Seit dem Zusammenfuegen mit der Menueleiste ist `controls` die KURZFORM:
// Aus ihr werden Knoepfe mit einer Funktion. Was hier steht, haelt fest, dass
// eine Steuerkarte von vorher weiter meint, was sie meinte.
const funktionen = (config) => pruefeConfig(config).knoepfe.map((k) => k.function);

pruefe("Die Vorgabe sind alle Bedienteile, in der Reihenfolge der Liste", () => {
  assert.deepStrictEqual(BEDIENTEILE, ["mode", "fullscreen"]);
  assert.deepStrictEqual(funktionen({}), ["mode", "fullscreen"]);
  assert.deepStrictEqual(funktionen(undefined), ["mode", "fullscreen"]);
  assert.strictEqual(pruefeConfig({}).kiosk_only, false);
  // Die Vorgabe ist eine Kopie - wer sie aendert, aendert nicht die Liste.
  pruefeConfig({}).knoepfe.push("x");
  assert.deepStrictEqual(BEDIENTEILE, ["mode", "fullscreen"]);
  assert.deepStrictEqual(funktionen({}), ["mode", "fullscreen"]);
});

pruefe("Reihenfolge und Auswahl kommen aus der Konfiguration", () => {
  assert.deepStrictEqual(funktionen({ controls: ["fullscreen", "mode"] }), ["fullscreen", "mode"]);
  assert.deepStrictEqual(funktionen({ controls: ["mode"] }), ["mode"]);
  assert.deepStrictEqual(funktionen({ controls: ["mode", "mode"] }), ["mode"]);
  // Eine leere Liste ist erlaubt: Im Editor entsteht sie mitten im Umbauen.
  assert.deepStrictEqual(funktionen({ controls: [] }), []);
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

pruefe("Die Datei steht allein - bis jemand den Regler der Bewegung oeffnet", () => {
  assert.ok(!/^\s*import\s/m.test(quelle), "ein import - die Karte muss allein stehen");
  assert.ok(!/https?:\/\//.test(quelle), "eine fremde Adresse");
  assert.ok(!/@import/.test(quelle), "CSS, das etwas nachlaedt");
  // url() steht genau dort, wo das Einstellungsfenster ein eigenes Bild als
  // Hintergrund zeigt oder schreibt - und nur mit einer Adresse, die vorher
  // gegen BILD_ADRESSE (/local/hats/...) geprueft ist. Sonst nirgends: kein
  // Bild, keine Schrift, nichts, was von woanders kaeme.
  const mitUrl = quelle.split("\n").filter((z) => /url\(/.test(z) && !/^\s*\/\//.test(z));
  assert.strictEqual(mitUrl.length, 2, "url() an unerwarteter Stelle:\n" + mitUrl.join("\n"));
  for (const z of mitUrl) assert.match(z, /url\(\$\{(?:url|b\.url)\}\)/, z);
  // Nachgeladen werden HATS' eigene Module neben der Karte: Die Regler und
  // das Fenster schreiben die Theme mit dem Code des Panels, nicht mit einem
  // zweiten. Nichts von aussen, und nichts ausserhalb von ladeWerkzeug.
  const code = quelle.split("\n").filter((z) => !/^\s*\/\//.test(z)).join("\n");
  const nach = [...code.matchAll(/\bimport\s*\(([^)]*\))/g)].map((m) => m[1]);
  const MODULE = ["theme.js", "hintergrund.js", "baukasten.js", "hintergrund-seite.js"];
  assert.deepStrictEqual(nach, MODULE.map((m) => `new URL("./${m}", import.meta.url)`));
  const lader = /function ladeWerkzeug\(\) \{([\s\S]*?)\n\}/.exec(quelle);
  assert.ok(lader && (lader[1].match(/\bimport\s*\(/g) || []).length === MODULE.length, "ein import ausserhalb von ladeWerkzeug");
  // Und die Dateien gibt es dort wirklich.
  for (const datei of MODULE) {
    assert.ok(existsSync(path.join(wurzel, "custom_components/hats/www", datei)), datei + " fehlt");
  }
});

pruefe("Nur Bauteile, die Home Assistant auf jedem Dashboard anmeldet", () => {
  // Ohne die Kommentarzeilen: Dort steht <home-assistant> als Wort, nicht als
  // Bauteil, das die Karte anlegt.
  const code = quelle.split("\n").filter((z) => !/^\s*\/\//.test(z)).join("\n");
  // Zwei Wege, auf denen ein Bauteil entsteht: im Rahmen als <tag>, und ueber
  // neu("tag") - seit dem Zusammenfuegen entstehen die Knoepfe so.
  const gefunden = [
    ...[...code.matchAll(/<([a-z]+(?:-[a-z]+)+)[\s>]/g)].map((m) => m[1]),
    ...[...code.matchAll(/"((?:ha|hui)-[a-z-]+)"/g)].map((m) => m[1]),
  ];
  const tags = [...new Set(gefunden)].sort();
  // Gegenprobe: Beide Ausdruecke finden ueberhaupt etwas.
  assert.ok(tags.includes("ha-card"), "der Ausdruck findet ha-card nicht - die Pruefung waere leer");
  assert.ok(tags.includes("ha-ripple"), "neu(\"ha-ripple\") wird nicht gefunden");
  // ha-badge war an der Testinstanz auch auf einer Ansicht ohne ein einziges
  // Badge angemeldet. Ob das auf jeder Instanz so ist, ist nicht bewiesen -
  // fehlt es, zeichnet die Reihe sich trotzdem, nur ohne Pille darum.
  const angelegt = ["ha-badge", "ha-card", "ha-icon", "ha-ripple", "ha-state-icon"];
  // Diese beiden legt die Leiste nicht an. Sie SUCHT sie, von sich aus nach
  // oben, um die Kopfzeile im Vollbild wegzunehmen.
  const gesucht = ["ha-top-app-bar-fixed", "hui-root"];
  // Und diese drei sind keine Bauteile, sondern Theme-Felder: Die Regler fuer
  // Transparenz und Schrift lesen und schreiben sie in der Datei.
  const felder = ["ha-card-backdrop-filter", "ha-card-background", "ha-font-size-scale"];
  // ha-form legt nur der Editor an. Ist es nach drei Sekunden nicht
  // angemeldet, gibt getConfigElement nichts zurueck, und HAs eigener
  // Formular-Editor springt ein - gezeichnet wird also immer etwas.
  const imEditor = ["ha-form"];
  assert.deepStrictEqual(tags, [...angelegt, ...gesucht, ...felder, ...imEditor].sort());
});

pruefe("Jede gelesene Variable ist an der Instanz gemessen", () => {
  // Am 13.10.2026 an HA 2026.10.1 mit getComputedStyle(html) abgelesen.
  const belegt = [
    "--ha-space-2", "--ha-border-radius-lg", "--primary-text-color", "--disabled-color",
    "--primary-color", "--ha-color-on-primary-loud", "--disabled-text-color",
    "--secondary-text-color", "--ha-font-size-m",
    // fuer das Badge dazugekommen
    "--ha-space-1", "--ha-border-radius-pill", "--divider-color",
    // mit der Menueleiste dazugekommen
    "--ha-space-3", "--ha-font-size-s", "--ha-font-weight-medium",
    "--white-color", "--black-color", "--state-active-color",
    "--card-background-color", "--ha-card-border-radius", "--ha-card-box-shadow",
    // mit dem Einstellungsfenster dazugekommen, am 14.10.2026 in HAs eigenen
    // Stylesheets gefunden (nicht in der Theme)
    "--ha-space-4", "--ha-font-size-l", "--primary-background-color", "--secondary-background-color",
  ];
  // Theme-Felder, die Home Assistant NICHT selbst setzt - gemessen: Mit
  // glaswerk standen sie inline auf html, in HAs Stylesheets nirgends,
  // --ha-card-border-color nicht einmal in der Theme. ha-card und HAs Dialoge
  // lesen sie mit eigenem Rueckfall, und so liest sie auch das Fenster: die
  // Probe einer Karte und der Schleier, jeder mit Rueckfall.
  const ausDerTheme = ["--ha-card-background", "--ha-card-border-width", "--ha-card-border-color",
    "--ha-card-backdrop-filter", "--mdc-dialog-scrim-color"];
  // Home Assistant liest die Namen (hui-card-features, ha-badge, hui-root),
  // belegt sie aber nicht - oder nur auf Geraeten mit Aussparung.
  const nurGelesen = ["--ha-card-features-border-radius", "--ha-badge-icon-size",
    "--safe-area-inset-top"];
  // Leben nur in der Leiste selbst und kommen in keiner Theme vor. "--state-"
  // ist der Anfang von --state-<domaene>-active-color: Der Name wird zur
  // Laufzeit aus der Entitaet gebaut, so wie Home Assistant ihn selbst baut.
  // --mdc-icon-size ist der Name, aus dem Home Assistants Symbol seine Groesse
  // liest (gemessen: 20 und 18 Pixel folgten ihm). Die Leiste SETZT ihn in
  // ihren Stilblaettern und liest ihn fuer den Kasten des Symbols zurueck.
  // --_fest-links und --_fest-breite setzt die Leiste selbst an ihren Wirt,
  // wenn sie an Stelle der Kopfzeile oben festklebt.
  const eigen = ["--_rund", "--_knopfrund", "--_h", "--_polster", "--state-", "--mdc-icon-size",
    "--_fest-links", "--_fest-breite"];

  const gelesen = [...new Set([...quelle.matchAll(/var\(\s*(--[a-z0-9_-]+)/g)].map((m) => m[1]))];
  assert.ok(gelesen.length >= 8, `nur ${gelesen.length} Variablen gefunden - der Ausdruck greift nicht`);
  const fremd = gelesen.filter((v) => ![...belegt, ...nurGelesen, ...eigen, ...ausDerTheme].includes(v));
  assert.deepStrictEqual(fremd, [], "nicht gemessen: " + fremd.join(", "));
  // Und umgekehrt: Die Liste traegt nichts mit, was die Karte gar nicht liest.
  const tot = [...belegt, ...nurGelesen, ...eigen, ...ausDerTheme].filter((v) => !gelesen.includes(v));
  assert.deepStrictEqual(tot, [], "steht in der Liste, wird aber nicht gelesen: " + tot.join(", "));
});

pruefe("Keine eigene Farbe ausser HAs Weiss auf der Auswahl", () => {
  // Alle drei Blaetter: das gemeinsame, das der Karte, das des Badges.
  const blaetter = [...quelle.matchAll(/const (STIL_\w+) = `([\s\S]*?)`;/g)];
  assert.deepStrictEqual(blaetter.map((b) => b[1]), ["STIL_GEMEINSAM", "STIL_KARTE", "STIL_BADGE"]);
  const stil = [null, blaetter.map((b) => b[2]).join("\n")];
  const farben = stil[1].match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [];
  // #fff steht in ha-control-select fest (.option.selected{color:#fff}); hier
  // sind Weiss und Schwarz nur noch Ausweichwerte HINTER einer Variablen von
  // Home Assistant - nie eine Farbe, die fuer sich steht.
  assert.deepStrictEqual([...new Set(farben)].sort(), ["#000", "#fff"]);
  const nackt = stil[1].match(/(?<!var\(--[a-z-]+, )#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepStrictEqual(nackt, [], "eine Farbe ohne Variable davor: " + nackt.join(", "));
  assert.ok(/var\(--ha-color-on-primary-loud, #fff\)/.test(stil[1]));
});

pruefe("Genau die sieben Ereignisse von Home Assistant, und die richtigen steigen auf", () => {
  // Fuenf gehen ueber _sende, eins haengt an window, und eins schickt der
  // Editor: config-changed, an dem hui-element-editor die neue Konfiguration
  // abholt. hass-toggle-menu hoert home-assistant-main - damit oeffnet HAs
  // eigener Menueknopf die Seitenleiste.
  const ueberSende = [...new Set([...quelle.matchAll(/this\._sende\("([^"]+)"/g)].map((m) => m[1]))].sort();
  assert.deepStrictEqual(ueberSende, ["hass-action", "hass-more-info", "hass-notification", "hass-toggle-menu", "settheme"]);
  const direkt = [...new Set([...quelle.matchAll(/new CustomEvent\("([^"]+)"/g)].map((m) => m[1]))].sort();
  assert.deepStrictEqual(direkt, ["config-changed", "hass-kiosk-mode"]);

  // Home Assistant hoert die fuenf ueber den Elementen der Leiste. Ohne composed
  // bleiben sie im Shadow Root der Leiste stecken - und nichts passiert, ohne
  // Meldung. _sende ist die eine Stelle, an der das stimmen muss.
  const sende = /_sende\(name, detail\) \{([\s\S]*?)\n  \}/.exec(quelle);
  assert.ok(sende, "_sende nicht gefunden");
  assert.ok(/bubbles: true/.test(sende[1]) && /composed: true/.test(sende[1]), "_sende steigt nicht auf");
  assert.ok(/this\.dispatchEvent\(new CustomEvent\(name,/.test(sende[1]));
  // Der Kiosk-Modus haengt an window, nicht an einem Element.
  assert.ok(/window\.dispatchEvent\(new CustomEvent\("hass-kiosk-mode"/.test(quelle));
});

pruefe("Symbole kommen aus Home Assistants eigenem Satz", () => {
  const block = /const SYMBOL = \{([\s\S]*?)\};/.exec(quelle);
  assert.ok(block, "SYMBOL nicht gefunden");
  const symbole = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(symbole.length >= 9, `nur ${symbole.length} Symbole gefunden`);
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

// ---- Karte und Badge ------------------------------------------------------

pruefe("Karte und Badge teilen Verhalten und unterscheiden sich nur im Rahmen", () => {
  const rumpf = (name) => {
    const m = new RegExp(`class ${name} extends Steuerung \\{([\\s\\S]*?)\\n\\}`).exec(quelle);
    assert.ok(m, `${name} erbt nicht von Steuerung`);
    return [...m[1].matchAll(/^  ([a-zA-Z_]+)\(/gm)].map((x) => x[1]).sort();
  };
  // Klicks, Zustand und Konfiguration stehen genau einmal, in Steuerung. Eine
  // Form, die davon etwas ueberschreibt, liefe der anderen davon.
  // _liesConfig ist die eine Stelle, an der sie sich im INHALT unterscheiden:
  // Die Karte nimmt alles, das Badge nur die Kurzform (siehe die Pruefung
  // darunter). Die uebrigen Namen sind Rahmen und Stilblatt.
  assert.deepStrictEqual(rumpf("HatsControlBadge"),
    ["_einklappbar", "_gruppenstrich", "_liesConfig", "_rahmen", "_stil"]);
  assert.deepStrictEqual(rumpf("HatsControlCard"),
    ["_einklappbar", "_gruppenstrich", "_liesConfig", "_rahmen", "_stil", "getCardSize", "getGridOptions"]);
  // Gegenprobe: Die Basis traegt, was die Formen nicht tragen.
  const basis = /class Steuerung extends Basis \{([\s\S]*?)\n\}/.exec(quelle);
  assert.ok(basis, "Steuerung nicht gefunden");
  for (const m of ["setConfig", "_klick", "_stelle", "_baue"]) {
    assert.ok(new RegExp(`^  ${m}\\(`, "m").test(basis[1]), `${m} fehlt in Steuerung`);
  }
});

pruefe("Das Badge bleibt, wie es war: nur die Kurzform, und sein eigenes Formular", () => {
  // Ansage vom 13.10.2026: "die badgets bleiben wie sie sind." Ziele, Schalter
  // und Wetter sind eine Erweiterung der KARTE.
  const klasse = (name) => {
    const m = new RegExp(`class ${name} extends Steuerung \\{([\\s\\S]*?)\\n\\}`).exec(quelle);
    assert.ok(m, `${name} nicht gefunden`);
    return m[1];
  };
  const badge = klasse("HatsControlBadge");
  const karte = klasse("HatsControlCard");

  // Das Badge liest ueber badgeKurzform, die Karte reicht alles durch.
  assert.ok(/_liesConfig\(config\) \{ return pruefeConfig\(badgeKurzform\(config\)\); \}/.test(badge));
  assert.ok(/_liesConfig\(config\) \{ return pruefeConfig\(config\); \}/.test(karte));

  // Nur controls und kiosk_only kommen an - die Einstellungen der Leiste nicht.
  assert.deepStrictEqual(badgeKurzform({ controls: ["mode"], kiosk_only: true, collapse: "always", menu_size: "large" }),
    { controls: ["mode"], kiosk_only: true });
  assert.deepStrictEqual(badgeKurzform({}), { controls: undefined, kiosk_only: undefined });
  // Ziele, Schalter und die uebrigen Funktionen sind im Badge ein Fehler,
  // kein Feld, das still verschwindet.
  for (const fremd of [[{ link: "/x" }], [{ entity: "light.x" }], [{ function: "weather" }], [{ function: "motion" }],
                       [{ function: "mode", name: "Modus" }], "nope"]) {
    assert.throws(() => badgeKurzform({ buttons: fremd }), /controls/, JSON.stringify(fremd));
  }

  // Jede Form hat IHR Formular: das Badge die Auswahl der Bedienteile, die
  // Karte die Liste der Knoepfe. Und der Waehler legt an, was dazu passt.
  assert.ok(/\{ name: "controls", required: true,/.test(badge) && !/name: "buttons"/.test(badge));
  // Das Formular der Karte steht seit dem Editor mit beschrifteten Zeilen in
  // kartenFormular - die Klasse reicht nur durch.
  const formular = /export function kartenFormular\(t, mitAnzeige\) \{([\s\S]*?)\n\}\n/.exec(quelle);
  assert.ok(formular, "kartenFormular nicht gefunden");
  assert.ok(/\{ name: "buttons",/.test(formular[1]) && !/name: "controls"/.test(formular[1]));
  assert.ok(/return kartenFormular\(TEXTE\[sprache\(\)\], false\);/.test(karte));
  assert.ok(/return \{ controls: \[\.\.\.BEDIENTEILE\] \};/.test(badge));
  assert.ok(/return \{ buttons: BEDIENTEILE\.map\(/.test(karte));
});

pruefe("Ein Badge aus der Stunde, in der der Waehler buttons anlegte, laeuft weiter", () => {
  // Woertlich vom Server der Testmaschine, Ansicht "eigene", am 14.10.2026.
  // Nach "die badgets bleiben wie sie sind" wies das Badge diese Form ab, und
  // beim Maintainer stand eine Fehlermeldung, wo sein Badge gewesen war.
  const vomServer = { type: "custom:hats-control-badge", buttons: [{ function: "mode" }, { function: "fullscreen" }] };
  assert.deepStrictEqual(pruefeConfig(badgeKurzform(vomServer)).knoepfe.map((k) => k.function), ["mode", "fullscreen"]);
  // Reihenfolge und Auswahl gelten auch in dieser Form.
  assert.deepStrictEqual(badgeKurzform({ buttons: [{ function: "fullscreen" }] }).controls, ["fullscreen"]);
  // Und sie ergibt dasselbe wie die Kurzform, nicht etwas Aehnliches.
  assert.deepStrictEqual(pruefeConfig(badgeKurzform(vomServer)), pruefeConfig({ controls: ["mode", "fullscreen"] }));
});

pruefe("Das Badge steht in Home Assistants Badge-Liste, die Karte in der Kartenliste", () => {
  assert.ok(/window\.customBadges\.push\(\{\s*type: BADGE,/.test(quelle), "nicht in customBadges");
  assert.ok(/window\.customCards\.push\(\{\s*type: KARTE,/.test(quelle), "nicht in customCards");
  assert.ok(/const BADGE = "hats-control-badge";/.test(quelle));
  assert.ok(/const KARTE = "hats-control-card";/.test(quelle));
});

pruefe("Das Badge sitzt im Steckplatz icon eines ha-badge mit icon-only", () => {
  // An ha-badge gemessen: Mit icon-only zeichnet es NUR diesen Steckplatz,
  // und das Attribut heisst mit Bindestrich.
  assert.ok(/<ha-badge icon-only><div class="leiste" slot="icon">/.test(quelle));
  assert.ok(!/<ha-badge icononly/.test(quelle));
});

// ---- Die Anmeldung --------------------------------------------------------

pruefe("Die Datei der Karte gibt es, und ihre Adresse traegt keine eigene Version", () => {
  // WIE sie angemeldet wird, prueft tests/hats-kartenanmeldung.test.js.
  const init = lies("custom_components/hats/__init__.py");
  const konst = lies("custom_components/hats/const.py");
  const datei = /^CARD_FILE\s*=\s*"([^"]+)"/m.exec(konst);
  assert.ok(datei, "CARD_FILE fehlt in const.py");
  assert.ok(existsSync(path.join(wurzel, "custom_components/hats/www", datei[1])),
    `${datei[1]} liegt nicht in www`);
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
if (n < 24) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

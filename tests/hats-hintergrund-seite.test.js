// Die Seite "Hintergrund" im Baukasten, und die Hintergruende selbst.
//
// Ausfuehren: node tests/hats-hintergrund-seite.test.js
//
// Geprueft wird ohne Browser: was aus dem Modell gelesen wird, was eine
// Aenderung hineinschreibt, und was die Seite daraus zeichnet. Das Verdrahten
// selbst laeuft gegen ein nachgebautes Element - es hat keine eigenen Regeln,
// nur Weiterreichen.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { leeresModell, setze, schreibeTheme, leseTheme, vorlageAn } from "../custom_components/hats/www/theme.js";
import {
  HINTERGRUENDE, ohneFest, stelleFest, bewegung, himmel, leseBewegung, leseHimmel,
  istPunkteBild, PUNKTE_VORGABE, punkteDauer,
  BEWEGUNG_ID, HIMMEL_ID, HIMMEL_VORGABE,
} from "../custom_components/hats/www/hintergrund.js";
import {
  hintergrundStand, hintergrundAendern, hintergrundSeiteHtml, bindeHintergrundSeite,
  hintergrundGewaehlt, wetterEntitaeten, anzeige, AUSSCHLAEGE,
} from "../custom_components/hats/www/hintergrund-seite.js";
import { BAUKASTEN, HINTERGRUENDE as AUS_BAUKASTEN, teilAnwenden, erkenneTeil } from "../custom_components/hats/www/baukasten.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Home Assistants eigene Regel, woertlich aus dem Buendel von 2026.10.1.
const haIstFest = (e) => "string" == typeof e ? e.split(" ").includes("fixed") : "object" == typeof e && "fixed" === e.attachment;

const FELD = "lovelace-background";
// Der Baukasten schreibt ueber schreibe(name, wert, ebene), das Panel entfernt
// bei leerem Wert - hier genauso nachgestellt wie in bindeBaukasten().
function wende(m, sorte, teil) {
  teilAnwenden(sorte, teil, (name, wert, ebene) => {
    const k = name.replace(/^--/, "");
    if (wert === "" || wert === null || wert === undefined) { delete m.flach[k]; delete m.light[k]; delete m.dark[k]; }
    else setze(m, k, wert, ebene);
  });
  return m;
}
const leser = (m) => (name, ebene) => { const k = name.replace(/^--/, ""); return ebene === "beide" ? m.flach[k] : m[ebene]?.[k]; };
const teil = (id) => HINTERGRUENDE.find((h) => h.id === id);
// Angewendet und wieder geloest. Jeder Teil steht von sich aus fest; wer den
// Schalter pruefen will, braucht einen Anfang, an dem er noch nicht umgelegt ist.
function wendeLose(m, h) {
  wende(m, "hintergrund", h);
  for (const e of ["light", "dark"]) m[e][FELD] = stelleFest(m[e][FELD], false);
  return m;
}

// ---------------------------------------------------------------------------
// Die Hintergruende

pruefe("Der Baukasten fuehrt genau die Hintergruende aus hintergrund.js", () => {
  assert.strictEqual(AUS_BAUKASTEN, HINTERGRUENDE, "baukasten.js haelt eine eigene Liste");
  assert.strictEqual(BAUKASTEN.hintergrund.teile, HINTERGRUENDE);
  // Vorn "keiner", dann die Farbverlaeufe - seit dem 14.10.2026 elf statt
  // zehn (macOS ist dazugekommen) -, danach die beiden, die keine Punkte
  // tragen: der ruhige Verlauf und "Glaswerk", das diagonale Raster.
  assert.strictEqual(HINTERGRUENDE.length, 14);
  assert.deepStrictEqual([HINTERGRUENDE[0].id, HINTERGRUENDE[1].id, HINTERGRUENDE.at(-1).id], ["keiner", "inseln", "glaswerk"]);
  assert.strictEqual(new Set(HINTERGRUENDE.map((h) => h.id)).size, 14, "eine Kennung ist doppelt");
  for (const h of HINTERGRUENDE) {
    for (const modus of ["light", "dark"]) assert.deepStrictEqual(Object.keys(h[modus]), ["--" + FELD], `${h.id}/${modus}`);
    for (const k of ["de", "en", "zweckDe", "zweckEn"]) assert.ok(h[k], `${h.id} ohne ${k}`);
  }
});

pruefe("Jeder Hintergrund steht fest, und zwar so, dass Home Assistant es erkennt", () => {
  for (const modus of ["light", "dark"]) {
    const w = teil("inseln")[modus]["--" + FELD];
    assert.strictEqual(haIstFest(w), true, `${modus}: nicht fest`);
    assert.strictEqual((w.match(/radial-gradient\(/g) || []).length, 4, "es sind nicht mehr vier Inseln");
    // Auch der ruhige Verlauf: Mitlaufend beginnt die Flaeche erst rechts von
    // der Seitenleiste, und eine durchscheinende Leiste steht dann vor Home
    // Assistants flachem Grund - gemeldet am 13.10.2026 als Kante.
    for (const h of HINTERGRUENDE.filter((x) => x.id !== "keiner"))
      assert.strictEqual(haIstFest(h[modus]["--" + FELD]), true, `${h.id}/${modus} laeuft mit`);
    // Gegenprobe: Das Orakel sagt nicht zu allem ja.
    assert.strictEqual(haIstFest(ohneFest(teil("verlauf")[modus]["--" + FELD])), false);
    assert.strictEqual(teil("keiner")[modus]["--" + FELD], "");
  }
  // Hell und dunkel sind verschiedene Farben an denselben Stellen.
  const stellen = (w) => [...w.matchAll(/(left|right) -?\d+px (top|bottom) -?\d+px/g)].map((t) => t[0]);
  assert.strictEqual(stellen(teil("inseln").light["--" + FELD]).length, 4);
  assert.deepStrictEqual(stellen(teil("inseln").light["--" + FELD]), stellen(teil("inseln").dark["--" + FELD]));
  assert.notStrictEqual(teil("inseln").light["--" + FELD], teil("inseln").dark["--" + FELD]);
});

pruefe("Ein Hintergrund wird wiedererkannt, ob fest oder nicht", () => {
  for (const h of HINTERGRUENDE) {
    const m = wende(leeresModell("t"), "hintergrund", h);
    assert.strictEqual(erkenneTeil("hintergrund", leser(m)), h.id, `${h.id} frisch angewendet`);
    if (h.id === "keiner") continue;
    // Eine Theme von gestern traegt die Inseln ohne "fixed" - liquid_glass etwa.
    for (const fest of [true, false]) {
      m.light[FELD] = stelleFest(m.light[FELD], fest);
      m.dark[FELD] = stelleFest(m.dark[FELD], fest);
      assert.strictEqual(erkenneTeil("hintergrund", leser(m)), h.id, `${h.id}, fest=${fest}`);
    }
  }
  // Gegenprobe: Ein anderer Verlauf ist kein Treffer, nur weil "fixed" egal ist.
  const fremd = leeresModell("t");
  fremd.light[FELD] = "linear-gradient(#111, #222) fixed";
  fremd.dark[FELD] = "linear-gradient(#111, #222) fixed";
  assert.strictEqual(erkenneTeil("hintergrund", leser(fremd)), null);
  // Und die anderen Sorten vergleichen weiter woertlich.
  assert.strictEqual(BAUKASTEN.karten.gleich, undefined);
  assert.strictEqual(ohneFest("#101010 fixed"), "#101010");
});

// ---------------------------------------------------------------------------
// Lesen und Schreiben

pruefe("Fest: der Schalter aendert den Wert dort, wo er steht, in beiden Modi", () => {
  const m = wendeLose(leeresModell("t"), teil("verlauf"));
  assert.strictEqual(hintergrundStand(m).fest, false);
  assert.deepStrictEqual(hintergrundAendern(m, "fest", true), { felder: [FELD], abgelehnt: null });
  assert.ok(haIstFest(m.light[FELD]) && haIstFest(m.dark[FELD]));
  // Die Falle: setze() haette den Wert in eine andere Ebene geraeumt.
  assert.notStrictEqual(m.light[FELD], m.dark[FELD], "aus zwei Modi wurde einer");
  assert.ok(!(FELD in m.flach), "der Wert ist auf die flache Ebene gewandert");
  assert.strictEqual(hintergrundStand(m).fest, true);
  // Zweimal dasselbe meldet keine Aenderung.
  assert.deepStrictEqual(hintergrundAendern(m, "fest", true).felder, []);
  hintergrundAendern(m, "fest", false);
  assert.strictEqual(m.light[FELD], ohneFest(teil("verlauf").light["--" + FELD]), "der Weg zurueck aendert den Wert");
});

pruefe("Fest: ein flacher Wert bleibt flach, und ohne Hintergrund geschieht nichts", () => {
  const m = leeresModell("t");
  setze(m, FELD, "url(/local/hats/bild.jpg) center / cover no-repeat", "beide");
  hintergrundAendern(m, "fest", true);
  assert.ok(haIstFest(m.flach[FELD]));
  assert.ok(!(FELD in m.light) && !(FELD in m.dark));
  const leer = leeresModell("t");
  assert.strictEqual(hintergrundStand(leer).hatHintergrund, false);
  assert.deepStrictEqual(hintergrundAendern(leer, "fest", true).felder, []);
  assert.ok(!(FELD in leer.flach), "aus nichts wurde ein Feld");
});

pruefe("Stand: halb fest und unerkannt fest werden gemeldet", () => {
  const m = wendeLose(leeresModell("t"), teil("verlauf"));
  m.light[FELD] = stelleFest(m.light[FELD], true);
  const s = hintergrundStand(m);
  assert.strictEqual(s.fest, false);
  assert.strictEqual(s.teilsFest, true);
  m.dark[FELD] = "url(/a.jpg) fixed, " + m.dark[FELD];
  assert.strictEqual(hintergrundStand(m).unerkannt, true);
  // Gegenprobe: ein sauberer Stand meldet beides nicht.
  const gut = hintergrundStand(wende(leeresModell("t"), "hintergrund", teil("inseln")));
  assert.deepStrictEqual([gut.fest, gut.teilsFest, gut.unerkannt], [true, false, false]);
});

pruefe("Bewegung: jeder Regler aendert nur seine Groesse, null und null schaltet ab", () => {
  const m = leeresModell("t");
  assert.strictEqual(hintergrundStand(m).bewegung, null);
  assert.deepStrictEqual(hintergrundAendern(m, "drift", 4).felder, ["uix-root"]);
  assert.deepStrictEqual(hintergrundStand(m).bewegung, { drift: 4, punkte: 0, farbe: 0, weite: 40 });
  hintergrundAendern(m, "farbe", 3);
  hintergrundAendern(m, "weite", 90);
  assert.deepStrictEqual(hintergrundStand(m).bewegung, { drift: 4, punkte: 0, farbe: 3, weite: 90 });
  hintergrundAendern(m, "drift", 0);
  assert.deepStrictEqual(hintergrundStand(m).bewegung, { drift: 0, punkte: 0, farbe: 3, weite: 90 });
  // Derselbe Wert noch einmal: keine Aenderung gemeldet, das Feld waechst nicht.
  const davor = m.flach["uix-root"];
  assert.deepStrictEqual(hintergrundAendern(m, "farbe", 3).felder, []);
  assert.strictEqual(m.flach["uix-root"], davor);
  hintergrundAendern(m, "farbe", 0);
  assert.strictEqual(hintergrundStand(m).bewegung, null);
  assert.ok(!("uix-root" in m.flach), "das leere Stilziel blieb stehen");
});

pruefe("Himmel: an, umstellen, aus - und fremdes CSS im Stilziel bleibt stehen", () => {
  const m = leeresModell("t");
  const kopf = "/* HATS:glas-kopfleiste:START */\n.header { color: red; }\n/* HATS:glas-kopfleiste:ENDE */";
  setze(m, "uix-root", kopf, "beide");
  assert.deepStrictEqual(hintergrundAendern(m, "wetter", "weather.forecast_home"), { felder: ["uix-root"], abgelehnt: null });
  assert.deepStrictEqual(hintergrundStand(m).himmel, { wetter: "weather.forecast_home", staerke: HIMMEL_VORGABE.staerke });
  hintergrundAendern(m, "staerke", 9);
  hintergrundAendern(m, "drift", 5);
  assert.deepStrictEqual(hintergrundStand(m).himmel, { wetter: "weather.forecast_home", staerke: 9 });
  assert.deepStrictEqual(hintergrundStand(m).bewegung, { drift: 5, punkte: 0, farbe: 0, weite: 40 });
  assert.ok(m.flach["uix-root"].startsWith(kopf), "die Kopfleiste wurde angefasst");
  hintergrundAendern(m, "wetter", "");
  hintergrundAendern(m, "drift", 0);
  assert.strictEqual(m.flach["uix-root"], kopf, "nach dem Abschalten steht nicht mehr, was vorher stand");
});

pruefe("Himmel: wird abgelehnt, wenn das Stilziel eine Vorlage nicht vertraegt", () => {
  const m = leeresModell("t");
  // Gueltiges CSS, das Jinja als Kommentaranfang liest.
  const css = "@media (max-width: 870px) {#view { padding: 0; }}";
  setze(m, "uix-root", css, "beide");
  assert.strictEqual(hintergrundStand(m).stoerungen.length, 1);
  assert.deepStrictEqual(hintergrundAendern(m, "wetter", "weather.forecast_home"), { felder: [], abgelehnt: "stoerung" });
  assert.strictEqual(m.flach["uix-root"], css, "trotz Ablehnung geschrieben");
  // Gegenprobe: Die Bewegung ist keine Vorlage fuer Jinja und geht trotzdem.
  assert.deepStrictEqual(hintergrundAendern(m, "drift", 3).felder, ["uix-root"]);
  // Und Ausschalten geht immer, auch wenn die Stoerung erst spaeter dazukam.
  const n2 = leeresModell("t");
  hintergrundAendern(n2, "wetter", "weather.forecast_home");
  n2.flach["uix-root"] += "\n" + css;
  assert.strictEqual(hintergrundAendern(n2, "staerke", 3).abgelehnt, "stoerung");
  assert.deepStrictEqual(hintergrundAendern(n2, "wetter", "").felder, ["uix-root"]);
  assert.strictEqual(hintergrundStand(n2).himmel, null);
});

pruefe("Himmel: eine erfundene Entitaet kommt nicht in die Theme", () => {
  const m = leeresModell("t");
  for (const boese of ["sun.sun", "weather.x') }}{{ states('a.b", "Wetter"]) {
    assert.deepStrictEqual(hintergrundAendern(m, "wetter", boese), { felder: [], abgelehnt: "entitaet" });
  }
  assert.ok(!("uix-root" in m.flach));
  assert.deepStrictEqual(hintergrundAendern(m, "gibtesnicht", 1), { felder: [], abgelehnt: null });
});

pruefe("Was die Seite schreibt, uebersteht die Theme-Datei", () => {
  const m = wende(leeresModell("hg_seite"), "hintergrund", teil("inseln"));
  hintergrundAendern(m, "drift", 6);
  hintergrundAendern(m, "farbe", 2);
  hintergrundAendern(m, "weite", 180);
  hintergrundAendern(m, "wetter", "weather.demo_weather_north");
  hintergrundAendern(m, "staerke", 4);
  const datei = schreibeTheme(m);
  const zurueck = leseTheme(datei);
  const s = hintergrundStand(zurueck);
  assert.deepStrictEqual(s.bewegung, { drift: 6, punkte: 0, farbe: 2, weite: 180 });
  assert.deepStrictEqual(s.himmel, { wetter: "weather.demo_weather_north", staerke: 4 });
  assert.strictEqual(s.fest, true);
  assert.deepStrictEqual(s.stoerungen, []);
  assert.strictEqual(erkenneTeil("hintergrund", leser(zurueck)), "inseln");
  assert.strictEqual(schreibeTheme(zurueck), datei, "der zweite Durchlauf aendert die Datei");
});

// ---------------------------------------------------------------------------
// Zeichnen

const WETTER = [{ id: "weather.forecast_home", name: "Forecast Home" }, { id: "weather.demo_weather_north", name: "Demo North" }];

pruefe("Die Seite zeigt den Stand des Modells", () => {
  const m = wende(leeresModell("t"), "hintergrund", teil("inseln"));
  hintergrundAendern(m, "drift", 4);
  hintergrundAendern(m, "wetter", "weather.demo_weather_north");
  const html = hintergrundSeiteHtml({ modell: m, spr: "de", wetter: WETTER });
  assert.match(html, /data-hg="fest" checked/);
  assert.match(html, /data-hg="drift" min="0" max="10" step="1" value="4"/);
  assert.match(html, /data-hg-wert="drift">15 s</);
  assert.match(html, /data-hg="farbe" min="0" max="10" step="1" value="0"/);
  assert.match(html, /data-hg-wert="farbe">aus</);
  assert.match(html, /<option value="weather.demo_weather_north" selected>Demo North</);
  assert.ok(!/<option value="weather.forecast_home" selected/.test(html));
  assert.match(html, new RegExp(`data-hg="staerke" min="1" max="10" step="1" value="${HIMMEL_VORGABE.staerke}"`));
  // Der Ausschlag ist ohne Farbwechsel gesperrt, die Staerke ohne Wetter nicht.
  assert.match(html, /data-hg="weite"[^>]*disabled/);
  assert.ok(!/data-hg="staerke"[^>]*disabled/.test(html));
});

pruefe("Die Seite sperrt, was nichts tun wuerde, und sagt, was stoert", () => {
  const leer = hintergrundSeiteHtml({ modell: leeresModell("t"), spr: "de", wetter: WETTER });
  assert.match(leer, /data-hg="fest"[^>]*disabled/, "fest ist ohne Hintergrund schaltbar");
  assert.match(leer, /Erst einen Hintergrund waehlen/);
  assert.match(leer, /data-hg="staerke"[^>]*disabled/);
  // Ohne offene Theme ist alles gesperrt, nicht versteckt.
  const ohne = hintergrundSeiteHtml({ modell: null, spr: "de", wetter: WETTER });
  assert.strictEqual((ohne.match(/data-hg="/g) || []).length, 7);
  assert.strictEqual((ohne.match(/data-hg="[a-z]+"[^>]*disabled/g) || []).length, 7);
  // Die Stoerung steht mit Zeile und Text da.
  const m = leeresModell("t");
  setze(m, "uix-root", ".a { color: red; }\n@media (max-width: 870px) {#view { padding: 0; }}", "beide");
  const gestoert = hintergrundSeiteHtml({ modell: m, spr: "de", wetter: WETTER });
  assert.match(gestoert, /Zeile 2: @media \(max-width: 870px\) \{#view/);
  // Gegenprobe: ohne Stoerung kein Hinweis.
  assert.ok(!/hg-stoerung"/.test(hintergrundSeiteHtml({ modell: leeresModell("t"), spr: "de", wetter: WETTER })));
});

pruefe("Die Seite zeigt eine Entitaet aus der Theme, die es hier nicht gibt", () => {
  const m = leeresModell("t");
  vorlageAn(m, himmel({ wetter: "weather.anderswo" }));
  const html = hintergrundSeiteHtml({ modell: m, spr: "de", wetter: WETTER });
  assert.match(html, /<option value="weather.anderswo" selected>weather.anderswo \(nicht auf dieser Instanz\)</);
  // Gegenprobe: sonst steht sie nicht in der Liste.
  assert.ok(!hintergrundSeiteHtml({ modell: leeresModell("t"), spr: "de", wetter: WETTER }).includes("weather.anderswo"));
  // Und ganz ohne Wetter sagt die Seite das, statt eine leere Auswahl zu zeigen.
  assert.match(hintergrundSeiteHtml({ modell: leeresModell("t"), spr: "de", wetter: [] }), /keine Wetter-Entitaet/);
});

pruefe("Ein Name aus der Instanz kommt nicht als HTML auf die Seite", () => {
  const html = hintergrundSeiteHtml({ modell: leeresModell("t"), spr: "de",
    wetter: [{ id: "weather.x", name: '<img src=x onerror="alert(1)">' }] });
  assert.ok(!html.includes("<img"), "der Name steht ungeschuetzt da");
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
});

pruefe("Beide Sprachen sind vollstaendig, und die englische Seite ist englisch", () => {
  const m = wende(leeresModell("t"), "hintergrund", teil("inseln"));
  const de = hintergrundSeiteHtml({ modell: m, spr: "de", wetter: WETTER });
  const en = hintergrundSeiteHtml({ modell: m, spr: "en", wetter: WETTER });
  assert.match(de, /Fest am Fenster/);
  assert.match(en, /Fixed to the window/);
  assert.ok(!/Fest am Fenster|Staerke|Ausschlag|Treiben/.test(en), "deutscher Text auf der englischen Seite");
  assert.ok(!/undefined/.test(de + en), "ein Text fehlt");
  assert.strictEqual(anzeige("drift", 0, "en"), "off");
  assert.strictEqual(anzeige("weite", AUSSCHLAEGE.indexOf(360), "de"), "Kreis");
  assert.strictEqual(anzeige("weite", AUSSCHLAEGE.indexOf(40), "de"), "40°");
  assert.strictEqual(anzeige("farbe", 3, "de"), "100 s");
});

pruefe("wetterEntitaeten: nur Wetter, sortiert, mit Namen", () => {
  const hass = { states: {
    "weather.zuhause": { attributes: { friendly_name: "Zuhause" } },
    "sun.sun": { attributes: {} },
    "weather.anfang": { attributes: {} },
    "sensor.weather_station": { attributes: {} },
  } };
  assert.deepStrictEqual(wetterEntitaeten(hass), [{ id: "weather.anfang", name: "weather.anfang" }, { id: "weather.zuhause", name: "Zuhause" }]);
  assert.deepStrictEqual(wetterEntitaeten(null), []);
});

// ---------------------------------------------------------------------------
// Verdrahten - gegen nachgebaute Elemente

function element(typ, was, wert) {
  const hoerer = {};
  return { type: typ, dataset: { hg: was }, value: String(wert), checked: wert === true,
    addEventListener: (name, fn) => { hoerer[name] = fn; }, loese: (name) => hoerer[name] && hoerer[name]() };
}

pruefe("Ein Regler schreibt erst beim Loslassen, beim Ziehen aendert sich nur die Zahl", () => {
  const m = leeresModell("t");
  const regler = element("range", "drift", 0);
  const zahl = { textContent: "" };
  const gemeldet = []; let gezeichnet = 0;
  bindeHintergrundSeite({ querySelectorAll: () => [regler], querySelector: () => zahl },
    { modell: () => m, spr: "de", gemeldet: (f) => gemeldet.push(...f), zeichne: () => gezeichnet++ });
  regler.value = "6";
  regler.loese("input");
  assert.strictEqual(zahl.textContent, "10 s");
  assert.ok(!("uix-root" in m.flach), "schon beim Ziehen geschrieben");
  assert.deepStrictEqual([gemeldet.length, gezeichnet], [0, 0]);
  regler.loese("change");
  assert.strictEqual(leseBewegung(m.flach["uix-root"]).drift, 6);
  assert.deepStrictEqual(gemeldet, ["uix-root"]);
  assert.strictEqual(gezeichnet, 1);
});

pruefe("Schalter, Auswahl und Ausschlag reichen den richtigen Wert weiter", () => {
  const m = wendeLose(leeresModell("t"), teil("verlauf"));
  const fest = element("checkbox", "fest", true);
  const wahl = element("select-one", "wetter", "weather.forecast_home");
  const farbe = element("range", "farbe", 2);
  const weite = element("range", "weite", AUSSCHLAEGE.indexOf(180));
  const gemeldet = [];
  bindeHintergrundSeite({ querySelectorAll: () => [fest, wahl, farbe, weite], querySelector: () => null },
    { modell: () => m, gemeldet: (f) => gemeldet.push(...f), zeichne: () => {} });
  for (const el of [fest, wahl, farbe, weite]) el.loese("change");
  assert.ok(haIstFest(m.light[FELD]));
  assert.strictEqual(leseHimmel(m.flach["uix-root"]).wetter, "weather.forecast_home");
  // Der Regler steht auf der STELLE im Raster, geschrieben wird der Winkel.
  assert.deepStrictEqual(leseBewegung(m.flach["uix-root"]), { drift: 0, punkte: 0, farbe: 2, weite: 180 });
  assert.deepStrictEqual(gemeldet, [FELD, "uix-root", "uix-root", "uix-root"]);
  // Ohne offene Theme geschieht nichts, auch kein Fehler.
  const ohne = element("range", "drift", 5);
  bindeHintergrundSeite({ querySelectorAll: () => [ohne], querySelector: () => null }, { modell: () => null, gemeldet: () => { throw new Error("gemeldet ohne Modell"); }, zeichne: () => {} });
  ohne.loese("change");
});

// ---------------------------------------------------------------------------
// Im Panel

pruefe("Das Panel zeichnet und verdrahtet die Seite, und nur beim Hintergrund", () => {
  const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");
  assert.match(panel, /import \{[^}]*hintergrundSeiteHtml[^}]*\} from "\.\/hintergrund-seite\.js";/);
  const seite = panel.slice(panel.indexOf("bkSeiteHtml(schluessel, T) {"), panel.indexOf("bindeBkSeite(wurzel) {"));
  assert.ok(seite.length > 400, "bkSeiteHtml nicht gefunden");
  assert.match(seite, /schluessel === "hintergrund" \? hintergrundSeiteHtml\(/, "die Seite wird nicht oder bei jeder Sorte gezeichnet");
  const binde = panel.slice(panel.indexOf("bindeBkSeite(wurzel) {"), panel.indexOf("bindeBaukasten(wurzel) {"));
  assert.match(binde, /this\._bkSeite === "hintergrund"\) bindeHintergrundSeite\(/, "die Seite wird nicht verdrahtet");
  assert.match(binde, /ZUSTAND\.geaendert\.add\(/, "die Aenderungen kommen nicht in die Buchfuehrung");
  // Gegenprobe: die Suche findet nicht einfach alles.
  assert.doesNotMatch(seite, /schluessel === "karten" \? hintergrundSeiteHtml/);
});

pruefe("Die Seite steht in der Einspielliste", () => {
  // Fehlt eine Datei dort, kommt sie nie auf der Instanz an - und der Fehler
  // sieht aus wie einer im Panel: Es laedt gar nicht.
  const liste = readFileSync(path.join(hier, "../werkzeuge/sync-dateien.txt"), "utf8").split("\n");
  for (const f of ["www/hintergrund.js", "www/hintergrund-seite.js"]) assert.ok(liste.includes(f), `${f} fehlt in sync-dateien.txt`);
  assert.ok(!liste.includes("www/gibt-es-nicht.js"));
});

// --------------------------------------------------------------------------
// Die Farbpunkte - Regler, Sperre und was beim Wechsel des Bildes geschieht

const PUNKTEBILD = HINTERGRUENDE.find((h) => h.id === "inseln");
const FOTO = "url(/local/hats/wand.jpg) center / cover no-repeat fixed";

pruefe("Der Punkte-Regler steht da und ist nur auf einem Punktebild zu ziehen", () => {
  const m = leeresModell("t");
  wende(m, "hintergrund", PUNKTEBILD);
  const auf = hintergrundSeiteHtml({ modell: m, spr: "de", wetter: [] });
  assert.match(auf, /data-hg="punkte" min="0" max="10"/);
  assert.ok(!/data-hg="punkte"[^>]*disabled/.test(auf), "auf einem Punktebild gesperrt");

  // Gegenprobe: auf einem Foto gesperrt, mit Begruendung statt stumm.
  const f = leeresModell("t");
  setze(f, FELD, FOTO, "beide");
  const zu = hintergrundSeiteHtml({ modell: f, spr: "de", wetter: [] });
  assert.match(zu, /data-hg="punkte"[^>]*disabled/);
  assert.match(zu, /nur auf einem Hintergrund aus Farbpunkten/);
  // Und ohne jeden Hintergrund steht die Begruendung NICHT da - gesperrt ist
  // dann ohnehin alles, und zwei Hinweise uebereinander liest niemand.
  assert.ok(!/nur auf einem Hintergrund aus Farbpunkten/.test(
    hintergrundSeiteHtml({ modell: leeresModell("t"), spr: "de", wetter: [] })));
});

pruefe("Der Punkte-Regler schreibt seine Stufe, und die Anzeige nennt die Dauer", () => {
  const m = leeresModell("t");
  wende(m, "hintergrund", PUNKTEBILD);
  hintergrundAendern(m, "punkte", 5);
  assert.strictEqual(leseBewegung(m.flach["uix-root"]).punkte, 5);
  assert.strictEqual(anzeige("punkte", 5, "de"), punkteDauer(5) + " s");
  assert.strictEqual(anzeige("punkte", 0, "de"), "aus");
  // Auf 0 zurueck, und ohne andere Bewegung ist der Block weg.
  hintergrundAendern(m, "punkte", 0);
  assert.strictEqual(leseBewegung(m.flach["uix-root"]), null);
});

pruefe("Eine andere Groesse nimmt die Punkte nicht mit, wenn das Bild sie nicht traegt", () => {
  // Das ist die Falle: leseBewegung() reicht die Punkte durch, und ohne die
  // Angabe schriebe ein Zug am Treiben sie auf einem Foto wieder hinein.
  const m = leeresModell("t");
  wende(m, "hintergrund", PUNKTEBILD);
  hintergrundAendern(m, "punkte", 4);
  assert.strictEqual(leseBewegung(m.flach["uix-root"]).punkte, 4);
  // Jetzt ein Foto - der Block bleibt zunaechst stehen, wie er ist.
  for (const e of ["flach", "light", "dark"]) delete m[e][FELD];
  setze(m, FELD, FOTO, "beide");
  hintergrundAendern(m, "drift", 3);
  const b = leseBewegung(m.flach["uix-root"]);
  assert.strictEqual(b.drift, 3);
  assert.strictEqual(b.punkte, 0, "die Punkte sind auf dem Foto mitgewandert");
  // Gegenprobe: auf dem Punktebild ueberlebt die Stufe denselben Zug.
  const g = leeresModell("t");
  wende(g, "hintergrund", PUNKTEBILD);
  hintergrundAendern(g, "punkte", 4);
  hintergrundAendern(g, "drift", 3);
  assert.strictEqual(leseBewegung(g.flach["uix-root"]).punkte, 4);
});

// Der Rueckweg muss stimmen, sonst beweist die Pruefung oben nur sich selbst.
const ok_rueckweg = (m) => {
  const b = leseBewegung(m.flach["uix-root"]);
  assert.ok(b && b.punkte >= 1 && b.punkte <= 10, "die Stufe ist nicht zurueckzulesen");
};

pruefe("Nach der Wahl eines Hintergrunds passt die Bewegung zum Bild", () => {
  // 1. Noch keine Bewegung, und das neue Bild traegt Punkte -> Vorgabe an.
  const m = leeresModell("t");
  wende(m, "hintergrund", PUNKTEBILD);
  assert.strictEqual(leseBewegung(m.flach["uix-root"]), null);
  const r1 = hintergrundGewaehlt(m);
  assert.deepStrictEqual(r1.felder, ["uix-root"]);
  assert.strictEqual(leseBewegung(m.flach["uix-root"]).punkte, PUNKTE_VORGABE.punkte);

  // 2. Zweiter Aufruf aendert nichts mehr - sonst waere jedes Zeichnen eine
  //    Aenderung, und der Zaehler im Kopf liefe immer weiter.
  assert.deepStrictEqual(hintergrundGewaehlt(m).felder, []);

  // 3. Wechsel auf ein Foto -> die Punkte fallen weg, der Rest bleibt.
  hintergrundAendern(m, "drift", 2);
  for (const e of ["flach", "light", "dark"]) delete m[e][FELD];
  setze(m, FELD, FOTO, "beide");
  assert.deepStrictEqual(hintergrundGewaehlt(m).felder, ["uix-root"]);
  const b = leseBewegung(m.flach["uix-root"]);
  assert.strictEqual(b.punkte, 0);
  assert.strictEqual(b.drift, 2, "das Treiben ist mit weggefallen");

  // 4. Gegenprobe: wer schon eine Bewegung hat, bekommt die Vorgabe NICHT.
  const g = leeresModell("t");
  wende(g, "hintergrund", PUNKTEBILD);
  hintergrundAendern(g, "drift", 7);
  hintergrundGewaehlt(g);
  const gb = leseBewegung(g.flach["uix-root"]);
  assert.strictEqual(gb.drift, 7);
  assert.strictEqual(gb.punkte, 0, "die Vorgabe hat eine Einstellung ueberschrieben");

  // 5. Der Fall, den die Hintergrund-Abteilung am 13.10. nachgereicht hat:
  //    Nordlicht, dann der ruhige Verlauf, dann Sand. Bei Sand lag vom vorigen
  //    Mal noch der Farbwechsel im Block - mit der alten Regel ("nur wenn
  //    ueberhaupt keine Bewegung da ist") standen die Punkte dann auf 0.
  const w = leeresModell("t");
  wende(w, "hintergrund", HINTERGRUENDE.find((h) => h.id === "nordlicht"));
  hintergrundGewaehlt(w);
  assert.strictEqual(leseBewegung(w.flach["uix-root"]).punkte, PUNKTE_VORGABE.punkte);
  for (const e of ["flach", "light", "dark"]) delete w[e][FELD];
  wende(w, "hintergrund", HINTERGRUENDE.find((h) => h.id === "verlauf"));
  hintergrundGewaehlt(w);
  assert.strictEqual(leseBewegung(w.flach["uix-root"]).punkte, 0, "auf dem Verlauf duerfen keine Punkte laufen");
  assert.strictEqual(leseBewegung(w.flach["uix-root"]).farbe, PUNKTE_VORGABE.farbe, "der Farbwechsel ist mit weggefallen");
  for (const e of ["flach", "light", "dark"]) delete w[e][FELD];
  wende(w, "hintergrund", HINTERGRUENDE.find((h) => h.id === "sand"));
  hintergrundGewaehlt(w);
  assert.strictEqual(leseBewegung(w.flach["uix-root"]).punkte, PUNKTE_VORGABE.punkte,
    "bei der zweiten Wahl eines Punktebildes stehen die Punkte still");
  ok_rueckweg(w);

  // 6. Gegenprobe: "Keiner" setzt kein Feld - dann auch keine Bewegung.
  const k = leeresModell("t");
  wende(k, "hintergrund", HINTERGRUENDE.find((h) => h.id === "keiner"));
  assert.deepStrictEqual(hintergrundGewaehlt(k).felder, []);
  assert.strictEqual(leseBewegung(k.flach["uix-root"] || ""), null);
});

pruefe("Das Panel zieht die Bewegung nach und zeigt die Farben auf der Kachel", () => {
  const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");
  const klick = panel.slice(panel.indexOf('wurzel.querySelectorAll("[data-bk-teil]")'),
                            panel.indexOf("oeffneUix() {"));
  assert.ok(klick.length > 400, "der Klick auf ein Teil nicht gefunden");
  assert.match(klick, /sorte === "hintergrund"[\s\S]{0,200}hintergrundGewaehlt\(ZUSTAND\.modell\)/,
    "nach teilAnwenden wird die Bewegung nicht nachgezogen");
  assert.match(klick, /ZUSTAND\.geaendert\.add\(f\)/, "die Felder kommen nicht in die Buchfuehrung");
  // Gegenprobe: nicht fuer jede Sorte.
  assert.doesNotMatch(klick, /sorte === "karten"[\s\S]{0,120}hintergrundGewaehlt/);
  // Der Streifen: die Verlaeufe tragen eine Vorschau, und das Panel malt sie.
  assert.match(panel, /class="bk-streifen"/);
  assert.match(panel, /teil\.vorschau && teil\.vorschau\[dunkel \? "dark" : "light"\]/);
  const mitVorschau = HINTERGRUENDE.filter((h) => h.vorschau && h.vorschau.light && h.vorschau.dark);
  assert.strictEqual(mitVorschau.length, 12, "nicht zwoelf Teile mit Vorschau");
  // Wer KEINE hat, hat auch keine Farben zu zeigen - oder es fehlt wirklich.
  // "verlauf" steht hier als Schuld: zwei Toene haette er, der Streifen fehlt
  // trotzdem. Gemeldet am 14.10.2026 an die Sitzung, der die Datei gehoert.
  assert.deepStrictEqual(HINTERGRUENDE.filter((h) => !h.vorschau).map((h) => h.id),
    ["keiner", "verlauf"], "ein Teil ohne Streifen, der keiner sein sollte");
  for (const h of mitVorschau) assert.match(h.vorschau.dark, /^linear-gradient\(90deg,/);
  // Gegenprobe: "Keiner" und der ruhige Verlauf haben keine - sie sind keine
  // Farbpunkte, und ein Streifen aus vier Farben waere dort gelogen.
  assert.ok(!HINTERGRUENDE.find((h) => h.id === "keiner").vorschau);
});

console.log(`\n${n} Pruefungen bestanden`);

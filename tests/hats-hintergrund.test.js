// Der Hintergrund: fest oder mitlaufend, bewegt, im Farbwechsel, nach dem Himmel.
//
// Ausfuehren: node tests/hats-hintergrund.test.js
//
// Was hier NICHT geprueft werden kann: ob Home Assistant die Jinja-Vorlage des
// Himmels wirklich so ausrechnet. Das macht werkzeuge/test/hintergrund-messen.mjs
// an der Testmaschine, mit der echten Maschine dahinter. Hier steht, was ohne
// Instanz geht - und jede Pruefung traegt ihre Gegenprobe.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  leeresModell, setze, schreibeTheme, leseTheme,
  vorlageAn, vorlageAus, vorlageIstAn,
} from "../custom_components/hats/www/theme.js";
import {
  istFest, festUnerkannt, stelleFest,
  bewegung, leseBewegung, driftDauer, farbDauer, BEWEGUNG_ID, BEWEGUNG_STUFEN,
  himmel, leseHimmel, himmelLage, himmelLageVorlage, istWetterEntitaet,
  HIMMEL_ID, HIMMEL_LAGEN, HIMMEL_STUFEN, HIMMEL_VORGABE, himmelLagen, vertraegtVorlage, HINTERGRUND_ZIEL,
} from "../custom_components/hats/www/hintergrund.js";
import { UIX_ZIELE } from "../custom_components/hats/www/uix.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Home Assistants eigene Regel, woertlich aus dem Buendel von 2026.10.1
// (frontend_latest/90012.*.js, hui-view-background). Das ist das Orakel -
// geschrieben von jemand anderem als der Code, den es prueft.
const haIstFest = (e) => "string" == typeof e ? e.split(" ").includes("fixed") : "object" == typeof e && "fixed" === e.attachment;

const VERLAUF = "linear-gradient(155deg, #0e1220 0%, #151225 55%, #0c1d1f 100%)";
const INSELN = "radial-gradient(900px 620px at 8% 4%, #1f4d9e 0%, rgba(31,77,158,0) 55%), linear-gradient(155deg, #0b1020 0%, #140d26 50%, #07201f 100%)";

// ---------------------------------------------------------------------------
// Fest oder mitlaufend

pruefe("istFest sagt dasselbe wie Home Assistant, auch in den Faellen, die ueberraschen", () => {
  const faelle = [
    VERLAUF, VERLAUF + " fixed", "fixed " + VERLAUF, INSELN, INSELN + " fixed",
    "url(/local/hats/bild.jpg) center / cover no-repeat fixed",
    // Die Fallen: Komma direkt dahinter, Umbruch statt Leerzeichen, Grossschreibung
    "url(/local/hats/bild.jpg) fixed, " + VERLAUF,
    VERLAUF + "\nfixed",
    VERLAUF + " FIXED",
    "", " ", "fixed", "#101010 fixed", "befixed", "fixedx",
  ];
  let wahr = 0, falsch = 0;
  for (const f of faelle) {
    assert.strictEqual(istFest(f), haIstFest(f), `weicht ab bei: ${JSON.stringify(f)}`);
    haIstFest(f) ? wahr++ : falsch++;
  }
  // Gegenprobe: Eine Liste, in der alles gleich ausgeht, haette nichts geprueft.
  assert.ok(wahr >= 4 && falsch >= 6, `einseitige Liste: ${wahr} fest, ${falsch} nicht`);
  // Und die eine Stelle, an der eine "kluegere" Regel falsch laege:
  assert.strictEqual(haIstFest("url(x) fixed, " + VERLAUF), false);
  assert.strictEqual(/\bfixed\b/.test("url(x) fixed, " + VERLAUF), true);
});

pruefe("stelleFest setzt das Wort so, dass Home Assistant es erkennt, und nimmt es wieder", () => {
  for (const w of [VERLAUF, INSELN, "#101010", "url(/local/hats/bild.jpg) center / cover no-repeat"]) {
    assert.strictEqual(haIstFest(w), false, "Ausgangswert ist schon fest");
    const fest = stelleFest(w, true);
    assert.strictEqual(haIstFest(fest), true, `nicht erkannt: ${fest}`);
    assert.strictEqual(stelleFest(fest, false), w, "der Weg zurueck aendert den Wert");
  }
});

pruefe("stelleFest: zweimal dasselbe aendert nichts, ein leerer Wert bleibt leer", () => {
  const einmal = stelleFest(VERLAUF, true);
  assert.strictEqual(stelleFest(einmal, true), einmal);
  assert.strictEqual((einmal.match(/fixed/g) || []).length, 1, "das Wort steht doppelt");
  assert.strictEqual(stelleFest(stelleFest(VERLAUF, false), false), VERLAUF);
  // "Keiner" im Baukasten ist der leere Wert. Daraus darf kein " fixed" werden -
  // das waere ein Hintergrund aus einem einzelnen Schluesselwort.
  assert.strictEqual(stelleFest("", true), "");
  assert.strictEqual(stelleFest("   ", true), "");
});

pruefe("stelleFest laesst eine Adresse mit 'fixed' im Namen ganz", () => {
  const w = 'url("/local/hats/mein fixed bild.jpg") center / cover no-repeat';
  assert.strictEqual(stelleFest(w, false), w, "der Dateiname wurde gekuerzt");
  assert.ok(stelleFest(w, true).startsWith(w), "der Dateiname wurde veraendert");
  // Gegenprobe: Ausserhalb einer Adresse wird das Wort sehr wohl genommen.
  assert.strictEqual(stelleFest("url(/a.jpg) fixed center", false), "url(/a.jpg) center");
});

pruefe("festUnerkannt meldet 'fixed', das Home Assistant uebersieht", () => {
  assert.strictEqual(festUnerkannt("url(/a.jpg) fixed, " + VERLAUF), true);
  assert.strictEqual(festUnerkannt(VERLAUF + "\nfixed"), true);
  // Gegenproben: erkannt ist nicht unerkannt, und ein Name ist kein Schluesselwort.
  assert.strictEqual(festUnerkannt(VERLAUF + " fixed"), false);
  assert.strictEqual(festUnerkannt(VERLAUF), false);
  assert.strictEqual(festUnerkannt('url("/local/hats/fixed.jpg") center'), false);
});

// ---------------------------------------------------------------------------
// Bewegung und Farbwechsel

pruefe("Das Stilziel der Hintergrund-Vorlagen gibt es bei UIX", () => {
  // Ein Typname, den UIX nicht kennt, ergibt ein Feld, das nie gelesen wird.
  assert.ok(UIX_ZIELE.some((z) => z.id === HINTERGRUND_ZIEL), `kein Stilziel ${HINTERGRUND_ZIEL}`);
  assert.ok(!UIX_ZIELE.some((z) => z.id === "gibt-es-nicht"));
});

pruefe("Bewegung: ohne Bewegung und ohne Farbwechsel gibt es keine Vorlage", () => {
  assert.strictEqual(bewegung({ drift: 0, farbe: 0 }), null);
  assert.ok(bewegung({ drift: 1, farbe: 0 }));
  assert.ok(bewegung({ drift: 0, farbe: 1 }));
});

pruefe("Bewegung: nur transform und filter, nichts, was neu gemalt werden muss", () => {
  const css = bewegung({ drift: 5, farbe: 5 }).css;
  assert.ok(!/background-(position|size|color|image)\s*:/.test(css), "die Vorlage fasst das Bild an");
  const eigenschaften = [...css.matchAll(/@keyframes[^{]+\{([\s\S]*?)\n\}/g)]
    .flatMap((t) => [...t[1].matchAll(/\{\s*([a-z-]+)\s*:/g)].map((u) => u[1]));
  assert.ok(eigenschaften.length >= 6, `zu wenige Wegpunkte gelesen: ${eigenschaften.length}`);
  assert.deepStrictEqual([...new Set(eigenschaften)].sort(), ["filter", "transform"]);
});

pruefe("Bewegung: genau EIN animation auf dem Bauteil, sonst ueberschreibt eins das andere", () => {
  const css = bewegung({ drift: 5, farbe: 5 }).css;
  const laeufe = css.match(/\banimation:[^;]+;/g) || [];
  // Zwei Treffer: der eigentliche und "none" fuer reduzierte Bewegung.
  assert.strictEqual(laeufe.length, 2, laeufe.join(" | "));
  assert.ok(laeufe[0].includes("hats-hintergrund-drift") && laeufe[0].includes("hats-hintergrund-farbe"),
    "Bewegung und Farbwechsel stehen nicht in derselben Angabe");
  assert.match(laeufe[1], /animation:\s*none\s*!important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

pruefe("Bewegung: die Flaeche wird nur fuer die Bewegung fest und groesser", () => {
  const nurFarbe = bewegung({ drift: 0, farbe: 4 }).css;
  assert.ok(!/position:\s*fixed/.test(nurFarbe) && !/inset:/.test(nurFarbe), "Farbwechsel allein verschiebt die Flaeche");
  assert.ok(!/hats-hintergrund-drift/.test(nurFarbe));
  const mitDrift = bewegung({ drift: 4, farbe: 0 }).css;
  assert.match(mitDrift, /position:\s*fixed !important/);
  assert.match(mitDrift, /max-width:\s*none !important/);
  assert.ok(!/hue-rotate/.test(mitDrift), "ohne Farbwechsel steht trotzdem ein Filter da");
});

pruefe("Bewegung: jede Stufe kommt aus dem Theme so zurueck, wie sie hineinging", () => {
  let geprueft = 0;
  for (let d = 0; d <= BEWEGUNG_STUFEN; d++) {
    for (let f = 0; f <= BEWEGUNG_STUFEN; f++) {
      const v = bewegung({ drift: d, farbe: f, weite: 60 });
      if (!v) continue;
      const m = leeresModell("t");
      vorlageAn(m, v);
      const zurueck = leseBewegung(m.flach["uix-root"]);
      assert.strictEqual(zurueck.drift, d, `Bewegung ${d} kam als ${zurueck.drift} zurueck`);
      assert.strictEqual(zurueck.farbe, f, `Farbwechsel ${f} kam als ${zurueck.farbe} zurueck`);
      if (f) assert.strictEqual(zurueck.weite, 60);
      geprueft++;
    }
  }
  assert.strictEqual(geprueft, 11 * 11 - 1);
  // Stufe 1 ist die langsamste, 10 die schnellste.
  assert.ok(driftDauer(1) > driftDauer(10) && farbDauer(1) > farbDauer(10));
  assert.ok(farbDauer(5) > driftDauer(5), "der Farbwechsel soll langsamer sein als die Bewegung");
});

pruefe("Bewegung: der Ausschlag kommt zurueck, auch der volle Kreis", () => {
  for (const weite of [5, 20, 45, 90, 180, 360]) {
    const m = leeresModell("t");
    vorlageAn(m, bewegung({ drift: 0, farbe: 3, weite }));
    assert.strictEqual(leseBewegung(m.flach["uix-root"]).weite, weite);
  }
  // Der volle Kreis laeuft durch, statt umzukehren - sonst spraenge nichts,
  // aber er waere nur ein halber.
  assert.match(bewegung({ drift: 0, farbe: 3, weite: 360 }).css, /linear infinite;/);
  assert.match(bewegung({ drift: 0, farbe: 3, weite: 40 }).css, /infinite alternate;/);
  // Unsinn wird gedeckelt, nicht uebernommen.
  assert.strictEqual(bewegung({ farbe: 3, weite: 9999 }).einstellung.weite, 360);
  assert.strictEqual(bewegung({ farbe: 3, weite: -4 }).einstellung.weite, 5);
  assert.strictEqual(bewegung({ drift: 99 }).einstellung.drift, BEWEGUNG_STUFEN);
});

pruefe("Bewegung: umstellen ersetzt den Block, fremdes CSS und die Kopfleiste bleiben", () => {
  const m = leeresModell("t");
  const kopf = "/* HATS:glas-kopfleiste:START */\n.header { color: red; }\n/* HATS:glas-kopfleiste:ENDE */";
  setze(m, "uix-root", kopf, "beide");
  vorlageAn(m, bewegung({ drift: 2 }));
  const einmal = m.flach["uix-root"];
  vorlageAn(m, bewegung({ drift: 2 }));
  assert.strictEqual(m.flach["uix-root"], einmal, "zweimal einschalten laesst das Feld wachsen");
  vorlageAn(m, bewegung({ drift: 9, farbe: 2 }));
  assert.strictEqual((m.flach["uix-root"].match(/HATS:hintergrund-bewegung:START/g) || []).length, 1);
  assert.strictEqual(leseBewegung(m.flach["uix-root"]).drift, 9);
  assert.ok(m.flach["uix-root"].includes(".header { color: red; }"));
  vorlageAus(m, { id: BEWEGUNG_ID, ziel: HINTERGRUND_ZIEL });
  assert.strictEqual(m.flach["uix-root"], kopf, "Abschalten hat mehr mitgenommen als den eigenen Block");
  assert.strictEqual(leseBewegung(m.flach["uix-root"]), null);
});

pruefe("Bewegung: eine Kopie unter fremder Vorsilbe wird gelesen", () => {
  const v = bewegung({ drift: 6 });
  const fremd = `/* HORIZON:${BEWEGUNG_ID}:START */\n${v.css}\n/* HORIZON:${BEWEGUNG_ID}:ENDE */`;
  assert.strictEqual(leseBewegung(fremd).drift, 6);
  // Gegenprobe: dasselbe CSS ohne Marker ist nicht unsere Vorlage.
  assert.strictEqual(leseBewegung(v.css), null);
});

// ---------------------------------------------------------------------------
// Der Himmel

pruefe("Himmel: nur eine echte Wetter-Entitaet kommt in die Vorlage", () => {
  assert.ok(himmel({ wetter: "weather.forecast_home" }));
  for (const boese of [undefined, "", "sun.sun", "weather.", "weather.Zuhause", "weather.x') }}{{ states('sensor.y",
    "weather.x' ~ ''", "weather.a b", "weather.a\nb"]) {
    assert.strictEqual(istWetterEntitaet(boese), false, `durchgelassen: ${JSON.stringify(boese)}`);
    assert.strictEqual(himmel({ wetter: boese }), null);
  }
});

pruefe("Himmel: die Entitaet kommt aus dem Theme zurueck", () => {
  const m = leeresModell("t");
  vorlageAn(m, himmel({ wetter: "weather.demo_weather_north" }));
  assert.deepStrictEqual(leseHimmel(m.flach["uix-root"]), { wetter: "weather.demo_weather_north", staerke: HIMMEL_VORGABE.staerke });
  vorlageAn(m, himmel({ wetter: "weather.forecast_home", staerke: 9 }));
  assert.deepStrictEqual(leseHimmel(m.flach["uix-root"]), { wetter: "weather.forecast_home", staerke: 9 });
  assert.strictEqual((m.flach["uix-root"].match(/HATS:hintergrund-himmel:START/g) || []).length, 1);
  vorlageAus(m, { id: HIMMEL_ID, ziel: HINTERGRUND_ZIEL });
  assert.ok(!("uix-root" in m.flach), "das leere Feld blieb stehen");
  assert.strictEqual(leseHimmel(""), null);
});

pruefe("Himmel: die Klammern der Vorlage gehen auf, und es steht kein Jinja-Kommentar darin", () => {
  const css = himmel({ wetter: "weather.forecast_home" }).css;
  const zahl = (s) => css.split(s).length - 1;
  assert.ok(zahl("{%") >= 8, "die Vorlage enthaelt keine Anweisungen");
  assert.strictEqual(zahl("{%"), zahl("%}"));
  assert.ok(zahl("{{") === 2, `erwartet zwei Ausdruecke, gefunden ${zahl("{{")}`);
  assert.strictEqual(zahl("{{"), zahl("}}"));
  assert.strictEqual(zahl("{#"), 0, "ein {# beginnt einen Jinja-Kommentar und leert das Feld");
  assert.strictEqual((css.match(/\{%-?\s*if\b/g) || []).length, (css.match(/\{%-?\s*endif\b/g) || []).length);
  // Nichts, was bei einer fehlenden Entitaet einen Fehler wirft.
  const aufrufe = [...css.matchAll(/\b([a-z_]+)\(/g)].map((t) => t[1]);
  const jinja = aufrufe.filter((a) => !["var", "mix", "gradient", "background"].includes(a) && !/^(color|linear)$/.test(a));
  assert.deepStrictEqual([...new Set(jinja)].sort(), ["is_state", "states"]);
  assert.ok(!/\|\s*[a-z_]+/.test(css.replace(/\/\*[\s\S]*?\*\//g, "")), "ein Filter in der Vorlage - der kann fehlen");
});

pruefe("Himmel: die Farben kommen aus der Theme, und es entsteht kein eigenes Feld", () => {
  const css = himmel({ wetter: "weather.forecast_home" }).css;
  for (const feld of ["--info-color", "--warning-color", "--secondary-text-color"]) {
    assert.ok(css.includes(`var(${feld}`), `${feld} wird nicht gelesen`);
  }
  // Eine eigene Variable waere ein Hilfsfeld: Sie wirkt, und niemand bekommt
  // sie wieder heraus.
  assert.ok(!/--hats-/.test(css) && !/^\s*--[a-z-]+\s*:/m.test(css), "die Vorlage setzt eine eigene Variable");
  assert.ok(!/--hats-/.test(bewegung({ drift: 3, farbe: 3 }).css));
  // Jede Schicht laesst Klicks durch, und die Farbe blendet ueber.
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /transition:\s*background-color/);
  // Jede Lage hat oben und unten eine Farbe; "ohne" ist durchsichtig.
  assert.deepStrictEqual([...HIMMEL_LAGEN].sort(), ["bewoelkt", "klar", "nacht", "nass", "ohne", "sonnig"]);
  const lagen = himmelLagen();
  for (const [lage, farben] of Object.entries(lagen)) {
    assert.strictEqual(farben.length, 2, lage);
    assert.ok(css.includes(`'${lage}': '${farben[0]}'`) && css.includes(`'${lage}': '${farben[1]}'`), `${lage} fehlt in der Vorlage`);
  }
  assert.deepStrictEqual(lagen.ohne, ["transparent", "transparent"]);
});

pruefe("Himmel: jedes Wetter landet in der Lage, die die Wetterkachel dafuer hat", () => {
  // Die Zuordnung aus ha-karten/docs/himmel-verlauf.md, hier ausgeschrieben
  // und nicht aus den Listen im Code gebaut - sonst pruefte der Code sich selbst.
  const erwartet = {
    "sunny": ["sonnig", "klar"],
    "clear-night": ["klar", "klar"],
    "cloudy": ["bewoelkt", "nacht"], "partlycloudy": ["bewoelkt", "nacht"], "fog": ["bewoelkt", "nacht"],
    "windy": ["bewoelkt", "nacht"], "windy-variant": ["bewoelkt", "nacht"], "exceptional": ["bewoelkt", "nacht"],
    "rainy": ["nass", "nass"], "pouring": ["nass", "nass"], "lightning": ["nass", "nass"],
    "lightning-rainy": ["nass", "nass"], "hail": ["nass", "nass"],
    "snowy": ["nass", "nass"], "snowy-rainy": ["nass", "nass"],
    // Kein Wetter, kein Schleier - nicht "sonnig" geraten.
    "unknown": ["ohne", "ohne"], "unavailable": ["ohne", "ohne"],
  };
  // Home Assistant kennt 15 Wetterzustaende; fehlt hier einer, fehlt er auch der Pruefung.
  assert.strictEqual(Object.keys(erwartet).length, 15 + 2);
  for (const [wetter, [tag, nacht]] of Object.entries(erwartet)) {
    assert.strictEqual(himmelLage(wetter, false), tag, `${wetter} am Tag`);
    assert.strictEqual(himmelLage(wetter, true), nacht, `${wetter} bei Nacht`);
    assert.ok(HIMMEL_LAGEN.includes(tag) && HIMMEL_LAGEN.includes(nacht));
  }
  // Die Vorlage nennt jeden Zustand, der nicht "sonnig" oder "klar" ergibt.
  const vorlage = himmelLageVorlage("weather.x");
  for (const [wetter, [tag]] of Object.entries(erwartet)) {
    if (tag === "sonnig" || wetter === "clear-night") continue;
    assert.ok(vorlage.includes(`'${wetter}'`), `${wetter} steht nicht in der Vorlage`);
  }
});

pruefe("Himmel: jede Staerke kommt zurueck, und staerker heisst wirklich mehr Farbe", () => {
  let davor = 0;
  for (let s = 1; s <= HIMMEL_STUFEN; s++) {
    const m = leeresModell("t");
    vorlageAn(m, himmel({ wetter: "weather.x", staerke: s }));
    assert.strictEqual(leseHimmel(m.flach["uix-root"]).staerke, s, `Staerke ${s}`);
    const anteil = Number(/ (\d+)%, transparent\)$/.exec(himmelLagen(s).sonnig[0])[1]);
    assert.ok(anteil > davor, `Staerke ${s} ist nicht kraeftiger als ${s - 1}: ${anteil} gegen ${davor}`);
    davor = anteil;
  }
  // Volle Staerke sind die Anteile der Wetterkachel, ausgeschrieben statt abgeleitet.
  assert.match(himmelLagen(10).sonnig[0], / 55%, transparent\)$/);
  assert.match(himmelLagen(10).klar[0], / 72%, transparent\)$/);
  assert.match(himmelLagen(10).nass[1], / 30%, transparent\)$/);
  // Unsinn wird gedeckelt.
  assert.strictEqual(himmel({ wetter: "weather.x", staerke: 99 }).einstellung.staerke, HIMMEL_STUFEN);
  assert.strictEqual(himmel({ wetter: "weather.x", staerke: 0 }).einstellung.staerke, 1);
});

pruefe("Himmel: keine feste Farbe ausser als Ausweichwert hinter einem Theme-Feld", () => {
  // Ein uix-Feld gilt fuer hell und dunkel zugleich. Eine feste dunkle Farbe
  // laege im Hellmodus unter hellem Glas mit dunkler Schrift. Die Masken
  // zaehlen nicht - dort ist #000 Deckkraft, keine Farbe.
  const css = himmel({ wetter: "weather.x", staerke: 10 }).css.split("\n").filter((z) => !z.includes("mask-image")).join("\n");
  const fest = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)];
  assert.ok(fest.length >= 6, `zu wenige Farben gefunden, die Pruefung liefe leer: ${fest.length}`);
  for (const t of fest) {
    const davor = css.slice(Math.max(0, t.index - 2), t.index), danach = css[t.index + t[0].length];
    assert.ok(davor === ", " && danach === ")", `${t[0]} steht nicht als Ausweichwert: ...${css.slice(t.index - 30, t.index + 12)}`);
  }
  // Das Nachtblau zieht in den Grundton der Theme, und der ist je Modus ein anderer.
  assert.ok(himmelLagen().klar[0].includes("var(--primary-background-color"));
  assert.ok(himmelLagen().nacht[0].includes("var(--primary-background-color"));
});

// ---------------------------------------------------------------------------
// Vertraegt das Feld eine Vorlage?

pruefe("vertraegtVorlage findet, was Jinja im uebrigen Feld anders liest als CSS", () => {
  const sauber = "/* HATS:glas-kopfleiste:START */\n.header {\n  color: red;\n}\n/* HATS:glas-kopfleiste:ENDE */";
  assert.deepStrictEqual(vertraegtVorlage(sauber), []);
  assert.deepStrictEqual(vertraegtVorlage(""), []);
  // Gueltiges CSS, das Jinja als Kommentaranfang liest - an der Testmaschine
  // gemessen: Mit einer Vorlage im selben Feld kam davon nichts mehr an.
  const falle = sauber + "\n@media (max-width: 870px) {#view { padding: 0; }}";
  const funde = vertraegtVorlage(falle);
  assert.strictEqual(funde.length, 1);
  assert.strictEqual(funde[0].zeichen, "{#");
  assert.strictEqual(funde[0].zeile, 6);
  assert.strictEqual(vertraegtVorlage(".a { --x: {{ 1 }}; }")[0].zeichen, "{{");
  assert.strictEqual(vertraegtVorlage("{% if x %}.a{}{% endif %}")[0].zeichen, "{%");
});

pruefe("vertraegtVorlage nimmt den eigenen Block aus, und nur den", () => {
  const m = leeresModell("t");
  setze(m, "uix-root", ".header { color: red; }", "beide");
  vorlageAn(m, himmel({ wetter: "weather.forecast_home" }));
  vorlageAn(m, bewegung({ drift: 3, farbe: 2 }));
  assert.deepStrictEqual(vertraegtVorlage(m.flach["uix-root"]), [], "der eigene Block wird als Stoerung gemeldet");
  // Gegenprobe: Ohne die Ausnahme schluege die Pruefung auf den eigenen Block an.
  assert.ok(m.flach["uix-root"].includes("{%") && m.flach["uix-root"].includes("{{"));
  // Unter fremder Vorsilbe ist es derselbe Block.
  assert.deepStrictEqual(vertraegtVorlage(m.flach["uix-root"].replaceAll("HATS:hintergrund-himmel", "HORIZON:hintergrund-himmel")), []);
});

// ---------------------------------------------------------------------------
// Die Theme-Datei

pruefe("Beide Vorlagen ueberstehen Schreiben und Lesen, und der zweite Durchlauf aendert nichts", () => {
  const m = leeresModell("hintergrund_probe");
  setze(m, "lovelace-background", stelleFest(VERLAUF, true), "beide");
  vorlageAn(m, bewegung({ drift: 4, farbe: 2, weite: 40 }));
  vorlageAn(m, himmel({ wetter: "weather.forecast_home" }));
  const eins = schreibeTheme(m);
  const gelesen = leseTheme(eins);
  assert.ok(!gelesen.fehler, gelesen.fehler);
  assert.strictEqual(gelesen.flach["uix-root"], m.flach["uix-root"], "das Stilziel kam veraendert zurueck");
  assert.strictEqual(schreibeTheme(gelesen), eins, "der zweite Durchlauf aendert die Datei");
  assert.strictEqual(vorlageIstAn(gelesen, { id: BEWEGUNG_ID, ziel: HINTERGRUND_ZIEL }), true);
  assert.deepStrictEqual(leseBewegung(gelesen.flach["uix-root"]), { drift: 4, farbe: 2, weite: 40 });
  assert.deepStrictEqual(leseHimmel(gelesen.flach["uix-root"]), { wetter: "weather.forecast_home", staerke: HIMMEL_VORGABE.staerke });
  assert.strictEqual(haIstFest(gelesen.flach["lovelace-background"]), true);
  // Ohne den Schalter kaeme keine der beiden Vorlagen an.
  assert.match(eins, /uix-theme: "?hintergrund_probe"?/);
});

pruefe("PyYAML liest die Vorlagen so, wie sie geschrieben wurden", () => {
  // Die Zeilen der Jinja-Vorlage beginnen mit einer geschweiften Klammer und
  // enthalten beide Sorten Anfuehrungszeichen. Kommt davon etwas veraendert
  // an, ist die Vorlage kaputt - und eine kaputte Vorlage leert das Stilziel.
  const m = leeresModell("hintergrund_probe");
  vorlageAn(m, bewegung({ drift: 4, farbe: 2 }));
  vorlageAn(m, himmel({ wetter: "weather.forecast_home" }));
  const ordner = mkdtempSync(path.join(tmpdir(), "hats-hg-"));
  const datei = path.join(ordner, "probe.yaml");
  writeFileSync(datei, schreibeTheme(m));
  const py = "import json, sys, yaml\nprint(json.dumps(yaml.safe_load(open(sys.argv[1]))))";
  const d = JSON.parse(execFileSync("python3", ["-c", py, datei], { encoding: "utf8" }));
  assert.strictEqual(d.hintergrund_probe["uix-root"], m.flach["uix-root"]);
  assert.strictEqual(d.hintergrund_probe["uix-theme"], "hintergrund_probe");
});

console.log(`\n${n} Pruefungen bestanden`);

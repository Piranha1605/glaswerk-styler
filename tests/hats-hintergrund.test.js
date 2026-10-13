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
  bewegung, leseBewegung, driftDauer, farbDauer, punkteDauer, BEWEGUNG_ID, BEWEGUNG_STUFEN,
  FARBVERLAEUFE, HINTERGRUENDE, PUNKTE, PUNKTE_VORGABE, punkteBild, istPunkteBild, bewegungNachBild, bewegungNachWahl,
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
// Die Farbpunkte und die zehn Farbverlaeufe

const feld = "--lovelace-background";
// Unabhaengig vom Code gelesen: wo jede Ebene im WERT steht.
const lagenIm = (wert) => [...wert.matchAll(/\) (left|right) (-?\d+)px (top|bottom) (-?\d+)px \/ (\d+)px (\d+)px no-repeat/g)]
  .map((t) => ({ x: t[1], dx: Number(t[2]), y: t[3], dy: Number(t[4]), b: Number(t[5]), h: Number(t[6]) }));
const helligkeit = (hex) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const z = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * f(z[0]) + 0.7152 * f(z[1]) + 0.0722 * f(z[2]);
};
const farbenIm = (wert) => (wert.match(/#[0-9a-f]{6}/gi) || []);

pruefe("Zehn Farbverlaeufe, jeder mit eigenem Namen und eigenen Farben", () => {
  assert.strictEqual(FARBVERLAEUFE.length, 10);
  for (const k of ["id", "de", "en"]) assert.strictEqual(new Set(FARBVERLAEUFE.map((f) => f[k])).size, 10, `${k} doppelt`);
  const werte = FARBVERLAEUFE.flatMap((f) => [f.light[feld], f.dark[feld]]);
  assert.strictEqual(new Set(werte).size, 20, "zwei Verlaeufe sind gleich, oder hell gleich dunkel");
  for (const f of FARBVERLAEUFE) {
    assert.ok(f.zweckDe && f.zweckEn, `${f.id} ohne Zweck`);
    for (const modus of ["light", "dark"]) {
      const w = f[modus][feld];
      assert.deepStrictEqual(Object.keys(f[modus]), [feld]);
      assert.strictEqual(haIstFest(w), true, `${f.id}/${modus} steht nicht fest`);
      assert.strictEqual(istPunkteBild(w), true, `${f.id}/${modus} ist kein Punktebild`);
      // Vier Punkte und drei Toene im Grund, jede Farbe als Hex.
      assert.strictEqual(farbenIm(w).length, 7, `${f.id}/${modus}`);
      assert.strictEqual(new Set(farbenIm(w).slice(0, 4)).size, 4, `${f.id}/${modus}: zwei Punkte haben dieselbe Farbe`);
      assert.match(f.vorschau[modus], /^linear-gradient\(90deg, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/);
      assert.deepStrictEqual(farbenIm(f.vorschau[modus]), farbenIm(w).slice(0, 4), "die Vorschau zeigt andere Farben als das Bild");
    }
  }
  // Im Baukasten stehen sie zwischen "keiner" und dem ruhigen Verlauf.
  assert.deepStrictEqual(HINTERGRUENDE.map((h) => h.id),
    ["keiner", "inseln", "nordlicht", "abendrot", "ozean", "wald", "lavendel", "glut", "pastell", "sand", "graphit", "verlauf"]);
  // Der erste traegt weiter die Farben der Werkbank, woertlich.
  assert.deepStrictEqual(farbenIm(FARBVERLAEUFE[0].light[feld]).slice(0, 4), ["#7db5ff", "#ff9ec7", "#5ee0d0", "#c08cff"]);
  assert.deepStrictEqual(farbenIm(FARBVERLAEUFE[0].dark[feld]).slice(0, 4), ["#1f4d9e", "#7a2a5c", "#0d6b63", "#4b2a86"]);
});

pruefe("Jeder Verlauf bleibt im Hellmodus hell und im Dunkelmodus dunkel", () => {
  // Ein Hintergrund liegt unter jeder Karte. Ein dunkler Grund im Hellmodus
  // laege unter hellem Glas mit dunkler Schrift, und umgekehrt.
  let dunkelste = 1, hellste = 0;
  for (const f of FARBVERLAEUFE) {
    const hell = farbenIm(f.light[feld]).map(helligkeit), dunkel = farbenIm(f.dark[feld]).map(helligkeit);
    for (const l of hell.slice(4)) { assert.ok(l > 0.8, `${f.id}: Grund im Hellmodus zu dunkel (${l.toFixed(2)})`); dunkelste = Math.min(dunkelste, l); }
    for (const l of dunkel.slice(4)) { assert.ok(l < 0.03, `${f.id}: Grund im Dunkelmodus zu hell (${l.toFixed(3)})`); hellste = Math.max(hellste, l); }
    for (const l of hell.slice(0, 4)) assert.ok(l > 0.3, `${f.id}: ein Punkt ist im Hellmodus zu dunkel (${l.toFixed(2)})`);
    for (const l of dunkel.slice(0, 4)) assert.ok(l < 0.25, `${f.id}: ein Punkt ist im Dunkelmodus zu hell (${l.toFixed(2)})`);
    // Die Punkte heben sich vom Grund ab - sonst waere es eine einfarbige Wand.
    assert.ok(Math.min(...hell.slice(0, 4)) < Math.min(...hell.slice(4)), `${f.id}: Punkte im Hellmodus nicht zu sehen`);
    assert.ok(Math.max(...dunkel.slice(0, 4)) > Math.max(...dunkel.slice(4)) * 2, `${f.id}: Punkte im Dunkelmodus nicht zu sehen`);
  }
  // Gegenprobe: Die Rechnung unterscheidet wirklich.
  assert.ok(helligkeit("#ffffff") > 0.99 && helligkeit("#000000") < 0.001 && dunkelste < 1 && hellste > 0);
});

pruefe("istPunkteBild: die Farben sind frei, die Geometrie nicht", () => {
  const eigen = punkteBild(["#111111", "rgba(255,0,0,.5)", "var(--accent-color)", "#444444"], ["#000", "#111", "#222"]);
  assert.strictEqual(istPunkteBild(eigen), true);
  assert.strictEqual(istPunkteBild(stelleFest(eigen, true)), true, "mit fixed nicht mehr erkannt");
  // Was es nicht ist:
  const alt = "radial-gradient(900px 620px at 8% 4%, #7db5ff 0%, rgba(125,181,255,0) 55%), radial-gradient(820px 560px at 92% 12%, #ff9ec7 0%, rgba(255,158,199,0) 52%), radial-gradient(760px 700px at 72% 86%, #5ee0d0 0%, rgba(94,224,208,0) 54%), radial-gradient(700px 520px at 22% 78%, #c08cff 0%, rgba(192,140,255,0) 52%), linear-gradient(155deg, #e6eeff 0%, #f3ecff 50%, #e3fbf6 100%)";
  for (const [was, wert] of [
    ["der ruhige Verlauf", VERLAUF], ["ein Foto", "url(/local/hats/bild.jpg) center / cover no-repeat fixed"],
    ["die alte Schreibweise der Inseln", alt], ["leer", ""], ["kein Text", undefined],
    ["ein Punkt um ein Pixel verschoben", eigen.replace("left -413px", "left -412px")],
    ["ein Punkt anders gross", eigen.replace("990px 682px", "990px 680px")],
    ["nur drei Punkte", eigen.split("no-repeat, ").slice(1).join("no-repeat, ")],
    ["ohne Grundverlauf", eigen.slice(0, eigen.lastIndexOf(", linear-gradient"))],
  ]) assert.strictEqual(istPunkteBild(wert), false, `${was} gilt als Punktebild`);
});

pruefe("Die Punkte sitzen in den vier Ecken, jede Ebene so gross wie ihr Fleck", () => {
  const lagen = lagenIm(FARBVERLAEUFE[3].dark[feld]);
  assert.strictEqual(lagen.length, 4);
  assert.deepStrictEqual(lagen.map((l) => l.x + "-" + l.y), ["left-top", "right-top", "right-bottom", "left-bottom"]);
  for (const l of lagen) {
    // Die Ebene ragt ueber ihre Ecke hinaus (negative Lage), ihre Mitte liegt
    // aber im Bild - sonst saehe man vom Fleck weniger als die Haelfte.
    assert.ok(l.dx < 0 && l.dy < 0, JSON.stringify(l));
    assert.ok(l.dx + l.b / 2 > 0 && l.dy + l.h / 2 > 0, `Mitte ausserhalb: ${JSON.stringify(l)}`);
  }
  // Und es ist dieselbe Geometrie, die der Code fuer die Bewegung benutzt.
  assert.deepStrictEqual(lagen, PUNKTE.map(({ x, dx, y, dy, b, h }) => ({ x, dx, y, dy, b, h })));
});

pruefe("Punkte: jede Ebene laeuft ihren eigenen Weg und kommt in der Ruhelage an", () => {
  const css = bewegung({ drift: 0, punkte: 4, farbe: 0 }, { punkte: true }).css;
  const bilder = [...css.matchAll(/^\s*([\d%, ]+) \{ background-position: ([^;]+); \}$/gm)].map((t) => [t[1], t[2].split(", ")]);
  assert.deepStrictEqual(bilder.map((b) => b[0]), ["0%, 100%", "25%", "50%", "75%"]);
  for (const [, lagen] of bilder) {
    assert.strictEqual(lagen.length, 5, "nicht fuenf Ebenen");
    assert.strictEqual(lagen[4], "0 0", "der Grundverlauf bewegt sich");
  }
  // Start und Ende sind die Ruhelage aus dem Wert selbst - sonst spraenge das
  // Bild beim Einschalten.
  const ruhe = lagenIm(FARBVERLAEUFE[0].light[feld]).map((l) => `${l.x} ${l.dx}px ${l.y} ${l.dy}px`);
  assert.deepStrictEqual(bilder[0][1].slice(0, 4), ruhe);
  // Jeder Punkt: vier verschiedene Lagen, nie mehr als 55 px von der Ruhelage,
  // und kein Punkt laeuft denselben Weg wie ein anderer.
  const zahl = (s) => { const t = /(left|right) (-?\d+)px (top|bottom) (-?\d+)px/.exec(s); return [t[1] === "left" ? Number(t[2]) : -Number(t[2]), t[3] === "top" ? Number(t[4]) : -Number(t[4])]; };
  const wege = [0, 1, 2, 3].map((i) => bilder.map(([, lagen]) => { const [x, y] = zahl(lagen[i]), [x0, y0] = zahl(bilder[0][1][i]); return [x - x0, y - y0]; }));
  for (const weg of wege) {
    assert.strictEqual(new Set(weg.map(String)).size, 4, "ein Punkt bleibt stehen");
    const weiteste = Math.max(...weg.map(([x, y]) => Math.hypot(x, y)));
    assert.ok(weiteste >= 20 && weiteste <= 55, `Ausschlag ${weiteste.toFixed(0)} px - "leicht" ist 20 bis 55`);
  }
  assert.strictEqual(new Set(wege.map(String)).size, 4, "zwei Punkte laufen denselben Weg");
  // In Schritten, zehnmal je Sekunde: ein Viertel des Umlaufs je Abschnitt.
  const t = /hats-hintergrund-punkte (\d+)s steps\((\d+)\) infinite/.exec(css);
  assert.ok(t, "die Punkte laufen nicht in Schritten");
  assert.strictEqual(Number(t[1]), punkteDauer(4));
  assert.strictEqual(Number(t[2]), Math.round(punkteDauer(4) / 4 * 10));
  // Die Flaeche bleibt, wo sie ist, und reduzierte Bewegung gilt auch hier.
  assert.ok(!/position:\s*fixed|inset:|will-change/.test(css));
  assert.match(css, /prefers-reduced-motion: reduce/);
});

pruefe("Punkte gibt es nur auf einem Punktebild, und der Abgleich raeumt sie weg", () => {
  assert.strictEqual(bewegung({ drift: 0, punkte: 4 }, { punkte: false }), null);
  assert.strictEqual(bewegung({ drift: 3, punkte: 4 }, { punkte: false }).einstellung.punkte, 0);
  assert.ok(!bewegung({ drift: 3, punkte: 4 }, { punkte: false }).css.includes("background-position"));
  // Ohne die Angabe bleibt, was verlangt ist - wer nur eine andere Groesse
  // aendert und den Rest durchreicht, verliert die Punkte nicht nebenbei.
  assert.strictEqual(bewegung({ drift: 0, punkte: 4 }).einstellung.punkte, 4);
  assert.strictEqual(bewegung({ drift: 0, punkte: 0, farbe: 0 }, { punkte: true }), null);

  const marke = (v) => `/* HATS:${BEWEGUNG_ID}:START */\n${v.css}\n/* HATS:${BEWEGUNG_ID}:ENDE */`;
  const bild = [FARBVERLAEUFE[2].light[feld], FARBVERLAEUFE[2].dark[feld]];
  const nurPunkte = marke(bewegung({ drift: 0, punkte: 5 }, { punkte: true }));
  const mitFarbe = marke(bewegung({ drift: 0, punkte: 5, farbe: 3, weite: 90 }, { punkte: true }));
  // Passt alles: nichts zu tun.
  assert.strictEqual(bewegungNachBild(nurPunkte, bild), undefined);
  assert.strictEqual(bewegungNachBild("", bild), undefined);
  assert.strictEqual(bewegungNachBild(marke(bewegung({ drift: 4 })), [VERLAUF]), undefined, "ohne Punkte gibt es nichts abzugleichen");
  // Der Hintergrund ist kein Punktebild mehr.
  assert.strictEqual(bewegungNachBild(nurPunkte, [VERLAUF]), null, "es gab nur die Punkte - abschalten");
  assert.strictEqual(bewegungNachBild(nurPunkte, []), null, "gar kein Hintergrund mehr");
  assert.strictEqual(bewegungNachBild(nurPunkte, [bild[0], VERLAUF]), null, "hell Punkte, dunkel nicht");
  const rest = bewegungNachBild(mitFarbe, ["url(/local/hats/bild.jpg) center / cover"]);
  assert.deepStrictEqual(rest.einstellung, { drift: 0, punkte: 0, farbe: 3, weite: 90 });
  assert.ok(!rest.css.includes("background-position"));
});

pruefe("Punkte: jede Stufe kommt zurueck, allein und neben Treiben und Farbwechsel", () => {
  for (let p = 1; p <= BEWEGUNG_STUFEN; p++) {
    for (const [d, f] of [[0, 0], [3, 0], [0, 7], [10, 10]]) {
      const m = leeresModell("t");
      vorlageAn(m, bewegung({ drift: d, punkte: p, farbe: f, weite: 60 }, { punkte: true }));
      const z = leseBewegung(m.flach["uix-root"]);
      assert.deepStrictEqual([z.drift, z.punkte, z.farbe], [d, p, f], `Punkte ${p}, Treiben ${d}, Farbe ${f}`);
    }
  }
  assert.ok(punkteDauer(1) > punkteDauer(10));
  // Drei Laeufe in EINER Angabe - sonst ueberschriebe einer die anderen.
  const css = bewegung({ drift: 2, punkte: 2, farbe: 2 }, { punkte: true }).css;
  assert.strictEqual((css.match(/\banimation:[^;]+;/g) || []).length, 2);
  for (const name of ["drift", "punkte", "farbe"]) assert.ok(css.match(/\banimation:[^;]+;/)[0].includes("hats-hintergrund-" + name), name);
  // Die Empfehlung fuer "leicht bewegen und Farben aendern" ist eine gueltige Einstellung.
  assert.deepStrictEqual(bewegung(PUNKTE_VORGABE, { punkte: true }).einstellung, PUNKTE_VORGABE);
  assert.ok(PUNKTE_VORGABE.punkte > 0 && PUNKTE_VORGABE.farbe > 0 && PUNKTE_VORGABE.drift === 0);
});

pruefe("Wer einen Farbverlauf waehlt, bekommt laufende Punkte - jedes Mal", () => {
  const marke = (v) => `/* HATS:${BEWEGUNG_ID}:START */\n${v.css}\n/* HATS:${BEWEGUNG_ID}:ENDE */`;
  const punkte = [FARBVERLAEUFE[8].light[feld], FARBVERLAEUFE[8].dark[feld]];
  // Noch gar keine Bewegung: die Vorgabe.
  assert.deepStrictEqual(bewegungNachWahl("", punkte).einstellung, PUNKTE_VORGABE);
  assert.deepStrictEqual(bewegungNachWahl(".header { color: red; }", punkte).einstellung, PUNKTE_VORGABE);
  // Der Fall vom 13.10.2026: Vom vorigen Mal liegt nur noch der Farbwechsel
  // im Block. Die Punkte starten trotzdem, der Farbwechsel bleibt, wie er war.
  const nurFarbe = marke(bewegung({ drift: 0, punkte: 0, farbe: 7, weite: 90 }));
  assert.deepStrictEqual(bewegungNachWahl(nurFarbe, punkte).einstellung, { drift: 0, punkte: PUNKTE_VORGABE.punkte, farbe: 7, weite: 90 });
  // Laufen sie schon, bleibt alles - auch die eigene Stufe.
  const laeuft = marke(bewegung({ drift: 0, punkte: 9, farbe: 0 }, { punkte: true }));
  assert.strictEqual(bewegungNachWahl(laeuft, punkte), undefined);
  // Wer die Flaeche treiben laesst, behaelt das.
  assert.strictEqual(bewegungNachWahl(marke(bewegung({ drift: 4 })), punkte), undefined);
  // Der zweite Aufruf aendert nichts mehr - sonst waere jedes Zeichnen eine Aenderung.
  for (const anfang of ["", nurFarbe]) {
    const einmal = marke(bewegungNachWahl(anfang, punkte));
    assert.strictEqual(bewegungNachWahl(einmal, punkte), undefined);
  }
  // Kein Punktebild: dann gilt, was bewegungNachBild() sagt - und es startet nichts.
  assert.strictEqual(bewegungNachWahl("", [VERLAUF]), undefined);
  assert.strictEqual(bewegungNachWahl(nurFarbe, [VERLAUF]), undefined);
  assert.strictEqual(bewegungNachWahl(laeuft, [VERLAUF]), null);
  assert.strictEqual(bewegungNachWahl("", []), undefined, "ohne Hintergrund starten Punkte");
  assert.strictEqual(bewegungNachWahl(laeuft, [punkte[0], VERLAUF]), null, "hell Punkte, dunkel nicht");
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
  assert.deepStrictEqual(leseBewegung(gelesen.flach["uix-root"]), { drift: 4, punkte: 0, farbe: 2, weite: 40 });
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

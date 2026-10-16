// Misst die Hintergrund-Vorlagen: erst an der Testmaschine, dann in einem
// echten Chrome, kopflos.
//
//   node werkzeuge/test/hintergrund-messen.mjs
//   node werkzeuge/test/hintergrund-messen.mjs --bilder <ordner>
//
// Zwei Dinge lassen sich ohne das hier nicht pruefen:
//
// 1. Ob Home Assistant die Jinja-Vorlage des Himmels so ausrechnet, wie
//    himmelLage() in JavaScript es vorhersagt. Die Vorlage laeuft auf dem
//    Server; ein Test, der sie nur in JavaScript nachrechnet, prueft sich
//    selbst. Hier rechnet die Testmaschine, ueber /api/template.
//
// 2. Ob das CSS im Browser tut, was es soll: die Flaeche fest und groesser,
//    kein Rand im Bild, kein Rollbalken, Stillstand bei reduzierter Bewegung,
//    die Scheinelemente des Himmels mit der richtigen Farbe, und ein
//    Ueberblenden statt eines Sprungs.
//
// Der eingebaute Browser der Claude-App taugt dafuer nur, solange sein Fenster
// zu sehen ist: Ist es verdeckt, zeichnet die Seite nicht, ein
// Sections-Dashboard baut nicht auf, und UIX schreibt seine Knoten nicht -
// am 13.10.2026 kam so ein Stil mit 16 Zeichen an statt mit 1345.
//
// Die Seite im Chrome ist ein NACHBAU, kein Home Assistant: dieselben
// Bauteilnamen, und fuer hui-view-background und hui-view-container die
// Regeln woertlich aus dem Buendel von 2026.10.1. Was der Nachbau nicht
// zeigt: dass UIX das CSS an diese Stelle haengt. Das ist an der Instanz
// gemessen, siehe CLAUDE.md, Abschnitt "Der Hintergrund".

import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert";
import {
  bewegung, himmel, himmelLage, himmelLageVorlage, himmelLagen, HIMMEL_LAGEN,
  FARBVERLAEUFE, PUNKTE_VORGABE, ohneFest,
} from "../../custom_components/glaswerk/www/hintergrund.js";

const HAOS = "/Users/enricofischer/Projekte/haos-test";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334;
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const bilder = process.argv.includes("--bilder") ? process.argv[process.argv.indexOf("--bilder") + 1] : null;

let n = 0, rot = 0;
function pruefe(was, fn) {
  try { fn(); n++; console.log("ok", was); }
  catch (e) { rot++; console.log("ROT", was, "\n    ", String(e.message).split("\n").slice(0, 5).join("\n     ")); }
}

// ---------------------------------------------------------------------------
// Teil 1: die Testmaschine rechnet

// Ueber ha.py der Testmaschine: Es liest den Zugang selbst und gibt ihn nie
// aus. ha.py erwartet JSON zurueck, deshalb endet jede Vorlage hier auf
// "| tojson" - in der Vorlage, die ins Theme kommt, steht kein Filter.
function rechne(vorlage) {
  const py = "import sys, json\nsys.path.insert(0, sys.argv[1])\nimport ha\nprint(json.dumps(ha.ruf('/api/template', {'template': sys.stdin.read()})))";
  return JSON.parse(execFileSync("python3", ["-c", py, HAOS], { input: vorlage, encoding: "utf8" }));
}
function zustand(entitaet) {
  const py = "import sys, json\nsys.path.insert(0, sys.argv[1])\nimport ha\nprint(json.dumps(ha.ruf('/api/states/' + sys.argv[2])))";
  return JSON.parse(execFileSync("python3", ["-c", py, HAOS, entitaet], { encoding: "utf8" }));
}

console.log("== Testmaschine ==");
const antwort = rechne("{{ (6 * 7) | tojson }}");
pruefe("Die Testmaschine rechnet Vorlagen aus", () => {
  assert.strictEqual(antwort, 42, "keine Antwort von /api/template: " + JSON.stringify(antwort));
});
pruefe("Gegenprobe: eine kaputte Vorlage faellt hier auch auf", () => {
  const kaputt = rechne("{{ states('sun.sun' | tojson }}");
  assert.ok(kaputt && kaputt._fehler === 400, "ein Syntaxfehler kam ohne Fehler zurueck: " + JSON.stringify(kaputt));
});

// Jedes Wetter, am Tag und bei Nacht. Die Entitaet und die Sonne werden durch
// feste Werte ersetzt - geprueft wird die Zuordnung, nicht das Wetter von heute.
const WETTER = ["sunny", "clear-night", "cloudy", "partlycloudy", "fog", "windy", "windy-variant", "exceptional",
  "rainy", "pouring", "lightning", "lightning-rainy", "hail", "snowy", "snowy-rainy", "unknown", "unavailable", "quatsch"];
const faelle = WETTER.flatMap((w) => [[w, false], [w, true]]);
const grund = himmelLageVorlage("weather.x");
pruefe("Die Vorlage laesst sich fuer die Pruefung auf feste Werte stellen", () => {
  assert.ok(grund.includes("states('weather.x')") && grund.includes("is_state('sun.sun', 'below_horizon')"));
});
const stapel = "[" + faelle.map(([w, dunkel]) => grund
  .replace("states('weather.x')", `'${w}'`)
  .replace("is_state('sun.sun', 'below_horizon')", dunkel ? "true" : "false") + "{{ lage | tojson }}").join(",") + "]";
const lagen = rechne(stapel);
pruefe(`Home Assistant ordnet ${faelle.length} Faelle so zu wie himmelLage()`, () => {
  assert.ok(Array.isArray(lagen), "keine Liste zurueck: " + JSON.stringify(lagen).slice(0, 300));
  assert.strictEqual(lagen.length, faelle.length);
  const abweichung = faelle.map(([w, dunkel], i) => [w, dunkel ? "Nacht" : "Tag", lagen[i], himmelLage(w, dunkel)])
    .filter(([, , ha, js]) => ha !== js);
  assert.deepStrictEqual(abweichung, []);
  // Gegenprobe: Es kommen wirklich alle sechs Lagen vor, nicht sechsunddreissigmal dieselbe.
  assert.deepStrictEqual([...new Set(lagen)].sort(), [...HIMMEL_LAGEN].sort());
});

// Die ganze Vorlage, wie sie im Theme steht, mit echten Entitaeten.
const FARBEN = himmelLagen();
const ganz = (entitaet) => rechne(`{% set aus %}${himmel({ wetter: entitaet }).css}{% endset %}{{ aus | tojson }}`);
const sonne = zustand("sun.sun");
const dunkel = sonne.state === "below_horizon";
const echte = ["weather.forecast_home", "weather.demo_weather_north", "weather.demo_weather_south"];
const gerechnet = {};
for (const e of echte) {
  const z = zustand(e);
  const css = ganz(e);
  gerechnet[e] = { wetter: z.state, css };
  pruefe(`${e} (${z.state}, ${dunkel ? "Nacht" : "Tag"}): die Vorlage geht auf und traegt die Farben der Lage`, () => {
    assert.strictEqual(typeof css, "string", "Fehler statt CSS: " + JSON.stringify(css).slice(0, 300));
    assert.ok(!css.includes("{%") && !css.includes("{{"), "es blieb Jinja stehen");
    const lage = himmelLage(z.state, dunkel);
    assert.ok(css.includes(`background-color: ${FARBEN[lage][0]};`), `oben fehlt fuer ${lage}`);
    assert.ok(css.includes(`background-color: ${FARBEN[lage][1]};`), `unten fehlt fuer ${lage}`);
  });
}
const ohne = ganz("weather.gibt_es_nicht");
const klareNacht = rechne(`{% set aus %}${himmel({ wetter: "weather.x" }).css
  .replace("states('weather.x')", "'sunny'").replace("is_state('sun.sun', 'below_horizon')", "true")}{% endset %}{{ aus | tojson }}`);
pruefe("Eine Entitaet, die es nicht gibt, ergibt keinen Fehler und keinen Schleier", () => {
  assert.strictEqual(typeof ohne, "string", "Fehler statt CSS: " + JSON.stringify(ohne).slice(0, 300));
  assert.strictEqual((ohne.match(/background-color: transparent;/g) || []).length, 2);
});

// ---------------------------------------------------------------------------
// Teil 2: der Browser

if (!existsSync(CHROME)) { console.error("Chrome fehlt: " + CHROME); process.exit(1); }

// Woertlich aus dem Buendel von Home Assistant 2026.10.1.
const HA_HINTERGRUND = ":host([fixed-background]){z-index:-1;display:block;position:fixed;background-attachment:scroll!important}:host(:not([fixed-background])){z-index:-1;position:absolute}:host{background:var(--view-background,var(--lovelace-background,var(--primary-background-color)));width:100%;height:100%;opacity:var(--view-background-opacity);inset:0}";
// Aus dem Stylesheet von hui-root, an der Instanz abgelesen. Die zweite Regel
// ist der Grund fuer max-width: none !important in der Vorlage.
const HA_WURZEL = "hui-view-container{box-sizing:border-box;position:relative;display:flex;min-height:100vh;padding-top:56px}hui-view-container > *{flex-direction:column;flex:1 1 100%;max-width:100%;display:flex}";
const VERLAUF = "radial-gradient(900px 620px at 8% 4%, #1f4d9e 0%, rgba(31,77,158,0) 55%), radial-gradient(820px 560px at 92% 12%, #7a2a5c 0%, rgba(122,42,92,0) 52%), radial-gradient(760px 700px at 72% 86%, #0d6b63 0%, rgba(13,107,99,0) 54%), radial-gradient(700px 520px at 22% 78%, #4b2a86 0%, rgba(75,42,134,0) 52%), linear-gradient(155deg, #0b1020 0%, #140d26 50%, #07201f 100%)";

const SEITE = `(() => {
  document.documentElement.style.cssText = "--lovelace-background:${VERLAUF};--primary-background-color:#0b1020;--info-color:#039be5;--warning-color:#ffa600;--secondary-text-color:#9b9b9b;--primary-color:#5468e0";
  document.body.style.cssText = "margin:0;background:#0b1020;font:14px sans-serif;color:#fff";
  if (!customElements.get("hui-view-background")) {
    customElements.define("hui-view-background", class extends HTMLElement {
      constructor() { super(); const s = this.attachShadow({ mode: "open" }); const b = new CSSStyleSheet(); b.replaceSync(${JSON.stringify(HA_HINTERGRUND)}); s.adoptedStyleSheets = [b]; }
    });
  }
  const wirt = document.createElement("div");
  wirt.id = "wurzel";
  wirt.style.cssText = "margin-left:256px";
  const s = wirt.attachShadow({ mode: "open" });
  const blatt = new CSSStyleSheet(); blatt.replaceSync(${JSON.stringify(HA_WURZEL)});
  s.adoptedStyleSheets = [blatt];
  const karten = Array.from({ length: 12 }, (_, i) => '<div style="margin:16px;height:120px;border-radius:22px;background:rgba(28,34,52,.42);backdrop-filter:blur(20px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14)"></div>').join("");
  s.innerHTML = '<style id="vorlage"></style><div><hui-view-container id="view"><hui-view-background></hui-view-background><div class="inhalt" style="max-width:760px">' + karten + '</div></hui-view-container></div>';
  document.body.replaceChildren(wirt);
  window.hg = s.querySelector("hui-view-background");
  window.setze = (css) => { s.getElementById("vorlage").textContent = css; };
  window.stand = () => { const c = getComputedStyle(hg); return {
    position: c.position, links: parseFloat(c.left), oben: parseFloat(c.top), breite: parseFloat(c.width), hoehe: parseFloat(c.height),
    maxBreite: c.maxWidth, transform: c.transform, filter: c.filter,
    laeufe: hg.getAnimations().map((a) => a.animationName + ":" + a.playState).sort(),
    fenster: [document.documentElement.clientWidth, document.documentElement.clientHeight], rollbar: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] }; };
  // Deckt die bewegte Flaeche das Fenster? Die vier Ecken des Fensters werden
  // in das Koordinatensystem der Flaeche zurueckgerechnet - ein umschliessendes
  // Rechteck taete es nicht, eine gedrehte Flaeche hat keins, das stimmt.
  window.luecke = (anteil) => {
    const lauf = hg.getAnimations().find((a) => a.animationName === "glaswerk-hintergrund-drift");
    if (!lauf) return null;
    lauf.pause(); lauf.currentTime = lauf.effect.getTiming().duration * anteil;
    const c = getComputedStyle(hg);
    const l = parseFloat(c.left), o = parseFloat(c.top), b = parseFloat(c.width), h = parseFloat(c.height);
    const mitte = [l + b / 2, o + h / 2];
    const zurueck = new DOMMatrix(c.transform).inverse();
    let kleinste = Infinity;
    const fb = document.documentElement.clientWidth, fh = document.documentElement.clientHeight;
    for (const [x, y] of [[0, 0], [fb, 0], [0, fh], [fb, fh]]) {
      const p = zurueck.transformPoint(new DOMPoint(x - mitte[0], y - mitte[1]));
      const px = p.x + mitte[0], py = p.y + mitte[1];
      kleinste = Math.min(kleinste, px - l, l + b - px, py - o, o + h - py);
    }
    lauf.play();
    return Math.round(kleinste * 10) / 10;
  };
  window.schein = (welches) => { const c = getComputedStyle(hg, welches); return { inhalt: c.content, position: c.position, farbe: c.backgroundColor, maske: c.maskImage || c.webkitMaskImage, zeiger: c.pointerEvents }; };
  // Eine durchscheinende Farbe ueber einen Grund gelegt, als Helligkeit 0..1.
  // Gemalt statt gerechnet: color-mix() liefert color(srgb ...), und das
  // versteht eine Leinwand, ohne dass hier jemand die Schreibweise zerlegt.
  window.helligkeit = (farbe, grund) => {
    const l = document.createElement("canvas"); l.width = l.height = 1;
    const k = l.getContext("2d");
    k.fillStyle = grund; k.fillRect(0, 0, 1, 1);
    k.fillStyle = farbe; k.fillRect(0, 0, 1, 1);
    const [r, g, b] = k.getImageData(0, 0, 1, 1).data;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return Math.round((0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)) * 1000) / 1000;
  };
  window.farbeVon = (wert) => { const d = document.createElement("div"); d.style.backgroundColor = wert; s.appendChild(d); const f = getComputedStyle(d).backgroundColor; d.remove(); return f; };
  return true;
})()`;

const profil = mkdtempSync(path.join(tmpdir(), "glaswerk-hintergrund-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  "--no-first-run", "--no-default-browser-check", "--window-size=1024,768", "about:blank",
], { stdio: "ignore" });

console.log("\n== Browser ==");
try {
  let ziel = null;
  for (let i = 0; i < 50 && !ziel; i++) {
    await warte(200);
    try { ziel = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* noch nicht da */ }
  }
  if (!ziel) throw new Error("Chrome hat seine Debug-Schnittstelle nicht geoeffnet");
  const ws = new WebSocket(ziel.webSocketDebuggerUrl);
  await new Promise((ok, fehl) => { ws.onopen = ok; ws.onerror = () => fehl(new Error("Debug-Verbindung gescheitert")); });
  let nr = 0; const offen = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && offen.has(d.id)) { const { gut, schlecht } = offen.get(d.id); offen.delete(d.id); d.error ? schlecht(new Error(d.error.message)) : gut(d.result); }
  };
  const ruf = (method, params = {}) => new Promise((gut, schlecht) => { const id = ++nr; offen.set(id, { gut, schlecht }); ws.send(JSON.stringify({ id, method, params })); });
  const lies = async (ausdruck) => {
    const r = await ruf("Runtime.evaluate", { expression: ausdruck, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const setze = (css) => lies(`setze(${JSON.stringify(css)})`);
  const bild = async (name) => {
    const r = await ruf("Page.captureScreenshot", { format: "jpeg", quality: 82 });
    if (bilder) { mkdirSync(bilder, { recursive: true }); writeFileSync(path.join(bilder, name + ".jpg"), Buffer.from(r.data, "base64")); }
  };

  await ruf("Page.enable");
  await ruf("Emulation.setDeviceMetricsOverride", { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  // Mit Dokumenttyp, wie Home Assistant. about:blank hat keinen und laeuft im
  // Quirks-Modus: Dort ist clientHeight von <html> die Hoehe des Inhalts, nicht
  // die des Fensters - ein Lauf rechnete so mit 1880 statt 768 px.
  const rahmen = (await ruf("Page.getFrameTree")).frameTree.frame.id;
  await ruf("Page.setDocumentContent", { frameId: rahmen, html: "<!doctype html><html><head><meta charset=\"utf-8\"></head><body></body></html>" });
  await lies(SEITE);
  const modus = await lies("document.compatMode");
  pruefe("Die Probe laeuft im Standardmodus, wie Home Assistant", () => assert.strictEqual(modus, "CSS1Compat"));
  console.log("Browser:", (await ruf("Browser.getVersion")).product, "\n");

  // "fenster" ist ueberall die sichtbare Flaeche OHNE Rollbalken. Darauf
  // beziehen sich die Prozentwerte einer festen Flaeche - ein erster Lauf
  // rechnete mit innerWidth und lag um die 15 px des Rollbalkens daneben.
  // Ohne Vorlage: so, wie Home Assistant es hinstellt.
  const leer = await lies("stand()");
  await bild("hintergrund-ohne");
  pruefe("Ohne Vorlage haengt die Flaeche absolut und ist so hoch wie der Inhalt", () => {
    assert.strictEqual(leer.position, "absolute");
    assert.strictEqual(leer.maxBreite, "100%");
    assert.ok(leer.hoehe > leer.fenster[1] * 1.5, `die Probe ist nicht hoeher als das Fenster: ${leer.hoehe}`);
    assert.deepStrictEqual(leer.laeufe, []);
  });

  // Bewegung und Farbwechsel.
  await setze(bewegung({ drift: 4, farbe: 3, weite: 40 }).css);
  await warte(600);
  const a = await lies("stand()");
  await warte(1500);
  const b = await lies("stand()");
  await bild("hintergrund-bewegung");
  pruefe("Bewegung: die Flaeche steht fest am Fenster und ist rundum 14 % groesser", () => {
    assert.strictEqual(a.position, "fixed");
    assert.strictEqual(a.maxBreite, "none", "Home Assistants Deckel auf 100 % gilt noch");
    assert.ok(Math.abs(a.breite - a.fenster[0] * 1.28) < 1, `Breite ${a.breite}`);
    assert.ok(Math.abs(a.hoehe - a.fenster[1] * 1.28) < 1, `Hoehe ${a.hoehe}`);
    assert.ok(Math.abs(a.links + a.fenster[0] * 0.14) < 1 && Math.abs(a.oben + a.fenster[1] * 0.14) < 1, `Lage ${a.links}/${a.oben}`);
  });
  pruefe("Bewegung: beide Laeufe laufen, und zwar gleichzeitig", () => {
    assert.deepStrictEqual(a.laeufe, ["glaswerk-hintergrund-drift:running", "glaswerk-hintergrund-farbe:running"]);
    assert.notStrictEqual(a.transform, b.transform, "die Flaeche bewegt sich nicht");
    assert.notStrictEqual(a.filter, b.filter, "die Farbe wechselt nicht");
    assert.match(b.filter, /^hue-rotate\(/);
  });
  pruefe("Bewegung: die groessere Flaeche macht keinen Rollbalken", () => {
    // In HATG brauchte es dafuer overflow: clip am Behaelter - dort haengt die
    // Flaeche absolut. Fest am Fenster zaehlt sie nicht zum rollbaren Bereich.
    assert.deepStrictEqual(a.rollbar, leer.rollbar);
    assert.strictEqual(a.rollbar[0], a.fenster[0]);
  });
  const luecken = [];
  for (let i = 0; i <= 40; i++) luecken.push(await lies(`luecke(${i / 40})`));
  pruefe("Bewegung: an keiner Stelle des Wegs laeuft ein Rand ins Bild", () => {
    assert.strictEqual(luecken.length, 41);
    const kleinste = Math.min(...luecken);
    assert.ok(kleinste > 0, `die Flaeche deckt das Fenster nicht: ${kleinste} px`);
    console.log(`     kleinster Ueberstand ${kleinste} px, groesster ${Math.max(...luecken)} px`);
  });
  // Gegenprobe zur Messung selbst: Ohne den Ueberstand muss sie eine Luecke finden.
  await setze(bewegung({ drift: 4 }).css.replace("inset: -14% !important;", "inset: 0 !important;").replace("width: 128% !important;", "width: 100% !important;").replace("height: 128% !important;", "height: 100% !important;"));
  await warte(300);
  const ohneRand = [];
  for (let i = 0; i <= 20; i++) ohneRand.push(await lies(`luecke(${i / 20})`));
  pruefe("Gegenprobe: ohne die 14 % findet dieselbe Messung die Luecke", () => {
    assert.ok(Math.min(...ohneRand) < 0, `keine Luecke gefunden: ${Math.min(...ohneRand)} px`);
  });

  // Reduzierte Bewegung.
  await setze(bewegung({ drift: 4, farbe: 3 }).css);
  await ruf("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await warte(300);
  const ruhig = await lies("stand()");
  await ruf("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await warte(300);
  const wieder = await lies("stand()");
  pruefe("Wer Bewegung reduziert hat, bekommt keine - und danach laeuft sie wieder", () => {
    assert.deepStrictEqual(ruhig.laeufe, []);
    assert.strictEqual(ruhig.transform, "none");
    assert.strictEqual(wieder.laeufe.length, 2);
  });

  // Nur Farbwechsel.
  await setze(bewegung({ drift: 0, farbe: 10, weite: 360 }).css);
  await warte(400);
  const f1 = await lies("stand()");
  await warte(1200);
  const f2 = await lies("stand()");
  pruefe("Farbwechsel allein laesst die Flaeche, wo Home Assistant sie hinstellt", () => {
    assert.strictEqual(f1.position, "absolute");
    assert.strictEqual(f1.breite, leer.breite);
    assert.deepStrictEqual(f1.laeufe, ["glaswerk-hintergrund-farbe:running"]);
    assert.strictEqual(f1.transform, "none");
    assert.notStrictEqual(f1.filter, f2.filter);
  });

  // Der Himmel - mit dem CSS, das die Testmaschine eben ausgerechnet hat.
  await setze("");
  await warte(200);
  const nichts = await lies("schein('::before')");
  pruefe("Ohne Vorlage gibt es kein Scheinelement", () => assert.strictEqual(nichts.inhalt, "none"));

  const nord = gerechnet["weather.demo_weather_north"], sued = gerechnet["weather.demo_weather_south"];
  await setze(nord.css);
  await warte(4600);                       // die Vorlage blendet 4 s
  const vorn = await lies("schein('::before')"), hinten = await lies("schein('::after')");
  const lageNord = himmelLage(nord.wetter, dunkel);
  const sollOben = await lies(`farbeVon(${JSON.stringify(FARBEN[lageNord][0])})`);
  const sollUnten = await lies(`farbeVon(${JSON.stringify(FARBEN[lageNord][1])})`);
  await bild("hintergrund-himmel-" + lageNord);
  pruefe(`Himmel (${nord.wetter} -> ${lageNord}): zwei Schichten, jede mit ihrer Farbe und ihrer Maske`, () => {
    for (const s of [vorn, hinten]) {
      assert.strictEqual(s.inhalt, '""');
      assert.strictEqual(s.position, "absolute");
      assert.strictEqual(s.zeiger, "none", "die Schicht faengt Klicks ab");
      assert.match(s.maske, /linear-gradient\(170deg/);
    }
    assert.strictEqual(vorn.farbe, sollOben);
    assert.strictEqual(hinten.farbe, sollUnten);
    assert.notStrictEqual(vorn.farbe, "rgba(0, 0, 0, 0)", "der Schleier ist durchsichtig");
    assert.notStrictEqual(vorn.maske, hinten.maske);
  });

  // Wetterwechsel: Die Farbe soll ueberblenden, nicht springen.
  const lageSued = himmelLage(sued.wetter, dunkel);
  const zielOben = await lies(`farbeVon(${JSON.stringify(FARBEN[lageSued][0])})`);
  await setze(sued.css);
  await warte(1500);
  const mitten = await lies("schein('::before')");
  await warte(3200);
  const fertig = await lies("schein('::before')");
  await bild("hintergrund-himmel-" + lageSued);
  pruefe(`Wetterwechsel (${lageNord} -> ${lageSued}): die Farbe blendet ueber`, () => {
    assert.notStrictEqual(sollOben, zielOben, "beide Lagen haben oben dieselbe Farbe - der Fall prueft nichts");
    assert.notStrictEqual(mitten.farbe, sollOben, "nach 1,5 s steht noch die alte Farbe");
    assert.notStrictEqual(mitten.farbe, zielOben, "nach 1,5 s steht schon die neue Farbe - gesprungen");
    assert.strictEqual(fertig.farbe, zielOben);
  });

  // Die Entitaet, die es nicht gibt.
  await setze(ohne);
  await warte(4600);
  const klar = await lies("schein('::before')");
  pruefe("Ohne Wetter bleibt der Hintergrund, wie die Theme ihn malt", () => {
    assert.strictEqual(klar.farbe, "rgba(0, 0, 0, 0)");
  });

  // Die klare Nacht in beiden Modi. Das uix-Feld ist fuer beide dasselbe; was
  // sich unterscheidet, sind die Theme-Felder darunter.
  await setze(klareNacht);
  await warte(4600);
  const nachtDunkel = await lies("helligkeit(schein('::before').farbe, '#0b1020')");
  await bild("hintergrund-himmel-klar-dunkel");
  await lies(`(document.documentElement.style.setProperty("--primary-background-color", "#fafafa"), document.documentElement.style.setProperty("--lovelace-background", "linear-gradient(155deg, #e9eef7 0%, #f4f1f8 55%, #eaf4f2 100%)"), document.documentElement.style.setProperty("--secondary-text-color", "#5e5e5e"), true)`);
  await warte(4600);
  const nachtHell = await lies("helligkeit(schein('::before').farbe, '#fafafa')");
  const grundHell = await lies("helligkeit('transparent', '#fafafa')");
  await bild("hintergrund-himmel-klar-hell");
  await lies(`(document.documentElement.style.setProperty("--primary-background-color", "#0b1020"), document.documentElement.style.setProperty("--lovelace-background", ${JSON.stringify(VERLAUF)}), document.documentElement.style.setProperty("--secondary-text-color", "#9b9b9b"), true)`);
  pruefe("Klare Nacht: im Hellmodus bleibt der Himmel hell, im Dunkelmodus dunkel", () => {
    assert.strictEqual(typeof klareNacht, "string", "Fehler statt CSS: " + JSON.stringify(klareNacht).slice(0, 200));
    assert.ok(klareNacht.includes(FARBEN.klar[0]), "die Maschine hat nicht die Lage 'klar' gerechnet");
    console.log(`     Helligkeit oben: dunkel ${nachtDunkel}, hell ${nachtHell} (heller Grund allein ${grundHell})`);
    assert.ok(nachtDunkel < 0.08, `im Dunkelmodus zu hell: ${nachtDunkel}`);
    assert.ok(nachtHell > 0.45, `im Hellmodus zu dunkel fuer dunkle Schrift auf hellem Glas: ${nachtHell}`);
    // Gegenprobe: Der Schleier faerbt wirklich - er ist nicht einfach durchsichtig.
    assert.ok(nachtHell < grundHell - 0.03, "im Hellmodus ist vom Himmel nichts zu sehen");
  });

  // Himmel und Bewegung zusammen: Die Scheinelemente fahren mit.
  await setze(bewegung({ drift: 4 }).css + "\n" + nord.css);
  await warte(800);
  const beides = await lies("stand()"), scheinDabei = await lies("schein('::before')");
  await bild("hintergrund-himmel-bewegt");
  pruefe("Himmel und Bewegung vertragen sich im selben Stilziel", () => {
    assert.deepStrictEqual(beides.laeufe, ["glaswerk-hintergrund-drift:running"]);
    assert.strictEqual(beides.position, "fixed");
    assert.strictEqual(scheinDabei.inhalt, '""');
  });

  // -------------------------------------------------------------------------
  // Die Farbpunkte
  //
  // Der Nachbau setzt das Attribut fixed-background nach Home Assistants
  // eigener Regel, woertlich aus dem Buendel - in der Instanz tut das
  // _applyTheme() am Bauteil.
  const FELD = "--lovelace-background";
  const werkbank = FARBVERLAEUFE[0].dark[FELD];
  await lies(`(() => {
    const haIstFest = (e) => "string" == typeof e ? e.split(" ").includes("fixed") : "object" == typeof e && "fixed" === e.attachment;
    window.grund = (wert) => { document.documentElement.style.setProperty("--lovelace-background", wert); hg.toggleAttribute("fixed-background", haIstFest(wert)); };
    window.lagen = () => getComputedStyle(hg).backgroundPosition.split(", ");
    // Wie viele verschiedene Lagen in einer Zeitspanne vorkommen - so oft wird neu gemalt.
    window.takte = (ms, abstand) => new Promise((ok) => { const gesehen = new Set(); const t0 = performance.now();
      const lauf = () => { gesehen.add(getComputedStyle(hg).backgroundPosition); if (performance.now() - t0 < ms) setTimeout(lauf, abstand); else ok(gesehen.size); }; lauf(); });
    return true; })()`);
  await setze("");
  await lies(`grund(${JSON.stringify(werkbank)})`);
  await warte(300);
  const ruhe = await lies("({ ...stand(), lagen: lagen(), bilder: getComputedStyle(hg).backgroundImage.split('gradient(').length - 1, wiederholung: getComputedStyle(hg).backgroundRepeat })");
  await bild("hintergrund-farbpunkte-ruhe");
  pruefe("Farbpunkte: fuenf Ebenen, fest am Fenster, die vier Punkte ohne Wiederholung", () => {
    assert.strictEqual(ruhe.position, "fixed");
    assert.ok(Math.abs(ruhe.breite - ruhe.fenster[0]) < 1 && Math.abs(ruhe.hoehe - ruhe.fenster[1]) < 1, `${ruhe.breite} x ${ruhe.hoehe}`);
    assert.strictEqual(ruhe.bilder, 5);
    assert.strictEqual(ruhe.lagen.length, 5);
    assert.deepStrictEqual(ruhe.wiederholung.split(", ").slice(0, 4), ["no-repeat", "no-repeat", "no-repeat", "no-repeat"]);
    assert.deepStrictEqual(ruhe.rollbar, leer.rollbar, "die Punkte machen einen Rollbalken");
  });

  await setze(bewegung({ drift: 0, punkte: 10, farbe: 0 }, { punkte: true }).css);
  await warte(400);
  const p1 = await lies("({ lagen: lagen(), stand: stand() })");
  await warte(3000);
  const p2 = await lies("({ lagen: lagen(), stand: stand() })");
  await bild("hintergrund-farbpunkte-bewegt");
  pruefe("Farbpunkte: jeder Punkt bewegt sich, der Grund und die Flaeche bleiben stehen", () => {
    assert.deepStrictEqual(p1.stand.laeufe, ["glaswerk-hintergrund-punkte:running"]);
    for (let i = 0; i < 4; i++) assert.notStrictEqual(p1.lagen[i], p2.lagen[i], `Punkt ${i + 1} steht`);
    assert.strictEqual(p1.lagen[4], p2.lagen[4], "der Grundverlauf bewegt sich");
    assert.strictEqual(p2.stand.transform, "none");
    assert.strictEqual(p2.stand.position, "fixed");
    assert.deepStrictEqual(p2.stand.rollbar, leer.rollbar);
  });
  const getaktet = await lies("takte(1500, 15)");
  await setze(bewegung({ drift: 0, punkte: 10, farbe: 0 }, { punkte: true }).css.replace(/steps\(\d+\)/, "linear"));
  await warte(300);
  const stufenlos = await lies("takte(1500, 15)");
  pruefe("Farbpunkte: gemalt wird im Takt, nicht in jedem Bild", () => {
    console.log(`     in 1,5 s: ${getaktet} verschiedene Lagen im Takt, ${stufenlos} ohne`);
    assert.ok(getaktet >= 10 && getaktet <= 20, `erwartet etwa 15, gemessen ${getaktet}`);
    // Gegenprobe: Ohne die Schritte aendert sich die Lage bei jedem Hinsehen.
    assert.ok(stufenlos > getaktet * 2.5, `ohne Schritte nur ${stufenlos}`);
  });

  // Das, was eingeschaltet wird, wenn nichts weiter gesagt ist.
  await setze(bewegung(PUNKTE_VORGABE, { punkte: true }).css);
  await warte(500);
  const v1 = await lies("stand()");
  await warte(1500);
  const v2 = await lies("stand()");
  pruefe("Die Vorgabe: Punkte und Farbwechsel laufen zusammen, die Flaeche bleibt", () => {
    assert.deepStrictEqual(v1.laeufe, ["glaswerk-hintergrund-farbe:running", "glaswerk-hintergrund-punkte:running"]);
    assert.notStrictEqual(v1.filter, v2.filter);
    assert.strictEqual(v2.transform, "none");
  });
  await ruf("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await warte(300);
  const still = await lies("({ laeufe: stand().laeufe, lagen: lagen() })");
  await ruf("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  pruefe("Reduzierte Bewegung haelt auch die Punkte an, in der Ruhelage", () => {
    assert.deepStrictEqual(still.laeufe, []);
    assert.deepStrictEqual(still.lagen, ruhe.lagen);
  });

  // Die Uebersicht der zehn Farbverlaeufe, je Modus ein Blatt.
  if (bilder) {
    await ruf("Emulation.setDeviceMetricsOverride", { width: 1600, height: 500, deviceScaleFactor: 1, mobile: false });
    for (const [modus, grundfarbe, schrift] of [["dark", "#0b1020", "#ffffff"], ["light", "#f4f5f8", "#1b2430"]]) {
      const kacheln = FARBVERLAEUFE.map((f) => `<figure style="margin:0"><div style="width:300px;height:188px;overflow:hidden;border-radius:14px"><div style="width:1000px;height:626px;transform:scale(.3);transform-origin:0 0;background:${ohneFest(f[modus][FELD])}"></div></div><figcaption style="padding:6px 2px 0;font:500 14px sans-serif;color:${schrift}">${f.de}</figcaption></figure>`).join("");
      await lies(`(document.body.style.background = ${JSON.stringify(grundfarbe)}, document.body.innerHTML = ${JSON.stringify(`<div style="display:grid;grid-template-columns:repeat(5,300px);gap:22px 16px;padding:20px">${kacheln}</div>`)}, true)`);
      await warte(300);
      await bild("hintergrund-farbverlaeufe-" + (modus === "dark" ? "dunkel" : "hell"));
    }
  }

  ws.close();
} catch (e) {
  rot++;
  console.log("ROT Abbruch:", e.message);
} finally {
  chrome.kill();
  await warte(300);
  rmSync(profil, { recursive: true, force: true });
}

console.log(`\n${n} Pruefungen bestanden${rot ? `, ${rot} ROT` : ""}`);
// Eine Messung, die still weniger prueft, als sie soll, ist keine.
process.exit(rot || n < 28 ? 1 : 0);

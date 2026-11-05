// Faehrt die Vollbild-Probe der Steuerkarte mit einem echten Chrome, kopflos.
//
//   node werkzeuge/test/vollbild-messen.mjs
//
// Gemessen wird, was sich im eingebauten Browser der Claude-App nicht messen
// laesst: dass requestFullscreen() nach einem Klick auf die Karte wirklich
// erfuellt wird, und dass ein Ende des Vollbilds von aussen - das, was Esc
// tut - auch den Kiosk-Modus beendet.
//
// Der Klick kommt als Mausereignis ueber das Debug-Protokoll, nicht als
// element.click(): Nur ein echtes Eingabeereignis gilt dem Browser als
// Handlung des Nutzers, und ohne die lehnt er das Vollbild ab.
//
// Chrome laeuft mit einem eigenen, leeren Profil in einem Wegwerfordner. Das
// Profil des Nutzers wird nicht angefasst.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SEITE = "http://127.0.0.1:8778/werkzeuge/test/vollbild-probe.html";
const PORT = 9333;
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) { console.error("Chrome fehlt: " + CHROME); process.exit(1); }
try {
  const r = await fetch(SEITE);
  if (!r.ok) throw new Error("HTTP " + r.status);
} catch (e) {
  console.error(`Der Dateiserver liefert die Probe nicht (${e.message}).`);
  console.error("Er steht auf dem Projektordner, Port 8778 - einspielen-test.sh startet ihn.");
  process.exit(1);
}

const profil = mkdtempSync(path.join(tmpdir(), "glaswerk-vollbild-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  "--no-first-run", "--no-default-browser-check", "--window-size=900,700", "about:blank",
], { stdio: "ignore" });

let n = 0, rot = 0;
function pruefe(was, fn) {
  try { fn(); n++; console.log("ok", was); }
  catch (e) { rot++; console.log("ROT", was, "\n    ", e.message.split("\n").slice(0, 4).join("\n     ")); }
}

try {
  // Auf die Debug-Schnittstelle warten.
  let ziel = null;
  for (let i = 0; i < 50 && !ziel; i++) {
    await warte(200);
    try {
      const liste = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      ziel = liste.find((t) => t.type === "page");
    } catch { /* noch nicht da */ }
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
  // Die Koordinaten kommen immer aus der Seite. Ein erster Lauf klickte fuer
  // die Gegenprobe auf eine ausgerechnete Stelle und traf daneben: Das Fenster
  // ist 700 Pixel hoch, der sichtbare Bereich nicht.
  const klickAuf = async (element) => {
    const p = await lies(`(() => { const r = (${element}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await ruf("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: "left", clickCount: 1 });
    }
  };
  const klick = (wo) => klickAuf(`document.querySelector("#${wo} glaswerk-bar").shadowRoot.querySelector(".knopf")`);
  const stand = () => lies(`({ kiosk: stand.kiosk.slice(), vollbild: stand.vollbild.slice(),
    element: document.fullscreenElement ? document.fullscreenElement.tagName : null,
    gedrueckt: [...document.querySelectorAll("glaswerk-bar")].map((k) => k.shadowRoot.querySelector(".knopf").getAttribute("aria-pressed")) })`);
  const leere = () => lies(`(stand.kiosk.length = 0, stand.vollbild.length = 0, true)`);
  // Warten, bis die Seite zur Ruhe gekommen ist - nicht eine feste Zeit.
  // fullscreenchange kommt erst mit dem naechsten gezeichneten Bild, und ein
  // kopfloser Chrome zeichnet nur, wenn ihn etwas dazu bringt. Ein erster Lauf
  // mit festen 700 ms las fullscreenElement schon als gesetzt und das Ereignis
  // noch nicht; es kam erst im naechsten Schritt an und verfaelschte den. Das
  // Bildschirmfoto hier ist nur der Anstoss zum Zeichnen.
  const ruhe = async (fertig, ms = 4000) => {
    let s = await stand();
    for (let t = 0; t < ms && !fertig(s); t += 150) {
      await ruf("Page.captureScreenshot", { format: "jpeg", quality: 10 }).catch(() => {});
      await warte(150);
      s = await stand();
    }
    await warte(300);                      // und ob danach noch etwas nachkommt
    return stand();
  };

  await ruf("Page.enable");
  await ruf("Page.navigate", { url: SEITE });
  for (let i = 0; i < 40; i++) { await warte(150); if (await lies("window.bereit === true").catch(() => false)) break; }
  console.log("Browser:", (await ruf("Browser.getVersion")).product, "\n");

  const anfang = await stand();
  pruefe("Am Anfang ist nichts geschaltet", () => {
    assert.deepStrictEqual(anfang, { kiosk: [], vollbild: [], element: null, gedrueckt: ["false", "false"] });
  });

  // 1. Einschalten ueber die Karte.
  await klick("beide");
  const an = await ruhe((s) => s.vollbild.length >= 1);
  pruefe("Ein Klick schaltet den Kiosk-Modus ein", () => assert.deepStrictEqual(an.kiosk, [true]));
  pruefe("Der Browser erfuellt die Anfrage: die ganze Seite ist im Vollbild", () => {
    assert.strictEqual(an.element, "HTML");
    assert.deepStrictEqual(an.vollbild, ["HTML"]);
  });
  pruefe("Beide Karten zeigen den Zustand", () => assert.deepStrictEqual(an.gedrueckt, ["true", "true"]));

  // 2. Das Vollbild endet von aussen - das, was Esc tut.
  await leere();
  await lies("document.exitFullscreen()");
  const esc = await ruhe((s) => s.kiosk.length >= 1);
  pruefe("Endet das Vollbild von aussen, endet auch der Kiosk-Modus", () => {
    assert.strictEqual(esc.element, null);
    assert.deepStrictEqual(esc.vollbild, [null]);
    assert.deepStrictEqual(esc.kiosk, [false]);
    assert.deepStrictEqual(esc.gedrueckt, ["false", "false"]);
  });

  // 3. Ein und wieder aus, beides ueber die Karte.
  await leere();
  await klick("beide");
  await ruhe((s) => s.vollbild.length >= 1);
  await klick("beide");
  const aus = await ruhe((s) => s.vollbild.length >= 2);
  pruefe("Aus ueber die Karte: Vollbild zu, Kiosk aus, und nichts doppelt", () => {
    assert.strictEqual(aus.element, null);
    assert.deepStrictEqual(aus.vollbild, ["HTML", null]);
    assert.deepStrictEqual(aus.kiosk, [true, false]);
  });

  // 4. kiosk_only fragt den Browser nicht.
  await leere();
  await klick("nurkiosk");
  const nur = await ruhe((s) => s.kiosk.length >= 1, 1500);
  pruefe("kiosk_only: Kiosk an, aber kein Vollbild", () => {
    assert.deepStrictEqual(nur.kiosk, [true]);
    assert.strictEqual(nur.element, null);
    assert.deepStrictEqual(nur.vollbild, []);
  });
  await klick("nurkiosk");
  await ruhe((s) => s.kiosk.length >= 2, 1500);

  // 5. Ein fremdes Vollbild, das endet, laesst den Kiosk-Modus in Ruhe.
  await leere();
  await klick("nurkiosk");                       // Kiosk an, ohne unser Vollbild
  await ruhe((s) => s.kiosk.length >= 1, 1500);
  await lies(`(() => { window.fremd = document.createElement("button"); fremd.id = "fremd"; fremd.textContent = "fremd";
    fremd.style.cssText = "position:fixed;left:10px;bottom:10px;width:80px;height:40px";
    fremd.onclick = () => document.body.requestFullscreen(); document.body.append(fremd); return true; })()`);
  await klickAuf("window.fremd");
  const fremdAn = await ruhe((s) => s.vollbild.length >= 1);
  await lies("document.fullscreenElement ? document.exitFullscreen() : null");
  const fremdAus = await ruhe((s) => s.vollbild.length >= 2);
  pruefe("Gegenprobe: Ein fremdes Vollbild geht auf und zu, der Kiosk-Modus bleibt", () => {
    assert.strictEqual(fremdAn.element, "BODY", "das fremde Vollbild kam gar nicht zustande - die Gegenprobe waere leer");
    assert.strictEqual(fremdAus.element, null);
    assert.deepStrictEqual(fremdAus.kiosk, [true]);
    assert.deepStrictEqual(fremdAus.gedrueckt, ["true", "true"]);
  });

  ws.close();
} catch (e) {
  rot++; console.log("ROT Abbruch:", e.message);
} finally {
  chrome.kill();
  await warte(400);
  rmSync(profil, { recursive: true, force: true });
}

console.log(`\n${n} Pruefungen, ${rot} rot`);
process.exit(rot || n < 8 ? 1 : 0);

// Standbilder der Testinstanz fuer das Werbevideo - echter Chrome, kopflos.
//
//   node werkzeuge/test/bilder-schiessen.mjs [ziel-ordner]
//
// WARUM NICHT DER BROWSER-BEREICH DER CLAUDE-APP: Der ist so breit wie das
// Fenster und liefert ein Bild in Fensterbreite. Fuer ein Video in 1920x1080
// braucht es 1920x1080 - und zwar bei doppelter Pixeldichte, sonst ist jede
// Schrift beim Hineinzoomen weich. Hier kommt 3840x2160 heraus.
//
// Die Anmeldung: Ein frischer Chrome hat keine Sitzung. Der Langzeit-Token der
// Maschine wird deshalb vor dem ersten Laden in den localStorage gelegt, genau
// wie ihn die Oberflaeche selbst ablegt. Er wird NIE ausgegeben.
//
// Die Kartenstile werden NICHT in die Theme geschrieben, sondern als Felder
// auf <html> gelegt - dieselbe Strecke wie werkzeuge/vorschau.js. Die Theme
// des Nutzers bleibt unberuehrt; nach dem letzten Bild wird die Seite neu
// geladen, und alles steht wieder, wie es stand.

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const VM = "/Users/enricofischer/Projekte/haos-test";
const ZIEL = process.argv[2] || "videos/glaswerk-promo/bilder";
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) { console.error("Chrome fehlt: " + CHROME); process.exit(1); }

const conf = readFileSync(path.join(VM, "zugang.conf"), "utf8");
const URL_ = /^HA_URL=(.*)$/m.exec(conf)[1].trim();
const TOKEN = /^HA_TOKEN=(.*)$/m.exec(conf)[1].trim().replace(/^["']|["']$/g, "");

mkdirSync(ZIEL, { recursive: true });
const profil = mkdtempSync(path.join(tmpdir(), "glaswerk-bilder-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1920,1080", "about:blank",
], { stdio: "ignore" });

let ws;
try {
  let ziel = null;
  for (let i = 0; i < 50 && !ziel; i++) {
    await warte(200);
    try { ziel = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
    catch { /* noch nicht da */ }
  }
  if (!ziel) throw new Error("Chrome hat seine Debug-Schnittstelle nicht geoeffnet");

  ws = new WebSocket(ziel.webSocketDebuggerUrl);
  await new Promise((ok, fehl) => { ws.onopen = ok; ws.onerror = () => fehl(new Error("Debug-Verbindung gescheitert")); });
  let nr = 0; const offen = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && offen.has(d.id)) {
      const { gut, schlecht } = offen.get(d.id); offen.delete(d.id);
      d.error ? schlecht(new Error(d.error.message)) : gut(d.result);
    }
  };
  const ruf = (method, params = {}) => new Promise((gut, schlecht) => {
    const id = ++nr; offen.set(id, { gut, schlecht }); ws.send(JSON.stringify({ id, method, params }));
  });
  const lies = async (ausdruck) => {
    const r = await ruf("Runtime.evaluate", { expression: ausdruck, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };

  await ruf("Page.enable");
  await ruf("Runtime.enable");
  // Doppelte Pixeldichte: 1920x1080 Layout, 3840x2160 Bild.
  await ruf("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 2, mobile: false });

  // ACHTUNG, DOPPELT GEPFLEGT: dieselben zwei Einstellungen stehen in
  // werkzeuge/test/chrome.mjs. Dieses Werkzeug startet seinen eigenen
  // Chrome und importiert chrome.mjs nicht - wer dort etwas aendert, muss
  // es hier mitziehen. Am 15.10.2026 vergessen, und der ganze Lauf kam
  // deutsch und im Hellmodus heraus.
  await ruf("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  });

  // Anmeldung ablegen, BEVOR die Oberflaeche laedt.
  await ruf("Page.navigate", { url: URL_ + "/lovelace" });
  await warte(1500);
  await lies(`localStorage.setItem("hassTokens", JSON.stringify({
    access_token: ${JSON.stringify(TOKEN)}, token_type: "Bearer",
    expires_in: 1800, hassUrl: ${JSON.stringify(URL_)}, clientId: null,
    expires: Date.now() + 10 * 365 * 24 * 3600 * 1000 }))`);
  await lies(`localStorage.setItem("selectedLanguage", JSON.stringify("en"))`);

  const geh = async (pfad, ms = 7000) => {
    await ruf("Page.navigate", { url: URL_ + pfad });
    await warte(ms);
  };
  const schuss = async (name, clip) => {
    const r = await ruf("Page.captureScreenshot", clip ? { format: "png", clip, captureBeyondViewport: true } : { format: "png" });
    const datei = path.join(ZIEL, name + ".png");
    writeFileSync(datei, Buffer.from(r.data, "base64"));
    const kb = Math.round(Buffer.from(r.data, "base64").length / 1024);
    console.log(`  ${name.padEnd(24)} ${kb} kB`);
    return datei;
  };

  await geh("/dashboard-vorschau/start", 9000);
  const angemeldet = await lies(`!!document.querySelector("home-assistant")?.hass?.user`);
  if (!angemeldet) throw new Error("Nicht angemeldet - der Token wurde nicht angenommen");
  const themeVorher = await lies(`document.querySelector("home-assistant").hass.themes.theme`);
  console.log("angemeldet, Theme:", themeVorher);

  // Die Theme des Films ist glaswerk. Auf der Testmaschine arbeiten mehrere
  // Sitzungen, und die wirksame Theme ist nicht immer unsere - beim Lauf am
  // 15.10.2026 stand sie auf glaswerk2. Umgeschaltet wird deshalb hier, und
  // am Ende steht wieder, was vorher stand: settheme schreibt in die
  // Nutzerdaten auf dem Server, das sieht jede andere Sitzung mit.
  const setzeTheme = (name) => lies(
    `document.querySelector("home-assistant").dispatchEvent(new CustomEvent("settheme",
      { detail: { theme: ${JSON.stringify(name)} }, bubbles: true, composed: true })) || ${JSON.stringify(name)}`);
  if (themeVorher !== "glaswerk") {
    console.log("   schalte auf glaswerk um, am Ende zurueck auf", themeVorher);
    await setzeTheme("glaswerk");
    await warte(2600);
  }

  // --- die Werkzeuge in der Seite -----------------------------------------
  await lies(`
    window.__glaswerk = {};
    (async () => {
      const B = await import("/glaswerk_static/baukasten.js");
      window.__glaswerk.B = B;
      window.__glaswerk.stil = (id) => {
        const t = B.KARTENSTILE.find((k) => k.id === id);
        const dunkel = document.querySelector("home-assistant").hass.themes.darkMode;
        const f = { ...t.flach, ...(dunkel ? t.dark : t.light) };
        for (const [k, v] of Object.entries(f)) document.documentElement.style.setProperty(k, v);
        return Object.keys(f).length;
      };
      window.__glaswerk.modus = (dunkel) => {
        document.querySelector("home-assistant").dispatchEvent(
          new CustomEvent("settheme", { detail: { dark: dunkel }, bubbles: true, composed: true }));
      };
    })()`);
  await warte(1200);

  console.log("\\nRahmen 1 - Aufsicht");
  await schuss("01-aufsicht");

  console.log("\\nRahmen 2 - die fuenf Handschriften");
  for (const [id, name] of [["glas", "glas"], ["liquid", "liquid-glass"], ["macos", "macos"],
                            ["gepraegt", "gepraegt"], ["kontur", "kontur"]]) {
    const n = await lies(`window.__glaswerk.stil(${JSON.stringify(id)})`);
    await warte(1400);   // ha-card animiert jede Aenderung: transition all .3s
    await schuss(`02-handschrift-${name}`);
    if (!n) throw new Error("Kartenstil " + id + " hat nichts gesetzt");
  }

  console.log("\\nRahmen 3 - hell und dunkel");
  await lies(`window.__glaswerk.stil("glas")`);
  await warte(1200);
  await schuss("03-dunkel");
  await lies(`window.__glaswerk.modus(false)`);
  await warte(2600);
  await lies(`window.__glaswerk.stil("glas")`);   // die Hellwerte desselben Teils
  await warte(1400);
  await schuss("03-hell");
  await lies(`window.__glaswerk.modus(true)`);
  await warte(2600);

  console.log("\\nRahmen 4 - der Knopf");
  await geh("/dashboard-vorschau/start", 8000);
  const lage = await lies(`(() => {
    const tief = (w, p, a = []) => { for (const e of w.querySelectorAll("*")) { if (p(e)) a.push(e); if (e.shadowRoot) tief(e.shadowRoot, p, a); } return a; };
    const k = tief(document.body, (e) => e.tagName === "Glaswerk-CONTROL-CARD")[0];
    if (!k) return null;
    const z = tief(k.shadowRoot, (e) => e.tagName === "HA-ICON" && /cog|settings/.test(e.getAttribute("icon") || ""))[0];
    const q = (z || k).getBoundingClientRect();
    return { x: Math.round(q.left), y: Math.round(q.top), b: Math.round(q.width), h: Math.round(q.height) };
  })()`);
  if (lage) {
    const rand = 160;
    await schuss("04-knopf", { x: Math.max(0, lage.x - rand), y: Math.max(0, lage.y - rand),
                               width: lage.b + 2 * rand, height: lage.h + 2 * rand, scale: 2 });
    console.log("   Zahnrad bei", JSON.stringify(lage));
  } else {
    console.log("   keine Steuerkarte auf der Seite - Bild 4 faellt aus");
  }

  console.log("\\nRahmen 5 - das Material des Feuerwerks");
  await geh("/glaswerk", 9000);
  await lies(`(() => {
    const tief = (w, p, a = []) => { for (const e of w.querySelectorAll("*")) { if (p(e)) a.push(e); if (e.shadowRoot) tief(e.shadowRoot, p, a); } return a; };
    const sr = tief(document.body, (e) => e.tagName === "Glaswerk-PANEL")[0].shadowRoot;
    sr.querySelector('[data-start="baukasten"]')?.click();
    return true;
  })()`);
  await warte(3000);
  await lies(`(() => {
    const tief = (w, p, a = []) => { for (const e of w.querySelectorAll("*")) { if (p(e)) a.push(e); if (e.shadowRoot) tief(e.shadowRoot, p, a); } return a; };
    const sr = tief(document.body, (e) => e.tagName === "Glaswerk-PANEL")[0].shadowRoot;
    const b = sr.querySelector(".bk-buehne");
    if (b) b.closest(".bk-sorte").scrollIntoView({ block: "start" });
    return !!b;
  })()`);
  await warte(1200);
  await schuss("05-kartenstile");

  console.log("\\nRahmen 6 - der Rest laeuft mit");
  // Auf Ansage vom 15.10.2026: "am ende Blenden wir ein paar sekunden den rest
  // ein mit dem zusatz die laufen natuerlich auch." Die Vergleichsseite traegt
  // genau das: Bubble, Mushroom und HAs eigene Karten nebeneinander, alle in
  // der Theme.
  await geh("/hats-test/vergleich", 9000);
  const fremde = await lies(`(() => {
    const tief = (w, p, a = []) => { for (const e of w.querySelectorAll("*")) { if (p(e)) a.push(e); if (e.shadowRoot) tief(e.shadowRoot, p, a); } return a; };
    return { bubble: tief(document.body, (e) => e.tagName === "BUBBLE-CARD").length,
             mushroom: tief(document.body, (e) => /^MUSHROOM-.*-CARD$/.test(e.tagName)).length,
             kacheln: tief(document.body, (e) => e.tagName === "HUI-TILE-CARD").length };
  })()`);
  console.log("   im Bild:", JSON.stringify(fremde));
  await schuss("06-der-rest");

  // Aufraeumen: Die Felder vom <html> nehmen und neu laden, damit die Theme
  // wieder aus der Datei kommt.
  await geh("/dashboard-vorschau/start", 4000);
  if (themeVorher && themeVorher !== "glaswerk") {
    await setzeTheme(themeVorher);
    await warte(1500);
    const jetzt = await lies(`document.querySelector("home-assistant").hass.themes.theme`);
    console.log("   Theme zurueck auf", jetzt, jetzt === themeVorher ? "(stimmt)" : "(STIMMT NICHT)");
  }
  console.log("\\nfertig -", ZIEL);
} catch (e) {
  console.error("Abgebrochen:", e.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* egal */ }
  chrome.kill();
  rmSync(profil, { recursive: true, force: true });
}

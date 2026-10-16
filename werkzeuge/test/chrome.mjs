// Ein kopfloser Chrome mit angemeldeter Oberflaeche - das Gerüst für die
// Bilder- und Filmwerkzeuge.
//
// Hier steht nur, was alle drei brauchen: Chrome starten, an die
// Debug-Schnittstelle, Token in den localStorage, Seite laden, Bild machen.
// Was ein einzelnes Werkzeug tut, steht bei dem Werkzeug.
//
// Der Token kommt aus haos-test/zugang.conf und wird nie ausgegeben.

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VM = "/Users/enricofischer/Projekte/haos-test";

export const warte = (ms) => new Promise((r) => setTimeout(r, ms));

export async function starteChrome({ port = 9333, breite = 1920, hoehe = 1080, dichte = 2, ziel = null } = {}) {
  if (!existsSync(CHROME)) throw new Error("Chrome fehlt: " + CHROME);
  const conf = readFileSync(path.join(VM, "zugang.conf"), "utf8");
  const URL_ = /^HA_URL=(.*)$/m.exec(conf)[1].trim();
  const TOKEN = /^HA_TOKEN=(.*)$/m.exec(conf)[1].trim().replace(/^["']|["']$/g, "");
  if (ziel) mkdirSync(ziel, { recursive: true });

  const profil = mkdtempSync(path.join(tmpdir(), "glaswerk-chrome-"));
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
    `--window-size=${breite},${hoehe}`, "about:blank",
  ], { stdio: "ignore" });

  let seite = null;
  for (let i = 0; i < 50 && !seite; i++) {
    await warte(200);
    try { seite = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); }
    catch { /* noch nicht da */ }
  }
  if (!seite) { chrome.kill(); throw new Error("Chrome hat seine Debug-Schnittstelle nicht geoeffnet"); }

  const ws = new WebSocket(seite.webSocketDebuggerUrl);
  await new Promise((ok, fehl) => { ws.onopen = ok; ws.onerror = () => fehl(new Error("Debug-Verbindung gescheitert")); });
  let nr = 0; const offen = new Map();
  const horcher = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && offen.has(d.id)) {
      const { gut, schlecht } = offen.get(d.id); offen.delete(d.id);
      return d.error ? schlecht(new Error(d.error.message)) : gut(d.result);
    }
    for (const h of horcher) h(d, (method, params) => ws.send(JSON.stringify({ id: ++nr, method, params })));
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
  await ruf("Emulation.setDeviceMetricsOverride", { width: breite, height: hoehe, deviceScaleFactor: dichte, mobile: false });

  // Dunkelmodus fest emulieren. Die Theme steht auf "automatisch", und
  // "automatisch" fragt prefers-color-scheme - ein frischer Chrome sagt
  // dort HELL. Deshalb kam eine Probeaufnahme im Hellmodus heraus, obwohl
  // das Skript sich auf Dunkel verliess. Emuliert statt ueber settheme
  // gesetzt: Das ruehrt die Nutzerdaten auf dem Server nicht an.
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

  // Die Oberflaeche auf Englisch - NUR in diesem Browser. HA liest die
  // Sprache aus localStorage "selectedLanguage" und zieht erst danach das
  // Serverprofil nach; wer sie hier setzt, bekommt sie auch nach dem
  // Nachziehen. Ohne diese Zeile stand in den Aufnahmen "Donnerstag,
  // 15. Oktober 2026" statt "Thursday".
  await ruf("Runtime.evaluate", { expression: `localStorage.setItem("selectedLanguage", JSON.stringify("en"))`, returnByValue: true });

  return {
    ruf, lies, URL: URL_, horcher,
    breite: (b, h) => ruf("Emulation.setDeviceMetricsOverride", { width: b, height: h ?? hoehe, deviceScaleFactor: dichte, mobile: false }),
    geh: async (pfad, ms = 8000) => { await ruf("Page.navigate", { url: URL_ + pfad }); await warte(ms); },
    pruefeAnmeldung: async () => {
      const da = await lies(`!!document.querySelector("home-assistant")?.hass?.user`);
      if (!da) throw new Error("Nicht angemeldet - der Token wurde nicht angenommen");
      return lies(`document.querySelector("home-assistant").hass.themes.theme`);
    },
    schuss: async (name, clip) => {
      const r = await ruf("Page.captureScreenshot", clip ? { format: "png", clip, captureBeyondViewport: true } : { format: "png" });
      const roh = Buffer.from(r.data, "base64");
      writeFileSync(path.join(ziel, name + ".png"), roh);
      console.log(`  ${name.padEnd(26)} ${Math.round(roh.length / 1024)} kB`);
    },
    zu: async () => {
      try { ws.close(); } catch { /* egal */ }
      chrome.kill();
      await warte(400);
      try { rmSync(profil, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); }
      catch { /* ein Wegwerfordner im Temp ist kein Grund fuer einen Abbruch */ }
    },
  };
}

// Das tiefe Suchen durch Shadow-Grenzen - in jeder Seitenmessung dasselbe.
export const TIEF = `const tief = (w, p, a = []) => { for (const e of w.querySelectorAll("*")) { if (p(e)) a.push(e); if (e.shadowRoot) tief(e.shadowRoot, p, a); } return a; };`;

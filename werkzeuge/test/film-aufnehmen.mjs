// Bildschirmvideo der Testinstanz - echter Chrome, kopflos, als mp4.
//
//   node werkzeuge/test/film-aufnehmen.mjs <pfad> <sekunden> [name]
//   node werkzeuge/test/film-aufnehmen.mjs /dashboard-vorschau/start 12 aufsicht
//
// WOFUER: Die Hintergruende von Glaswerk BEWEGEN sich - die Farbpunkte treiben,
// der Farbton wandert, der Verlauf laeuft. Auf einem Standbild ist davon nichts
// zu sehen, und genau das ist der Teil, der im Video wirken soll.
//
// WIE: Page.startScreencast liefert fertige Einzelbilder, sobald die Seite
// neu zeichnet - kein Abfotografieren in einer Schleife, das ungleichmaessige
// Abstaende haette. Jedes Bild bringt seinen eigenen Zeitstempel mit; daraus
// entsteht eine Liste fuer ffmpeg, die die ECHTEN Abstaende behaelt. Eine feste
// Bildrate waere eine Behauptung, keine Aufnahme.
//
// ZWEI FALLEN, beide bezahlt:
//
//   - Die Bewegung der Farbpunkte laeuft in Schritten, zehnmal je Sekunde
//     (steps(), siehe CLAUDE.md). Mit 30 Bildern je Sekunde sieht man jeden
//     Schritt dreimal - das ist richtig so und kein Ruckeln.
//   - Ein kopfloser Chrome zeichnet nur, wenn ihn etwas dazu bringt. Ohne
//     Screencast steht die Seite still; MIT Screencast zeichnet er fuer jedes
//     Bild. Deshalb nie ueber captureScreenshot in einer Schleife aufnehmen.

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334;
const VM = "/Users/enricofischer/Projekte/haos-test";
const ZIEL = "videos/glaswerk-promo/filme";

const ARGS = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const FLAGS = new Set(process.argv.slice(2).filter((x) => x.startsWith("--")));
const PFAD = ARGS[0] || "/dashboard-vorschau/start";
const SEKUNDEN = Number(ARGS[1] || 10);
const NAME = ARGS[2] || PFAD.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "film";

// --stile   schaltet waehrend der Aufnahme die fuenf Kartenstile durch
// --themes  schaltet die Themes der Instanz durch
//
// Beides laeuft WAEHREND der Aufnahme, nicht davor: Der Uebergang ist der
// Effekt. ha-card traegt transition: all .3s ease-out, jede Flaeche blendet
// also von selbst - aufgenommen sieht man genau das, auf einem Standbild nie.
const DURCHSCHALTEN = FLAGS.has("--stile") ? "stile"
  : FLAGS.has("--themes") ? "themes"
  : FLAGS.has("--fenster") ? "fenster" : null;
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(CHROME)) { console.error("Chrome fehlt: " + CHROME); process.exit(1); }
if (spawnSync("which", ["ffmpeg"]).status !== 0) { console.error("ffmpeg fehlt"); process.exit(1); }

const conf = readFileSync(path.join(VM, "zugang.conf"), "utf8");
const URL_ = /^HA_URL=(.*)$/m.exec(conf)[1].trim();
const TOKEN = /^HA_TOKEN=(.*)$/m.exec(conf)[1].trim().replace(/^["']|["']$/g, "");

mkdirSync(ZIEL, { recursive: true });
const profil = mkdtempSync(path.join(tmpdir(), "hats-film-"));
const bilder = mkdtempSync(path.join(tmpdir(), "hats-bilder-"));
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
  const rahmen = [];
  let sammeln = false;
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && offen.has(d.id)) {
      const { gut, schlecht } = offen.get(d.id); offen.delete(d.id);
      return d.error ? schlecht(new Error(d.error.message)) : gut(d.result);
    }
    if (d.method === "Page.screencastFrame") {
      // Immer bestaetigen, auch wenn wir noch nicht sammeln - sonst haelt
      // Chrome nach wenigen Bildern an.
      ws.send(JSON.stringify({ id: ++nr, method: "Page.screencastFrameAck", params: { sessionId: d.params.sessionId } }));
      if (sammeln) rahmen.push({ daten: d.params.data, zeit: d.params.metadata.timestamp });
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
  await ruf("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  // Dunkelmodus fest emulieren. Die Theme steht auf "automatisch", und
  // "automatisch" fragt prefers-color-scheme - ein frischer Chrome sagt
  // dort HELL. Deshalb kam eine Probeaufnahme im Hellmodus heraus, obwohl
  // das Skript sich auf Dunkel verliess. Emuliert statt ueber settheme
  // gesetzt: Das ruehrt die Nutzerdaten auf dem Server nicht an.
  await ruf("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  });

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
  await lies(`localStorage.setItem("selectedLanguage", JSON.stringify("en"))`);

  await ruf("Page.navigate", { url: URL_ + PFAD });
  await warte(9000);
  const wer = await lies(`(() => { const h = document.querySelector("home-assistant");
    return { angemeldet: !!h?.hass?.user, theme: h?.hass?.themes?.theme, pfad: location.pathname }; })()`);
  if (!wer.angemeldet) throw new Error("Nicht angemeldet - der Token wurde nicht angenommen");
  console.log(`${wer.pfad}, Theme ${wer.theme} - ${SEKUNDEN} s aufnehmen ...`);

  // Die Theme des Films ist glaswerk. Auf der Testmaschine arbeiten mehrere
  // Sitzungen; beim Lauf am 15.10.2026 stand die wirksame Theme auf
  // glaswerk2. Umgeschaltet wird hier, zurueckgegeben am Ende.
  const setzeTheme = (name) => lies(
    `document.querySelector("home-assistant").dispatchEvent(new CustomEvent("settheme",
      { detail: { theme: ${JSON.stringify(name)} }, bubbles: true, composed: true })) || ${JSON.stringify(name)}`);
  const themeVorher = wer.theme;
  if (themeVorher !== "glaswerk") {
    console.log(`   schalte auf glaswerk um, am Ende zurueck auf ${themeVorher}`);
    await setzeTheme("glaswerk");
    await warte(2600);
  }

  // Die Werkzeuge in der Seite - nur, wenn durchgeschaltet werden soll.
  let schritte = [];
  if (DURCHSCHALTEN === "stile") {
    await lies(`window.__f = {};
      (async () => {
        const B = await import("/hats_static/baukasten.js");
        window.__f.stil = (id) => {
          const t = B.KARTENSTILE.find((k) => k.id === id);
          const dunkel = document.querySelector("home-assistant").hass.themes.darkMode;
          const f = { ...t.flach, ...(dunkel ? t.dark : t.light) };
          for (const [k, v] of Object.entries(f)) document.documentElement.style.setProperty(k, v);
          return id;
        };
      })()`);
    await warte(1200);
    schritte = ["glas", "liquid", "macos", "gepraegt", "kontur"]
      .map((id) => ({ name: id, tu: `window.__f.stil(${JSON.stringify(id)})` }));
  } else if (DURCHSCHALTEN === "fenster") {
    // DAS IST DER WICHTIGE TEIL DES FILMS: was das Zahnrad und die Karte
    // tun. Geklickt wird ueber das DOM, nicht ueber Pixel - der Knopf sitzt
    // je nach Breite woanders, der Titel nie.
    //
    // Jeder Klick auf einen Kartenstil SCHREIBT die Theme-Datei und laedt
    // alle Themes neu. Das ist echt und soll echt sein; die Datei der
    // Maschine ist vorher gesichert und wird danach zurueckgespielt.
    await lies(`window.__f = {
      karte: () => { const tief = (w, p, a = []) => { for (const e of w.querySelectorAll("*")) {
          if (p(e)) a.push(e); if (e.shadowRoot) tief(e.shadowRoot, p, a); } return a; };
        return tief(document, (e) => e.tagName === "HATS-CONTROL-CARD")[0]; },
      // Gesucht wird das SYMBOL, nicht der Titel. Der heisst je nach
      // Sprache "Einstellungen" oder "Settings" - am 15.10.2026 ist der
      // Lauf daran gescheitert, nachdem die Oberflaeche auf Englisch stand.
      zahnrad: () => { const k = window.__f.karte();
        const g = [...k.shadowRoot.querySelectorAll("button")].find((b) => {
          const s = b.querySelector("ha-icon");
          return s && /cog|settings/.test(s.getAttribute("icon") || ""); });
        if (!g) throw new Error("kein Zahnrad in der Leiste"); g.click(); return "zahnrad"; },
      imFenster: (text) => { const d = window.__f.karte().shadowRoot.querySelector("dialog");
        if (!d) throw new Error("kein Fenster offen");
        const b = [...d.querySelectorAll("button")].find((x) => x.textContent.trim() === text);
        if (!b) throw new Error("nicht gefunden: " + text); b.click(); return text; },
      zu: () => { const d = window.__f.karte().shadowRoot.querySelector("dialog");
        d.querySelector("button.fzu").click(); return "zu"; },
    }; "bereit"`);
    schritte = [
      { name: "ruhe",        tu: `"ruhe"`,                               ms: 1100 },
      { name: "zahnrad",     tu: `window.__f.zahnrad()`,                 ms: 2000 },
      // Die Beschriftungen stehen auf Englisch, seit die Aufnahme englisch
      // laeuft - das Fenster ist uebersetzt. "Liquid Glass" kommt zweimal
      // vor (Kartenstil und Palette); imFenster nimmt den ersten, und das
      // ist der Kartenstil.
      { name: "Clear glass",   tu: `window.__f.imFenster("Clear glass")`,   ms: 2000 },
      { name: "Frosted glass", tu: `window.__f.imFenster("Frosted glass")`, ms: 2000 },
      { name: "Liquid Glass",  tu: `window.__f.imFenster("Liquid Glass")`,  ms: 2200 },
      { name: "Background",    tu: `window.__f.imFenster("Background")`,    ms: 2400 },
      { name: "Appearance",    tu: `window.__f.imFenster("Appearance")`,    ms: 900 },
      { name: "Light",         tu: `window.__f.imFenster("Light")`,         ms: 2400 },
      { name: "Dark",          tu: `window.__f.imFenster("Dark")`,          ms: 1800 },
      { name: "zu",          tu: `window.__f.zu()`,                      ms: 1400 },
    ];
  } else if (DURCHSCHALTEN === "themes") {
    // Nur Themes, die es auf dieser Instanz wirklich gibt - und die eigene
    // zuletzt, damit sie am Ende steht.
    const da = await lies(`Object.keys(document.querySelector("home-assistant").hass.themes.themes)`);
    const reihe = ["ha_blanko", "macos", "liquid_glass", "glaswerk"].filter((t) => da.includes(t));
    schritte = reihe.map((t) => ({ name: t,
      tu: `document.querySelector("home-assistant").dispatchEvent(new CustomEvent("settheme",
            { detail: { theme: ${JSON.stringify(t)} }, bubbles: true, composed: true })) || ${JSON.stringify(t)}` }));
    console.log("Themes:", reihe.join(" -> "));
  }

  await ruf("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await warte(600);            // die ersten Bilder sind der Aufbau
  rahmen.length = 0;
  sammeln = true;
  if (schritte.length) {
    // Ein Schritt darf seine eigene Standzeit mitbringen (ms). Ohne sie wird
    // die Gesamtzeit gleichmaessig aufgeteilt - ein Fenster, das aufgeht,
    // braucht aber laenger als ein Stil, der umschaltet.
    const je = (SEKUNDEN * 1000) / schritte.length;
    for (const s of schritte) {
      await lies(s.tu);
      process.stdout.write(`  ${s.name} `);
      await warte(s.ms ?? je);
    }
    process.stdout.write("\n");
  } else {
    await warte(SEKUNDEN * 1000);
  }
  sammeln = false;
  await ruf("Page.stopScreencast");

  if (rahmen.length < 10) throw new Error(`nur ${rahmen.length} Bilder - die Seite hat nicht gezeichnet`);
  const dauer = rahmen[rahmen.length - 1].zeit - rahmen[0].zeit;
  console.log(`${rahmen.length} Bilder in ${dauer.toFixed(1)} s = ${(rahmen.length / dauer).toFixed(1)} je Sekunde`);

  // Die echten Abstaende behalten: ffmpegs concat-Liste traegt je Bild seine
  // Standzeit. Das letzte Bild braucht eine, sonst faellt es weg.
  let liste = "";
  rahmen.forEach((r, i) => {
    const datei = path.join(bilder, String(i).padStart(5, "0") + ".jpg");
    writeFileSync(datei, Buffer.from(r.daten, "base64"));
    const dauerBild = i + 1 < rahmen.length ? rahmen[i + 1].zeit - r.zeit : 1 / 30;
    liste += `file '${datei}'\nduration ${Math.max(dauerBild, 1 / 120).toFixed(4)}\n`;
  });
  liste += `file '${path.join(bilder, String(rahmen.length - 1).padStart(5, "0") + ".jpg")}'\n`;
  const listeDatei = path.join(bilder, "liste.txt");
  writeFileSync(listeDatei, liste);

  const aus = path.join(ZIEL, `${NAME}.mp4`);
  // ZWEI STOLPERSTELLEN IN FFMPEG 9, beide erst NACH der Aufnahme sichtbar:
  //   -vsync gibt es nicht mehr ("Unrecognized option"), es heisst -fps_mode
  //   -r zusammen mit -fps_mode vfr ist "contradictory"
  // Also: feste 30 Bilder je Sekunde ausgeben und ffmpeg aus den Standzeiten
  // der Liste selbst rechnen lassen, was wann zu sehen ist.
  const ff = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listeDatei,
    "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
    "-movflags", "+faststart", aus], { encoding: "utf8" });
  if (ff.status !== 0) throw new Error("ffmpeg: " + (ff.stderr || "").split("\n").slice(-4).join(" "));
  const groesse = Math.round(readFileSync(aus).length / 1024);
  console.log(`${aus}  ${groesse} kB`);

  if (themeVorher && themeVorher !== "glaswerk") {
    await setzeTheme(themeVorher);
    await warte(1500);
    const jetzt = await lies(`document.querySelector("home-assistant").hass.themes.theme`);
    console.log(`   Theme zurueck auf ${jetzt}` + (jetzt === themeVorher ? " (stimmt)" : " (STIMMT NICHT)"));
  }
} catch (e) {
  console.error("Abgebrochen:", e.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* egal */ }
  chrome.kill();
  // Chrome schreibt sein Profil noch, waehrend wir aufraeumen - ein ENOTEMPTY
  // hier hat den ersten Lauf abgebrochen und die Aufnahme verschluckt. Ein
  // Wegwerfordner im Temp ist kein Grund, einen fertigen Film zu verlieren.
  await warte(400);
  for (const o of [profil, bilder]) {
    try { rmSync(o, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); }
    catch (e) { console.log("(Wegwerfordner bleibt liegen:", o, "-", e.code + ")"); }
  }
}

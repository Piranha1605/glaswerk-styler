// Eine Theme ansehen, ohne sie zu aktivieren.
//
// Warum es das braucht: Die aktive Theme laesst sich von aussen nicht
// umschalten. Weder frontend.set_theme noch frontend/set_user_data noch
// localStorage greifen durch - am 13.10.2026 alle drei gemessen, HA schreibt
// seinen aufgeloesten Stand bei jedem Laden zurueck. Der einzige echte Hebel
// waere das settheme-Ereignis, und das ist tabu.
//
// Dieses Werkzeug macht stattdessen genau das, was HAs applyThemesOnElement
// auch tut: Es schreibt die Felder als CSS-Variablen auf <html>. Und es baut
// nach, was UIX mit den uix-Feldern macht: ein <style> in den Shadow Root des
// jeweiligen Bauteils.
//
// Geladen wird es so (die Datei liegt unter /local, nicht in der Integration):
//
//   const V = await import('/local/glaswerk-vorschau.js?' + Date.now());
//   await V.an('liquid_glass', 'light');     // ansehen
//   V.aus();                                 // alles zurueck
//
// Es aendert NICHTS dauerhaft: kein Speichern, kein Dienst, kein user data.
// Ein Neuladen der Seite stellt den alten Zustand her.

const GESETZT = [];           // was wir auf <html> geschrieben haben
const KNOTEN = [];            // unsere <style>-Knoten in den Shadow Roots
const STILLGELEGT = [];       // UIX-Knoten der aktiven Theme, [knoten, inhalt]

// Die UIX-Knoten der AKTIVEN Theme stilllegen, solange die Vorschau laeuft.
//
// Ohne das misst man einen Kampf statt eine Vorlage. Am 13.10.2026 gesehen:
// Die Kachelform kam an jeder Stelle an - --bubble-icon-border-radius stand am
// Icon auf 28 % -, und der berechnete Radius war trotzdem 9999px. Die Ursache
// lag nicht in der Vorlage, sondern in einem uix-Knoten der laufenden Theme,
// der dasselbe Element mit mehr Spezifitaet traf.
//
// UIX legt seine Knoten als <uix-node> mit einem <style> darin ab, nicht als
// adoptedStyleSheets - deshalb reicht es, deren Inhalt zu leeren.
function uixStilllegen() {
  for (const n of tiefeSuche((e) => e.tagName === "UIX-NODE", document.body, [], 0, true)) {
    for (const st of n.querySelectorAll("style")) {
      if (!st.textContent) continue;
      STILLGELEGT.push([st, st.textContent]);
      st.textContent = "";
    }
  }
  return STILLGELEGT.length;
}

function uixZurueck() {
  for (const [st, inhalt] of STILLGELEGT) st.textContent = inhalt;
  STILLGELEGT.length = 0;
}

function hass() {
  return document.querySelector("home-assistant").hass;
}

// Das Theme-YAML holen - ueber Glaswerk' eigenen Websocket-Befehl.
export async function lies(name) {
  const r = await hass().connection.sendMessagePromise({
    type: "glaswerk/load_theme_file", filename: name.endsWith(".yaml") ? name : name + ".yaml",
  });
  return r.content ?? r.text ?? "";
}

// Gelesen wird mit Glaswerk' EIGENEM Parser, nicht mit einem Nachbau.
//
// Der erste Anlauf hatte hier einen eigenen, schmalen YAML-Leser. Er hat die
// Modi nicht getrennt: 153 Felder landeten unter light, 0 unter dark, und die
// Dunkelwerte ueberschrieben die hellen. Die Vorschau zeigte eine dunkle
// Theme, obwohl "light" verlangt war - und die Theme selbst war in Ordnung.
//
// Zwei Parser fuer dasselbe Format sind einer zu viel. Der echte kommt ueber
// dieselbe Adresse, unter der HA auch das Panel laedt.
let _leseTheme = null, _wirksam = null;
async function parser() {
  if (!_leseTheme) {
    const t = await import("/glaswerk_static/theme.js?" + Date.now());
    _leseTheme = t.leseTheme;
    _wirksam = t.wirksam;
  }
  return { leseTheme: _leseTheme, wirksam: _wirksam };
}

export async function lese(text) {
  const { leseTheme } = await parser();
  return leseTheme(text);
}

// Wo UIX seine Knoten hinhaengt - fuer die Ziele, die wir nachbauen koennen.
// Mehr als diese braucht eine Vorschau nicht: Was man auf einem Dashboard
// sieht, sind Karten, Badges, die Leisten und die Dialoge.
const WOHIN = {
  card: kartenWirte,
  badge: () => tiefeSuche((e) => e.tagName === "HA-BADGE"),
  sidebar: () => tiefeSuche((e) => e.tagName === "HA-SIDEBAR"),
  "top-app-bar-fixed": () => tiefeSuche((e) => e.tagName === "HA-TOP-APP-BAR-FIXED"),
  dialog: () => tiefeSuche((e) => e.tagName === "HA-DIALOG"),
  "more-info": () => tiefeSuche((e) => e.tagName === "HA-MORE-INFO-DIALOG" || e.tagName === "HA-ADAPTIVE-DIALOG"),
  toast: () => tiefeSuche((e) => e.tagName === "HA-TOAST" || e.tagName === "NOTIFICATION-MANAGER"),
};

// Wo UIX bei Karten wirklich einhaengt - und nur dort.
//
// Der erste Anlauf hat jede ha-card UND jedes Karten-Element genommen. Damit
// lag das CSS doppelt uebereinander, der Glanz wirkte ausgewaschen, und die
// Ausnahmen trafen nicht: ":host(hui-heading-card) ha-card" greift nur, wenn
// :host wirklich die hui-heading-card ist. In der ha-card darin ist :host die
// ha-card - und die Ueberschriftenkarte behielt ihre Flaeche, obwohl die
// Vorlage sie ausdruecklich ausnimmt.
//
// UIX' eigene Regel, aus src/patch/ha-card.ts: Liegt die Karte unter einer
// hui-card, wird das KARTEN-ELEMENT gepatcht und ha-card bleibt unberuehrt.
// Nur wo keine hui-card darueber liegt, patcht UIX die ha-card selbst.
function kartenWirte() {
  const raus = [];
  for (const hui of tiefeSuche((e) => e.tagName === "HUI-CARD", document.body, [], 0, true)) {
    const kind = [...(hui.shadowRoot?.children || hui.children)]
      .find((c) => c.shadowRoot && !/^(STYLE|UIX-NODE)$/.test(c.tagName));
    if (kind) raus.push(kind);
  }
  for (const c of tiefeSuche((e) => e.tagName === "HA-CARD")) {
    let p = c, unterHui = false;
    while (p) {
      if (p.tagName === "HUI-CARD") { unterHui = true; break; }
      p = p.parentElement || p.getRootNode?.()?.host;
    }
    if (!unterHui && c.shadowRoot) raus.push(c);
  }
  return [...new Set(raus)];
}

// Durch alle Shadow Roots laufen. Kein querySelectorAll kommt durch sie durch.
function tiefeSuche(passt, wurzel = document.body, raus = [], tiefe = 0, auchOhneShadow = false) {
  if (tiefe > 25) return raus;
  for (const el of wurzel.querySelectorAll("*")) {
    if (passt(el) && (auchOhneShadow || el.shadowRoot)) raus.push(el);
    if (el.shadowRoot) tiefeSuche(passt, el.shadowRoot, raus, tiefe + 1, auchOhneShadow);
  }
  return raus;
}

export async function an(themeName, modus = "light") {
  aus();
  const stillgelegt = uixStilllegen();
  const { wirksam } = await parser();
  const m = await lese(await lies(themeName));
  if (m.fehler) throw new Error(m.fehler);
  const werte = wirksam(m, modus);

  // 1. Die Felder auf <html>, wie HA es tut.
  let zahl = 0;
  for (const [k, v] of Object.entries(werte)) {
    if (k.startsWith("uix-") || k === "modes") continue;
    const name = "--" + k;
    document.documentElement.style.setProperty(name, v);
    GESETZT.push(name);
    zahl++;
    // HA leitet --rgb-<name> aus jedem Hex-Feld selbst ab. Ohne das bleiben
    // Seitenleisten-Symbole und Mushroom-Zustandsfarben auf dem alten Stand.
    if (typeof v === "string" && v.trim().startsWith("#") && werte["rgb-" + k] === undefined) {
      const h = v.trim().slice(1);
      const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
      if (/^[0-9a-f]{6}$/i.test(s)) {
        const t = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)).join(",");
        document.documentElement.style.setProperty("--rgb-" + k, t);
        GESETZT.push("--rgb-" + k);
      }
    }
  }

  // 2. Das UIX-CSS in die Shadow Roots, wie UIX es tut.
  const bericht = {};
  for (const [ziel, finde] of Object.entries(WOHIN)) {
    const css = werte["uix-" + ziel];
    if (!css) continue;
    const wirte = finde();
    for (const w of wirte) {
      const s = document.createElement("style");
      s.setAttribute("data-glaswerk-vorschau", ziel);
      s.textContent = css;
      w.shadowRoot.appendChild(s);
      KNOTEN.push(s);
    }
    bericht[ziel] = wirte.length;
  }

  return { theme: m.name, modus, felder: zahl, uix: bericht, knoten: KNOTEN.length, stillgelegt };
}

export function aus() {
  uixZurueck();
  for (const n of GESETZT) document.documentElement.style.removeProperty(n);
  GESETZT.length = 0;
  for (const s of KNOTEN) s.remove();
  KNOTEN.length = 0;
  // Auch die, die ein frueherer Lauf hinterlassen hat.
  for (const s of tiefeSuche(() => true).flatMap((e) => [...e.shadowRoot.querySelectorAll("style[data-glaswerk-vorschau]")])) s.remove();
  return "zurueckgestellt";
}

// Die Theme anwenden, aber nur eine Auswahl der Vorlagen - fuer Vorher/Nachher.
//
//   await nur('liquid_glass', [])                  nur die Felder, keine Vorlage
//   await nur('liquid_glass', ['glas-karten'])     Felder plus genau diese eine
//
// Damit entsteht ein ehrliches Paar: Beide Bilder zeigen dieselbe Theme,
// derselbe Hintergrund, dieselben Farben - der einzige Unterschied ist die
// Vorlage. Ein Vorher-Bild mit der alten Theme waere dagegen ein Vergleich
// zweier Dinge auf einmal und wuerde der Vorlage zuschreiben, was die Felder
// getan haben.
export async function nur(themeName, ids = [], modus = "light") {
  aus();
  const stillgelegt = uixStilllegen();
  const { wirksam } = await parser();
  const m = await lese(await lies(themeName));
  if (m.fehler) throw new Error(m.fehler);
  const werte = wirksam(m, modus);

  let zahl = 0;
  for (const [k, v] of Object.entries(werte)) {
    if (k.startsWith("uix-") || k === "modes") continue;
    document.documentElement.style.setProperty("--" + k, v);
    GESETZT.push("--" + k);
    zahl++;
    if (typeof v === "string" && v.trim().startsWith("#") && werte["rgb-" + k] === undefined) {
      const h = v.trim().slice(1);
      const t = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
      if (/^[0-9a-f]{6}$/i.test(t)) {
        document.documentElement.style.setProperty("--rgb-" + k,
          [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16)).join(","));
        GESETZT.push("--rgb-" + k);
      }
    }
  }

  const bericht = {};
  for (const [ziel, finde] of Object.entries(WOHIN)) {
    const ganz = werte["uix-" + ziel];
    if (!ganz) continue;
    // Aus dem Feld nur die Bloecke der genannten Vorlagen herausschneiden.
    let css = "";
    for (const id of ids) {
      const re = new RegExp(`/\\* Glaswerk:${id}:START \\*/[\\s\\S]*?/\\* Glaswerk:${id}:ENDE \\*/`);
      const t = ganz.match(re);
      if (t) css += t[0] + "\n";
    }
    if (!css) continue;
    const wirte = finde();
    for (const w of wirte) {
      const st = document.createElement("style");
      st.setAttribute("data-glaswerk-vorschau", ziel);
      st.textContent = css;
      w.shadowRoot.appendChild(st);
      KNOTEN.push(st);
    }
    bericht[ziel] = wirte.length;
  }
  return { theme: m.name, modus, felder: zahl, vorlagen: ids, uix: bericht, stillgelegt };
}

// Nur eine einzelne Vorlage an- oder abschalten - fuer Vorher/Nachher.
export async function nurVorlage(themeName, vorlagenId, modus = "light") {
  const { wirksam } = await parser();
  const m = await lese(await lies(themeName));
  const werte = wirksam(m, modus);
  const re = new RegExp(`/\\* Glaswerk:${vorlagenId}:START \\*/[\\s\\S]*?/\\* Glaswerk:${vorlagenId}:ENDE \\*/`);
  for (const [k, v] of Object.entries(werte)) {
    if (!k.startsWith("uix-") || typeof v !== "string") continue;
    const t = v.match(re);
    if (t) return { ziel: k.slice(4), css: t[0] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Kontraste messen - an der gerenderten Seite, nicht an den Zahlen der Theme.
//
// Der Unterschied ist bei Glas entscheidend: Die Kartenflaeche ist
// durchscheinend, ihr wirksamer Ton haengt also davon ab, was dahinter liegt.
// Wer gegen --ha-card-background rechnet, rechnet gegen rgba(255,255,255,.32)
// und bekommt Unsinn.
//
//   await kontraste('liquid_glass')
//
// WCAG AA verlangt 4.5 : 1 fuer Text, 3 : 1 fuer grafische Objekte und grossen
// Text. In Glaswerk ist schon einmal die Seitenleiste auf 1.19 : 1 gefallen, ohne
// dass es jemandem auffiel - die Symbole waren schlicht weg.
function _lum(r, g, b) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function _farbe(s) {
  const t = String(s).trim();
  const h = t.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (h) return { r: parseInt(h[1], 16), g: parseInt(h[2], 16), b: parseInt(h[3], 16), a: 1 };
  const m = t.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const z = m[1].split(",").map((x) => parseFloat(x));
  return { r: z[0], g: z[1], b: z[2], a: z[3] === undefined ? 1 : z[3] };
}
function _ueber(vorn, hinten) {
  if (!vorn || !hinten) return null;
  const a = vorn.a === undefined ? 1 : vorn.a;
  return { r: vorn.r * a + hinten.r * (1 - a), g: vorn.g * a + hinten.g * (1 - a), b: vorn.b * a + hinten.b * (1 - a) };
}
function _k(a, b) {
  if (!a || !b) return null;
  const l1 = _lum(a.r, a.g, a.b), l2 = _lum(b.r, b.g, b.b);
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

export async function kontraste(themeName, grundHell = "#e6eeff", grundDunkel = "#0b1020") {
  const raus = {};
  for (const modus of ["light", "dark"]) {
    await an(themeName, modus);
    await new Promise((r) => setTimeout(r, 800));
    const cs = getComputedStyle(document.documentElement);
    const grund = _farbe(modus === "light" ? grundHell : grundDunkel);
    const flaeche = _ueber(_farbe(cs.getPropertyValue("--ha-card-background")), grund);
    const sb = _ueber(_farbe(cs.getPropertyValue("--sidebar-background-color")), grund);
    const paar = (name, auf) => _k(_ueber(_farbe(cs.getPropertyValue(name)), auf), auf);
    raus[modus] = {
      haupttext: paar("--primary-text-color", flaeche),
      nebentext: paar("--secondary-text-color", flaeche),
      akzent: paar("--accent-color", flaeche),
      sidebarText: paar("--sidebar-text-color", sb),
      sidebarIcon: paar("--sidebar-icon-color", sb),
    };
    raus[modus].durchgefallen = Object.entries(raus[modus])
      .filter(([k, v]) => typeof v === "number" && v < 4.5 && k !== "sidebarIcon")
      .map(([k, v]) => `${k} ${v}`);
  }
  aus();
  return raus;
}

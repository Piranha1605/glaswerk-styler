// HATS - Home Assistant Theme Studio
//
// Entwurf der Oberflaeche nach Vorlage des Nutzers (12.10.2026):
//   Hauptseite  - ruhig, hell, glaesern, eine Zeile je Stufe
//   Pop-up      - die Einstellungsseite, mehrspaltig und aufwendiger
//
// Zwei Entscheidungen stecken im Aufbau und sind kein Zufall:
//
// 1. DAS PANEL LIEST KEINE THEME-VARIABLEN. Es faerbt sich aus eigenen Werten
//    (--s-*). Sonst wechselt das Werkzeug sein Aussehen, waehrend man die Theme
//    bearbeitet, die es faerbt - bei einem dunklen Entwurf wird der Editor
//    unter den Haenden dunkel. Die bearbeitete Theme gehoert spaeter in einen
//    abgegrenzten Vorschaubereich, nirgendwo sonst.
//
// 2. DAS POP-UP IST KEIN KIND DER GLASFLAECHE. Ein backdrop-filter macht sein
//    Element zum Bezugsrahmen fuer alles, was darin position:fixed ist - daran
//    sind Bubble-Pop-ups schon auf Hoehe 0 geschrumpft und HA-Dialoge haben ihre
//    Auswahllisten neben den Bildschirm gelegt. .buehne und .overlay sind
//    deshalb Geschwister, nicht verschachtelt.
//
// Beschriftung bewusst durchnummeriert: die Namen kommen spaeter.

const HATS_VERSION = "0.2.0b1";

const STUFEN = [
  { n: 1, marke: "#7bd14a", stand: "fertig" },
  { n: 2, marke: "#7bd14a", stand: "fertig" },
  { n: 3, marke: "#f0a23c", stand: "offen" },
  { n: 4, marke: "#f0a23c", stand: "offen" },
  { n: 5, marke: "#c2c8d2", stand: "wartet" },
  { n: 6, marke: "#c2c8d2", stand: "wartet" },
  { n: 7, marke: "#c2c8d2", stand: "wartet" },
  { n: 8, marke: "#c2c8d2", stand: "wartet" },
];

const STAND_TEXT = { fertig: "Fertig", offen: "In Arbeit", wartet: "Offen" };

// Die Spalten einer Einstellungsseite. Vier Stueck, wie in der Vorlage.
const GRUPPEN = [1, 2, 3, 4];
const ZUSTAENDE = ["fertig", "arbeit", "pruefen", "offen"];
const ZUSTAND_TEXT = { fertig: "FERTIG", arbeit: "IN ARBEIT", pruefen: "PRUEFEN", offen: "OFFEN" };

const TEXTE = {
  en: {
    "Guten Tag": "Good afternoon",
    "Dein Theme im Überblick": "Your theme at a glance",
    "Stufen fertig": "stages done",
    "brauchen noch Arbeit": "still need work",
    "Stufe": "Stage",
    "Gruppe": "Group",
    "Feld": "Field",
    "Fertig": "Done", "In Arbeit": "In progress", "Offen": "Open",
    "FERTIG": "DONE", "IN ARBEIT": "PROGRESS", "PRUEFEN": "REVIEW", "OFFEN": "TO DO",
    "Einstellungen öffnen": "Open settings",
    "Schließen": "Close",
    "Felder": "fields",
    "zuletzt geändert": "last changed",
    "gerade eben": "just now",
    "Entwurf": "Draft",
  },
};
const t = (s, spr) => (TEXTE[spr] && TEXTE[spr][s]) || s;

class HatsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._offen = null;
    this._gezeichnet = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._gezeichnet) { this._gezeichnet = true; this.zeichne(); }
  }

  get spr() {
    const s = (this._hass && this._hass.language) || "de";
    return s.startsWith("en") ? "en" : "de";
  }

  zeichne() {
    const T = (s) => t(s, this.spr);
    const fertig = STUFEN.filter((s) => s.stand === "fertig").length;
    const offen = STUFEN.length - fertig;

    this.shadowRoot.innerHTML = `
      <style>${this.stil()}</style>
      <div class="buehne">
        <div class="wolke a"></div><div class="wolke b"></div>
        <div class="fenster">
          <nav class="rail">
            <div class="marke"></div>
            <button class="railknopf an" title="1"></button>
            <button class="railknopf" title="2"></button>
            <button class="railknopf" title="3"></button>
            <div class="railfuss"></div>
          </nav>
          <section class="inhalt">
            <header class="kopf">
              <div>
                <h1>${T("Guten Tag")}</h1>
                <p>${T("Dein Theme im Überblick")}</p>
              </div>
              <div class="hinweis">
                <b>${offen} ${T("Stufe")}${offen === 1 ? "" : "n"}</b>
                <span>${T("brauchen noch Arbeit")}</span>
              </div>
            </header>

            <div class="kennzahlen">
              <div class="kennzahl"><b>${fertig}/${STUFEN.length}</b><span>${T("Stufen fertig")}</span></div>
              <div class="kennzahl"><b>${GRUPPEN.length * 6}</b><span>${T("Felder")}</span></div>
              <div class="kennzahl"><b>${T("gerade eben")}</b><span>${T("zuletzt geändert")}</span></div>
            </div>

            <div class="liste">
              ${STUFEN.map((s, i) => this.zeile(s, i, T)).join("")}
            </div>
          </section>
        </div>
      </div>

      <div class="overlay" hidden>
        <div class="schleier"></div>
        <div class="dialog" role="dialog" aria-modal="true"></div>
      </div>
    `;

    this.shadowRoot.querySelectorAll(".punkte").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); this.oeffne(Number(b.dataset.stufe)); })
    );
    this.shadowRoot.querySelectorAll(".zeile").forEach((z) =>
      z.addEventListener("click", () => this.oeffne(Number(z.dataset.stufe)))
    );
    this.shadowRoot.querySelector(".schleier").addEventListener("click", () => this.schliesse());
    this._esc = (e) => { if (e.key === "Escape") this.schliesse(); };
  }

  zeile(s, i, T) {
    const letzte = i === STUFEN.length - 1;
    return `
      <div class="zeile" data-stufe="${s.n}">
        <div class="spur">
          <span class="punkt ${s.stand}"></span>
          ${letzte ? "" : '<span class="faden"></span>'}
        </div>
        <span class="balken" style="background:${s.marke}"></span>
        <div class="text">
          <b>${T("Stufe")} ${s.n}</b>
          <span>${T("Stufe")} ${s.n} — ${GRUPPEN.length} ${T("Gruppe")}n, ${GRUPPEN.length * 6} ${T("Felder")}</span>
        </div>
        <span class="stand ${s.stand}">${T(STAND_TEXT[s.stand])}</span>
        <button class="punkte" data-stufe="${s.n}" title="${T("Einstellungen öffnen")}" aria-label="${T("Einstellungen öffnen")}">
          <span></span><span></span><span></span>
        </button>
      </div>`;
  }

  // ---- Pop-up: die Einstellungsseite, Vorlage Bild 1 ----
  oeffne(nr) {
    const T = (s) => t(s, this.spr);
    this._offen = nr;
    const d = this.shadowRoot.querySelector(".dialog");
    d.innerHTML = `
      <header class="dkopf">
        <div>
          <h2>${T("Stufe")} ${nr}</h2>
          <p>${GRUPPEN.length} ${T("Gruppe")}n · ${GRUPPEN.length * 6} ${T("Felder")}</p>
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="brett">
        ${GRUPPEN.map((g) => this.spalte(nr, g, T)).join("")}
      </div>`;
    d.querySelector(".zu").addEventListener("click", () => this.schliesse());
    const o = this.shadowRoot.querySelector(".overlay");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
    document.addEventListener("keydown", this._esc);
  }

  spalte(nr, g, T) {
    const karten = [];
    for (let k = 1; k <= 6; k++) {
      const z = ZUSTAENDE[(g + k) % ZUSTAENDE.length];
      // Eine Kachel je Spalte steht fuer eine Vorschau - in der Vorlage das
      // Mood-Board. Spaeter die Farbprobe der Stufe.
      if (k === 3) { karten.push(`<div class="kachel" style="background:${this.verlauf(nr, g)}"></div>`); continue; }
      karten.push(`
        <article class="karte">
          <b>${T("Feld")} ${g}.${k}</b>
          <p>${T("Feld")} ${g}.${k} — ${T("Entwurf")}</p>
          <div class="fuss">
            <span class="badge ${z}">${T(ZUSTAND_TEXT[z])}</span>
            <span class="probe" style="background:${this.probe(nr, g, k)}"></span>
            <span class="wert">#${(nr * 100 + g * 10 + k).toString(16).padStart(4, "0")}</span>
          </div>
        </article>`);
    }
    return `
      <section class="spalte">
        <header>
          <div><b>${T("Gruppe")} ${g}</b><span>6 ${T("Felder")}</span></div>
          <button class="punkte klein"><span></span><span></span><span></span></button>
        </header>
        ${karten.join("")}
      </section>`;
  }

  verlauf(nr, g) {
    const a = (nr * 47 + g * 61) % 360;
    return `linear-gradient(135deg, hsl(${a} 85% 68%), hsl(${(a + 48) % 360} 88% 62%), hsl(${(a + 96) % 360} 80% 70%))`;
  }
  probe(nr, g, k) {
    return `hsl(${(nr * 47 + g * 61 + k * 9) % 360} 70% 62%)`;
  }

  schliesse() {
    const o = this.shadowRoot.querySelector(".overlay");
    if (!o || o.hidden) return;
    o.classList.remove("da");
    document.removeEventListener("keydown", this._esc);
    setTimeout(() => { o.hidden = true; }, 180);
    this._offen = null;
  }

  stil() {
    return `
      :host {
        /* Eigene Werte. Bewusst KEINE Theme-Variablen - siehe Kopf der Datei. */
        --s-tinte: #1b2430;
        --s-tinte-leise: #64707f;
        --s-glas: rgba(255,255,255,.52);
        --s-glas-innen: rgba(255,255,255,.72);
        --s-karte: #ffffff;
        --s-kante: rgba(255,255,255,.75);
        --s-linie: rgba(27,36,48,.10);
        --s-schatten: 0 24px 60px rgba(26,44,74,.22);
        --s-schatten-klein: 0 2px 6px rgba(26,44,74,.08);
        --s-r-gross: 22px;
        --s-r: 14px;
        --s-r-klein: 10px;
        /* Ein Wert fuer alle vier Seiten - links, rechts, oben, unten gleich. */
        --s-rand: 24px;
        /* 100vh, nicht 100%: die Kette hats-panel -> ha-panel-custom ->
           partial-panel-resolver traegt KEINE Hoehe (alle 0, gemessen am
           12.10.2026), erst ha-drawer hat eine. Mit 100% faellt die ganze
           Flaeche auf 0 zusammen; ohne position:relative haengt sich .buehne
           stattdessen an einen Vorfahren weiter oben und wird zu breit. */
        display: block; height: 100vh; overflow: hidden;
        font-family: "Segoe UI", Inter, Roboto, system-ui, sans-serif;
        color: var(--s-tinte);

        /* Ohne position bezieht sich das absolut gesetzte .buehne auf einen
           Vorfahren ausserhalb des Panels: die Flaeche wird breiter als das
           Panel, der Rand erscheint ungleich und die Leiste rutscht nach links. */
        position: relative;
      }
      *, *::before, *::after { box-sizing: border-box; }

      /* ---- Hintergrund und Glasfenster ---- */
      .buehne {
        position: absolute; inset: 0; overflow: auto; padding: var(--s-rand);
        background: linear-gradient(160deg, #dcebfb 0%, #b9d6f4 45%, #8fbdea 100%);
      }
      .wolke { position: fixed; border-radius: 50%; filter: blur(70px); opacity: .55; pointer-events: none; }
      .wolke.a { width: 520px; height: 420px; left: -120px; bottom: -140px; background: #4f9df0; }
      .wolke.b { width: 460px; height: 380px; right: -100px; top: -120px; background: #7fd8f7; }

      .fenster {
        position: relative; display: flex; gap: 0; min-height: 100%;
        border-radius: var(--s-r-gross); overflow: hidden;
        background: var(--s-glas);
        -webkit-backdrop-filter: blur(30px) saturate(1.6);
        backdrop-filter: blur(30px) saturate(1.6);
        box-shadow: var(--s-schatten), inset 0 1px 0 var(--s-kante);
      }

      .rail {
        width: 72px; flex: none; display: flex; flex-direction: column; align-items: center;
        gap: 14px; padding: 18px 0; background: rgba(255,255,255,.18);
        border-right: 1px solid rgba(255,255,255,.35);
      }
      .marke { width: 44px; height: 44px; border-radius: 13px; margin-bottom: 10px;
               background: linear-gradient(145deg, #c6f24d, #8fd92a); box-shadow: var(--s-schatten-klein); }
      .railknopf { width: 38px; height: 38px; border: 0; border-radius: 12px; cursor: pointer;
                   background: rgba(255,255,255,.35); }
      .railknopf.an { background: rgba(255,255,255,.85); box-shadow: var(--s-schatten-klein); }
      .railfuss { margin-top: auto; width: 30px; height: 30px; border-radius: 50%; background: rgba(27,36,48,.55); }

      .inhalt { flex: 1; min-width: 0; padding: 26px 30px 30px; }

      .kopf { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
      .kopf h1 { margin: 0; font-size: 30px; line-height: 1.15; letter-spacing: -.02em; }
      .kopf p  { margin: 4px 0 0; color: var(--s-tinte-leise); font-size: 14px; }
      .hinweis { border-left: 3px solid #7bd14a; padding-left: 12px; }
      .hinweis b { display: block; font-size: 15px; }
      .hinweis span { color: var(--s-tinte-leise); font-size: 13px; }

      .kennzahlen { display: flex; gap: 14px; margin: 22px 0 18px; flex-wrap: wrap; }
      .kennzahl { flex: 1 1 180px; display: flex; align-items: center; gap: 12px;
                  padding: 10px 14px; border-radius: var(--s-r);
                  background: rgba(255,255,255,.34); border: 1px solid rgba(255,255,255,.5); }
      .kennzahl b { background: #fff; border-radius: 999px; padding: 7px 14px; font-size: 14px;
                    box-shadow: var(--s-schatten-klein); white-space: nowrap; }
      .kennzahl span { color: var(--s-tinte-leise); font-size: 12px; line-height: 1.3; text-transform: uppercase;
                       letter-spacing: .04em; }

      /* ---- Die Stufenliste ---- */
      .liste { border-radius: var(--s-r-gross); background: var(--s-glas-innen); padding: 10px;
               box-shadow: inset 0 1px 0 var(--s-kante); }
      .zeile { position: relative; display: flex; align-items: center; gap: 14px;
               padding: 14px 16px; border-radius: var(--s-r); cursor: pointer;
               transition: background .18s ease, box-shadow .18s ease; }
      .zeile:hover { background: #fff; box-shadow: var(--s-schatten-klein); }
      .spur { position: relative; width: 14px; flex: none; align-self: stretch; display: flex;
              align-items: center; justify-content: center; }
      .punkt { width: 9px; height: 9px; border-radius: 50%; background: #fff;
               box-shadow: 0 0 0 2px #c2c8d2; z-index: 1; }
      .punkt.fertig { box-shadow: 0 0 0 2px #7bd14a; }
      .punkt.offen  { box-shadow: 0 0 0 2px #f0a23c; }
      .faden { position: absolute; top: 50%; bottom: -14px; width: 1px; background: var(--s-linie); }
      .balken { width: 3px; align-self: stretch; min-height: 34px; border-radius: 2px; flex: none; }
      .text { flex: 1; min-width: 0; }
      .text b { display: block; font-size: 15px; }
      .text span { color: var(--s-tinte-leise); font-size: 13px; }
      .stand { font-size: 12px; padding: 5px 11px; border-radius: 999px; white-space: nowrap;
               background: rgba(27,36,48,.06); color: var(--s-tinte-leise); }
      .stand.fertig { background: rgba(123,209,74,.18); color: #3c7a1d; }
      .stand.offen  { background: rgba(240,162,60,.18); color: #96570a; }

      .punkte { display: flex; gap: 3px; align-items: center; justify-content: center;
                width: 32px; height: 32px; border: 0; border-radius: 50%; cursor: pointer;
                background: transparent; opacity: 0; transition: opacity .18s ease, background .18s ease; }
      .zeile:hover .punkte { opacity: 1; background: rgba(27,36,48,.06); }
      .punkte:hover { background: rgba(27,36,48,.12) !important; }
      .punkte span { width: 3.5px; height: 3.5px; border-radius: 50%; background: var(--s-tinte-leise); }
      .punkte.klein { opacity: 1; width: 26px; height: 26px; }

      /* ---- Pop-up: Geschwister von .buehne, damit kein backdrop-filter darueber liegt ---- */
      .overlay { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 24px; }
      .overlay[hidden] { display: none; }
      .schleier { position: absolute; inset: 0; background: rgba(16,28,45,.38); opacity: 0;
                  transition: opacity .18s ease; }
      .overlay.da .schleier { opacity: 1; }
      .dialog { position: relative; width: min(1180px, 100%); max-height: 100%; overflow: auto;
                border-radius: var(--s-r-gross); background: #f7f8fb;
                box-shadow: 0 40px 90px rgba(10,22,40,.42);
                transform: translateY(10px) scale(.985); opacity: 0;
                transition: transform .2s ease, opacity .2s ease; }
      .overlay.da .dialog { transform: none; opacity: 1; }

      .dkopf { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between;
               gap: 16px; padding: 22px 26px 16px; background: #f7f8fb; border-bottom: 1px solid var(--s-linie); }
      .dkopf h2 { margin: 0; font-size: 22px; letter-spacing: -.01em; }
      .dkopf p { margin: 3px 0 0; color: var(--s-tinte-leise); font-size: 13px; }
      .zu { width: 34px; height: 34px; border: 0; border-radius: 50%; cursor: pointer; font-size: 15px;
            background: rgba(27,36,48,.06); color: var(--s-tinte-leise); }
      .zu:hover { background: rgba(27,36,48,.12); }

      .brett { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
               gap: 16px; padding: 18px 26px 26px; align-items: start; }
      .spalte { display: flex; flex-direction: column; gap: 10px; }
      .spalte > header { display: flex; align-items: center; justify-content: space-between;
                         padding: 2px 4px 6px; }
      .spalte > header b { display: block; font-size: 14px; }
      .spalte > header span { color: var(--s-tinte-leise); font-size: 12px; }

      .karte { background: var(--s-karte); border-radius: var(--s-r); padding: 12px 13px;
               box-shadow: var(--s-schatten-klein); border: 1px solid rgba(27,36,48,.05); }
      .karte b { display: block; font-size: 13.5px; margin-bottom: 3px; }
      .karte p { margin: 0 0 10px; color: var(--s-tinte-leise); font-size: 12.5px; line-height: 1.45; }
      .fuss { display: flex; align-items: center; gap: 8px; }
      .badge { font-size: 10px; font-weight: 700; letter-spacing: .04em; padding: 3px 7px; border-radius: 5px; }
      .badge.fertig { background: #d8f5d3; color: #2f6b22; }
      .badge.arbeit { background: #ffe2c9; color: #a2561a; }
      .badge.pruefen { background: #e7ddfb; color: #5b3aa8; }
      .badge.offen  { background: #e8eaef; color: #5c6775; }
      .probe { width: 15px; height: 15px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
      .wert { margin-left: auto; font-size: 11px; color: var(--s-tinte-leise);
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

      .kachel { height: 128px; border-radius: var(--s-r); box-shadow: var(--s-schatten-klein); }

      /* Schmal: die Leiste wird waagerecht und rueckt ueber den Inhalt.
         Sie verschwindet NICHT - eine ausgeblendete Leiste ohne Ersatz macht
         ihre Knoepfe unerreichbar. Der Rand bleibt auf allen vier Seiten
         gleich, nur kleiner. */
      @media (max-width: 760px) {
        :host { --s-rand: 12px; }
        .fenster { flex-direction: column; }
        .rail {
          width: auto; flex-direction: row; align-items: center;
          gap: 10px; padding: 10px 14px;
          border-right: 0; border-bottom: 1px solid rgba(255,255,255,.35);
        }
        .marke { width: 34px; height: 34px; border-radius: 10px; margin-bottom: 0; }
        .railknopf { width: 34px; height: 34px; }
        .railfuss { margin-top: 0; margin-left: auto; }
        .inhalt { padding: 18px; }
        .kopf { flex-direction: column; gap: 12px; }
        .kopf h1 { font-size: 24px; }
        .kennzahlen { gap: 10px; }
        .kennzahl { flex: 1 1 100%; }
        .zeile { gap: 10px; padding: 12px; }
        .punkte { opacity: 1; background: rgba(27,36,48,.06); }
      }
    `;
  }
}

if (!customElements.get("hats-panel")) customElements.define("hats-panel", HatsPanel);

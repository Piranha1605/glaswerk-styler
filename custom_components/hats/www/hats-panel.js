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

// Die acht Stufen sind ein Weg, kein Menue: von der leeren Datei bis zur
// geschriebenen Theme. Jede Stufe setzt auf der vorigen auf - wer Stufe 1
// aendert, verschiebt alles darueber, weil Home Assistant den Rest ableitet.
//
// Ein Feld traegt entweder `v` (eine CSS-Variable, deren aktueller Wert
// angezeigt wird) oder `w` (ein fester Text). Was hier steht, ist die
// Gliederung; das Schreiben in die Theme kommt im naechsten Schritt.
const STUFEN = [
  { n: 1, titel: "Grundlagen", kurz: "Name, Grundlage, Akzent, Textfarben, Schrift",
    marke: "#7bd14a", stand: "offen", gruppen: [
      { name: "Start", felder: [
        { t: "Name der Theme", w: "noch offen" },
        { t: "Grundlage", w: "ha_blanko" },
        { t: "Modus", w: "hell und dunkel" } ] },
      { name: "Farben", felder: [
        { t: "Akzent", v: "--ha-color-primary-40" },
        { t: "Neutral", v: "--ha-color-neutral-40" },
        { t: "Erfolg", v: "--ha-color-green-50" },
        { t: "Warnung", v: "--ha-color-orange-70" },
        { t: "Fehler", v: "--ha-color-red-50" } ] },
      { name: "Textfarben", felder: [
        { t: "Primaer", v: "--ha-color-text-primary" },
        { t: "Sekundaer", v: "--ha-color-text-secondary" },
        { t: "Deaktiviert", v: "--ha-color-text-disabled" },
        { t: "Link", v: "--ha-color-text-link" } ] },
      { name: "Schrift", felder: [
        { t: "Schriftart", v: "--ha-font-family-body" },
        { t: "Code", v: "--ha-font-family-code" },
        { t: "Groesse", v: "--ha-font-size-scale" },
        { t: "Zeilenhoehe", v: "--ha-line-height-normal" } ] },
    ] },

  { n: 2, titel: "Flaechen", kurz: "Hintergrund, Karten, Dialoge, Leisten",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Grundflaechen", felder: [
        { t: "Oberflaeche", v: "--ha-color-surface-default" },
        { t: "Eine Stufe tiefer", v: "--ha-color-surface-low" },
        { t: "Zwei Stufen tiefer", v: "--ha-color-surface-lower" } ] },
      { name: "Karten", felder: [
        { t: "Kartenflaeche", v: "--ha-card-background" },
        { t: "Weichzeichnung", v: "--ha-card-backdrop-filter" } ] },
      { name: "Dialoge", felder: [
        { t: "Dialogflaeche", v: "--ha-dialog-surface-background" },
        { t: "Abdunkelung", v: "--ha-dialog-scrim-color" } ] },
      { name: "Leisten", felder: [
        { t: "Seitenleiste", v: "--sidebar-background-color" },
        { t: "Kopfleiste", v: "--app-header-background-color" } ] },
    ] },

  { n: 3, titel: "Form", kurz: "Rundung, Rahmen, Abstaende, Schatten",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Rundung", felder: [
        { t: "Klein", v: "--ha-border-radius-sm" },
        { t: "Mittel", v: "--ha-border-radius-md" },
        { t: "Gross", v: "--ha-border-radius-lg" },
        { t: "Karten", v: "--ha-border-radius-xl" } ] },
      { name: "Rahmen", felder: [
        { t: "Breite", v: "--ha-border-width-sm" },
        { t: "Ruhig", v: "--ha-color-border-neutral-quiet" },
        { t: "Deutlich", v: "--ha-color-border-neutral-normal" } ] },
      { name: "Abstaende", felder: [
        { t: "Eng", v: "--ha-space-2" },
        { t: "Normal", v: "--ha-space-4" },
        { t: "Weit", v: "--ha-space-6" } ] },
      { name: "Schatten", felder: [
        { t: "Klein", v: "--ha-box-shadow-s" },
        { t: "Mittel", v: "--ha-box-shadow-m" },
        { t: "Gross", v: "--ha-box-shadow-l" } ] },
    ] },

  { n: 4, titel: "Zustaende", kurz: "Lautstaerken, Ueberfahren, Druecken",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Leise", felder: [
        { t: "Ruhend", v: "--ha-color-fill-primary-quiet-resting" },
        { t: "Ueberfahren", v: "--ha-color-fill-primary-quiet-hover" } ] },
      { name: "Normal", felder: [
        { t: "Ruhend", v: "--ha-color-fill-primary-normal-resting" },
        { t: "Ueberfahren", v: "--ha-color-fill-primary-normal-hover" },
        { t: "Schrift darauf", v: "--ha-color-on-primary-normal" } ] },
      { name: "Laut", felder: [
        { t: "Ruhend", v: "--ha-color-fill-primary-loud-resting" },
        { t: "Ueberfahren", v: "--ha-color-fill-primary-loud-hover" },
        { t: "Schrift darauf", v: "--ha-color-on-primary-loud" } ] },
      { name: "Rueckmeldung", felder: [
        { t: "Klick-Welle", v: "--ha-ripple-color" },
        { t: "Dauer", v: "--ha-animation-duration-fast" } ] },
    ] },

  { n: 5, titel: "Symbole", kurz: "Form, Groesse, Zustandsfarben",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Form", felder: [
        { t: "Kachel", v: "--ha-tile-icon-border-radius" },
        { t: "Abzeichen", v: "--state-badge-border-radius" },
        { t: "Mushroom", v: "--mush-icon-border-radius" } ] },
      { name: "Groesse", felder: [
        { t: "Symbolgroesse", v: "--mdc-icon-size" },
        { t: "Knopfgroesse", v: "--ha-icon-button-size" } ] },
      { name: "Zustand", felder: [
        { t: "Aktiv", v: "--state-active-color" },
        { t: "Inaktiv", v: "--state-inactive-color" },
        { t: "Symbolfarbe", v: "--state-icon-color" } ] },
      { name: "Toene", felder: [
        { t: "Gelb", v: "--yellow-color" },
        { t: "Tuerkis", v: "--teal-color" },
        { t: "Violett", v: "--purple-color" },
        { t: "Bernstein", v: "--amber-color" } ] },
    ] },

  { n: 6, titel: "Fremde Karten", kurz: "Bubble Card und Mushroom anbinden",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Bubble Flaechen", felder: [
        { t: "Karte", v: "--bubble-main-background-color" },
        { t: "Knopf", v: "--bubble-button-background-color" },
        { t: "Pop-up", v: "--bubble-pop-up-main-background-color" } ] },
      { name: "Bubble Zustand", felder: [
        { t: "Akzent", v: "--bubble-accent-color" },
        { t: "Licht", v: "--bubble-light-color" },
        { t: "Symbol", v: "--bubble-icon-color" } ] },
      { name: "Mushroom Tripel", felder: [
        { t: "Rot", v: "--mush-rgb-red" },
        { t: "Gruen", v: "--mush-rgb-green" },
        { t: "Orange", v: "--mush-rgb-orange" },
        { t: "Blau", v: "--mush-rgb-blue" } ] },
      { name: "Mushroom Masse", felder: [
        { t: "Symbol", v: "--mush-icon-size" },
        { t: "Chip", v: "--mush-chip-height" },
        { t: "Abstand", v: "--mush-spacing" } ] },
    ] },

  { n: 7, titel: "Feinschliff", kurz: "Karte, Diagramme, Code-Editor, Glas",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Vektorkarte", felder: [
        { t: "Land", v: "--ha-color-map-land" },
        { t: "Wasser", v: "--ha-color-map-water" },
        { t: "Strassen", v: "--ha-color-map-road" } ] },
      { name: "Diagramme", felder: [
        { t: "Erste Reihe", v: "--color-1" },
        { t: "Zweite Reihe", v: "--color-2" },
        { t: "Dritte Reihe", v: "--color-3" } ] },
      { name: "Code-Editor", felder: [
        { t: "Schluesselwort", v: "--codemirror-keyword" },
        { t: "Zeichenkette", v: "--codemirror-string" },
        { t: "Kommentar", v: "--codemirror-comment" } ] },
      { name: "Glas", felder: [
        { t: "Weichzeichnung", v: "--ha-card-backdrop-filter" },
        { t: "Kopfleiste", v: "--app-header-backdrop-filter" } ] },
    ] },

  { n: 8, titel: "Ausgabe", kurz: "Pruefen, Bericht, Theme schreiben",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Pruefen", felder: [
        { t: "YAML gueltig", w: "noch nicht geprueft" },
        { t: "Zweiter Durchlauf gleich", w: "noch nicht geprueft" },
        { t: "Verweise ins Leere", w: "noch nicht geprueft" } ] },
      { name: "Bericht", felder: [
        { t: "Geaenderte Felder", w: "0" },
        { t: "Entfernte Felder", w: "0" } ] },
      { name: "Schreiben", felder: [
        { t: "Dateiname", w: "noch offen" },
        { t: "Ziel", w: "config/themes" } ] },
      { name: "Sicherung", felder: [
        { t: "Vorheriger Stand", w: "wird vor dem Schreiben gesichert" } ] },
    ] },
];

// Wofuer jede Gruppe da ist - eine Zeile, damit man beim Oeffnen nicht raten
// muss, was ein Feld bewirkt. Steht als Trenner ueber den Karten der Gruppe.
const ZWECK = {
  "Start": "Wie die Theme heisst und worauf sie aufsetzt",
  "Farben": "Die fuenf Rollen. HA rechnet daraus 51 Flaechen und 19 Schriftfarben",
  "Textfarben": "Schrift auf ruhigem Grund, in vier Abstufungen",
  "Schrift": "Schriftart und Groessenskala fuer die ganze Oberflaeche",

  "Grundflaechen": "Die drei Ebenen, auf denen alles liegt",
  "Karten": "Flaeche und Weichzeichnung jeder Karte",
  "Dialoge": "Fenster, die sich ueber das Dashboard legen",
  "Leisten": "Seitenleiste und Kopfleiste",

  "Rundung": "Wie weich die Ecken sind, von klein bis Karte",
  "Rahmen": "Breite und Farbe der Kanten",
  "Abstaende": "Luft zwischen den Dingen",
  "Schatten": "Tiefe in drei Stufen, je Modus verschieden",

  "Leise": "Kaum sichtbare Flaeche, etwa hinter einem Eintrag",
  "Normal": "Die uebliche gefuellte Flaeche",
  "Laut": "Der kraeftige Knopf, der auffallen soll",
  "Rueckmeldung": "Was passiert, wenn man drueckt",

  "Form": "Rund, Pille oder Kachel - gilt fuer alle Symbolbehaelter",
  "Groesse": "Wie gross Symbole und Symbolknoepfe sind",
  "Zustand": "Farben fuer an, aus und dazwischen",
  "Toene": "Die klassischen Farbtoene. HAs neue Ebene hat nur fuenf",

  "Bubble Flaechen": "Worauf Bubble Card seine Flaechen zeigt",
  "Bubble Zustand": "Akzent, Licht und Symbolfarbe bei Bubble",
  "Mushroom Tripel": "Mushroom rechnet mit RGB-Tripeln, nicht mit Farben",
  "Mushroom Masse": "Groessen und Abstaende bei Mushroom",

  "Vektorkarte": "Die vierzehn Tokens der Karte in HA 2026.10",
  "Diagramme": "Die Reihenfolge der Linienfarben",
  "Code-Editor": "Syntaxfarben im YAML-Editor",
  "Glas": "Weichzeichnung hinter Karten und Kopfleiste",

  "Pruefen": "Laeuft die Datei durch, und zweimal gleich?",
  "Bericht": "Was sich gegenueber dem letzten Stand geaendert hat",
  "Schreiben": "Wohin die fertige Theme geht",
  "Sicherung": "Der Stand davor, falls etwas schiefgeht",
};

const STAND_TEXT = { fertig: "Fertig", offen: "In Arbeit", wartet: "Offen" };

const felderZahl = (st) => st.gruppen.reduce((n, g) => n + g.felder.length, 0);
const felderGesamt = STUFEN.reduce((n, st) => n + felderZahl(st), 0);

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
    "Gruppen": "groups",
    "Angabe": "value",
    "nicht gesetzt": "not set",
    "Grundlagen": "Basics", "Flaechen": "Surfaces", "Form": "Shape",
    "Zustaende": "States", "Symbole": "Icons", "Fremde Karten": "Third-party cards",
    "Feinschliff": "Polish", "Ausgabe": "Output",
    "Name, Grundlage, Akzent, Textfarben, Schrift": "Name, base, accent, text colours, font",
    "Hintergrund, Karten, Dialoge, Leisten": "Background, cards, dialogs, bars",
    "Rundung, Rahmen, Abstaende, Schatten": "Radius, borders, spacing, shadows",
    "Lautstaerken, Ueberfahren, Druecken": "Loudness, hover, press",
    "Form, Groesse, Zustandsfarben": "Shape, size, state colours",
    "Bubble Card und Mushroom anbinden": "Wire up Bubble Card and Mushroom",
    "Karte, Diagramme, Code-Editor, Glas": "Map, charts, code editor, glass",
    "Pruefen, Bericht, Theme schreiben": "Check, report, write the theme",
    "Start": "Start", "Farben": "Colours", "Textfarben": "Text colours", "Schrift": "Font",
    "Name der Theme": "Theme name", "Grundlage": "Base", "Modus": "Mode",
    "Akzent": "Accent", "Neutral": "Neutral", "Erfolg": "Success",
    "Warnung": "Warning", "Fehler": "Error",
    "Primaer": "Primary", "Sekundaer": "Secondary", "Deaktiviert": "Disabled", "Link": "Link",
    "Schriftart": "Font family", "Code": "Code", "Groesse": "Size", "Zeilenhoehe": "Line height",
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
              <div class="kennzahl"><b>${felderGesamt}</b><span>${T("Felder")}</span></div>
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
          <b>${s.n}. ${T(s.titel)}</b>
          <span>${T(s.kurz)} — ${s.gruppen.length} ${T("Gruppen")}, ${felderZahl(s)} ${T("Felder")}</span>
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
    const st = STUFEN.find((x) => x.n === nr);
    if (!st) return;
    this._offen = nr;
    const d = this.shadowRoot.querySelector(".dialog");
    d.innerHTML = `
      <header class="dkopf">
        <div>
          <h2>${st.n}. ${T(st.titel)}</h2>
          <p>${T(st.kurz)} · ${st.gruppen.length} ${T("Gruppen")} · ${felderZahl(st)} ${T("Felder")}</p>
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="brett">
        ${st.gruppen.map((g, i) => this.gruppe(st, g, i, T)).join("")}
      </div>`;
    d.querySelector(".zu").addEventListener("click", () => this.schliesse());
    const o = this.shadowRoot.querySelector(".overlay");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
    document.addEventListener("keydown", this._esc);
  }

  // Den aktuellen Wert einer Variablen zeigen, nicht einen erfundenen. Was
  // Home Assistant gerade liefert, steht in getComputedStyle - das Theme-Objekt
  // beweist nichts, nur das Berechnete kommt wirklich an.
  wert(f) {
    if (f.w !== undefined) return { text: f.w, farbe: null };
    const v = getComputedStyle(document.documentElement).getPropertyValue(f.v).trim();
    if (!v) return { text: "nicht gesetzt", farbe: null, leer: true };
    const istFarbe = /^#|^rgba?\(|^hsla?\(|^color\(/.test(v);
    return { text: v.length > 28 ? v.slice(0, 27) + "…" : v, farbe: istFarbe ? v : null };
  }

  gruppe(st, g, i, T) {
    const zeilen = g.felder.map((f) => {
      const w = this.wert(f);
      return `
        <div class="feld">
          <div class="feldtext">
            <b>${T(f.t)}</b>
            <span>${f.v ? f.v : T("Angabe")}</span>
          </div>
          ${w.farbe ? `<span class="probe" style="background:${w.farbe}"></span>` : ""}
          <span class="wert ${w.leer ? "leer" : ""}">${w.text}</span>
        </div>`;
    }).join("");
    // Die Farben der Gruppe als schmale Reihe neben der Ueberschrift - in der
    // Vorlage war das die grosse Kachel, in einer Liste reicht ein Streifen.
    const toene = g.felder.map((f) => this.wert(f).farbe).filter(Boolean).slice(0, 6);
    const streifen = toene.map((c) => `<span class="tupfer" style="background:${c}"></span>`).join("");
    return `
      <section class="gruppe">
        <header>
          <div class="gtitel"><b>${T(g.name)}</b><span>${g.felder.length} ${T("Felder")}</span></div>
          <div class="streifen">${streifen}</div>
          <button class="punkte klein"><span></span><span></span><span></span></button>
        </header>
        <p class="zweck">${T(ZWECK[g.name] || "")}</p>
        <div class="feldliste">${zeilen}</div>
      </section>`;
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

      /* Listenansicht statt Kartenbrett: eine Gruppe untereinander, in
         derselben Sprache wie die Stufenliste der Hauptseite. */
      .brett { display: flex; flex-direction: column; gap: 22px; padding: 18px 26px 26px; }

      .gruppe > header { display: flex; align-items: center; gap: 12px; padding: 0 4px 2px; }
      .gtitel { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
      .gtitel b { font-size: 15px; }
      .gtitel span { color: var(--s-tinte-leise); font-size: 12px; white-space: nowrap; }
      .streifen { display: flex; gap: 4px; margin-left: auto; }
      .tupfer { width: 14px; height: 14px; border-radius: 4px;
                box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }

      .feldliste { border-radius: var(--s-r); background: var(--s-karte); padding: 6px;
                   box-shadow: var(--s-schatten-klein); border: 1px solid rgba(27,36,48,.05); }
      .feld { display: flex; align-items: center; gap: 12px; padding: 10px 12px;
              border-radius: var(--s-r-klein); transition: background .15s ease; }
      .feld:hover { background: rgba(27,36,48,.04); }
      .feld + .feld { box-shadow: inset 0 1px 0 var(--s-linie); }
      .feldtext { flex: 1; min-width: 0; }
      .feldtext b { display: block; font-size: 13.5px; }
      .feldtext span { font-size: 11.5px; color: var(--s-tinte-leise);
                       font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .probe { width: 18px; height: 18px; border-radius: 6px; flex: none;
               box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
      .wert { min-width: 108px; text-align: right; font-size: 12px; color: var(--s-tinte-leise);
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* Ein leeres Feld ist eine Aussage, kein Fehler: Home Assistant setzt es
         in diesem Modus nicht. Deshalb kursiv und blass, nicht rot. */
      .wert.leer { font-style: italic; opacity: .6; }

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

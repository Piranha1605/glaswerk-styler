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

import { fuerFeld, binde, infostreifen } from "./bedienelemente.js";
import { rampe, STUFEN as PALETTENSTUFEN } from "./palette.js";

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
        // Der Name ist kein Theme-Feld, sondern der Schluessel der Datei.
        // Die Regel ist dieselbe wie auf dem Server (ws_save_theme): waere
        // der Client grosszuegiger, scheiterte das Speichern spaeter mit
        // einer Meldung, die niemand erwartet.
        { t: "Name der Theme", art: "text", meta: true, platzhalter: "mein_theme",
          regel: "^[A-Za-z0-9_-]{1,64}$" },
        { t: "Grundlage", art: "auswahl", meta: true, optionen: [
          { wert: "ha_blanko", name: "Leer" }, { wert: "import", name: "Vorhandene" } ] },
        { t: "Modus", art: "auswahl", meta: true, optionen: [
          { wert: "beide", name: "Hell + dunkel" }, { wert: "hell", name: "Nur hell" },
          { wert: "dunkel", name: "Nur dunkel" } ] },
      ] },

      // Die fuenf Rollen. Jede setzt ELF Palettenstufen, nicht eine: HA nimmt
      // die kraeftige Flaeche aus Stufe 40, die Ueberfahr-Stufe aus 30, die
      // leise aus 95. Ein einzelner Wert liesse die halbe Oberflaeche stehen.
      // Die Palette ist modusunabhaengig und gehoert deshalb flach - nur dort
      // leitet HA in BEIDEN Modi die RGB-Tripel ab, aus denen Mushroom lebt.
      { name: "Farben", felder: [
        // Die Primaerfarbe IST die Rampe. --primary-color deklariert Home
        // Assistant selbst als var(--ha-color-primary-40) und folgt damit von
        // allein (am 12.10.2026 im Stylesheet nachgelesen). Drei klassische
        // Begleiter sind dagegen feste Werte und bleiben sonst auf HAs Blau
        // stehen, waehrend alles andere umschwenkt - sie werden mitgeschrieben.
        { t: "Primaerfarbe", art: "farbe", rolle: "primary", v: "--ha-color-primary-60", ebene: "beide",
          begleiter: true, sync: { bubble: "--bubble-accent-color", mush: null } },
        { t: "Neutral", art: "farbe", rolle: "neutral", v: "--ha-color-neutral-60", ebene: "beide", sync: { mush: "--mush-rgb-grey" } },
        { t: "Erfolg",  art: "farbe", rolle: "green",   v: "--ha-color-green-60",   ebene: "beide", sync: { mush: "--mush-rgb-success" } },
        { t: "Warnung", art: "farbe", rolle: "orange",  v: "--ha-color-orange-60",  ebene: "beide", sync: { mush: "--mush-rgb-warning" } },
        { t: "Fehler",  art: "farbe", rolle: "red",     v: "--ha-color-red-60",     ebene: "beide", sync: { mush: "--mush-rgb-danger" } },
        // Der Akzent ist KEINE Rampe, sondern ein eigener Wert - von Haus aus
        // orange, nicht blau. Fremde Karten lesen ihn: die Horizon-Karten
        // ziehen --karten-akzent daraus.
        { t: "Akzent", art: "farbe", v: "--accent-color", ebene: "beide",
          sync: { bubble: "--bubble-accent-color", mush: null } },
      ] },

      // Schrift wechselt mit dem Modus - im Hellen dunkel, im Dunkeln hell.
      // Deshalb getrennt, nicht flach.
      { name: "Textfarben", felder: [
        { t: "Primaer",     art: "farbe", v: "--ha-color-text-primary",   ebene: "getrennt" },
        { t: "Sekundaer",   art: "farbe", v: "--ha-color-text-secondary", ebene: "getrennt" },
        { t: "Deaktiviert", art: "farbe", v: "--ha-color-text-disabled",  ebene: "getrennt" },
        { t: "Link",        art: "farbe", v: "--ha-color-text-link",      ebene: "getrennt" },
      ] },

      // Apple und Google zuerst. Eine Schrift, die nicht auf dem Geraet liegt,
      // wird nicht gezeigt - die Apple-Kette greift nur auf Apple-Geraeten,
      // Roboto liefert Home Assistant selbst mit. Exoten brauchen deshalb
      // spaeter uix-fonts, das die Datei ueber die CSS Font Loading API holt.
      { name: "Schrift", felder: [
        { t: "Schriftart", art: "auswahl", v: "--ha-font-family-body", ebene: "beide", optionen: [
          { wert: "Roboto, Noto, \"Noto Sans\", sans-serif", name: "Google", titel: "Roboto - liefert Home Assistant mit" },
          { wert: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif", name: "Apple", titel: "San Francisco - nur auf Apple-Geraeten" } ] },
        { t: "Code", art: "auswahl", v: "--ha-font-family-code", ebene: "beide", optionen: [
          { wert: "\"Roboto Mono\", \"Noto Sans Mono\", monospace", name: "Google" },
          { wert: "ui-monospace, \"SF Mono\", Menlo, monospace", name: "Apple" } ] },
        { t: "Groesse", art: "zahl", v: "--ha-font-size-scale", ebene: "beide",
          min: 0.8, max: 1.4, schritt: 0.05 },
        { t: "Zeilenhoehe", art: "zahl", v: "--ha-line-height-normal", ebene: "beide",
          min: 1.2, max: 2, schritt: 0.05 },
      ] },
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

// Drei Ansichten derselben Felder. Die Wahl liegt im localStorage - eine
// Bequemlichkeit je Geraet, kein Zustand, der irgendwo ankommen muss.
const ANSICHTEN = [
  { id: "gemischt", name: "Gemischt" },
  { id: "liste", name: "Liste" },
  { id: "kacheln", name: "Kacheln" },
];
const ANSICHT_SPEICHER = "hats-ansicht";
function ansichtLesen() {
  try {
    const v = localStorage.getItem(ANSICHT_SPEICHER);
    return ANSICHTEN.some((a) => a.id === v) ? v : "gemischt";
  } catch (e) { return "gemischt"; }
}
function ansichtSchreiben(v) {
  try { localStorage.setItem(ANSICHT_SPEICHER, v); } catch (e) { /* privates Fenster */ }
}

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
    "Ansicht": "View", "Gemischt": "Mixed", "Liste": "List", "Kacheln": "Tiles",
    "Jetzt in Kraft": "In effect now", "Hell": "Light", "Dunkel": "Dark",
    "Beide Modi": "Both modes",
    "Voriges Feld": "Previous field", "Naechstes Feld": "Next field",
    "Geaendert wird im Fenster, geschrieben noch nicht.": "Changes stay in the window; writing comes next.",
    "Einstellen": "Adjust",
    "Diese eine Farbe setzt elf Palettenstufen — HA nimmt die kraeftige Flaeche aus 40, die Ueberfahr-Stufe aus 30, die leise aus 95.": "This one colour sets eleven palette steps — HA takes the loud fill from 40, hover from 30, the quiet one from 95.",
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
    "Akzent": "Accent", "Primaerfarbe": "Primary colour", "Neutral": "Neutral", "Erfolg": "Success",
    "Warnung": "Warning", "Fehler": "Error",
    "Primaer": "Primary", "Sekundaer": "Secondary", "Deaktiviert": "Disabled", "Link": "Link",
    "Schriftart": "Font family", "Code": "Code", "Groesse": "Size", "Zeilenhoehe": "Line height",
  },
};
const t = (s, spr) => (TEXTE[spr] && TEXTE[spr][s]) || s;

// Zwei kleine Zeichen, selbst gezeichnet. MDI-Pfaddaten aus dem Gedaechtnis
// waeren zu einem Teil falsch, und ein halb falscher Pfad sieht kaputt aus.
// Bubble: drei Blasen. Mushroom: Hut und Stiel.
const ICON = {
  bubble: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="10.5" cy="5.5" r="4"/><circle cx="4.5" cy="10" r="2.6"/><circle cx="11" cy="12.5" r="1.9"/></svg>',
  mush: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6c3.3 0 5.9 2.3 5.9 4.7 0 .6-.5 1-1.1 1H3.2c-.6 0-1.1-.4-1.1-1C2.1 3.9 4.7 1.6 8 1.6Z"/><path d="M6.5 8.6h3v4.1a1.5 1.5 0 0 1-3 0V8.6Z"/></svg>',
};

class HatsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._offen = null;
    this._gezeichnet = false;
    this._ansicht = ansichtLesen();
    this._feld = null;
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

      <!-- Die Feldseite liegt NEBEN der Stufenseite, nicht darin. Beide sind
           Geschwister von .buehne. Ein Pop-up im Pop-up waere ein Kind eines
           Elements mit backdrop-filter - und das wird zum Bezugsrahmen fuer
           position:fixed. Genau daran sind Bubble-Pop-ups auf Hoehe 0
           geschrumpft und HA-Dialoge haben ihre Auswahllisten neben den
           Bildschirm gelegt. -->
      <div class="overlay zwei" hidden>
        <div class="schleier"></div>
        <div class="dialog klein" role="dialog" aria-modal="true"></div>
      </div>
    `;

    this.shadowRoot.querySelectorAll(".punkte").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); this.oeffne(Number(b.dataset.stufe)); })
    );
    this.shadowRoot.querySelectorAll(".zeile").forEach((z) =>
      z.addEventListener("click", () => this.oeffne(Number(z.dataset.stufe)))
    );
    this.shadowRoot.querySelectorAll(".overlay").forEach((o) =>
      o.querySelector(".schleier").addEventListener("click", () => {
        if (o.classList.contains("zwei")) this.schliesseFeld(); else this.schliesse();
      })
    );
    // Escape schliesst immer nur das oberste Fenster.
    this._esc = (e) => {
      if (e.key !== "Escape") return;
      if (this._feld) this.schliesseFeld(); else this.schliesse();
    };
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
    this._offen = nr;
    this.zeichneDialog();
    const o = this.shadowRoot.querySelector(".overlay");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
    document.addEventListener("keydown", this._esc);
  }

  zeichneDialog() {
    const T = (s) => t(s, this.spr);
    const st = STUFEN.find((x) => x.n === this._offen);
    if (!st) return;
    const kachelbrett = this._ansicht === "kacheln";
    const d = this.shadowRoot.querySelector(".dialog");
    d.innerHTML = `
      <header class="dkopf">
        <div>
          <h2>${st.n}. ${T(st.titel)}</h2>
          <p>${T(st.kurz)} · ${st.gruppen.length} ${T("Gruppen")} · ${felderZahl(st)} ${T("Felder")}</p>
        </div>
        <div class="umschalter" role="group" aria-label="${T("Ansicht")}">
          ${ANSICHTEN.map((a) => `<button data-ansicht="${a.id}" class="${a.id === this._ansicht ? "an" : ""}">${T(a.name)}</button>`).join("")}
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="brett ${kachelbrett ? "spaltig" : ""}">
        ${st.gruppen.map((g) => (kachelbrett ? this.spalte(st, g, T) : this.gruppe(st, g, T))).join("")}
      </div>`;
    d.querySelector(".zu").addEventListener("click", () => this.schliesse());
    d.querySelectorAll(".umschalter button").forEach((b) =>
      b.addEventListener("click", () => {
        this._ansicht = b.dataset.ansicht;
        ansichtSchreiben(this._ansicht);
        this.zeichneDialog();
      })
    );
    // Jede Kachel und jede Zeile ist ein Menuepunkt: sie zeigt den Stand und
    // fuehrt auf die Seite, auf der sich das Feld einstellen laesst.
    d.querySelectorAll("[data-feld]").forEach((el) => {
      const auf = () => this.oeffneFeld(st, el.dataset.feld);
      el.addEventListener("click", auf);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); auf(); }
      });
    });
  }

  // ---- Zweite Ebene: die Seite eines einzelnen Feldes ----
  //
  // Ein Farbfeld hat ZWEI Werte, hell und dunkel. Das ist der Grund, weshalb
  // die Kachel nur zeigt und nicht einstellt: in eine Kachel passt einer.
  werteJeModus(f) {
    const hass = this._hass;
    if (!f.v || !hass || !hass.themes) return null;
    const theme = hass.themes.themes[hass.themes.theme];
    if (!theme) return null;
    const name = f.v.replace(/^--/, "");
    const flach = { ...theme };
    delete flach.modes;
    const m = theme.modes || {};
    const hell = (m.light && m.light[name]) !== undefined ? m.light[name] : flach[name];
    const dunkel = (m.dark && m.dark[name]) !== undefined ? m.dark[name] : flach[name];
    const wo = flach[name] !== undefined ? "flach"
             : (m.light && m.light[name]) !== undefined ? "je Modus" : null;
    return { hell, dunkel, wo };
  }

  oeffneFeld(st, titel) {
    const T = (s) => t(s, this.spr);
    let g = null, idx = -1;
    for (const gr of st.gruppen) {
      const i = gr.felder.findIndex((x) => x.t === titel);
      if (i >= 0) { g = gr; idx = i; break; }
    }
    if (!g) return;
    this._feld = { st, g, idx };

    const f = g.felder[idx];
    const w = this.wert(f);
    const je = this.werteJeModus(f);
    const probe = (v) => v && /^#|^rgba?\(|^hsla?\(/.test(String(v))
      ? `<span class="probe gross" style="background:${v}"></span>` : "";

    const d = this.shadowRoot.querySelector(".overlay.zwei .dialog");
    d.innerHTML = `
      <header class="dkopf">
        <div>
          <h2>${T(f.t)}</h2>
          <p>${st.n}. ${T(st.titel)} · ${T(g.name)}</p>
        </div>
        <div class="blaettern">
          <button class="vor" ${idx === 0 ? "disabled" : ""} aria-label="${T("Voriges Feld")}">‹</button>
          <span>${idx + 1} / ${g.felder.length}</span>
          <button class="zurueck" ${idx === g.felder.length - 1 ? "disabled" : ""} aria-label="${T("Naechstes Feld")}">›</button>
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="feldseite">
        <p class="zweck">${T(ZWECK[g.name] || "")}</p>
        ${f.v ? `<div class="variable">${f.v}</div>` : ""}
        ${(() => {
          // "Jetzt in Kraft" nur zeigen, wenn es etwas sagt. Bei einem flachen
          // Feld steht derselbe Wert schon zweimal darunter; steht das Feld
          // dagegen gar nicht im Theme, ist es die EINZIGE Zeile mit einem
          // Wert - Hell und Dunkel melden dann "nicht gesetzt".
          const doppelt = je && (String(je.hell) === w.text || String(je.dunkel) === w.text);
          const kraft = doppelt ? "" : `
            <div class="modus">
              <span class="mlabel">${T("Jetzt in Kraft")}</span>
              <div class="mwert">${probe(w.farbe)}<code class="${w.leer ? "leer" : ""}">${w.text}</code></div>
            </div>`;
          const modi = je ? `
            <div class="modus">
              <span class="mlabel">${T("Hell")}</span>
              <div class="mwert">${probe(je.hell)}<code class="${je.hell === undefined ? "leer" : ""}">${je.hell === undefined ? T("nicht gesetzt") : je.hell}</code></div>
            </div>
            <div class="modus">
              <span class="mlabel">${T("Dunkel")}</span>
              <div class="mwert">${probe(je.dunkel)}<code class="${je.dunkel === undefined ? "leer" : ""}">${je.dunkel === undefined ? T("nicht gesetzt") : je.dunkel}</code></div>
            </div>` : "";
          return `<div class="modusliste">${kraft}${modi}</div>`;
        })()}
        ${this.streifen(f, T)}
        <div class="einstellen">
          <span class="mlabel">${T("Einstellen")}</span>
          ${fuerFeld(f, w.farbe || w.text)}
        </div>
        ${f.rolle ? `<div class="rampe" data-rampe>${this.rampeHtml(f, w.farbe)}</div>
        <p class="herkunft">${T("Diese eine Farbe setzt elf Palettenstufen — HA nimmt die kraeftige Flaeche aus 40, die Ueberfahr-Stufe aus 30, die leise aus 95.")}</p>` : ""}
        <p class="noch">${T("Geaendert wird im Fenster, geschrieben noch nicht.")}</p>
      </div>`;

    d.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    const v = d.querySelector(".vor"), z = d.querySelector(".zurueck");
    if (v) v.addEventListener("click", () => this.oeffneFeld(st, g.felder[idx - 1].t));
    if (z) z.addEventListener("click", () => this.oeffneFeld(st, g.felder[idx + 1].t));

    binde(d, (id, wert) => {
      // Noch wird nichts geschrieben - aber die Vorschau zeigt sofort, was
      // die Wahl bedeutet. Elf Stufen aus einer Farbe sind schwer zu raten.
      if (f.rolle) {
        const r = d.querySelector("[data-rampe]");
        if (r) r.innerHTML = this.rampeHtml(f, wert);
      }
      const aus = d.querySelector(`[data-be-aus="${CSS.escape(id)}"]`);
      if (aus && wert === null) aus.textContent = T("nicht gesetzt");
    });

    const o = this.shadowRoot.querySelector(".overlay.zwei");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
  }

  // Sync heisst hier nicht "eingetragen", sondern "kommt an": der abhaengige
  // Name wird aufgeloest und mit dem Feldwert verglichen. Nur das Berechnete
  // beweist, dass eine Zuordnung wirklich wirkt.
  syncStand(f) {
    const cs = getComputedStyle(document.documentElement);
    const eigen = cs.getPropertyValue(f.v || "").trim().toLowerCase();
    const alsTripel = (hex) => {
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
      return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)).join(",") : null;
    };
    const aus = [];
    for (const [name, variable] of Object.entries(f.sync || {})) {
      const anzeige = name === "mush" ? "Mushroom" : "Bubble";
      // null heisst: gibt es dort nicht. Am 12.10.2026 gemessen - Mushroom
      // kennt keinen Akzent (null Namen mit "accent") und liest
      // --accent-color kein einziges Mal. Das ausdruecklich zu zeigen ist
      // besser, als die Ampel wegzulassen und raten zu lassen.
      if (variable === null) {
        aus.push({ name: anzeige, stand: "nichts",
                   titel: `${anzeige} hat dafuer keine Entsprechung` });
        continue;
      }
      const v = cs.getPropertyValue(variable).trim().toLowerCase();
      let stand = "leer";
      if (v) {
        const soll = name === "mush" ? alsTripel(eigen) : eigen;
        const ist = v.replace(/\s+/g, "");
        stand = soll && ist === soll.replace(/\s+/g, "") ? "an" : "aus";
      }
      aus.push({ name: name === "mush" ? "Mushroom" : "Bubble", stand,
                 titel: `${variable}: ${v || "nicht gesetzt"}` });
    }
    return aus;
  }

  streifen(f, T) {
    if (f.meta) return "";
    const beide = f.ebene !== "getrennt";
    return infostreifen({
      id: f.v || f.t,
      modus: beide ? "beide" : "light",
      // Ein Feld, das flach steht, gilt in beiden Modi - die Wahl waere eine
      // Luege. Deshalb hier nur ein Knopf, und der ist gesetzt.
      modi: beide ? [{ wert: "beide", name: T("Beide Modi") }]
                  : [{ wert: "light", name: T("Hell") }, { wert: "dark", name: T("Dunkel") }],
      sync: this.syncStand(f),
    });
  }

  rampeHtml(f, basis) {
    const r = basis ? rampe(basis, f.rolle) : null;
    if (!r) return "";
    return PALETTENSTUFEN.map((st) => {
      const hex = r[`ha-color-${f.rolle}-${st}`];
      return `<span class="stufe" title="${f.rolle}-${st}  ${hex}">
                <i style="background:${hex}"></i><em>${st}</em></span>`;
    }).join("");
  }

  schliesseFeld() {
    const o = this.shadowRoot.querySelector(".overlay.zwei");
    if (!o || o.hidden) return;
    o.classList.remove("da");
    setTimeout(() => { o.hidden = true; }, 180);
    this._feld = null;
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

  feldZeile(f, T) {
    const w = this.wert(f);
    return `
      <div class="feld" data-feld="${f.t}" tabindex="0" role="button">
        <div class="feldtext">
          <b>${T(f.t)}</b>
          <span>${f.v ? f.v : T("Angabe")}</span>
        </div>
        ${this.syncIcons(f)}
        ${w.farbe ? `<span class="probe" style="background:${w.farbe}"></span>` : ""}
        <span class="wert ${w.leer ? "leer" : ""}">${w.text}</span>
      </div>`;
  }

  feldKachel(f, T) {
    const w = this.wert(f);
    return `
      <article class="karte" data-feld="${f.t}" tabindex="0" role="button">
        <b>${T(f.t)}</b>
        <p>${f.v ? f.v : T("Angabe")}</p>
        <div class="kfuss">
          ${w.farbe ? `<span class="probe" style="background:${w.farbe}"></span>`
                    : `<span class="wert ${w.leer ? "leer" : ""}">${w.text}</span>`}
          ${this.syncIcons(f)}
        </div>
      </article>`;
  }

  // Auf der Kachel zaehlt der Stand, nicht der Wert: die Farbe sieht man an
  // der Probe, den Hexwert braucht man erst beim Einstellen. Dafuer ist hier
  // Platz fuer das, was man sonst nirgends sieht - ob Bubble und Mushroom
  // mitziehen.
  syncIcons(f) {
    const stand = this.syncStand(f);
    if (!stand.length) return "";
    return `<span class="syncicons">` + stand.map((s) => {
      const schluessel = s.name === "Mushroom" ? "mush" : "bubble";
      return `<i class="si ${s.stand}" title="${s.name}: ${s.titel}">${ICON[schluessel]}</i>`;
    }).join("") + `</span>`;
  }

  gruppenkopf(g, T) {
    const toene = g.felder.map((f) => this.wert(f).farbe).filter(Boolean).slice(0, 6);
    const streifen = toene.map((c) => `<span class="tupfer" style="background:${c}"></span>`).join("");
    return `
      <header>
        <div class="gtitel"><b>${T(g.name)}</b><span>${g.felder.length} ${T("Felder")}</span></div>
        <div class="streifen">${streifen}</div>
        <button class="punkte klein"><span></span><span></span><span></span></button>
      </header>
      <p class="zweck">${T(ZWECK[g.name] || "")}</p>`;
  }

  // Liste und Gemischt teilen sich die Ueberschrift mit Zweckzeile und Strich;
  // nur darunter wird anders gezeigt - Zeilen oder Kacheln.
  gruppe(st, g, T) {
    const inhalt = this._ansicht === "liste"
      ? `<div class="feldliste">${g.felder.map((f) => this.feldZeile(f, T)).join("")}</div>`
      : `<div class="kachelraster">${g.felder.map((f) => this.feldKachel(f, T)).join("")}</div>`;
    return `<section class="gruppe">${this.gruppenkopf(g, T)}${inhalt}</section>`;
  }

  // Reine Kachelansicht: jede Gruppe eine Spalte, wie in der Vorlage.
  spalte(st, g, T) {
    return `
      <section class="spalte">
        ${this.gruppenkopf(g, T)}
        ${g.felder.map((f) => this.feldKachel(f, T)).join("")}
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

      .dkopf { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; flex-wrap: wrap;
               gap: 12px 16px; padding: 22px 26px 16px; background: #f7f8fb; border-bottom: 1px solid var(--s-linie); }
      .dkopf h2 { margin: 0; font-size: 22px; letter-spacing: -.01em; }
      .dkopf p { margin: 3px 0 0; color: var(--s-tinte-leise); font-size: 13px; }
      .zu { width: 34px; height: 34px; border: 0; border-radius: 50%; cursor: pointer; font-size: 15px;
            background: rgba(27,36,48,.06); color: var(--s-tinte-leise); }
      .zu:hover { background: rgba(27,36,48,.12); }

      /* Listenansicht statt Kartenbrett: eine Gruppe untereinander, in
         derselben Sprache wie die Stufenliste der Hauptseite. */
      .brett { display: flex; flex-direction: column; gap: 22px; padding: 18px 26px 26px; }
      /* Reine Kachelansicht: jede Gruppe eine Spalte, wie in der Vorlage. */
      .brett.spaltig { display: grid; gap: 16px; align-items: start;
                       grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
      .spalte { display: flex; flex-direction: column; gap: 10px; }

      /* Gemischt: Ueberschrift wie in der Liste, Felder als Kacheln darunter. */
      .kachelraster { display: grid; gap: 10px;
                      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
      .karte { background: var(--s-karte); border-radius: var(--s-r); padding: 12px 13px;
               box-shadow: var(--s-schatten-klein); border: 1px solid rgba(27,36,48,.05); }
      .karte b { display: block; font-size: 13.5px; margin-bottom: 2px; }
      /* Der Variablenname ist Beiwerk, nicht Inhalt - klein und leise. */
      .karte p { margin: 0 0 10px; color: var(--s-tinte-leise); font-size: 10.5px;
                 font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                 overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .kfuss { display: flex; align-items: center; gap: 8px; }
      .kfuss .wert { min-width: 0; }

      /* Bubble und Mushroom als Zeichen, nicht als Wort - auf einer Kachel
         ist kein Platz fuer beides, und die Farbe sagt den Stand. */
      .syncicons { display: flex; gap: 5px; margin-left: auto; }
      .si { display: block; width: 15px; height: 15px; }
      .si svg { width: 100%; height: 100%; display: block; }
      .si.leer   { color: #c2c8d2; }
      .si.an     { color: #5aab2f; }
      .si.aus    { color: #e08a1e; }
      .si.nichts { color: #c2c8d2; opacity: .4; }
      .si svg * { fill: currentColor; }

      /* Kacheln und Zeilen sind Menuepunkte - das muss man ihnen ansehen. */
      .karte[data-feld], .feld[data-feld] { cursor: pointer; }
      .karte[data-feld]:hover { box-shadow: 0 4px 14px rgba(26,44,74,.14); transform: translateY(-1px); }
      .karte[data-feld] { transition: box-shadow .15s ease, transform .15s ease; }
      .karte[data-feld]:focus-visible, .feld[data-feld]:focus-visible {
        outline: 2px solid var(--s-tinte); outline-offset: 2px; }

      /* Zweite Ebene: die Seite eines Feldes. Schmaler als die Stufenseite. */
      .dialog.klein { width: min(560px, 100%); }
      .overlay.zwei { z-index: 60; }
      .overlay.zwei .schleier { background: rgba(16,28,45,.3); }
      .feldseite { padding: 18px 26px 26px; }
      .feldseite .zweck { margin: 0 0 14px; }
      .variable { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
                  color: var(--s-tinte-leise); background: rgba(27,36,48,.05);
                  padding: 8px 11px; border-radius: var(--s-r-klein); margin-bottom: 16px; }
      .modusliste { background: var(--s-karte); border-radius: var(--s-r); padding: 6px;
                    box-shadow: var(--s-schatten-klein); border: 1px solid rgba(27,36,48,.05); }
      .modus { display: flex; align-items: center; gap: 12px; padding: 11px 12px; }
      .modus + .modus { box-shadow: inset 0 1px 0 var(--s-linie); }
      .mlabel { font-size: 13px; }
      .mwert { margin-left: auto; display: flex; align-items: center; gap: 9px; }
      .mwert code { font-size: 12px; color: var(--s-tinte-leise);
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .mwert code.leer { font-style: italic; opacity: .6; }
      .probe.gross { width: 22px; height: 22px; }
      .herkunft { margin: 2px 12px 8px; font-size: 11.5px; color: var(--s-tinte-leise); }
      .noch { margin: 16px 2px 0; font-size: 12px; color: var(--s-tinte-leise); font-style: italic; }

      .einstellen { margin-top: 18px; }
      .einstellen .mlabel { display: block; margin-bottom: 8px; font-size: 13px; }

      /* Bedienelemente - Formen nach der Vorlage, Farben die unseren. */
      /* Weiss wie die Felder darueber, und dieselbe Rundung - ein
         Bedienelement ist eine Karte, kein eingelassener Trog. */
      .be { display: flex; align-items: center; gap: 10px; padding: 10px 12px;
            border-radius: var(--s-r); background: var(--s-karte);
            box-shadow: var(--s-schatten-klein); border: 1px solid rgba(27,36,48,.05); }

      /* Beide Schieber liegen in derselben Rasterspalte: gleiche Laenge,
         gleiche Bahn, gleiches Ziehen. Die Spalten rechts sind fest, damit
         Hex-Wert und Prozentzahl untereinander stehen. */
      .be-farbe { display: grid; grid-template-columns: 1fr 30px 76px 28px;
                  gap: 10px; align-items: center; }

      .be-schiene { -webkit-appearance: none; appearance: none; width: 100%; height: 14px;
                    background: transparent; cursor: pointer; }
      .be-schiene::-webkit-slider-runnable-track { height: 14px; border-radius: 999px;
                    background: var(--bahn); box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }
      .be-schiene::-moz-range-track { height: 14px; border-radius: 999px;
                    background: var(--bahn); box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }
      .be-schiene::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
                    width: 18px; height: 18px; margin-top: -2px; border-radius: 50%;
                    background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.18); }
      .be-schiene::-moz-range-thumb { width: 18px; height: 18px; border: 0; border-radius: 50%;
                    background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.18); }
      /* Das Karo macht Durchsichtigkeit sichtbar - ohne es sieht
         halbdurchsichtiges Weiss aus wie deckendes Weiss. */
      .be-karo::-webkit-slider-runnable-track {
        background-image: var(--bahn),
          linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
          linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%);
        background-size: auto, 8px 8px, 8px 8px; background-position: 0 0, 0 0, 4px 4px; }
      .be-karo::-moz-range-track {
        background-image: var(--bahn),
          linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
          linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%);
        background-size: auto, 8px 8px, 8px 8px; background-position: 0 0, 0 0, 4px 4px; }

      .be input[type="color"] { width: 30px; height: 30px; padding: 0; border: 0;
                                background: none; border-radius: 9px; cursor: pointer; }
      .be code { font-size: 12px;
                 font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .be output { font-size: 12px; color: var(--s-tinte-leise);
                   font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .be input[type="text"] { flex: 1; border: 0; background: rgba(27,36,48,.05); font: inherit;
                               font-size: 13px; padding: 7px 11px; border-radius: 999px; }
      .be-segmente { gap: 3px; padding: 4px; background: rgba(27,36,48,.06);
                     box-shadow: none; border: 0; border-radius: 999px; }
      .be-segmente button { flex: 1; border: 0; cursor: pointer; font: inherit; font-size: 12.5px;
                            padding: 7px 12px; border-radius: 999px; background: transparent;
                            color: var(--s-tinte-leise); white-space: nowrap; }
      .be-segmente button.an { background: #fff; color: var(--s-tinte);
                               box-shadow: var(--s-schatten-klein); }
      .be-segmente button[disabled] { cursor: default; }
      .be-zurueck { width: 28px; height: 28px; flex: none; border: 0; border-radius: 50%;
                    cursor: pointer; background: rgba(27,36,48,.08); color: var(--s-tinte-leise);
                    font-size: 14px; line-height: 1; }
      .be-zurueck:hover { background: rgba(27,36,48,.16); color: var(--s-tinte); }

      /* Der schmale Streifen ueber dem Feld: Modus, Sync-Stand, Rueckweg. */
      .infostreifen { display: flex; align-items: center; gap: 12px; margin: 0 0 10px;
                      padding: 6px 8px 6px 6px; border-radius: 999px;
                      background: rgba(27,36,48,.05); }
      .infostreifen .be-segmente.klein { padding: 3px; background: rgba(255,255,255,.7); }
      .infostreifen .be-segmente.klein button { padding: 4px 11px; font-size: 12px; }
      .ampeln { display: flex; gap: 12px; margin-left: auto; }
      .ampel { display: flex; align-items: center; gap: 5px; font-size: 11.5px;
               color: var(--s-tinte-leise); white-space: nowrap; }
      .ampel i { width: 7px; height: 7px; border-radius: 50%; background: #c2c8d2; }
      .ampel.an i  { background: #7bd14a; }
      .ampel.aus i { background: #f0a23c; }
      /* Nicht anwendbar: durchgestrichener Punkt, kein Zustand. */
      .ampel.nichts { opacity: .5; }
      .ampel.nichts i { background: transparent; box-shadow: inset 0 0 0 1px currentColor; }

      /* Die elf Stufen, die aus einer Farbe entstehen. */
      .rampe { display: flex; gap: 3px; margin-top: 14px; }
      .stufe { flex: 1; text-align: center; }
      .stufe i { display: block; height: 30px; border-radius: 6px;
                 box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
      .stufe em { display: block; margin-top: 4px; font-style: normal; font-size: 10px;
                  color: var(--s-tinte-leise); }

      .blaettern { display: flex; align-items: center; gap: 6px; margin-left: auto; }
      .blaettern span { font-size: 12px; color: var(--s-tinte-leise); min-width: 42px; text-align: center; }
      .blaettern button { width: 28px; height: 28px; border: 0; border-radius: 50%; cursor: pointer;
                          background: rgba(27,36,48,.06); color: var(--s-tinte); font-size: 15px; line-height: 1; }
      .blaettern button:hover:not([disabled]) { background: rgba(27,36,48,.12); }
      .blaettern button[disabled] { opacity: .35; cursor: default; }

      /* Der Umschalter im Kopf des Pop-ups. */
      .umschalter { display: flex; gap: 2px; margin-left: auto; padding: 3px;
                    border-radius: 999px; background: rgba(27,36,48,.06); }
      .umschalter button { border: 0; cursor: pointer; font: inherit; font-size: 12px;
                           padding: 5px 12px; border-radius: 999px; background: transparent;
                           color: var(--s-tinte-leise); }
      .umschalter button:hover { color: var(--s-tinte); }
      .umschalter button.an { background: #fff; color: var(--s-tinte);
                              box-shadow: var(--s-schatten-klein); }

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
      /* Rund, nicht eckig - eine Farbe ist ein Punkt, kein Feld. */
      .probe { width: 18px; height: 18px; border-radius: 50%; flex: none;
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

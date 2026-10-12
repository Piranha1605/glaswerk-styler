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
import { rampe, begleiter, STUFEN as PALETTENSTUFEN } from "./palette.js";
import { leseTheme, schreibeTheme, leeresModell, wirksam, setze, entferne } from "./theme.js";
import { ZUORDNUNG, ANZAHL } from "./zuordnung.js";

const HATS_VERSION = "0.2.0b1";

// Die acht Stufen sind ein Weg, kein Menue: von der leeren Datei bis zur
// geschriebenen Theme. Jede Stufe setzt auf der vorigen auf - wer Stufe 1
// aendert, verschiebt alles darueber, weil Home Assistant den Rest ableitet.
//
// Ein Feld traegt entweder `v` (eine CSS-Variable, deren aktueller Wert
// angezeigt wird) oder `w` (ein fester Text). Was hier steht, ist die
// Gliederung; das Schreiben in die Theme kommt im naechsten Schritt.
const STUFEN = [
  { n: 1, titel: "Grundlagen", kurz: "Name, Palette, Akzent, Textfarben, Schrift",
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
        // Bubble hat zwar ein --bubble-accent-color, aber das markiert aktive
        // Knoepfe und folgt damit der Primaerfarbe, nicht diesem dekorativen
        // Akzent. Deshalb hier keine Entsprechung - sonst stuende die Ampel
        // dauerhaft auf orange, obwohl alles richtig ist.
        { t: "Akzent", art: "farbe", v: "--accent-color", ebene: "beide",
          sync: { bubble: null, mush: null } },
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
          { wert: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif", name: "Apple", titel: "San Francisco - nur auf Apple-Geraeten" },
          // Die Kette der HATS-Oberflaeche selbst. Sie bringt keine Datei mit,
          // sondern nimmt, was da ist: Segoe auf Windows, sonst Inter oder
          // Roboto, zuletzt die Systemschrift.
          { wert: "\"Segoe UI\", Inter, Roboto, system-ui, sans-serif", name: "Studio", titel: "Die Schrift der HATS-Oberflaeche" } ] },
        { t: "Code", art: "auswahl", v: "--ha-font-family-code", ebene: "beide", optionen: [
          { wert: "\"Roboto Mono\", \"Noto Sans Mono\", monospace", name: "Google" },
          { wert: "ui-monospace, \"SF Mono\", Menlo, monospace", name: "Apple" } ] },
        { t: "Groesse", art: "zahl", v: "--ha-font-size-scale", ebene: "beide",
          min: 0.8, max: 1.4, schritt: 0.05 },
        { t: "Zeilenhoehe", art: "zahl", v: "--ha-line-height-normal", ebene: "beide",
          min: 1.2, max: 2, schritt: 0.05 },
      ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Palette", felder: [
        { t: "Dunkel Primaer Farbe", art: "farbe", v: "--dark-primary-color", ebene: "beide" },
        { t: "Darker Primaer Farbe", art: "farbe", v: "--darker-primary-color", ebene: "beide" },
        { t: "Black", art: "farbe", v: "--ha-color-black", ebene: "beide" },
        { t: "Green 05", art: "farbe", v: "--ha-color-green-05", ebene: "beide" },
        { t: "Green 10", art: "farbe", v: "--ha-color-green-10", ebene: "beide" },
        { t: "Green 20", art: "farbe", v: "--ha-color-green-20", ebene: "beide" },
        { t: "Green 30", art: "farbe", v: "--ha-color-green-30", ebene: "beide" },
        { t: "Green 40", art: "farbe", v: "--ha-color-green-40", ebene: "beide" },
        { t: "Green 50", art: "farbe", v: "--ha-color-green-50", ebene: "beide" },
        { t: "Green 70", art: "farbe", v: "--ha-color-green-70", ebene: "beide" },
        { t: "Green 80", art: "farbe", v: "--ha-color-green-80", ebene: "beide" },
        { t: "Green 90", art: "farbe", v: "--ha-color-green-90", ebene: "beide" },
        { t: "Green 95", art: "farbe", v: "--ha-color-green-95", ebene: "beide" },
        { t: "Neutral 05", art: "farbe", v: "--ha-color-neutral-05", ebene: "beide" },
        { t: "Neutral 10", art: "farbe", v: "--ha-color-neutral-10", ebene: "beide" },
        { t: "Neutral 20", art: "farbe", v: "--ha-color-neutral-20", ebene: "beide" },
        { t: "Neutral 30", art: "farbe", v: "--ha-color-neutral-30", ebene: "beide" },
        { t: "Neutral 40", art: "farbe", v: "--ha-color-neutral-40", ebene: "beide" },
        { t: "Neutral 50", art: "farbe", v: "--ha-color-neutral-50", ebene: "beide" },
        { t: "Neutral 70", art: "farbe", v: "--ha-color-neutral-70", ebene: "beide" },
        { t: "Neutral 80", art: "farbe", v: "--ha-color-neutral-80", ebene: "beide" },
        { t: "Neutral 90", art: "farbe", v: "--ha-color-neutral-90", ebene: "beide" },
        { t: "Neutral 95", art: "farbe", v: "--ha-color-neutral-95", ebene: "beide" },
        { t: "Orange 05", art: "farbe", v: "--ha-color-orange-05", ebene: "beide" },
        { t: "Orange 10", art: "farbe", v: "--ha-color-orange-10", ebene: "beide" },
        { t: "Orange 20", art: "farbe", v: "--ha-color-orange-20", ebene: "beide" },
        { t: "Orange 30", art: "farbe", v: "--ha-color-orange-30", ebene: "beide" },
        { t: "Orange 40", art: "farbe", v: "--ha-color-orange-40", ebene: "beide" },
        { t: "Orange 50", art: "farbe", v: "--ha-color-orange-50", ebene: "beide" },
        { t: "Orange 70", art: "farbe", v: "--ha-color-orange-70", ebene: "beide" },
        { t: "Orange 80", art: "farbe", v: "--ha-color-orange-80", ebene: "beide" },
        { t: "Orange 90", art: "farbe", v: "--ha-color-orange-90", ebene: "beide" },
        { t: "Orange 95", art: "farbe", v: "--ha-color-orange-95", ebene: "beide" },
        { t: "Primaer 05", art: "farbe", v: "--ha-color-primary-05", ebene: "beide" },
        { t: "Primaer 10", art: "farbe", v: "--ha-color-primary-10", ebene: "beide" },
        { t: "Primaer 20", art: "farbe", v: "--ha-color-primary-20", ebene: "beide" },
        { t: "Primaer 30", art: "farbe", v: "--ha-color-primary-30", ebene: "beide" },
        { t: "Primaer 40", art: "farbe", v: "--ha-color-primary-40", ebene: "beide" },
        { t: "Primaer 50", art: "farbe", v: "--ha-color-primary-50", ebene: "beide" },
        { t: "Primaer 70", art: "farbe", v: "--ha-color-primary-70", ebene: "beide" },
        { t: "Primaer 80", art: "farbe", v: "--ha-color-primary-80", ebene: "beide" },
        { t: "Primaer 90", art: "farbe", v: "--ha-color-primary-90", ebene: "beide" },
        { t: "Primaer 95", art: "farbe", v: "--ha-color-primary-95", ebene: "beide" },
        { t: "Red 05", art: "farbe", v: "--ha-color-red-05", ebene: "beide" },
        { t: "Red 10", art: "farbe", v: "--ha-color-red-10", ebene: "beide" },
        { t: "Red 20", art: "farbe", v: "--ha-color-red-20", ebene: "beide" },
        { t: "Red 30", art: "farbe", v: "--ha-color-red-30", ebene: "beide" },
        { t: "Red 40", art: "farbe", v: "--ha-color-red-40", ebene: "beide" },
        { t: "Red 50", art: "farbe", v: "--ha-color-red-50", ebene: "beide" },
        { t: "Red 70", art: "farbe", v: "--ha-color-red-70", ebene: "beide" },
        { t: "Red 80", art: "farbe", v: "--ha-color-red-80", ebene: "beide" },
        { t: "Red 90", art: "farbe", v: "--ha-color-red-90", ebene: "beide" },
        { t: "Red 95", art: "farbe", v: "--ha-color-red-95", ebene: "beide" },
        { t: "White", art: "farbe", v: "--ha-color-white", ebene: "beide" },
        { t: "Hell Primaer Farbe", art: "farbe", v: "--light-primary-color", ebene: "beide" },
      ] },
      { name: "Klassische Textfarben", felder: [
        { t: "Deaktiviert Farbe", art: "farbe", v: "--disabled-color", ebene: "getrennt" },
        { t: "Deaktiviert text Farbe", art: "farbe", v: "--disabled-text-color", ebene: "getrennt" },
        { t: "Error Farbe", art: "farbe", v: "--error-color", ebene: "beide" },
        { t: "Info Farbe", art: "farbe", v: "--info-color", ebene: "beide" },
        { t: "Primaer text Farbe", art: "farbe", v: "--primary-text-color", ebene: "getrennt" },
        { t: "Secondary text Farbe", art: "farbe", v: "--secondary-text-color", ebene: "getrennt" },
        { t: "Erfolg Farbe", art: "farbe", v: "--success-color", ebene: "beide" },
        { t: "Text hell Primaer Farbe", art: "farbe", v: "--text-light-primary-color", ebene: "beide" },
        { t: "Text Primaer Farbe", art: "farbe", v: "--text-primary-color", ebene: "beide" },
        { t: "Warnung Farbe", art: "farbe", v: "--warning-color", ebene: "beide" },
      ] },
      { name: "Schriftgroessen", felder: [
        { t: "Family longform", art: "text", v: "--ha-font-family-longform", ebene: "beide" },
        { t: "Smoothing", art: "text", v: "--ha-font-smoothing", ebene: "beide" },
        { t: "Weight bold", art: "zahl", v: "--ha-font-weight-bold", ebene: "beide", min: 0, max: 2100, schritt: 0.05 },
        { t: "Weight hell", art: "zahl", v: "--ha-font-weight-light", ebene: "beide", min: 0, max: 900, schritt: 0.05 },
        { t: "Weight medium", art: "zahl", v: "--ha-font-weight-medium", ebene: "beide", min: 0, max: 1500, schritt: 0.05 },
        { t: "Weight normal", art: "zahl", v: "--ha-font-weight-normal", ebene: "beide", min: 0, max: 1200, schritt: 0.05 },
        { t: "Condensed", art: "zahl", v: "--ha-line-height-condensed", ebene: "beide", min: 0, max: 4, schritt: 0.05 },
        { t: "Expanded", art: "zahl", v: "--ha-line-height-expanded", ebene: "beide", min: 0, max: 6, schritt: 0.05 },
      ] },
    ] },

  { n: 2, titel: "Flaechen", kurz: "Hintergrund, Karten, Dialoge, Kanten, Eingaben",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Alles hier wechselt mit dem Modus - im Hellen hell, im Dunkeln dunkel.
      // Deshalb durchweg getrennt, nicht flach.
      { name: "Grundflaechen", felder: [
        { t: "Oberflaeche", art: "farbe", v: "--ha-color-surface-default", ebene: "getrennt" },
        { t: "Eine Stufe tiefer", art: "farbe", v: "--ha-color-surface-low", ebene: "getrennt" },
        { t: "Zwei Stufen tiefer", art: "farbe", v: "--ha-color-surface-lower", ebene: "getrennt" },
        // Steht nicht in ha_blanko, weil HA es nicht vorbelegt - gelesen wird es
        // trotzdem (hui-root). Als Text, nicht als Farbe: hier passt ein
        // Verlauf oder ein url() hinein, nicht nur ein Hexwert.
        { t: "Dashboard-Hintergrund", art: "text", v: "--lovelace-background", ebene: "getrennt",
          platzhalter: "linear-gradient(160deg, #dcebfb, #8fbdea)" } ] },
      { name: "Karten", felder: [
        { t: "Kartenflaeche", art: "farbe", v: "--ha-card-background", ebene: "getrennt",
          sync: { bubble: "--bubble-main-background-color" } },
        { t: "Weichzeichnung", art: "text", v: "--ha-card-backdrop-filter", ebene: "beide",
          platzhalter: "blur(14px) saturate(1.4)" } ] },
      { name: "Dialoge", felder: [
        { t: "Dialogflaeche", art: "farbe", v: "--ha-dialog-surface-background", ebene: "getrennt",
          sync: { bubble: "--bubble-pop-up-main-background-color" } },
        // --ha-dialog-scrim-color gibt es nicht - der Name war erfunden. Am
        // 12.10.2026 aus ha-dialog.elementStyles gelesen: HA liest
        // --mdc-dialog-scrim-color (Ausweichwert none), darunter Web Awesome
        // mit --wa-color-overlay-modal.
        { t: "Abdunkelung", art: "farbe", v: "--mdc-dialog-scrim-color", ebene: "getrennt",
          sync: { bubble: "--bubble-backdrop-background-color" } } ] },
      { name: "Leisten", felder: [
        { t: "Seitenleiste", art: "farbe", v: "--sidebar-background-color", ebene: "getrennt" },
        { t: "Kopfleiste", art: "farbe", v: "--app-header-background-color", ebene: "getrennt" } ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Schatten und Leisten", felder: [
        { t: "Bar box shadow", art: "text", v: "--bar-box-shadow", ebene: "getrennt" },
        { t: "Shadow scrollable fade", art: "farbe", v: "--ha-color-shadow-scrollable-fade", ebene: "beide" },
        { t: "Header height", art: "mass", v: "--header-height", ebene: "beide", min: 0, max: 168 },
        { t: "Scrollbar thumb Farbe", art: "farbe", v: "--scrollbar-thumb-color", ebene: "getrennt" },
        { t: "Shadow Farbe", art: "farbe", v: "--shadow-color", ebene: "getrennt" },
      ] },
      { name: "Grundflaechen", felder: [
        { t: "Card Flaeche Farbe", art: "farbe", v: "--card-background-color", ebene: "getrennt" },
        { t: "Clear Flaeche Farbe", art: "farbe", v: "--clear-background-color", ebene: "getrennt" },
        { t: "Default invertiert", art: "farbe", v: "--ha-color-surface-default-inverted", ebene: "getrennt" },
        { t: "Low invertiert", art: "farbe", v: "--ha-color-surface-low-inverted", ebene: "getrennt" },
        { t: "Lower invertiert", art: "farbe", v: "--ha-color-surface-lower-inverted", ebene: "getrennt" },
        { t: "Primaer Flaeche Farbe", art: "farbe", v: "--primary-background-color", ebene: "getrennt" },
        { t: "Secondary Flaeche Farbe", art: "farbe", v: "--secondary-background-color", ebene: "getrennt" },
      ] },
      { name: "Kanten", felder: [
        { t: "Divider Farbe", art: "farbe", v: "--divider-color", ebene: "getrennt" },
        { t: "Fehler laut", art: "farbe", v: "--ha-color-border-danger-loud", ebene: "getrennt" },
        { t: "Fehler normal", art: "farbe", v: "--ha-color-border-danger-normal", ebene: "getrennt" },
        { t: "Neutral laut", art: "farbe", v: "--ha-color-border-neutral-loud", ebene: "getrennt" },
        { t: "Normal", art: "farbe", v: "--ha-color-border-normal", ebene: "getrennt" },
        { t: "Warnung laut", art: "farbe", v: "--ha-color-border-warning-loud", ebene: "getrennt" },
        { t: "Warnung normal", art: "farbe", v: "--ha-color-border-warning-normal", ebene: "getrennt" },
      ] },
      { name: "Eingabefelder", felder: [
        { t: "Flaeche", art: "farbe", v: "--ha-color-form-background", ebene: "getrennt" },
        { t: "Flaeche Deaktiviert", art: "farbe", v: "--ha-color-form-background-disabled", ebene: "getrennt" },
        { t: "Flaeche ueberfahren", art: "farbe", v: "--ha-color-form-background-hover", ebene: "getrennt" },
        { t: "Deaktiviert fill Farbe", art: "farbe", v: "--input-disabled-fill-color", ebene: "getrennt" },
        { t: "Deaktiviert ink Farbe", art: "farbe", v: "--input-disabled-ink-color", ebene: "getrennt" },
        { t: "Deaktiviert line Farbe", art: "farbe", v: "--input-disabled-line-color", ebene: "getrennt" },
        { t: "Dropdown icon Farbe", art: "farbe", v: "--input-dropdown-icon-color", ebene: "getrennt" },
        { t: "Fill Farbe", art: "farbe", v: "--input-fill-color", ebene: "getrennt" },
        { t: "Ueberfahren line Farbe", art: "farbe", v: "--input-hover-line-color", ebene: "getrennt" },
        { t: "Idle line Farbe", art: "farbe", v: "--input-idle-line-color", ebene: "getrennt" },
        { t: "Ink Farbe", art: "farbe", v: "--input-ink-color", ebene: "getrennt" },
        { t: "Label ink Farbe", art: "farbe", v: "--input-label-ink-color", ebene: "getrennt" },
        { t: "Outlined Deaktiviert border Farbe", art: "farbe", v: "--input-outlined-disabled-border-color", ebene: "getrennt" },
        { t: "Outlined ueberfahren border Farbe", art: "farbe", v: "--input-outlined-hover-border-color", ebene: "getrennt" },
        { t: "Outlined idle border Farbe", art: "farbe", v: "--input-outlined-idle-border-color", ebene: "getrennt" },
      ] },
      { name: "Schrift auf Flaechen", felder: [
        { t: "Primaer invertiert", art: "farbe", v: "--ha-color-text-primary-inverted", ebene: "getrennt" },
        { t: "Secondary invertiert", art: "farbe", v: "--ha-color-text-secondary-inverted", ebene: "getrennt" },
      ] },
    ] },

  { n: 3, titel: "Form", kurz: "Rundung, Rahmen, Abstaende, Schatten, Knoepfe",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Masse sind in beiden Modi gleich - HA setzt sie einmal in
      // core.globals.ts. Nur die Schatten unterscheiden sich.
      { name: "Rundung", felder: [
        { t: "Klein", art: "mass", v: "--ha-border-radius-sm", ebene: "beide", min: 0, max: 16 },
        { t: "Mittel", art: "mass", v: "--ha-border-radius-md", ebene: "beide", min: 0, max: 24 },
        { t: "Gross", art: "mass", v: "--ha-border-radius-lg", ebene: "beide", min: 0, max: 32 },
        { t: "Karten", art: "mass", v: "--ha-border-radius-xl", ebene: "beide", min: 0, max: 48 } ] },
      { name: "Rahmen", felder: [
        { t: "Breite", art: "mass", v: "--ha-border-width-sm", ebene: "beide", min: 0, max: 4 },
        { t: "Ruhig", art: "farbe", v: "--ha-color-border-neutral-quiet", ebene: "getrennt" },
        { t: "Deutlich", art: "farbe", v: "--ha-color-border-neutral-normal", ebene: "getrennt" } ] },
      { name: "Abstaende", felder: [
        { t: "Eng", art: "mass", v: "--ha-space-2", ebene: "beide", min: 0, max: 24 },
        { t: "Normal", art: "mass", v: "--ha-space-4", ebene: "beide", min: 0, max: 40 },
        { t: "Weit", art: "mass", v: "--ha-space-6", ebene: "beide", min: 0, max: 64 } ] },
      // Schatten stehen in semantic.globals.ts zweimal, je Modus verschieden.
      { name: "Schatten", felder: [
        { t: "Klein", art: "text", v: "--ha-box-shadow-s", ebene: "getrennt" },
        { t: "Mittel", art: "text", v: "--ha-box-shadow-m", ebene: "getrennt" },
        { t: "Gross", art: "text", v: "--ha-box-shadow-l", ebene: "getrennt" } ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Rundung", felder: [
        { t: "2xl", art: "mass", v: "--ha-border-radius-2xl", ebene: "beide", min: 0, max: 60 },
        { t: "3xl", art: "mass", v: "--ha-border-radius-3xl", ebene: "beide", min: 0, max: 72 },
        { t: "4xl", art: "mass", v: "--ha-border-radius-4xl", ebene: "beide", min: 0, max: 84 },
        { t: "5xl", art: "mass", v: "--ha-border-radius-5xl", ebene: "beide", min: 0, max: 96 },
        { t: "6xl", art: "mass", v: "--ha-border-radius-6xl", ebene: "beide", min: 0, max: 108 },
        { t: "Circle", art: "mass", v: "--ha-border-radius-circle", ebene: "beide", einheit: "%", min: 0, max: 150 },
        { t: "Pill", art: "mass", v: "--ha-border-radius-pill", ebene: "beide", min: 0, max: 29997 },
        { t: "Square", art: "zahl", v: "--ha-border-radius-square", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
      ] },
      { name: "Rahmen", felder: [
        { t: "Lg", art: "mass", v: "--ha-border-width-lg", ebene: "beide", min: 0, max: 48 },
        { t: "Md", art: "mass", v: "--ha-border-width-md", ebene: "beide", min: 0, max: 48 },
        { t: "Border style", art: "text", v: "--wa-border-style", ebene: "beide" },
        { t: "Border style", art: "text", v: "--wa-panel-border-style", ebene: "beide" },
        { t: "Border width", art: "mass", v: "--wa-panel-border-width", ebene: "beide", min: 0, max: 48 },
      ] },
      { name: "Knoepfe", felder: [
        { t: "Neutral Farbe", art: "farbe", v: "--ha-button-neutral-color", ebene: "getrennt" },
        { t: "Neutral hell Farbe", art: "farbe", v: "--ha-button-neutral-light-color", ebene: "getrennt" },
        { t: "Primaer hell Farbe", art: "farbe", v: "--ha-button-primary-light-color", ebene: "getrennt" },
        { t: "Warnung hell Farbe", art: "farbe", v: "--ha-button-warning-light-color", ebene: "getrennt" },
        { t: "Height", art: "mass", v: "--wa-form-control-height", ebene: "beide", min: 0, max: 120 },
        { t: "Padding block", art: "mass", v: "--wa-form-control-padding-block", ebene: "beide", einheit: "em", min: 0, max: 48 },
      ] },
      { name: "Abstaende", felder: [
        { t: "1", art: "mass", v: "--ha-space-1", ebene: "beide", min: 0, max: 48 },
        { t: "10", art: "mass", v: "--ha-space-10", ebene: "beide", min: 0, max: 120 },
        { t: "11", art: "mass", v: "--ha-space-11", ebene: "beide", min: 0, max: 132 },
        { t: "12", art: "mass", v: "--ha-space-12", ebene: "beide", min: 0, max: 144 },
        { t: "13", art: "mass", v: "--ha-space-13", ebene: "beide", min: 0, max: 156 },
        { t: "14", art: "mass", v: "--ha-space-14", ebene: "beide", min: 0, max: 168 },
        { t: "15", art: "mass", v: "--ha-space-15", ebene: "beide", min: 0, max: 180 },
        { t: "16", art: "mass", v: "--ha-space-16", ebene: "beide", min: 0, max: 192 },
        { t: "17", art: "mass", v: "--ha-space-17", ebene: "beide", min: 0, max: 204 },
        { t: "18", art: "mass", v: "--ha-space-18", ebene: "beide", min: 0, max: 216 },
        { t: "19", art: "mass", v: "--ha-space-19", ebene: "beide", min: 0, max: 228 },
        { t: "20", art: "mass", v: "--ha-space-20", ebene: "beide", min: 0, max: 240 },
        { t: "3", art: "mass", v: "--ha-space-3", ebene: "beide", min: 0, max: 48 },
        { t: "5", art: "mass", v: "--ha-space-5", ebene: "beide", min: 0, max: 60 },
        { t: "7", art: "mass", v: "--ha-space-7", ebene: "beide", min: 0, max: 84 },
        { t: "8", art: "mass", v: "--ha-space-8", ebene: "beide", min: 0, max: 96 },
        { t: "9", art: "mass", v: "--ha-space-9", ebene: "beide", min: 0, max: 108 },
      ] },
    ] },

  { n: 4, titel: "Zustaende", kurz: "Lautstaerken, Ueberfahren, Druecken, Deckkraft, Fokus",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Diese Felder leitet Home Assistant selbst aus der Palette ab. Wer sie
      // setzt, friert sie ein und nimmt der Primaerfarbe ihre Wirkung - das
      // lohnt nur, wo man bewusst ausbrechen will.
      { name: "Leise", felder: [
        { t: "Ruhend", art: "farbe", v: "--ha-color-fill-primary-quiet-resting", ebene: "getrennt", abgeleitet: true },
        { t: "Ueberfahren", art: "farbe", v: "--ha-color-fill-primary-quiet-hover", ebene: "getrennt", abgeleitet: true } ] },
      { name: "Normal", felder: [
        { t: "Ruhend", art: "farbe", v: "--ha-color-fill-primary-normal-resting", ebene: "getrennt", abgeleitet: true },
        { t: "Ueberfahren", art: "farbe", v: "--ha-color-fill-primary-normal-hover", ebene: "getrennt", abgeleitet: true },
        { t: "Schrift darauf", art: "farbe", v: "--ha-color-on-primary-normal", ebene: "getrennt", abgeleitet: true } ] },
      { name: "Laut", felder: [
        { t: "Ruhend", art: "farbe", v: "--ha-color-fill-primary-loud-resting", ebene: "getrennt", abgeleitet: true },
        { t: "Ueberfahren", art: "farbe", v: "--ha-color-fill-primary-loud-hover", ebene: "getrennt", abgeleitet: true },
        { t: "Schrift darauf", art: "farbe", v: "--ha-color-on-primary-loud", ebene: "getrennt", abgeleitet: true } ] },
      { name: "Rueckmeldung", felder: [
        { t: "Klick-Welle", art: "farbe", v: "--ha-ripple-color", ebene: "getrennt" },
        { t: "Dauer", art: "mass", v: "--ha-animation-duration-fast", ebene: "beide",
          min: 0, max: 600, schritt: 10, einheit: "ms" } ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Deckkraft", felder: [
        { t: "Dunkel Deaktiviert Deckkraft", art: "zahl", v: "--dark-disabled-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Dunkel divider Deckkraft", art: "zahl", v: "--dark-divider-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Dunkel Primaer Deckkraft", art: "zahl", v: "--dark-primary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Dunkel secondary Deckkraft", art: "zahl", v: "--dark-secondary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell Deaktiviert Deckkraft", art: "zahl", v: "--light-disabled-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell divider Deckkraft", art: "zahl", v: "--light-divider-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell Primaer Deckkraft", art: "zahl", v: "--light-primary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell secondary Deckkraft", art: "zahl", v: "--light-secondary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
      ] },
      { name: "Bewegung", felder: [
        { t: "Instant", art: "mass", v: "--ha-animation-duration-instant", ebene: "beide", einheit: "ms", min: 0, max: 225 },
        { t: "None", art: "mass", v: "--ha-animation-duration-none", ebene: "beide", einheit: "ms", min: 0, max: 48 },
        { t: "Normal", art: "mass", v: "--ha-animation-duration-normal", ebene: "beide", einheit: "s", min: 0, max: 48 },
        { t: "Slow", art: "mass", v: "--ha-animation-duration-slow", ebene: "beide", einheit: "s", min: 0, max: 48 },
        { t: "Transition easing", art: "text", v: "--wa-transition-easing", ebene: "beide" },
      ] },
      { name: "Flaechen je Lautstaerke", felder: [
        { t: "Fehler laut gedrueckt", art: "farbe", v: "--ha-color-fill-danger-loud-active", ebene: "getrennt" },
        { t: "Fehler laut ueberfahren", art: "farbe", v: "--ha-color-fill-danger-loud-hover", ebene: "getrennt" },
        { t: "Fehler laut ruhend", art: "farbe", v: "--ha-color-fill-danger-loud-resting", ebene: "getrennt" },
        { t: "Fehler normal gedrueckt", art: "farbe", v: "--ha-color-fill-danger-normal-active", ebene: "getrennt" },
        { t: "Fehler normal ueberfahren", art: "farbe", v: "--ha-color-fill-danger-normal-hover", ebene: "getrennt" },
        { t: "Fehler normal ruhend", art: "farbe", v: "--ha-color-fill-danger-normal-resting", ebene: "getrennt" },
        { t: "Fehler leise gedrueckt", art: "farbe", v: "--ha-color-fill-danger-quiet-active", ebene: "getrennt" },
        { t: "Fehler leise ueberfahren", art: "farbe", v: "--ha-color-fill-danger-quiet-hover", ebene: "getrennt" },
        { t: "Fehler leise ruhend", art: "farbe", v: "--ha-color-fill-danger-quiet-resting", ebene: "getrennt" },
        { t: "Deaktiviert laut ueberfahren", art: "farbe", v: "--ha-color-fill-disabled-loud-hover", ebene: "getrennt" },
        { t: "Deaktiviert laut ruhend", art: "farbe", v: "--ha-color-fill-disabled-loud-resting", ebene: "getrennt" },
        { t: "Deaktiviert normal ueberfahren", art: "farbe", v: "--ha-color-fill-disabled-normal-hover", ebene: "getrennt" },
        { t: "Deaktiviert normal ruhend", art: "farbe", v: "--ha-color-fill-disabled-normal-resting", ebene: "getrennt" },
        { t: "Deaktiviert leise ueberfahren", art: "farbe", v: "--ha-color-fill-disabled-quiet-hover", ebene: "getrennt" },
        { t: "Deaktiviert leise ruhend", art: "farbe", v: "--ha-color-fill-disabled-quiet-resting", ebene: "getrennt" },
        { t: "Neutral laut gedrueckt", art: "farbe", v: "--ha-color-fill-neutral-loud-active", ebene: "getrennt" },
        { t: "Neutral laut ueberfahren", art: "farbe", v: "--ha-color-fill-neutral-loud-hover", ebene: "getrennt" },
        { t: "Neutral laut ruhend", art: "farbe", v: "--ha-color-fill-neutral-loud-resting", ebene: "getrennt" },
        { t: "Neutral normal gedrueckt", art: "farbe", v: "--ha-color-fill-neutral-normal-active", ebene: "getrennt" },
        { t: "Neutral normal ueberfahren", art: "farbe", v: "--ha-color-fill-neutral-normal-hover", ebene: "getrennt" },
        { t: "Neutral normal ruhend", art: "farbe", v: "--ha-color-fill-neutral-normal-resting", ebene: "getrennt" },
        { t: "Neutral leise gedrueckt", art: "farbe", v: "--ha-color-fill-neutral-quiet-active", ebene: "getrennt" },
        { t: "Neutral leise ueberfahren", art: "farbe", v: "--ha-color-fill-neutral-quiet-hover", ebene: "getrennt" },
        { t: "Neutral leise ruhend", art: "farbe", v: "--ha-color-fill-neutral-quiet-resting", ebene: "getrennt" },
        { t: "Primaer normal gedrueckt", art: "farbe", v: "--ha-color-fill-primary-normal-active", ebene: "getrennt" },
        { t: "Primaer leise gedrueckt", art: "farbe", v: "--ha-color-fill-primary-quiet-active", ebene: "getrennt" },
        { t: "Erfolg laut gedrueckt", art: "farbe", v: "--ha-color-fill-success-loud-active", ebene: "getrennt" },
        { t: "Erfolg laut ueberfahren", art: "farbe", v: "--ha-color-fill-success-loud-hover", ebene: "getrennt" },
        { t: "Erfolg laut ruhend", art: "farbe", v: "--ha-color-fill-success-loud-resting", ebene: "getrennt" },
        { t: "Erfolg normal gedrueckt", art: "farbe", v: "--ha-color-fill-success-normal-active", ebene: "getrennt" },
        { t: "Erfolg normal ueberfahren", art: "farbe", v: "--ha-color-fill-success-normal-hover", ebene: "getrennt" },
        { t: "Erfolg normal ruhend", art: "farbe", v: "--ha-color-fill-success-normal-resting", ebene: "getrennt" },
        { t: "Erfolg leise gedrueckt", art: "farbe", v: "--ha-color-fill-success-quiet-active", ebene: "getrennt" },
        { t: "Erfolg leise ueberfahren", art: "farbe", v: "--ha-color-fill-success-quiet-hover", ebene: "getrennt" },
        { t: "Erfolg leise ruhend", art: "farbe", v: "--ha-color-fill-success-quiet-resting", ebene: "getrennt" },
        { t: "Warnung laut gedrueckt", art: "farbe", v: "--ha-color-fill-warning-loud-active", ebene: "getrennt" },
        { t: "Warnung laut ueberfahren", art: "farbe", v: "--ha-color-fill-warning-loud-hover", ebene: "getrennt" },
        { t: "Warnung laut ruhend", art: "farbe", v: "--ha-color-fill-warning-loud-resting", ebene: "getrennt" },
        { t: "Warnung normal gedrueckt", art: "farbe", v: "--ha-color-fill-warning-normal-active", ebene: "getrennt" },
        { t: "Warnung normal ueberfahren", art: "farbe", v: "--ha-color-fill-warning-normal-hover", ebene: "getrennt" },
        { t: "Warnung normal ruhend", art: "farbe", v: "--ha-color-fill-warning-normal-resting", ebene: "getrennt" },
        { t: "Warnung leise gedrueckt", art: "farbe", v: "--ha-color-fill-warning-quiet-active", ebene: "getrennt" },
        { t: "Warnung leise ueberfahren", art: "farbe", v: "--ha-color-fill-warning-quiet-hover", ebene: "getrennt" },
        { t: "Warnung leise ruhend", art: "farbe", v: "--ha-color-fill-warning-quiet-resting", ebene: "getrennt" },
      ] },
      { name: "Schrift auf Flaechen", felder: [
        { t: "Fehler laut", art: "farbe", v: "--ha-color-on-danger-loud", ebene: "getrennt" },
        { t: "Fehler normal", art: "farbe", v: "--ha-color-on-danger-normal", ebene: "getrennt" },
        { t: "Fehler leise", art: "farbe", v: "--ha-color-on-danger-quiet", ebene: "getrennt" },
        { t: "Deaktiviert laut", art: "farbe", v: "--ha-color-on-disabled-loud", ebene: "getrennt" },
        { t: "Deaktiviert normal", art: "farbe", v: "--ha-color-on-disabled-normal", ebene: "getrennt" },
        { t: "Deaktiviert leise", art: "farbe", v: "--ha-color-on-disabled-quiet", ebene: "getrennt" },
        { t: "Neutral laut", art: "farbe", v: "--ha-color-on-neutral-loud", ebene: "getrennt" },
        { t: "Neutral normal", art: "farbe", v: "--ha-color-on-neutral-normal", ebene: "getrennt" },
        { t: "Neutral leise", art: "farbe", v: "--ha-color-on-neutral-quiet", ebene: "getrennt" },
        { t: "Primaer leise", art: "farbe", v: "--ha-color-on-primary-quiet", ebene: "getrennt" },
        { t: "Erfolg laut", art: "farbe", v: "--ha-color-on-success-loud", ebene: "getrennt" },
        { t: "Erfolg normal", art: "farbe", v: "--ha-color-on-success-normal", ebene: "getrennt" },
        { t: "Erfolg leise", art: "farbe", v: "--ha-color-on-success-quiet", ebene: "getrennt" },
        { t: "Surface default", art: "farbe", v: "--ha-color-on-surface-default", ebene: "getrennt" },
        { t: "Warnung laut", art: "farbe", v: "--ha-color-on-warning-loud", ebene: "getrennt" },
        { t: "Warnung normal", art: "farbe", v: "--ha-color-on-warning-normal", ebene: "getrennt" },
        { t: "Warnung leise", art: "farbe", v: "--ha-color-on-warning-quiet", ebene: "getrennt" },
      ] },
      { name: "Fokus", felder: [
        { t: "Outline Farbe", art: "farbe", v: "--outline-color", ebene: "getrennt" },
        { t: "Outline ueberfahren Farbe", art: "farbe", v: "--outline-hover-color", ebene: "getrennt" },
        { t: "Offset", art: "mass", v: "--wa-focus-ring-offset", ebene: "beide", min: 0, max: 48 },
        { t: "Style", art: "text", v: "--wa-focus-ring-style", ebene: "beide" },
        { t: "Width", art: "mass", v: "--wa-focus-ring-width", ebene: "beide", min: 0, max: 48 },
      ] },
    ] },

  { n: 5, titel: "Symbole", kurz: "Form, Groesse, Zustandsfarben",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Rundung erbt durch jede Shadow-Grenze: ein Wert erreicht Kacheln,
      // Mushroom, Zeilen und Glance zugleich, ohne einen einzigen Pfad.
      { name: "Form", felder: [
        { t: "Kachel", art: "mass", v: "--ha-tile-icon-border-radius", ebene: "beide", min: 0, max: 24 },
        { t: "Abzeichen", art: "mass", v: "--state-badge-border-radius", ebene: "beide", min: 0, max: 24 },
        { t: "Mushroom", art: "mass", v: "--mush-icon-border-radius", ebene: "beide", min: 0, max: 24 } ] },
      { name: "Groesse", felder: [
        { t: "Symbolgroesse", art: "mass", v: "--mdc-icon-size", ebene: "beide", min: 12, max: 48 },
        { t: "Knopfgroesse", art: "mass", v: "--ha-icon-button-size", ebene: "beide", min: 24, max: 64 } ] },
      { name: "Zustand", felder: [
        { t: "Aktiv", art: "farbe", v: "--state-active-color", ebene: "getrennt" },
        { t: "Inaktiv", art: "farbe", v: "--state-inactive-color", ebene: "getrennt" },
        { t: "Symbolfarbe", art: "farbe", v: "--state-icon-color", ebene: "beide" } ] },
      // Die klassischen Toene sind modusunabhaengig und die einzige Quelle
      // fuer Farbvielfalt - HAs neue Ebene hat nur fuenf.
      { name: "Toene", felder: [
        { t: "Gelb", art: "farbe", v: "--yellow-color", ebene: "beide", sync: { mush: "--mush-rgb-yellow" } },
        { t: "Tuerkis", art: "farbe", v: "--teal-color", ebene: "beide", sync: { mush: "--mush-rgb-teal" } },
        { t: "Violett", art: "farbe", v: "--purple-color", ebene: "beide", sync: { mush: "--mush-rgb-purple" } },
        { t: "Bernstein", art: "farbe", v: "--amber-color", ebene: "beide", sync: { mush: "--mush-rgb-amber" } } ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Zustandsfarben", felder: [
        { t: "Black Farbe", art: "farbe", v: "--black-color", ebene: "beide" },
        { t: "Dunkel grey Farbe", art: "farbe", v: "--dark-grey-color", ebene: "beide" },
        { t: "History unavailable Farbe", art: "text", v: "--history-unavailable-color", ebene: "beide" },
        { t: "Label badge grey", art: "farbe", v: "--label-badge-grey", ebene: "beide" },
        { t: "Hell grey Farbe", art: "farbe", v: "--light-grey-color", ebene: "beide" },
        { t: "State weather snowy Farbe", art: "farbe", v: "--state-weather-snowy-color", ebene: "beide" },
        { t: "White Farbe", art: "farbe", v: "--white-color", ebene: "beide" },
      ] },
    ] },

  { n: 6, titel: "Fremde Karten", kurz: "Bubble Card und Mushroom anbinden",
    marke: "#c2c8d2", stand: "wartet",
    aktion: { name: "Alle anbinden", tut: "zuordnung" },
    gruppen: [
      // Hier stehen Verweise, keine Farben: ein Eintrag wie
      // var(--ha-card-background) gilt in beiden Modi zugleich. Das ist der
      // ganze Gewinn - Fremdfelder, die sich von selbst mitaendern.
      { name: "Bubble Flaechen", felder: [
        { t: "Karte", art: "text", v: "--bubble-main-background-color", ebene: "beide", platzhalter: "var(--ha-card-background)" },
        { t: "Knopf", art: "text", v: "--bubble-button-background-color", ebene: "beide", platzhalter: "var(--ha-color-fill-neutral-quiet-resting)" },
        { t: "Pop-up", art: "text", v: "--bubble-pop-up-main-background-color", ebene: "beide", platzhalter: "var(--ha-dialog-surface-background)" } ] },
      { name: "Bubble Zustand", felder: [
        { t: "Akzent", art: "text", v: "--bubble-accent-color", ebene: "beide", platzhalter: "var(--accent-color)" },
        { t: "Licht", art: "text", v: "--bubble-light-color", ebene: "beide", platzhalter: "var(--ha-color-orange-60)" },
        { t: "Symbol", art: "text", v: "--bubble-icon-color", ebene: "beide", platzhalter: "var(--ha-color-on-surface-default)" } ] },
      // Mushroom rechnet mit Tripeln. Ein var(--rgb-...) gehoert hinein,
      // keine Farbe - rgb(var(--mush-rgb-red)) braucht Zahlen.
      { name: "Mushroom Tripel", felder: [
        { t: "Rot", art: "text", v: "--mush-rgb-red", ebene: "beide", platzhalter: "var(--rgb-ha-color-red-60)" },
        { t: "Gruen", art: "text", v: "--mush-rgb-green", ebene: "beide", platzhalter: "var(--rgb-ha-color-green-60)" },
        { t: "Orange", art: "text", v: "--mush-rgb-orange", ebene: "beide", platzhalter: "var(--rgb-ha-color-orange-60)" },
        { t: "Blau", art: "text", v: "--mush-rgb-blue", ebene: "beide", platzhalter: "var(--rgb-ha-color-primary-60)" } ] },
      { name: "Mushroom Masse", felder: [
        { t: "Symbol", art: "mass", v: "--mush-icon-size", ebene: "beide", min: 16, max: 56 },
        { t: "Chip", art: "mass", v: "--mush-chip-height", ebene: "beide", min: 20, max: 64 },
        { t: "Abstand", art: "mass", v: "--mush-spacing", ebene: "beide", min: 0, max: 32 } ] },
    ] },

  { n: 7, titel: "Feinschliff", kurz: "Karte, Diagramme, Energie, Code-Editor, Glas",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Die Kartentokens haben alle eine LEERE Vorgabe: ein Wert dort nagelt
      // jede Theme auf eine Kartenfarbe fest. Leer heisst, HA behaelt seine
      // eigene Kartografie.
      { name: "Vektorkarte", felder: [
        { t: "Land", art: "farbe", v: "--ha-color-map-land", ebene: "getrennt" },
        { t: "Wasser", art: "farbe", v: "--ha-color-map-water", ebene: "getrennt" },
        { t: "Strassen", art: "farbe", v: "--ha-color-map-road", ebene: "getrennt" } ] },
      { name: "Diagramme", felder: [
        { t: "Erste Reihe", art: "farbe", v: "--color-1", ebene: "beide" },
        { t: "Zweite Reihe", art: "farbe", v: "--color-2", ebene: "beide" },
        { t: "Dritte Reihe", art: "farbe", v: "--color-3", ebene: "beide" } ] },
      { name: "Code-Editor", felder: [
        { t: "Schluesselwort", art: "farbe", v: "--codemirror-keyword", ebene: "getrennt" },
        { t: "Zeichenkette", art: "farbe", v: "--codemirror-string", ebene: "getrennt" },
        { t: "Kommentar", art: "farbe", v: "--codemirror-comment", ebene: "getrennt" } ] },
      // Die Weichzeichnung der Karten steht in Stufe 2, wo auch die
      // Kartenflaeche steht - zwei Stufen, die dieselbe Variable schreiben,
      // widersprechen sich.
      //
      // Die Dialogflaeche bekommt bewusst KEIN Feld: ein backdrop-filter auf
      // ihr macht den Dialog zum Bezugsrahmen fuer position:fixed, und die
      // Auswahllisten darin landen neben dem Bildschirm. Der Schleier davor
      // darf dagegen weichzeichnen.
      { name: "Glas", felder: [
        { t: "Kopfleiste", art: "text", v: "--app-header-backdrop-filter", ebene: "beide",
          platzhalter: "blur(18px) saturate(1.6)" },
        { t: "Dialogschleier", art: "text", v: "--ha-dialog-scrim-backdrop-filter", ebene: "beide",
          platzhalter: "blur(2px)" } ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Code-Editor", felder: [
        { t: "Atom", art: "farbe", v: "--codemirror-atom", ebene: "getrennt" },
        { t: "Attribute", art: "farbe", v: "--codemirror-attribute", ebene: "getrennt" },
        { t: "Builtin", art: "farbe", v: "--codemirror-builtin", ebene: "getrennt" },
        { t: "Def", art: "farbe", v: "--codemirror-def", ebene: "getrennt" },
        { t: "Meta", art: "farbe", v: "--codemirror-meta", ebene: "getrennt" },
        { t: "Number", art: "farbe", v: "--codemirror-number", ebene: "getrennt" },
        { t: "Operator", art: "farbe", v: "--codemirror-operator", ebene: "getrennt" },
        { t: "Property", art: "farbe", v: "--codemirror-property", ebene: "getrennt" },
        { t: "Qualifier", art: "farbe", v: "--codemirror-qualifier", ebene: "getrennt" },
        { t: "String 2", art: "farbe", v: "--codemirror-string-2", ebene: "getrennt" },
        { t: "Tag", art: "farbe", v: "--codemirror-tag", ebene: "getrennt" },
        { t: "Type", art: "farbe", v: "--codemirror-type", ebene: "getrennt" },
        { t: "Variable", art: "farbe", v: "--codemirror-variable", ebene: "getrennt" },
        { t: "Variable 2", art: "farbe", v: "--codemirror-variable-2", ebene: "getrennt" },
        { t: "Variable 3", art: "farbe", v: "--codemirror-variable-3", ebene: "getrennt" },
      ] },
      { name: "Diagrammfarben", felder: [
        { t: "10", art: "farbe", v: "--color-10", ebene: "beide" },
        { t: "11", art: "farbe", v: "--color-11", ebene: "beide" },
        { t: "12", art: "farbe", v: "--color-12", ebene: "beide" },
        { t: "13", art: "farbe", v: "--color-13", ebene: "beide" },
        { t: "14", art: "farbe", v: "--color-14", ebene: "beide" },
        { t: "15", art: "farbe", v: "--color-15", ebene: "beide" },
        { t: "16", art: "farbe", v: "--color-16", ebene: "beide" },
        { t: "17", art: "farbe", v: "--color-17", ebene: "beide" },
        { t: "18", art: "farbe", v: "--color-18", ebene: "beide" },
        { t: "19", art: "farbe", v: "--color-19", ebene: "beide" },
        { t: "20", art: "farbe", v: "--color-20", ebene: "beide" },
        { t: "21", art: "farbe", v: "--color-21", ebene: "beide" },
        { t: "22", art: "farbe", v: "--color-22", ebene: "beide" },
        { t: "23", art: "farbe", v: "--color-23", ebene: "beide" },
        { t: "24", art: "farbe", v: "--color-24", ebene: "beide" },
        { t: "25", art: "farbe", v: "--color-25", ebene: "beide" },
        { t: "26", art: "farbe", v: "--color-26", ebene: "beide" },
        { t: "27", art: "farbe", v: "--color-27", ebene: "beide" },
        { t: "28", art: "farbe", v: "--color-28", ebene: "beide" },
        { t: "29", art: "farbe", v: "--color-29", ebene: "beide" },
        { t: "30", art: "farbe", v: "--color-30", ebene: "beide" },
        { t: "31", art: "farbe", v: "--color-31", ebene: "beide" },
        { t: "32", art: "farbe", v: "--color-32", ebene: "beide" },
        { t: "33", art: "farbe", v: "--color-33", ebene: "beide" },
        { t: "34", art: "farbe", v: "--color-34", ebene: "beide" },
        { t: "35", art: "farbe", v: "--color-35", ebene: "beide" },
        { t: "36", art: "farbe", v: "--color-36", ebene: "beide" },
        { t: "37", art: "farbe", v: "--color-37", ebene: "beide" },
        { t: "38", art: "farbe", v: "--color-38", ebene: "beide" },
        { t: "39", art: "farbe", v: "--color-39", ebene: "beide" },
        { t: "4", art: "farbe", v: "--color-4", ebene: "beide" },
        { t: "40", art: "farbe", v: "--color-40", ebene: "beide" },
        { t: "41", art: "farbe", v: "--color-41", ebene: "beide" },
        { t: "42", art: "farbe", v: "--color-42", ebene: "beide" },
        { t: "43", art: "farbe", v: "--color-43", ebene: "beide" },
        { t: "44", art: "farbe", v: "--color-44", ebene: "beide" },
        { t: "45", art: "farbe", v: "--color-45", ebene: "beide" },
        { t: "46", art: "farbe", v: "--color-46", ebene: "beide" },
        { t: "47", art: "farbe", v: "--color-47", ebene: "beide" },
        { t: "48", art: "farbe", v: "--color-48", ebene: "beide" },
        { t: "49", art: "farbe", v: "--color-49", ebene: "beide" },
        { t: "5", art: "farbe", v: "--color-5", ebene: "beide" },
        { t: "50", art: "farbe", v: "--color-50", ebene: "beide" },
        { t: "51", art: "farbe", v: "--color-51", ebene: "beide" },
        { t: "52", art: "farbe", v: "--color-52", ebene: "beide" },
        { t: "53", art: "farbe", v: "--color-53", ebene: "beide" },
        { t: "54", art: "farbe", v: "--color-54", ebene: "beide" },
        { t: "6", art: "farbe", v: "--color-6", ebene: "beide" },
        { t: "7", art: "farbe", v: "--color-7", ebene: "beide" },
        { t: "8", art: "farbe", v: "--color-8", ebene: "beide" },
        { t: "9", art: "farbe", v: "--color-9", ebene: "beide" },
      ] },
      { name: "Energie", felder: [
        { t: "Battery in Farbe", art: "farbe", v: "--energy-battery-in-color", ebene: "beide" },
        { t: "Battery out Farbe", art: "farbe", v: "--energy-battery-out-color", ebene: "beide" },
        { t: "Gas Farbe", art: "farbe", v: "--energy-gas-color", ebene: "beide" },
        { t: "Grid consumption Farbe", art: "farbe", v: "--energy-grid-consumption-color", ebene: "beide" },
        { t: "Grid return Farbe", art: "farbe", v: "--energy-grid-return-color", ebene: "getrennt" },
        { t: "Non fossil Farbe", art: "farbe", v: "--energy-non-fossil-color", ebene: "beide" },
        { t: "Solar Farbe", art: "farbe", v: "--energy-solar-color", ebene: "beide" },
        { t: "Water Farbe", art: "farbe", v: "--energy-water-color", ebene: "beide" },
      ] },
      { name: "Karte und Reste", felder: [
        { t: "Map filter", art: "text", v: "--map-filter", ebene: "getrennt" },
        { t: "Linear progress buffer Farbe", art: "farbe", v: "--mdc-linear-progress-buffer-color", ebene: "getrennt" },
        { t: "Ripple Farbe", art: "farbe", v: "--mdc-ripple-color", ebene: "getrennt" },
      ] },
    ] },

  { n: 8, titel: "Ausgabe", kurz: "Pruefen, Bericht, Textrichtung, Theme schreiben",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      { name: "Pruefen", felder: [
        { t: "YAML gueltig", art: "bericht", bericht: "yaml" },
        { t: "Zweiter Durchlauf gleich", art: "bericht", bericht: "idempotent" },
        { t: "Felder mit Wert", art: "bericht", bericht: "gefuellt" } ] },
      { name: "Bericht", felder: [
        { t: "Geaenderte Felder", art: "bericht", bericht: "geaendert" },
        { t: "Felder insgesamt", art: "bericht", bericht: "gesamt" } ] },
      { name: "Schreiben", felder: [
        { t: "Dateiname", art: "bericht", bericht: "dateiname" },
        { t: "Ziel", art: "bericht", bericht: "ziel" } ] },
      { name: "Sicherung", felder: [
        { t: "Grundlage", art: "bericht", bericht: "grundlage" } ] },

      // --- Ergaenzt am 12.10.2026: die restlichen Felder der Grundlage. ---
      // Art und Ebene sind aus ha-blanko.yaml ABGELEITET, nicht getippt: die
      // Art aus der Form des Wertes (#hex -> Farbe, 18px -> Mass, 0.5 -> Zahl),
      // die Ebene daraus, ob das Feld unter modes steht. Bei dieser Menge ist
      // das der einzige Weg ohne Tippfehler - der Generator liegt im
      // Scratchpad, die Pruefung in tests/hats-stufen.test.js.
      { name: "Textrichtung", felder: [
        { t: "Direction", art: "text", v: "--direction", ebene: "beide" },
        { t: "Float end", art: "text", v: "--float-end", ebene: "beide" },
        { t: "Float start", art: "text", v: "--float-start", ebene: "beide" },
        { t: "Ha moz osx font smoothing", art: "text", v: "--ha-moz-osx-font-smoothing", ebene: "beide" },
        { t: "Margin title ltr", art: "text", v: "--margin-title-ltr", ebene: "beide" },
        { t: "Margin title rtl", art: "text", v: "--margin-title-rtl", ebene: "beide" },
      ] },
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
    "Womit faengst du an?": "Where do you want to start?",
    "Eine neue Theme oder eine vorhandene weiterbauen": "A new theme, or carry on with an existing one",
    "Neue Theme": "New theme",
    "Leere Grundlage auf HA 2026.10, ohne Altlasten": "Blank base on HA 2026.10, no legacy fields",
    "Vorhandene oeffnen": "Open an existing one",
    "Diese Dateien hat HATS gebaut": "These files were built with HATS",
    "Noch keine - die erste entsteht beim Speichern": "None yet - the first appears when you save",
    "Mit HATS gebaut": "Built with HATS",
    "oeffnen": "open",
    "Mit einem anderen Werkzeug gebaut - der Import dafuer kommt spaeter:": "Built with another tool - importing those comes later:",
    "Kein HATS-Kopf in der Datei": "No HATS header in the file",
    "Lade...": "Loading...",
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
    "Beide Modi": "Both modes", "Alle anbinden": "Wire up all",
    "Zuordnungen eingetragen": "mappings written", "Toene": "tones", "Aenderungen": "changes", "Speichern": "Save",
    "Grundlage nicht geladen: ": "Base not loaded: ",
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

// Der Zustand liegt NEBEN der Instanz, nicht darin. Home Assistant erzeugt das
// Panel bei jedem Wechsel der Seite neu - mit dem Zustand in der Instanz waere
// jede Aenderung weg, sobald jemand kurz woanders hinklickt. Am 12.10.2026
// genau so gemessen: gleiche Instanz blieb stabil, aber nach einer Navigation
// war das Modell null, waehrend das Eingabefeld seinen Text noch trug.
const ZUSTAND = {
  // Solange true, ist noch nichts gewaehlt: weder Vorlage noch vorhandene
  // Datei. Vorher eine Grundlage zu laden waere bequem und falsch - wer
  // danach eine Datei oeffnet, haette die Vorlage schon drunterliegen.
  start: true,
  dateien: null,     // null = noch nicht geholt, [] = geholt und leer
  modell: null,
  name: "",
  geaendert: new Set(),
  ladefehler: null,
  meldung: null,     // { text, art } - ueberlebt das Neuzeichnen
  meta: { Grundlage: "ha_blanko", Modus: "beide" },
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
    if (!this._gezeichnet) {
      this._gezeichnet = true;
      this.zeichne();
      // Nur beim ersten Mal - ein Seitenwechsel darf die Arbeit nicht
      // wegwerfen. Geladen wird jetzt nichts von allein: erst fragen, womit
      // angefangen wird.
      if (ZUSTAND.start && ZUSTAND.dateien === null) this.ladeListe();
    }
  }

  // Die Grundlage ist ha_blanko: HA 2026.10 ohne Altlasten. Alles, was der
  // Nutzer einstellt, wird darauf gelegt - nicht auf eine gewachsene Theme,
  // in der niemand mehr weiss, was woher kommt.
  async ladeGrundlage() {
    try {
      const r = await this._hass.connection.sendMessagePromise({
        type: "hats/load_theme_file", filename: "ha_blanko.yaml" });
      const m = leseTheme(r.content || "");
      ZUSTAND.modell = m.fehler ? leeresModell("neu") : m;
      this._grundlage = JSON.parse(JSON.stringify(ZUSTAND.modell));
    } catch (e) {
      // Ohne Grundlage wird nicht geraten, sondern leer begonnen - und gesagt.
      ZUSTAND.modell = leeresModell("neu");
      this._grundlage = JSON.parse(JSON.stringify(ZUSTAND.modell));
      ZUSTAND.ladefehler = String(e.message || e.code || e);
    }
    this.zeichne();
  }

  // Das Startbild: zwei Wege, und darunter die vorhandenen Dateien.
  startbild(T) {
    const d = ZUSTAND.dateien;
    if (d === null) return `<div class="liste"><p class="leer">${T("Lade...")}</p></div>`;

    const meine = d.filter((x) => x.hats && x.name !== "ha_blanko.yaml");
    const fremde = d.filter((x) => !x.hats && x.name !== "ha_blanko.yaml");
    const kb = (n) => (n < 1024 ? n + " B" : Math.round(n / 1024) + " kB");

    return `
      <div class="startwege">
        <button class="weg neu">
          <span class="wegtitel">${T("Neue Theme")}</span>
          <span class="wegtext">${T("Leere Grundlage auf HA 2026.10, ohne Altlasten")}</span>
        </button>
        <div class="weg ${meine.length ? "" : "aus"}">
          <span class="wegtitel">${T("Vorhandene oeffnen")}</span>
          <span class="wegtext">${meine.length
            ? T("Diese Dateien hat HATS gebaut")
            : T("Noch keine - die erste entsteht beim Speichern")}</span>
        </div>
      </div>

      ${meine.length ? `<div class="liste schmal">
        ${meine.map((x) => `
          <div class="zeile datei" data-datei="${x.name}">
            <span class="punkt"></span>
            <div class="zeilentext">
              <b>${x.name.replace(/\.yaml$/, "")}</b>
              <small>${x.kopf || T("Mit HATS gebaut")} &middot; ${kb(x.bytes)}</small>
            </div>
            <span class="stempel">${T("oeffnen")}</span>
          </div>`).join("")}
      </div>` : ""}

      ${fremde.length ? `<div class="liste schmal fremd">
        <p class="leer">${T("Mit einem anderen Werkzeug gebaut - der Import dafuer kommt spaeter:")}</p>
        ${fremde.map((x) => `
          <div class="zeile datei gesperrt" title="${T("Kein HATS-Kopf in der Datei")}">
            <span class="punkt"></span>
            <div class="zeilentext"><b>${x.name.replace(/\.yaml$/, "")}</b><small>${kb(x.bytes)}</small></div>
          </div>`).join("")}
      </div>` : ""}
    `;
  }

  // Die Liste der vorhandenen Themes. Der Server sagt je Datei, ob sie von
  // HATS stammt - erkannt am Kopf, den schreibeTheme hineinschreibt.
  async ladeListe() {
    try {
      const r = await this._hass.connection.sendMessagePromise({ type: "hats/list_themes" });
      ZUSTAND.dateien = r.dateien || [];
    } catch (e) {
      // Ohne Liste bleibt der Weg ueber die Vorlage offen - das wird gesagt,
      // nicht verschwiegen.
      ZUSTAND.dateien = [];
      ZUSTAND.ladefehler = String(e.message || e.code || e);
    }
    this.zeichne();
  }

  // Eine vorhandene Theme oeffnen. Nur solche, die HATS selbst gebaut hat:
  // Eine fremde Datei kann Felder und Stilziele tragen, die dieses Werkzeug
  // nicht kennt, und beim naechsten Speichern waeren sie weg. Der Import
  // fremder Dateien kommt spaeter und braucht einen Bericht, was passiert.
  async oeffneDatei(name) {
    try {
      const r = await this._hass.connection.sendMessagePromise({
        type: "hats/load_theme_file", filename: name });
      const m = leseTheme(r.content || "");
      if (m.fehler) throw new Error(m.fehler);
      ZUSTAND.modell = m;
      ZUSTAND.name = m.name || name.replace(/\.yaml$/, "");
      ZUSTAND.meta.Grundlage = name.replace(/\.yaml$/, "");
      // Die Grundlage zum Vergleichen ist hier die Datei selbst - "geaendert"
      // heisst ab jetzt: anders als beim Oeffnen.
      this._grundlage = JSON.parse(JSON.stringify(m));
      ZUSTAND.geaendert.clear();
      ZUSTAND.start = false;
      ZUSTAND.meldung = { text: `Geoeffnet: ${name}`, art: "gut" };
    } catch (e) {
      ZUSTAND.meldung = { text: "Nicht geoeffnet: " + (e.message || e.code || e), art: "fehler" };
    }
    this.zeichne();
  }

  async neuBeginnen() {
    await this.ladeGrundlage();
    ZUSTAND.name = "";
    ZUSTAND.meta.Grundlage = "ha_blanko";
    ZUSTAND.geaendert.clear();
    ZUSTAND.start = false;
    this.zeichne();
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
                <h1>${ZUSTAND.start ? T("Womit faengst du an?") : T("Guten Tag")}</h1>
                <p>${ZUSTAND.start ? T("Eine neue Theme oder eine vorhandene weiterbauen") : T("Dein Theme im Überblick")}</p>
              </div>
              ${ZUSTAND.start ? "" : `
              <div class="sichern">
                <input class="namensfeld" type="text" value="${ZUSTAND.name || ""}"
                       placeholder="${T("Name der Theme")}" spellcheck="false">
                <span class="zaehlerbox"><b class="zaehler">${ZUSTAND.geaendert.size}</b> ${T("Aenderungen")}</span>
                <button class="speichern">${T("Speichern")}</button>
              </div>`}
            </header>

            ${ZUSTAND.start ? "" : `
            <div class="kennzahlen">
              <div class="kennzahl"><b>${fertig}/${STUFEN.length}</b><span>${T("Stufen fertig")}</span></div>
              <div class="kennzahl"><b>${felderGesamt}</b><span>${T("Felder")}</span></div>
              <div class="kennzahl"><b>${T("gerade eben")}</b><span>${T("zuletzt geändert")}</span></div>
            </div>`}

            <p class="meldung ${ZUSTAND.meldung ? ZUSTAND.meldung.art : ""}">${ZUSTAND.ladefehler ? T("Grundlage nicht geladen: ") + ZUSTAND.ladefehler : (ZUSTAND.meldung ? ZUSTAND.meldung.text : "")}</p>

            ${ZUSTAND.start ? this.startbild(T) : `
            <div class="liste">
              ${STUFEN.map((s, i) => this.zeile(s, i, T)).join("")}
            </div>`}
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

    const nf = this.shadowRoot.querySelector(".namensfeld");
    if (nf) nf.addEventListener("input", () => { ZUSTAND.name = nf.value.trim(); });
    const sp = this.shadowRoot.querySelector(".speichern");
    if (sp) sp.addEventListener("click", () => this.speichern());

    const neuKnopf = this.shadowRoot.querySelector(".weg.neu");
    if (neuKnopf) neuKnopf.addEventListener("click", () => this.neuBeginnen());
    this.shadowRoot.querySelectorAll(".zeile.datei:not(.gesperrt)").forEach((z) =>
      z.addEventListener("click", () => this.oeffneDatei(z.dataset.datei))
    );

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
        ${st.aktion ? `<button class="aktion" data-tut="${st.aktion.tut}">${T(st.aktion.name)}</button>` : ""}
        <div class="umschalter" role="group" aria-label="${T("Ansicht")}">
          ${ANSICHTEN.map((a) => `<button data-ansicht="${a.id}" class="${a.id === this._ansicht ? "an" : ""}">${T(a.name)}</button>`).join("")}
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="brett ${kachelbrett ? "spaltig" : ""}">
        ${st.gruppen.map((g) => (kachelbrett ? this.spalte(st, g, T) : this.gruppe(st, g, T))).join("")}
      </div>`;
    d.querySelector(".zu").addEventListener("click", () => this.schliesse());
    const ak = d.querySelector(".aktion");
    if (ak) ak.addEventListener("click", () => {
      const n = this.zuordnungAnwenden();
      ZUSTAND.meldung = { text: `${n} ${T("Zuordnungen eingetragen")} (${ANZAHL.bubble} Bubble, ${ANZAHL.mushroom} Mushroom, ${ANZAHL.toene} ${T("Toene")})`, art: "gut" };
      this.zeichneDialog();
      this.zeichneZaehler();
    });
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
  // Hell und Dunkel kommen aus dem MODELL, nicht aus der laufenden Theme.
  // Bis zum 12.10.2026 stand hier hass.themes.themes[...] - also das, was
  // Home Assistant gerade anwendet. Das ist etwas voellig anderes als das,
  // was gerade gebaut wird: Wer eine Theme oeffnet, waehrend eine andere
  // aktiv ist, bekam fremde Werte angezeigt und haette sie fuer seine
  // gehalten.
  werteJeModus(f) {
    if (!f.v || !ZUSTAND.modell) return null;
    const m = ZUSTAND.modell;
    const name = f.v.replace(/^--/, "");
    const hell = m.light[name] !== undefined ? m.light[name] : m.flach[name];
    const dunkel = m.dark[name] !== undefined ? m.dark[name] : m.flach[name];
    const wo = m.flach[name] !== undefined ? "flach"
             : m.light[name] !== undefined || m.dark[name] !== undefined ? "je Modus" : null;
    return { hell, dunkel, wo };
  }

  oeffneFeld(st, schluessel) {
    const T = (s) => t(s, this.spr);
    let g = null, idx = -1;
    for (const gr of st.gruppen) {
      const i = gr.felder.findIndex((x) => (x.v || x.t) === schluessel);
      if (i >= 0) { g = gr; idx = i; break; }
    }
    if (!g) return;
    this._feld = { st, g, idx };

    const f = g.felder[idx];

    // Der Modus gehoert zum FELD, nicht zum Dialog. Bis zum 12.10.2026 stand
    // die Zuweisung weiter unten, NACH dem Zeichnen, und sie war
    // bedingungslos: Der Umschalter setzte "dark", loeste ein Neuzeichnen aus
    // - und das machte die Wahl sofort wieder zunichte. Ueber die Oberflaeche
    // liess sich damit kein einziger Dunkel-Wert setzen, weil aendere() den
    // Modus aus genau dieser Eigenschaft liest.
    // Nicht "schluessel" nennen - so heisst schon der Parameter dieser
    // Methode, und eine zweite Deklaration im selben Gueltigkeitsbereich ist
    // ein SyntaxError. Die Datei laedt dann gar nicht mehr.
    const feldId = f.v || f.t;
    if (this._feldModusFuer !== feldId) {
      this._feldModus = f.ebene === "getrennt" ? "light" : "beide";
      this._feldModusFuer = feldId;
    }

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
          // "Jetzt in Kraft" ist am 12.10.2026 entfallen. Die Zeile zeigte,
          // was Home Assistant GERADE anwendet - eine andere Theme also,
          // sobald man an einer arbeitet, die nicht aktiv ist. Sie stand
          // ueber Hell und Dunkel und sah damit aus wie der gueltige Wert.
          const modi = je ? `
            <div class="modus" data-modus="hell">
              <span class="mlabel">${T("Hell")}</span>
              <div class="mwert">${probe(je.hell)}<code class="${je.hell === undefined ? "leer" : ""}">${je.hell === undefined ? T("nicht gesetzt") : je.hell}</code></div>
            </div>
            <div class="modus" data-modus="dunkel">
              <span class="mlabel">${T("Dunkel")}</span>
              <div class="mwert">${probe(je.dunkel)}<code class="${je.dunkel === undefined ? "leer" : ""}">${je.dunkel === undefined ? T("nicht gesetzt") : je.dunkel}</code></div>
            </div>` : "";
          return `<div class="modusliste">${modi}</div>`;
        })()}
        ${this.streifen(f, T)}
        ${f.art === "bericht" ? "" : `
        <div class="einstellen">
          <span class="mlabel">${T("Einstellen")}</span>
          ${fuerFeld(f, (() => {
            // Der Regler startet bei dem Wert, den dieses Feld IM MODELL hat,
            // und zwar fuer den Modus, der oben gewaehlt ist. Alles andere
            // waere ein Startwert aus einer fremden Theme.
            if (!je) return w.farbe || (w.leer ? "" : w.text);
            const v = this._feldModus === "dark" ? je.dunkel : je.hell;
            return v === undefined ? "" : v;
          })())}
        </div>`}
        ${f.rolle ? `<div class="rampe" data-rampe>${this.rampeHtml(f, w.farbe)}</div>
        <p class="herkunft">${T("Diese eine Farbe setzt elf Palettenstufen — HA nimmt die kraeftige Flaeche aus 40, die Ueberfahr-Stufe aus 30, die leise aus 95.")}</p>` : ""}
        <p class="noch">${T("Geaendert wird im Fenster, geschrieben noch nicht.")}</p>
      </div>`;

    d.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    const v = d.querySelector(".vor"), z = d.querySelector(".zurueck");
    if (v) v.addEventListener("click", () => this.oeffneFeld(st, g.felder[idx - 1].v || g.felder[idx - 1].t));
    if (z) z.addEventListener("click", () => this.oeffneFeld(st, g.felder[idx + 1].v || g.felder[idx + 1].t));

    binde(d, (id, wert) => {
      // Der Modus-Umschalter liefert ein Objekt, kein Wert.
      if (wert && typeof wert === "object" && wert.modus) { this._feldModus = wert.modus; this.oeffneFeld(st, f.v || f.t); return; }
      if (f.rolle) {
        const r = d.querySelector("[data-rampe]");
        if (r) r.innerHTML = this.rampeHtml(f, wert);
      }
      const aus = d.querySelector(`[data-be-aus="${CSS.escape(id)}"]`);
      if (aus && wert === null) {
        if (aus.tagName === "INPUT") aus.value = ""; else aus.textContent = T("nicht gesetzt");
      }
      this.aendere(f, wert);
      // Hell und Dunkel gleich nachziehen. Stehen sie auf dem alten Wert,
      // waehrend unten der neue steht, ist das genau die Verwirrung, wegen der
      // "Jetzt in Kraft" entfallen ist - nur eine Zeile tiefer.
      const neu = this.werteJeModus(f);
      if (neu) for (const [schl, v] of [["hell", neu.hell], ["dunkel", neu.dunkel]]) {
        const zeile = d.querySelector(`.modus[data-modus="${schl}"] .mwert`);
        if (!zeile) continue;
        const istFarbe = v && /^#|^rgba?\(|^hsla?\(/.test(String(v));
        zeile.innerHTML = `${istFarbe ? `<span class="probe gross" style="background:${v}"></span>` : ""}`
          + `<code class="${v === undefined ? "leer" : ""}">${v === undefined ? T("nicht gesetzt") : v}</code>`;
      }
      this.zeichneZaehler();
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
      // Erst das Modell fragen: steht dort ein Verweis auf UNSER Feld, ist die
      // Anbindung da - unabhaengig davon, ob die Theme schon geladen ist. Das
      // berechnete CSS zeigt die AKTIVE Theme, nicht die, die gerade gebaut
      // wird; allein darauf zu schauen liesse die Ampel grau, obwohl alles
      // eingetragen ist.
      const imModell = this.modellWert(variable.replace(/^--/, ""));
      let stand = "leer";
      let quelle;
      if (imModell !== undefined && imModell !== "") {
        // Die Zuordnung zeigt oft nicht auf die Rampenstufe selbst, sondern
        // auf etwas, das daraus abgeleitet ist: --bubble-accent-color steht
        // auf var(--ha-color-fill-primary-normal-resting), und das IST die
        // Primaerfarbe - nur eine Ebene weiter. Ein Vergleich auf den exakten
        // Namen meldete dort eine Luecke, wo keine ist. Bei einer Rolle zaehlt
        // deshalb die Familie, sonst der Name.
        const eigenName = (f.v || "").replace(/^--/, "");
        const familie = /^ha-color-(primary|neutral|red|green|orange)-/.exec(eigenName);
        const zeigtAufUns = familie
          ? new RegExp(`var\\(\\s*--[a-z-]*${familie[1]}\\b`).test(imModell)
          : new RegExp(`var\\(\\s*--(?:rgb-)?${eigenName}\\b`).test(imModell);
        stand = zeigtAufUns ? "an" : "aus";
        quelle = imModell;
      } else {
        const berechnet = cs.getPropertyValue(variable).trim().toLowerCase();
        quelle = berechnet;
        if (berechnet) {
          const soll = name === "mush" ? alsTripel(eigen) : eigen;
          stand = soll && berechnet.replace(/\s+/g, "") === soll.replace(/\s+/g, "") ? "an" : "aus";
        }
      }
      aus.push({ name: anzeige, stand,
                 titel: `${variable}: ${quelle || "nicht gesetzt"}` });
    }
    return aus;
  }

  streifen(f, T) {
    if (f.meta) return "";
    const beide = f.ebene !== "getrennt";
    return infostreifen({
      id: f.v || f.t,
      // Nicht fest "light": sonst springt die Markierung beim Umschalten
      // zurueck, und man sieht nicht, in welchen Modus man gerade schreibt.
      modus: beide ? "beide" : (this._feldModus === "dark" ? "dark" : "light"),
      // Ein Feld, das flach steht, gilt in beiden Modi - die Wahl waere eine
      // Luege. Deshalb hier nur ein Knopf, und der ist gesetzt.
      modi: beide ? [{ wert: "beide", name: T("Beide Modi") }]
                  : [{ wert: "light", name: T("Hell") }, { wert: "dark", name: T("Dunkel") }],
      sync: this.syncStand(f),
    });
  }

  // Eine Rollenfarbe setzt ELF Stufen, nicht eine - und bei der Primaerfarbe
  // dazu die drei klassischen Begleiter, die sonst auf HAs Blau stehen
  // blieben. Das ist der ganze Grund, warum hier nicht einfach ein Wert in
  // ein Feld geschrieben wird.
  aendere(f, wert) {
    if (!ZUSTAND.modell) return;
    const ebene = f.ebene === "getrennt"
      ? (this._feldModus === "dark" ? "dark" : "light")
      : "beide";
    const schreibe = (name, v) => {
      if (v === null || v === "") entferne(ZUSTAND.modell, name);
      else setze(ZUSTAND.modell, name, v, ebene);
      ZUSTAND.geaendert.add(name);
    };

    if (f.meta) {
      if (f.t === "Name der Theme") ZUSTAND.name = String(wert || "").trim();
      else ZUSTAND.meta[f.t] = wert;
      return;
    }
    const name = (f.v || "").replace(/^--/, "");
    if (!name) return;

    // Ein Mass braucht seine Einheit. Der Regler liefert eine nackte Zahl, und
    // "border-radius: 18" ist ungueltiges CSS - der Browser verwirft die Regel
    // stillschweigend, die Rundung kaeme nie an. Am 12.10.2026 in der ersten
    // fertigen Theme gefunden.
    if (f.art === "mass" && wert !== null && wert !== "" && /^-?[\d.]+$/.test(String(wert)))
      wert = String(wert) + (f.einheit ?? "px");
    // Eine Zahl ohne Einheit ist dagegen richtig so: Skala und Zeilenhoehe
    // sind Verhaeltnisse, kein Mass.

    if (f.rolle && wert) {
      const r = rampe(wert, f.rolle);
      if (r) for (const [k, v] of Object.entries(r)) schreibe(k, v);
      if (f.begleiter) {
        const b = begleiter(wert);
        if (b) for (const [k, v] of Object.entries(b)) schreibe(k, v);
      }
      return;
    }
    schreibe(name, wert);
  }

  // Die ganze Zuordnung auf einmal: 159 Eintraege, alle als Verweis. Einzeln
  // waere es eine halbe Stunde Klicken, und genau dabei entstehen die Luecken,
  // die man spaeter sucht.
  zuordnungAnwenden() {
    if (!ZUSTAND.modell) return 0;
    let n = 0;
    for (const [k, v] of Object.entries(ZUORDNUNG)) {
      setze(ZUSTAND.modell, k, v, "beide");
      ZUSTAND.geaendert.add(k);
      n++;
    }
    return n;
  }

  zeichneZaehler() {
    const z = this.shadowRoot.querySelector(".zaehler");
    if (z) z.textContent = ZUSTAND.geaendert.size;
    const m = this.shadowRoot.querySelector(".meldung");
    if (m && ZUSTAND.meldung) { m.textContent = ZUSTAND.meldung.text; m.className = "meldung " + ZUSTAND.meldung.art; }
  }

  async speichern() {
    const knopf = this.shadowRoot.querySelector(".speichern");
    // Die Meldung muss das Neuzeichnen ueberleben - sonst bestaetigt nichts,
    // dass gespeichert wurde.
    const melde = (t, art) => {
      ZUSTAND.meldung = { text: t, art: art || "" };
      const m = this.shadowRoot.querySelector(".meldung");
      if (m) { m.textContent = t; m.className = "meldung " + (art || ""); }
    };
    // Den Namen aus dem Feld lesen, nicht aus dem Gedaechtnis: das Feld ist
    // das, was der Nutzer sieht.
    const nf = this.shadowRoot.querySelector(".namensfeld");
    if (nf) ZUSTAND.name = nf.value.trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(ZUSTAND.name)) {
      // Dieselbe Regel wie auf dem Server. Waere der Client grosszuegiger,
      // scheiterte das Speichern dort mit einer Meldung, die niemand erwartet.
      melde("Der Name darf nur Buchstaben, Ziffern, - und _ enthalten", "fehler");
      return;
    }
    if (knopf) knopf.disabled = true;
    try {
      ZUSTAND.modell.name = ZUSTAND.name;
      ZUSTAND.modell.kopf = [
        `Erzeugt mit HATS ${HATS_VERSION} am ` + new Date().toLocaleString("de-DE"),
        "Grundlage: ha_blanko (HA 2026.10 ohne Altlasten)",
      ];
      const yaml = schreibeTheme(ZUSTAND.modell);
      const r = await this._hass.connection.sendMessagePromise({
        type: "hats/save_theme", name: ZUSTAND.name, yaml, overwrite: true });
      await this._hass.callService("frontend", "reload_themes");
      ZUSTAND.geaendert.clear();
      melde(`Gespeichert: ${r.path}`, "gut");
      this.zeichne();
    } catch (e) {
      // Der Server prueft mit PyYAML, bevor er schreibt. Seine Meldung
      // woertlich zeigen - umschrieben waere sie nicht mehr nachschlagbar.
      melde("Nicht gespeichert: " + (e.message || e.code || e), "fehler");
    } finally {
      if (knopf) knopf.disabled = false;
    }
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
  // Erst das Modell, dann das Berechnete. Ohne das sieht man eine Aenderung
  // nicht, bis die Theme geschrieben UND geladen ist - man drehte blind.
  modellWert(name) {
    if (!ZUSTAND.modell) return undefined;
    const modus = this._hass && this._hass.themes && this._hass.themes.darkMode ? "dark" : "light";
    return wirksam(ZUSTAND.modell, modus)[name];
  }

  // Was ein Berichtsfeld zeigt, steht nirgends im Theme - es wird gerechnet.
  berichtWert(f) {
    const m = ZUSTAND.modell;
    const zahl = (o) => Object.values(o || {}).filter((v) => v !== "" && v !== undefined).length;
    switch (f.bericht) {
      case "geaendert": return String(ZUSTAND.geaendert.size);
      case "gesamt": return m ? String(zahl(m.flach) + zahl(m.light) + zahl(m.dark)) : "-";
      case "gefuellt": return m ? `${zahl(m.flach)} flach, ${zahl(m.light)} hell, ${zahl(m.dark)} dunkel` : "-";
      case "dateiname": return ZUSTAND.name ? ZUSTAND.name + ".yaml" : "noch offen";
      case "ziel": return "config/themes";
      case "grundlage": return "ha_blanko";
      // Diese beiden sagen erst nach dem Schreiben etwas - der Server prueft
      // mit PyYAML, bevor er die Datei anlegt.
      case "yaml": return ZUSTAND.meldung && ZUSTAND.meldung.art === "gut" ? "beim Speichern geprueft" : "noch nicht geprueft";
      case "idempotent": return ZUSTAND.meldung && ZUSTAND.meldung.art === "gut" ? "beim Speichern geprueft" : "noch nicht geprueft";
      default: return "-";
    }
  }

  wert(f) {
    if (f.art === "bericht") return { text: this.berichtWert(f), farbe: null };
    if (f.meta) {
      if (f.t === "Name der Theme") return { text: ZUSTAND.name || "noch offen", farbe: null, leer: !ZUSTAND.name };
      // Eine Auswahl zeigt den NAMEN der Wahl, nicht ihren Schluessel - und
      // niemals "undefined", nur weil die Wahl noch nicht gefallen ist.
      const wahl = ZUSTAND.meta[f.t];
      const o = (f.optionen || []).find((x) => x.wert === wahl);
      return { text: o ? o.name : (f.optionen && f.optionen[0] ? f.optionen[0].name : "-"), farbe: null };
    }
    const ausModell = f.v ? this.modellWert(f.v.replace(/^--/, "")) : undefined;
    if (ausModell !== undefined && ausModell !== "") {
      const istFarbe = /^#|^rgba?\(|^hsla?\(/.test(ausModell);
      return { text: ausModell.length > 28 ? ausModell.slice(0, 27) + "…" : ausModell,
               farbe: istFarbe ? ausModell : null };
    }
    if (f.w !== undefined) return { text: f.w, farbe: null };
    // Frueher stand hier ein Rueckfall auf getComputedStyle der Seite. Der
    // zeigte den Wert der GERADE ANGEWENDETEN Theme - also HAs Vorgabe oder
    // eine fremde Theme - und sah aus wie der eigene. Am 12.10.2026 gemeldet:
    // "die theme hat gruen und die einstellung zeigt orange an". Ein Feld, das
    // nicht im Modell steht, ist nicht gesetzt, und das wird auch so gesagt.
    return { text: "nicht gesetzt", farbe: null, leer: true };
  }

  feldZeile(f, T) {
    const w = this.wert(f);
    return `
      <div class="feld" data-feld="${f.v || f.t}" tabindex="0" role="button">
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
      <article class="karte" data-feld="${f.v || f.t}" tabindex="0" role="button">
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

      .sichern { display: flex; align-items: center; gap: 10px; }
      /* Jedes Eingabefeld bekommt seine Schriftfarbe ausdruecklich. Ohne das
         erbt es aus Home Assistant - und in einem dunklen Theme ist das Weiss.
         Am 12.10.2026 stand der Hexwert #5468e0 weiss auf durchsichtigem Grund
         im Farbwaehler: der Wert war da, zu sehen war nichts. Dieselbe Falle
         wie bei .modal-box in HATG. */
      input, textarea, select, button { color: var(--s-tinte); }
      input::placeholder, textarea::placeholder { color: var(--s-tinte-leise); }

      .namensfeld { border: 0; background: rgba(255,255,255,.75); font: inherit; font-size: 14px;
                    padding: 9px 14px; border-radius: 999px; min-width: 190px;
                    box-shadow: inset 0 0 0 1px rgba(27,36,48,.08); }
      .namensfeld::placeholder { color: var(--s-tinte-leise); }
      .zaehlerbox { font-size: 12px; color: var(--s-tinte-leise); white-space: nowrap; }
      .zaehlerbox b { font-size: 14px; color: var(--s-tinte); }
      .speichern { border: 0; cursor: pointer; font: inherit; font-size: 14px; font-weight: 500;
                   padding: 10px 20px; border-radius: 999px; background: var(--s-tinte);
                   color: #fff; box-shadow: var(--s-schatten-klein); }
      .speichern:hover { background: #000; }
      .speichern[disabled] { opacity: .5; cursor: default; }
      .meldung { margin: 0 0 12px; min-height: 18px; font-size: 13px; }
      .meldung.gut { color: #2f6b22; }
      .meldung.fehler { color: #a31f1f; }

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

      /* ---- Startbild ---- */
      .startwege { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
      .weg { display: flex; flex-direction: column; gap: 6px; text-align: left;
             padding: 18px 20px; border: 0; border-radius: var(--s-r-gross);
             background: var(--s-glas-innen); box-shadow: inset 0 1px 0 var(--s-kante);
             color: var(--s-tinte); font: inherit; cursor: pointer;
             transition: background .18s ease, box-shadow .18s ease, transform .18s ease; }
      .weg:hover { background: #fff; box-shadow: var(--s-schatten); transform: translateY(-1px); }
      /* Der rechte Weg ist kein Knopf, sondern die Ueberschrift der Liste
         darunter - er darf sich nicht anfuehlen wie einer. */
      .weg:not(button) { cursor: default; }
      .weg:not(button):hover { background: var(--s-glas-innen); box-shadow: inset 0 1px 0 var(--s-kante); transform: none; }
      .weg.aus { opacity: .55; }
      .wegtitel { font-size: 16px; font-weight: 600; }
      .wegtext { font-size: 13px; color: var(--s-tinte-leise); }
      .liste.schmal { margin-top: 10px; }
      .liste.fremd { background: rgba(255,255,255,.34); }
      .zeilentext { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .zeilentext b { font-size: 15px; font-weight: 600; }
      .zeilentext small { font-size: 12px; color: var(--s-tinte-leise);
                          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .zeile.datei .stempel { margin-left: auto; font-size: 12px; padding: 4px 12px;
                              border-radius: 999px; background: rgba(27,36,48,.06);
                              color: var(--s-tinte-leise); }
      /* Gesperrt heisst sichtbar, aber nicht anklickbar. Wegzulassen waere
         schlimmer: wer seine Datei nicht findet, sucht den Fehler bei sich. */
      .zeile.gesperrt { cursor: not-allowed; opacity: .5; }
      .zeile.gesperrt:hover { background: none; box-shadow: none; }
      @media (max-width: 620px) { .startwege { grid-template-columns: 1fr; } }
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
      /* Der Hexwert im Farbwaehler: eintippbar, sieht aber nicht aus wie ein
         zweites Textfeld - er steht in der Spalte, in der vorher der reine
         Text stand, und bekommt seinen Rahmen erst beim Anfassen. */
      .speichern { color: #fff; }
      .be-hex { color: var(--s-tinte); font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important;
                font-size: 12px !important; background: transparent !important;
                padding: 6px 8px !important; width: 100%; min-width: 0;
                box-shadow: inset 0 0 0 1px transparent;
                transition: background .15s ease, box-shadow .15s ease; }
      .be-hex:hover { background: rgba(27,36,48,.05) !important; }
      .be-hex:focus { outline: none; background: #fff !important;
                      box-shadow: inset 0 0 0 1px rgba(27,36,48,.22); }
      /* Waehrend etwas Halbes dasteht, wird nichts gemeldet - der Rahmen sagt
         warum, statt dass die Eingabe stumm ignoriert wird. */
      .be-hex.falsch { box-shadow: inset 0 0 0 1px #d9534f; }
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

      .aktion { border: 0; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 500;
                padding: 8px 16px; border-radius: 999px; background: var(--s-tinte); color: #fff;
                margin-left: auto; white-space: nowrap; }
      .aktion:hover { background: #000; }

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

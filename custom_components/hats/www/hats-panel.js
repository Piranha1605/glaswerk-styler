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
import { leseTheme, schreibeTheme, leeresModell, wirksam, setze, entferne, teileAuf, fuehreZusammen, loeseFarbe, berichtUeberTheme,
         vorlageAn, vorlageAus, vorlageIstAn, vereinheitlicheVorlagen, vorlagenImTheme } from "./theme.js";
import { ZUORDNUNG, ANZAHL } from "./zuordnung.js";
import { UIX_ZIELE } from "./uix.js";
import { VORLAGEN, VORLAGEN_GRUPPEN } from "./vorlagen.js";
import { ERKLAERUNGEN, MERKSAETZE, AUSLESEN } from "./hilfe.js";

// Ein relativer Import loest sich gegen die Adresse SEINES Moduls auf, ein
// src im Markup dagegen gegen die Adresse der SEITE (/hats). Die Bilder
// liegen neben diesem Modul, unter /hats_static/<summe>/ - also die Adresse
// hier einmal ausrechnen, sonst suchen die Bilder unter /hilfe/ und bleiben
// leer, ohne Meldung.
const HILFE_BILDER = new URL("./hilfe/", import.meta.url).href;
import { BAUKASTEN, teilAnwenden, erkenneTeil, KARTENSTILE, palettenVorschau, seiteHatInhalt, FREIE_ROLLEN,
         eigenePalette,
         SORTEN_VORLAGEN, SORTEN_FELDER } from "./baukasten.js";
import { hintergrundSeiteHtml, bindeHintergrundSeite, wetterEntitaeten,
         hintergrundGewaehlt } from "./hintergrund-seite.js";

const HATS_VERSION = "0.2.0b5";

// Die acht Stufen sind ein Weg, kein Menue: von der leeren Datei bis zur
// geschriebenen Theme. Jede Stufe setzt auf der vorigen auf - wer Stufe 1
// aendert, verschiebt alles darueber, weil Home Assistant den Rest ableitet.
//
// Ein Feld traegt entweder `v` (eine CSS-Variable, deren aktueller Wert
// angezeigt wird) oder `w` (ein fester Text). Was hier steht, ist die
// Gliederung; das Schreiben in die Theme kommt im naechsten Schritt.
const STUFEN = [
  { n: 1, titel: "Grundlagen", symbol: "mdi:palette-outline", kurz: "Name, Palette, Akzent, Textfarben, Schrift",
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
        // --primary-color hat seit dem 14.10.2026 eine Kachel, und das war
        // lange ausdruecklich verboten. Der Grund fuer das Verbot war, dass
        // ein von Hand gesetzter Wert die Rampe einfriert. Er gilt weiter -
        // nur schreibt der Baukasten das Feld jetzt selbst mit (Stufe 50),
        // also folgt es jeder Palette. Ohne Kachel bekaeme es niemand wieder
        // heraus, und genau das verbietet die andere Regel.
        { t: "Primaerfarbe klassisch", art: "farbe", v: "--primary-color", ebene: "beide" },
        { t: "Primaer dunkel", art: "farbe", v: "--dark-primary-color", ebene: "beide" },
        { t: "Primaer dunkler", art: "farbe", v: "--darker-primary-color", ebene: "beide" },
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
        { t: "Primaer hell", art: "farbe", v: "--light-primary-color", ebene: "beide" },
      ] },
      { name: "Klassische Textfarben", felder: [
        { t: "Deaktiviert", art: "farbe", v: "--disabled-color", ebene: "getrennt" },
        { t: "Deaktivierte Schrift", art: "farbe", v: "--disabled-text-color", ebene: "getrennt" },
        { t: "Fehler", art: "farbe", v: "--error-color", ebene: "beide" },
        { t: "Hinweis", art: "farbe", v: "--info-color", ebene: "beide" },
        { t: "Primaere Schrift", art: "farbe", v: "--primary-text-color", ebene: "getrennt" },
        { t: "Sekundaere Schrift", art: "farbe", v: "--secondary-text-color", ebene: "getrennt" },
        { t: "Erfolg", art: "farbe", v: "--success-color", ebene: "beide" },
        { t: "Schrift auf hell", art: "farbe", v: "--text-light-primary-color", ebene: "beide" },
        { t: "Schrift auf Akzent", art: "farbe", v: "--text-primary-color", ebene: "beide" },
        { t: "Warnung", art: "farbe", v: "--warning-color", ebene: "beide" },
      ] },
      { name: "Schriftgroessen", felder: [
        { t: "Schriftart Fliesstext", art: "text", v: "--ha-font-family-longform", ebene: "beide" },
        { t: "Kantenglaettung", art: "text", v: "--ha-font-smoothing", ebene: "beide" },
        { t: "Fett", art: "zahl", v: "--ha-font-weight-bold", ebene: "beide", min: 0, max: 2100, schritt: 0.05 },
        { t: "Leicht", art: "zahl", v: "--ha-font-weight-light", ebene: "beide", min: 0, max: 900, schritt: 0.05 },
        { t: "Halbfett", art: "zahl", v: "--ha-font-weight-medium", ebene: "beide", min: 0, max: 1500, schritt: 0.05 },
        { t: "Normal", art: "zahl", v: "--ha-font-weight-normal", ebene: "beide", min: 0, max: 1200, schritt: 0.05 },
        { t: "Zeilenhoehe eng", art: "zahl", v: "--ha-line-height-condensed", ebene: "beide", min: 0, max: 4, schritt: 0.05 },
        { t: "Zeilenhoehe weit", art: "zahl", v: "--ha-line-height-expanded", ebene: "beide", min: 0, max: 6, schritt: 0.05 },
      ] },
    ] },

  { n: 2, titel: "Flaechen", symbol: "mdi:layers-outline", kurz: "Hintergrund, Karten, Dialoge, Kanten, Eingaben",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Alles hier wechselt mit dem Modus - im Hellen hell, im Dunkeln dunkel.
      // Deshalb durchweg getrennt, nicht flach.
      { name: "Grundflaechen", felder: [

        { t: "Kartenflaeche", art: "farbe", v: "--card-background-color", ebene: "getrennt" },
        { t: "Klare Flaeche", art: "farbe", v: "--clear-background-color", ebene: "getrennt" },
        { t: "Oberflaeche invertiert", art: "farbe", v: "--ha-color-surface-default-inverted", ebene: "getrennt" },
        { t: "Eine Stufe tiefer invertiert", art: "farbe", v: "--ha-color-surface-low-inverted", ebene: "getrennt" },
        { t: "Zwei Stufen tiefer invertiert", art: "farbe", v: "--ha-color-surface-lower-inverted", ebene: "getrennt" },
        { t: "Grundflaeche", art: "farbe", v: "--primary-background-color", ebene: "getrennt" },
        { t: "Zweite Flaeche", art: "farbe", v: "--secondary-background-color", ebene: "getrennt" },
        { t: "Oberflaeche", art: "farbe", v: "--ha-color-surface-default", ebene: "getrennt" },
        { t: "Eine Stufe tiefer", art: "farbe", v: "--ha-color-surface-low", ebene: "getrennt" },
        { t: "Zwei Stufen tiefer", art: "farbe", v: "--ha-color-surface-lower", ebene: "getrennt" },
        // Steht nicht in ha_blanko, weil HA es nicht vorbelegt - gelesen wird es
        // trotzdem (hui-root). Als Text, nicht als Farbe: hier passt ein
        // Verlauf oder ein url() hinein, nicht nur ein Hexwert.
        { t: "Dashboard-Hintergrund", art: "text", v: "--lovelace-background", ebene: "getrennt",
          platzhalter: "linear-gradient(160deg, #dcebfb, #8fbdea)" },
        // Bubble liest es VOR lovelace-background fuer seine Pop-ups. Steht
        // wie jenes nicht in ha_blanko, weil HA es nicht vorbelegt.
        { t: "Pop-up-Hintergrund", art: "text", v: "--popup-custom-wallpaper", ebene: "getrennt",
          platzhalter: "url(/local/bild.jpg)" } ] },
      { name: "Karten", felder: [
        { t: "Kartenflaeche", art: "farbe", v: "--ha-card-background", ebene: "getrennt",
          sync: { bubble: "--bubble-main-background-color" } },
        { t: "Weichzeichnung", art: "text", v: "--ha-card-backdrop-filter", ebene: "beide",
          platzhalter: "blur(14px) saturate(1.4)" },
        // Die vier folgenden sind am 13.10.2026 an der laufenden Instanz aus
        // ha-card.elementStyles gelesen, nicht aus der Dokumentation:
        //
        //   border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg))
        //   box-shadow:    var(--ha-card-box-shadow, none)
        //   border-width:  var(--ha-card-border-width, 1px)
        //   border-color:  var(--ha-card-border-color, var(--divider-color, #e0e0e0))
        //
        // ALLE VIER BLEIBEN LEER. Bei box-shadow ist das zwingend: HA liest
        // es zweimal mit verschiedenen Ausweichwerten - im Normalfall `none`,
        // unter :host([raised]) einen dreifachen Materialschatten. Ein Wert in
        // der Vorgabe nagelte beide Faelle auf denselben fest. Bei den drei
        // uebrigen gibt es zwar nur einen Ausweichwert, aber HA loest ihn
        // selbst besser auf, als eine Kopie in jeder Theme es koennte.
        { t: "Rundung", art: "text", v: "--ha-card-border-radius", ebene: "beide",
          platzhalter: "22px" },
        { t: "Schatten", art: "text", v: "--ha-card-box-shadow", ebene: "getrennt",
          platzhalter: "0 10px 30px rgba(20,30,50,.16)" },
        { t: "Randbreite", art: "text", v: "--ha-card-border-width", ebene: "beide",
          platzhalter: "0" },
        { t: "Randfarbe", art: "farbe", v: "--ha-card-border-color", ebene: "getrennt" } ] },
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
      // Die Seitenleiste. Am 14.10.2026 aus ha-sidebar gelesen, nicht geraten -
      // sie liest genau diese sechs Namen plus die beiden Breiten.
      //
      // --sidebar-selected-text-color steht NICHT dabei, obwohl der Name
      // naheliegt und die Theme es bis heute schrieb: ha-sidebar liest es
      // nicht. Die Schrift des gewaehlten Eintrags nimmt
      // --sidebar-selected-icon-color, aus der Regel
      //
      //     ha-list-item-button.selected::part(headline) { color: ... }
      //
      // Ein Feld, das niemand liest, ist schlimmer als keines: Es sieht nach
      // einer Stellschraube aus und ist keine.
      { name: "Seitenleiste", felder: [
        { t: "Symbole", art: "farbe", v: "--sidebar-icon-color", ebene: "getrennt" },
        { t: "Schrift", art: "farbe", v: "--sidebar-text-color", ebene: "getrennt" },
        // Faerbt Symbol UND Schrift des gewaehlten Eintrags, und fuellt
        // ausserdem seine Pille - dort mit --dark-divider-opacity.
        { t: "Gewaehlt", art: "farbe", v: "--sidebar-selected-icon-color", ebene: "getrennt" },
        { t: "Menueknopf Schrift", art: "farbe", v: "--sidebar-menu-button-text-color", ebene: "getrennt" },
        { t: "Menueknopf Flaeche", art: "farbe", v: "--sidebar-menu-button-background-color", ebene: "getrennt" },
        // KEINE BREITEN MEHR. Auf Ansage vom 15.10.2026: "dann muss die
        // funktion raus die die weite der seitenleiste aendert. das
        // zerschiesst uns die position der icons und die aktive
        // schalterpille wird am rand abgeschnitten."
        //
        // Hier standen --ha-sidebar-expanded-width und
        // --ha-sidebar-expanded-item-width. Beide werden gelesen, und beide
        // sind trotzdem eine Falle: Sie verstellen die INNERE Flaeche,
        // waehrend home-assistant-main den Platz daneben fest reserviert
        // (--ha-sidebar-width: calc(256px + safe-area)). Am 15.10.2026
        // gemessen, Schiene 255 px:
        //
        //     expanded-width       200 -> .menu 200, 55 px Luecke
        //                          320 -> .menu 320, 65 px laufen ueber
        //     expanded-item-width  160 -> Knopf 160, 91 px Luecke
        //                          380 -> Knopf 380, 129 px laufen ueber
        //
        // Der Ueberstand ist das abgeschnittene Ende der Pille. Ein Feld,
        // das nur zwischen Luecke und Abschneiden waehlen laesst, ist keine
        // Einstellung. Die Schiene selbst erreicht eine Theme nicht.
      ] },
      { name: "Schatten und Leisten", felder: [
        { t: "Leiste Schatten", art: "text", v: "--bar-box-shadow", ebene: "getrennt" },
        { t: "Rollschatten", art: "farbe", v: "--ha-color-shadow-scrollable-fade", ebene: "beide" },
        { t: "Kopfzeilenhoehe", art: "mass", v: "--header-height", ebene: "beide", min: 0, max: 168 },
        { t: "Rollbalken", art: "farbe", v: "--scrollbar-thumb-color", ebene: "getrennt" },
        { t: "Schattenfarbe", art: "farbe", v: "--shadow-color", ebene: "getrennt" },
      ] },
      
      { name: "Kanten", felder: [
        { t: "Trennlinie", art: "farbe", v: "--divider-color", ebene: "getrennt" },
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
        { t: "Fuellung deaktiviert", art: "farbe", v: "--input-disabled-fill-color", ebene: "getrennt" },
        { t: "Schrift deaktiviert", art: "farbe", v: "--input-disabled-ink-color", ebene: "getrennt" },
        { t: "Linie deaktiviert", art: "farbe", v: "--input-disabled-line-color", ebene: "getrennt" },
        { t: "Auswahlpfeil", art: "farbe", v: "--input-dropdown-icon-color", ebene: "getrennt" },
        { t: "Fuellung", art: "farbe", v: "--input-fill-color", ebene: "getrennt" },
        { t: "Linie ueberfahren", art: "farbe", v: "--input-hover-line-color", ebene: "getrennt" },
        { t: "Linie ruhend", art: "farbe", v: "--input-idle-line-color", ebene: "getrennt" },
        { t: "Schrift", art: "farbe", v: "--input-ink-color", ebene: "getrennt" },
        { t: "Beschriftung", art: "farbe", v: "--input-label-ink-color", ebene: "getrennt" },
        { t: "Rahmen deaktiviert", art: "farbe", v: "--input-outlined-disabled-border-color", ebene: "getrennt" },
        { t: "Rahmen ueberfahren", art: "farbe", v: "--input-outlined-hover-border-color", ebene: "getrennt" },
        { t: "Rahmen ruhend", art: "farbe", v: "--input-outlined-idle-border-color", ebene: "getrennt" },
      ] },
      { name: "Schrift invertiert", felder: [
        { t: "Primaer invertiert", art: "farbe", v: "--ha-color-text-primary-inverted", ebene: "getrennt" },
        { t: "Sekundaer invertiert", art: "farbe", v: "--ha-color-text-secondary-inverted", ebene: "getrennt" },
      ] },
    ] },

  { n: 3, titel: "Form", symbol: "mdi:border-radius", kurz: "Rundung, Rahmen, Abstaende, Raster, Schatten, Knoepfe",
    marke: "#c2c8d2", stand: "wartet", gruppen: [
      // Masse sind in beiden Modi gleich - HA setzt sie einmal in
      // core.globals.ts. Nur die Schatten unterscheiden sich.
      { name: "Rundung", felder: [

        { t: "Klein", art: "mass", v: "--ha-border-radius-sm", ebene: "beide", min: 0, max: 16 },
        { t: "Mittel", art: "mass", v: "--ha-border-radius-md", ebene: "beide", min: 0, max: 24 },
        { t: "Gross", art: "mass", v: "--ha-border-radius-lg", ebene: "beide", min: 0, max: 32 },
        { t: "Karten", art: "mass", v: "--ha-border-radius-xl", ebene: "beide", min: 0, max: 48 },
        { t: "2xl", art: "mass", v: "--ha-border-radius-2xl", ebene: "beide", min: 0, max: 60 },
        { t: "3xl", art: "mass", v: "--ha-border-radius-3xl", ebene: "beide", min: 0, max: 72 },
        { t: "4xl", art: "mass", v: "--ha-border-radius-4xl", ebene: "beide", min: 0, max: 84 },
        { t: "5xl", art: "mass", v: "--ha-border-radius-5xl", ebene: "beide", min: 0, max: 96 },
        { t: "6xl", art: "mass", v: "--ha-border-radius-6xl", ebene: "beide", min: 0, max: 108 },
        { t: "Kreis", art: "mass", v: "--ha-border-radius-circle", ebene: "beide", einheit: "%", min: 0, max: 150 },
        { t: "Pille", art: "mass", v: "--ha-border-radius-pill", ebene: "beide", min: 0, max: 29997 },
        { t: "Eckig", art: "zahl", v: "--ha-border-radius-square", ebene: "beide", min: 0, max: 1, schritt: 0.05 } ] },
      { name: "Rahmen", felder: [

        { t: "Dick", art: "mass", v: "--ha-border-width-lg", ebene: "beide", min: 0, max: 48 },
        { t: "Mittel", art: "mass", v: "--ha-border-width-md", ebene: "beide", min: 0, max: 48 },
        { t: "Stil", art: "text", v: "--wa-border-style", ebene: "beide" },
        { t: "Stil Panel", art: "text", v: "--wa-panel-border-style", ebene: "beide" },
        { t: "Breite Panel", art: "mass", v: "--wa-panel-border-width", ebene: "beide", min: 0, max: 48 },
        { t: "Duenn", art: "mass", v: "--ha-border-width-sm", ebene: "beide", min: 0, max: 4 },
        { t: "Ruhig", art: "farbe", v: "--ha-color-border-neutral-quiet", ebene: "getrennt" },
        { t: "Deutlich", art: "farbe", v: "--ha-color-border-neutral-normal", ebene: "getrennt" } ] },
      { name: "Abstaende", felder: [

        { t: "1", art: "mass", v: "--ha-space-1", ebene: "beide", min: 0, max: 48 },
        { t: "Eng", art: "mass", v: "--ha-space-2", ebene: "beide", min: 0, max: 24 },
        { t: "3", art: "mass", v: "--ha-space-3", ebene: "beide", min: 0, max: 48 },
        { t: "Normal", art: "mass", v: "--ha-space-4", ebene: "beide", min: 0, max: 40 },
        { t: "5", art: "mass", v: "--ha-space-5", ebene: "beide", min: 0, max: 60 },
        { t: "Weit", art: "mass", v: "--ha-space-6", ebene: "beide", min: 0, max: 64 },
        { t: "7", art: "mass", v: "--ha-space-7", ebene: "beide", min: 0, max: 84 },
        { t: "8", art: "mass", v: "--ha-space-8", ebene: "beide", min: 0, max: 96 },
        { t: "9", art: "mass", v: "--ha-space-9", ebene: "beide", min: 0, max: 108 },
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
        { t: "20", art: "mass", v: "--ha-space-20", ebene: "beide", min: 0, max: 240 } ] },
      // Das Raster der Sections-Ansicht. Am 14.10.2026 gemessen, nachdem
      // gemeldet wurde, die Karten seien zu gross - und die Abstandsleiter
      // darueber daran nichts aenderte: eine Kachel blieb bei 3, 4 und 5 px
      // je Stufe auf 120 px. Ihre Hoehe kommt aus der Rasterzeile.
      //
      // Elf Namen, alle elf von HA NICHT vorbelegt - der Ausweichwert im
      // Bauteil ist die einzige Quelle, und ein Wert am html kommt an:
      //
      //     hui-grid-section   --row-height: var(--ha-section-grid-row-height, 56px)
      //     hui-sections-view  --row-height: var(--ha-view-sections-row-height, 56px)
      //
      // Die Karten liegen in der Section, also gewinnt deren Zeile. Gemessen:
      // --ha-section-grid-row-height 40px laesst die Kachel von 120 auf 88 px
      // fallen, --ha-view-sections-row-height 40px bewegt sie um keinen Pixel.
      // Das zweite bedient nur die Hilfsflaechen im Bearbeitungsmodus; es
      // steht hier trotzdem, weil es gelesen wird - mit dem Namen, der sagt,
      // wofuer.
      { name: "Raster", felder: [
        { t: "Zeilenhoehe", art: "mass", v: "--ha-section-grid-row-height", ebene: "beide", min: 24, max: 96 },
        { t: "Zeilenluecke", art: "mass", v: "--ha-section-grid-row-gap", ebene: "beide", min: 0, max: 32 },
        { t: "Spaltenluecke", art: "mass", v: "--ha-section-grid-column-gap", ebene: "beide", min: 0, max: 32 },
        { t: "Abschnitte untereinander", art: "mass", v: "--ha-view-sections-row-gap", ebene: "beide", min: 0, max: 64 },
        { t: "Abschnitte nebeneinander", art: "mass", v: "--ha-view-sections-column-gap", ebene: "beide", min: 0, max: 80 },
        { t: "Abschnitt schmalste Breite", art: "mass", v: "--ha-view-sections-column-min-width", ebene: "beide", min: 160, max: 640 },
        { t: "Abschnitt breiteste Breite", art: "mass", v: "--ha-view-sections-column-max-width", ebene: "beide", min: 240, max: 960 },
        { t: "Abschnitte nebeneinander, schmal", art: "mass", v: "--ha-view-sections-narrow-column-gap", ebene: "beide", min: 0, max: 48 },
        { t: "Luft ueber der ersten Zeile", art: "mass", v: "--ha-view-sections-extra-top-margin", ebene: "beide", min: 0, max: 160 },
        { t: "Rundung der Abschnitte", art: "mass", v: "--ha-section-border-radius", ebene: "beide", min: 0, max: 48 },
        { t: "Zeilenhoehe im Bearbeiten", art: "mass", v: "--ha-view-sections-row-height", ebene: "beide", min: 24, max: 96 } ] },
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
      
      
      // Der Schalter ist seit 2026 reine Variablensache - keine MDC-Klassen
      // mehr, dafuer dreizehn eigene Felder. Am 14.10.2026 aus ha-switch
      // gelesen, nachdem der Maintainer meldete, die Schalter passten nicht:
      // Die Spur stand auf --ha-color-fill-primary-normal-resting (#e0effb,
      // fast weiss), der Daumen auf --ha-color-on-primary-normal (#086ebf).
      // Also ein blasser Trog mit dunklem Punkt, waehrend alles daneben voll
      // gefaerbt war.
      //
      // Die Ausweichwerte sind HAs neue Farbebene, eine HATS-Theme steuert
      // ihn also schon ueber die Rolle. Diese Felder sind die Feinstellung
      // darueber - und der einzige Weg, Spur und Daumen UNABHAENGIG zu
      // setzen.
      { name: "Schalter", felder: [
        { t: "Spur", art: "farbe", v: "--ha-switch-background-color", ebene: "getrennt" },
        { t: "Spur ueberfahren", art: "farbe", v: "--ha-switch-background-color-hover", ebene: "getrennt" },
        { t: "Rahmen", art: "farbe", v: "--ha-switch-border-color", ebene: "getrennt" },
        { t: "Spur an", art: "farbe", v: "--ha-switch-checked-background-color", ebene: "getrennt" },
        { t: "Spur an ueberfahren", art: "farbe", v: "--ha-switch-checked-background-color-hover", ebene: "getrennt" },
        { t: "Rahmen an", art: "farbe", v: "--ha-switch-checked-border-color", ebene: "getrennt" },
        { t: "Daumen", art: "farbe", v: "--ha-switch-thumb-background-color", ebene: "getrennt" },
        { t: "Daumen Rahmen", art: "farbe", v: "--ha-switch-thumb-border-color", ebene: "getrennt" },
        { t: "Daumen Schatten", art: "text", v: "--ha-switch-thumb-box-shadow", ebene: "getrennt" },
        { t: "Daumen an", art: "farbe", v: "--ha-switch-checked-thumb-background-color", ebene: "getrennt" },
        { t: "Groesse", art: "mass", v: "--ha-switch-size", ebene: "beide", min: 10, max: 40 },
        { t: "Breite", art: "mass", v: "--ha-switch-width", ebene: "beide", min: 20, max: 80 },
        { t: "Daumengroesse", art: "mass", v: "--ha-switch-thumb-size", ebene: "beide", min: 6, max: 36 },
        { t: "Trefferflaeche", art: "mass", v: "--ha-switch-min-touch-size", ebene: "beide", min: 24, max: 64 },
        { t: "Deaktiviert Deckkraft", art: "zahl", v: "--ha-switch-disabled-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 } ] },
      { name: "Knoepfe", felder: [
        { t: "Neutral Farbe", art: "farbe", v: "--ha-button-neutral-color", ebene: "getrennt" },
        { t: "Neutral hell Farbe", art: "farbe", v: "--ha-button-neutral-light-color", ebene: "getrennt" },
        { t: "Primaer hell Farbe", art: "farbe", v: "--ha-button-primary-light-color", ebene: "getrennt" },
        { t: "Warnung hell Farbe", art: "farbe", v: "--ha-button-warning-light-color", ebene: "getrennt" },
        { t: "Hoehe", art: "mass", v: "--wa-form-control-height", ebene: "beide", min: 0, max: 120 },
        { t: "Polster oben und unten", art: "mass", v: "--wa-form-control-padding-block", ebene: "beide", einheit: "em", min: 0, max: 48 },
      ] },
      // Die Flaechen der Knoepfe. Am 14.10.2026 gemessen, auf Ansage ("kannst
      // du all den buttons im system auch einen glastouch verpassen"):
      //
      // HAs Knoepfe sind seit 2026 Web-Awesome-Bauteile mit einer
      // appearance-Variante, und die Flaeche kommt NICHT aus --ha-button-*:
      //
      //     appearance=accent     --wa-color-<variante>-fill-loud
      //     appearance=filled     --wa-color-<variante>-fill-normal
      //     appearance=plain      durchsichtig, beim Ueberfahren -fill-quiet
      //     appearance=outlined   durchsichtig mit Rahmen
      //
      // Die vier --ha-button-*-Felder darueber sind etwas anderes und bleiben.
      //
      // Drei der Namen traegt HA EXAKT aus seiner eigenen Farbebene, am
      // Element gegengelesen:
      //
      //     wa-color-brand-fill-loud     = ha-color-fill-primary-loud-resting
      //     wa-color-brand-fill-normal   = ha-color-fill-primary-normal-resting
      //     wa-color-neutral-fill-normal = ha-color-fill-neutral-normal-resting
      //
      // Die beiden "quiet" zeigen dagegen auf die NORMAL-Stufe, nicht auf die
      // leise - gemessen, nicht gelesen: brand-fill-quiet stand auf #03223b
      // wie -normal, waehrend fill-primary-quiet-resting #011220 war.
      //
      // Wer hier nichts setzt, verliert nichts: HA rechnet sie aus der Rolle.
      // Gesetzt werden sie, um die Flaeche durchscheinend zu machen - das ist
      // der ganze Glastouch, denn ein backdrop-filter liest keines der
      // Bauteile (gemessen: ha-button, wa-dropdown, ha-switch - alle ohne).
      // Durchscheinend genuegt trotzdem, solange darunter schon Glas liegt.
      { name: "Knopfflaechen", felder: [
        { t: "Akzent", art: "text", v: "--wa-color-brand-fill-loud", ebene: "beide" },
        { t: "Gefuellt", art: "text", v: "--wa-color-brand-fill-normal", ebene: "beide" },
        { t: "Ueberfahren", art: "text", v: "--wa-color-brand-fill-quiet", ebene: "beide" },
        { t: "Neutral gefuellt", art: "text", v: "--wa-color-neutral-fill-normal", ebene: "beide" },
        { t: "Neutral ueberfahren", art: "text", v: "--wa-color-neutral-fill-quiet", ebene: "beide" } ] },
      // Menues und Schalter nehmen ihre Flaeche aus denselben wa-Namen.
      //
      //     wa-dropdown #menu   background-color: var(--wa-color-surface-raised)
      //                         border: ... var(--wa-color-surface-border)
      //     ha-switch .switch   background-color: var(--wa-form-control-background-color)
      //             .thumb      background-color: var(--wa-form-control-border-color)
      //     .checked .switch    background-color: var(--wa-form-control-activated-color)
      //
      // Gemessen stehen die beiden Flaechen schon auf rgba(26, 31, 48, .9) -
      // sie sind also bereits durchscheinend. Weiter aufzumachen kostet hier
      // mehr, als es bringt: Ein Menue ohne Weichzeichnung laesst den Text
      // darunter durchscheinen, und lesbar bleiben muss es.
      { name: "Menues und Schalter", felder: [
        { t: "Menueflaeche", art: "text", v: "--wa-color-surface-raised", ebene: "beide" },
        { t: "Menuerahmen", art: "text", v: "--wa-color-surface-border", ebene: "beide" },
        { t: "Schalterspur", art: "text", v: "--wa-form-control-background-color", ebene: "beide" },
        { t: "Schalterdaumen", art: "text", v: "--wa-form-control-border-color", ebene: "beide" },
        { t: "Schalter an", art: "text", v: "--wa-form-control-activated-color", ebene: "beide" } ] },

    ] },

  { n: 4, titel: "Zustaende", symbol: "mdi:gesture-tap-button", kurz: "Lautstaerken, Ueberfahren, Druecken, Deckkraft, Fokus",
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
        { t: "Dunkel Deaktiviert", art: "zahl", v: "--dark-disabled-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Dunkel Trennlinie", art: "zahl", v: "--dark-divider-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Dunkel Primaer", art: "zahl", v: "--dark-primary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Dunkel Sekundaer", art: "zahl", v: "--dark-secondary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell Deaktiviert", art: "zahl", v: "--light-disabled-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell Trennlinie", art: "zahl", v: "--light-divider-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell Primaer", art: "zahl", v: "--light-primary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
        { t: "Hell Sekundaer", art: "zahl", v: "--light-secondary-opacity", ebene: "beide", min: 0, max: 1, schritt: 0.05 },
      ] },
      { name: "Bewegung", felder: [
        { t: "Sofort", art: "mass", v: "--ha-animation-duration-instant", ebene: "beide", einheit: "ms", min: 0, max: 225 },
        { t: "Keine", art: "mass", v: "--ha-animation-duration-none", ebene: "beide", einheit: "ms", min: 0, max: 48 },
        { t: "Normal", art: "mass", v: "--ha-animation-duration-normal", ebene: "beide", einheit: "s", min: 0, max: 48 },
        { t: "Langsam", art: "mass", v: "--ha-animation-duration-slow", ebene: "beide", einheit: "s", min: 0, max: 48 },
        { t: "Verlaufskurve", art: "text", v: "--wa-transition-easing", ebene: "beide" },
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
        { t: "Auf Oberflaeche", art: "farbe", v: "--ha-color-on-surface-default", ebene: "getrennt" },
        { t: "Warnung laut", art: "farbe", v: "--ha-color-on-warning-loud", ebene: "getrennt" },
        { t: "Warnung normal", art: "farbe", v: "--ha-color-on-warning-normal", ebene: "getrennt" },
        { t: "Warnung leise", art: "farbe", v: "--ha-color-on-warning-quiet", ebene: "getrennt" },
      ] },
      { name: "Fokus", felder: [
        { t: "Rahmen", art: "farbe", v: "--outline-color", ebene: "getrennt" },
        { t: "Rahmen ueberfahren", art: "farbe", v: "--outline-hover-color", ebene: "getrennt" },
        { t: "Abstand", art: "mass", v: "--wa-focus-ring-offset", ebene: "beide", min: 0, max: 48 },
        { t: "Stil", art: "text", v: "--wa-focus-ring-style", ebene: "beide" },
        { t: "Breite", art: "mass", v: "--wa-focus-ring-width", ebene: "beide", min: 0, max: 48 },
      ] },
    ] },

  { n: 5, titel: "Symbole", symbol: "mdi:shape-outline", kurz: "Form, Groesse, Zustandsfarben",
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
      //
      // Am 14.10.2026 waren es vier von neunzehn, und das war ein viel
      // groesseres Loch als es aussah. Gemessen: Home Assistant definiert 86
      // Felder der Form --state-<domaene>-<zustand>-color, und 82 davon sind
      // KEINE Farbe, sondern ein Verweis:
      //
      //     --state-cover-active-color   = var(--purple-color)
      //     --state-light-active-color   = var(--amber-color)
      //     --state-climate-heat-color   = var(--deep-orange-color)
      //     23 Gefahr-Zustaende          = var(--red-color)
      //
      // Siebzehn Toene tragen also alle 86. Wer die Toene hat, hat die
      // Zustaende - und wer sie nicht hat, kommt an keinen einzigen heran.
      // Genau das war der Fall: Von den vier Blautoenen, die auf einer Seite
      // nebeneinander standen, war Mushrooms #2196f3 nichts anderes als
      // --blue-color, und das Panel bot es nicht an.
      //
      // Deshalb stehen hier jetzt alle neunzehn, in der Reihenfolge des
      // Farbkreises statt in der des Zufalls. Schwarz und Weiss nicht - die
      // sind keine Toene und stehen in "Zustandsfarben".
      //
      // sync traegt den Ton an Mushrooms Tripel weiter. Mushroom hat fuer
      // jeden der neunzehn eines (am 14.10.2026 aus seinen elementStyles
      // gezaehlt), sonst zoege es seine eigene Vorgabe vor.
      { name: "Toene", felder: [
        { t: "Rot", art: "farbe", v: "--red-color", ebene: "beide", sync: { mush: "--mush-rgb-red" } },
        { t: "Rosa", art: "farbe", v: "--pink-color", ebene: "beide", sync: { mush: "--mush-rgb-pink" } },
        { t: "Violett", art: "farbe", v: "--purple-color", ebene: "beide", sync: { mush: "--mush-rgb-purple" } },
        { t: "Dunkelviolett", art: "farbe", v: "--deep-purple-color", ebene: "beide", sync: { mush: "--mush-rgb-deep-purple" } },
        { t: "Indigo", art: "farbe", v: "--indigo-color", ebene: "beide", sync: { mush: "--mush-rgb-indigo" } },
        { t: "Blau", art: "farbe", v: "--blue-color", ebene: "beide", sync: { mush: "--mush-rgb-blue" } },
        { t: "Hellblau", art: "farbe", v: "--light-blue-color", ebene: "beide", sync: { mush: "--mush-rgb-light-blue" } },
        { t: "Cyan", art: "farbe", v: "--cyan-color", ebene: "beide", sync: { mush: "--mush-rgb-cyan" } },
        { t: "Tuerkis", art: "farbe", v: "--teal-color", ebene: "beide", sync: { mush: "--mush-rgb-teal" } },
        { t: "Gruen", art: "farbe", v: "--green-color", ebene: "beide", sync: { mush: "--mush-rgb-green" } },
        { t: "Hellgruen", art: "farbe", v: "--light-green-color", ebene: "beide", sync: { mush: "--mush-rgb-light-green" } },
        { t: "Limette", art: "farbe", v: "--lime-color", ebene: "beide", sync: { mush: "--mush-rgb-lime" } },
        { t: "Gelb", art: "farbe", v: "--yellow-color", ebene: "beide", sync: { mush: "--mush-rgb-yellow" } },
        { t: "Bernstein", art: "farbe", v: "--amber-color", ebene: "beide", sync: { mush: "--mush-rgb-amber" } },
        { t: "Orange", art: "farbe", v: "--orange-color", ebene: "beide", sync: { mush: "--mush-rgb-orange" } },
        { t: "Dunkelorange", art: "farbe", v: "--deep-orange-color", ebene: "beide", sync: { mush: "--mush-rgb-deep-orange" } },
        { t: "Braun", art: "farbe", v: "--brown-color", ebene: "beide", sync: { mush: "--mush-rgb-brown" } },
        { t: "Grau", art: "farbe", v: "--grey-color", ebene: "beide", sync: { mush: "--mush-rgb-grey" } },
        { t: "Blaugrau", art: "farbe", v: "--blue-grey-color", ebene: "beide", sync: { mush: "--mush-rgb-blue-grey" } } ] },

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
        { t: "Badge grau", art: "farbe", v: "--label-badge-grey", ebene: "beide" },
        { t: "Hell grey Farbe", art: "farbe", v: "--light-grey-color", ebene: "beide" },
        { t: "State weather snowy Farbe", art: "farbe", v: "--state-weather-snowy-color", ebene: "beide" },
        { t: "White Farbe", art: "farbe", v: "--white-color", ebene: "beide" },
      ] },
    ] },

  { n: 6, titel: "Fremde Karten", symbol: "mdi:puzzle-outline", kurz: "Bubble Card und Mushroom anbinden",
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
        // Von der Sitzung Steuerkarte am 14.10.2026 angefordert: Ihr
        // Schriftregler braucht sie, weil Mushroom --ha-font-size-scale NICHT
        // folgt (gemessen: Kachel und Bubble gehen bei Faktor 1,2 von 14 auf
        // 16,8 px, Mushroom bleibt auf 14).
        //
        // Als Verweis auf HAs Leiter gedacht, nicht als feste Pixel -
        // var(--ha-font-size-m) ist 14px mal Faktor, also genau Mushrooms
        // Vorgabe bei Faktor 1. Dann folgt Mushroom dem einen Feld wie die
        // anderen beiden, statt eine dritte Stelle fuer dieselbe Zahl zu sein.
        { t: "Schrift Name", art: "text", v: "--mush-card-primary-font-size", ebene: "beide" },
        { t: "Schrift Zustand", art: "text", v: "--mush-card-secondary-font-size", ebene: "beide" },
        { t: "Chip", art: "mass", v: "--mush-chip-height", ebene: "beide", min: 20, max: 64 },
        { t: "Abstand", art: "mass", v: "--mush-spacing", ebene: "beide", min: 0, max: 32 } ] },
    ] },

  { n: 7, titel: "Feinschliff", symbol: "mdi:auto-fix", kurz: "Karte, Diagramme, Energie, Code-Editor, Glas",
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
      
      { name: "Diagrammfarben", felder: [
        { t: "4", art: "farbe", v: "--color-4", ebene: "beide" },
        { t: "5", art: "farbe", v: "--color-5", ebene: "beide" },
        { t: "6", art: "farbe", v: "--color-6", ebene: "beide" },
        { t: "7", art: "farbe", v: "--color-7", ebene: "beide" },
        { t: "8", art: "farbe", v: "--color-8", ebene: "beide" },
        { t: "9", art: "farbe", v: "--color-9", ebene: "beide" },
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
        { t: "50", art: "farbe", v: "--color-50", ebene: "beide" },
        { t: "51", art: "farbe", v: "--color-51", ebene: "beide" },
        { t: "52", art: "farbe", v: "--color-52", ebene: "beide" },
        { t: "53", art: "farbe", v: "--color-53", ebene: "beide" },
        { t: "54", art: "farbe", v: "--color-54", ebene: "beide" },
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
        { t: "Kartenfilter", art: "text", v: "--map-filter", ebene: "getrennt" },
        { t: "Linear progress buffer Farbe", art: "farbe", v: "--mdc-linear-progress-buffer-color", ebene: "getrennt" },
        { t: "Ripple Farbe", art: "farbe", v: "--mdc-ripple-color", ebene: "getrennt" },
      ] },
    ] },

  { n: 8, titel: "Ausgabe", symbol: "mdi:content-save-outline", kurz: "Pruefen, Bericht, Textrichtung, Theme schreiben",
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
        { t: "Leserichtung", art: "text", v: "--direction", ebene: "beide" },
        { t: "Ausrichtung Ende", art: "text", v: "--float-end", ebene: "beide" },
        { t: "Ausrichtung Anfang", art: "text", v: "--float-start", ebene: "beide" },
        { t: "Kantenglaettung macOS", art: "text", v: "--ha-moz-osx-font-smoothing", ebene: "beide" },
        { t: "Titelabstand links nach rechts", art: "text", v: "--margin-title-ltr", ebene: "beide" },
        { t: "Titelabstand rechts nach links", art: "text", v: "--margin-title-rtl", ebene: "beide" },
      ] },
    ] },
];

// Wofuer jede Gruppe da ist - eine Zeile, damit man beim Oeffnen nicht raten
// muss, was ein Feld bewirkt. Steht als Trenner ueber den Karten der Gruppe.
const ZWECK = {
  "Start": "Wie die Theme heisst und worauf sie aufsetzt",
  // --- die Gruppen aus der Nachtschicht vom 12.10.2026 ---
  "Palette": "Die elf Stufen je Rolle. Die Rollen oben setzen sie - hier nur, wenn eine Stufe allein nicht passt",
  "Klassische Textfarben": "Die alten Namen, die viele fremde Karten noch lesen",
  "Schriftgroessen": "Groessen, Staerken und Zeilenhoehen - gelten erst ab Lovelace, nicht auf der Home-Seite",
  "Schatten und Leisten": "Schatten, Scrollbalken und die Hoehe der Kopfleiste",
  "Kanten": "Trennlinien und Rahmen, je Rolle und Lautstaerke",
  "Eingabefelder": "Flaechen und Rahmen von Eingaben - die alten input-Namen liest HA 2026 nicht mehr",
  "Schrift invertiert": "Schrift auf umgekehrtem Grund, etwa in einem Hinweisbalken",
  "Knopfflaechen": "Woraus HAs Knoepfe ihre Flaeche nehmen - durchscheinend macht das Glas",
  "Menues und Schalter": "Dieselben wa-Namen fuer Aufklappmenues und Kippschalter",
  "Seitenleiste": "Was die Seitenleiste liest - sechs Farben und zwei Breiten",
  "Schalter": "Spur, Daumen und Groesse der Kippschalter - an und aus getrennt",
  "Knoepfe": "Die vier Knopffarben, die HA ausserhalb der Rollen fuehrt",
  "Deckkraft": "Wie stark Deaktiviertes und Trennlinien durchscheinen, je Modus",
  "Bewegung": "Dauer der Uebergaenge, von sofort bis langsam",
  "Flaechen je Lautstaerke": "Die 44 Flaechen aus Rolle x Lautstaerke x Zustand. Sie folgen der Palette - hier nur eingreifen, wenn eine einzelne nicht passt",
  "Schrift auf Flaechen": "Welche Schriftfarbe auf einer eingefaerbten Flaeche lesbar bleibt",
  "Fokus": "Der Ring um das Element, das gerade die Tastatur hat",
  "Zustandsfarben": "Graustufen und Sonderfaelle, die HA fuer Zustaende heranzieht",
  "Diagrammfarben": "Die Reihenfolge der Linienfarben in Verlaufsdiagrammen",
  "Energie": "Die Farben der Energieverteilung - Netz, Solar, Batterie, Gas",
  "Karte und Reste": "Der Filter ueber der Rasterkarte und zwei verbliebene Material-Namen",
  "Textrichtung": "Links nach rechts oder umgekehrt. Nur anfassen, wenn du weisst warum",
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
  "Raster": "Die Zeilenhoehe, aus der jede Karte ihre Hoehe bekommt",
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

// Fuer Attribute. Die Texte sind zwar eigene Daten und keine Eingabe, aber ein
// Anfuehrungszeichen in einem Zwecktext zerlegte sonst das title-Attribut.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const felderZahl = (st) => st.gruppen.reduce((n, g) => n + g.felder.length, 0);
const felderGesamt = STUFEN.reduce((n, st) => n + felderZahl(st), 0);

// Welche Feldnamen die Oberflaeche bedienen kann. Dagegen wird beim Import
// gemessen - alles andere wird mitgenommen, aber nicht angeboten. Die
// Zuordnung zaehlt dazu: Ihre Felder schreibt HATS selbst, auch ohne Kachel.
const BEKANNT = new Set([
  ...STUFEN.flatMap((s) => s.gruppen.flatMap((g) => g.felder))
    .filter((f) => f.v).map((f) => f.v.replace(/^--/, "")),
  ...Object.keys(ZUORDNUNG),
  // Und was begleiter() aus der Primaerfarbe mitschreibt - dieselbe
  // Begruendung wie bei der Zuordnung.
  //
  // Vier davon haben eine Kachel, rgb-primary-color mit Absicht nicht: Es ist
  // die eine Ausnahme von "kein eigenes rgb-Feld" (CLAUDE.md), weil
  // primary-color als var(--ha-color-primary-40) gar nicht im Theme steht und
  // Home Assistant deshalb kein Tripel dafuer ableitet. Einstellbar soll es
  // trotzdem nicht sein.
  //
  // Ohne diese Zeile meldete der Bericht "1 Feld kennt HATS nicht" - bei jeder
  // Theme, die eine Palette MIT eigenen Farben benutzt (Warm, Kuehl,
  // Monochrom, macOS). Am 14.10.2026 beim Bau der macOS-Theme aufgefallen,
  // derselbe Fehler wie bei uix-theme am selben Tag: ein Feld, das HATS selbst
  // schreibt, als fremd gemeldet.
  ...Object.keys(begleiter("#808080") || {}),
]);

// Die Kennungen der Stilziele, fuer den Bericht. Damit unterscheidet er ein
// uix-Feld, das HATS selbst schreibt, von einem fremden - vorher galt jedes
// als fremd, und eine Theme aus HATS' eigenem Generator meldete sieben
// "Stilziele von HATG oder card-mod".
const EIGENE_ZIELE = new Set(UIX_ZIELE.map((z) => z.id));

const TEXTE = {
  en: {
    "Guten Tag": "Good afternoon",
    "Beginne oben: neue Theme, Datei einlesen oder eine vorhandene oeffnen.": "Start above: new theme, read in a file, or open an existing one.",
    "von HATS": "from HATS", "fremde": "foreign",
    "Baukasten": "Kit",
    "Mit dem Baukasten": "With the kit",
    "Leer anfangen, mit Home Assistants eigenen Farben als Grundlage.":
      "Start empty, on Home Assistant's own colours.",
    "Fertige Teile zusammenstecken: Farben, Schrift, Karten, Hintergrund.":
      "Snap ready-made parts together: colours, type, cards, background.",
    "Theme auf dieser Instanz": "theme on this instance",
    "Themes auf dieser Instanz": "themes on this instance",
    "Eine Theme von anderswo einlesen - auch eine fremde.":
      "Read in a theme from elsewhere - a foreign one too.",
    "Alle Teile": "All parts", "Tweaks": "Tweaks", "Nachjustieren": "Fine-tune",
    "Oberflaeche": "Chrome",
    "Fertige Teile zusammenstecken": "Snap together ready-made parts",
    "Farben": "Colours", "Schrift": "Typeface", "Karten": "Cards", "Hintergrund": "Background",
    "gewaehlt": "selected",
    "Glas braucht einen Hintergrund, der etwas hergibt": "Glass needs a background with something to show through",
    "Teile gesetzt": "parts applied",
    "Felder gesetzt": "fields set",
    "Danach feinjustieren in den acht Stufen": "Fine-tune afterwards in the eight stages",
    "Bild waehlen": "Choose an image",
    "Bild hochladen...": "Upload an image...",
    "Kein Bild": "No image",
    "Noch keine Bilder - lad eins hoch": "No images yet - upload one",
    "Hochgeladen": "Uploaded", "Lag schon da": "Was already there", "Loeschen": "Delete",
    "Bilder liegen in config/www/hats und kommen unter /local/hats von Home Assistant selbst - die Theme bleibt damit weitergebbar.": "Images live in config/www/hats and are served from /local/hats by Home Assistant itself - that keeps the theme shareable.",
    "Add-ons": "Add-ons",
    "Felder angebunden": "fields wired up",
    "von": "of", "Stilzielen an": "style targets on",
    "Vorlagen an": "templates on",
    "Stilziele fuer eigenes CSS": "Style targets for your own CSS",
    "noch kein Bild": "no preview yet",
    "vorher": "before",
    "an": "on",
    "erst eine Theme oeffnen": "open a theme first",
    "UI eXtension schreibt dein CSS dorthin, wo Home Assistant es sonst nicht hinlaesst - in den Shadow Root des jeweiligen Bauteils. Eine Vorlage legt einen fertigen Block an; ein Stilziel gibt dir ein leeres Feld fuer eigenes CSS.":
      "UI eXtension puts your CSS where Home Assistant otherwise won't let it go - into the shadow root of the component itself. A template drops in a ready-made block; a style target gives you an empty field for your own CSS.",
    "Herkunft": "Source",
    "Hintergrundbild": "Background image",
    "Pop-up-Hintergrund": "Pop-up background",
    "Hell + dunkel": "Light + dark", "Nur hell": "Light only", "Nur dunkel": "Dark only",
    "Diese Dateien hat HATS gebaut - oder oben eine neue beginnen": "These files were built with HATS - or start a new one above",
    "Noch keine Theme - oben eine neue beginnen oder eine Datei einlesen": "No theme yet - start a new one above, or read in a file",
    "Oeffnen": "Open",
    "Aenderungen verwerfen": "Discard changes",
    "Aenderungen verworfen": "changes discarded",
    "Ungespeicherte Aenderungen - nochmal druecken zum Verlassen": "Unsaved changes - press again to leave",
    "Datei oder Text": "File or text",
    "Eine Theme von anderswo einlesen": "Read a theme from somewhere else",
    "Mit einem anderen Werkzeug gebaut. Lesen geht - was HATS nicht kennt, bleibt unveraendert in der Datei:": "Built with another tool. Reading works - whatever HATS does not know stays untouched in the file:",
    "lesen": "read",
    "Gelesen": "Read",
    "ohne Namen": "no name",
    "flach": "flat", "hell": "light", "dunkel": "dark",
    "Felder kannst du hier einstellen": "fields you can set here",
    "Felder kennt HATS nicht. Sie bleiben unveraendert in der Datei, lassen sich hier aber nicht aendern.": "fields HATS does not know. They stay untouched in the file but cannot be changed here.",
    "Stilziele von HATG oder card-mod. Die pflegt HATS nicht - bearbeite so eine Theme besser dort.": "style targets from HATG or card-mod. HATS does not maintain those - better edit such a theme there.",
    "Zeilen konnte ich nicht einordnen. Die sind nach dem Speichern WEG:": "lines could not be placed. They are GONE once you save:",
    "Datei waehlen...": "Choose a file...",
    "oder hier das YAML einfuegen": "or paste the YAML here",
    "Einlesen": "Read it",
    "Nichts zum Einlesen": "Nothing to read",
    "Als Datei herunterladen": "Download as a file",
    "In die Zwischenablage": "Copy to the clipboard",
    "Eine Rolle setzt elf Palettenstufen und bleibt deshalb in beiden Modi gleich": "A role sets eleven palette steps and therefore stays the same in both modes",
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
    "Was macht welche Variable?": "What does each variable do?",
    "mit Satz": "explained",
    "noch offen": "still open",
    "noch kein Satz": "no sentence yet",
    "Kennt Home Assistant, bietet HATS nicht an": "Home Assistant has these, HATS does not offer them",
    "Diese Felder lassen sich hier nicht einstellen - der Satz steht trotzdem da, damit die Luecke sichtbar ist.":
      "These fields cannot be set here - the sentence is kept anyway so the gap stays visible.",
    "zuletzt geändert": "last changed",
    "gerade eben": "just now",
    "Entwurf": "Draft",
    "Gruppen": "groups",
    "Ansicht": "View", "Gemischt": "Mixed", "Liste": "List", "Kacheln": "Tiles",
    "Jetzt in Kraft": "In effect now", "Hell": "Light", "Dunkel": "Dark",
    "Beide Modi": "Both modes", "Alle anbinden": "Wire up all",
    "Zuordnungen eingetragen": "mappings written", "Toene": "tones", "Aenderungen": "changes", "Speichern": "Save",
    "bietet das Panel an": "the panel offers",
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
    "Rundung, Rahmen, Abstaende, Raster, Schatten, Knoepfe": "Radius, borders, spacing, grid, shadows, buttons",
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
  bericht: null,     // was beim letzten Einlesen herauskam
  uixAus: {},        // CSS abgeschalteter Stilziele - abschalten darf nichts vernichten
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

  // Die Bildergalerie.
  //
  // Bilder liegen in config/www/hats und kommen unter /local/hats von Home
  // Assistant SELBST. Das ist der ganze Punkt: Eine Adresse, die nur HATS
  // ausliefert, macht eine weitergegebene Theme unbrauchbar - beim Empfaenger
  // bliebe der Hintergrund leer, ohne Fehlermeldung, weil ein fehlendes Bild
  // in CSS einfach nichts tut.
  async zeigeGalerie(ziel, modus) {
    const T = (x) => t(x, this.spr);
    let bilder = [];
    try {
      const r = await this._hass.connection.sendMessagePromise({ type: "hats/list_images" });
      bilder = r.bilder || [];
    } catch (e) {
      ZUSTAND.meldung = { text: "Bilder nicht geladen: " + (e.message || e.code || e), art: "fehler" };
    }

    const d = this.shadowRoot.querySelector(".overlay.zwei .dialog");
    const kb = (n) => (n < 1024 ? n + " B" : Math.round(n / 1024) + " kB");
    d.innerHTML = `
      <header class="dkopf">
        <div><h2>${T("Bild waehlen")}</h2>
             <p>${ziel.replace(/^--/, "")} &middot; ${modus === "dark" ? T("dunkel") : T("hell")}</p></div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="feldseite">
        <input type="file" accept="image/*" class="bildwahl" hidden>
        <div class="galeriekopf">
          <button class="modalknopf hochladen">${T("Bild hochladen...")}</button>
          <button class="modalknopf dateiknopf keinbild">${T("Kein Bild")}</button>
        </div>
        ${bilder.length ? `<div class="galerie">
          ${bilder.map((b) => `
            <figure class="bild" data-bild="${b.url}" title="${b.name}">
              <img src="${b.url}" alt="" loading="lazy">
              <figcaption>${b.name}<span>${kb(b.bytes)}</span></figcaption>
              <button class="bildweg" data-bild-weg="${b.name}" title="${T("Loeschen")}">✕</button>
            </figure>`).join("")}
        </div>` : `<p class="leer">${T("Noch keine Bilder - lad eins hoch")}</p>`}
        <p class="noch">${T("Bilder liegen in config/www/hats und kommen unter /local/hats von Home Assistant selbst - die Theme bleibt damit weitergebbar.")}</p>
      </div>`;

    const feld = d.querySelector(".bildwahl");
    d.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    d.querySelector(".hochladen").addEventListener("click", () => feld.click());
    d.querySelector(".keinbild").addEventListener("click", () => {
      this.setzeBild(ziel, modus, "");
      this.schliesseFeld();
    });
    feld.addEventListener("change", async () => {
      const f = feld.files && feld.files[0];
      if (!f) return;
      // base64 ohne den data:-Kopf - den will der Server nicht.
      const roh = await new Promise((ok, nein) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(",")[1]);
        r.onerror = nein;
        r.readAsDataURL(f);
      });
      try {
        const a = await this._hass.connection.sendMessagePromise({
          type: "hats/upload_image", filename: f.name, data: roh });
        ZUSTAND.meldung = { text: a.doppelt ? `${T("Lag schon da")}: ${a.name}` : `${T("Hochgeladen")}: ${a.name}`, art: "gut" };
        this.setzeBild(ziel, modus, `url(${a.url})`);
        this.zeigeGalerie(ziel, modus);
      } catch (e) {
        ZUSTAND.meldung = { text: "Nicht hochgeladen: " + (e.message || e.code || e), art: "fehler" };
        this.zeichne();
      }
    });
    d.querySelectorAll("[data-bild]").forEach((el) =>
      el.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-bild-weg]")) return;   // das Kreuz ist kein Griff
        this.setzeBild(ziel, modus, `url(${el.dataset.bild})`);
        this.schliesseFeld();
      })
    );
    d.querySelectorAll("[data-bild-weg]").forEach((b) =>
      b.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        try {
          await this._hass.connection.sendMessagePromise({
            type: "hats/delete_image", name: b.dataset.bildWeg });
          this.zeigeGalerie(ziel, modus);
        } catch (e) {
          ZUSTAND.meldung = { text: "Nicht geloescht: " + (e.message || e.code || e), art: "fehler" };
          this.zeichne();
        }
      })
    );

    const o = this.shadowRoot.querySelector(".overlay.zwei");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
  }

  setzeBild(ziel, modus, wert) {
    if (!ZUSTAND.modell) return;
    const name = ziel.replace(/^--/, "");
    if (wert) setze(ZUSTAND.modell, name, wert, modus === "dark" ? "dark" : "light");
    else delete ZUSTAND.modell[modus === "dark" ? "dark" : "light"][name];
    ZUSTAND.geaendert.add(name);
    this.zeichne();
  }

  // ---- UIX: eine eigene Seite, erreichbar ueber das Symbol oben ----
  //
  // Stand 13.10.2026 auf Ansage: "UIX kann auch hoch ins Menue da bubble und
  // Mushroom da auch schon in Fremdkarten liegen. so haben wir rechts frei."
  // Die Spalte rechts ist damit weg - Bubble und Mushroom sind ueber Stufe 6
  // erreichbar, UIX ueber diesen Dialog. Der Inhalt braucht die Breite:
  // 28 Stilziele, jedes mit einem Block CSS.
  // --- Baukasten -----------------------------------------------------------
  //
  // Vier Sorten Teile zum Zusammenstecken, bevor man in die acht Stufen geht.
  // Der Baukasten ersetzt sie nicht, er fuellt sie.

  oeffneBaukasten() {
    this._offen = "baukasten";
    // Immer auf der Uebersicht beginnen. Eine Seite, die von letztem Mal noch
    // offen steht, ist beim naechsten Oeffnen eine Ueberraschung.
    this._bkSeite = null;
    this.zeichneBaukasten();
    const o = this.shadowRoot.querySelector(".overlay");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
    document.addEventListener("keydown", this._esc);
  }

  zeichneBaukasten() {
    const T = (x) => t(x, this.spr);
    const m = ZUSTAND.modell;
    const d = this.shadowRoot.querySelector(".dialog");

    // Welches Teil sitzt gerade? Ueber die WERTE, nicht ueber einen Merker -
    // eine von Hand bearbeitete Theme traegt keinen.
    const lies = (name, ebene) => {
      if (!m) return undefined;
      const k = name.replace(/^--/, "");
      return ebene === "beide" ? m.flach[k] : m[ebene]?.[k];
    };
    const sitzt = {};
    if (m) for (const sorte of Object.keys(BAUKASTEN)) sitzt[sorte] = erkenneTeil(sorte, lies);

    // Glas ohne Hintergrund sieht aus wie eine etwas hellere Wand. Der Hinweis
    // steht nur dann da, wenn der Fall wirklich eintritt - ein Warnschild, das
    // immer leuchtet, liest niemand mehr.
    const glasOhneGrund = sitzt.karten === "glas" && sitzt.hintergrund === "keiner";

    // Der Modus des Nutzers, nicht der der Theme: Die Kachel zeigt, was er
    // zu sehen bekaeme, wenn er das Teil jetzt waehlt.
    const dunkel = !!this._hass?.themes?.darkMode;

    const sorteHtml = (schluessel) => {
      const s = BAUKASTEN[schluessel];
      const name = this.spr === "en" ? s.en : s.de;
      const vorlagen = (SORTEN_VORLAGEN[schluessel] || []).length;
      const anV = ZUSTAND.modell
        ? (SORTEN_VORLAGEN[schluessel] || []).filter((id) => {
            const v = VORLAGEN.find((x) => x.id === id);
            return v && vorlageIstAn(ZUSTAND.modell, v);
          }).length
        : 0;

      // Eine Sorte, die nur Vorlagen traegt, hat keine Teile zur Auswahl -
      // sie bekommt trotzdem eine Kachel, sonst waere sie unerreichbar.
      if (s.nurVorlagen) return `
        <section class="bk-sorte">
          <h3>${name}</h3>
          <div class="bk-teile">
            <button class="bk-teil" data-bk-seite="${schluessel}" ${ZUSTAND.modell ? "" : "disabled"}>
              <span class="bk-name">${T("Tweaks")}</span>
              <span class="bk-zweck">${this.spr === "en" ? s.zweckEn : s.zweckDe}</span>
              <span class="bk-zahl">${anV}/${vorlagen}</span>
            </button>
          </div>
        </section>`;

      return `
        <section class="bk-sorte">
          <h3>${name}${vorlagen ? ` <span class="bk-zahl">${anV}/${vorlagen} ${T("Tweaks")}</span>` : ""}</h3>
          <div class="bk-teile ${schluessel === "palette" ? "mini" : ""}">
            ${s.teile.map((teil) => {
              const an = sitzt[schluessel] === teil.id;
              // Zehn Hintergruende mit Namen allein sind nicht zu
              // unterscheiden. Der Streifen zeigt die vier Farben des Teils -
              // im Modus, in dem der Nutzer gerade sitzt, sonst waere er eine
              // Auskunft ueber den anderen.
              const v = teil.vorschau && teil.vorschau[dunkel ? "dark" : "light"];
              // Eine Palette zeigt ihre Farben als Tupfer, nicht als Streifen:
              // Sie ist ein SATZ einzelner Toene, kein Verlauf. Gemeldet am
              // 14.10.2026 - "ich habe keine farben zum auswaehlen", und zu
              // Recht: Da stand nur Text.
              const tupfer = schluessel === "palette" ? palettenVorschau(teil, dunkel) : null;
              const zweck = this.spr === "en" ? teil.zweckEn : teil.zweckDe;
              return `
              <button class="bk-teil ${an ? "an" : ""}" data-bk-sorte="${schluessel}"
                      data-bk-teil="${teil.id}" ${m ? "" : "disabled"}
                      ${tupfer ? `title="${esc(zweck)}"` : ""}>
                ${v ? `<span class="bk-streifen" style="background:${v}"></span>` : ""}
                ${tupfer ? `<span class="bk-tupfer">${tupfer.map((f) =>
                    `<i style="background:${f.hex}" title="${f.rolle}"></i>`).join("")}</span>` : ""}
                <span class="bk-name">${this.spr === "en" ? teil.en : teil.de}</span>
                ${tupfer ? "" : `<span class="bk-zweck">${zweck}</span>`}
                ${an ? `<span class="bk-haken"><ha-icon icon="mdi:check"></ha-icon></span>` : ""}
              </button>`;
            }).join("")}
            ${schluessel === "palette" ? `
            <button class="bk-teil bk-eigen" data-bk-farbfenster ${m ? "" : "disabled"}
                    title="${esc(T("Eigene Farben eingeben"))}">
              <span class="bk-tupfer">${(this._freieFarben && FREIE_ROLLEN.some((r) => this._freieFarben[r.rolle])
                  ? palettenVorschau(eigenePalette(this._freieFarben, this._freieFarben.akzent), dunkel)
                  : []).map((f) => `<i style="background:${f.hex}" title="${f.rolle}"></i>`).join("")
                  || `<i class="bk-leer"></i><i class="bk-leer"></i><i class="bk-leer"></i>`}</span>
              <span class="bk-name">${T("Eigene...")}</span>
            </button>` : ""}
          </div>
        </section>`;
    };

    // Eine Sorte offen? Dann ihre Seite statt der Uebersicht - im SELBEN
    // Dialog, mit einem Weg zurueck.
    const seite = this._bkSeite && BAUKASTEN[this._bkSeite] ? this._bkSeite : null;
    const sTitel = seite ? (this.spr === "en" ? BAUKASTEN[seite].en : BAUKASTEN[seite].de) : null;

    d.innerHTML = `
      <header class="dkopf">
        <div>
          <h2>${seite ? sTitel : T("Baukasten")}</h2>
          <p>${seite ? T("Baukasten") : T("Fertige Teile zusammenstecken")}${m ? "" : " · " + T("erst eine Theme oeffnen")}</p>
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>

      <div class="dinhalt bk">
        ${seite ? this.bkSeiteHtml(seite, T) : `
        ${glasOhneGrund ? `
        <p class="bk-hinweis">
          <ha-icon icon="mdi:information-outline"></ha-icon>
          ${T("Glas braucht einen Hintergrund, der etwas hergibt")}
        </p>` : ""}

        ${Object.keys(BAUKASTEN).map(sorteHtml).join("")}

        <p class="bk-fuss">${T("Danach feinjustieren in den acht Stufen")}</p>`}
      </div>
    `;

    d.querySelector(".zu")?.addEventListener("click", () => this.schliesse());
    if (seite) this.bindeBkSeite(d); else this.bindeBaukasten(d);
  }

  // Die Seite einer Sorte: das gewaehlte Teil, seine Stellschrauben, seine
  // Vorlagen.
  //
  // IM SELBEN Dialog, nicht als zweiter darueber. Ein Dialog im Dialog waere
  // ein Kind eines Elements mit backdrop-filter - und das wird zum
  // Bezugsrahmen fuer position: fixed. Genau daran sind Bubble-Pop-ups auf
  // Hoehe 0 geschrumpft.
  bkSeiteHtml(schluessel, T) {
    const s = BAUKASTEN[schluessel];
    const m = ZUSTAND.modell;
    const lies = (name, ebene) => {
      if (!m) return undefined;
      const k = name.replace(/^--/, "");
      return ebene === "beide" ? m.flach[k] : m[ebene]?.[k];
    };
    const teilId = s.nurVorlagen ? null : erkenneTeil(schluessel, lies);
    const teil = s.teile.find((x) => x.id === teilId);
    const felder = SORTEN_FELDER[schluessel] || [];
    const vorlagenIds = SORTEN_VORLAGEN[schluessel] || [];
    const vorlagen = vorlagenIds.map((id) => VORLAGEN.find((v) => v.id === id)).filter(Boolean);

    return `
      <div class="bk-seite">
        <button class="bk-zurueck" data-bk-zurueck>
          <ha-icon icon="mdi:arrow-left"></ha-icon> ${T("Alle Teile")}
        </button>

        ${teil ? `
        <div class="bk-gewaehlt">
          <span class="bk-name">${this.spr === "en" ? teil.en : teil.de}</span>
          <span class="bk-zweck">${this.spr === "en" ? teil.zweckEn : teil.zweckDe}</span>
        </div>` : (s.nurVorlagen ? `
        <p class="bk-zweck">${this.spr === "en" ? s.zweckEn : s.zweckDe}</p>` : "")}

        ${felder.length ? `
        <section class="bk-sorte">
          <h3>${T("Nachjustieren")}</h3>
          <div class="bk-regler">
            ${felder.map((f) => {
              const wert = lies(f.v, "beide") ?? "";
              const zahl = parseFloat(String(wert)) || (f.art === "zahl" ? 1 : 0);
              return `
              <label class="bk-regel">
                <span>${this.spr === "en" ? f.en : f.de}</span>
                <input type="range" data-bk-feld="${f.v}" data-bk-art="${f.art}"
                       min="${f.min}" max="${f.max}" step="${f.schritt ?? 1}" value="${zahl}">
                <b data-bk-wert="${f.v}">${wert || "–"}</b>
              </label>`;
            }).join("")}
          </div>
        </section>` : ""}

        ${vorlagen.length ? `
        <section class="bk-sorte">
          <h3>${T("Tweaks")}</h3>
          <div class="bk-tweaks">
            ${vorlagen.map((v) => {
              const an = m ? vorlageIstAn(m, v) : false;
              return `
              <label class="bk-tweak ${an ? "an" : ""}">
                <input type="checkbox" data-bk-vorlage="${v.id}" ${an ? "checked" : ""} ${m ? "" : "disabled"}>
                <span class="bk-name">${this.spr === "en" ? v.en : v.de}</span>
                <span class="bk-zweck">${this.spr === "en" ? v.zweckEn : v.zweckDe}</span>
              </label>`;
            }).join("")}
          </div>
        </section>` : ""}
        ${schluessel === "hintergrund" ? hintergrundSeiteHtml({ modell: m, spr: this.spr, wetter: wetterEntitaeten(this._hass) }) : ""}
      </div>`;
  }

  // Das Fenster fuer eigene Farben
  //
  // Auf Ansage vom 14.10.2026 zuerst als Abschnitt auf der Farbseite, am
  // 15.10.2026 auf Ansage ins Fenster gezogen: "koennen wir so ein fenster
  // machen wo der user eigene farben eingeben kann", mit einem Bild der
  // Gruvbox-Kachel. Es liegt deshalb im ZWEITEN Overlay - ueber dem
  // Baukasten, nicht an seiner Stelle.
  //
  // WAS DER WAEHLER ZEIGT, ist Stufe 50 der jeweiligen Rolle - nicht die
  // Basis, aus der die Rampe einmal entstand. Die laesst sich naemlich nicht
  // zurueckrechnen: rampe() nimmt nur Farbton und Saettigung, und beim Weg
  // durch Hex geht davon so viel verloren, dass eine zweite Runde eine andere
  // Rampe ergibt (am 14.10.2026 an vier Farben gegengeprobt, keine kam
  // identisch zurueck).
  //
  // Das ist aber kein Problem, sondern genauer: Stufe 50 ist der Ton, den man
  // auf dem Schirm SIEHT. Und gedreht wird nur, was der Nutzer anfasst - aus
  // seiner Farbe entsteht dann eine saubere neue Rampe. Ohne Anfassen wird
  // nichts neu gerechnet, also driftet auch nichts.
  //
  // Gemerkt wird die Wahl NUR fuer diese Sitzung. Ein eigenes Feld in der
  // Theme waere ein Hilfsfeld, und die bleiben beim Abschalten als Verweis
  // ins Leere stehen. Nach dem Neuladen steht im Waehler wieder, was die
  // Theme hergibt - das ist die Wahrheit, nur weniger bequem.
  zeigeFarbfenster() {
    const T = (x) => t(x, this.spr);
    const m = ZUSTAND.modell;
    if (!m) return;
    const modus = this._hass?.themes?.darkMode ? "dark" : "light";
    const lies = (name, ebene) => {
      const k = name.replace(/^--/, "");
      return ebene === "beide" ? m.flach[k] : m[ebene]?.[k];
    };
    this._freieFarben ??= {};

    const zeile = (rolle, name, wahl, ist) => `
      <label class="bk-farbe">
        <input type="color" data-ff-rolle="${rolle}"
               value="${/^#[0-9a-f]{6}$/i.test(wahl) ? wahl : "#888888"}">
        <span>${name}</span>
        <b title="${esc(T("Stufe 50 der Rampe - der Ton, der auf dem Schirm landet"))}">${ist || "–"}</b>
      </label>`;

    const d = this.shadowRoot.querySelector(".overlay.zwei .dialog");
    const akzent = lies("--accent-color", modus) || "";
    d.innerHTML = `
      <header class="dkopf">
        <div><h2>${T("Eigene Farben")}</h2><p>${T("Jede Farbe erzeugt elf Stufen")}</p></div>
        <button class="zu" aria-label="${esc(T("Schließen"))}">✕</button>
      </header>
      <div class="feldseite">
        <p class="bk-zweck">${T("Neutral fehlt mit Absicht - HA rechnet die Rolle grau, egal welcher Ton hineingeht.")}</p>
        <div class="bk-farben">
          ${FREIE_ROLLEN.map((r) => zeile(r.rolle, this.spr === "en" ? r.en : r.de,
              this._freieFarben[r.rolle] || lies(`--ha-color-${r.rolle}-50`, "beide") || "",
              lies(`--ha-color-${r.rolle}-50`, "beide") || "")).join("")}
          ${zeile("akzent", T("Akzent"), this._freieFarben.akzent || akzent, akzent)}
        </div>
        <div class="ff-vorschau"><span class="bk-tupfer"></span>
          <em>${T("So sehen die Tupfer der Palette danach aus")}</em></div>
        <div class="importwege">
          <button class="modalknopf ff-anwenden">${T("Uebernehmen")}</button>
        </div>
      </div>`;

    const tupfer = d.querySelector(".ff-vorschau .bk-tupfer");
    const zeichneTupfer = () => {
      const teil = eigenePalette(this._freieFarben, this._freieFarben.akzent);
      tupfer.innerHTML = palettenVorschau(teil, modus === "dark")
        .map((f) => `<i style="background:${f.hex}" title="${f.rolle}"></i>`).join("");
    };
    // Erst einmal mit dem, was die Theme schon hergibt - sonst steht die
    // Vorschau leer da, bis jemand eine Farbe anfasst.
    for (const r of FREIE_ROLLEN)
      this._freieFarben[r.rolle] ??= lies(`--ha-color-${r.rolle}-50`, "beide") || undefined;
    this._freieFarben.akzent ??= akzent || undefined;
    zeichneTupfer();

    d.querySelectorAll("[data-ff-rolle]").forEach((el) =>
      el.addEventListener("input", () => {
        this._freieFarben[el.dataset.ffRolle] = el.value;
        zeichneTupfer();
      })
    );
    d.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    d.querySelector(".ff-anwenden").addEventListener("click", () => {
      const teil = eigenePalette(this._freieFarben, this._freieFarben.akzent);
      // Dieselbe Strecke wie eine Kachel: teilAnwenden schreibt nicht selbst,
      // es meldet nur, was es gesetzt hat - die Buchfuehrung bleibt hier.
      const r = teilAnwenden("palette", teil, (name, wert, ebene) => {
        const k = name.replace(/^--/, "");
        if (wert === "" || wert === null || wert === undefined) entferne(ZUSTAND.modell, k);
        else setze(ZUSTAND.modell, k, wert, ebene);
        ZUSTAND.geaendert.add(k);
      });
      ZUSTAND.meldung = { art: "gut",
        text: `${T("Eigene Farben")} · ${r.gesetzt} ${t("Felder gesetzt", this.spr)}` };
      this.schliesseFeld();
      this.zeichneBaukasten();
      this.zeichneZaehler();
    });

    const o = this.shadowRoot.querySelector(".overlay.zwei");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
  }

  bindeBkSeite(wurzel) {
    wurzel.querySelector("[data-bk-zurueck]")?.addEventListener("click", () => {
      this._bkSeite = null;
      this.zeichneBaukasten();
    });

    // Die Regler schreiben erst beim Loslassen ins Modell, nicht bei jedem
    // Pixel: Ein input-Ereignis je Mauszucken wuerde den Aenderungszaehler
    // fluten und bei jedem Schritt neu zeichnen.
    wurzel.querySelectorAll("[data-bk-feld]").forEach((r) => {
      const anzeige = wurzel.querySelector(`[data-bk-wert="${r.dataset.bkFeld}"]`);
      const text = () => r.dataset.bkArt === "mass" ? r.value + "px" : r.value;
      r.addEventListener("input", () => { if (anzeige) anzeige.textContent = text(); });
      r.addEventListener("change", () => {
        if (!ZUSTAND.modell) return;
        const k = r.dataset.bkFeld.replace(/^--/, "");
        setze(ZUSTAND.modell, k, text(), "beide");
        ZUSTAND.geaendert.add(k);
        this.zeichneZaehler();
      });
    });


    wurzel.querySelectorAll("[data-bk-vorlage]").forEach((el) =>
      el.addEventListener("change", () => {
        if (!ZUSTAND.modell) return;
        const v = VORLAGEN.find((x) => x.id === el.dataset.bkVorlage);
        if (!v) return;
        // vorlageAn haengt an, statt zu ersetzen - eigenes CSS im selben Feld
        // bleibt stehen.
        if (el.checked) vorlageAn(ZUSTAND.modell, v); else vorlageAus(ZUSTAND.modell, v);
        ZUSTAND.geaendert.add("uix-" + v.ziel);
        this.zeichneBaukasten();
        this.zeichneZaehler();
      })
    );

    // Der Hintergrund hat Stellgroessen, die kein Kaestchen sind - Stufe,
    // Entitaet, Staerke. Seine Seite zeichnet und verdrahtet
    // hintergrund-seite.js; hier bleibt nur die Buchfuehrung.
    if (this._bkSeite === "hintergrund") bindeHintergrundSeite(wurzel, {
      modell: () => ZUSTAND.modell,
      spr: this.spr,
      gemeldet: (felder) => { for (const k of felder) ZUSTAND.geaendert.add(k); this.zeichneZaehler(); },
      zeichne: () => this.zeichneBaukasten(),
    });
  }

  bindeBaukasten(wurzel) {
    // Eine Sorte ohne Teile - sie wird nur geoeffnet, nichts angewendet.
    wurzel.querySelectorAll("[data-bk-seite]").forEach((b) =>
      b.addEventListener("click", () => {
        this._bkSeite = b.dataset.bkSeite;
        this.zeichneBaukasten();
      })
    );
    wurzel.querySelector("[data-bk-farbfenster]")?.addEventListener("click",
      () => this.zeigeFarbfenster());
    wurzel.querySelectorAll("[data-bk-teil]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!ZUSTAND.modell) return;
        const sorte = b.dataset.bkSorte;
        const teil = BAUKASTEN[sorte]?.teile.find((x) => x.id === b.dataset.bkTeil);
        if (!teil) return;

        // Ein Klick auf das Teil, das schon sitzt, oeffnet nur seine Seite -
        // er wendet es NICHT noch einmal an.
        //
        // Sonst verliert man beim zweiten Klick jede Feinjustierung: Wer Glas
        // waehlt, die Rundung auf 28px zieht und dann nochmal auf Glas klickt,
        // steht wieder bei 20px. Am 13.10.2026 beim Durchspielen genau so
        // passiert - und es sieht nicht nach einem Fehler aus, sondern nach
        // einem Wert, der nicht haelt.
        if (b.classList.contains("an")) {
          // Hat die Sorte keine Unterseite, ist hier nichts zu tun: Das Teil
          // sitzt schon, und eine Seite, die nur es selbst zeigt, waere ein
          // Klick ins Leere.
          if (!seiteHatInhalt(sorte)) return;
          this._bkSeite = sorte;
          this.zeichneBaukasten();
          return;
        }

        // teilAnwenden schreibt nicht selbst ins Modell - es bekommt ein
        // schreibe() und meldet, was es gesetzt hat. So bleibt die
        // Buchfuehrung hier, wo sie hingehoert.
        const r = teilAnwenden(sorte, teil, (name, wert, ebene) => {
          const k = name.replace(/^--/, "");
          // Ein leerer Wert heisst "Feld weg", nicht "Feld leer": Ein
          // geschriebenes leeres Feld steht in der Datei und ueberschreibt
          // HAs eigene Vorgabe mit nichts.
          if (wert === "" || wert === null || wert === undefined) entferne(ZUSTAND.modell, k);
          else setze(ZUSTAND.modell, k, wert, ebene);
          ZUSTAND.geaendert.add(k);
        });

        // Der Hintergrund hat eine Bewegung, die zum Bild passen muss - und
        // eine Vorgabe, wenn noch keine eingestellt ist. Beides steht in
        // hintergrund-seite.js; hier bleibt die Buchfuehrung.
        if (sorte === "hintergrund") {
          for (const f of hintergrundGewaehlt(ZUSTAND.modell).felder) ZUSTAND.geaendert.add(f);
        }

        ZUSTAND.meldung = { art: "gut",
          text: `${this.spr === "en" ? teil.en : teil.de} · ${r.gesetzt} ${t("Felder gesetzt", this.spr)}` };
 // Anwenden UND oeffnen, nicht zweimal klicken lassen: Wer ein Teil
        // waehlt, will als Naechstes sehen, was daran noch zu drehen ist.
        //
        // Ausser es gibt nichts zu drehen. Bei den Farben stand dann eine
        // Seite da, auf der nur dieselbe Kachel noch einmal lag - am
        // 14.10.2026 gemeldet. Jetzt bleibt die Liste stehen, und der Haken,
        // der auf das neue Teil springt, ist die Rueckmeldung.
        if (seiteHatInhalt(sorte)) this._bkSeite = sorte;
        this.zeichneBaukasten();
        this.zeichneZaehler();
        // Die Meldung steht auf der Seite HINTER dem Dialog - sie wird erst
        // beim Schliessen sichtbar. Der Haken am Teil ist die Rueckmeldung,
        // die sofort ankommt.
        const mz = this.shadowRoot.querySelector(".meldung");
        if (mz) { mz.textContent = ZUSTAND.meldung.text; mz.className = "meldung gut"; }
      })
    );
  }

  // Die Hilfeseite: jedes Feld, das HATS anbietet, mit einem Satz dazu
  //
  // Auf Ansage vom 15.10.2026, mit einer uebergebenen Seite "Theme-Variablen"
  // in der Hand: "koennen wir damit eine hilfeseite aufbauen".
  //
  // GEBAUT AUS DER EIGENEN FELDLISTE, nicht aus der Seite. Die Gruende stehen
  // im Kopf von hilfe.js; der wichtigste: Die Seite erklaert 78 der 463
  // Felder. Gebaut aus STUFEN ist die Hilfe vollstaendig, kann nicht
  // auseinanderlaufen, und jedes neue Feld steht sofort darin.
  //
  // DIE LUECKE IST ABSICHT. Ein Feld ohne Satz zeigt "noch kein Satz" statt
  // gar nicht aufzutauchen - so ist die Hilfeseite zugleich die Arbeitsliste.
  // Oben steht, wie viele es sind.
  oeffneHilfe() {
    this._offen = "hilfe";
    this.zeichneHilfe();
    const o = this.shadowRoot.querySelector(".overlay");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
    document.addEventListener("keydown", this._esc);
  }

  zeichneHilfe() {
    const T = (x) => t(x, this.spr);
    const d = this.shadowRoot.querySelector(".dialog");
    let mit = 0, ohne = 0;
    const benutzt = new Set();
    const satz = (e) => (e && (e[this.spr] || e.de)) || "";

    const stufen = STUFEN.map((st) => {
      const gruppen = (st.gruppen || []).map((g) => {
        const zeilen = (g.felder || []).map((f) => {
          benutzt.add(f.v);
          const e = satz(ERKLAERUNGEN[f.v]);
          if (e) mit++; else ohne++;
          return `
            <tr${e ? "" : ' class="hi-leer"'}>
              <td><code>${f.v}</code></td>
              <td>${this.spr === "en" ? (f.en || f.t) : f.t}</td>
              <td>${e ? esc(e) : `<em>${T("noch kein Satz")}</em>`}</td>
            </tr>`;
        }).join("");
        return `
          <h4>${g.name}</h4>
          <p class="zweck">${T(ZWECK[g.name] || "")}</p>
          <table class="hi-tab"><tbody>${zeilen}</tbody></table>`;
      }).join("");
      return `
        <section class="hi-stufe">
          <h3><span class="hi-nr" style="background:${st.marke}">${st.n}</span>${T(st.titel)}</h3>
          ${gruppen}
        </section>`;
    }).join("");

    const merk = MERKSAETZE.map((m) => {
      const x = m[this.spr] || m.de;
      return `
      <section class="hi-merk">
        <h4>${esc(x.titel)}</h4>
        ${m.bild ? `<img src="${HILFE_BILDER}${m.bild}" alt="" loading="lazy">` : ""}
        <p>${esc(x.text).replace(/\n/g, "<br>")}</p>
      </section>`;
    }).join("");

    const lesen = AUSLESEN.map((a) => {
      const x = a[this.spr] || a.de;
      return `
      <section class="hi-merk">
        <h4>${esc(x.titel)}</h4>
        <p>${esc(x.text)}</p>
        <pre><code>${esc(a.code)}</code></pre>
      </section>`;
    }).join("");

    // Saetze, die auf KEIN Feld des Panels zeigen. Sie stammen aus der
    // uebergebenen Seite und beschreiben Felder, die Home Assistant kennt und
    // HATS nicht anbietet. Sie fielen bis zum 15.10.2026 stumm weg - jetzt
    // stehen sie am Ende als Liste. Dasselbe Prinzip wie NOCH_OHNE_KACHEL im
    // Build-Skript: Was fehlt, gehoert sichtbar, nicht verschwiegen.
    const fremd = Object.keys(ERKLAERUNGEN).filter((v) => !benutzt.has(v)).sort();
    const ohneKachel = !fremd.length ? "" : `
      <section class="hi-stufe">
        <h3><span class="hi-nr" style="background:var(--s-tinte-leise)">+</span>${T("Kennt Home Assistant, bietet HATS nicht an")}</h3>
        <p class="zweck">${T("Diese Felder lassen sich hier nicht einstellen - der Satz steht trotzdem da, damit die Luecke sichtbar ist.")}</p>
        <table class="hi-tab"><tbody>${fremd.map((v) => `
          <tr><td><code>${v}</code></td><td></td><td>${esc(satz(ERKLAERUNGEN[v]))}</td></tr>`).join("")}
        </tbody></table>
      </section>`;

    d.innerHTML = `
      <header class="dkopf">
        <div><h2>${T("Was macht welche Variable?")}</h2>
          <p>${mit + ohne} ${T("Felder")} · ${mit} ${T("mit Satz")} · ${ohne} ${T("noch offen")}</p></div>
        <button class="zu" aria-label="${esc(T("Schließen"))}">✕</button>
      </header>
      <div class="hilfeseite">
        <div class="hi-merke">${merk}${lesen}</div>
        ${stufen}
        ${ohneKachel}
      </div>`;
    d.querySelector(".zu").addEventListener("click", () => this.schliesse());
  }

  oeffneUix() {
    this._offen = "uix";
    this.zeichneUix();
    const o = this.shadowRoot.querySelector(".overlay");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
    document.addEventListener("keydown", this._esc);
  }

  zeichneUix() {
    const T = (x) => t(x, this.spr);
    const m = ZUSTAND.modell;
    const an = m ? UIX_ZIELE.filter((z) => m.flach["uix-" + z.id] !== undefined).length : 0;
    const vAn = m ? VORLAGEN.filter((v) => vorlageIstAn(m, v)).length : 0;
    const d = this.shadowRoot.querySelector(".dialog");
    const zeigeZiele = this._uixZiele === true;

    d.innerHTML = `
      <header class="dkopf">
        <div>
          <h2>UIX</h2>
          <p>${vAn} ${T("von")} ${VORLAGEN.length} ${T("Vorlagen an")} · ${an} ${T("von")} ${UIX_ZIELE.length} ${T("Stilzielen an")}${m ? "" : " · " + T("erst eine Theme oeffnen")}</p>
        </div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="uixseite">
        <p class="noch">${T("UI eXtension schreibt dein CSS dorthin, wo Home Assistant es sonst nicht hinlaesst - in den Shadow Root des jeweiligen Bauteils. Eine Vorlage legt einen fertigen Block an; ein Stilziel gibt dir ein leeres Feld fuer eigenes CSS.")}</p>

        ${VORLAGEN_GRUPPEN.map((g) => {
          const drin = VORLAGEN.filter((v) => v.gruppe === g.id);
          if (!drin.length) return "";
          return `
            <h3 class="uixtitel">${this.spr === "en" ? g.en : g.de}</h3>
            <div class="vorlagenraster">
              ${drin.map((v) => this.vorlagenKarte(v, m, T)).join("")}
            </div>`;
        }).join("")}

        <button class="uixtitel auftun ${zeigeZiele ? "offen" : ""}" data-uix-ziele>
          <ha-icon icon="${zeigeZiele ? "mdi:chevron-down" : "mdi:chevron-right"}"></ha-icon>
          ${T("Stilziele fuer eigenes CSS")}
          <span>${an}/${UIX_ZIELE.length}</span>
        </button>
        ${zeigeZiele ? `
        <div class="uixraster">
          ${UIX_ZIELE.map((z) => {
            const name = "uix-" + z.id;
            const offen = m ? m.flach[name] !== undefined : false;
            const wert = m ? (m.flach[name] ?? ZUSTAND.uixAus[name] ?? "") : "";
            return `
              <div class="uixziel ${offen ? "an" : ""}">
                <label class="uixkopf">
                  <input type="checkbox" data-uix="${z.id}" ${offen ? "checked" : ""}
                         ${m ? "" : "disabled"}>
                  <span>${this.spr === "en" ? z.en : z.de}</span>
                  <code>${name}</code>
                </label>
                ${offen ? `<textarea class="uixcss" data-uix-css="${z.id}" spellcheck="false"
                          placeholder="ha-card { ... }">${String(wert).replace(/</g, "&lt;")}</textarea>` : ""}
              </div>`;
          }).join("")}
        </div>` : ""}
      </div>`;

    d.querySelector(".zu").addEventListener("click", () => this.schliesse());
    this.bindeUix(d);
  }

  // Eine Vorlage als Karte: Vorher/Nachher-Bild, Name, Zweck, Schalter.
  //
  // Das Bild ist der Punkt. Ein Vorlagenname sagt niemandem, was er bekommt -
  // "Lichtkante auf Karten" kann alles heissen. Fehlt das Bild, steht da ein
  // Platzhalter statt eines kaputten Rahmens.
  vorlagenKarte(v, m, T) {
    const offen = m ? vorlageIstAn(m, v) : false;
    const ziel = UIX_ZIELE.find((z) => z.id === v.ziel);
    return `
      <div class="vorlage ${offen ? "an" : ""}">
        <!-- Zwei Bilder uebereinander: oben das Nachher, darunter das Vorher.
             Beim Ueberfahren blendet das obere weg - damit sieht man den
             Unterschied an derselben Stelle, statt zwei Bilder nebeneinander
             vergleichen zu muessen.
             Beide Bilder zeigen DIESELBE Theme; der einzige Unterschied ist
             diese eine Vorlage. Ein Vorher-Bild mit einer anderen Theme waere
             ein Vergleich zweier Dinge auf einmal. -->
        <div class="vbild">
          <img class="vvorher" src="/hats_static/vorschau/${v.id}-vorher.jpg" alt="" loading="lazy">
          <img class="vnachher" src="/hats_static/vorschau/${v.id}-nachher.jpg" alt="" loading="lazy"
               onerror="this.closest('.vbild').classList.add('ohne')">
          <span class="vmarke">${T("vorher")}</span>
          <span class="vleer">${T("noch kein Bild")}</span>
        </div>
        <div class="vtext">
          <b>${this.spr === "en" ? v.en : v.de}</b>
          <p>${this.spr === "en" ? v.zweckEn : v.zweckDe}</p>
          <code>uix-${v.ziel}${ziel ? " · " + (this.spr === "en" ? ziel.en : ziel.de) : ""}</code>
        </div>
        <label class="vschalter">
          <input type="checkbox" data-vorlage="${v.id}" ${offen ? "checked" : ""} ${m ? "" : "disabled"}>
          <span>${T("an")}</span>
        </label>
      </div>`;
  }

  // Die beiden Draehte des UIX-Dialogs. Eigene Funktion, weil der Dialog sich
  // nach jedem Schalten neu zeichnet - und die Draehte dann mit.
  bindeUix(wurzel) {
    // Vorlagen an und aus. vorlageAn haengt an, statt zu ersetzen - eigenes
    // CSS im selben Feld bleibt stehen.
    wurzel.querySelectorAll("[data-vorlage]").forEach((el) =>
      el.addEventListener("change", () => {
        if (!ZUSTAND.modell) return;
        const v = VORLAGEN.find((x) => x.id === el.dataset.vorlage);
        if (!v) return;
        if (el.checked) vorlageAn(ZUSTAND.modell, v); else vorlageAus(ZUSTAND.modell, v);
        ZUSTAND.geaendert.add("uix-" + v.ziel);
        this.zeichneUix();
        this.zeichneZaehler();
      })
    );
    const auftun = wurzel.querySelector("[data-uix-ziele]");
    if (auftun) auftun.addEventListener("click", () => {
      this._uixZiele = !this._uixZiele;
      this.zeichneUix();
    });

    // Ausschalten darf nichts vernichten: Das CSS wandert nach ZUSTAND.uixAus
    // und kommt beim Einschalten zurueck. Sonst waere ein Fehlklick der
    // Verlust einer Stunde Arbeit.
    wurzel.querySelectorAll("[data-uix]").forEach((el) =>
      el.addEventListener("change", () => {
        if (!ZUSTAND.modell) return;
        const name = "uix-" + el.dataset.uix;
        if (el.checked) {
          setze(ZUSTAND.modell, name, ZUSTAND.uixAus[name] ?? "", "beide");
          delete ZUSTAND.uixAus[name];
        } else {
          ZUSTAND.uixAus[name] = ZUSTAND.modell.flach[name] ?? "";
          // entferne() raeumt flach, light UND dark - ein delete auf flach
          // allein liesse das Feld unter modes stehen, und es waere weiter
          // in der Datei, waehrend der Schalter aus aussieht.
          entferne(ZUSTAND.modell, name);
        }
        ZUSTAND.geaendert.add(name);
        this.zeichneUix();
        this.zeichneZaehler();
      })
    );
    wurzel.querySelectorAll("[data-uix-css]").forEach((el) =>
      el.addEventListener("change", () => {
        if (!ZUSTAND.modell) return;
        setze(ZUSTAND.modell, "uix-" + el.dataset.uixCss, el.value, "beide");
        ZUSTAND.geaendert.add("uix-" + el.dataset.uixCss);
        this.zeichneZaehler();
      })
    );
  }

  // Der Bericht nach dem Einlesen. Er sagt, was bedienbar ist, was
  // mitgenommen wird und was dabei verloren geht - letzteres beim Namen.
  zeigeBericht() {
    const T = (x) => t(x, this.spr);
    const b = ZUSTAND.bericht;
    if (!b) return;
    const d = this.shadowRoot.querySelector(".overlay.zwei .dialog");
    const liste = (arr, max = 12) => arr.slice(0, max).map((x) => `<code>${x}</code>`).join(" ")
      + (arr.length > max ? ` <em>+${arr.length - max}</em>` : "");

    d.innerHTML = `
      <header class="dkopf">
        <div><h2>${T("Gelesen")}</h2><p>${b.name || T("ohne Namen")}</p></div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="feldseite">
        <div class="berichtzahlen">
          <div><b>${b.felder}</b><span>${T("Felder")}</span></div>
          <div><b>${b.flach}</b><span>${T("flach")}</span></div>
          <div><b>${b.hell}</b><span>${T("hell")}</span></div>
          <div><b>${b.dunkel}</b><span>${T("dunkel")}</span></div>
        </div>

        <div class="berichtzeile gut">
          <b>${b.bedienbar.length}</b> ${T("Felder kannst du hier einstellen")}
        </div>

        ${b.mitgenommen.length ? `
        <div class="berichtzeile">
          <b>${b.mitgenommen.length}</b> ${T("Felder kennt HATS nicht. Sie bleiben unveraendert in der Datei, lassen sich hier aber nicht aendern.")}
          <div class="berichtnamen">${liste(b.mitgenommen)}</div>
        </div>` : ""}

        ${b.stilziele.length ? `
        <div class="berichtzeile warnung">
          <b>${b.stilziele.length}</b> ${T("Stilziele von HATG oder card-mod. Die pflegt HATS nicht - bearbeite so eine Theme besser dort.")}
          <div class="berichtnamen">${liste(b.stilziele, 6)}</div>
        </div>` : ""}

        ${b.unklar.length ? `
        <div class="berichtzeile fehler">
          <b>${b.unklar.length}</b> ${T("Zeilen konnte ich nicht einordnen. Die sind nach dem Speichern WEG:")}
          <div class="berichtnamen">${b.unklar.slice(0, 8).map((x) => `<code>${String(x).replace(/</g, "&lt;")}</code>`).join(" ")}</div>
        </div>` : ""}

        <p class="noch">${T("Geaendert wird im Fenster, geschrieben noch nicht.")}</p>
      </div>`;

    d.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    const o = this.shadowRoot.querySelector(".overlay.zwei");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
  }

  // Datei waehlen oder Text einfuegen.
  zeigeImport() {
    const T = (x) => t(x, this.spr);
    const d = this.shadowRoot.querySelector(".overlay.zwei .dialog");
    d.innerHTML = `
      <header class="dkopf">
        <div><h2>${T("Datei oder Text")}</h2><p>${T("Eine Theme von anderswo einlesen")}</p></div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="feldseite">
        <input type="file" accept=".yaml,.yml,text/yaml,text/plain" class="dateiwahl" hidden>
        <div class="importwege">
          <button class="modalknopf dateiknopf">${T("Datei waehlen...")}</button>
          <span class="dateiname"></span>
        </div>
        <textarea class="importtext" spellcheck="false"
                  placeholder="${T("oder hier das YAML einfuegen")}"></textarea>
        <div class="importfuss">
          <button class="modalknopf einlesen">${T("Einlesen")}</button>
        </div>
      </div>`;

    const feld = d.querySelector(".dateiwahl");
    const text = d.querySelector(".importtext");
    d.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    d.querySelector(".dateiknopf").addEventListener("click", () => feld.click());
    feld.addEventListener("change", async () => {
      const f = feld.files && feld.files[0];
      if (!f) return;
      d.querySelector(".dateiname").textContent = f.name;
      text.value = await f.text();
    });
    d.querySelector(".einlesen").addEventListener("click", () => {
      const roh = text.value.trim();
      if (!roh) { ZUSTAND.meldung = { text: T("Nichts zum Einlesen"), art: "fehler" }; this.zeichne(); return; }
      this.schliesseFeld();
      const quelle = d.querySelector(".dateiname").textContent || T("eingefuegtem Text");
      this.importiereText(roh, quelle);
    });

    const o = this.shadowRoot.querySelector(".overlay.zwei");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
  }

  // Das Startbild: zwei Wege, und darunter die vorhandenen Dateien.
  startbild(T) {
    const d = ZUSTAND.dateien;
    if (d === null) return `<div class="liste"><p class="leer">${T("Lade...")}</p></div>`;

    const meine = d.filter((x) => x.hats && x.name !== "ha_blanko.yaml");
    const fremde = d.filter((x) => !x.hats && x.name !== "ha_blanko.yaml");
    const kb = (n) => (n < 1024 ? n + " B" : Math.round(n / 1024) + " kB");
    // ha_blanko zaehlt nicht mit - es ist die Grundlage, keine Theme zum Oeffnen.
    const zahlDateien = meine.length + fremde.length;

    return `
      <!-- Die Starteinstellungen gehoeren hierher, nicht als Kachelgruppe in
           Stufe 1: Name, Herkunft und Modus entscheiden sich, BEVOR man an
           Farben geht, und die Hintergrundbilder gehoeren dazu.
           Ohne offene Theme werden sie GAR NICHT gezeigt. "Gesperrt statt
           versteckt" gilt fuer die Knopfleiste, wo die Position etwas sagt -
           ein ganzer Einstellungsblock, der nichts tun kann, ist dagegen nur
           Laerm. Am 13.10.2026 gemeldet: "das ist komplett tot", und das
           stimmte. -->
      ${!ZUSTAND.modell ? "" : `
      <div class="starteinst">
        <div class="sezeile">
          <label>${T("Name der Theme")}</label>
          <input class="se-name" type="text" value="${ZUSTAND.name || ""}"
                 placeholder="mein_theme" spellcheck="false">
        </div>
        <div class="sezeile">
          <label>${T("Herkunft")}</label>
          <span class="sewert">${ZUSTAND.meta.Grundlage || "ha_blanko"}</span>
        </div>
        <div class="sezeile">
          <label>${T("Modus")}</label>
          <div class="be-segmente klein">
            ${[["beide", T("Hell + dunkel")], ["hell", T("Nur hell")], ["dunkel", T("Nur dunkel")]]
              .map(([w, n]) => `<button class="se-modus ${ZUSTAND.meta.Modus === w ? "an" : ""}"
                      data-se-modus="${w}">${n}</button>`).join("")}
          </div>
        </div>
        ${[["--lovelace-background", T("Hintergrundbild")],
           ["--popup-custom-wallpaper", T("Pop-up-Hintergrund")]].map(([v, n]) => `
        <div class="sezeile zwei">
          <label>${n}</label>
          ${["light", "dark"].map((mo) => `
          <span class="bildfeld">
            <input class="se-bild" data-v="${v}" data-modus="${mo}" type="text"
                   value="${(ZUSTAND.modell?.[mo === "dark" ? "dark" : "light"]?.[v.slice(2)] ?? "").replace(/"/g, "&quot;")}"
                   placeholder="${mo === "dark" ? T("dunkel") : T("hell")}" spellcheck="false"
                  >
            <button class="bildknopf" data-galerie="${v}" data-galerie-modus="${mo}"
                    title="${T("Bild waehlen")}">
              <ha-icon icon="mdi:image-outline"></ha-icon>
            </button>
          </span>`).join("")}
        </div>`).join("")}
      </div>`}

      <!-- DIE WEGE STEHEN IMMER DA, auch wenn schon eine Theme offen ist.
           Bis zum 15.10.2026 waren sie an "kein Modell" geknuepft: Wer eine
           Theme offen hatte, sah hier nur die Starteinstellungen. Das ging,
           solange die Leiste oben die Wege trug - sie ist jetzt weg, und
           damit waere die Startseite mit offener Theme eine Sackgasse
           gewesen: kein Weg zu einer anderen Datei, keiner zu einer neuen.
           Beim Umbau selbst aufgefallen, nicht im Betrieb. -->
      <!-- Fuenf Wege, gross und beschriftet.
           Hier stand bis zum 13.10.2026 ein einzelner Satz in der Mitte einer
           leeren Seite, waehrend die Wege als kleine Symbole oben rechts lagen -
           gesperrt, unbeschriftet und damit unlesbar. Auf Ansage: "warum machen
           wir auf der seite womit faengst du an nicht grosse buttons mit laden
           neu aus vorlage und so weiter".
           Die Symbolleiste bleibt, sie ist der schnelle Weg fuer den, der das
           Panel kennt. Diese Karten sind der erste. -->
      <div class="startwege">
        ${[
          { id: "neu", icon: "mdi:file-plus-outline", t: T("Neue Theme"),
            p: T("Leer anfangen, mit Home Assistants eigenen Farben als Grundlage.") },
          { id: "baukasten", icon: "mdi:toy-brick-outline", t: T("Mit dem Baukasten"),
            p: T("Fertige Teile zusammenstecken: Farben, Schrift, Karten, Hintergrund.") },
          { id: "oeffnen", icon: "mdi:folder-open-outline", t: T("Vorhandene oeffnen"),
            p: `${zahlDateien} ${zahlDateien === 1 ? T("Theme auf dieser Instanz") : T("Themes auf dieser Instanz")}` },
          { id: "lesen", icon: "mdi:file-import-outline", t: T("Datei oder Text"),
            p: T("Eine Theme von anderswo einlesen - auch eine fremde.") },
          // Die Hilfe steht hier, weil sie VOR der ersten Entscheidung
          // gebraucht wird und nicht erst danach. Sie ist der einzige Weg,
          // der keine Theme anfasst.
          { id: "hilfe", icon: "mdi:help-circle-outline", t: T("Was macht welche Variable?"),
            p: T("Jedes Feld, das HATS anbietet, mit einem Satz dazu.") },
        ].map((w) => `
        <button class="startweg" data-start="${w.id}">
          <ha-icon icon="${w.icon}"></ha-icon>
          <b>${w.t}</b>
          <span>${w.p}</span>
        </button>`).join("")}
      </div>
    `;
  }

  // Die Dateiliste als Dialog hinter dem Ordner-Symbol.
  //
  // Sie stand bis zum 13.10.2026 auf der Startseite. Geoeffnet wird aber ueber
  // die Symbole - dann gehoert die Liste auch dorthin und nicht als staendiger
  // Block in die Seite.
  async zeigeDateien() {
    const T = (x) => t(x, this.spr);
    if (ZUSTAND.dateien === null) await this.ladeListe();
    const d = ZUSTAND.dateien || [];
    const meine = d.filter((x) => x.hats && x.name !== "ha_blanko.yaml");
    const fremde = d.filter((x) => !x.hats && x.name !== "ha_blanko.yaml");
    const kb = (n) => (n < 1024 ? n + " B" : Math.round(n / 1024) + " kB");

    const dlg = this.shadowRoot.querySelector(".overlay.zwei .dialog");
    dlg.innerHTML = `
      <header class="dkopf">
        <div><h2>${T("Vorhandene oeffnen")}</h2>
             <p>${meine.length} ${T("von HATS")} &middot; ${fremde.length} ${T("fremde")}</p></div>
        <button class="zu" aria-label="${T("Schließen")}">✕</button>
      </header>
      <div class="feldseite">
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
        </div>` : `<p class="leer">${T("Noch keine - die erste entsteht beim Speichern")}</p>`}

        ${fremde.length ? `<div class="liste schmal fremd">
          <p class="leer">${T("Mit einem anderen Werkzeug gebaut. Lesen geht - was HATS nicht kennt, bleibt unveraendert in der Datei:")}</p>
          ${fremde.map((x) => `
            <div class="zeile datei" data-datei="${x.name}">
              <span class="punkt"></span>
              <div class="zeilentext"><b>${x.name.replace(/\.yaml$/, "")}</b><small>${kb(x.bytes)}</small></div>
              <span class="stempel">${T("lesen")}</span>
            </div>`).join("")}
        </div>` : ""}
      </div>`;

    dlg.querySelector(".zu").addEventListener("click", () => this.schliesseFeld());
    dlg.querySelectorAll(".zeile.datei").forEach((z) =>
      z.addEventListener("click", () => { this.schliesseFeld(); this.oeffneDatei(z.dataset.datei); })
    );
    const o = this.shadowRoot.querySelector(".overlay.zwei");
    o.hidden = false;
    requestAnimationFrame(() => o.classList.add("da"));
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

  // Eine vorhandene Theme oeffnen - auch eine fremde.
  //
  // Lange war das gesperrt, aus Sorge, fremde Felder gingen verloren. Gemessen
  // stimmt das nicht: leseTheme legt JEDES Feld ins Modell, und schreibeTheme
  // gibt es wieder aus, ob die Oberflaeche es kennt oder nicht. Was fehlte,
  // war nicht die Faehigkeit, sondern die Auskunft - deshalb der Bericht.
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
      ZUSTAND.bericht = berichtUeberTheme(m, BEKANNT, EIGENE_ZIELE);
    } catch (e) {
      ZUSTAND.meldung = { text: "Nicht geoeffnet: " + (e.message || e.code || e), art: "fehler" };
    }
    this.zeichne();
    if (ZUSTAND.bericht) this.zeigeBericht();
  }

  // Dieselbe Strecke fuer eingefuegten Text oder eine gewaehlte Datei. Der
  // Name kommt aus dem Theme selbst, nicht aus dem Dateinamen - in der Datei
  // steht er als Wurzelschluessel, und der ist massgeblich.
  importiereText(text, quelle) {
    const m = leseTheme(text || "");
    if (m.fehler) {
      ZUSTAND.meldung = { text: "Nicht gelesen: " + m.fehler, art: "fehler" };
      this.zeichne();
      return;
    }
    ZUSTAND.modell = m;
    ZUSTAND.name = m.name || "";
    ZUSTAND.meta.Grundlage = quelle;
    this._grundlage = JSON.parse(JSON.stringify(m));
    ZUSTAND.geaendert.clear();
    ZUSTAND.start = false;
    ZUSTAND.meldung = { text: `Gelesen aus ${quelle}`, art: "gut" };
    ZUSTAND.bericht = berichtUeberTheme(m, BEKANNT, EIGENE_ZIELE);
    this.zeichne();
    this.zeigeBericht();
  }

  // Die Theme als Datei herunterladen - ohne Umweg ueber config/themes.
  // Dateiname ist der Theme-Name, nicht "download.yaml": Beim Zurueckspielen
  // ist der Name der Schluessel, und ein falscher legt eine zweite Theme an.
  herunterladen() {
    if (!ZUSTAND.modell) return;
    const name = (ZUSTAND.name || ZUSTAND.modell.name || "theme").trim();
    ZUSTAND.modell.name = name;
    const blob = new Blob([schreibeTheme(ZUSTAND.modell)], { type: "text/yaml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.yaml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ZUSTAND.meldung = { text: `Heruntergeladen: ${name}.yaml`, art: "gut" };
    this.zeichne();
  }

  async kopieren() {
    if (!ZUSTAND.modell) return;
    const text = schreibeTheme(ZUSTAND.modell);
    try {
      await navigator.clipboard.writeText(text);
      ZUSTAND.meldung = { text: "In die Zwischenablage kopiert", art: "gut" };
    } catch (e) {
      // Ohne sicheren Kontext gibt es keine Zwischenablage. Dann nicht
      // schweigen, sondern den Weg nennen, der bleibt.
      ZUSTAND.meldung = { text: "Zwischenablage nicht erreichbar - nimm Herunterladen", art: "fehler" };
    }
    this.zeichne();
  }

  // Zurueck zum Startbild. Wer Ungespeichertes hat, wird gefragt - und zwar
  // einmal, nicht bei jedem Klick.
  zumStart() {
    if (ZUSTAND.geaendert.size && !this._startBestaetigt) {
      this._startBestaetigt = true;
      ZUSTAND.meldung = { text: t("Ungespeicherte Aenderungen - nochmal druecken zum Verlassen", this.spr), art: "fehler" };
      this.zeichne();
      setTimeout(() => { this._startBestaetigt = false; }, 6000);
      return;
    }
    this._startBestaetigt = false;
    ZUSTAND.start = true;
    ZUSTAND.bericht = null;
    ZUSTAND.meldung = null;
    ZUSTAND.dateien = null;
    this.zeichne();
    this.ladeListe();
  }

  // Zurueck auf den Stand beim Oeffnen. _grundlage ist genau dafuer da: Sie
  // haelt die Datei, wie sie hereinkam - nicht die leere Vorlage.
  verwerfen() {
    if (!this._grundlage) return;
    ZUSTAND.modell = JSON.parse(JSON.stringify(this._grundlage));
    const n = ZUSTAND.geaendert.size;
    ZUSTAND.geaendert.clear();
    ZUSTAND.meldung = { text: `${n} ${t("Aenderungen verworfen", this.spr)}`, art: "gut" };
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

  // Ein Fehler beim Zeichnen hinterliess bisher eine leere Flaeche - und wer
  // die sieht, kann nichts damit anfangen und ich auch nicht. Jetzt steht der
  // Fehler da, wo sonst die Oberflaeche waere, mit Datei und Zeile.
  zeichne() {
    try {
      this.zeichneWirklich();
    } catch (e) {
      this.shadowRoot.innerHTML = `
        <style>
          .panne { font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
                   padding: 28px; color: #2a2520; background: #fff5f4;
                   min-height: 100vh; box-sizing: border-box; }
          .panne h2 { font: 600 17px system-ui, sans-serif; margin: 0 0 6px; }
          .panne p { font: 13px system-ui, sans-serif; color: #6b6359; margin: 0 0 18px; }
          .panne pre { white-space: pre-wrap; word-break: break-word;
                       background: #fff; border-radius: 10px; padding: 14px;
                       box-shadow: inset 0 0 0 1px rgba(42,37,32,.12); }
        </style>
        <div class="panne">
          <h2>HATS konnte die Oberflaeche nicht zeichnen</h2>
          <p>Version ${HATS_VERSION} &middot; schick diesen Text weiter, dann muss niemand raten.</p>
          <pre>${String(e && e.stack || e).replace(/</g, "&lt;")}</pre>
        </div>`;
      // Zusaetzlich in die Konsole, fuer den Fall dass auch das Markup scheitert.
      console.error("[HATS] zeichne()", e);
    }
  }

  zeichneWirklich() {
    const T = (s) => t(s, this.spr);
    const fertig = STUFEN.filter((s) => s.stand === "fertig").length;
    const offen = STUFEN.length - fertig;
    // Wie viele Felder DIESE Theme hat - nicht, wie viele das Panel anbieten
    // koennte.
    //
    // Hier stand felderGesamt, also die Summe ueber alle acht Stufen: 413.
    // Unter der Zeile "Dein Theme im Ueberblick", zwischen "0 Aenderungen" und
    // "zuletzt geaendert" - zwei Zahlen ueber die Theme und eine ueber das
    // Programm. Der Bericht beim Oeffnen sagte derweil 397, und wer beide sah,
    // hielt eine fuer falsch. Am 14.10.2026 beim Durchgehen gemeldet.
    //
    // Was das Panel anbietet, steht ohnehin an jeder Stufe in der Liste
    // darunter ("7 Gruppen, 90 Felder").
    const felderImModell = ZUSTAND.modell
      ? new Set(["flach", "light", "dark"].flatMap((e) => Object.keys(ZUSTAND.modell[e] || {}))).size
      : 0;

    this.shadowRoot.innerHTML = `
      <style>${this.stil()}</style>
      <div class="buehne">
        <div class="wolke a"></div><div class="wolke b"></div>
        <div class="fenster">
          <!-- HIER STAND DIE MENUELEISTE, und sie ist am 15.10.2026 ganz
               gefallen. Auf Ansage: "die menueleist in hats kann doch
               eigendlich auch weg. wir starten immer mit der womit faengst du
               an seite da kann die hilfe auch noch mit runter und dann ist die
               leiste oben eigendlich ueberfluessig bis auf speichern."

               Der Weg dahin ging ueber zwei Stufen. Zuerst fielen die acht
               Stufenknoepfe, weil die Liste darunter dasselbe tut und dabei
               jede Stufe beim Namen nennt. Was blieb, waren neun
               unbeschriftete Symbole - und jedes davon hat anderswo schon
               einen Platz:

                   neu, lesen, oeffnen, baukasten, hilfe   die Startseite
                   verwerfen, herunterladen, kopieren      gehoeren zur Datei,
                                                           also neben Speichern
                   uix                                     die Werkzeugzeile
                                                           ueber der Liste

               Damit ist die alte Begruendung "eine Leiste statt dreier
               Stellen" endlich eingeloest: Es ist jetzt gar keine Leiste
               mehr, sondern die Seite selbst. -->

          <div class="rumpf">
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
                <!-- Was zur DATEI gehoert, steht neben Speichern: verwerfen,
                     herunterladen, kopieren - und der Weg zurueck zum Anfang.
                     "Bis auf speichern" heisst nicht nur den einen Knopf,
                     sondern das, was mit ihm zu tun hat.
                     Und: zumStart() hatte bis heute GAR KEINEN Aufrufer. Wer
                     eine Theme offen hatte, kam nicht mehr zur Startseite
                     zurueck, ohne das Panel neu zu laden. -->
                ${[
                  { id: "start",     icon: "mdi:home-outline",     t: T("Zurueck zum Anfang") },
                  { id: "verwerfen", icon: "mdi:undo-variant",     t: T("Aenderungen verwerfen"), aus: !ZUSTAND.geaendert.size },
                  { id: "laden2",    icon: "mdi:download-outline", t: T("Als Datei herunterladen") },
                  { id: "kopie2",    icon: "mdi:content-copy",     t: T("In die Zwischenablage") },
                ].map((k) => `
                <button class="kopfknopf" data-schalter="${k.id}"
                        title="${k.t}" aria-label="${k.t}" ${k.aus ? "disabled" : ""}>
                  <ha-icon icon="${k.icon}"></ha-icon>
                </button>`).join("")}
                <button class="speichern">${T("Speichern")}</button>
              </div>`}
            </header>

            ${ZUSTAND.start ? "" : `
            <div class="kennzahlen">
              <div class="kennzahl"><b>${fertig}/${STUFEN.length}</b><span>${T("Stufen fertig")}</span></div>
              <div class="kennzahl" title="${felderGesamt} ${T("bietet das Panel an")}"><b>${felderImModell}</b><span>${T("Felder")}</span></div>
              <div class="kennzahl"><b>${T("gerade eben")}</b><span>${T("zuletzt geändert")}</span></div>
            </div>`}

            <p class="meldung ${ZUSTAND.meldung ? ZUSTAND.meldung.art : ""}">${ZUSTAND.ladefehler ? T("Grundlage nicht geladen: ") + ZUSTAND.ladefehler : (ZUSTAND.meldung ? ZUSTAND.meldung.text : "")}</p>

            ${ZUSTAND.start ? this.startbild(T) : `
            <!-- Die drei Werkzeuge ueber der Liste. Sie sind keine Stufe -
                 sie haben keinen Stand und keine Felderzahl -, gehoeren aber
                 in dieselbe Spalte: Wer hier liest, liest von oben nach
                 unten, und der Baukasten ist der erste Griff. Sie tragen
                 Namen, anders als die Symbole in der alten Leiste. -->
            <div class="werkzeuge">
              ${[
                { id: "baukasten", icon: "mdi:toy-brick-outline", t: T("Baukasten"),
                  p: T("Fertige Teile zusammenstecken: Farben, Schrift, Karten, Hintergrund.") },
                { id: "uix", icon: "mdi:auto-fix", t: "UI eXtension",
                  p: T("Vorlagen und Stilziele - alles, was eine Regel braucht statt eines Werts.") },
                { id: "hilfe", icon: "mdi:help-circle-outline", t: T("Was macht welche Variable?"),
                  p: T("Jedes Feld, das HATS anbietet, mit einem Satz dazu.") },
              ].map((w) => `
              <button class="werkzeug" data-schalter="${w.id}">
                <ha-icon icon="${w.icon}"></ha-icon>
                <div class="wtext"><b>${w.t}</b><span>${w.p}</span></div>
              </button>`).join("")}
            </div>
            <div class="liste">
              ${STUFEN.map((s, i) => this.zeile(s, i, T)).join("")}
            </div>`}
            </section>
          </div>
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

    const seName = this.shadowRoot.querySelector(".se-name");
    if (seName) seName.addEventListener("input", () => { ZUSTAND.name = seName.value.trim(); });
    this.shadowRoot.querySelectorAll("[data-se-modus]").forEach((b) =>
      b.addEventListener("click", () => {
        ZUSTAND.meta.Modus = b.dataset.seModus;
        this.zeichne();
      })
    );
    this.shadowRoot.querySelectorAll(".se-bild").forEach((el) =>
      el.addEventListener("change", () => {
        const name = el.dataset.v.replace(/^--/, "");
        const w = el.value.trim();
        if (!ZUSTAND.modell) return;
        if (w) setze(ZUSTAND.modell, name, w, el.dataset.modus === "dark" ? "dark" : "light");
        else { delete ZUSTAND.modell[el.dataset.modus === "dark" ? "dark" : "light"][name]; }
        ZUSTAND.geaendert.add(name);
        this.zeichneZaehler();
      })
    );
    this.shadowRoot.querySelectorAll("[data-galerie]").forEach((b) =>
      b.addEventListener("click", () => this.zeigeGalerie(b.dataset.galerie, b.dataset.galerieModus))
    );
    const schalter = {
      start: () => this.zumStart(),
      baukasten: () => this.oeffneBaukasten(),
      uix: () => this.oeffneUix(),
      hilfe: () => this.oeffneHilfe(),
      neu: () => this.neuBeginnen(),
      lesen: () => this.zeigeImport(),
      oeffnen: () => this.zeigeDateien(),
      verwerfen: () => this.verwerfen(),
      laden2: () => this.herunterladen(),
      kopie2: () => this.kopieren(),
    };
    this.shadowRoot.querySelectorAll("[data-schalter]").forEach((b) =>
      b.addEventListener("click", () => schalter[b.dataset.schalter]?.())
    );

    // Die grossen Karten auf der Startseite fuehren zu denselben Aktionen wie
    // die Symbolleiste - ein eigener Name, damit ein Klick nicht zweimal
    // ankommt, falls eine Karte je in der Leiste landet.
    this.shadowRoot.querySelectorAll("[data-start]").forEach((b) =>
      b.addEventListener("click", async () => {
        const was = b.dataset.start;
        // "Mit dem Baukasten" ist kein eigener Weg, sondern zwei: erst eine
        // neue Theme, dann der Baukasten darueber. Ohne Theme waere er leer
        // und alle Kacheln gesperrt.
        if (was === "baukasten") { await this.neuBeginnen(); this.oeffneBaukasten(); return; }
        schalter[was]?.();
      })
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
        <!-- Das Symbol sass bis zum 14.10.2026 in der Menueleiste. Mit den
             Stufenknoepfen ist es hierher gezogen, statt als Feld ohne Leser
             in STUFEN stehen zu bleiben: Das Pop-up ist jetzt der einzige Ort,
             an dem eine Stufe aufgeht, und es weist sich damit selbst aus. -->
        <span class="dsymbol"><ha-icon icon="${st.symbol}"></ha-icon></span>
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
      // Was gilt, steht im Modell: Liegt das Feld unter modes, wird je Modus
      // gearbeitet, sonst flach. f.ebene ist nur noch der Startwert fuer ein
      // Feld, das noch gar nicht gesetzt ist.
      const stand = this.werteJeModus(f);
      const geteilt = stand ? stand.wo === "je Modus" : f.ebene === "getrennt";
      this._feldModus = geteilt ? "light" : "beide";
      this._feldModusFuer = feldId;
    }

    const w = this.wert(f);
    const je = this.werteJeModus(f);
    // Der Tupfer zeigt die Farbe, auch wenn im Feld ein Verweis steht.
    const probe = (v, modus) => {
      const farbe = this.loeseFarbe(v, modus);
      return farbe ? `<span class="probe gross" style="background:${farbe}"></span>` : "";
    };

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
              <div class="mwert">${probe(je.hell, "light")}<code class="${je.hell === undefined ? "leer" : ""}">${je.hell === undefined ? T("nicht gesetzt") : je.hell}</code></div>
            </div>
            <div class="modus" data-modus="dunkel">
              <span class="mlabel">${T("Dunkel")}</span>
              <div class="mwert">${probe(je.dunkel, "dark")}<code class="${je.dunkel === undefined ? "leer" : ""}">${je.dunkel === undefined ? T("nicht gesetzt") : je.dunkel}</code></div>
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
      if (wert && typeof wert === "object" && wert.modus) {
        // Umschalten heisst hier mehr als die Ansicht wechseln: Das Feld wird
        // im Modell aufgeteilt oder wieder zusammengefuehrt.
        const name = (f.v || "").replace(/^--/, "");
        if (name && ZUSTAND.modell) {
          if (wert.modus === "beide") fuehreZusammen(ZUSTAND.modell, name, this._feldModus);
          else teileAuf(ZUSTAND.modell, name);
          ZUSTAND.geaendert.add(name);
        }
        this._feldModus = wert.modus;
        this._feldModusFuer = f.v || f.t;
        this.oeffneFeld(st, f.v || f.t);
        this.zeichneZaehler();
        return;
      }
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
        const farbe = this.loeseFarbe(v, schl === "dunkel" ? "dark" : "light");
        zeile.innerHTML = `${farbe ? `<span class="probe gross" style="background:${farbe}"></span>` : ""}`
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
    // Ob ein Feld flach steht oder je Modus, ist KEINE feste Eigenschaft mehr,
    // sondern eine Wahl - und sie steht im Modell, nicht in der Felddefinition.
    // f.ebene sagt nur noch, womit begonnen wird.
    const je = this.werteJeModus(f);
    const geteilt = je ? je.wo === "je Modus" : f.ebene === "getrennt";

    // Die fuenf Rollen bleiben flach. Jede setzt elf Palettenstufen auf einmal,
    // und HA rechnet daraus die RGB-Tripel, aus denen Mushroom lebt - eine
    // halb aufgeteilte Rampe waere in einem Modus unvollstaendig.
    const modi = f.rolle
      ? [{ wert: "beide", name: T("Beide Modi"), titel: T("Eine Rolle setzt elf Palettenstufen und bleibt deshalb in beiden Modi gleich") }]
      : [{ wert: "beide", name: T("Beide Modi") },
         { wert: "light", name: T("Hell") },
         { wert: "dark",  name: T("Dunkel") }];

    return infostreifen({
      id: f.v || f.t,
      modus: geteilt ? (this._feldModus === "dark" ? "dark" : "light") : "beide",
      modi,
      sync: this.syncStand(f),
    });
  }

  // Eine Rollenfarbe setzt ELF Stufen, nicht eine - und bei der Primaerfarbe
  // dazu die drei klassischen Begleiter, die sonst auf HAs Blau stehen
  // blieben. Das ist der ganze Grund, warum hier nicht einfach ein Wert in
  // ein Feld geschrieben wird.
  aendere(f, wert) {
    if (!ZUSTAND.modell) return;
    // Die Ebene kommt aus der WAHL im Dialog, nicht mehr aus f.ebene. Sonst
    // fuehrte jede Aenderung an einem als "beide" definierten Feld es sofort
    // wieder zusammen - der Nutzer haette umgeschaltet und trotzdem beide
    // Modi ueberschrieben.
    const ebene = this._feldModus === "dark" ? "dark"
                : this._feldModus === "light" ? "light"
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
  // Einen var()-Verweis bis zur Farbe verfolgen.
  //
  // 86 Felder tragen einen Verweis auf eine Palettenstufe statt eines
  // Hexwertes - fill-primary-quiet-resting steht etwa auf
  // var(--ha-color-primary-05). Ohne Aufloesung bleibt der Farbtupfer grau,
  // und man sieht nicht, was das Feld tut. Nachgeschlagen wird im MODELL,
  // nicht auf der Seite: Was gilt, ist die Theme, die gerade gebaut wird.
  loeseFarbe(wert, modus) {
    return loeseFarbe(ZUSTAND.modell, wert, modus);
  }

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
      // Gezaehlt werden NAMEN, nicht Eintraege. Ein Feld, das hell und dunkel
      // einen eigenen Wert hat, ist EIN Feld - die Summe der drei Ebenen
      // zaehlte es zweimal. Bei macos standen so 434 auf der Kachel und 398
      // im Bericht ueber dieselbe Datei; am 14.10.2026 beim Durchgehen der
      // Stufen aufgefallen. Zwei Zahlen fuer dasselbe Wort sind schlimmer als
      // eine falsche: Man sucht den Fehler in der Theme.
      case "gesamt": return m
        ? String(new Set(["flach", "light", "dark"].flatMap((e) => Object.keys(m[e] || {}))).size)
        : "-";
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
      // Der Text bleibt roh - er soll zeigen, WAS dort steht, auch wenn es ein
      // Verweis ist. Nur der Tupfer wird aufgeloest.
      const modus = this._hass && this._hass.themes && this._hass.themes.darkMode ? "dark" : "light";
      return { text: ausModell.length > 28 ? ausModell.slice(0, 27) + "…" : ausModell,
               farbe: this.loeseFarbe(ausModell, modus) };
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
          <span${f.v ? ` title="${f.v}"` : ""}>${f.v ? f.v : T("Angabe")}</span>
        </div>
        ${this.syncIcons(f)}
        ${w.farbe ? `<span class="probe" style="background:${w.farbe}"></span>` : ""}
        <span class="wert ${w.leer ? "leer" : ""}">${w.text}</span>
      </div>`;
  }

  feldKachel(f, T) {
    const w = this.wert(f);
    return `
      <article class="karte" data-feld="${f.v || f.t}" tabindex="0" role="button"${f.v ? ` title="${f.v}"` : ""}>
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
        /* DREI Schatten, nicht einer - auf Ansage vom 14.10.2026 ueber das
           ganze Design gezogen, nachdem es an den Farbkacheln getaugt hat:
             innen oben hell   das Licht auf der Kante
             kurz und hart     die Kante selbst
             weit und weich    der Wurf auf die Flaeche
           Einer allein sieht aus wie ein Aufkleber, drei wie ein Stueck.
           Es steht hier und nicht an den Regeln, damit es EINE Stelle bleibt:
           Jede Flaeche, die schon var(--s-schatten-klein) las, bekommt die
           Plastik mit, ohne dass jemand sie einzeln nachzieht. */
        --s-saum: inset 0 1px 0 rgba(255,255,255,.9);
        --s-schatten-klein: inset 0 1px 0 rgba(255,255,255,.9),
                            0 1px 2px rgba(26,44,74,.10),
                            0 6px 14px rgba(26,44,74,.10);
        /* Dieselbe Flaeche, angehoben - fuer Ueberfahren und Gewaehltes. */
        --s-schatten-hoch: inset 0 1px 0 rgba(255,255,255,.9),
                           0 2px 4px rgba(26,44,74,.12),
                           0 12px 24px rgba(26,44,74,.16);
        /* Eine Karte ist nicht flach weiss: oben etwas heller als unten.
           Zwei Prozent Unterschied reichen - mehr sieht nach Verlauf aus. */
        --s-flaeche: linear-gradient(180deg, #ffffff 0%, #f4f7fc 100%);
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
        /* Keine linke Spalte mehr - die Leiste sitzt oben, im Inhalt. */
        position: relative; display: block; min-height: 100%;
        border-radius: var(--s-r-gross); overflow: hidden;
        background: var(--s-glas);
        -webkit-backdrop-filter: blur(30px) saturate(1.6);
        backdrop-filter: blur(30px) saturate(1.6);
        box-shadow: var(--s-schatten), inset 0 1px 0 var(--s-kante);
      }

      /* ---- Die Menueleiste oben: HA ----
         Vorbild ist die Menuekarte auf dem Dashboard des Nutzers: eine Pille
         mit Symbolknoepfen. Sie ersetzte die linke Symbolleiste UND die runde
         Schalterreihe; seit dem 14.10.2026 stehen auch die acht Stufen nicht
         mehr darin - die Liste darunter ist der Weg, und beide fuehrten
         ohnehin in dasselbe Pop-up. Geblieben sind die Aktionen, rechts, wo
         sie vorher auch sassen. */
      /* Das Aussehen der Steuerleiste, auf Ansage vom 15.10.2026: "du kannst
         das design mit uebernehmen fuer unsere kopfleiste". Die Zahlen sind
         aus hats-control-card.js ABGELESEN, nicht nachempfunden:

             Leiste    padding 8px (--ha-space-2), Rundung --ha-card-border-radius
             Knopf     40px hoch, Rundung --ha-border-radius-lg (12px)
             Luecke    4px (--ha-space-1)
             Symbol    20px

         Uebersetzt in die eigenen Tokens des Panels - dieselbe Proportion,
         aber ohne Theme-Variablen, denn das Panel benutzt bewusst keine
         (siehe Kopf der Datei): --s-r-gross ist 22px, --s-r ist 14px.

         Und das Glas: Die Steuerleiste zeichnet weich, was hinter ihr liegt.
         Der Panel-Hintergrund ist ein Verlauf, also bringt das hier dasselbe. */
      /* Die Knoepfe neben Speichern. Dieselben Masse wie die alten
         Leistenknoepfe (40 px, Symbol 20) - sie sind dieselbe Sorte Knopf,
         nur an dem Ort, an den sie gehoeren. */
      .kopfknopf { display: flex; align-items: center; justify-content: center; flex: none;
                   width: 40px; height: 40px; border: 0; background: none;
                   color: var(--s-tinte); cursor: pointer; border-radius: var(--s-r);
                   transition: background .15s ease, box-shadow .15s ease; }
      .kopfknopf ha-icon { --mdc-icon-size: 20px; color: var(--s-tinte-leise); flex: none; }
      .kopfknopf:hover:not([disabled]) { background: var(--s-karte);
                                         box-shadow: var(--s-schatten-klein); }
      /* Nicht verfuegbar heisst leiser, nicht unsichtbar - siehe die alte
         Schalterreihe, wo opacity .35 den Knopf verschwinden liess. */
      .kopfknopf[disabled] { cursor: default; }
      .kopfknopf[disabled] ha-icon { color: rgba(27,36,48,.38); }

      /* ---- Die Werkzeuge ueber der Stufenliste ---- */
      /* Eine Zeile wie in der Liste, nur ohne Spur und ohne Stand: Diese drei
         haben keinen Fortschritt, sie sind Griffe. Dass sie sich wie die
         Stufen anfuehlen, ist Absicht - es ist dieselbe Spalte. */
      .werkzeuge { display: grid; gap: 8px; margin: 0 0 18px; }
      .werkzeug { display: flex; align-items: center; gap: 14px; width: 100%;
                  padding: 12px 16px; border: 0; text-align: left; cursor: pointer;
                  font: inherit; color: var(--s-tinte);
                  border-radius: var(--s-r-gross); background: var(--s-glas-innen);
                  box-shadow: var(--s-schatten-klein);
                  transition: background .15s ease, box-shadow .15s ease; }
      .werkzeug:hover { background: var(--s-karte); box-shadow: var(--s-schatten); }
      .werkzeug ha-icon { --mdc-icon-size: 22px; color: var(--s-tinte-leise); flex: none; }
      .werkzeug .wtext { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .werkzeug .wtext b { font-size: 14px; font-weight: 500; }
      .werkzeug .wtext span { font-size: 12px; color: var(--s-tinte-leise); }

      /* ---- Rumpf ---- */
      /* Seit dem 13.10.2026 eine Spalte: Die Add-on-Leiste rechts ist weg,
         Bubble und Mushroom stehen in Stufe 6, UIX hinter dem Symbol oben. */
      .rumpf { display: flex; align-items: flex-start; min-width: 0; }
      .inhalt { flex: 1; min-width: 0; padding: 26px 30px 30px; }

      /* ---- UIX-Seite im grossen Dialog ---- */
      /* ---- Hilfeseite ---- */
      .hilfeseite { padding: 20px 26px 26px; overflow: auto; }
      .hi-merke { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                  gap: 14px; margin-bottom: 26px; }
      .hi-merk { background: var(--s-glas-innen); border-radius: var(--s-r);
                 padding: 14px 16px; box-shadow: var(--s-schatten-klein); }
      .hi-merk h4 { margin: 0 0 6px; font-size: 14px; }
      .hi-merk p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--s-tinte-leise); }
      .hi-merk img { width: 100%; border-radius: var(--s-r-klein); margin: 4px 0 10px; }
      .hi-merk pre { margin: 10px 0 0; padding: 10px; overflow: auto;
                     background: rgba(27,36,48,.06); border-radius: var(--s-r-klein);
                     font: 12px/1.5 ui-monospace, Menlo, monospace; color: var(--s-tinte); }
      .hi-stufe { margin-bottom: 26px; }
      .hi-stufe h3 { display: flex; align-items: center; gap: 9px; margin: 0 0 4px; font-size: 16px; }
      .hi-nr { display: flex; align-items: center; justify-content: center; flex: none;
               width: 22px; height: 22px; border-radius: 7px; color: #fff;
               font-size: 12px; font-weight: 700; }
      .hi-stufe h4 { margin: 14px 0 2px; font-size: 13px; color: var(--s-tinte); }
      .hi-tab { width: 100%; border-collapse: collapse; margin-top: 6px; }
      .hi-tab td { padding: 6px 10px 6px 0; vertical-align: top; font-size: 13px;
                   border-top: 1px solid var(--s-linie); }
      .hi-tab td:first-child { width: 32%; }
      .hi-tab td:nth-child(2) { width: 18%; color: var(--s-tinte-leise); }
      .hi-tab code { font: 12px ui-monospace, Menlo, monospace; color: var(--s-tinte); }
      /* Ein Feld ohne Satz steht leiser da, aber es steht da - es ist die
         Arbeitsliste, kein Fehler. */
      .hi-leer td { color: var(--s-tinte-leise); }
      .hi-leer em { font-style: normal; opacity: .7; }

      .uixseite { padding: 20px 26px 26px; overflow: auto; }
      .uixtitel { font-size: 13px; font-weight: 600; letter-spacing: .02em;
                  margin: 22px 0 10px; color: var(--s-tinte); }
      /* Die Stilziele sind der seltenere Weg - sie liegen deshalb hinter einem
         Aufklapper, damit die Vorlagen oben die Seite tragen. */
      .uixtitel.auftun { display: flex; align-items: center; gap: 7px; width: 100%;
                         border: 0; background: none; font: inherit; font-weight: 600;
                         font-size: 13px; cursor: pointer; padding: 8px 0;
                         border-top: 1px solid var(--s-linie); margin-top: 26px; }
      .uixtitel.auftun ha-icon { --mdc-icon-size: 18px; color: var(--s-tinte-leise); }
      .uixtitel.auftun span { margin-left: auto; font-weight: 400; font-size: 12px;
                              color: var(--s-tinte-leise); }

      .vorlagenraster { display: grid; gap: 12px;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
      .vorlage { display: flex; flex-direction: column;
                 background: var(--s-glas-innen); box-shadow: inset 0 1px 0 var(--s-kante);
                 border-radius: var(--s-r); overflow: hidden;
                 transition: box-shadow .15s ease, background .15s ease; }
      .vorlage.an { background: #fff;
                    box-shadow: inset 0 1px 0 var(--s-kante), 0 0 0 2px var(--s-akzent, #3b82f6); }
      /* 16:10 feste Hoehe, damit die Karten in einer Reihe gleich hoch sind -
         ein Raster mit unterschiedlich hohen Bildern sieht zerfallen aus. */
      .vbild { position: relative; aspect-ratio: 16 / 10; background: rgba(27,36,48,.06); }
      .vbild img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .vbild .vnachher { position: absolute; inset: 0; transition: opacity .18s ease; }
      .vorlage:hover .vbild .vnachher { opacity: 0; }
      /* Die Marke erscheint nur, waehrend das Vorher zu sehen ist - sonst
         weiss niemand, welchen der beiden Zustaende er gerade ansieht. */
      .vmarke { position: absolute; left: 8px; top: 8px; opacity: 0;
                background: rgba(16,24,40,.72); color: #fff; font-size: 10.5px;
                padding: 2px 8px; border-radius: 999px; transition: opacity .18s ease; }
      .vorlage:hover .vmarke { opacity: 1; }
      .vbild .vleer { display: none; position: absolute; inset: 0;
                      align-items: center; justify-content: center;
                      font-size: 12px; color: var(--s-tinte-leise); }
      .vbild.ohne img, .vbild.ohne .vmarke { display: none; }
      .vbild.ohne .vleer { display: flex; }
      .vtext { padding: 11px 13px 4px; flex: 1; }
      .vtext b { font-size: 13.5px; display: block; }
      .vtext p { font-size: 12px; color: var(--s-tinte-leise); margin: 4px 0 7px; line-height: 1.45; }
      .vtext code { font-size: 10.5px; color: var(--s-tinte-leise);
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vschalter { display: flex; align-items: center; gap: 7px; cursor: pointer;
                   padding: 9px 13px 12px; font-size: 12.5px; }

      .uixraster { display: grid; gap: 10px; margin-top: 14px;
                   grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      /* Die Kachel "Eigene..." hat noch keine Farben - drei graue Tupfer
         sagen das, ohne dass dort eine Luecke klafft. */
      .bk-eigen .bk-leer { background: var(--s-linie); }
      .ff-vorschau { display: flex; align-items: center; gap: 10px; margin: 14px 0 4px; }
      .ff-vorschau em { color: var(--s-tinte-leise); font-style: normal; font-size: 13px; }
      .uixziel { background: var(--s-glas-innen); box-shadow: inset 0 1px 0 var(--s-kante);
                 border-radius: var(--s-r); padding: 11px 13px; }
      /* Ein eingeschaltetes Ziel traegt ein Textfeld und bekommt deshalb die
         ganze Zeile - sonst waere das CSS in einer 260px-Spalte unlesbar. */
      .uixziel.an { grid-column: 1 / -1; background: #fff; }
      .uixkopf { display: grid; grid-template-columns: auto 1fr; gap: 8px;
                 align-items: center; font-size: 13px; cursor: pointer; }
      .uixkopf code { grid-column: 2; font-size: 11px; color: var(--s-tinte-leise);
                      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .uixcss { width: 100%; box-sizing: border-box; margin-top: 8px; min-height: 110px;
                resize: vertical; border: 0; border-radius: 9px; padding: 10px 12px;
                background: rgba(27,36,48,.05); color: var(--s-tinte);
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: 12px; line-height: 1.5; }
      .uixcss:focus { outline: none; background: #fff; box-shadow: inset 0 0 0 1px rgba(27,36,48,.18); }

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

      /* Die Steuerkarte sitzt ueber der Begruessung und bringt ihre eigene
         Flaeche mit (ha-card). Hier steht deshalb nur der Abstand - und
         display:block, damit der Platz nicht zusammenfaellt, solange die
         Karte noch laedt. */

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

      /* ---- Startbild ----
         Die drei Karten sind am 13.10.2026 entfallen: Geladen wird ueber die
         Symbolreihe oben, und zwei Wege zur selben Sache nebeneinander sind
         einer zu viel. Geblieben ist eine Zeile, die sagt, was die Liste ist. */
      .startleer { font-size: 14px; color: var(--s-tinte-leise); margin: 0;
                   padding: 40px 0; text-align: center; }

      /* ---- Starteinstellungen ---- */
      .starteinst { background: var(--s-glas-innen); border-radius: var(--s-r-gross);
                    box-shadow: inset 0 1px 0 var(--s-kante); padding: 16px 20px;
                    margin-bottom: 16px; }
      .sezeile { display: grid; grid-template-columns: 150px 1fr; gap: 12px;
                 align-items: center; padding: 7px 0; }
      .sezeile.zwei { grid-template-columns: 150px 1fr 1fr; }
      .sezeile + .sezeile { border-top: 1px solid var(--s-linie); }
      .sezeile label { font-size: 13px; color: var(--s-tinte-leise); }
      .sezeile .sewert { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                         font-size: 12.5px; }
      .sezeile input { border: 0; background: rgba(27,36,48,.05); color: var(--s-tinte);
                       font: inherit; font-size: 13px; padding: 8px 12px;
                       border-radius: 999px; min-width: 0; }
      .sezeile input:focus { outline: none; background: #fff;
                             box-shadow: inset 0 0 0 1px rgba(27,36,48,.18); }
      .sezeile input[disabled] { opacity: .5; }
      .bildfeld { display: flex; gap: 6px; align-items: center; min-width: 0; }
      .bildfeld input { flex: 1; min-width: 0; }
      .bildknopf { width: 34px; height: 34px; flex: none; border: 0; border-radius: 999px;
                   display: flex; align-items: center; justify-content: center;
                   background: rgba(27,36,48,.06); color: var(--s-tinte); cursor: pointer; }
      .bildknopf ha-icon { --mdc-icon-size: 18px; color: var(--s-tinte-leise); }
      .bildknopf:hover:not([disabled]) { background: #fff; box-shadow: var(--s-schatten-klein); }
      .bildknopf[disabled] { cursor: default; opacity: .5; }

      /* ---- Galerie ---- */
      .galeriekopf { display: flex; gap: 8px; margin-bottom: 14px; }
      .galerie { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                 gap: 10px; }
      .bild { position: relative; margin: 0; border-radius: var(--s-r); overflow: hidden;
              background: rgba(27,36,48,.05); cursor: pointer;
              transition: box-shadow .15s ease, transform .15s ease; }
      .bild:hover { box-shadow: var(--s-schatten); transform: translateY(-1px); }
      .bild img { display: block; width: 100%; height: 86px; object-fit: cover; }
      .bild figcaption { display: flex; justify-content: space-between; gap: 6px;
                         padding: 6px 8px; font-size: 11px; color: var(--s-tinte); }
      .bild figcaption span { color: var(--s-tinte-leise); flex: none; }
      .bildweg { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px;
                 border: 0; border-radius: 50%; cursor: pointer; font-size: 12px;
                 background: rgba(255,255,255,.85); color: var(--s-tinte);
                 opacity: 0; transition: opacity .15s ease; }
      .bild:hover .bildweg { opacity: 1; }

      .se-modus { border: 0; background: none; font: inherit; font-size: 12.5px;
                  padding: 6px 14px; border-radius: 999px; cursor: pointer;
                  color: var(--s-tinte); }
      .se-modus.an { background: #fff; box-shadow: var(--s-schatten-klein); }
      .se-modus[disabled] { opacity: .5; cursor: default; }
      @media (max-width: 620px) {
        .sezeile, .sezeile.zwei { grid-template-columns: 1fr; gap: 6px; }
      }
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
      /* ---- Die Schalterreihe oben links ---- */
      .schalter { display: flex; gap: 8px; margin-bottom: 16px; }
      .schalterknopf { width: 38px; height: 38px; flex: none; border: 0; border-radius: 50%;
                       display: flex; align-items: center; justify-content: center;
                       background: var(--s-glas-innen); color: var(--s-tinte); cursor: pointer;
                       box-shadow: inset 0 1px 0 var(--s-kante);
                       transition: background .15s ease, box-shadow .15s ease, transform .15s ease; }
      .schalterknopf ha-icon { --mdc-icon-size: 19px; color: var(--s-tinte); }
      .schalterknopf:hover:not([disabled]) { background: #fff; box-shadow: var(--s-schatten-klein);
                                             transform: translateY(-1px); }
      /* Nicht verfuegbar heisst LEISER, nicht unsichtbar.
         Erst stand hier opacity .35 - auf hellem Glas war davon nichts mehr
         zu sehen, und genau das widerspricht "immer sichtbar". Jetzt bleibt
         der Kreis voll da, nur das Symbol tritt zurueck. */
      .schalterknopf[disabled] { cursor: default; background: rgba(255,255,255,.45);
                                 box-shadow: inset 0 0 0 1px rgba(27,36,48,.07); }
      .schalterknopf[disabled] ha-icon { color: rgba(27,36,48,.38); }

      /* ---- Bericht nach dem Einlesen ---- */
      .berichtzahlen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
                       margin-bottom: 14px; }
      .berichtzahlen div { background: rgba(27,36,48,.05); border-radius: var(--s-r);
                           padding: 10px 12px; text-align: center; }
      .berichtzahlen b { display: block; font-size: 19px; font-weight: 600; }
      .berichtzahlen span { font-size: 11px; color: var(--s-tinte-leise); }
      .berichtzeile { padding: 12px 14px; border-radius: var(--s-r); margin-bottom: 8px;
                      background: rgba(27,36,48,.04); font-size: 13px; line-height: 1.5; }
      .berichtzeile b { font-size: 15px; }
      .berichtzeile.gut     { background: rgba(110,190,90,.14); }
      .berichtzeile.warnung { background: rgba(230,160,40,.16); }
      /* Rot nur dort, wo wirklich etwas verloren geht - sonst stumpft es ab. */
      .berichtzeile.fehler  { background: rgba(215,73,65,.14); }
      .berichtnamen { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
      .berichtnamen code { font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                           background: rgba(255,255,255,.7); padding: 2px 6px; border-radius: 6px; }
      .berichtnamen em { font-size: 11px; color: var(--s-tinte-leise); align-self: center; }

      /* ---- Datei oder Text ---- */
      .importwege { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .dateiname { font-size: 12px; color: var(--s-tinte-leise); }
      .modalknopf { border: 0; border-radius: 999px; padding: 9px 18px; font: inherit;
                    font-size: 13px; cursor: pointer; background: var(--s-tinte); color: #fff; }
      .modalknopf.dateiknopf { background: rgba(27,36,48,.08); color: var(--s-tinte); }
      .importtext { width: 100%; min-height: 200px; box-sizing: border-box; resize: vertical;
                    border: 0; border-radius: var(--s-r); padding: 12px 14px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
                    background: rgba(27,36,48,.05); color: var(--s-tinte); }
      .importtext:focus { outline: none; background: #fff; box-shadow: inset 0 0 0 1px rgba(27,36,48,.18); }
      .importfuss { display: flex; justify-content: flex-end; margin-top: 12px; }
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
      /* ---- Das Pop-up, im Stil des Panels ----
         Bis zum 14.10.2026 war es eine flache Flaeche in #f7f8fb, waehrend das
         Fenster dahinter aus Glas war. Auf Ansage angeglichen: dieselbe
         Glasflaeche, derselbe Lichtsaum oben, dieselbe Rundung.
         Der Schleier ist dafuer heller geworden. Bei .38 nahm das Glas den
         dunklen Schleier an und wurde grau - es soll aber den blauen Verlauf
         und die Wolken aufnehmen, sonst ist es kein Glas, sondern Milch.

         UND DAS GEHT HIER, weil die beiden .overlay GESCHWISTER von .buehne
         sind, nicht Kinder (siehe Kopf der Datei). Ein backdrop-filter macht
         sein Element zum Bezugsrahmen fuer alles, was darin position:fixed
         ist - in .dialog steht nichts dergleichen, und die Feldseite liegt
         NEBEN der Stufenseite, nicht darin. */
      .schleier { position: absolute; inset: 0; background: rgba(16,28,45,.26); opacity: 0;
                  transition: opacity .18s ease; }
      .overlay.da .schleier { opacity: 1; }
      /* .84, nicht --s-glas-innen (.72): Bei .72 las man in den Luecken
         ZWISCHEN den Karten den Text der Seite dahinter mit - auf einer
         Stufenseite steht dort die Stufenliste, und die geisterte durch die
         Gruppen. Die Variable bleibt bei .72, weil sie an der Menueleiste und
         an den Stilzielen richtig ist; ein Dialog deckt mehr, weil man darin
         liest statt nur hinzusehen. */
      .dialog { position: relative; width: min(1180px, 100%); max-height: 100%; overflow: auto;
                border-radius: var(--s-r-gross); background: rgba(255,255,255,.84);
                -webkit-backdrop-filter: blur(30px) saturate(1.6);
                backdrop-filter: blur(30px) saturate(1.6);
                box-shadow: 0 40px 90px rgba(10,22,40,.34), inset 0 1px 0 var(--s-kante);
                transform: translateY(10px) scale(.985); opacity: 0;
                transition: transform .2s ease, opacity .2s ease; }
      .overlay.da .dialog { transform: none; opacity: 1; }

      /* Der Kopf klebt oben, waehrend der Inhalt darunter wegrollt - er
         braucht deshalb eine eigene Weichzeichnung. Mit blosser Deckkraft
         saehe man den Text durchscheinen. 14px statt 30: Er liegt schon auf
         der weichgezeichneten Flaeche des Dialogs, zweimal 30 waere Milch. */
      .dkopf { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; flex-wrap: wrap;
               gap: 12px 16px; padding: 22px 26px 16px;
               background: rgba(255,255,255,.74);
               -webkit-backdrop-filter: blur(14px) saturate(1.4);
               backdrop-filter: blur(14px) saturate(1.4);
               border-bottom: 1px solid var(--s-linie); }
      /* Das Symbol der Stufe. Dieselbe weiche Flaeche wie der Schliessen-Knopf
         daneben, nicht die Marke aus der Liste: Die ist die STANDfarbe (gruen
         fuer die laufende Stufe, #c2c8d2 fuer die sieben anderen), und ein
         weisses Symbol darauf kam auf 1,9:1. Erst beim Ansehen an der Instanz
         aufgefallen - dieselbe Sorte wie der Farbwaehler, der weiss auf
         durchsichtigem Grund schrieb. flex: none, sonst zieht der Titel es schmal. */
      .dsymbol { display: flex; align-items: center; justify-content: center; flex: none;
                 width: 38px; height: 38px; border-radius: 11px;
                 background: rgba(27,36,48,.06); box-shadow: var(--s-saum); }
      .dsymbol ha-icon { --mdc-icon-size: 21px; color: var(--s-tinte-leise); }
      .dkopf h2 { margin: 0; font-size: 22px; letter-spacing: -.01em; }
      .dkopf p { margin: 3px 0 0; color: var(--s-tinte-leise); font-size: 13px; }
      .zu { width: 34px; height: 34px; border: 0; border-radius: 50%; cursor: pointer; font-size: 15px;
            background: rgba(27,36,48,.06); color: var(--s-tinte-leise);
            box-shadow: var(--s-saum); }
      .zu:hover { background: rgba(27,36,48,.12); }

      /* --- Baukasten --------------------------------------------------
         Vier Sorten untereinander, je Sorte die Teile als breite Knoepfe. Kein
         Raster mit festen Spalten: Die Zwecktexte sind unterschiedlich lang,
         und in einer Spalte von 200px steht nach zwei Woertern Schluss. */
      .dinhalt.bk { display: flex; flex-direction: column; gap: 26px; padding: 20px 26px 28px; }
      .bk-sorte h3 { margin: 0 0 10px; font-size: 14px; letter-spacing: .02em;
                     text-transform: uppercase; color: var(--s-tinte-leise); }
      /* Auf Glas traegt Abstand allein nicht mehr: Die Flaeche darunter ist
         nicht weiss, sondern durchscheinend, und die Gruppen verschwimmen.
         Eine Haarlinie ueber jeder Sorte ausser der ersten gliedert sie. */
      .bk-sorte + .bk-sorte { border-top: 1px solid var(--s-linie); padding-top: 22px; }
      .bk-teile { display: grid; gap: 10px;
                  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      /* Die Farben in klein: Tupfer und Name, kein Zwecktext.
         Am 14.10.2026 auf Ansage - "nur den haupttext in den karten lassen
         dafuer kleiner das wir eine art mini auswahlpallette haben". Und
         wirklich: Bei einer Palette SIND die Tupfer die Auskunft; der Satz
         darunter wiederholt sie in Worten und macht aus fuenfzehn Kacheln vier
         Bildschirme. Der Zweck steht als title, also beim Verweilen.
         Zugleich ist die Trennung in "Richtung" und "Uebernommen" gefallen:
         Bei kleinen Kacheln sieht man alle auf einmal, und dann trennt die
         Zwischenueberschrift mehr, als sie ordnet. */
      .bk-teile.mini { grid-template-columns: repeat(auto-fill, minmax(144px, 1fr)); gap: 8px; }
      /* Der Name OBEN, die Farben als Fussleiste darunter - auf Ansage vom
         14.10.2026. Die Reihenfolge macht CSS, nicht ein zweiter Zweig im
         Markup: order plus margin-top auto, und die min-height sorgt dafuer,
         dass die Leiste bei allen fuenfzehn auf derselben Linie sitzt, auch
         wenn ein Name umbricht. */
      .bk-teile.mini .bk-teil { gap: 7px; padding: 12px 12px 11px; min-height: 86px; }
      .bk-teile.mini .bk-name { order: 1; font-size: 13.5px; }
      .bk-teile.mini .bk-tupfer { order: 2; margin: auto 0 0; gap: 0;
                                  justify-content: space-between; }
      .bk-teile.mini .bk-tupfer i, .bk-teile.mini .bk-tupfer i:first-child {
        width: 18px; height: 18px; }
      .bk-teile.mini .bk-haken { top: 7px; right: 8px; --mdc-icon-size: 15px; }
      /* Dieselbe Karte wie auf dem Startbild (.startweg): weiche Flaeche,
         Haarlinie, kleiner Schatten, und beim Ueberfahren hebt sie sich einen
         Pixel. Vorher fehlten Schatten und Bewegung - die Kacheln lagen flach
         auf der Flaeche, waehrend jede andere Karte im Panel schwebt. */
      /* Drei Schatten statt einem: ein heller Saum oben innen (das Licht auf
         der Kante), ein kurzer harter darunter (die Kante selbst) und ein
         weiter weicher (der Wurf auf die Flaeche). Ein einzelner Schatten
         sieht aus wie ein Aufkleber, drei wie ein Stueck. */
      .bk-teil { position: relative; text-align: left; cursor: pointer; font: inherit;
                 display: flex; flex-direction: column; gap: 4px;
                 background: var(--s-karte); color: var(--s-tinte);
                 border: 1px solid rgba(27,36,48,.08); border-radius: var(--s-r);
                 padding: 13px 15px; background-image: var(--s-flaeche);
                 box-shadow: var(--s-schatten-klein);
                 transition: border-color .15s, box-shadow .15s, transform .15s; }
      .bk-teil:hover:not([disabled]) { border-color: var(--s-akzent); transform: translateY(-2px);
                 box-shadow: var(--s-schatten-hoch); }
      .bk-teil[disabled] { opacity: .45; cursor: default; }
      /* Das gewaehlte Teil traegt die Akzentfarbe als Rahmen, nicht als
         Flaeche: Eine gefuellte Kachel wuerde den Zwecktext darauf erschlagen,
         und genau der ist die Entscheidungshilfe. */
      .bk-teil.an { border-color: var(--s-akzent);
                    box-shadow: inset 0 0 0 1px var(--s-akzent), var(--s-schatten-klein); }
      /* Der Farbstreifen eines Hintergrunds. Er sitzt UEBER dem Namen, nicht
         als Flaeche hinter ihm: Vier Farben hinter Text machen beides
         unlesbar. Der Haken steht rechts daneben, deshalb endet er bei 70 %. */
      .bk-streifen { display: block; height: 10px; width: 70%; border-radius: 999px;
                     margin-bottom: 4px; border: 1px solid rgba(27,36,48,.10); }
      /* Die Farbtupfer einer Palette. Der erste ist der Akzent - die einzige
         Farbe, die je Modus verschieden ist, und die, die man am haeufigsten
         sieht. Deshalb steht er vorn.
         Die Kugelform kommt aus einem ::before, nicht aus dem Hintergrund:
         Der traegt die FARBE als inline-Stil, und zwei Hintergruende an einer
         Stelle gingen nicht zusammen. So bleibt die Plastik dieselbe, egal
         welcher Ton darunter liegt - Licht links oben, Schatten unten, dazu
         ein kleiner Wurf auf die Flaeche. */
      .bk-tupfer { display: flex; gap: 5px; align-items: center; margin-bottom: 7px; }
      .bk-tupfer i { position: relative; display: block; width: 14px; height: 14px;
                     border-radius: 50%;
                     box-shadow: inset 0 0 0 1px rgba(27,36,48,.10),
                                 0 1px 2px rgba(26,44,74,.30),
                                 0 2px 4px rgba(26,44,74,.14); }
      .bk-tupfer i::before { content: ""; position: absolute; inset: 0; border-radius: 50%;
                             background: radial-gradient(circle at 34% 27%,
                               rgba(255,255,255,.78) 0%, rgba(255,255,255,.14) 44%,
                               rgba(0,0,0,.10) 72%, rgba(0,0,0,.26) 100%); }
      .bk-tupfer i:first-child { width: 20px; height: 20px; }
      .bk-name { font-size: 14px; font-weight: 500; }
      .bk-zweck { font-size: 12px; line-height: 1.45; color: var(--s-tinte-leise); }
      .bk-haken { position: absolute; top: 10px; right: 10px; color: var(--s-akzent);
                  --mdc-icon-size: 18px; }
      /* Der Hinweis erscheint NUR, wenn der Fall eintritt - ein Warnschild,
         das immer leuchtet, liest niemand mehr. */
      .bk-hinweis { display: flex; align-items: center; gap: 9px; margin: 0;
                    padding: 11px 14px; border-radius: var(--s-r); font-size: 13px;
                    background: rgba(255,166,0,.12); color: #8a5a00;
                    --mdc-icon-size: 18px; }
      .bk-fuss { margin: 0; font-size: 12.5px; color: var(--s-tinte-leise); }

      /* --- Die vier Wege auf der Startseite ------------------------------
         Gross genug, dass die Beschriftung die Arbeit macht und nicht das
         Symbol. Zwei Spalten ab 560px: Vier Karten nebeneinander waeren auf
         einem Tablet schmaler als ihr eigener Text. */
      .startwege { display: grid; gap: 14px; margin-top: 8px;
                   grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .startweg { display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
                  text-align: left; cursor: pointer; font: inherit; color: var(--s-tinte);
                  background: var(--s-karte); background-image: var(--s-flaeche);
                  border: 1px solid rgba(27,36,48,.08);
                  border-radius: var(--s-r); padding: 20px 20px 18px;
                  box-shadow: var(--s-schatten-klein);
                  transition: border-color .15s, box-shadow .15s, transform .15s; }
      .startweg:hover { border-color: var(--s-akzent); transform: translateY(-2px);
                        box-shadow: var(--s-schatten-hoch); }
      .startweg ha-icon { --mdc-icon-size: 26px; color: var(--s-akzent); margin-bottom: 2px; }
      .startweg b { font-size: 15.5px; font-weight: 500; }
      .startweg span { font-size: 12.5px; line-height: 1.45; color: var(--s-tinte-leise); }
      .bk-zahl { font-size: 11px; font-weight: 400; letter-spacing: 0;
                 color: var(--s-tinte-leise); text-transform: none;
                 font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

      /* --- Die Seite einer Sorte ---------------------------------------- */
      .bk-seite { display: flex; flex-direction: column; gap: 22px; }
      .bk-zurueck { align-self: flex-start; display: flex; align-items: center; gap: 6px;
                    border: 0; background: none; cursor: pointer; font: inherit; font-size: 13px;
                    color: var(--s-tinte-leise); padding: 4px 0; --mdc-icon-size: 18px; }
      .bk-zurueck:hover { color: var(--s-akzent); }
      .bk-gewaehlt { display: flex; flex-direction: column; gap: 3px;
                     padding: 14px 16px; border-radius: var(--s-r);
                     background: var(--s-karte); border: 1px solid var(--s-akzent); }

      /* Regler mit Wert daneben. Der Wert steht rechts und ist breit genug
         fuer "1.15" - sonst springt die Zeile bei jedem Schritt. */
      .bk-regler { display: flex; flex-direction: column; gap: 12px; }
      .bk-regel { display: grid; grid-template-columns: 140px 1fr 56px; gap: 12px;
                  align-items: center; font-size: 13px; }
      .bk-regel input[type="range"] { width: 100%; accent-color: var(--s-akzent); }
      .bk-regel b { font-size: 12px; text-align: right;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

      /* Tweaks als anklickbare Zeilen, nicht als nackte Haken: Der Zwecktext
         ist die Entscheidungshilfe und gehoert mit in die Klickflaeche. */
      /* Die freie Farbwahl: vier Rollen und der Akzent, nebeneinander. */
      .bk-farben { display: flex; flex-wrap: wrap; gap: 14px; }
      .bk-farbe { display: flex; flex-direction: column; align-items: center; gap: 5px;
                  font-size: 12px; color: var(--t-leise); }
      .bk-farbe input[type="color"] { width: 46px; height: 34px; padding: 0; cursor: pointer;
                  border: 0; border-radius: 9px; background: none; }
      .bk-farbe input[type="color"]::-webkit-color-swatch { border: 0; border-radius: 9px;
                  box-shadow: var(--s-schatten-klein); }
      .bk-farbe b { font: 500 11px ui-monospace, Menlo, monospace; color: var(--t-stark); }

      .bk-tweaks { display: grid; gap: 8px;
                   grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
      .bk-tweak { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px;
                  align-items: start; cursor: pointer; padding: 11px 13px;
                  border-radius: var(--s-r); background: var(--s-karte);
                  background-image: var(--s-flaeche);
                  border: 1px solid rgba(27,36,48,.08); box-shadow: var(--s-schatten-klein);
                  transition: border-color .15s, box-shadow .15s, transform .15s; }
      .bk-tweak:hover { border-color: var(--s-akzent); transform: translateY(-2px);
                        box-shadow: var(--s-schatten-hoch); }
      .bk-tweak.an { border-color: var(--s-akzent);
                     box-shadow: inset 0 0 0 1px var(--s-akzent), var(--s-schatten-klein); }
      .bk-tweak input { grid-row: span 2; margin: 2px 0 0; accent-color: var(--s-akzent); }
      .bk-tweak .bk-zweck { grid-column: 2; }

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
      .karte[data-feld]:hover { box-shadow: var(--s-schatten-hoch); transform: translateY(-2px); }
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

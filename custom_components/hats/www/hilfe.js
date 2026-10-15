// Die Hilfeseite: was jede Variable tut
//
// Woher das kommt: Der Maintainer hat am 15.10.2026 eine Seite
// "Theme-Variablen" uebergeben - 16 Tabellen, 137 Zeilen, aus dem CSS der
// Bauteile ausgelesen, nicht aus der Dokumentation abgeschrieben. Sie ist die
// Grundlage dieser Datei.
//
// NICHT UEBERNOMMEN WURDE SIE ALS SEITE, und zwar aus zwei Gruenden:
//
//   1. Sie ist vom 5.10.2026 und widerspricht an zentraler Stelle dem, was
//      seitdem gemessen wurde. Sie nennt --primary-color "Hauptfarbe: aktive
//      Schalter, Regler, gewaehlte Eintraege" - am 14.10. durchgespielt,
//      keines der drei stimmt. Was korrigiert ist, steht unten als KORREKTUR.
//   2. Sie erklaert 78 der 463 Felder, die HATS anbietet. Eine Hilfeseite,
//      die 83 Prozent ausspart, schickt den Nutzer beim Rest wieder ins Raten.
//
// Deshalb baut das Panel die Seite aus SEINER EIGENEN Feldliste und holt sich
// die Saetze hier ab. Ein neues Feld steht damit sofort in der Hilfe - mit
// einer sichtbaren Luecke, wenn niemand einen Satz geschrieben hat. Die Luecke
// ist Absicht: Sie ist die Arbeitsliste.
//
// ZWEI FEHLER AUS DEM ERSTEN WURF, beide am 15.10.2026 an der laufenden Seite
// gesehen und hier behoben:
//
//   - Die Saetze standen nur auf Deutsch. Die Hilfeseite ist Dokumentation,
//     und die geht nach aussen - also beide Sprachen, wie README und
//     Release Notes. Jeder Eintrag traegt jetzt de und en.
//   - Fuenf Merksaetze und alle drei Auslesen trugen ein doppelt gefluchtetes
//     \\n. Das Panel ersetzt \n durch <br>; ein literales Backslash-n trifft
//     der Austausch nicht, und der Leser sah den Backslash im Text stehen.
//     Der Fehler kam aus dem Erzeugerskript, nicht aus dem Inhalt - die Datei
//     wird seitdem von Hand gepflegt.


export const ERKLAERUNGEN = {
  "--accent-color": { de: "Hervorhebungen, der Akzentknopf", en: "Highlights, the accent button" },
  "--app-header-background-color": { de: "die Kopfleiste", en: "the header bar" },
  "--card-background-color": { de: "die Fläche einer Karte", en: "a card's surface" },
  "--control-button-background-color": { de: "die Fläche", en: "the surface" },
  "--control-button-background-opacity": { de: "Deckkraft der Fläche", en: "opacity of that surface" },
  "--control-button-icon-color": { de: "das Symbol", en: "the icon" },
  "--control-slider-background": { de: "leerer Teil", en: "the empty part" },
  "--control-slider-background-opacity": { de: "dessen Deckkraft", en: "its opacity" },
  "--control-slider-color": {
    de: "Zeigt auf --primary-color und ist damit in 2026 fraglich - nicht nachgemessen. Mushrooms Regler liest --slider-color, HAs Kachel --feature-color.",
    en: "Points at --primary-color, which makes it doubtful in 2026 - not measured. Mushroom's slider reads --slider-color, HA's tile --feature-color.",
  },
  "--control-switch-background-opacity": { de: "Deckkraft des Grundes", en: "opacity of the track" },
  "--control-switch-off-color": { de: "Schalter aus", en: "switch off" },
  "--control-switch-on-color": {
    de: "Zeigt auf --primary-color und ist damit in 2026 fraglich - nicht nachgemessen. Der sichere Weg ist --ha-switch-checked-background-color.",
    en: "Points at --primary-color, which makes it doubtful in 2026 - not measured. The safe route is --ha-switch-checked-background-color.",
  },
  "--dark-primary-color": { de: "dunklere Variante", en: "the darker variant" },
  "--disabled-text-color": { de: "gesperrt", en: "disabled" },
  "--divider-color": { de: "Trennlinien, Ränder", en: "dividers, borders" },
  "--error-color": { de: "Fehler", en: "error" },
  "--ha-border-radius-circle": { de: "runde Symbole", en: "round icons" },
  "--ha-border-radius-lg": { de: "Karten", en: "cards" },
  "--ha-border-radius-md": { de: "Bedienelemente", en: "controls" },
  "--ha-border-radius-pill": { de: "Knöpfe, Plaketten", en: "buttons, badges" },
  "--ha-border-radius-sm": { de: "Kästchen, Meldungen", en: "checkboxes, toasts" },
  "--ha-border-radius-square": { de: "eckig", en: "square" },
  "--ha-border-radius-xl": { de: "Dialoge (3xl = 24px)", en: "dialogs (3xl = 24px)" },
  "--ha-card-backdrop-filter": { de: "den Weichzeichner dahinter", en: "the blur behind it" },
  "--ha-card-background": { de: "die Fläche", en: "the surface" },
  "--ha-card-border-color": { de: "den Rand", en: "the border" },
  "--ha-card-border-radius": { de: "die Rundung", en: "the corner radius" },
  "--ha-card-border-width": { de: "seine Stärke", en: "its width" },
  "--ha-card-box-shadow": { de: "den Schatten", en: "the shadow" },
  "--ha-card-header-color": { de: "die Kopfzeile", en: "the card header" },
  "--ha-card-header-font-family": { de: "ihre Schrift", en: "its typeface" },
  "--ha-card-header-font-size": { de: "ihre Größe", en: "its size" },
  "--ha-color-border-neutral-normal": { de: "Rand eines ruhenden Felds", en: "border of a resting field" },
  "--ha-color-fill-danger-loud-hover": { de: "roter Knopf unter dem Zeiger", en: "red button under the pointer" },
  "--ha-color-fill-primary-normal-resting": { de: "Fläche eines aktiven Schalters", en: "surface of an active switch" },
  "--ha-color-on-primary-normal": { de: "was darauf liegt — der Daumen", en: "what sits on it — the thumb" },
  "--ha-font-size-2xl": { de: "Kartenkopf, Dialogtitel", en: "card header, dialog title" },
  "--ha-font-size-5xl": { de: "große Zahlen", en: "large figures" },
  "--ha-font-size-l": { de: "Fließtext, große Knöpfe", en: "body text, large buttons" },
  "--ha-font-size-m": { de: "Standard in Karten", en: "the default inside cards" },
  "--ha-font-size-s": { de: "zweite Zeilen", en: "secondary lines" },
  "--ha-font-size-scale": {
    de: "Multipliziert HAs ganze Schriftleiter. Kacheln und Mushroom wachsen mit, Bubbles Namen nicht - die stehen fest auf 13 und 16px.",
    en: "Multiplies HA's entire type scale. Tiles and Mushroom grow with it, Bubble's names do not - those are fixed at 13 and 16px.",
  },
  "--ha-font-size-xs": { de: "Plaketten", en: "badges" },
  "--ha-section-grid-column-gap": {
    de: "Die Luecke zwischen den Karten einer Zeile. Vorgabe 8px.",
    en: "The gap between cards in a row. Default 8px.",
  },
  "--ha-section-grid-row-gap": {
    de: "Die Luecke zwischen den Karten einer Spalte. Vorgabe 8px.",
    en: "The gap between cards in a column. Default 8px.",
  },
  "--ha-section-grid-row-height": {
    de: "Die Hoehe einer Rasterzeile, und damit die Hoehe JEDER Karte. Eine Kachel sind zwei Zeilen zu 56 plus 8 Luecke. HA setzt das Feld nicht - der Ausweichwert im Bauteil ist die einzige Quelle.",
    en: "The height of one grid row, and with it the height of EVERY card. A tile is two 56px rows plus an 8px gap. HA never sets this field - the component's fallback is the only source.",
  },
  "--ha-sidebar-expanded-width": {
    de: "Die Breite der ausgeklappten Seitenleiste. Die EINGEKLAPPTE steht fest in home-assistant-main (56px) und laesst sich von einer Theme nicht aendern.",
    en: "The width of the expanded sidebar. The COLLAPSED one is hard-coded in home-assistant-main (56px) and no theme can change it.",
  },
  "--ha-switch-background-color": { de: "Schiene, aus", en: "track, off" },
  "--ha-switch-border-color": { de: "ihr Rand, aus", en: "its border, off" },
  "--ha-switch-checked-background-color": { de: "Schiene, an", en: "track, on" },
  "--ha-switch-checked-border-color": { de: "ihr Rand, an", en: "its border, on" },
  "--ha-switch-checked-thumb-background-color": { de: "Daumen, an", en: "thumb, on" },
  "--ha-switch-checked-thumb-border-color": { de: "sein Rand, an", en: "its border, on" },
  "--ha-switch-disabled-opacity": { de: "gesperrt", en: "disabled" },
  "--ha-switch-size": { de: "Höhe der Schiene", en: "height of the track" },
  "--ha-switch-thumb-background-color": { de: "Daumen, aus", en: "thumb, off" },
  "--ha-switch-thumb-box-shadow": { de: "sein Schatten", en: "its shadow" },
  "--ha-switch-thumb-size": { de: "Daumen", en: "the thumb" },
  "--ha-switch-width": { de: "Breite", en: "width" },
  "--ha-view-sections-row-height": {
    de: "Sieht aus wie die Zeile der Section, ist es aber nicht: Gemessen bewegt sie keine Karte um einen Pixel. Sie bedient nur die Hilfsflaechen im Bearbeitungsmodus.",
    en: "Looks like the section's row, but is not: measured, it moves no card by a single pixel. It only drives the helper surfaces in edit mode.",
  },
  "--info-color": { de: "Hinweis", en: "info" },
  "--light-primary-color": { de: "hellere Variante", en: "the lighter variant" },
  "--primary-background-color": { de: "der Grund der Seite", en: "the page background" },
  "--primary-color": {
    de: "Nimmt den Wert an, wird aber kaum noch gelesen. Am 14.10.2026 mit #ff0000 durchgespielt: Schalter, Regler und Seitenleiste blieben alle drei unveraendert; von 1753 Elementen folgten 14. Schalter lesen --ha-switch-*, Regler die Farbe der Entitaet, die Seitenleiste --sidebar-selected-icon-color.",
    en: "Still accepts a value, but almost nothing reads it any more. Tried with #ff0000 on 14 Oct 2026: switches, sliders and the sidebar all three stayed unchanged; 14 of 1753 elements followed. Switches read --ha-switch-*, sliders the entity's colour, the sidebar --sidebar-selected-icon-color.",
  },
  "--primary-text-color": { de: "Fließtext", en: "body text" },
  "--secondary-background-color": { de: "abgesetzte Flächen", en: "offset surfaces" },
  "--secondary-text-color": { de: "zweite Zeile, Beschriftungen", en: "secondary line, labels" },
  "--sidebar-icon-color": { de: "Symbole der Seitenleiste", en: "the sidebar's icons" },
  "--sidebar-selected-icon-color": { de: "der gewählte Eintrag", en: "the selected entry" },
  "--state-active-color": { de: "Symbol einer aktiven Entität", en: "icon of an active entity" },
  "--state-icon-color": { de: "Symbol einer Entität im Ruhezustand", en: "icon of a resting entity" },
  "--state-inactive-color": { de: "ausgeschaltet", en: "switched off" },
  "--success-color": { de: "Erfolg", en: "success" },
  "--text-primary-color": { de: "Text auf farbigem Grund", en: "text on a coloured background" },
  "--wa-color-brand-fill-loud": {
    de: "Die Flaeche eines Knopfs mit appearance=accent - der schwebende Knopf auf den Einstellungsseiten. HA traegt hier --ha-color-fill-primary-loud-resting.",
    en: "The surface of a button with appearance=accent - the floating button on the settings pages. HA puts --ha-color-fill-primary-loud-resting here.",
  },
  "--wa-color-brand-fill-normal": {
    de: "Die Flaeche eines Knopfs mit appearance=filled. HA traegt hier --ha-color-fill-primary-normal-resting.",
    en: "The surface of a button with appearance=filled. HA puts --ha-color-fill-primary-normal-resting here.",
  },
  "--wa-color-surface-raised": {
    de: "Die Flaeche eines Aufklappmenues. Gemessen rgba(26, 31, 48, .9) - also schon durchscheinend. Weiter aufzumachen kostet die Lesbarkeit, denn ein Menue hat keine Weichzeichnung.",
    en: "The surface of a drop-down menu. Measured rgba(26, 31, 48, .9) - already translucent. Opening it further costs legibility, because a menu carries no blur.",
  },
  "--warning-color": { de: "Warnung", en: "warning" },
};

// Was keine einzelne Variable erklaert, sondern ein Zusammenhang. Die
// wertvollste Haelfte der uebergebenen Seite steckt hier, nicht in den
// Tabellen.
export const MERKSAETZE = [
  {
    bild: null,
    de: {
      titel: "Fuenf Generationen nebeneinander",
      text: "Home Assistant baut um, und in den Bauteilen stehen beide Welten nebeneinander. Am weitesten kommt man mit den Bauteil-Variablen: Sie sind der schmalste Hebel und ueberschreiben alles darunter. Die alten Grundfarben wirken breit, aber grob; die --ha-color-* liegen dazwischen.",
    },
    en: {
      titel: "Five generations side by side",
      text: "Home Assistant is rebuilding, and inside the components both worlds sit next to each other. The component variables get you furthest: they are the narrowest lever and override everything below. The old base colours act broadly but bluntly; the --ha-color-* sit in between.",
    },
  },
  {
    bild: "schalter-knoepfe.jpg",
    de: {
      titel: "Die Kette an einem Schalter",
      text: "--ha-switch-checked-background-color  <- hier ansetzen\n  sonst --ha-color-fill-primary-normal-resting\n    frueher abgeleitet aus --primary-color\n\nWer nur --primary-color setzt, faerbt heute nichts davon. Wer die Bauteil-Variable setzt, faerbt genau dieses eine Ding.",
    },
    en: {
      titel: "The chain behind one switch",
      text: "--ha-switch-checked-background-color  <- start here\n  else --ha-color-fill-primary-normal-resting\n    once derived from --primary-color\n\nSetting only --primary-color colours none of it today. Setting the component variable colours exactly this one thing.",
    },
  },
  {
    bild: null,
    de: {
      titel: "Zwei, die oft verwechselt werden",
      text: "--primary-text-color ist Text auf hellem Grund, --text-primary-color ist Text auf FARBIGEM Grund. Die Schrift auf einem blauen Knopf nimmt die zweite. Wer dort die erste einsetzt, bekommt dunkel auf dunkel.",
    },
    en: {
      titel: "Two that get mixed up",
      text: "--primary-text-color is text on a light background, --text-primary-color is text on a COLOURED one. The label on a blue button takes the second. Use the first there and you get dark on dark.",
    },
  },
  {
    bild: null,
    de: {
      titel: "Wie die neue Palette heisst",
      text: "--ha-color-<schicht>-<rolle>-<staerke>-<zustand>\n\nSchicht   fill (Flaeche) - on (was darauf liegt) - border - text\nRolle     primary - neutral - success - warning - danger - disabled\nStaerke   quiet (leise) - normal - loud (laut)\nZustand   resting (ruhend) - hover - active\n\nDaraus entstehen 159 Namen - aber nur 15 Entscheidungen, denn quiet und normal sind fuer jede Rolle dieselben Stufen.",
    },
    en: {
      titel: "How the new palette is named",
      text: "--ha-color-<layer>-<role>-<volume>-<state>\n\nLayer    fill - on (what sits on it) - border - text\nRole     primary - neutral - success - warning - danger - disabled\nVolume   quiet - normal - loud\nState    resting - hover - active\n\nThat makes 159 names - but only 15 decisions, because quiet and normal are the same steps for every role.",
    },
  },
  {
    bild: null,
    de: {
      titel: "Die 86 Zustandsfarben sind Verweise",
      text: "82 der 86 --state-<domaene>-<zustand>-color sind kein Wert, sondern ein var() auf einen der klassischen Toene: --state-light-active-color ist var(--amber-color), --state-cover-active-color ist var(--purple-color). Siebzehn Toene tragen alle 86. Wer die neunzehn klassischen Toene hat, hat jeden Zustand.",
    },
    en: {
      titel: "The 86 state colours are references",
      text: "82 of the 86 --state-<domain>-<state>-color are not values but a var() on one of the classic hues: --state-light-active-color is var(--amber-color), --state-cover-active-color is var(--purple-color). Seventeen hues carry all 86. Have the nineteen classic hues and you have every state.",
    },
  },
  {
    bild: "karte.jpg",
    de: {
      titel: "Glas braucht drei Angaben zusammen",
      text: "ha-card-background: \"rgba(255,255,255,0.5)\"\nha-card-backdrop-filter: \"blur(18px)\"\nha-card-box-shadow: \"0 4px 24px rgba(0,0,0,.1)\"\n\nOhne durchscheinende Flaeche wirkt der Weichzeichner nicht - er zeichnet ja, was hinter der Karte liegt.",
    },
    en: {
      titel: "Glass needs all three at once",
      text: "ha-card-background: \"rgba(255,255,255,0.5)\"\nha-card-backdrop-filter: \"blur(18px)\"\nha-card-box-shadow: \"0 4px 24px rgba(0,0,0,.1)\"\n\nWithout a translucent surface the blur does nothing - what it blurs is whatever lies behind the card.",
    },
  },
  {
    bild: "schrift.jpg",
    de: {
      titel: "Die Falle der Kurzschreibweise",
      text: "font: 500 13px inherit; wirkt GAR NICHT. In der Kurzform muss am Ende eine echte Schriftfamilie stehen; inherit ist dort nicht erlaubt, und der Browser verwirft dann die ganze Zeile - Groesse und Gewicht eingeschlossen.\n\nRichtig: font-family: inherit; font-weight: 500; font-size: 13px;",
    },
    en: {
      titel: "The shorthand trap",
      text: "font: 500 13px inherit; does NOTHING AT ALL. The shorthand must end in a real font family; inherit is not allowed there, and the browser then drops the whole declaration - size and weight included.\n\nRight: font-family: inherit; font-weight: 500; font-size: 13px;",
    },
  },
  {
    bild: "bedienelemente.jpg",
    de: {
      titel: "Konzentrisch runden",
      text: "Ein Element in einer Karte braucht einen kleineren Radius als die Karte selbst, sonst wirkt die Ecke eckig:\n\nborder-radius: calc(var(--ha-card-border-radius, 12px) - 4px);",
    },
    en: {
      titel: "Rounding concentrically",
      text: "An element inside a card needs a smaller radius than the card itself, otherwise the corner looks square:\n\nborder-radius: calc(var(--ha-card-border-radius, 12px) - 4px);",
    },
  },
  {
    bild: "meldungen.jpg",
    de: {
      titel: "Die Abstandsleiter",
      text: "--ha-space-1 bis --ha-space-20, in Vierer-Schritten: Die Zahl ist der Wert geteilt durch vier, --ha-space-4 sind 16px.\n\nSie polstert - sie macht Karten aber NICHT kleiner. Eine Kachel haengt an der Rasterzeile, nicht am Polster (gemessen: bei 3, 4 und 5px je Stufe blieb sie auf 120px).",
    },
    en: {
      titel: "The spacing ladder",
      text: "--ha-space-1 through --ha-space-20, in steps of four: the number is the value divided by four, so --ha-space-4 is 16px.\n\nIt pads - but it does NOT make cards smaller. A tile hangs on the grid row, not on the padding (measured: at 3, 4 and 5px per step it stayed at 120px).",
    },
  },
];

// Wie man es selbst nachsieht, statt es zu glauben. Dieselbe Haltung wie im
// ganzen Projekt: gemessen, nicht gelesen.
export const AUSLESEN = [
  {
    code: "document.documentElement.style.setProperty(\n  '--ha-switch-checked-background-color', '#e91e63');",
    de: {
      titel: "Eine Aenderung ausprobieren, ohne die Theme anzufassen",
      text: "Wirkt sofort auf der ganzen Seite und ist beim naechsten Neuladen weg. So laesst sich eine Farbe finden, bevor sie in die Datei geht.",
    },
    en: {
      titel: "Try a change without touching the theme",
      text: "Takes effect across the page at once and is gone on the next reload. That is how to find a colour before it goes into the file.",
    },
  },
  {
    code: "const s = getComputedStyle(document.documentElement);\nconst alle = [];\nfor (let i = 0; i < s.length; i++) {\n  const n = s[i];\n  if (n.startsWith('--')) alle.push([n, s.getPropertyValue(n).trim()]);\n}\nconsole.table(alle);",
    de: {
      titel: "Alle Variablen auflisten",
      text: "Die Standard-Theme setzt rund 645 Namen auf :root.",
    },
    en: {
      titel: "List every variable",
      text: "The default theme sets around 645 names on :root.",
    },
  },
  {
    code: "customElements.get('ha-switch').elementStyles\n  .map((s) => s.cssText).join('\\n');",
    de: {
      titel: "Was ein Bauteil wirklich liest",
      text: "Die Dokumentation von Home Assistant hinkt dem Code hinterher. Das Bauteil traegt sein CSS im Shadow-DOM - frag es selbst.",
    },
    en: {
      titel: "What a component actually reads",
      text: "Home Assistant's documentation trails its code. The component carries its CSS in the shadow DOM - ask it yourself.",
    },
  },
];

// Der Baukasten: fertige Teile zusammenstecken, statt 400 Felder einzeln zu setzen.
//
// Auf Ansage vom 13.10.2026: "koennen wir die glaseffekt als auswahl nutzen so
// dass wir vorgefertigte plugins zusammenstecken auf der ersten seite und dann
// nur das ergebnis angepasst werden kann. Zum beispiel erst eine farbpalette
// dann die schriftart aufbau der Karten mit farbe rand schatten und
// zuschaltbaren uix tweaks."
//
// Vier Sorten Teile, in der Reihenfolge, in der man sie waehlt:
//
//     Palette      fuenf Farbtoene - daraus rechnet palette.js 55 Stufen
//     Schrift      Familie und Groessenskala
//     Kartenstil   Flaeche, Rundung, Rahmen, Schatten als EIN Paket
//     Tweaks       die UIX-Vorlagen, einzeln zuschaltbar
//
// Danach stehen die acht Stufen zum Feinjustieren bereit. Der Baukasten
// ersetzt sie nicht, er fuellt sie.
//
// DIE REGEL FUER JEDEN WERT HIER: Er ist gemessen oder aus HAs eigenen Quellen
// uebernommen, nicht gewaehlt, weil er huebsch aussieht. Wo ein Wert eine
// Entscheidung ist und keine Messung, steht es im Kommentar dabei. Ein
// Baukasten, dessen Teile nicht zueinander passen, ist schlimmer als keiner:
// Er sieht nach Auswahl aus und liefert Zufall.

// ---------------------------------------------------------------------------
// Paletten
//
// Jede nennt nur FUENF Toene. Die elf Stufen je Rolle rechnet palette.js
// daraus, mit HAs eigenem Helligkeitsprofil - ein Mittelwert ueber die Rollen
// waere falsch, weil Gruen bei Stufe 50 auf 27 % Helligkeit sitzt und Rot auf
// 53 %. Wer hier eine sechste Farbe vermisst: Die Farbvielfalt fuer Mushroom
// und Bubbles Zustaende kommt aus den 22 klassischen Toenen, nicht von hier.

// Die Farben, die eine Palette auf der Kachel zeigt.
//
// Gemeldet am 14.10.2026: "ich habe keine farben zum auswaehlen." Die
// Hintergruende trugen einen Farbstreifen, die Paletten nur Text - und eine
// Farbe waehlt man nicht nach Beschreibung.
//
// Gezeigt wird die GERECHNETE Stufe, nicht der Basiston. Das ist kein Detail:
// rampe() nimmt vom Basiston nur Farbton und Saettigung, die Helligkeit kommt
// vollstaendig aus HAs Profil. Nords Neutral steht als #4c566a in den Daten,
// auf dem Bildschirm wird daraus ein Grau in HAs Helligkeit - ein Schwatz des
// Basiswerts waere also gelogen.
//
// Stufe 60, nicht 40: 40 ist HAs kraeftige Flaeche im Hellen, aber Gruen liegt
// dort bei #036730 und Orange bei #9d3800 - als Farbtupfer nebeneinander sieht
// das nach vier Brauntoenen aus. 60 ist dieselbe Rampe eine Stufe heller und
// zeigt, welche Farbe gemeint ist.
const HA_TOENE = {
  // Was ha_blanko stehen laesst, am 14.10.2026 am laufenden Stylesheet
  // ausgelesen (--ha-color-<rolle>-60). Noetig fuer die beiden Teile mit
  // farben: null - die rechnen nichts, also gibt es auch nichts zu rechnen.
  primary: "#37c8fd", red: "#f3676c", green: "#00ac49", orange: "#f36d00",
};
// OHNE neutral, und das ist kein Versehen: rampe() setzt fuer diese Rolle die
// Saettigung auf 0 (rolle === "neutral" ? 0 : s * faktor), damit auch den
// Farbton ausser Kraft. Jede Palette bekommt deshalb dasselbe #989898 - ein
// Schwatz, der bei allen fuenfzehn gleich aussieht, sagt nichts.
//
// Das heisst zugleich: Der Wert neutral in farben wird zwar uebergeben, wirkt
// aber nicht. Das gehoert entschieden, nicht weggeschwiegen - siehe CLAUDE.md.
const VORSCHAU_ROLLEN = ["primary", "red", "green", "orange"];

export function palettenVorschau(teil, dunkel = false) {
  const aus = [];
  if (teil.akzent) aus.push({ rolle: "akzent", hex: teil.akzent[dunkel ? "dark" : "light"] });
  for (const rolle of VORSCHAU_ROLLEN) {
    const basis = teil.farben?.[rolle];
    if (!basis) { aus.push({ rolle, hex: HA_TOENE[rolle] }); continue; }
    const r = rampe(basis, rolle);
    aus.push({ rolle, hex: r ? r[`ha-color-${rolle}-60`] : basis });
  }
  return aus;
}

export const PALETTEN = [
  {
    id: "ha",
    de: "Home Assistant", en: "Home Assistant",
    zweckDe: "HAs eigene Toene, unveraendert. Der Ausgangspunkt, wenn nichts auffallen soll.",
    zweckEn: "Home Assistant's own tones, unchanged. The starting point when nothing should stand out.",
    // KEINE farben - und das ist der Punkt.
    //
    // Die Grundlage ha_blanko bringt HAs 55 Palettenstufen schon mit, Wert
    // fuer Wert aus einer laufenden Instanz. Wer sie hier nachrechnen liesse,
    // bekaeme eine ANNAEHERUNG: palette.js leitet aus einem Basiston ab, und
    // HAs Rampen sind von Hand auf die Wahrnehmung abgestimmt. Am 13.10.2026
    // gemessen - 15 von 60 Stufen trafen, der Rest lag um ein bis acht
    // Einheiten daneben (#0092c7 statt #009ac7).
    //
    // Fuer eine Theme, die HAs Toene behalten soll, ist jede Abweichung eine
    // zu viel. Dieses Teil ruehrt die Palette deshalb nicht an.
    farben: null,
    akzent: { light: "#009ac7", dark: "#37c8fd" },
    // HAs eigene Tinte, aus ha_blanko. Steht hier, damit ein Wechsel von einer
    // anderen Palette wirklich zurueckfuehrt - ohne diese Werte bliebe die
    // Schrift der vorigen stehen.
    light: { "--primary-text-color": "#212121", "--secondary-text-color": "#727272",
             "--divider-color": "#0000001f" },
    dark:  { "--primary-text-color": "#e1e1e1", "--secondary-text-color": "#9b9b9b",
             "--divider-color": "rgba(225, 225, 225, 0.12)" },
  },
  {
    id: "liquid",
    de: "Liquid Glass", en: "Liquid Glass",
    zweckDe: "HAs Palette, violetter Akzent. Der Ton der Projektwerkbank.",
    zweckEn: "Home Assistant's palette, violet accent. The tone of the project workbench.",
    // Ebenfalls OHNE farben, und zwar gemessen: Die laufende liquid_glass
    // aendert an ha_blanko kein einziges Feld - 232 unveraendert, 0 geaendert,
    // vier neu dazu. Violett ist dort allein der AKZENT, nicht die Palette.
    //
    // Eine fruehere Fassung dieses Teils faerbte die ganze Primaerrampe
    // violett. Das sah nach "Liquid Glass" aus und war es nicht: Jeder
    // gefuellte Knopf, jeder Fortschrittsbalken und jede Verlinkung in Home
    // Assistant haengt an dieser Rampe.
    //
    // Der Akzent ist an der gerenderten Karte gemessen: #6350e4 kommt auf der
    // hellen Glasflaeche auf 4.6:1 und erfuellt WCAG AA. Das naheliegende
    // #6f5cf0 verfehlt es mit 4.23:1.
    farben: null,
    akzent: { light: "#6350e4", dark: "#8f7dff" },
    // Die Tinte der Projektwerkbank: ein blaustichiges Anthrazit statt HAs
    // neutralem Grau. Auf einer durchscheinenden Flaeche vor farbigem Grund
    // liest sich das ruhiger - reines Grau nimmt die Faerbung des
    // Hintergrunds an und wirkt dann schmutzig.
    light: { "--primary-text-color": "#17203a", "--secondary-text-color": "#5a6480",
             "--divider-color": "rgba(23, 32, 58, 0.1)" },
    dark:  { "--primary-text-color": "#eef1f8", "--secondary-text-color": "#a8b2c8",
             "--divider-color": "rgba(255, 255, 255, 0.12)" },
  },
  {
    id: "warm",
    de: "Warm", en: "Warm",
    zweckDe: "Bernstein und Terrakotta. Fuer Wohnraeume, in denen Blau kalt wirkt.",
    zweckEn: "Amber and terracotta. For living spaces where blue feels cold.",
    // Der Primaerton ist HAs orange-60; die Begleiter bleiben HAs Werte, damit
    // Warnung und Fehler unterscheidbar bleiben. Ein durchgehend warmes Schema
    // macht genau das unmoeglich.
    farben: { primary: "#f36d00", neutral: "#9c9289", red: "#dc3146", green: "#00ac49", orange: "#f36d00" },
    akzent: { light: "#c94e00", dark: "#ff9342" },
  },
  {
    id: "kuehl",
    de: "Kuehl", en: "Cool",
    zweckDe: "Teal auf grauem Neutral. Ruhig, ohne das Blau von Home Assistant.",
    zweckEn: "Teal on grey neutral. Calm, without Home Assistant's blue.",
    farben: { primary: "#00a89a", neutral: "#8a9290", red: "#f3676c", green: "#00ac49", orange: "#f36d00" },
    akzent: { light: "#00897b", dark: "#2dd4bf" },
  },
  {
    id: "blau",
    de: "Blau", en: "Blue",
    zweckDe: "Ein klares Blau. Naeher an Material als HAs eigenes Cyan.",
    zweckEn: "A clear blue. Closer to Material than Home Assistant's own cyan.",
    farben: { primary: "#2196f3", neutral: "#9e9e9e", red: "#f44336", green: "#4caf50", orange: "#ff9800" },
    akzent: { light: "#1976d2", dark: "#64b5f6" },
  },
  {
    id: "gruen",
    de: "Gruen", en: "Green",
    zweckDe: "Gruen als Marke. Die Zustandsfarben bleiben davon unberuehrt.",
    zweckEn: "Green as the brand colour. State colours stay as they are.",
    // Primaer und die Rolle "green" liegen hier dicht beieinander - das ist der
    // Preis einer gruenen Marke. Anders als bei Warm, wo Primaer und Orange
    // denselben Wert tragen, bleiben sie hier wenigstens zwei Toene.
    farben: { primary: "#4caf50", neutral: "#9e9e9e", red: "#f44336", green: "#2e9e52", orange: "#ff9800" },
    akzent: { light: "#388e3c", dark: "#81c784" },
  },
  {
    id: "orange",
    de: "Orange", en: "Orange",
    zweckDe: "HAs eigenes Orange als Marke - heller und klarer als Warm.",
    zweckEn: "Home Assistant's own orange as the brand colour - brighter and cleaner than Warm.",
    // Nicht dasselbe wie "Warm": Das traegt #f36d00, ein gedecktes Terrakotta.
    // Hier steht HAs --orange-color, also Material Orange 500.
    farben: { primary: "#ff9800", neutral: "#9e9e9e", red: "#f44336", green: "#4caf50", orange: "#fb8c00" },
    akzent: { light: "#ef6c00", dark: "#ffb74d" },
  },
  {
    id: "grau",
    de: "Grau", en: "Grey",
    zweckDe: "Blaugrau als Marke. Ruhig, aber nicht farblos wie Monochrom.",
    zweckEn: "Blue-grey as the brand colour. Calm, but not colourless like Monochrome.",
    // Der Unterschied zu Monochrom: Dort ist der AKZENT grau und die Farbe kommt
    // allein aus den Geraeten. Hier ist die Marke ein Blaugrau, die Akzentfarbe
    // also sichtbar - nur eben leise.
    farben: { primary: "#607d8b", neutral: "#9e9e9e", red: "#f44336", green: "#4caf50", orange: "#ff9800" },
    akzent: { light: "#455a64", dark: "#90a4ae" },
  },
  {
    id: "mono",
    de: "Monochrom", en: "Monochrome",
    zweckDe: "Nur Graustufen als Akzent. Die Farbe kommt dann allein aus den Geraeten.",
    zweckEn: "Greyscale accent only. Colour then comes from the devices alone.",
    // Bewusst KEIN graues Rot oder Gruen: Zustandsfarben muessen
    // unterscheidbar bleiben, sonst sieht eine Stoerung aus wie Normalbetrieb.
    farben: { primary: "#7a7a7a", neutral: "#989898", red: "#f3676c", green: "#00ac49", orange: "#f36d00" },
    akzent: { light: "#4a4a4a", dark: "#ccc" },
  },
  // ---------------------------------------------------------------------------
  // Uebernommene Paletten
  //
  // Nicht erfunden und nicht aus dem Gedaechtnis: Jede hat unten ihre Quelle.
  // Apple ist GEMESSEN (werkzeuge/test/macos-farben.swift und -ios.swift), die
  // uebrigen sind veroeffentlichte Werte, am 14.10.2026 von der jeweiligen
  // Quelle geholt.
  //
  // Zwei Regeln bei der Zuordnung auf HATS' fuenf Rollen, beide aus derselben
  // Einsicht: Die Rampe steht FLACH, gilt also fuer hell und dunkel zugleich.
  //   - Je Rolle EIN Ton, und zwar der gesaettigte. Die hellen und dunklen
  //     Stufen rechnet palette.js daraus; wer den blassen Dunkelmodus-Ton
  //     nimmt, bekommt im Hellen eine blasse Rampe.
  //   - Der Akzent ist die einzige Groesse, die je Modus verschieden sein darf -
  //     dort stehen deshalb die beiden Fassungen der Palette, wo es sie gibt.
  {
    id: "macos",
    de: "macOS", en: "macOS",
    zweckDe: "Apples Systemfarben, an macOS 26 und iOS ausgelesen. Beide tragen dieselben.",
    zweckEn: "Apple's system colours, read from macOS 26 and iOS. Both carry the same ones.",
    // GEMESSEN, nicht abgeschrieben: werkzeuge/test/macos-farben.swift liest
    // die NSColor-Werte je Erscheinungsbild aus. Am 14.10.2026 an macOS 26.5.2
    // gelaufen - und die bekannten Werte aus aelteren Versionen stimmen nicht
    // mehr:
    //
    //     systemRed     #ff3b30  ->  #ff383c
    //     systemBlue    #007aff  ->  #0088ff (hell) / #0091ff (dunkel)
    //     systemOrange  #ff9500  ->  #ff8d28
    //
    // UND ES GIBT KEINE ZWEITE APPLE-PALETTE. Am 14.10.2026 auch iOS gemessen,
    // ueber Mac Catalyst (werkzeuge/test/ios-farben.swift): Alle dreizehn
    // Systemfarben sind Wert fuer Wert dieselben wie unter macOS. Ein eigener
    // Eintrag "iOS" waere eine Kopie mit anderem Namen.
    //
    // Was sich WIRKLICH unterscheidet, sind die Graustufen: iOS hat die Leiter
    // systemGray2 bis systemGray6 (hell #aeaeb2 … #f2f2f7, dunkel #636366 …
    // #1c1c1e), macOS hat sie nicht. Fuer HATS spielt das keine Rolle - die
    // Rolle "neutral" ist systemGray, und der ist auf beiden #8e8e93.
    //
    // Der Primaerton ist bewusst controlAccentColor und nicht systemBlue: Die
    // Rampe steht FLACH, gilt also fuer beide Modi, und controlAccentColor ist
    // als einziges Apple-Blau in beiden Modi derselbe Wert (#007aff). Mit
    // systemBlue muesste man sich fuer einen der zwei entscheiden und laege im
    // anderen Modus daneben.
    farben: { primary: "#007aff", neutral: "#8e8e93", red: "#ff383c", green: "#34c759", orange: "#ff8d28" },
    // Der Akzent darf je Modus verschieden sein - hier also Apples eigene
    // beide systemBlue-Werte.
    akzent: { light: "#0088ff", dark: "#0091ff" },
    // Apples Schriftfarben sind Schwarz und Weiss mit Deckkraft
    // (labelColor #000 bei 84.7 %, secondaryLabel bei 49.8 %). So kann HATS
    // sie nicht schreiben: Home Assistant leitet seine RGB-Tripel nur aus
    // Werten mit "#" ab, und Mushroom baut daraus seine Zustandsfarben. Also
    // VERRECHNET, auf Apples eigenem Grund - windowBackgroundColor, hell
    // #ffffff und dunkel #1e1e1e:
    //
    //     hell    #000 @ 84.7 %  auf #ffffff  ->  #272727
    //             #000 @ 49.8 %  auf #ffffff  ->  #808080
    //     dunkel  #fff @ 84.7 %  auf #1e1e1e  ->  #dddddd
    //             #fff @ 54.9 %  auf #1e1e1e  ->  #9a9a9a
    //
    // Der Trenner darf dagegen durchscheinend bleiben: Aus ihm leitet HA kein
    // Tripel ab, und Apples separatorColor ist genau das - 9,8 % Deckkraft.
    light: { "--primary-text-color": "#272727", "--secondary-text-color": "#808080",
             "--divider-color": "rgba(0, 0, 0, 0.098)" },
    dark:  { "--primary-text-color": "#dddddd", "--secondary-text-color": "#9a9a9a",
             "--divider-color": "rgba(255, 255, 255, 0.098)" },
  },

  // ---------------------------------------------------------------------------
  // Vier Richtungen, nach Farbe benannt
  //
  // Die Grundtoene sind Home Assistants eigene klassische Toene, am 14.10.2026
  // am laufenden Stylesheet ausgelesen (--blue-color, --green-color,
  // --orange-color, --blue-grey-color). Sie sind identisch mit Material Design
  // 500; die Akzente nehmen deshalb 700 und 300 aus derselben Rampe, hell und
  // dunkel. Nichts davon ist von mir erfunden.
  //
  // Rot, Gruen und Orange bleiben dabei stehen, wie bei Warm und Kuehl: Eine
  // Stoerung muss sich von Normalbetrieb unterscheiden lassen, und ein
  // durchgehend eingefaerbtes Schema macht genau das unmoeglich.
  {
    id: "android",
    de: "Android", en: "Android",
    zweckDe: "Material 3, die Grundfarben von Google. Violett auf gedecktem Neutral.",
    zweckEn: "Material 3 baseline from Google. Violet on a muted neutral.",
    // Material 3 rechnet normalerweise alles aus EINEM Startton; "Baseline" ist
    // der Rueckfall, wenn die dynamische Farbe aus ist. Genau so arbeitet HATS
    // auch - ein Ton je Rolle, den Rest rechnet palette.js. Die Uebernahme ist
    // hier also naeher am Original als eine Tabelle es waere.
    //
    // Startton #6750a4 und Fehlerfarbe #b3261e sind die Baseline-Werte. Gruen
    // und Orange gibt es in M3 nicht als Rolle - dort stehen Googles eigene
    // Material-Toene (Green 500, Orange 500), damit "laeuft" und "Warnung"
    // unterscheidbar bleiben.
    farben: { primary: "#6750a4", neutral: "#625b71", red: "#b3261e", green: "#4caf50", orange: "#ff9800" },
    // Baseline hell und dunkel, beide veroeffentlicht.
    akzent: { light: "#6750a4", dark: "#d0bcff" },
  },
  {
    id: "nord",
    de: "Nord", en: "Nord",
    zweckDe: "Arktisches Blaugrau. Gedeckt, kuehl, sehr ruhig.",
    zweckEn: "Arctic blue-grey. Muted, cool, very calm.",
    // nordtheme.com/docs/colors-and-palettes, am 14.10.2026 geholt.
    // primary  nord10 #5e81ac   neutral nord3  #4c566a
    // red      nord11 #bf616a   green   nord14 #a3be8c   orange nord12 #d08770
    //
    // Nord hat KEINE mittleren Grautoene: Zwischen nord3 (#4c566a) und nord4
    // (#d8dee9) klafft die halbe Helligkeitsskala. Als Basis steht deshalb
    // nord3 da und die Rampe rechnet nach oben - ein erfundener Mittelton waere
    // kein Nord mehr.
    farben: { primary: "#5e81ac", neutral: "#4c566a", red: "#bf616a", green: "#a3be8c", orange: "#d08770" },
    akzent: { light: "#5e81ac", dark: "#88c0d0" },
  },
  {
    id: "glaswerk",
    de: "Glaswerk", en: "Glasswork",
    zweckDe: "Kuehles Azur mit violettem Akzent, dazu Minze, Koralle und Bernstein.",
    zweckEn: "Cool azure with a violet accent, plus mint, coral and amber.",
    // Am 14.10.2026 aus der Vorlage des Maintainers abgenommen - die Toene
    // der Farbfelder darin. ENTSCHIEDEN, nicht gemessen: Ein Bild hat keine
    // Palette, es hat Pixel; was hier steht, ist mein Lesen davon.
    //
    // Der Akzent ist violett und nicht azur. In der Vorlage steht beides
    // nebeneinander, und der Akzent ist das, was auf Reglern und aktiven
    // Zustaenden liegt - gleiche Farbe wie die Primaerfarbe waere dort
    // unsichtbar.
    farben: { primary: "#2b7fff", neutral: "#5a6880", red: "#f4674f", green: "#44c9a0", orange: "#e08a2b" },
    akzent: { light: "#7b5cf0", dark: "#9b84f8" },
  },
  {
    id: "solarized",
    de: "Solarized", en: "Solarized",
    zweckDe: "Der Klassiker von 2011 - als Paar aus Hell und Dunkel entworfen.",
    zweckEn: "The 2011 classic - designed as a light and dark pair from the start.",
    // ethanschoonover.com/solarized, am 14.10.2026 geholt.
    // Solarized ist die einzige hier, die von Anfang an BEIDE Modi meinte: Die
    // acht Grundtoene sind so gewaehlt, dass dieselben Akzentfarben auf hellem
    // und dunklem Grund funktionieren. base00 #657b83 ist der Mittelton - genau
    // das, was eine flache Rampe braucht.
    farben: { primary: "#268bd2", neutral: "#657b83", red: "#dc322f", green: "#859900", orange: "#cb4b16" },
    akzent: { light: "#268bd2", dark: "#2aa198" },
  },
  {
    id: "catppuccin",
    de: "Catppuccin", en: "Catppuccin",
    zweckDe: "Pastellig, violett getoent. Die heute meistgenutzte Entwicklerpalette.",
    zweckEn: "Pastel, violet-tinted. Today's most widely used developer palette.",
    // github.com/catppuccin/palette, am 14.10.2026 geholt.
    //
    // Catppuccin hat vier Geschmaecker; die Rollen nehmen die GESAETTIGTEN
    // Werte aus Latte (hell), nicht die Pastelltoene aus Mocha. Grund: Die
    // Rampe rechnet die hellen Stufen selbst, aus Mocha's #f38ba8 wuerde im
    // Hellen ein ausgewaschenes Rosa. Der AKZENT zeigt dafuer beide - Latte
    // Mauve hell, Mocha Mauve dunkel.
    farben: { primary: "#8839ef", neutral: "#6c7086", red: "#d20f39", green: "#40a02b", orange: "#fe640b" },
    akzent: { light: "#8839ef", dark: "#cba6f7" },
  },
  {
    id: "gruvbox",
    de: "Gruvbox", en: "Gruvbox",
    zweckDe: "Warm, retro, erdig. Senf und Terrakotta auf Braun.",
    zweckEn: "Warm, retro, earthy. Mustard and terracotta on brown.",
    // github.com/morhetz/gruvbox, colors/gruvbox.vim, am 14.10.2026 geholt.
    // Die "neutral"-Reihe, nicht die bright- oder faded-Reihe: Sie liegt in der
    // Mitte und taugt damit als Basis fuer eine Rampe in beide Richtungen.
    //
    // Gruvbox' Blau (#458588) ist kein Blau im ueblichen Sinn, sondern ein
    // gedecktes Petrol - das ist die Palette, nicht ein Fehler bei der
    // Uebernahme. Der Akzent nimmt dafuer das Orange, mit dem man Gruvbox
    // erkennt.
    farben: { primary: "#458588", neutral: "#928374", red: "#cc241d", green: "#98971a", orange: "#d65d0e" },
    akzent: { light: "#af3a03", dark: "#fe8019" },
  },

];

// ---------------------------------------------------------------------------
// Schriften
//
// Nur was ohne Download da ist. Eine Webschrift braucht uix-fonts und damit
// eine Datei auf der Instanz - das ist ein eigener Schritt, keine Auswahl.
//
// UND: --ha-font-family-body erreicht body NICHT. Im globalen Stylesheet steht
// "body { font-family: Roboto, Noto, sans-serif }" ohne Variable davor;
// gelesen wird der Name nur von hui-root und ha-tooltip. Auf einem Dashboard
// kommt die Schrift also an, auf der Home-Seite und in den Einstellungen
// nicht. Am 12.10.2026 gemessen.

export const SCHRIFTEN = [
  {
    id: "ha",
    de: "Home Assistant", en: "Home Assistant",
    zweckDe: "Roboto, wie ausgeliefert.",
    zweckEn: "Roboto, as shipped.",
    felder: { "--ha-font-family-body": "Roboto, Noto, sans-serif", "--ha-font-size-scale": "1" },
  },
  {
    id: "system",
    de: "Systemschrift", en: "System font",
    zweckDe: "Die Schrift des Geraets - San Francisco auf Apple, Segoe auf Windows, Roboto auf Android.",
    zweckEn: "The device's own font - San Francisco on Apple, Segoe on Windows, Roboto on Android.",
    felder: { "--ha-font-family-body": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
              "--ha-font-size-scale": "1" },
  },
  {
    id: "humanist",
    de: "Humanistisch", en: "Humanist",
    zweckDe: "Offenere Formen, etwas breiter. Liest sich auf Entfernung besser.",
    zweckEn: "More open shapes, slightly wider. Reads better at a distance.",
    felder: { "--ha-font-family-body": "'Segoe UI', Tahoma, Verdana, Geneva, sans-serif",
              "--ha-font-size-scale": "1.05" },
  },
  {
    id: "gross",
    de: "Groesser", en: "Larger",
    zweckDe: "Dieselbe Schrift, alles eine Stufe groesser. Fuer Wandtablets.",
    zweckEn: "Same font, everything one step larger. For wall tablets.",
    // Die Skala multipliziert jede Schriftgroesse - ein Wert statt zwanzig.
    felder: { "--ha-font-family-body": "Roboto, Noto, sans-serif", "--ha-font-size-scale": "1.15" },
  },
];

// ---------------------------------------------------------------------------
// Kartenstile
//
// Flaeche, Rundung, Rahmen, Schatten und Weichzeichnung gehoeren zusammen -
// einzeln gewaehlt ergeben sie Unsinn. Eine durchscheinende Flaeche ohne
// Weichzeichnung sieht aus wie ein Fehler; ein kraeftiger Schatten unter einer
// flachen Karte auch.
//
// JEDER STIL SETZT DIESELBEN SECHS FELDER. Wer einen neuen anlegt, fuellt alle
// sechs - ein fehlendes Feld behaelt den Wert des vorigen Stils, und dann
// mischen sich zwei Entwuerfe.

const KARTENFELDER = ["--ha-card-background", "--ha-card-backdrop-filter", "--ha-card-border-radius",
                      "--ha-card-border-width", "--ha-card-border-color", "--ha-card-box-shadow"];

// Ein Stil hoert nicht an der Kartenkante auf.
//
// Am 13.10.2026 beim Nachbau der laufenden Theme gemessen: Mit den sechs
// Feldern oben kam der Baukasten auf 235 von 236 flachen Feldern - und liess
// Dialoge, Seitenleiste und Kopfleiste deckend stehen. Eine Oberflaeche, bei
// der die Karten durchscheinen und die Leisten nicht, sieht nicht nach Glas
// aus, sondern nach einem halben Umbau.
//
// mdc-dialog-scrim-color gehoert dazu, weil der Schleier hinter einem Dialog
// die Flaeche davor erst lesbar macht; card-background-color, weil es die
// DECKENDE Rueckfallfarbe ist - Auswahllisten und Menues lesen sie, und
// durchscheinend waeren sie unlesbar.
const FLAECHENFELDER = ["--ha-dialog-surface-background", "--mdc-dialog-scrim-color",
                        "--sidebar-background-color", "--app-header-background-color",
                        "--app-header-backdrop-filter", "--card-background-color"];

export const KARTENSTILE = [
  {
    id: "glas",
    de: "Glas", en: "Glass",
    zweckDe: "Durchscheinend mit Weichzeichnung, Lichtkante oben, weicher Schatten. Braucht einen Hintergrund, der etwas hergibt.",
    zweckEn: "Translucent with blur, light edge on top, soft shadow. Needs a background with something to show through.",
    // Die Zahlen der Projektwerkbank, damit Panel und Theme dieselbe Sprache
    // sprechen. Vier Schatten: zwei innere Kanten, zwei aeussere.
    // Die Kanten gehoeren HIERHER und nicht in eine Vorlage - ein uix-Feld
    // gilt fuer Hell und Dunkel zugleich, eine Kante in rgba(255,255,255,.72)
    // waere im Dunkeln ein greller Strich.
    flach: { "--ha-card-backdrop-filter": "blur(26px) saturate(180%)",
             "--ha-card-border-radius": "20px", "--ha-card-border-width": "0",
             "--ha-card-border-color": "",
             // Die Leisten bekommen dieselbe Weichzeichnung, nur schwaecher:
             // Sie liegen am Rand und sollen den Blick nicht fangen.
             "--app-header-backdrop-filter": "blur(22px) saturate(170%)" },
    light: { "--ha-card-background": "rgba(255, 255, 255, 0.42)",
             "--ha-card-box-shadow": "inset 0 1.5px 0 0 rgba(255, 255, 255, .72), " +
               "inset 0 -1.5px 0 0 rgba(10, 20, 45, .1), " +
               "0 18px 46px rgba(22, 40, 78, .16), 0 2px 6px rgba(22, 40, 78, .08)",
             // Der Dialog deckender als die Karte: Darin steht Text, der
             // gelesen werden will, und darunter liegt oft eine volle Seite.
             "--ha-dialog-surface-background": "rgba(255, 255, 255, 0.86)",
             "--mdc-dialog-scrim-color": "rgba(16, 24, 44, 0.32)",
             "--sidebar-background-color": "rgba(255, 255, 255, 0.4)",
             "--app-header-background-color": "rgba(255, 255, 255, 0.3)",
             // DECKEND, und das ist Absicht: Auswahllisten und Menues lesen
             // diese Farbe. Durchscheinend schlaegt der Text der Karte
             // darunter durch, und sie sind unlesbar.
             "--card-background-color": "#ffffff" },
    dark:  { "--ha-card-background": "rgba(22, 28, 46, 0.46)",
             "--ha-card-box-shadow": "inset 0 1.5px 0 0 rgba(255, 255, 255, .16), " +
               "inset 0 -1.5px 0 0 rgba(0, 0, 0, .35), " +
               "0 20px 52px rgba(0, 0, 0, .5), 0 2px 6px rgba(0, 0, 0, .3)",
             "--ha-dialog-surface-background": "rgba(26, 31, 48, 0.9)",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.52)",
             "--sidebar-background-color": "rgba(20, 25, 40, 0.42)",
             "--app-header-background-color": "rgba(20, 25, 40, 0.34)",
             "--card-background-color": "#1c2234" },
    braucht: { hintergrund: true },
  },
  {
    id: "liquid",
    de: "Liquid Glass", en: "Liquid Glass",
    zweckDe: "Dicke Scheibe: heller Saum rundum, schraeger Lichtstreifen, tiefer Schatten. Der Grund scheint durch.",
    zweckEn: "A thick pane: bright rim all round, a diagonal sheen, a deep shadow. The ground shows through.",
    // Am 14.10.2026 an der Testmaschine gebaut, auf Ansage: "so muss fuer
    // mich eine glaskarte aussehen", mit einem Bild daneben. Drei Durchgaenge
    // gegen das Bild, hell und dunkel, auf dem Hintergrund "Lavendel".
    //
    // Was diesen Stil von "Glas" unterscheidet, sind drei Dinge - und alle
    // drei gehen mit gewoehnlichen Theme-Feldern, ohne UI eXtension:
    //
    // 1. --ha-card-background ist kein einzelner rgba-Wert, sondern ZWEI
    //    Ebenen. ha-card liest background (die Kurzform), also darf dort
    //    alles stehen, was CSS als Hintergrund kennt. Oben ein schraeger
    //    Verlauf - das ist der Lichtstreifen, der die Scheibe erst dick
    //    aussehen laesst -, darunter eine kuehle Grundtoenung.
    // 2. Der Saum laeuft RUNDUM, nicht nur oben: inset 0 0 0 1px. "Glas"
    //    setzt nur eine Lichtkante oben und eine dunkle unten; dadurch sieht
    //    es aus wie eine Flaeche mit Kante, nicht wie eine Scheibe mit Rand.
    // 3. Die Unterkante ist HELL, nicht dunkel. Die Trennung nach unten macht
    //    der aeussere Schatten, in drei Stufen - 1 px fuer die Kante, 24 px
    //    fuer die Naehe, 60 px fuer den Raum darunter.
    flach: { "--ha-card-backdrop-filter": "blur(34px) saturate(200%)",
             "--ha-card-border-radius": "26px",
             // Kein Rahmen: Der Saum steckt im Schatten. Ein zusaetzlicher
             // Rahmen laege AUSSERHALB des Saums und machte zwei Linien.
             "--ha-card-border-width": "0", "--ha-card-border-color": "",
             "--app-header-backdrop-filter": "blur(22px) saturate(170%)" },
    light: { "--ha-card-background":
               "linear-gradient(150deg, rgba(255,255,255,.82) 0%, rgba(255,255,255,.32) 32%, " +
               "rgba(255,255,255,.16) 58%, rgba(255,255,255,.42) 100%), " +
               "linear-gradient(0deg, rgba(186,202,234,.24), rgba(186,202,234,.24))",
             "--ha-card-box-shadow":
               "inset 0 1.5px 0 rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,.72), " +
               "inset 0 -1px 0 rgba(255,255,255,.50), 0 1px 2px rgba(26,40,72,.08), " +
               "0 10px 24px rgba(26,40,72,.13), 0 28px 60px rgba(26,40,72,.15)",
             "--ha-dialog-surface-background": "rgba(255,255,255,.88)",
             "--mdc-dialog-scrim-color": "rgba(16,24,44,.30)",
             "--sidebar-background-color": "rgba(255,255,255,.42)",
             "--app-header-background-color": "rgba(255,255,255,.34)",
             // DECKEND: Auswahllisten und Menues lesen dieses Feld, und sie
             // haben nichts, durch das sie scheinen koennten.
             "--card-background-color": "#ffffff" },
    // Im Dunkeln traegt das Licht die Kante, nicht der Schatten - deshalb ein
    // deutlich hellerer Saum und ein viel tieferer Schatten als im Hellen.
    dark:  { "--ha-card-background":
               "linear-gradient(150deg, rgba(255,255,255,.17) 0%, rgba(255,255,255,.055) 34%, " +
               "rgba(255,255,255,.02) 58%, rgba(255,255,255,.075) 100%), " +
               "linear-gradient(0deg, rgba(20,26,46,.44), rgba(20,26,46,.44))",
             "--ha-card-box-shadow":
               "inset 0 1.5px 0 rgba(255,255,255,.32), inset 0 0 0 1px rgba(255,255,255,.15), " +
               "inset 0 -1px 0 rgba(255,255,255,.07), 0 1px 2px rgba(0,0,0,.35), " +
               "0 10px 26px rgba(0,0,0,.45), 0 30px 64px rgba(0,0,0,.50)",
             "--ha-dialog-surface-background": "rgba(26,29,43,.90)",
             "--mdc-dialog-scrim-color": "rgba(0,0,0,.54)",
             "--sidebar-background-color": "rgba(18,20,32,.46)",
             "--app-header-background-color": "rgba(18,20,32,.36)",
             "--card-background-color": "#1a1d2b" },
    braucht: { hintergrund: true },
  },
  {
    id: "macos",
    de: "macOS", en: "macOS",
    zweckDe: "Apples Material: staerker weichgezeichnet, deckender als Glas, mit Haarlinie und weitem Schatten.",
    zweckEn: "Apple's material: blurred harder, more opaque than Glass, with a hairline and a wide shadow.",
    // Die Werte stehen schon in werkzeuge/macos-bauen.mjs und sind dort
    // belegt: Die FARBEN sind am System ausgelesen (AppKit, macOS 26.5.2),
    // Deckkraft und Weichzeichnung sind Entscheidungen. Hier stehen sie
    // wortgleich, damit die gebaute Theme und der Baukasten dasselbe liefern -
    // und damit erkenneTeil sie wiedererkennt.
    //
    // Der Unterschied zu "Glas" ist nicht nur die Zahl: Apple laesst den Grund
    // AHNEN, nicht lesen. Deshalb 0.62 statt 0.42, und deshalb 30 px
    // Weichzeichnung statt 26.
    flach: { "--ha-card-backdrop-filter": "blur(30px) saturate(180%)",
             "--ha-card-border-radius": "12px",
             // Apples Trennlinien sind Haarlinien, nicht Striche.
             "--ha-card-border-width": "0.5px",
             // Leer, mit Absicht: Dann nimmt die Karte --divider-color, und
             // das ist Apples separatorColor - je Modus, und gemessen.
             "--ha-card-border-color": "",
             // Die Titelleiste zeichnet am staerksten weich: Dort rutscht der
             // Inhalt darunter durch, und nur die Unschaerfe haelt die
             // Schrift lesbar.
             "--app-header-backdrop-filter": "blur(40px) saturate(180%)",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.32)" },
    light: { "--ha-card-background": "rgba(255, 255, 255, 0.62)",
             // Haarlinie, weiter Schatten, kurzer Schatten - zusammen ergibt
             // das ein macOS-Fenster. Der Schatten allein wirkt schmutzig,
             // die Linie allein flach.
             "--ha-card-box-shadow": "0 0 0 0.5px rgba(0, 0, 0, 0.08), " +
               "0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)",
             "--ha-dialog-surface-background": "rgba(255, 255, 255, 0.86)",
             // Die Seitenleiste ist durchscheinender als der Inhalt: Sie liegt
             // ueber dem Schreibtisch, nicht ueber dem Dokument.
             "--sidebar-background-color": "rgba(246, 246, 248, 0.72)",
             "--app-header-background-color": "rgba(255, 255, 255, 0.72)",
             // windowBackgroundColor, gemessen. Deckend, weil Menues und
             // Auswahllisten dieses Feld lesen.
             "--card-background-color": "#ffffff" },
    dark:  { "--ha-card-background": "rgba(30, 30, 30, 0.58)",
             // Im Dunkeln traegt nicht mehr der Schatten die Kante, sondern
             // das Licht darauf - die Haarlinie ist hell.
             "--ha-card-box-shadow": "0 0 0 0.5px rgba(255, 255, 255, 0.10), " +
               "0 12px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)",
             "--ha-dialog-surface-background": "rgba(38, 38, 40, 0.86)",
             "--sidebar-background-color": "rgba(28, 28, 30, 0.72)",
             "--app-header-background-color": "rgba(30, 30, 30, 0.72)",
             "--card-background-color": "#1e1e1e" },
    braucht: { hintergrund: true },
  },
  {
    id: "gepraegt",
    de: "Gepraegt", en: "Embossed",
    zweckDe: "Die Karte hat dieselbe Farbe wie der Grund und steht nur durch Licht und Schatten heraus.",
    zweckEn: "The card is the same colour as the ground and stands out through light and shadow alone.",
    // Kein Rahmen und keine eigene Flaechenfarbe - die Kante entsteht
    // ausschliesslich aus zwei Schatten: Licht von oben links, Schatten nach
    // unten rechts. Deshalb braucht dieser Stil einen EINFARBIGEN Grund; vor
    // einem Verlauf oder Bild sieht die Karte aus wie ein Fleck.
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "18px",
             "--ha-card-border-width": "0", "--ha-card-border-color": "",
             "--app-header-backdrop-filter": "none",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.36)" },
    light: { "--ha-card-background": "#eef0f4",
             "--ha-card-box-shadow": "-6px -6px 14px rgba(255, 255, 255, .9), " +
               "6px 6px 16px rgba(13, 22, 43, .14)",
             "--ha-dialog-surface-background": "#eef0f4",
             "--sidebar-background-color": "#eef0f4",
             "--app-header-background-color": "#eef0f4",
             "--card-background-color": "#eef0f4" },
    // Im Dunkeln traegt das Licht fast nichts mehr - ein weisser Schein auf
    // #1a1c20 waere ein grauer Fleck. Also wenig Licht, viel Schatten.
    dark:  { "--ha-card-background": "#1a1c20",
             "--ha-card-box-shadow": "-6px -6px 14px rgba(255, 255, 255, .04), " +
               "6px 6px 18px rgba(0, 0, 0, .55)",
             "--ha-dialog-surface-background": "#1a1c20",
             "--sidebar-background-color": "#1a1c20",
             "--app-header-background-color": "#1a1c20",
             "--card-background-color": "#1a1c20" },
  },
  {
    id: "kontur",
    de: "Kontur", en: "Outline",
    zweckDe: "Nur Linien: Die Karte hat die Farbe des Grundes, kein Schatten, ein deutlicher Rahmen.",
    zweckEn: "Lines only: the card takes the ground's colour, no shadow, a clear border.",
    // Der Gegenentwurf zu "Gepraegt" - dieselbe Flaeche, aber die Kante wird
    // gezeichnet statt beleuchtet. Zwei Pixel, nicht einer: Bei einem
    // sieht es aus wie "Flach" mit vergessenem Hintergrund.
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "14px",
             "--ha-card-border-width": "2px", "--ha-card-border-color": "var(--divider-color)",
             "--app-header-backdrop-filter": "none",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.36)" },
    light: { "--ha-card-background": "#f4f5f8", "--ha-card-box-shadow": "none",
             // Der Dialog ist die Ausnahme: Er liegt ueber der Seite und
             // braucht eine eigene Flaeche, sonst liest man beide zugleich.
             "--ha-dialog-surface-background": "#ffffff",
             "--sidebar-background-color": "#f4f5f8",
             "--app-header-background-color": "#f4f5f8",
             "--card-background-color": "#ffffff" },
    dark:  { "--ha-card-background": "#17181c", "--ha-card-box-shadow": "none",
             "--ha-dialog-surface-background": "#1f2126",
             "--sidebar-background-color": "#17181c",
             "--app-header-background-color": "#17181c",
             "--card-background-color": "#1f2126" },
  },
  {
    id: "flach",
    de: "Flach", en: "Flat",
    zweckDe: "Deckend, ohne Schatten, mit feiner Kante. Haelt auch vor einem einfarbigen Hintergrund.",
    zweckEn: "Opaque, no shadow, with a fine edge. Works in front of a plain background too.",
    // Die Kante kommt aus --divider-color, also derselben Farbe wie jede
    // andere Trennlinie in Home Assistant - je Modus gesetzt.
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "12px",
             "--ha-card-border-width": "1px", "--ha-card-border-color": "var(--divider-color)",
             "--app-header-backdrop-filter": "none" },
    light: { "--ha-card-background": "#ffffff", "--ha-card-box-shadow": "none",
             "--ha-dialog-surface-background": "#ffffff",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.32)",
             "--sidebar-background-color": "#ffffff",
             "--app-header-background-color": "#ffffff",
             "--card-background-color": "#ffffff" },
    dark:  { "--ha-card-background": "#1c2234", "--ha-card-box-shadow": "none",
             "--ha-dialog-surface-background": "#1c2234",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.52)",
             "--sidebar-background-color": "#1c2234",
             "--app-header-background-color": "#1c2234",
             "--card-background-color": "#1c2234" },
  },
  {
    id: "erhaben",
    de: "Erhaben", en: "Raised",
    zweckDe: "Deckend, deutlich abgesetzt, ohne Rahmen. Die Karte liegt auf dem Hintergrund.",
    zweckEn: "Opaque, clearly lifted, no border. The card sits on top of the background.",
    // Die Schatten sind HAs eigene Stufe l - sie stehen ohnehin als Feld in
    // jeder Theme und sind damit auf HAs Oberflaeche abgestimmt.
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "16px",
             "--ha-card-border-width": "0", "--ha-card-border-color": "",
             "--app-header-backdrop-filter": "none" },
    light: { "--ha-card-background": "#ffffff",
             "--ha-card-box-shadow": "0 6px 12px -3px #0000001f, 0 16px 32px -6px #0003",
             "--ha-dialog-surface-background": "#ffffff",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.32)",
             "--sidebar-background-color": "#fafafa",
             "--app-header-background-color": "#ffffff",
             "--card-background-color": "#ffffff" },
    dark:  { "--ha-card-background": "#1c2234",
             "--ha-card-box-shadow": "0 6px 12px -3px rgba(0, 0, 0, 0.4), 0 16px 32px -6px rgba(0, 0, 0, 0.55)",
             "--ha-dialog-surface-background": "#1c2234",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.52)",
             "--sidebar-background-color": "#161b2b",
             "--app-header-background-color": "#1c2234",
             "--card-background-color": "#1c2234" },
  },
  {
    id: "papier",
    de: "Papier", en: "Paper",
    zweckDe: "Deckend, kaum gerundet, nur ein Hauch Schatten. Ruhig und dicht.",
    zweckEn: "Opaque, barely rounded, just a hint of shadow. Calm and dense.",
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "4px",
             "--ha-card-border-width": "1px", "--ha-card-border-color": "var(--divider-color)",
             "--app-header-backdrop-filter": "none" },
    light: { "--ha-card-background": "#ffffff",
             "--ha-card-box-shadow": "0 1px 2px 0 #00000014, 0 1px 3px 0 #0000001f",
             "--ha-dialog-surface-background": "#ffffff",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.32)",
             "--sidebar-background-color": "#f5f5f5",
             "--app-header-background-color": "#ffffff",
             "--card-background-color": "#ffffff" },
    dark:  { "--ha-card-background": "#1c2234",
             "--ha-card-box-shadow": "0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.5)",
             "--ha-dialog-surface-background": "#1c2234",
             "--mdc-dialog-scrim-color": "rgba(0, 0, 0, 0.52)",
             "--sidebar-background-color": "#171c2c",
             "--app-header-background-color": "#1c2234",
             "--card-background-color": "#1c2234" },
  },
];

// ---------------------------------------------------------------------------
// Rundung
//
// Home Assistant fuehrt seine Ecken als LEITER, nicht als Einzelwert: sm, md,
// lg, xl, 2xl bis 6xl. Knoepfe, Chips, Eingabefelder, Dialoge und Badges lesen
// daraus, jeder seine Stufe. Ein Teil setzt deshalb die ganze Leiter - eine
// halbe ergaebe eckige Knoepfe an runden Karten.
//
// Die Karte bekommt ihre eigene Stufe dazu. Gemessen am 14.10.2026 an
// ha-card auf der Testmaschine:
//
//     border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg))
//
// Home Assistant nimmt also von sich aus lg. Jedes Teil hier setzt
// --ha-card-border-radius auf genau sein lg - dann sieht die Karte aus wie der
// Rest, und wer sie anders will, dreht den Regler auf der Seite der Sorte.
//
// pill, circle und square stehen NICHT dabei: 9999px, 50% und 0 sind keine
// Stufen einer Leiter, sondern Formen. Sie aendern sich mit der Rundung nicht.

const RADIUS_STUFEN = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"];

function radiusLeiter(werte) {
  const f = {};
  RADIUS_STUFEN.forEach((s, i) => { f[`--ha-border-radius-${s}`] = `${werte[i]}px`; });
  // Die Karte folgt der Leiter, wie bei Home Assistant selbst: lg ist der
  // dritte Wert.
  f["--ha-card-border-radius"] = `${werte[2]}px`;
  return f;
}

export const RUNDUNGEN = [
  {
    id: "eckig",
    de: "Eckig", en: "Square",
    zweckDe: "Kaum gerundet. Streng, und auf kleinen Flaechen am ruhigsten.",
    zweckEn: "Barely rounded. Strict, and calmest on small surfaces.",
    // Nicht ueberall 0: Ein Knopf mit scharfer Ecke wirkt beschaedigt, und
    // HAs Umschalter zeichnen ihre Spur mit demselben Radius.
    felder: radiusLeiter([0, 0, 2, 2, 4, 4, 6, 6, 8]),
  },
  {
    id: "weich",
    de: "Weich", en: "Soft",
    zweckDe: "Flach ansteigend: kleine Dinge deutlich gerundet, grosse kaum mehr. Apples Leiter.",
    zweckEn: "Rises gently: small things clearly rounded, large ones barely more. Apple's ladder.",
    // Am 14.10.2026 an macOS 26.5.2 abgelesen, nicht geschaetzt.
    felder: radiusLeiter([6, 8, 10, 12, 16, 20, 24, 28, 32]),
  },
  {
    id: "ha",
    de: "Home Assistant", en: "Home Assistant",
    zweckDe: "Wie ausgeliefert: vier Pixel je Stufe, von 4 bis 36.",
    zweckEn: "As shipped: four pixels per step, from 4 to 36.",
    felder: radiusLeiter([4, 8, 12, 16, 20, 24, 28, 32, 36]),
  },
  {
    id: "rund",
    de: "Rund", en: "Round",
    zweckDe: "Deutlich gerundet. Weich und freundlich, braucht aber Platz.",
    zweckEn: "Clearly rounded. Soft and friendly, but it needs room.",
    felder: radiusLeiter([10, 14, 20, 26, 32, 38, 44, 50, 56]),
  },
];

// ---------------------------------------------------------------------------
// Dichte
//
// --ha-space-1 bis -20 ist dieselbe Sorte Leiter, und Home Assistant haelt sie
// linear: vier Pixel mal n, von 4 bis 80. Ein Teil multipliziert also nur den
// Schritt.
//
// Dass es ankommt, ist gemessen - ha-card polstert mit
//
//     .card-header   padding: var(--ha-space-5) var(--ha-space-4) var(--ha-space-6)
//     .card-content  padding: var(--ha-space-4)
//     .card-actions  padding: var(--ha-space-2)
//
// Die Leiter wird also nicht nur gesetzt, sie wird auch gelesen.

function abstandsLeiter(schritt) {
  const f = {};
  for (let i = 1; i <= 20; i++) f[`--ha-space-${i}`] = `${schritt * i}px`;
  return f;
}

export const DICHTEN = [
  {
    id: "eng",
    de: "Eng", en: "Tight",
    zweckDe: "Drei Pixel je Stufe. Mehr auf den Schirm, enger beieinander.",
    zweckEn: "Three pixels per step. More on screen, closer together.",
    felder: abstandsLeiter(3),
  },
  {
    id: "ha",
    de: "Home Assistant", en: "Home Assistant",
    zweckDe: "Wie ausgeliefert: vier Pixel je Stufe.",
    zweckEn: "As shipped: four pixels per step.",
    felder: abstandsLeiter(4),
  },
  {
    id: "weit",
    de: "Weit", en: "Roomy",
    zweckDe: "Fuenf Pixel je Stufe. Luftiger, und mit dem Finger leichter zu treffen.",
    zweckEn: "Five pixels per step. Airier, and easier to hit with a finger.",
    felder: abstandsLeiter(5),
  },
  {
    id: "sehr-weit",
    de: "Sehr weit", en: "Very roomy",
    zweckDe: "Sechs Pixel je Stufe. Fuer Wandtablets, aus zwei Metern Abstand.",
    zweckEn: "Six pixels per step. For wall tablets, seen from two metres away.",
    felder: abstandsLeiter(6),
  },
];

// ---------------------------------------------------------------------------
// Hintergruende
//
// Die Teile selbst stehen seit dem 13.10.2026 in hintergrund.js - uebergeben
// an die Sitzung, die den Hintergrund baut, auf Ansage des Maintainers. Dort
// steht auch, was gemessen ist: wo --lovelace-background ankommt, warum die
// Farbinseln "fixed" tragen, und was ueber allem liegt.
//
// Hier bleiben sie unter demselben Namen erreichbar, weil der Baukasten sie
// als Sorte fuehrt. Und hier bleibt, was zum Kartenstil gehoert: Glas vor
// einer einfarbigen Wand sieht aus wie eine etwas hellere Wand - deshalb
// traegt der Stil oben ein braucht.hintergrund.

import { HINTERGRUENDE, ohneFest } from "./hintergrund.js";
export { HINTERGRUENDE };

// ---------------------------------------------------------------------------
// Was ein Teil anrichtet, bevor es angewendet wird
//
// Der Baukasten schreibt in dieselben Felder wie die acht Stufen. Wer dort
// schon von Hand etwas gesetzt hat, soll es nicht stillschweigend verlieren -
// deshalb sagt diese Funktion vorher, was ueberschrieben wuerde.

export function betrifft(teil) {
  const aus = { flach: [], light: [], dark: [] };
  for (const ebene of ["flach", "light", "dark"])
    for (const k of Object.keys(teil?.[ebene] || {})) aus[ebene].push(k);
  for (const k of Object.keys(teil?.felder || {})) aus.flach.push(k);
  return aus;
}

export const KARTENSTIL_FELDER = [...KARTENFELDER, ...FLAECHENFELDER];

// ---------------------------------------------------------------------------
// Welche Vorlagen zu welcher Sorte gehoeren
//
// Ein Klick auf eine Kachel wendet das Teil an UND oeffnet seine Seite - dort
// stehen die Tweaks, die zu dieser Sorte passen. Auf Ansage vom 13.10.2026:
// "was haeltst du davon wenn man auf die kachel klickt eine seite zum
// bearbeiten aufgeht mit den Tweaks."
//
// Die Zuordnung geht nach dem ORT, an dem eine Vorlage wirkt, nicht nach ihrem
// Stilziel: glas-bubble und sync-bedienelemente zielen beide auf uix-card, die
// eine macht Flaechen, die andere Bedienelemente - fuer den Nutzer sind das
// zwei verschiedene Dinge am selben Ort, naemlich auf der Karte.
//
// Vierzehn Vorlagen auf fuenf Sorten. "Oberflaeche" ist dazugekommen, weil
// Seitenleiste, Kopfleiste und Dialoge sonst nirgends hingehoert haetten -
// sie sind weder Karte noch Hintergrund.

export const SORTEN_VORLAGEN = {
  karten: ["glas-karten", "glas-bubble", "glas-lichtkante", "glas-symbolkachel",
           "sync-bedienelemente", "glas-knoepfe", "regler-gluehen", "regler-schlank"],
  hintergrund: ["abschnitte-trennen"],
  oberflaeche: ["glas-seitenleiste", "glas-kopfleiste", "glas-kopfleiste-einstellungen",
                "glas-dialoge", "glas-more-info", "glas-badges", "glas-toast"],
  palette: [],
  schrift: [],
  rundung: [],
  dichte: [],
};

// Welche Felder einer Sorte lassen sich nach der Wahl noch von Hand drehen?
//
// Nur die, die wirklich etwas aendern, ohne das Teil zu zerreissen. Die
// Kartenflaeche steht NICHT dabei: Sie gehoert zum Stil, und wer sie einzeln
// dreht, bekommt Glas ohne Durchsicht oder eine deckende Flaeche mit
// backdrop-filter. Wer das will, geht in die acht Stufen.
export const SORTEN_FELDER = {
  karten: [
    { v: "--ha-card-border-radius", de: "Rundung", en: "Corner radius", art: "mass", min: 0, max: 40 },
    { v: "--ha-card-border-width", de: "Rahmenbreite", en: "Border width", art: "mass", min: 0, max: 4 },
  ],
  schrift: [
    { v: "--ha-font-size-scale", de: "Groesse", en: "Scale", art: "zahl", min: 0.8, max: 1.4, schritt: 0.05 },
    { v: "--ha-line-height-normal", de: "Zeilenhoehe", en: "Line height", art: "zahl", min: 1.2, max: 2, schritt: 0.1 },
  ],
  // Die Karte darf aus der Leiter ausscheren - sie ist die groesste Flaeche
  // und die einzige, bei der man es sofort sieht.
  rundung: [
    { v: "--ha-card-border-radius", de: "Karten", en: "Cards", art: "mass", min: 0, max: 40 },
  ],
  // Die vierte Stufe polstert den Karteninhalt (gemessen an ha-card), also
  // die Zahl, die man am ehesten drehen will.
  dichte: [
    { v: "--ha-space-4", de: "Kartenpolster", en: "Card padding", art: "mass", min: 0, max: 40 },
  ],
  palette: [], hintergrund: [], oberflaeche: [],
};

// Eine Sorte ohne eigene Teile: Sie traegt nur Vorlagen. Der Baukasten zeigt
// sie trotzdem, damit die Seitenleiste nicht im UIX-Dialog versteckt bleibt.
export const OBERFLAECHE_LEER = [];

export const BAUKASTEN = {
  palette: { de: "Farben", en: "Colours", teile: PALETTEN },
  schrift: { de: "Schrift", en: "Typeface", teile: SCHRIFTEN },
  rundung: { de: "Rundung", en: "Corners", teile: RUNDUNGEN,
             zweckDe: "Wie weich die Ecken sind - Knoepfe, Felder, Dialoge und Karten.",
             zweckEn: "How soft the corners are - buttons, fields, dialogs and cards." },
  dichte: { de: "Dichte", en: "Density", teile: DICHTEN,
            zweckDe: "Wie viel Luft zwischen den Dingen steht.",
            zweckEn: "How much air sits between things." },
  karten: { de: "Karten", en: "Cards", teile: KARTENSTILE },
  // gleich: Mit und ohne das Wort "fixed" ist es derselbe Hintergrund, nur
  // anders aufgehaengt. Ohne diesen Vergleich verloere eine Theme ihren Haken,
  // sobald jemand die Flaeche fest stellt oder wieder loest.
  hintergrund: { de: "Hintergrund", en: "Background", teile: HINTERGRUENDE, gleich: ohneFest },
  oberflaeche: { de: "Oberflaeche", en: "Chrome", teile: OBERFLAECHE_LEER,
                 nurVorlagen: true,
                 zweckDe: "Seitenleiste, Kopfleiste, Dialoge und Meldungen.",
                 zweckEn: "Sidebar, header, dialogs and toasts." },
};

// ---------------------------------------------------------------------------
// Ein Teil anwenden
//
// Die Funktion schreibt NICHT selbst ins Modell. Sie bekommt ein schreibe()
// vom Aufrufer und meldet zurueck, was sie gesetzt hat. Zwei Gruende: Der
// Baukasten bleibt dadurch frei von theme.js und laesst sich einzeln testen -
// und das Panel behaelt seine Buchfuehrung (ZUSTAND.geaendert), die es ohnehin
// fuehren muss.
//
//     schreibe(name, wert, ebene)    name MIT zwei Bindestrichen vorn,
//                                    ebene "beide" | "light" | "dark"

import { rampe, begleiter } from "./palette.js";

// Hat die Unterseite einer Sorte ueberhaupt etwas zu zeigen?
//
// Gemeldet am 14.10.2026: "die farbauswahl muss in das popup von
// Farben/Richtung der rest ist doppelt." Ein Klick auf eine Palette oeffnete
// eine Seite, auf der nur dieselbe Kachel noch einmal stand - die Sorte hat
// weder Vorlagen noch Felder. Gemessen:
//
//   palette      0 Vorlagen, 0 Felder   <- leer
//   schrift      0 Vorlagen, 2 Felder
//   karten       6 Vorlagen, 2 Felder
//   hintergrund  1 Vorlage,  0 Felder   (dazu Lage, Bewegung, Himmel)
//   oberflaeche  7 Vorlagen, 0 Felder
//
// Also nur die Farben. Die Wahl selbst steht in der Liste, und eine Seite, die
// nur wiederholt, worauf man gerade geklickt hat, ist ein Klick zu viel.
export function seiteHatInhalt(schluessel) {
  return (SORTEN_VORLAGEN[schluessel] || []).length > 0
      || (SORTEN_FELDER[schluessel] || []).length > 0;
}

export function teilAnwenden(sorte, teil, schreibe) {
  if (!teil || typeof schreibe !== "function") return { gesetzt: 0, felder: [] };
  const felder = [];
  const setz = (name, wert, ebene) => {
    schreibe(name.startsWith("--") ? name : "--" + name, wert, ebene);
    felder.push(name);
  };

  if (sorte === "palette") {
    // Je Rolle ELF Stufen, nicht eine. Home Assistant nimmt die kraeftige
    // Flaeche aus Stufe 40, die Ueberfahr-Stufe aus 30, die leise aus 95 - wer
    // nur einen Wert setzt, laesst die halbe Oberflaeche auf der alten Farbe
    // stehen.
    //
    // Und FLACH, nicht je Modus: Nur dort leitet Home Assistant in BEIDEN Modi
    // die RGB-Tripel ab, aus denen Mushroom seine Zustandsfarben baut. Eine
    // halb aufgeteilte Rampe waere in einem Modus unvollstaendig.
    for (const [rolle, hex] of Object.entries(teil.farben || {})) {
      const r = rampe(hex, rolle);
      if (r) for (const [k, v] of Object.entries(r)) setz(k, v, "beide");
    }
    // Die klassischen Begleiter haengen an der Primaerfarbe. --primary-color
    // selbst steht NICHT dabei: HA deklariert es als var(--ha-color-primary-40)
    // und folgt der Rampe von allein. Wer es schreibt, friert es ein.
    if (teil.farben?.primary) {
      const b = begleiter(teil.farben.primary);
      if (b) for (const [k, v] of Object.entries(b)) setz(k, v, "beide");
    }
    // Der Akzent ist die EINZIGE Farbe der Palette, die je Modus verschieden
    // ist - im Dunkeln eine Stufe heller, weil Blau und Violett die geringste
    // Wahrnehmungshelligkeit aller Farbtoene haben und derselbe Ton auf
    // dunklem Grund kaum noch zu sehen waere.
    if (teil.akzent) {
      setz("accent-color", teil.akzent.light, "light");
      setz("accent-color", teil.akzent.dark, "dark");
    }
    // KEIN return hier. Eine Palette darf zusaetzlich Felder tragen - die
    // Textfarben etwa, die je Modus verschieden sind und nicht aus der Rampe
    // folgen. Ein frueher Ausstieg hat sie am 13.10.2026 verschluckt: Der
    // Baukasten kam auf 418 von 424 Feldern, und die fehlenden drei waren
    // genau primary-text-color, secondary-text-color und divider-color.
    // Faellt nicht auf, weil die Grundlage dort HAs Werte stehen laesst - die
    // Schrift ist also lesbar, nur eben nicht die der Palette.
  }

  // Feldlisten je Ebene - bei jeder Sorte, auch bei der Palette.
  for (const [k, v] of Object.entries(teil.felder || {})) setz(k, v, "beide");
  for (const [k, v] of Object.entries(teil.flach || {})) setz(k, v, "beide");
  for (const [k, v] of Object.entries(teil.light || {})) setz(k, v, "light");
  for (const [k, v] of Object.entries(teil.dark || {})) setz(k, v, "dark");
  return { gesetzt: felder.length, felder };
}

// Welches Teil einer Sorte sitzt gerade im Modell?
//
// Nicht ueber einen gemerkten Namen, sondern ueber die WERTE - eine Theme, die
// jemand von Hand bearbeitet oder aus einer Datei geladen hat, traegt keinen
// Merker. Verglichen wird nur das, was das Teil wirklich setzt.
export function erkenneTeil(sorte, lies) {
  const teile = BAUKASTEN[sorte]?.teile || [];
  // Eine Sorte darf sagen, was fuer sie "derselbe Wert" ist.
  const glatt = BAUKASTEN[sorte]?.gleich || ((w) => w);

  const passtAuf = (teil, ausser) => {
    let passt = true;
    const pruefe = (name, soll, ebene) => {
      if (!passt) return;
      const v = name.startsWith("--") ? name : "--" + name;
      if (ausser.has(v)) return;
      const ist = lies(v, ebene);
      // Ein leerer Sollwert heisst "Feld nicht gesetzt" - beides zaehlt gleich.
      if (glatt(ist ?? "") !== glatt(soll ?? "")) passt = false;
    };
    if (sorte === "palette") {
      // Die Rampe hat 55 Stufen; der Akzent allein genuegt als Kennzeichen und
      // ist der einzige Wert, den zwei Paletten nicht teilen.
      pruefe("accent-color", teil.akzent?.light, "light");
      pruefe("accent-color", teil.akzent?.dark, "dark");
    } else {
      for (const [k, v] of Object.entries(teil.felder || {})) pruefe(k, v, "beide");
      for (const [k, v] of Object.entries(teil.flach || {})) pruefe(k, v, "beide");
      for (const [k, v] of Object.entries(teil.light || {})) pruefe(k, v, "light");
      for (const [k, v] of Object.entries(teil.dark || {})) pruefe(k, v, "dark");
    }
    return passt;
  };

  // Erster Durchgang: alles muss stimmen.
  for (const teil of teile) if (passtAuf(teil, new Set())) return teil.id;

  // Zweiter Durchgang, OHNE die Felder, die die Sorte selbst als Regler
  // anbietet.
  //
  // Am 14.10.2026 gemessen: Kartenstil "Glas" waehlen, dann den Regler
  // "Rundung" auf der Seite derselben Sorte um zwei Pixel drehen - und der
  // Haken war weg. Der Baukasten laedt zum Drehen ein und erklaert die Theme
  // danach fuer keinen bekannten Stil. Das ist auch die Voraussetzung dafuer,
  // dass Rundung und Kartenstil nebeneinander bestehen: Beide schreiben
  // --ha-card-border-radius, und beide sollen ihren Haken behalten.
  //
  // Nur EINDEUTIG. Bei der Schrift unterscheiden sich "Home Assistant" und
  // "Groesser" allein in --ha-font-size-scale - und genau das ist der Regler.
  // Ohne ihn passen beide, und dann weiss der Baukasten es eben nicht. Lieber
  // kein Haken als der falsche.
  const regler = new Set((SORTEN_FELDER[sorte] || []).map((f) => f.v));
  if (regler.size) {
    const treffer = teile.filter((t) => passtAuf(t, regler));
    if (treffer.length === 1) return treffer[0].id;
  }
  return null;
}

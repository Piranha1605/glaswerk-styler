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

export const PALETTEN = [
  {
    id: "ha",
    de: "Home Assistant", en: "Home Assistant",
    zweckDe: "HAs eigene Toene, unveraendert. Der Ausgangspunkt, wenn nichts auffallen soll.",
    zweckEn: "Home Assistant's own tones, unchanged. The starting point when nothing should stand out.",
    // Aus docs/beispiele/ha-blanko.yaml, also HAs Werte selbst.
    farben: { primary: "#37c8fd", neutral: "#989898", red: "#f3676c", green: "#00ac49", orange: "#f36d00" },
    akzent: { light: "#009ac7", dark: "#37c8fd" },
  },
  {
    id: "liquid",
    de: "Liquid Glass", en: "Liquid Glass",
    zweckDe: "Violetter Akzent auf kuehlem Neutral. Der Ton der Projektwerkbank.",
    zweckEn: "Violet accent on cool neutral. The tone of the project workbench.",
    // Am 13.10.2026 an der gerenderten Karte gemessen, nicht gerechnet:
    // #6350e4 kommt auf der hellen Glasflaeche auf 4.6:1 und erfuellt damit
    // WCAG AA. Das naheliegende #6f5cf0 verfehlt es mit 4.23:1.
    farben: { primary: "#8f7dff", neutral: "#989898", red: "#f3676c", green: "#00ac49", orange: "#f36d00" },
    akzent: { light: "#6350e4", dark: "#8f7dff" },
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
    id: "mono",
    de: "Monochrom", en: "Monochrome",
    zweckDe: "Nur Graustufen als Akzent. Die Farbe kommt dann allein aus den Geraeten.",
    zweckEn: "Greyscale accent only. Colour then comes from the devices alone.",
    // Bewusst KEIN graues Rot oder Gruen: Zustandsfarben muessen
    // unterscheidbar bleiben, sonst sieht eine Stoerung aus wie Normalbetrieb.
    farben: { primary: "#7a7a7a", neutral: "#989898", red: "#f3676c", green: "#00ac49", orange: "#f36d00" },
    akzent: { light: "#4a4a4a", dark: "#ccc" },
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
             "--ha-card-border-color": "" },
    light: { "--ha-card-background": "rgba(255, 255, 255, 0.42)",
             "--ha-card-box-shadow": "inset 0 1.5px 0 0 rgba(255, 255, 255, .72), " +
               "inset 0 -1.5px 0 0 rgba(10, 20, 45, .1), " +
               "0 18px 46px rgba(22, 40, 78, .16), 0 2px 6px rgba(22, 40, 78, .08)" },
    dark:  { "--ha-card-background": "rgba(22, 28, 46, 0.46)",
             "--ha-card-box-shadow": "inset 0 1.5px 0 0 rgba(255, 255, 255, .16), " +
               "inset 0 -1.5px 0 0 rgba(0, 0, 0, .35), " +
               "0 20px 52px rgba(0, 0, 0, .5), 0 2px 6px rgba(0, 0, 0, .3)" },
    braucht: { hintergrund: true },
  },
  {
    id: "flach",
    de: "Flach", en: "Flat",
    zweckDe: "Deckend, ohne Schatten, mit feiner Kante. Haelt auch vor einem einfarbigen Hintergrund.",
    zweckEn: "Opaque, no shadow, with a fine edge. Works in front of a plain background too.",
    // Die Kante kommt aus --divider-color, also derselben Farbe wie jede
    // andere Trennlinie in Home Assistant - je Modus gesetzt.
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "12px",
             "--ha-card-border-width": "1px", "--ha-card-border-color": "var(--divider-color)" },
    light: { "--ha-card-background": "#ffffff", "--ha-card-box-shadow": "none" },
    dark:  { "--ha-card-background": "#1c2234", "--ha-card-box-shadow": "none" },
  },
  {
    id: "erhaben",
    de: "Erhaben", en: "Raised",
    zweckDe: "Deckend, deutlich abgesetzt, ohne Rahmen. Die Karte liegt auf dem Hintergrund.",
    zweckEn: "Opaque, clearly lifted, no border. The card sits on top of the background.",
    // Die Schatten sind HAs eigene Stufe l - sie stehen ohnehin als Feld in
    // jeder Theme und sind damit auf HAs Oberflaeche abgestimmt.
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "16px",
             "--ha-card-border-width": "0", "--ha-card-border-color": "" },
    light: { "--ha-card-background": "#ffffff",
             "--ha-card-box-shadow": "0 6px 12px -3px #0000001f, 0 16px 32px -6px #0003" },
    dark:  { "--ha-card-background": "#1c2234",
             "--ha-card-box-shadow": "0 6px 12px -3px rgba(0, 0, 0, 0.4), 0 16px 32px -6px rgba(0, 0, 0, 0.55)" },
  },
  {
    id: "papier",
    de: "Papier", en: "Paper",
    zweckDe: "Deckend, kaum gerundet, nur ein Hauch Schatten. Ruhig und dicht.",
    zweckEn: "Opaque, barely rounded, just a hint of shadow. Calm and dense.",
    flach: { "--ha-card-backdrop-filter": "none", "--ha-card-border-radius": "4px",
             "--ha-card-border-width": "1px", "--ha-card-border-color": "var(--divider-color)" },
    light: { "--ha-card-background": "#ffffff",
             "--ha-card-box-shadow": "0 1px 2px 0 #00000014, 0 1px 3px 0 #0000001f" },
    dark:  { "--ha-card-background": "#1c2234",
             "--ha-card-box-shadow": "0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.5)" },
  },
];

// ---------------------------------------------------------------------------
// Hintergruende
//
// Gehoeren zum Kartenstil: Glas vor einer einfarbigen Wand sieht aus wie eine
// etwas hellere Wand. Wer "Glas" waehlt und keinen Hintergrund hat, bekommt
// nichts zu sehen - deshalb traegt der Stil oben ein braucht.hintergrund.
//
// --lovelace-background liest genau EIN Bauteil, hui-view-background, und das
// entsteht nur unter ha-panel-lovelace. Auf der Home-Seite und in den
// Einstellungen bleibt der Hintergrund also der von HA. Und: Ein Bild aus der
// DASHBOARD-Konfiguration liegt darueber - der Theme-Wert ist dann gesetzt,
// gelesen und trotzdem nicht zu sehen.

export const HINTERGRUENDE = [
  {
    id: "keiner",
    de: "Keiner", en: "None",
    zweckDe: "Home Assistants eigener Hintergrund.",
    zweckEn: "Home Assistant's own background.",
    light: { "--lovelace-background": "" }, dark: { "--lovelace-background": "" },
  },
  {
    id: "inseln",
    de: "Farbinseln", en: "Colour islands",
    zweckDe: "Vier weiche Farbflecke in den Ecken. Glas braucht etwas, das es bricht.",
    zweckEn: "Four soft colour patches in the corners. Glass needs something to refract.",
    light: { "--lovelace-background":
      "radial-gradient(900px 620px at 8% 4%, #7db5ff 0%, rgba(125,181,255,0) 55%), " +
      "radial-gradient(820px 560px at 92% 12%, #ff9ec7 0%, rgba(255,158,199,0) 52%), " +
      "radial-gradient(760px 700px at 72% 86%, #5ee0d0 0%, rgba(94,224,208,0) 54%), " +
      "radial-gradient(700px 520px at 22% 78%, #c08cff 0%, rgba(192,140,255,0) 52%), " +
      "linear-gradient(155deg, #e6eeff 0%, #f3ecff 50%, #e3fbf6 100%)" },
    dark: { "--lovelace-background":
      "radial-gradient(900px 620px at 8% 4%, #1f4d9e 0%, rgba(31,77,158,0) 55%), " +
      "radial-gradient(820px 560px at 92% 12%, #7a2a5c 0%, rgba(122,42,92,0) 52%), " +
      "radial-gradient(760px 700px at 72% 86%, #0d6b63 0%, rgba(13,107,99,0) 54%), " +
      "radial-gradient(700px 520px at 22% 78%, #4b2a86 0%, rgba(75,42,134,0) 52%), " +
      "linear-gradient(155deg, #0b1020 0%, #140d26 50%, #07201f 100%)" },
  },
  {
    id: "verlauf",
    de: "Ruhiger Verlauf", en: "Quiet gradient",
    zweckDe: "Ein schraeger Verlauf, zwei Toene. Genug fuer Glas, ruhiger als die Inseln.",
    zweckEn: "One diagonal gradient, two tones. Enough for glass, calmer than the islands.",
    light: { "--lovelace-background": "linear-gradient(155deg, #e9eef7 0%, #f4f1f8 55%, #eaf4f2 100%)" },
    dark:  { "--lovelace-background": "linear-gradient(155deg, #0e1220 0%, #151225 55%, #0c1d1f 100%)" },
  },
];

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

export const KARTENSTIL_FELDER = KARTENFELDER;

export const BAUKASTEN = {
  palette: { de: "Farben", en: "Colours", teile: PALETTEN },
  schrift: { de: "Schrift", en: "Typeface", teile: SCHRIFTEN },
  karten: { de: "Karten", en: "Cards", teile: KARTENSTILE },
  hintergrund: { de: "Hintergrund", en: "Background", teile: HINTERGRUENDE },
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
    return { gesetzt: felder.length, felder };
  }

  // Alle uebrigen Sorten sind reine Feldlisten, je Ebene.
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
  for (const teil of teile) {
    let passt = true;
    const pruefe = (name, soll, ebene) => {
      if (!passt) return;
      const ist = lies(name.startsWith("--") ? name : "--" + name, ebene);
      // Ein leerer Sollwert heisst "Feld nicht gesetzt" - beides zaehlt gleich.
      if ((ist ?? "") !== (soll ?? "")) passt = false;
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
    if (passt) return teil.id;
  }
  return null;
}

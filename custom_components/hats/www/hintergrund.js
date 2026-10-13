// Der Hintergrund: fest oder mitlaufend, bewegt, im Farbwechsel, nach dem Himmel.
//
// Alles hier ist am 13.10.2026 an der Testmaschine gemessen (HA 2026.10.1,
// UIX 8.4.0). Die Herleitung steht in CLAUDE.md, Abschnitt "Der Hintergrund";
// hier steht nur, was man wissen muss, um die Datei zu aendern.
//
// Wer malt: hui-view-background. Es liegt unter hui-view-container im Shadow
// Root von hui-root, ist also ueber das Stilziel uix-root erreichbar. hui-root
// gibt es unter ha-panel-lovelace UND unter ha-panel-home - auf den
// Einstellungsseiten nicht.
//
// Drei Dinge gehen ueber ein gewoehnliches Theme-Feld gar nicht und brauchen
// deshalb UIX:
//   Bewegung     ein Feld traegt einen Wert, keine Regel - @keyframes passt
//                nicht hinein
//   Farbwechsel  dasselbe
//   Himmel       eine Theme-Datei ist statisch; UIX rechnet Jinja-Vorlagen in
//                seinen Stilzielen ueber render_template aus
//
// Die Theme bleibt ohne alle drei vollstaendig: --lovelace-background steht als
// gewoehnliches Feld da, und ohne UIX sieht man genau das.
//
// Die Funktionen hier liefern Vorlagen in derselben Form wie vorlagen.js -
// { id, ziel, css, ... } -, damit vorlageAn() und vorlageAus() aus theme.js sie
// ohne Sonderweg schalten. Der Unterschied: Diese Vorlagen haben Stellgroessen,
// und die werden aus dem CSS im Theme zurueckgelesen. Ein eigenes Feld dafuer
// gaebe es nur als Hilfsfeld, und das schreibt HATS nicht.

export const HINTERGRUND_ZIEL = "root";
export const HINTERGRUND_GRUPPE = "hintergrund";

// ---------------------------------------------------------------------------
// Fest oder mitlaufend
//
// hui-view-background haengt von sich aus absolut und ist so hoch wie der
// ganze Seiteninhalt. Gemessen auf /hats-test/alles: 757 x 1774 px bei einem
// Fenster von 768 px Hoehe - von vier Farbinseln lagen zwei unter dem ersten
// Bildschirm (Mittelpunkte bei 1383 und 1525 px).
//
// Fest wird es durch EIN Wort im Wert von --lovelace-background. Home Assistant
// prueft das so, aus dem Buendel von 2026.10.1:
//
//   _isFixedBackground(e) { return "string" == typeof e
//     ? e.split(" ").includes("fixed") : ... }
//
// Getrennt wird am Leerzeichen, an nichts sonst. "fixed," mit Komma dahinter
// zaehlt nicht, ein Zeilenumbruch davor auch nicht. Dann steht das Bauteil
// auf position: fixed, deckt das ganze Fenster (auch unter der Seitenleiste)
// und bekommt background-attachment: scroll !important.

// Was Home Assistant aus dem Wert macht. Bewusst dieselbe Regel, nicht eine
// kluegere: Die Funktion soll HAs Verhalten vorhersagen, nicht verbessern.
export function istFest(wert) {
  if (typeof wert !== "string") return false;
  for (const teil of wert.split(" ")) if (teil === "fixed") return true;
  return false;
}

// Steht "fixed" im Wert, ohne dass Home Assistant es erkennt? Dann ist die
// Ebene nach CSS fest, das Bauteil aber nicht - der Hintergrund steht still,
// waehrend seine Flaeche weiter mitlaeuft. Adressen werden ausgenommen: ein
// Bild darf "fixed" im Namen tragen.
export function festUnerkannt(wert) {
  if (typeof wert !== "string" || istFest(wert)) return false;
  const ohneAdressen = wert.replace(/url\([^)]*\)/g, "url()");
  return /(^|[\s,])fixed($|[\s,])/.test(ohneAdressen);
}

// Das Wort setzen oder nehmen. Gesetzt wird es ans Ende - dort gehoert es zur
// letzten Ebene, und dahinter steht kein Komma, das die Erkennung verhindert.
// Zweimal dasselbe verlangt aendert nichts.
//
// Adressen bleiben woertlich stehen. Ein Bild mit Leerzeichen und "fixed" im
// Namen wuerde sonst zerlegt und sein Name gekuerzt - und zwar still.
export function stelleFest(wert, an) {
  if (typeof wert !== "string") return wert;
  const glatt = wert.trim();
  if (!glatt) return glatt;
  const adressen = [];
  const geschuetzt = glatt.replace(/url\([^)]*\)/g, (a) => {
    adressen.push(a);
    return `url(${adressen.length - 1})`;
  });
  const ohne = geschuetzt.split(" ").filter((t) => t !== "" && t !== "fixed").join(" ")
    .replace(/url\((\d+)\)/g, (_, i) => adressen[Number(i)]);
  return an ? `${ohne} fixed` : ohne;
}

// ---------------------------------------------------------------------------
// Bewegung und Farbwechsel
//
// Beide stehen in EINEM Block, weil beide dasselbe Bauteil animieren: Zwei
// Bloecke mit je einem "animation:" auf hui-view-background wuerden einander
// ueberschreiben, und es liefe nur der letzte.
//
// Bewegt wird nur mit transform, gefaerbt nur mit filter - beides rechnet die
// Grafikkarte, ohne dass die Flaeche neu gemalt wird. @property, mit dem sich
// die Farben eines Verlaufs selbst ueberblenden liessen, geht nicht: In einem
// Shadow Root wird die Regel nicht registriert (gemessen - im Dokument ja, im
// Shadow Root von hui-root nein), und jedes Stilziel liegt in einem.
//
// Die Flaeche wird fuer die Bewegung fest gestellt und rundum 14 % groesser
// gemacht, damit beim Verschieben kein Rand ins Bild laeuft. Die Zahl und die
// Wegpunkte stammen aus HATG, dort seit dem 16.09.2026 im Betrieb.

export const BEWEGUNG_ID = "hintergrund-bewegung";
export const BEWEGUNG_STUFEN = 10;
export const BEWEGUNG_VORGABE = { drift: 4, farbe: 0, weite: 40 };

const DRIFT_NAME = "hats-hintergrund-drift";
const FARBE_NAME = "hats-hintergrund-farbe";

function stufe(wert, vorgabe) {
  const z = Math.round(Number(wert));
  if (!Number.isFinite(z)) return vorgabe;
  return Math.min(BEWEGUNG_STUFEN, Math.max(0, z));
}

// Der Ausschlag des Farbwechsels in Grad. 360 heisst: einmal ganz herum und
// weiter, statt hin und zurueck.
function grad(wert) {
  const z = Math.round(Number(wert));
  if (!Number.isFinite(z)) return BEWEGUNG_VORGABE.weite;
  if (z >= 360) return 360;
  return Math.min(180, Math.max(5, z));
}

// Stufe 1 ist die langsamste. Die Bewegung braucht dann eine Minute fuer einen
// Weg, der Farbwechsel fuenf - er soll auffallen, wenn man hinsieht, nicht
// waehrenddessen.
export function driftDauer(st) {
  const s = stufe(st, BEWEGUNG_VORGABE.drift);
  return s ? Math.round(60 / s) : 0;
}
export function farbDauer(st) {
  const s = stufe(st, 0);
  return s ? Math.round(300 / s) : 0;
}

export function bewegung(einstellung = {}) {
  const drift = stufe(einstellung.drift, BEWEGUNG_VORGABE.drift);
  const farbe = stufe(einstellung.farbe, BEWEGUNG_VORGABE.farbe);
  const weite = grad(einstellung.weite);
  if (!drift && !farbe) return null;

  const laeufe = [];
  if (drift) laeufe.push(`${DRIFT_NAME} ${driftDauer(drift)}s ease-in-out infinite alternate`);
  if (farbe) {
    laeufe.push(weite === 360
      ? `${FARBE_NAME} ${farbDauer(farbe)}s linear infinite`
      : `${FARBE_NAME} ${farbDauer(farbe)}s ease-in-out infinite alternate`);
  }
  const wandel = [drift ? "transform" : "", farbe ? "filter" : ""].filter(Boolean).join(", ");

  const teile = [];
  teile.push(`/* Der Hintergrund selbst wird bewegt, nicht sein Bild: transform und filter
   rechnet die Grafikkarte, background-position und Farbwerte muessten in
   jedem Bild neu gemalt werden - unter Glas mit jeder Karte darueber. */
hui-view-background {${drift ? `
  /* Fest am Fenster und rundum 14 % groesser, damit beim Verschieben kein
     Rand ins Bild laeuft. Home Assistant deckelt die Breite sonst auf 100 %. */
  position: fixed !important;
  inset: -14% !important;
  width: 128% !important;
  height: 128% !important;
  max-width: none !important;
  max-height: none !important;` : ""}
  animation: ${laeufe.join(", ")};
  will-change: ${wandel};
}`);
  if (drift) {
    teile.push(`@keyframes ${DRIFT_NAME} {
  0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
  33% { transform: translate3d(-7%, 4%, 0) scale(1.08) rotate(-3deg); }
  66% { transform: translate3d(6%, -4%, 0) scale(1.04) rotate(2deg); }
  100% { transform: translate3d(-3%, 7%, 0) scale(1.12) rotate(-1.5deg); }
}`);
  }
  if (farbe) {
    teile.push(weite === 360
      ? `@keyframes ${FARBE_NAME} {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
}`
      : `@keyframes ${FARBE_NAME} {
  from { filter: hue-rotate(-${weite / 2}deg); }
  to { filter: hue-rotate(${weite / 2}deg); }
}`);
  }
  teile.push(`/* Wer am Geraet "Bewegung reduzieren" eingestellt hat, bekommt keine. */
@media (prefers-reduced-motion: reduce) {
  hui-view-background { animation: none !important; }
}`);

  return {
    id: BEWEGUNG_ID,
    gruppe: HINTERGRUND_GRUPPE,
    ziel: HINTERGRUND_ZIEL,
    de: "Bewegter Hintergrund",
    en: "Moving background",
    zweckDe: "Der Hintergrund treibt langsam und kann dabei seine Farbe wechseln. Wirkt auf Dashboards und auf der Home-Seite.",
    zweckEn: "The background drifts slowly and can shift its colour while doing so. Applies to dashboards and the home page.",
    einstellung: { drift, farbe, weite },
    css: teile.join("\n"),
  };
}

// Der Block einer Vorlage aus dem Text eines Stilziels, ohne die Marker. Die
// Vorsilbe ist frei - eine umbenannte Kopie traegt eine fremde.
function leseBlock(text, id) {
  if (typeof text !== "string") return null;
  const re = new RegExp(`/\\* [A-Z][A-Z0-9]{2,15}:${id}:START \\*/([\\s\\S]*?)/\\* [A-Z][A-Z0-9]{2,15}:${id}:ENDE \\*/`, "g");
  let letzter = null, t;
  while ((t = re.exec(text))) letzter = t[1];
  return letzter;
}

// Die Stellgroessen aus dem Theme zuruecklesen. null heisst: aus.
export function leseBewegung(text) {
  const block = leseBlock(text, BEWEGUNG_ID);
  if (block === null) return null;
  const d = new RegExp(`${DRIFT_NAME}\\s+([\\d.]+)s`).exec(block);
  const f = new RegExp(`${FARBE_NAME}\\s+([\\d.]+)s`).exec(block);
  const w = /hue-rotate\((-?[\d.]+)deg\)\s*;?\s*}\s*to\s*{\s*filter:\s*hue-rotate\((-?[\d.]+)deg\)/.exec(block);
  const ausDauer = (dauer, basis) => {
    const z = Number(dauer);
    if (!Number.isFinite(z) || z <= 0) return 0;
    return Math.min(BEWEGUNG_STUFEN, Math.max(1, Math.round(basis / z)));
  };
  return {
    drift: d ? ausDauer(d[1], 60) : 0,
    farbe: f ? ausDauer(f[1], 300) : 0,
    weite: w ? grad(Math.abs(Number(w[2]) - Number(w[1]))) : BEWEGUNG_VORGABE.weite,
  };
}

// ---------------------------------------------------------------------------
// Der Himmel
//
// Ein Schleier ueber dem Hintergrund, der Wetter und Tageszeit folgt. Die fuenf
// Lagen und ihre Anteile stammen aus der Wetterkachel der Horizon-Cards
// (ha-karten/docs/himmel-verlauf.md, Stand 21.09.2026). Die Farben kommen aus
// der Theme - eine andere Theme faerbt den Himmel mit.
//
// Der Schleier liegt in zwei Scheinelementen von hui-view-background, jedes
// mit EINER Farbe und einer festen Maske. Ein Verlauf mit zwei Farben waere
// kuerzer, aber ein Verlauf blendet nicht ueber: Beim Wetterwechsel spraenge
// das Bild. background-color blendet von selbst, und die Maske aendert sich
// nie.
//
// DIE FALLE, UND SIE IST TEUER: Sobald in einem Stilziel EINE Vorlage steht,
// schickt UIX das GANZE Feld durch Jinja. Ein Fehler darin - ein Tippfehler,
// ein unbekannter Filter - leert das Feld vollstaendig, auch die Bloecke, die
// gar keine Vorlage sind. Gemessen: "--davor: 1" und "--danach: 2" rund um
// eine kaputte Zeile kamen beide nicht an. Im Stilziel root liegt auch die
// Kopfleiste der Glas-Vorlagen.
//
// Deshalb benutzt die Vorlage nur states(), is_state() und "in" - nichts, was
// bei einer fehlenden Entitaet einen Fehler wirft. Eine unbekannte Entitaet
// liefert "unknown" und damit die Lage "ohne": kein Schleier.
//
// Und deshalb gibt es vertraegtVorlage() weiter unten.

export const HIMMEL_ID = "hintergrund-himmel";

// Zustaende der Wetter-Entitaet, wie Home Assistant sie nennt.
export const HIMMEL_NASS = ["rainy", "pouring", "lightning", "lightning-rainy", "hail", "snowy", "snowy-rainy"];
export const HIMMEL_WOLKEN = ["cloudy", "partlycloudy", "fog", "windy", "windy-variant", "exceptional"];
export const HIMMEL_OHNE = ["unknown", "unavailable", "none", ""];

export const HIMMEL_STUFEN = 10;
export const HIMMEL_VORGABE = { staerke: 6 };

const REGEN = "var(--info-color, var(--primary-color, #03a9f4))";
const SONNE = "var(--warning-color, #ffb300)";
const LEISE = "var(--secondary-text-color, #727272)";
// Das Nachtblau der Wetterkachel ist das Blau der Theme, in ein festes
// Dunkelblau gezogen - und ueber dem Nachthimmel stellt die Kachel ihre
// Schrift auf Weiss. Ein Hintergrund kann das nicht: Er liegt unter JEDER
// Karte. Im Hellmodus laege ein dunkler Himmel unter hellem Glas mit dunkler
// Schrift. Deshalb zieht das Nachtblau hier in den Grundton der Theme, und
// der ist je Modus ein anderer.
const NACHT = `color-mix(in srgb, ${REGEN} 40%, var(--primary-background-color, #0b1733))`;
// Die Anteile der Wetterkachel bei voller Staerke. Sie sind fuer 119 px Kachel
// gemacht; ueber einen ganzen Bildschirm ist das viel, deshalb die Stellgroesse.
const ANTEILE = {
  sonnig: [[REGEN, 55], [SONNE, 30]],
  bewoelkt: [[REGEN, 30], [LEISE, 26]],
  nass: [[LEISE, 48], [REGEN, 30]],
  nacht: [[NACHT, 62], [REGEN, 28]],
  klar: [[NACHT, 72], [REGEN, 34]],
};

function staerkeStufe(wert) {
  const z = Math.round(Number(wert));
  if (!Number.isFinite(z)) return HIMMEL_VORGABE.staerke;
  return Math.min(HIMMEL_STUFEN, Math.max(1, z));
}

// Lage -> [oben, unten]. "ohne" ist durchsichtig, nicht weggelassen: Die
// Vorlage schlaegt darin nach, und ein fehlender Schluessel waere leer.
export function himmelLagen(staerke = HIMMEL_VORGABE.staerke) {
  const s = staerkeStufe(staerke);
  const anteil = ([farbe, prozent]) => `color-mix(in srgb, ${farbe} ${Math.round(prozent * s / HIMMEL_STUFEN)}%, transparent)`;
  const lagen = {};
  for (const [lage, [oben, unten]] of Object.entries(ANTEILE)) lagen[lage] = [anteil(oben), anteil(unten)];
  lagen.ohne = ["transparent", "transparent"];
  return lagen;
}
export const HIMMEL_LAGEN = Object.keys(himmelLagen());

// Eine Entitaets-ID, wie Home Assistant sie zulaesst. Alles andere kaeme
// ungeprueft in eine Vorlage, die der Server ausfuehrt.
export function istWetterEntitaet(id) {
  return typeof id === "string" && /^weather\.[a-z0-9_]+$/.test(id);
}

const jinjaListe = (liste) => "[" + liste.map((z) => `'${z}'`).join(", ") + "]";
const jinjaLagen = (lagen, stelle) => "{" + Object.entries(lagen)
  .map(([lage, farben]) => `'${lage}': '${farben[stelle]}'`).join(", ") + "}";

// Nur der Teil, der die Lage bestimmt - getrennt, damit sich genau er an der
// Instanz pruefen laesst, mit jedem Wetter und zu jeder Tageszeit.
export function himmelLageVorlage(wetter) {
  return `{%- set w = states('${wetter}') -%}
{%- set dunkel = is_state('sun.sun', 'below_horizon') -%}
{%- if w in ${jinjaListe(HIMMEL_OHNE)} -%}{%- set lage = 'ohne' -%}
{%- elif w in ${jinjaListe(HIMMEL_NASS)} -%}{%- set lage = 'nass' -%}
{%- elif w in ${jinjaListe(HIMMEL_WOLKEN)} -%}{%- set lage = 'nacht' if dunkel else 'bewoelkt' -%}
{%- elif dunkel or w == 'clear-night' -%}{%- set lage = 'klar' -%}
{%- else -%}{%- set lage = 'sonnig' -%}
{%- endif -%}`;
}

export function himmel(einstellung = {}) {
  const wetter = einstellung.wetter;
  if (!istWetterEntitaet(wetter)) return null;
  const staerke = staerkeStufe(einstellung.staerke);
  const lagen = himmelLagen(staerke);
  const css = `/* Der Himmel: ein Schleier ueber dem Hintergrund, nach Wetter und Tageszeit.
   Die Zeilen in geschweiften Klammern rechnet Home Assistant aus, nicht der
   Browser. Ein Tippfehler darin leert das ganze Stilziel. */
${himmelLageVorlage(wetter)}
{%- set oben = ${jinjaLagen(lagen, 0)} -%}
{%- set unten = ${jinjaLagen(lagen, 1)} %}
hui-view-background::before,
hui-view-background::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Die Farbe blendet beim Wetterwechsel ueber, die Maske bleibt stehen. */
  transition: background-color 4s ease;
}
hui-view-background::before {
  background-color: {{ oben[lage] }};
  -webkit-mask-image: linear-gradient(170deg, #000, transparent);
  mask-image: linear-gradient(170deg, #000, transparent);
}
hui-view-background::after {
  background-color: {{ unten[lage] }};
  -webkit-mask-image: linear-gradient(170deg, transparent, #000);
  mask-image: linear-gradient(170deg, transparent, #000);
}
@media (prefers-reduced-motion: reduce) {
  hui-view-background::before,
  hui-view-background::after { transition: none; }
}`;
  return {
    id: HIMMEL_ID,
    gruppe: HINTERGRUND_GRUPPE,
    ziel: HINTERGRUND_ZIEL,
    de: "Himmel nach Wetter",
    en: "Sky by weather",
    zweckDe: "Ein Farbschleier ueber dem Hintergrund, der der Wetter-Entitaet und dem Sonnenstand folgt. Die Farben kommen aus der Theme.",
    zweckEn: "A colour veil over the background that follows the weather entity and the sun. The colours come from the theme.",
    einstellung: { wetter, staerke },
    css,
  };
}

export function leseHimmel(text) {
  const block = leseBlock(text, HIMMEL_ID);
  if (block === null) return null;
  const t = /states\('(weather\.[a-z0-9_]+)'\)/.exec(block);
  // Die Staerke steht nirgends als Zahl - sie steckt im Anteil der ersten
  // Lage. Voll sind es 55 %, jede Stufe ein Zehntel davon.
  const p = /'sonnig': '[^']*?\s(\d+)%, transparent\)'/.exec(block);
  return {
    wetter: t ? t[1] : "",
    staerke: p ? staerkeStufe(Number(p[1]) / (ANTEILE.sonnig[0][1] / HIMMEL_STUFEN)) : HIMMEL_VORGABE.staerke,
  };
}

// Welche Lage bei welchem Wetter herauskommt - dieselbe Zuordnung noch einmal
// in JavaScript, fuer die Vorschau im Panel. Sie ist NICHT das, was laeuft;
// was laeuft, rechnet Home Assistant. Der Test vergleicht beide an der
// Instanz, sonst liefen sie auseinander, ohne dass es jemand merkt.
export function himmelLage(wetter, dunkel) {
  const w = String(wetter ?? "");
  if (HIMMEL_OHNE.includes(w)) return "ohne";
  if (HIMMEL_NASS.includes(w)) return "nass";
  if (HIMMEL_WOLKEN.includes(w)) return dunkel ? "nacht" : "bewoelkt";
  if (dunkel || w === "clear-night") return "klar";
  return "sonnig";
}

// ---------------------------------------------------------------------------
// Vertraegt das Feld eine Vorlage?
//
// Steht eine Jinja-Vorlage in einem Stilziel, liest Jinja das ganze Feld - auch
// das CSS, das schon dort stand. Drei Zeichenfolgen haben dann eine Bedeutung,
// die sie in CSS nicht haben:
//
//   {#   Beginn eines Kommentars. In CSS harmlos und gar nicht selten:
//        "@media (...) {#view { ... }}". Gemessen: Mit einer Vorlage im selben
//        Feld kam von diesem CSS nichts mehr an, ohne Vorlage alles.
//   {{   Beginn eines Ausdrucks
//   {%   Beginn einer Anweisung
//
// Geprueft wird der Text OHNE den eigenen Block. Ein Treffer heisst: nicht
// einschalten, sondern dem Nutzer die Stelle zeigen.
export function vertraegtVorlage(text) {
  if (typeof text !== "string" || !text) return [];
  const re = new RegExp(`/\\* [A-Z][A-Z0-9]{2,15}:${HIMMEL_ID}:START \\*/[\\s\\S]*?/\\* [A-Z][A-Z0-9]{2,15}:${HIMMEL_ID}:ENDE \\*/`, "g");
  const rest = text.replace(re, "");
  const funde = [];
  const zeilen = rest.split("\n");
  zeilen.forEach((zeile, i) => {
    for (const zeichen of ["{#", "{{", "{%"]) {
      if (zeile.includes(zeichen)) funde.push({ zeile: i + 1, zeichen, text: zeile.trim().slice(0, 80) });
    }
  });
  return funde;
}

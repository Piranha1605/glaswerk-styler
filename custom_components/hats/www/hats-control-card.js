// HATS - die Steuerleiste: als Karte und als Badge
//
// Eine Reihe von Knoepfen. Jeder ist eins von vier Dingen:
//
//   ein Ziel        link: /dashboard/ansicht      die Kapsel zeigt, wo du bist
//   ein Schalter    entity: light.kueche          leuchtet, solange sie an ist
//   eine Funktion   function: mode | theme | fullscreen | weather
//   eine Aktion     tap_action: ...               alles, was Home Assistant kennt
//
//     type: custom:hats-control-card      als Karte
//     type: custom:hats-control-badge     als Badge, in der Reihe ueber den Karten
//
// DAS BADGE BLEIBT, WIE ES WAR: Modus und Vollbild in klein, eingestellt ueber
// die Kurzform `controls`. Ziele, Schalter und Wetter sind eine Erweiterung
// der KARTE. Ansage vom 13.10.2026: "erst einmal nur uebernehmen und als
// erweiterung zu unserer sehen. die badgets bleiben wie sie sind."
//
// ZUSAMMENGEFUEGT am 13.10.2026 aus zwei Dingen: der Steuerkarte (Modus und
// Vollbild) und der Menueleiste der Horizon-Cards (Ziele, Kapsel, Schalter,
// Wetter, Einklappen). Die Felder der Menueleiste gelten hier unveraendert -
// eine Leiste von dort laesst sich mit anderem `type` uebernehmen. Die
// Kurzform der Steuerkarte gilt weiter: `controls: [mode, fullscreen]`.
//
// Beide Formen stehen in DIESER Datei, obwohl sie nach der Karte heisst: HATS
// meldet genau eine Datei als Ressource an (karte.py), und zwei Formen
// derselben Sache sollen nicht auseinanderlaufen koennen. Was sie
// unterscheidet, sind der Rahmen und ein Stilblatt.
//
// DIE REGEL DIESER DATEI: ALLES, WAS SIE BENUTZT, STELLT HOME ASSISTANT.
// Keine Bibliothek, keine fremde Karte, kein eigenes Symbol, keine eigene
// Farbe. Im Einzelnen, am 13.10.2026 an HA 2026.10.1 gemessen:
//
//   Bauteile   ha-card, ha-badge, ha-icon (mdi), ha-state-icon, ha-ripple
//   Farben     --primary-color, --disabled-color, --primary-text-color ...
//              dieselben Namen, die ha-control-select und ha-control-button
//              lesen - aus deren elementStyles abgeschrieben, nicht geraten
//   Aktionen   das Ereignis "hass-action": Home Assistant fuehrt tap_action
//              selbst aus, samt Navigation, Umschalten und Rueckfrage
//   Modus      das Ereignis "settheme", dasselbe wie die Zeile im Profil
//   Vollbild   das Ereignis "hass-kiosk-mode" auf window
//   Meldung    das Ereignis "hass-notification" (HAs eigener Toast)
//   Zahlen     hass.formatEntityState und hass.formatEntityAttributeValue
//   Wetter     ha-state-icon - Home Assistant waehlt das Symbol zur Wetterlage
//   Editor     getConfigForm - Home Assistant zeichnet das Formular selbst
//
// Warum nicht ha-control-select selbst, wo es doch genau so aussieht: Ein
// nicht angemeldetes Element zeichnet nichts, ohne Meldung - und ob Home
// Assistant dieses Bauteil auf JEDEM Dashboard anmeldet, liess sich nicht
// klaeren. An der Testinstanz war es auch auf einer Ansicht ohne Kachel da,
// aber dort laden Mushroom und Bubble mit, und wer von den dreien es
// angemeldet hat, ist von aussen nicht zu sehen. ha-card und ha-icon braucht
// dagegen jedes Dashboard selbst. Die Leiste zeichnet ihre Knoepfe deshalb aus
// button-Elementen und liest nur dieselben Variablen.
//
// ZWEI AUSNAHMEN von der Regel, beide beim Vollbild:
//
//   Das Vollbild des BROWSERS (requestFullscreen). Home Assistant hat kein
//   eigenes: Sein Kiosk-Modus blendet die Seitenleiste und die Knoepfe der
//   Kopfzeile aus, das Fenster bleibt, wie es ist. Mit kiosk_only: true
//   bleibt es dabei.
//
//   Die KOPFZEILE. Auch sie laesst der Kiosk-Modus stehen, und dafuer hat
//   Home Assistant keinen Schalter. Die Menueleiste nahm sie mit einem
//   eingefuegten Stilblatt weg; das ist mit ihr hierher gekommen. Es wird
//   nichts entfernt, und beim Zurueckschalten bleibt nichts liegen.

const KARTE = "hats-control-card";
const BADGE = "hats-control-badge";

// Die Kurzform der Steuerkarte. Ihre Reihenfolge ist die Vorgabe.
export const BEDIENTEILE = ["mode", "fullscreen"];

// Was ein Knopf im Browser tut statt in Home Assistant. Ein solcher Knopf hat
// weder Ziel noch Schalter.
export const FUNKTIONEN = ["mode", "theme", "fullscreen", "weather"];
export const GROESSEN = ["small", "normal", "large"];
export const FORMEN = ["theme", "pill"];
export const EINKLAPPEN = ["never", "narrow", "always"];

// Unter dieser KARTENBREITE wandern die Ziele in eine Liste. Gemessen wird die
// Karte, nicht das Fenster: Eine Leiste in einer von zwei Spalten ist auf dem
// Schreibtisch genauso eng wie auf dem Telefon.
export const EINKLAPPBREITE = 500;

const TEXTE = {
  de: {
    name: "HATS Steuerkarte",
    nameBadge: "HATS Steuerung",
    beschreibung: "Menue und Steuerung: Ziele, Schalter, Modus, Vollbild, Wetter.",
    modus: "Modus",
    auto: "Automatisch - folgt dem Gerät",
    light: "Hell",
    dark: "Dunkel",
    hellDunkel: "Hell / Dunkel",
    vollbild: "Vollbild",
    vollbildAus: "Vollbild beenden",
    menue: "Menü",
    knopf: (n) => `Knopf ${n}`,
    fest: (theme, modus) =>
      `Die Theme „${theme}“ bringt nur den ${modus === "dark" ? "dunklen" : "hellen"} Modus mit.`,
    leer: "Kein Knopf eingerichtet.",
    feld: {
      buttons: "Knöpfe", controls: "Bedienteile", kiosk_only: "Vollbild nur in Home Assistant",
      menu_shape: "Form", menu_size: "Größe", collapse: "Ziele einklappen",
      collapse_width: "Einklappen unter dieser Kartenbreite", show_highlight: "Kapsel auf der aktuellen Ansicht",
    },
    hilfe: {
      buttons: "Ein Ziel, ein Schalter oder eine Funktion - in dieser Reihenfolge.",
      controls: "Angezeigt in dieser Reihenfolge.",
      kiosk_only: "Blendet nur Seitenleiste und Kopfzeile aus. Das Browserfenster bleibt, wie es ist.",
      collapse_width: "Gemessen wird die Karte, nicht das Fenster.",
    },
    knopffeld: {
      name: "Name", icon: "Symbol", link: "Ziel", entity: "Entität",
      function: "Eingebaute Funktion", temperature: "Temperatursensor (nur Wetter)",
      align_end: "Ans Ende der Leiste", separator_before: "Trennstrich davor",
    },
    funktion: { mode: "Modus (drei Knöpfe)", theme: "Hell / Dunkel", fullscreen: "Vollbild", weather: "Wetter" },
    teil: { mode: "Modus", fullscreen: "Vollbild" },
    nurKurzform: "Das Badge kennt nur `controls` - Ziele und Schalter gehören in die Karte.",
    wahl: {
      theme: "Rundung der Theme", pill: "ganz rund",
      small: "klein", normal: "normal", large: "groß",
      never: "nie", narrow: "wenn es eng wird", always: "immer",
    },
  },
  en: {
    name: "HATS control card",
    nameBadge: "HATS control",
    beschreibung: "Menu and controls: targets, switches, mode, fullscreen, weather.",
    modus: "Mode",
    auto: "Auto - follows the device",
    light: "Light",
    dark: "Dark",
    hellDunkel: "Light / dark",
    vollbild: "Fullscreen",
    vollbildAus: "Exit fullscreen",
    menue: "Menu",
    knopf: (n) => `Button ${n}`,
    fest: (theme, modus) =>
      `The theme "${theme}" only has a ${modus === "dark" ? "dark" : "light"} mode.`,
    leer: "No button set up.",
    feld: {
      buttons: "Buttons", controls: "Controls", kiosk_only: "Fullscreen in Home Assistant only",
      menu_shape: "Shape", menu_size: "Size", collapse: "Collapse targets",
      collapse_width: "Collapse below this card width", show_highlight: "Pill on the current view",
    },
    hilfe: {
      buttons: "A target, a switch or a function - in this order.",
      controls: "Shown in this order.",
      kiosk_only: "Only hides the sidebar and the header. The browser window stays as it is.",
      collapse_width: "The card is measured, not the window.",
    },
    knopffeld: {
      name: "Name", icon: "Icon", link: "Target", entity: "Entity",
      function: "Built-in function", temperature: "Temperature sensor (weather only)",
      align_end: "At the end of the bar", separator_before: "Separator before",
    },
    funktion: { mode: "Mode (three buttons)", theme: "Light / dark", fullscreen: "Fullscreen", weather: "Weather" },
    teil: { mode: "Mode", fullscreen: "Fullscreen" },
    nurKurzform: "The badge only takes `controls` - targets and switches belong in the card.",
    wahl: {
      theme: "theme radius", pill: "fully round",
      small: "small", normal: "normal", large: "large",
      never: "never", narrow: "when it gets narrow", always: "always",
    },
  },
};

const SYMBOL = {
  auto: "mdi:theme-light-dark",
  light: "mdi:white-balance-sunny",
  dark: "mdi:weather-night",
  theme: "mdi:theme-light-dark",
  vollbild: "mdi:fullscreen",
  vollbildAus: "mdi:fullscreen-exit",
  wetter: "mdi:thermometer",
  menue: "mdi:menu",
  pfeil: "mdi:chevron-down",
};

export function sprache(hass) {
  const s = String(
    hass?.locale?.language || hass?.language
    || globalThis.document?.documentElement?.lang
    || globalThis.navigator?.language || "en"
  ).toLowerCase();
  return s.startsWith("de") ? "de" : "en";
}

// ---- Modus ---------------------------------------------------------------

// Ob sich der Modus ueberhaupt schalten laesst, entscheidet die Theme - und
// zwar nach der Regel aus HAs _applyTheme, am 13.10.2026 aus dem Buendel
// gelesen:
//
//     if (theme) {
//       if (theme.modes && "dark" in theme.modes) {
//         if (!("light" in theme.modes)) dunkel = true;
//       } else dunkel = false;
//     }
//
// Eine Theme ohne modes.dark ist also IMMER hell, eine nur mit modes.dark
// immer dunkel - egal, was gewaehlt wird. Das Ereignis kaeme an, wuerde
// gespeichert, und zu sehen waere nichts. Deshalb sperrt die Leiste die Wahl
// dann und sagt, warum.
//
// Gelesen wird die WIRKSAME Theme (themes.theme), nicht die Wahl im Profil -
// die beiden koennen auseinanderlaufen. Die Standard-Theme hat keinen Eintrag
// in themes.themes und kann beides.
export function modusLage(hass) {
  const themes = hass?.themes;
  const name = themes?.theme;
  const eintrag = name ? themes?.themes?.[name] : undefined;
  let fest = null;
  if (eintrag) {
    const m = eintrag.modes;
    if (m && "dark" in m) { if (!("light" in m)) fest = "dark"; }
    else fest = "light";
  }
  // undefined heisst automatisch - so legt es Home Assistant selbst ab.
  const wahl = hass?.selectedTheme?.dark;
  return {
    theme: name || "default",
    schaltbar: fest === null,
    fest,
    aktiv: fest ?? (wahl === true ? "dark" : wahl === false ? "light" : "auto"),
  };
}

// Was mit dem Ereignis mitgeht. NUR dark, nie theme: Die Leiste schaltet den
// Modus, nicht die Theme. Home Assistant mischt das Detail in die bestehende
// Wahl ({...selectedTheme, ...detail}), der Theme-Name bleibt also stehen.
//
// Der Schluessel muss fuer "automatisch" DA sein und undefined tragen. Fehlt
// er, laesst das Mischen den alten Wert stehen - und "automatisch" taete
// nichts.
export function modusDetail(wahl) {
  return { dark: wahl === "dark" ? true : wahl === "light" ? false : undefined };
}

// ---- Konfiguration ---------------------------------------------------------

// Eine unbekannte Funktion ist ein Fehler, kein stilles Nichts. Ein
// Tippfehler liesse den Knopf sonst einfach ohne Wirkung dastehen, und man
// suchte den Grund in der Karte statt in der eigenen Zeile. (Die Menueleiste
// hat hier geschwiegen und den Knopf als gewoehnlichen behandelt.)
function einKnopf(b, index) {
  const funktion = b.function ?? "";
  if (funktion && !FUNKTIONEN.includes(funktion)) {
    throw new Error(
      `Unbekannte Funktion / unknown function: ${funktion} `
      + `(bekannt / known: ${FUNKTIONEN.join(", ")})`
    );
  }
  return {
    index,
    name: String(b.name ?? "").trim(),
    icon: b.icon ?? "",
    link: b.link ?? "",
    entity: b.entity ?? "",
    function: funktion,
    temperature: b.temperature ?? "",
    // "sensor" oder "weather". Getrennt vom Sensor, damit man auf die
    // Wetterentitaet zurueckschalten kann, ohne ihn zu loeschen.
    temperature_source: b.temperature_source ?? "",
    // Ob eine eingeschaltete Entitaet den Knopf fuellt, und ob in der Farbe
    // der Lampe oder in HAs Zustandsfarbe. Beides ist die Vorgabe.
    state_background: b.state_background !== false,
    light_background: b.light_background !== false,
    align_end: b.align_end === true,
    separator_before: b.separator_before === true,
    tap_action: b.tap_action,
  };
}

// Der EINZIGE Weg, die Knoepfe zu lesen. Mit `buttons` gilt die Liste; ohne
// sie die Kurzform `controls`, und ohne beide deren Vorgabe.
export function leseKnoepfe(config) {
  const roh = config?.buttons;
  if (roh !== undefined) {
    if (!Array.isArray(roh)) {
      throw new Error("buttons muss eine Liste sein / buttons must be a list");
    }
    return roh.filter((b) => b && typeof b === "object").map(einKnopf);
  }

  const teile = config?.controls;
  if (teile !== undefined && !Array.isArray(teile)) {
    throw new Error("controls muss eine Liste sein / controls must be a list");
  }
  const liste = teile === undefined ? BEDIENTEILE : teile;
  const fremd = liste.filter((t) => !BEDIENTEILE.includes(t));
  if (fremd.length) {
    throw new Error(
      `Unbekanntes Bedienteil / unknown control: ${fremd.join(", ")} `
      + `(bekannt / known: ${BEDIENTEILE.join(", ")})`
    );
  }
  return [...new Set(liste)].map((funktion, index) => einKnopf({ function: funktion }, index));
}

// true und false nahm die erste Fassung der Menueleiste, und eine damals
// geschriebene Leiste soll weiter meinen, was sie meinte.
export function einklappArt(config) {
  const wert = config?.collapse;
  if (wert === true) return "always";
  return EINKLAPPEN.includes(wert) ? wert : "never";
}

// Eine noch nicht gemessene Karte (Breite 0) bleibt ausgelegt, statt
// zugeklappt zu starten.
export function eingeklappt(einstellung, breite) {
  if (einstellung.einklappen === "always") return true;
  if (einstellung.einklappen !== "narrow") return false;
  return breite > 0 && breite < einstellung.einklappbreite;
}

export function pruefeConfig(config) {
  return {
    knoepfe: leseKnoepfe(config),
    kiosk_only: config?.kiosk_only === true,
    einklappen: einklappArt(config),
    einklappbreite: Number(config?.collapse_width) || EINKLAPPBREITE,
    // Leer ('') heisst: das Symbol der aktuellen Seite.
    einklappsymbol: config?.collapse_icon,
    form: FORMEN.includes(config?.menu_shape) ? config.menu_shape : "theme",
    groesse: GROESSEN.includes(config?.menu_size) ? config.menu_size : "normal",
    kapsel: config?.show_highlight !== false,
  };
}

// ---- Ziele und Kapsel -------------------------------------------------------
//
// Aus helpers.js der Menueleiste uebernommen, mit ihren Tests als Massstab.

// Wohin ein Knopf fuehrt, ob als `link` geschrieben oder in einer tap_action.
// Ein #anker ist kein Pfad.
export function knopfPfad(k) {
  if (k.function) return "";
  if (k.tap_action?.action === "navigate") return k.tap_action.navigation_path ?? "";
  if (k.link && !k.link.startsWith("#")) return k.link;
  return "";
}

// Was Home Assistant ausfuehren soll. Eine ausdrueckliche tap_action schlaegt
// die Kurzformen; ein `link` ist eine Navigation, eine Entitaet ohne Aktion
// wird umgeschaltet.
export function knopfAktion(k) {
  let tap = k.tap_action;
  if (!tap) {
    const pfad = knopfPfad(k);
    if (pfad) tap = { action: "navigate", navigation_path: pfad };
    else if (k.entity) tap = { action: "toggle" };
    else tap = { action: "none" };
  }
  return { entity: k.entity || undefined, tap_action: tap };
}

// Schraegstriche am Ende und eine Abfrage sagen nichts darueber, welche
// Ansicht offen ist.
export function normPfad(pfad) {
  if (!pfad) return "";
  const kern = String(pfad).split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "");
  return kern ? `/${kern}` : "/";
}

// Wie gut ein Ziel zur Adresse passt. Der genaue Treffer schlaegt einen Pfad
// darueber, sodass bei /haus/kueche/1 der Knopf auf /haus/kueche markiert
// bleibt.
export function pfadwert(ziel, adresse) {
  const a = normPfad(ziel);
  const b = normPfad(adresse);
  if (!a || a === "/") return 0;
  if (a === b) return Number.MAX_SAFE_INTEGER;
  if (b.startsWith(`${a}/`)) return a.length;
  return 0;
}

// Auf welchem Knopf die Kapsel sitzt, oder -1. Ein Schalter ist es nie: Die
// Kapsel sagt, wo du bist, und eine Lampe, die an ist, sagt etwas anderes.
export function aktiverIndex(knoepfe, adresse) {
  let bester = -1;
  let wert = 0;
  knoepfe.forEach((k, i) => {
    if (k.entity || k.function) return;
    const w = pfadwert(knopfPfad(k), adresse);
    if (w > wert) { wert = w; bester = i; }
  });
  return bester;
}

// Die Reihenfolge der Anzeige: erst was nicht ans Ende soll, dann der Rest.
// Der Platz in der Konfiguration aendert nie, welcher Knopf gemeint ist - der
// index wandert mit.
export function geordnet(knoepfe) {
  return [...knoepfe.filter((k) => !k.align_end), ...knoepfe.filter((k) => k.align_end)];
}

// ---- Schalter und Wetter ----------------------------------------------------

// Vereinfacht gegenueber Home Assistants eigener Regel (stateActive kennt je
// Domaene Sonderfaelle): an ist, was nicht ausdruecklich aus oder weg ist.
const AUS = new Set([
  "off", "unavailable", "unknown", "closed", "locked", "idle", "standby",
  "not_home", "docked", "disarmed", "below_horizon",
]);

export function istAn(zustand) {
  return Boolean(zustand) && !AUS.has(zustand.state);
}

// Ob auf einer Flaeche dunkle Schrift stehen muss. Relative Leuchtdichte nach
// WCAG; ab 0.179 hat Schwarz den besseren Kontrast als Weiss.
export function istHell(r, g, b) {
  const kanal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b) > 0.179;
}

// Die Farbe, in der ein eingeschalteter Knopf gefuellt wird: die der Lampe,
// wenn sie eine hat und das gewollt ist, sonst Home Assistants Zustandsfarbe
// fuer die Domaene - derselbe Weg, auf dem eine Kachel ihr Symbol faerbt.
export function flaechenfarbe(k, zustand) {
  const rgb = zustand?.attributes?.rgb_color;
  if (k.light_background && Array.isArray(rgb) && rgb.length === 3) {
    return `rgb(${rgb.map((v) => Math.round(Number(v) || 0)).join(", ")})`;
  }
  const domaene = String(k.entity).split(".")[0].replace(/[^a-z_]/g, "");
  return `var(--state-${domaene}-active-color, var(--state-active-color))`;
}

// Symbol und Wert des Wetterknopfs. Das Symbol kommt IMMER aus der
// Wetterentitaet. Woher der Wert kommt, ist eine Wahl: ohne
// temperature_source gewinnt der Sensor, sobald einer eingetragen ist. Faellt
// der Sensor aus, uebernimmt die Wetterentitaet - ein Wert von weiter weg ist
// besser als ein Strich.
export function wetterText(hass, k) {
  const z = hass?.states ?? {};
  const wetter = k.entity?.startsWith("weather.") ? z[k.entity] : null;
  const vomSensor = k.temperature_source ? k.temperature_source === "sensor" : Boolean(k.temperature);
  const sensor = vomSensor && k.temperature ? z[k.temperature] : (!wetter && k.entity ? z[k.entity] : null);

  let wert = "—";
  if (sensor && sensor.state !== "unavailable" && sensor.state !== "unknown") {
    wert = hass.formatEntityState?.(sensor) ?? String(sensor.state);
  } else if (wetter?.attributes?.temperature != null) {
    wert = hass.formatEntityAttributeValue?.(wetter, "temperature")
      ?? String(wetter.attributes.temperature);
  }
  return {
    text: k.name ? `${k.name} ${wert}` : wert,
    wetter: wetter && wetter.state !== "unavailable" ? wetter : null,
  };
}

// ---- Vollbild ------------------------------------------------------------
//
// Home Assistant haelt den Kiosk-Modus in hass.kioskMode und hoert dafuer auf
// window:
//
//     window.addEventListener("hass-kiosk-mode",
//       (e) => this._updateHass({ kioskMode: e.detail.enable }))
//
// Gemessen an einem 1024 Pixel breiten Fenster: Seitenleiste 255 -> 0, in der
// Kopfzeile bleiben die Reiter und Assist, "Hinzufuegen", "Suchen" und
// "Bearbeiten" verschwinden - und der Menueknopf auch.
//
// Home Assistant VERGISST den Kiosk-Modus beim Neuladen. Die Leiste merkt
// sich die Wahl deshalb selbst, je Geraet: Ein Wandtablett soll im Vollbild
// starten. Was der Knopf ANZEIGT, ist trotzdem immer hass.kioskMode - also
// was gilt, nicht was sich die Leiste gemerkt hat.

const MERK = "hats-control:fullscreen";
// Unter diesem Namen hat die Menueleiste der Horizon-Cards dieselbe Wahl
// abgelegt. Wer von dort kommt, startet weiter im Vollbild.
const MERK_ALT = "menue-leiste:kiosk";

export function vollbildGemerkt() {
  try {
    const eigen = globalThis.localStorage.getItem(MERK);
    if (eigen !== null) return eigen === "1";
    return globalThis.localStorage.getItem(MERK_ALT) === "1";
  } catch {
    return false;
  }
}

function merkeVollbild(an) {
  try {
    globalThis.localStorage.setItem(MERK, an ? "1" : "0");
  } catch {
    // Ohne Speicher haelt die Wahl einfach bis zum Neuladen.
  }
}

function kiosk(an) {
  window.dispatchEvent(new CustomEvent("hass-kiosk-mode", { detail: { enable: an } }));
}

// Die Leiste raeumt nur auf, was sie selbst angerichtet hat. Ein Vollbild, das
// jemand anders geoeffnet hat - ein Kamerabild etwa -, beendet sie nicht.
// Auf Modulebene, nicht in der Leiste: Beim Wechsel der Ansicht entsteht sie
// neu und wuesste sonst nichts mehr davon.
let vollbildVonKarte = false;
let vollbildGewollt = false;

function browserVollbild(an) {
  vollbildGewollt = an;
  if (an) {
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    document.documentElement.requestFullscreen().then(() => {
      // Die Antwort kann spaet kommen - oder nie: Im eingebauten Browser der
      // Claude-App blieb die Anfrage am 13.10.2026 einfach offen, weder
      // erfuellt noch abgelehnt. Wer in der Zwischenzeit wieder abgewaehlt
      // hat, soll nicht nachtraeglich im Vollbild landen.
      if (!vollbildGewollt) { document.exitFullscreen().catch(() => {}); return; }
      vollbildVonKarte = true;
    }, () => { /* abgelehnt: dann bleibt es beim Kiosk-Modus */ });
  } else if (vollbildVonKarte && document.fullscreenElement) {
    vollbildVonKarte = false;
    document.exitFullscreen().catch(() => {});
  }
}

// Alle Haelften in einem Aufruf - auch, damit ein Test die Kopplung ohne
// Browser fahren kann.
export function schalteVollbild(an, nurKiosk) {
  merkeVollbild(an);
  kiosk(an);
  if (!nurKiosk) browserVollbild(an);
}

// Einmal je Seite: Was gemerkt ist, wird wieder eingeschaltet. NUR ein - ein
// "aus" an dieser Stelle loeschte einen Kiosk-Modus, den jemand anders gesetzt
// hat.
let abgeglichen = false;

export function gleicheVollbildAb(hass) {
  if (abgeglichen) return;
  abgeglichen = true;
  if (vollbildGemerkt() && hass?.kioskMode !== true) kiosk(true);
}

if (globalThis.document?.addEventListener) {
  // Wer das Vollbild mit Esc verlaesst, verlaesst es ganz. Sonst stuende Home
  // Assistant weiter ohne Seitenleiste da, und der Knopf zeigte einen Zustand,
  // der nur noch zur Haelfte stimmt.
  //
  // Nur wenn KEIN Element mehr im Vollbild ist: Schliesst jemand ein
  // Kamerabild, das ueber unserem Vollbild lag, faellt fullscreenElement auf
  // die Seite zurueck, nicht auf null.
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement || !vollbildVonKarte) return;
    vollbildVonKarte = false;
    merkeVollbild(false);
    kiosk(false);
  });
}

// Die Kopfzeile. Sie auszublenden reicht nicht: Der Inhalt darunter fliesst
// nicht unter sie, sondern haelt ihre Hoehe frei - und zwar aus einer
// Variablen, nicht aus der Leiste selbst. Darum setzt die Regel beides. So in
// der Menueleiste gemessen und von dort uebernommen.
const KOPF_REGELN = {
  "hui-root": `
:host { --header-height: 0px !important; }
.header, app-header, .toolbar { display: none !important; }
hui-view-container { padding-top: var(--safe-area-inset-top, 0px) !important; }`,
  "ha-top-app-bar-fixed": `
:host { --total-top-app-bar-height: 0px !important; }
.top-app-bar { display: none !important; }
.top-app-bar-fixed-adjust { top: var(--safe-area-inset-top, 0px) !important; }`,
};

// Der Wirt wird von der Leiste aus NACH OBEN gelaufen, nicht von oben gesucht:
// Die Leiste weiss, in welchem Panel sie steckt, eine Suche nicht - und auf
// einem Dashboard mit einer zweiten Kopfleiste an anderer Stelle traefe sie
// die falsche.
function kopfWirt(start) {
  let knoten = start;
  while (knoten) {
    const tag = knoten.tagName?.toLowerCase?.();
    if (tag && KOPF_REGELN[tag] && knoten.shadowRoot) {
      return { wurzel: knoten.shadowRoot, regel: KOPF_REGELN[tag] };
    }
    if (knoten.parentNode) { knoten = knoten.parentNode; continue; }
    const wurzel = knoten.getRootNode?.();
    knoten = wurzel && wurzel.host ? wurzel.host : null;
  }
  return null;
}

// Im Bearbeitungsmodus traegt genau diese Leiste den Knopf, mit dem man ihn
// verlaesst. Sie dort zu verstecken hiesse, das Dashboard zu verriegeln.
function wirdBearbeitet() {
  try {
    return new URLSearchParams(globalThis.location.search).get("edit") === "1";
  } catch {
    return false;
  }
}

function kopfzeile(leiste, verstecken) {
  const ziel = kopfWirt(leiste);
  if (!ziel) return;
  const soll = verstecken && !wirdBearbeitet();
  const da = ziel.wurzel.querySelector("style[data-hats-vollbild]");
  if (soll && !da) {
    const stil = document.createElement("style");
    stil.setAttribute("data-hats-vollbild", "");
    stil.textContent = ziel.regel;
    ziel.wurzel.appendChild(stil);
  } else if (!soll && da) {
    da.remove();
  }
}

// ---- Aussehen ------------------------------------------------------------
//
// Drei Blaetter: was beide Formen teilen, dann die Karte, dann das Badge.
//
// Die Masse und Farben der KARTE stehen in den elementStyles von
// ha-control-select und ha-control-button: Spur in --disabled-color bei 20
// Prozent, Auswahl in --primary-color, 40 Pixel hoch, 4 Pixel Polster,
// 20-Pixel-Symbole. Die Rundung nimmt denselben Weg wie in den
// Kachel-Funktionen (--ha-card-features-border-radius, sonst
// --ha-border-radius-lg). Damit steht die Karte neben einer Kachel, ohne
// aufzufallen, und zieht mit, wenn die Theme eins dieser Felder aendert.
//
// Die Flaechen liegen UNTER dem Symbol, wie bei Home Assistant: So laesst sich
// die Deckkraft der Flaeche stellen, ohne das Symbol mitzunehmen. ::before
// traegt, was die Leiste selbst zeigt (gedrueckt, gewaehlt), .flaeche die
// Farbe einer eingeschalteten Entitaet.
//
// Jeder Knopf setzt seine Schriftfarbe selbst. button erbt sie nicht von der
// Karte, sondern vom Browser - dieselbe Falle wie im Panel.
const STIL_GEMEINSAM = `
  button {
    position: relative; z-index: 1; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center;
    margin: 0; padding: 0; border: 0; outline: none; background: none;
    font: inherit; color: var(--primary-text-color);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: box-shadow .18s ease-in-out, color .18s ease-in-out;
  }
  button::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    border-radius: inherit; pointer-events: none;
    transition: background-color .18s ease-in-out, opacity 80ms ease-in-out;
  }
  /* Die Groesse steht fest, bevor das Symbol geladen ist. Home Assistant holt
     die Zeichnung nach; bis dahin waere der Knopf schmaler, und eine Kapsel,
     die in dem Moment gemessen wird, saesse danach daneben. */
  ha-icon, ha-state-icon {
    display: flex; flex: none; pointer-events: none;
    width: var(--mdc-icon-size); height: var(--mdc-icon-size);
  }
  ha-ripple:not(:defined) { display: none; }

  .leiste { position: relative; flex: 1; min-width: 0; line-height: normal; }
  .reihe { position: relative; display: flex; align-items: center; min-width: 0; }
  .fueller { flex: 1 1 auto; }
  .trenner { flex: none; width: 1px; height: 16px; margin: 0 var(--ha-space-1, 4px);
             background: var(--divider-color); }

  /* Die Kapsel sagt, wo du bist. Sie gleitet, statt zu springen. */
  .kapsel {
    position: absolute; left: 0; top: 0; z-index: 0;
    border-radius: var(--_knopfrund); background: var(--primary-color);
    opacity: 0; pointer-events: none;
    transition: transform .25s ease, width .25s ease, opacity .18s ease;
  }
  .kapsel.sichtbar { opacity: 1; }

  .knopf {
    flex: none; overflow: hidden; height: var(--_h); min-width: var(--_h);
    padding: 0 var(--_polster); gap: 6px; border-radius: var(--_knopfrund);
    font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
    white-space: nowrap;
  }
  .knopf.nur-symbol { padding: 0; width: var(--_h); }
  .name:empty { display: none; }
  .knopf::before { background-color: var(--primary-color); opacity: 0; }
  .knopf:focus-visible { box-shadow: 0 0 0 2px var(--secondary-text-color); }
  .knopf.aktiv, .knopf[aria-pressed="true"] { color: var(--ha-color-on-primary-loud, #fff); }
  .leiste .knopf[aria-pressed="true"]::before { background-color: var(--primary-color); opacity: 1; }

  /* Was AN ist, im Unterschied zu: wo du bist. */
  .flaeche {
    position: absolute; inset: 0; z-index: -1; border-radius: inherit;
    opacity: 0; pointer-events: none; transition: opacity .18s ease-in-out;
  }
  .knopf.gefuellt .flaeche { opacity: 1; }
  .knopf.gefuellt { color: var(--white-color, #fff); }
  .knopf.gefuellt.hell { color: var(--black-color, #000); }
  .knopf.an:not(.gefuellt) { color: var(--state-active-color); }

  .modus { position: relative; z-index: 1; display: flex; align-items: center; }
  .wahl::before { background-color: var(--primary-color); opacity: 0; }
  .wahl:hover::before { opacity: .2; }
  .wahl:focus-visible { box-shadow: 0 0 0 2px var(--primary-color); }
  .wahl[aria-pressed="true"] { color: var(--ha-color-on-primary-loud, #fff); }
  .wahl[aria-pressed="true"]::before { opacity: 1; }

  /* Gesperrt heisst leiser, nicht unsichtbar - und nicht "disabled": Der
     Knopf muss klickbar bleiben, damit er sagen kann, warum er nichts tut. */
  .modus[aria-disabled="true"] .wahl { cursor: not-allowed; color: var(--disabled-text-color); }
  .modus[aria-disabled="true"] .wahl::before { background-color: var(--disabled-color); }
  .modus[aria-disabled="true"] .wahl:hover:not([aria-pressed="true"])::before { opacity: 0; }
  .modus[aria-disabled="true"] .wahl[aria-pressed="true"] { color: var(--primary-text-color); }

  .liste { display: none; }
  .leer { color: var(--secondary-text-color); font-size: var(--ha-font-size-m, 14px);
          padding: 0 var(--ha-space-2, 8px); white-space: nowrap; }
`;

const STIL_KARTE = `
  :host { display: block; height: 100%; }
  ha-card {
    height: 100%; box-sizing: border-box;
    display: flex; align-items: center;
    padding: var(--ha-space-2, 8px);
  }
  .leiste {
    --_rund: var(--ha-card-features-border-radius, var(--ha-border-radius-lg, 12px));
    --_knopfrund: var(--_rund); --_h: 40px; --_polster: 12px;
  }
  .leiste.form-pill { --_knopfrund: var(--ha-border-radius-pill, 9999px); }
  .leiste.gr-small { --_h: 34px; --_polster: 10px; }
  .leiste.gr-large { --_h: 46px; --_polster: 14px; }
  .reihe { gap: var(--ha-space-1, 4px); overflow-x: auto; scrollbar-width: none; }
  ha-icon, ha-state-icon { --mdc-icon-size: 20px; }

  .modus {
    flex: none; height: var(--_h); box-sizing: border-box;
    gap: 4px; padding: 4px; border-radius: var(--_knopfrund);
  }
  .modus::before {
    content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit;
    background: var(--disabled-color); opacity: .2; pointer-events: none;
  }
  .wahl {
    flex: none; width: calc(var(--_h) - 4px); height: 100%;
    border-radius: calc(var(--_knopfrund) - 4px);
  }

  /* Nur Modus, Vollbild, Hell/Dunkel - die Steuerkarte, wie sie war: die Spur
     nimmt den Platz, die Knoepfe tragen die Flaeche von ha-control-button. */
  .nur-steuerung .reihe { gap: var(--ha-space-2, 8px); }
  .nur-steuerung .modus { flex: 1; min-width: 0; }
  .nur-steuerung .wahl { flex: 1; min-width: 0; width: auto; }
  .nur-steuerung .knopf::before { background-color: var(--disabled-color); opacity: .2; }

  /* Eingeklappt: die Ziele haengen als Liste unter dem Menueknopf. Offen
     braucht die Karte Luft nach unten und muss ueber den Karten danach liegen. */
  :host([offen]) { position: relative; z-index: 4; }
  :host([offen]) ha-card { overflow: visible; }
  .pfeil { --mdc-icon-size: 16px; }
  :host([offen]) .liste {
    display: flex; flex-direction: column; gap: 2px;
    position: absolute; z-index: 5; top: calc(100% + var(--ha-space-3, 12px));
    inset-inline-start: 0; min-width: 200px; box-sizing: border-box;
    padding: var(--ha-space-2, 8px);
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    box-shadow: var(--ha-card-box-shadow, none);
  }
  .liste .knopf { width: 100%; justify-content: flex-start; }
  .liste .knopf.nur-symbol { padding: 0 var(--_polster); }
  .liste .trenner { width: auto; height: 1px; margin: var(--ha-space-1, 4px) 0; }
`;

// Das Badge. Die Flaeche zeichnet ha-badge selbst - Hoehe, Rundung, Rand,
// Schatten und Weichzeichnung kommen aus denselben Feldern wie bei jedem
// anderen Badge, also auch aus der Theme.
//
// Am 13.10.2026 an ha-badge gemessen: Mit icon-only hat die Flaeche kein
// Polster und zeichnet NUR den Steckplatz "icon"; der uebrige Inhalt faellt
// weg. Die Leiste sitzt deshalb in diesem Steckplatz und bringt ihr Polster
// selbst mit. 36 Pixel hoch, darin 28 Pixel hohe runde Knoepfe.
//
// Eine Spur wie in der Karte gibt es hier nicht - die Pille des Badges IST die
// Spur. Eingeklappt wird hier nie: Ein Badge ist schon die kleine Form.
const STIL_BADGE = `
  :host { display: block; }
  ha-badge:not(:defined) { display: inline-flex; }
  .leiste {
    --_h: 28px; --_polster: 8px; --_knopfrund: var(--ha-border-radius-pill, 9999px);
    padding: 0 var(--ha-space-1, 4px);
  }
  .reihe { gap: var(--ha-space-1, 4px); }
  .trenner { margin: 0; }
  ha-icon, ha-state-icon { --mdc-icon-size: var(--ha-badge-icon-size, 18px); }
  .modus { gap: 2px; }
  .wahl { flex: none; width: 28px; height: 28px; border-radius: var(--_knopfrund); }
`;

const ADRESS_EREIGNISSE = ["location-changed", "popstate", "hashchange"];

const Basis = globalThis.HTMLElement || class {};

function neu(tag, klasse) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  return e;
}

// Was Karte und Badge teilen: die Konfiguration, den Zustand, die Klicks. Die
// beiden Formen darunter liefern nur noch Rahmen und Stilblatt.
class Steuerung extends Basis {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("click", (ev) => this._klick(ev));
    this._breite = 0;
    this._aktivIndex = -1;
    this._elemente = [];
    this._beiAdresse = () => this._zeichne();
    // Abfangend, damit auch eine Karte, die das Ereignis stoppt, die Liste
    // schliesst.
    this._beiAussen = (ev) => { if (!ev.composedPath().includes(this)) this._listeZu(); };
    this._beiTaste = (ev) => { if (ev.key === "Escape") this._listeZu(); };
  }

  // Drei Dinge haengen ausserhalb der Leiste und halten sie fest: die
  // Adress-Lauscher der Kapsel, der Beobachter der Breite und - solange die
  // Liste offen ist - Klick und Taste am Dokument. Ein vergessener Lauscher
  // hielte das Element samt seinem letzten hass fuer die Lebensdauer der Seite
  // am Leben.
  connectedCallback() {
    // Drei Ereignisse fuer EINEN Wechsel: HAs eigenes location-changed feuert
    // beim Zurueck-Knopf nicht. Mit ihm allein blieb die Kapsel der
    // Menueleiste beim Zurueckgehen stehen.
    for (const typ of ADRESS_EREIGNISSE) window.addEventListener(typ, this._beiAdresse);
    if (typeof ResizeObserver !== "undefined") {
      this._beobachter = new ResizeObserver((eintraege) => {
        const breite = Math.round(eintraege[0].contentRect.width);
        if (breite === this._breite) return;
        this._breite = breite;
        this._zeichne();
      });
      this._beobachter.observe(this);
      // Ein Knopf, der breiter oder schmaler wird, verschiebt alle hinter ihm -
      // und nichts sonst meldet das: Kein Zustand hat sich geaendert, die
      // Adresse nicht, die Karte ist so breit wie vorher. Gemessen am
      // 13.10.2026: Die Kapsel sass 200 Pixel neben ihrem Knopf.
      this._knopfbeobachter = new ResizeObserver(() => this._setzeKapsel());
      this._beobachteKnoepfe();
    }
    this._zeichne();
  }

  _beobachteKnoepfe() {
    const b = this._knopfbeobachter;
    if (!b) return;
    b.disconnect();
    for (const e of this._elemente) b.observe(e);
    if (this._menueknopf) b.observe(this._menueknopf);
  }

  disconnectedCallback() {
    for (const typ of ADRESS_EREIGNISSE) window.removeEventListener(typ, this._beiAdresse);
    this._beobachter?.disconnect();
    this._beobachter = null;
    this._knopfbeobachter?.disconnect();
    this._knopfbeobachter = null;
    this._listeZu();
  }

  setConfig(config) {
    this._config = this._liesConfig(config);
    // Nur diese Entitaeten loesen ein Zeichnen aus.
    this._beobachtet = [...new Set(this._config.knoepfe
      .flatMap((k) => [k.entity, k.temperature]).filter(Boolean))];
    this._gebaut = null;
    this._zeichne();
  }

  // Home Assistant setzt hass bei JEDER Zustandsaenderung im Haus neu. Die
  // Leiste haengt nur an wenigen Dingen, und nur die loesen ein Zeichnen aus.
  // Unveraenderte Teile reicht Home Assistant als dasselbe Objekt weiter, ein
  // Vergleich der Verweise genuegt also.
  set hass(hass) {
    const alt = this._hass;
    this._hass = hass;
    if (!alt
        || alt.themes !== hass.themes
        || alt.selectedTheme !== hass.selectedTheme
        || alt.kioskMode !== hass.kioskMode
        || sprache(alt) !== sprache(hass)
        || this._beobachtet?.some((id) => alt.states?.[id] !== hass.states?.[id])) {
      this._zeichne();
    }
  }

  _zeichne() {
    if (!this._config || !this._hass) return;
    const spr = sprache(this._hass);
    const zu = this._einklappbar() && eingeklappt(this._config, this._breite);
    // Neu gebaut wird nur, wenn sich Aufbau, Sprache oder das Einklappen
    // aendern. Sonst wechseln bloss Werte - der Fokus bleibt, wo er ist.
    const marke = `${spr}|${zu}`;
    if (this._gebaut !== marke) {
      this._eingeklappt = zu;
      this._baue(spr);
      this._gebaut = marke;
      this._beobachteKnoepfe();
    }
    this._stelle(spr);
  }

  _baue(spr) {
    const t = TEXTE[spr];
    const c = this._config;
    this._listeZu();
    this.shadowRoot.innerHTML = `<style>${STIL_GEMEINSAM}${this._stil()}</style>${this._rahmen()}`;

    const leiste = this.shadowRoot.querySelector(".leiste");
    leiste.classList.add(`gr-${c.groesse}`, `form-${c.form}`);
    leiste.classList.toggle("nur-steuerung", c.knoepfe.length > 0
      && c.knoepfe.every((k) => ["mode", "fullscreen", "theme"].includes(k.function)));
    this._reihe = leiste.querySelector(".reihe");
    this._liste = leiste.querySelector(".liste");
    this._kapsel = leiste.querySelector(".kapsel");
    this._elemente = [];
    this._menueknopf = null;

    if (!c.knoepfe.length) {
      const leer = neu("div", "leer");
      leer.textContent = t.leer;
      this._reihe.append(leer);
      return;
    }

    // Eingeklappt fuehrt der Menueknopf die Reihe an. Es sind DIESELBEN
    // Knopfelemente, die in die Liste wandern, kein zweiter Satz: Aktionen,
    // Zustand und Lampenfarbe arbeiten dort weiter, ohne zu wissen, dass sie
    // umgezogen sind. Was ans Ende geschoben ist, bleibt in der Reihe.
    if (this._eingeklappt) {
      this._menueknopf = this._baueMenueknopf();
      this._reihe.append(this._menueknopf);
    }

    let fueller = false;
    let davor = null;
    for (const k of geordnet(c.knoepfe)) {
      const inListe = this._eingeklappt && !k.align_end;
      const ziel = inListe ? this._liste : this._reihe;
      if (!inListe && k.align_end && !fueller) {
        ziel.append(neu("span", "fueller"));
        fueller = true;
        davor = null;
      }
      // Ein Trennstrich gehoert zu dem Knopf hinter ihm.
      const strich = k.separator_before
        || (this._gruppenstrich() && davor && !inListe
            && (davor.function === "mode") !== (k.function === "mode"));
      if (strich) ziel.append(neu("span", "trenner"));
      const e = this._baueKnopf(k, t);
      e._inListe = inListe;
      ziel.append(e);
      this._elemente.push(e);
      davor = k;
    }
  }

  _baueKnopf(k, t) {
    if (k.function === "mode") {
      const gruppe = neu("div", "modus");
      gruppe.setAttribute("role", "group");
      gruppe.setAttribute("aria-label", t.modus);
      for (const w of ["auto", "light", "dark"]) {
        const b = neu("button", "wahl");
        b.type = "button";
        b.dataset.wahl = w;
        b.title = t[w];
        b.setAttribute("aria-label", t[w]);
        const symbol = neu("ha-icon");
        symbol.setAttribute("icon", SYMBOL[w]);
        b.append(symbol);
        gruppe.append(b);
      }
      gruppe._k = k;
      return gruppe;
    }

    const b = neu("button", "knopf");
    b.type = "button";
    b._k = k;
    // Ohne eigenes Symbol waehlt Home Assistant eins: zur Wetterlage, oder
    // zum Zustand der Entitaet.
    const vomZustand = k.function === "weather" || (k.entity && !k.icon);
    b._symbol = neu(vomZustand ? "ha-state-icon" : "ha-icon");
    b._name = neu("span", "name");
    b._flaeche = neu("span", "flaeche");
    b.append(b._flaeche, b._symbol, b._name, neu("ha-ripple"));
    return b;
  }

  _baueMenueknopf() {
    const b = neu("button", "knopf menueknopf");
    b.type = "button";
    b.setAttribute("aria-haspopup", "true");
    b.setAttribute("aria-expanded", "false");
    b._symbol = neu("ha-icon");
    b._name = neu("span", "name");
    const pfeil = neu("ha-icon", "pfeil");
    pfeil.setAttribute("icon", SYMBOL.pfeil);
    b.append(b._symbol, b._name, pfeil, neu("ha-ripple"));
    return b;
  }

  _stelle(spr) {
    const t = TEXTE[spr];
    const hass = this._hass;
    let hatVollbild = false;

    for (const e of this._elemente) {
      const k = e._k;

      if (k.function === "mode") {
        const lage = modusLage(hass);
        // Der Theme-Name kommt aus einer YAML-Datei und geht deshalb als
        // Attribut hinein, nie als HTML.
        e.setAttribute("aria-disabled", String(!lage.schaltbar));
        if (lage.schaltbar) e.removeAttribute("title");
        else e.setAttribute("title", t.fest(lage.theme, lage.fest));
        for (const w of e.querySelectorAll(".wahl")) {
          w.setAttribute("aria-pressed", String(w.dataset.wahl === lage.aktiv));
        }
        continue;
      }

      if (k.function === "fullscreen") {
        hatVollbild = true;
        const an = hass.kioskMode === true;
        e.setAttribute("aria-pressed", String(an));
        this._beschrifte(e, k.icon || (an ? SYMBOL.vollbildAus : SYMBOL.vollbild),
          k.name, an ? t.vollbildAus : t.vollbild);
        continue;
      }

      if (k.function === "theme") {
        // Faerbt sich nicht: Er schaltet den Browser, kein Geraet im Haus, und
        // im dunklen Modus staende er sonst dauerhaft in der Auswahlfarbe.
        this._beschrifte(e, k.icon || SYMBOL.theme, k.name, t.hellDunkel);
        continue;
      }

      if (k.function === "weather") {
        const w = wetterText(hass, k);
        e._symbol.hass = hass;
        e._symbol.stateObj = w.wetter ?? undefined;
        e._symbol.icon = w.wetter ? undefined : (k.icon || SYMBOL.wetter);
        this._beschrifte(e, null, w.text, w.text);
        continue;
      }

      // Ein Ziel oder ein Schalter.
      const zustand = k.entity ? hass.states?.[k.entity] : null;
      if (e._symbol.tagName === "HA-STATE-ICON") {
        e._symbol.hass = hass;
        e._symbol.stateObj = zustand ?? undefined;
      }
      this._beschrifte(e, e._symbol.tagName === "HA-ICON" ? k.icon : null, k.name,
        k.name || zustand?.attributes?.friendly_name || k.icon || t.knopf(k.index + 1));

      const an = istAn(zustand);
      const gefuellt = an && k.state_background;
      e.classList.toggle("an", an);
      e.classList.toggle("gefuellt", gefuellt);
      let hell = false;
      if (gefuellt) {
        e._flaeche.style.backgroundColor = flaechenfarbe(k, zustand);
        // Eine Lampenfarbe ist oft eine blasse, und Weiss darauf ist nicht zu
        // lesen. Gefragt wird die BERECHNETE Farbe - eine Variable laesst sich
        // nicht ausrechnen, bevor der Browser sie aufgeloest hat.
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(e._flaeche).backgroundColor);
        hell = Boolean(m) && istHell(Number(m[1]), Number(m[2]), Number(m[3]));
      }
      e.classList.toggle("hell", hell);
    }

    // Der gemerkte Zustand wird einmal je Seite wiederhergestellt, die
    // Kopfzeile bei JEDEM Durchlauf nachgezogen: Home Assistant baut sie bei
    // jedem Panelwechsel neu.
    if (hatVollbild) {
      gleicheVollbildAb(hass);
      kopfzeile(this, hass.kioskMode === true);
    }

    this._aktivIndex = this._bestimmeAktiv();
    this._stelleMenueknopf(t);
    // Gemessen wird, nachdem der Browser die Reihe ausgelegt hat. Eine Leiste,
    // die auf der Ansicht entsteht, auf die sie zeigt, haette ihre Kapsel
    // sonst mit Breite null.
    this._setzeKapsel();
    if (globalThis.requestAnimationFrame) requestAnimationFrame(() => this._setzeKapsel());
  }

  // Symbol, Beschriftung und Name fuer Vorleser - an einer Stelle. Der Text
  // kommt aus der Konfiguration und geht als textContent hinein, nie als HTML.
  _beschrifte(e, symbol, name, titel) {
    if (e._symbol.tagName === "HA-ICON") {
      if (symbol) e._symbol.setAttribute("icon", symbol);
      e._symbol.hidden = !symbol;
    }
    if (e._name.textContent !== name) e._name.textContent = name;
    e.classList.toggle("nur-symbol", !name);
    e.setAttribute("aria-label", titel);
    if (name) e.removeAttribute("title");
    else e.setAttribute("title", titel);
  }

  // Die Adresse schlaegt den letzten Klick. Darum stimmt die Kapsel auch nach
  // dem Neuladen und nach dem Zurueck-Knopf. Zeigt hier nichts auf diese
  // Seite, bleibt sie, wo sie ist, statt auf einen Knopf zu springen, der
  // etwas anderes meint.
  _bestimmeAktiv() {
    const kn = this._config.knoepfe;
    const ausAdresse = aktiverIndex(kn, globalThis.location?.pathname ?? "");
    if (ausAdresse >= 0) return ausAdresse;
    const jetzt = kn[this._aktivIndex];
    if (jetzt && !jetzt.entity && !jetzt.function) return this._aktivIndex;
    return kn.findIndex((k) => !k.entity && !k.function);
  }

  _setzeKapsel() {
    const kapsel = this._kapsel;
    if (!kapsel) return;
    const index = this._aktivIndex;
    for (const e of this._elemente) {
      e.classList.toggle("aktiv", !this._eingeklappt && this._config.kapsel
        && e.tagName === "BUTTON" && e._k.index === index);
    }
    // Eingeklappt haben die Ziele keinen Platz in der Reihe. Die Marke traegt
    // dann der Menueknopf - er nennt die Seite, auf der du bist.
    const ziel = this._eingeklappt
      ? (index >= 0 ? this._menueknopf : null)
      : this._elemente.find((e) => e.tagName === "BUTTON" && e._k.index === index);
    this._menueknopf?.classList.toggle("aktiv", Boolean(ziel) && this._eingeklappt && this._config.kapsel);

    if (!ziel || !this._config.kapsel || !ziel.offsetWidth) {
      kapsel.classList.remove("sichtbar");
      return;
    }
    kapsel.style.width = `${ziel.offsetWidth}px`;
    kapsel.style.height = `${ziel.offsetHeight}px`;
    kapsel.style.transform = `translate(${ziel.offsetLeft}px, ${ziel.offsetTop}px)`;
    kapsel.classList.add("sichtbar");
  }

  // Der Menueknopf nennt die Seite, auf der die Kapsel gelandet ist. Darum
  // laeuft das NACH _bestimmeAktiv.
  _stelleMenueknopf(t) {
    const b = this._menueknopf;
    if (!b) return;
    const kn = this._config.knoepfe;
    const aktiv = kn[this._aktivIndex];
    const gezeigt = aktiv && !aktiv.align_end ? aktiv : kn.find((k) => !k.align_end);
    // Ein Menuesymbol sagt "dahinter ist eine Liste" besser als das Symbol der
    // Seite, auf der man zufaellig ist. Der Name sagt weiter, welche das ist.
    const symbol = this._config.einklappsymbol === ""
      ? (gezeigt?.icon ?? "") : (this._config.einklappsymbol || SYMBOL.menue);
    this._beschrifte(b, symbol, gezeigt?.name ?? "", gezeigt?.name || t.menue);
  }

  _listeAuf() {
    this.setAttribute("offen", "");
    this._menueknopf?.setAttribute("aria-expanded", "true");
    document.addEventListener("click", this._beiAussen, true);
    document.addEventListener("keydown", this._beiTaste);
  }

  _listeZu() {
    if (!this.hasAttribute?.("offen")) return;
    this.removeAttribute("offen");
    this._menueknopf?.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", this._beiAussen, true);
    document.removeEventListener("keydown", this._beiTaste);
  }

  _klick(ev) {
    const knopf = ev.target.closest?.("button");
    if (!knopf || !this._hass) return;

    if (knopf.dataset.wahl) {
      if (this._modusGesperrt()) return;
      // Home Assistant hoert am Element <home-assistant>. Das Ereignis muss
      // also aufsteigen UND durch die Shadow-Grenzen - ohne composed bleibt
      // es in der Leiste stecken, und nichts passiert, ohne Meldung.
      //
      // Was Home Assistant damit tut, am 13.10.2026 gemessen: Es legt die Wahl
      // im Browser ab UND in den Nutzerdaten auf dem Server (Schluessel
      // "theme"). Sie gilt damit fuer jedes Geraet, an dem derselbe Nutzer
      // angemeldet ist - nicht nur fuer dieses.
      this._sende("settheme", modusDetail(knopf.dataset.wahl));
      return;
    }

    if (knopf === this._menueknopf) {
      if (this.hasAttribute("offen")) this._listeZu();
      else this._listeAuf();
      return;
    }

    const k = knopf._k;
    if (!k) return;

    if (k.function === "fullscreen") {
      schalteVollbild(this._hass.kioskMode !== true, this._config.kiosk_only);
      return;
    }
    if (k.function === "theme") {
      // Der eine Knopf wechselt hin und her - von dem, was gerade GILT.
      if (!this._modusGesperrt()) {
        this._sende("settheme", { dark: this._hass.themes?.darkMode !== true });
      }
      return;
    }
    if (k.function === "weather") {
      // Ein Tippen oeffnet, was hinter dem Wert steht. Die Kapsel wandert
      // nicht dorthin: Der Knopf zeigt etwas, er fuehrt nirgends hin.
      const id = k.entity || k.temperature;
      if (id) this._sende("hass-more-info", { entityId: id });
      return;
    }

    // Ein Tippen in der Liste hat getan, wofuer es da war.
    if (knopf._inListe) this._listeZu();
    // Die Kapsel wandert VOR der Navigation los, nicht erst, wenn die neue
    // Ansicht gezeichnet ist. Ein Schalter laesst sie, wo sie ist.
    if (!k.entity && knopfPfad(k)) {
      this._aktivIndex = k.index;
      this._setzeKapsel();
    }
    // Den Rest macht Home Assistant: navigieren, umschalten, Dienst rufen,
    // nachfragen - alles, was eine tap_action kann.
    this._sende("hass-action", { config: knopfAktion(k), action: "tap" });
  }

  _modusGesperrt() {
    const lage = modusLage(this._hass);
    if (lage.schaltbar) return false;
    this._sende("hass-notification", {
      message: TEXTE[sprache(this._hass)].fest(lage.theme, lage.fest),
    });
    return true;
  }

  _sende(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}

class HatsControlCard extends Steuerung {
  // Der Waehler legt die Liste ausdruecklich an. Ohne das zeigte der Editor
  // eine leere Liste, waehrend die Vorgabe - Modus und Vollbild - gezeichnet
  // wird.
  static getStubConfig() {
    return { buttons: BEDIENTEILE.map((funktion) => ({ function: funktion })) };
  }

  // Home Assistant baut den Editor aus diesem Schema selbst.
  //
  // kiosk_only ist absichtlich so herum benannt, dass "aus" die Vorgabe ist:
  // Ein Schalter im Formular zeigt ein fehlendes Feld als aus. Hiesse es
  // browser_fullscreen mit Vorgabe an, staende der Schalter auf aus, waehrend
  // die Karte das Gegenteil taete.
  static getConfigForm() {
    const t = TEXTE[sprache()];
    const wahl = (werte) => ({ select: { mode: "dropdown",
      options: werte.map((wert) => ({ value: wert, label: t.wahl[wert] })) } });
    return {
      schema: [
        // Eine Liste von Objekten, jedes mit eigenem Unterformular - auch das
        // zeichnet Home Assistant selbst (am 13.10.2026 an 2026.10.1 gesehen:
        // Zeilen mit Griff, Stift und Papierkorb, darunter "Hinzufuegen").
        // Die Kurzform `controls` steht hier absichtlich nicht mehr: Sie gilt
        // im YAML weiter, aber zwei Wege im selben Formular waeren einer zu viel.
        { name: "buttons",
          selector: { object: { multiple: true, label_field: "name", description_field: "link",
            fields: {
              name: { label: t.knopffeld.name, selector: { text: {} } },
              icon: { label: t.knopffeld.icon, selector: { icon: {} } },
              link: { label: t.knopffeld.link, selector: { navigation: {} } },
              entity: { label: t.knopffeld.entity, selector: { entity: {} } },
              function: { label: t.knopffeld.function, selector: { select: { mode: "dropdown",
                options: FUNKTIONEN.map((wert) => ({ value: wert, label: t.funktion[wert] })) } } },
              temperature: { label: t.knopffeld.temperature, selector: { entity: { domain: "sensor" } } },
              align_end: { label: t.knopffeld.align_end, selector: { boolean: {} } },
              separator_before: { label: t.knopffeld.separator_before, selector: { boolean: {} } },
            } } } },
        { name: "kiosk_only", selector: { boolean: {} } },
        { name: "menu_shape", selector: wahl(FORMEN) },
        { name: "menu_size", selector: wahl(GROESSEN) },
        { name: "collapse", selector: wahl(EINKLAPPEN) },
        { name: "collapse_width", selector: { number: { min: 200, max: 1200, step: 10, mode: "box" } } },
      ],
      computeLabel: (feld) => t.feld[feld.name],
      computeHelper: (feld) => t.hilfe[feld.name],
    };
  }

  _liesConfig(config) { return pruefeConfig(config); }
  _stil() { return STIL_KARTE; }
  _einklappbar() { return true; }
  _gruppenstrich() { return false; }
  _rahmen() {
    return `<ha-card><div class="leiste"><div class="reihe"><div class="kapsel"></div></div>`
      + `<div class="liste"></div></div></ha-card>`;
  }

  getCardSize() { return 1; }

  // Eine Zeile im Sections-Raster ist 56 Pixel hoch: 40 fuer die Knoepfe und
  // zweimal 8 Polster. Eine Leiste mit Zielen nimmt die ganze Breite.
  getGridOptions() {
    const breit = this._config?.knoepfe.some((k) => !k.function);
    return { columns: breit ? "full" : 6, rows: 1, min_columns: 4, min_rows: 1 };
  }
}

class HatsControlBadge extends Steuerung {
  // Der Waehler legt die Liste ausdruecklich an. Ohne das zeigte der Editor
  // ein leeres Auswahlfeld, waehrend beide Teile gezeichnet werden.
  static getStubConfig() {
    return { controls: [...BEDIENTEILE] };
  }

  static getConfigForm() {
    const t = TEXTE[sprache()];
    return {
      schema: [
        { name: "controls", required: true,
          selector: { select: { multiple: true, reorder: true,
            options: BEDIENTEILE.map((wert) => ({ value: wert, label: t.teil[wert] })) } } },
        { name: "kiosk_only", selector: { boolean: {} } },
      ],
      computeLabel: (feld) => t.feld[feld.name],
      computeHelper: (feld) => t.hilfe[feld.name],
    };
  }

  // Das Badge liest NUR die Kurzform. `buttons` ist hier ein Fehler und kein
  // stilles Nichts: Ein Feld, das angenommen und nie gelesen wird, sieht aus
  // wie eine Karte, die nicht tut, was man eingestellt hat.
  _liesConfig(config) {
    if (config?.buttons !== undefined) throw new Error(TEXTE[sprache()].nurKurzform);
    return pruefeConfig({ controls: config?.controls, kiosk_only: config?.kiosk_only });
  }
  _stil() { return STIL_BADGE; }
  _einklappbar() { return false; }
  // Zwischen der Modus-Gruppe und einem Knopf daneben steht im Badge von
  // selbst ein Strich: Dort gibt es keine Spur, die die Gruppe zusammenhaelt.
  _gruppenstrich() { return true; }
  // icon-only als ATTRIBUT: ha-badge fuehrt die Eigenschaft iconOnly unter
  // genau diesem Namen. "icononly" ohne Bindestrich tut nichts - gemessen.
  _rahmen() {
    return `<ha-badge icon-only><div class="leiste" slot="icon"><div class="reihe">`
      + `<div class="kapsel"></div></div><div class="liste"></div></div></ha-badge>`;
  }
}

if (globalThis.customElements) {
  // Die Eintraege fuer die beiden Waehler gibt es nur in einer Sprache, also
  // in der der Seite.
  const t = TEXTE[sprache()];
  if (!customElements.get(KARTE)) {
    customElements.define(KARTE, HatsControlCard);
    window.customCards = window.customCards || [];
    window.customCards.push({
      type: KARTE, name: t.name, description: t.beschreibung, preview: true,
    });
  }
  // Badges fuehrt Home Assistant in einer eigenen Liste. Wer dort fehlt, steht
  // im Badge-Waehler nicht unter "Community-Badges".
  if (!customElements.get(BADGE)) {
    customElements.define(BADGE, HatsControlBadge);
    window.customBadges = window.customBadges || [];
    window.customBadges.push({
      type: BADGE, name: t.nameBadge, description: t.beschreibung, preview: true,
    });
  }
}

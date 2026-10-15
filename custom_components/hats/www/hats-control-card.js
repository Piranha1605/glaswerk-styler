// HATS - die Steuerleiste: als Karte und als Badge
//
// Eine Reihe von Knoepfen. Jeder ist eins von vier Dingen:
//
//   ein Ziel        link: /dashboard/ansicht      die Kapsel zeigt, wo du bist
//   ein Schalter    entity: light.kueche          leuchtet, solange sie an ist
//   eine Funktion   function: mode | theme | fullscreen | weather | motion
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
// Und EIN Knopf schreibt: function: motion stellt die Bewegung des Hintergrunds
// und legt sie DAUERHAFT in die Theme-Datei. Dafuer - und nur dafuer - laedt
// die Leiste HATS' eigene Module nach, siehe "Bewegung des Hintergrunds".
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
const EDITOR = "hats-control-card-editor";

// Die Kurzform der Steuerkarte. Ihre Reihenfolge ist die Vorgabe.
export const BEDIENTEILE = ["mode", "fullscreen"];

// Was ein Knopf im Browser tut statt in Home Assistant. Ein solcher Knopf hat
// weder Ziel noch Schalter.
export const FUNKTIONEN = ["mode", "theme", "fullscreen", "weather", "motion", "appearance", "settings",
  "sidebar", "assist", "edit"];
export const GROESSEN = ["small", "normal", "large"];
export const FORMEN = ["theme", "pill"];
export const EINKLAPPEN = ["never", "narrow", "always"];

// Unter dieser KARTENBREITE wandern die Ziele in eine Liste. Gemessen wird die
// Karte, nicht das Fenster: Eine Leiste in einer von zwei Spalten ist auf dem
// Schreibtisch genauso eng wie auf dem Telefon.
export const EINKLAPPBREITE = 500;

export const TEXTE = {
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
      replace_header: "Kopfzeile von Home Assistant ersetzen",
      menu_shape: "Form", menu_size: "Größe", collapse: "Ziele einklappen",
      collapse_width: "Einklappen unter dieser Kartenbreite", show_highlight: "Kapsel auf der aktuellen Ansicht",
    },
    hilfe: {
      buttons: "Ein Ziel, ein Schalter oder eine Funktion - in dieser Reihenfolge.",
      controls: "Angezeigt in dieser Reihenfolge.",
      kiosk_only: "Blendet nur Seitenleiste und Kopfzeile aus. Das Browserfenster bleibt, wie es ist.",
      replace_header: "Auf diesem Dashboard steht die Leiste an Stelle der Kopfzeile und bleibt beim Rollen oben. "
        + "Ein Knopf für die Seitenleiste kommt dazu. Im Bearbeitungsmodus ist die Kopfzeile wieder da.",
      collapse_width: "Gemessen wird die Karte, nicht das Fenster.",
    },
    knopffeld: {
      name: "Name", icon: "Symbol", link: "Ziel", entity: "Entität",
      function: "Eingebaute Funktion", temperature: "Temperatursensor (nur Wetter)",
      temperature_source: "Temperatur aus (nur Wetter)", tap_action: "Aktion beim Antippen",
      align_end: "Ans Ende der Leiste", separator_before: "Trennstrich davor",
    },
    funktion: { mode: "Modus (drei Knöpfe)", theme: "Hell / Dunkel", fullscreen: "Vollbild", weather: "Wetter",
                motion: "Bewegung des Hintergrunds", appearance: "Transparenz und Schrift",
                settings: "Einstellungen (alles in einem Fenster)",
                sidebar: "Seitenleiste", assist: "Assist", edit: "Dashboard bearbeiten" },
    teil: { mode: "Modus", fullscreen: "Vollbild" },
    bewegung: "Bewegung des Hintergrunds",
    darstellung: "Transparenz und Schrift",
    alles: "Einstellungen",
    seitenleiste: "Seitenleiste",
    assist: "Assist",
    bearbeiten: "Dashboard bearbeiten",
    unschaerfe: "Weichzeichnung",
    fenster: {
      titel: "Einstellungen", zu: "Schließen",
      seiten: { aussehen: "Erscheinungsbild", hintergrund: "Hintergrund", schrift: "Schrift und Größe",
                bewegung: "Bewegung", uix: "UIX-Vorlagen", anzeige: "Anzeige" },
      modus: "Modus", karten: "Karten", farbe: "Farbe", flaeche: "Kartenfläche",
      verlaeufe: "Farbverläufe", bilder: "Eigene Bilder",
      keineBilder: "Eigene Bilder lädst du im Panel hoch. Sie liegen dann in config/www/hats.",
      schriftart: "Schriftart", groesse: "Größe", rundung: "Rundung", dichte: "Dichte",
      vollbild: "Vollbild", theme: "Theme", themeHilfe: "Gilt für jedes Gerät, an dem du angemeldet bist.",
      sicherungen: "Frühere Fassungen", keineSicherungen: "Noch keine. HATS sichert vor jedem Überschreiben.",
      zurueck: "Zurückholen", zurueckGeholt: (zeit) => `Die Fassung von ${zeit} gilt wieder.`,
      eigene: "Keine der Vorgaben - im Panel angepasst.",
      vorlagen: { karten: "Karten", oberflaeche: "Oberfläche", hintergrund: "Hintergrund", weitere: "Weitere" },
      uixHinweis: "Wirkt nur mit UI eXtension, und jede Vorlage gilt für hell und dunkel zugleich. Eigenes CSS im selben Stilziel bleibt beim Schalten stehen.",
      // Mit Sekunden: Ein Regler legt mehrere Fassungen in derselben Minute an,
      // und ohne sie standen fuenf gleiche Zeilen untereinander.
      zeit: (k) => `${k.slice(6, 8)}.${k.slice(4, 6)}. ${k.slice(9, 11)}:${k.slice(11, 13)}:${k.slice(13, 15)}`,
    },
    transparenz: "Transparenz",
    schrift: "Schrift",
    deckend: "deckend",
    nurHier: (modus) => `Gilt im ${modus === "dark" ? "Dunkel" : "Hell"}modus - die Theme trennt die beiden.`,
    ohneUnschaerfe: "Die Theme zeichnet nicht weich (--ha-card-backdrop-filter). Die Karten werden nur blasser, nicht milchig.",
    kachelnKurz: "Über 100 % kürzen Home Assistants Kacheln lange Namen früher ab.",
    mushFest: (wert) => `Mushroom steht fest auf ${wert} und wächst nicht mit.`,
    regler: { drift: "Treiben", punkte: "Farbpunkte", farbe: "Farbwechsel", weite: "Ausschlag" },
    aus: "aus",
    kreis: "im Kreis",
    laedt: "Lese die Theme …",
    speichert: "Speichere …",
    gespeichert: (name) => `In ${name}.yaml gespeichert.`,
    nichtGespeichert: "Nicht gespeichert",
    punkteNur: "Nur bei einem Hintergrund aus Farbpunkten.",
    weiteNur: "Nur mit Farbwechsel.",
    grund: {
      admin: () => "Der Regler schreibt in die Theme-Datei. Das darf nur ein Administrator.",
      ohneDatei: (name) => `Zur Theme „${name}“ gibt es keine Datei ${name}.yaml im Themes-Ordner.`,
      unlesbar: (was) => `Die Theme-Datei ist nicht lesbar: ${was}`,
      unklar: (n) => `${n} Zeile(n) der Theme-Datei sind nicht einzuordnen. Schreiben hieße, sie zu verlieren.`,
      name: (name) => `In der Datei steht die Theme „${name}“, nicht die wirksame.`,
      fremd: () => "Die Theme ist nicht mit HATS erzeugt. Eine Theme gehört einem Werkzeug.",
      keineFlaeche: () => "Die Theme setzt keine Kartenfläche (--ha-card-background).",
      form: (wert) => `Die Kartenfläche ist keine einfache Farbe: ${wert}`,
      skala: (wert) => `Die Schriftskala (--ha-font-size-scale) ist keine Zahl: ${wert}`,
      wechsel: (name) => `Inzwischen gilt die Theme „${name}“. Bitte neu öffnen.`,
      unschaerfe: (wert) => `Die Weichzeichnung ist kein einfacher Filter: ${wert}`,
      teil: (was) => `Unbekanntes Teil: ${was}`,
      bild: (was) => `Kein Bild aus /local/hats: ${was}`,
    },
    nurKurzform: "Das Badge kennt nur `controls` - Ziele und Schalter gehören in die Karte.",
    wahl: {
      theme: "Rundung der Theme", pill: "ganz rund",
      small: "klein", normal: "normal", large: "groß",
      never: "nie", narrow: "wenn es eng wird", always: "immer",
      sensor: "dem Temperatursensor", weather: "der Wetter-Entität",
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
      replace_header: "Replace Home Assistant's header",
      menu_shape: "Shape", menu_size: "Size", collapse: "Collapse targets",
      collapse_width: "Collapse below this card width", show_highlight: "Pill on the current view",
    },
    hilfe: {
      buttons: "A target, a switch or a function - in this order.",
      controls: "Shown in this order.",
      kiosk_only: "Only hides the sidebar and the header. The browser window stays as it is.",
      replace_header: "On this dashboard the bar takes the header's place and stays at the top while scrolling. "
        + "A sidebar button is added. In edit mode the header is back.",
      collapse_width: "The card is measured, not the window.",
    },
    knopffeld: {
      name: "Name", icon: "Icon", link: "Target", entity: "Entity",
      function: "Built-in function", temperature: "Temperature sensor (weather only)",
      temperature_source: "Temperature from (weather only)", tap_action: "Tap action",
      align_end: "At the end of the bar", separator_before: "Separator before",
    },
    funktion: { mode: "Mode (three buttons)", theme: "Light / dark", fullscreen: "Fullscreen", weather: "Weather",
                motion: "Background motion", appearance: "Transparency and text",
                settings: "Settings (everything in one window)",
                sidebar: "Sidebar", assist: "Assist", edit: "Edit dashboard" },
    teil: { mode: "Mode", fullscreen: "Fullscreen" },
    bewegung: "Background motion",
    darstellung: "Transparency and text",
    alles: "Settings",
    seitenleiste: "Sidebar",
    assist: "Assist",
    bearbeiten: "Edit dashboard",
    unschaerfe: "Blur",
    fenster: {
      titel: "Settings", zu: "Close",
      seiten: { aussehen: "Appearance", hintergrund: "Background", schrift: "Text and size",
                bewegung: "Motion", uix: "UIX templates", anzeige: "Display" },
      modus: "Mode", karten: "Cards", farbe: "Colour", flaeche: "Card surface",
      verlaeufe: "Gradients", bilder: "Your images",
      keineBilder: "You upload your own images in the panel. They live in config/www/hats.",
      schriftart: "Typeface", groesse: "Size", rundung: "Corners", dichte: "Density",
      vollbild: "Fullscreen", theme: "Theme", themeHilfe: "Applies to every device you are signed in on.",
      sicherungen: "Earlier versions", keineSicherungen: "None yet. HATS keeps one before every overwrite.",
      zurueck: "Restore", zurueckGeholt: (zeit) => `The version from ${zeit} is back.`,
      eigene: "None of the presets - adjusted in the panel.",
      vorlagen: { karten: "Cards", oberflaeche: "Interface", hintergrund: "Background", weitere: "More" },
      uixHinweis: "Works only with UI eXtension, and each template applies to light and dark alike. Your own CSS in the same style target stays when you switch.",
      zeit: (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)} ${k.slice(9, 11)}:${k.slice(11, 13)}:${k.slice(13, 15)}`,
    },
    transparenz: "Transparency",
    schrift: "Text size",
    deckend: "opaque",
    nurHier: (modus) => `Applies in ${modus === "dark" ? "dark" : "light"} mode - the theme keeps the two apart.`,
    ohneUnschaerfe: "The theme has no blur (--ha-card-backdrop-filter). The cards only get paler, not frosted.",
    kachelnKurz: "Above 100 %, Home Assistant's tiles cut long names short sooner.",
    mushFest: (wert) => `Mushroom is fixed at ${wert} and does not grow with it.`,
    regler: { drift: "Drift", punkte: "Colour dots", farbe: "Colour shift", weite: "Range" },
    aus: "off",
    kreis: "full circle",
    laedt: "Reading the theme …",
    speichert: "Saving …",
    gespeichert: (name) => `Saved to ${name}.yaml.`,
    nichtGespeichert: "Not saved",
    punkteNur: "Only with a background made of colour dots.",
    weiteNur: "Only with colour shift.",
    grund: {
      admin: () => "The slider writes the theme file. Only an administrator may do that.",
      ohneDatei: (name) => `There is no file ${name}.yaml in the themes folder for the theme "${name}".`,
      unlesbar: (was) => `The theme file cannot be read: ${was}`,
      unklar: (n) => `${n} line(s) of the theme file cannot be placed. Writing would lose them.`,
      name: (name) => `The file holds the theme "${name}", not the active one.`,
      fremd: () => "The theme was not created with HATS. A theme belongs to one tool.",
      keineFlaeche: () => "The theme sets no card surface (--ha-card-background).",
      form: (wert) => `The card surface is not a plain colour: ${wert}`,
      skala: (wert) => `The font scale (--ha-font-size-scale) is not a number: ${wert}`,
      wechsel: (name) => `The theme "${name}" is active now. Please open again.`,
      unschaerfe: (wert) => `The blur is not a plain filter: ${wert}`,
      teil: (was) => `Unknown part: ${was}`,
      bild: (was) => `Not an image from /local/hats: ${was}`,
    },
    nurKurzform: "The badge only takes `controls` - targets and switches belong in the card.",
    wahl: {
      theme: "theme radius", pill: "fully round",
      small: "small", normal: "normal", large: "large",
      never: "never", narrow: "when it gets narrow", always: "always",
      sensor: "the temperature sensor", weather: "the weather entity",
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
  bewegung: "mdi:motion-play-outline",
  darstellung: "mdi:tune-variant",
  alles: "mdi:cog-outline",
  // Dieselben Symbole wie in HAs Kopfzeile.
  seitenleiste: "mdi:menu",
  assist: "mdi:comment-processing-outline",
  bearbeiten: "mdi:pencil",
  zu: "mdi:close",
  aussehen: "mdi:palette-swatch-outline",
  hintergrund: "mdi:image-outline",
  schrift: "mdi:format-size",
  uix: "mdi:auto-fix",
  anzeige: "mdi:monitor",
};

// Die Funktionen, die ein Fenster aufklappen, und unter welchem Namen das Feld
// dann offen ist. Alle nur in der Karte - das Badge bleibt die kleine Form.
// "settings" ist das eine Fenster fuer alles: Auf Ansage vom 14.10.2026
// ("in der menueleiste nur ein icon machen und der rest in einem fenster")
// steht am Rand der Leiste ein Knopf statt vier.
const REGLER = { motion: "bewegung", appearance: "darstellung" };

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

// Der naechste Schritt, wenn die Reihe nicht in die Karte passt - oder null,
// wenn es keinen mehr gibt. Erst die Ziele ins Menue, dann vom rechten Ende
// her die Knoepfe am Rand. Ohne Ziele kommt mit dem Menue gleich der erste.
//
// "nie" heisst nie: Wer das Einklappen abgestellt hat, bekommt eine Reihe,
// die rollt, statt einer, die ihm Knoepfe wegnimmt.
export function mehrInDieListe(plan, einstellung, einklappbar) {
  if (!einklappbar || einstellung.einklappen === "never") return null;
  const kn = einstellung.knoepfe;
  if (!plan.zu && kn.some((k) => !k.align_end && k.function !== "sidebar")) return { zu: true, weg: plan.weg };
  if (plan.weg < kn.filter((k) => k.align_end).length) return { zu: true, weg: plan.weg + 1 };
  return null;
}

// Welche Knoepfe in der Liste stehen: eingeklappt die Ziele, dazu die letzten
// `weg` am Rand. Der Knopf der Seitenleiste nie - er ersetzt HAs Menueknopf
// und muss immer zu sehen sein.
export function inDieListe(knoepfe, zu, weg) {
  if (!zu) return new Set();
  const amEnde = geordnet(knoepfe).filter((k) => k.align_end);
  return new Set([...knoepfe.filter((k) => !k.align_end && k.function !== "sidebar"),
    ...amEnde.slice(amEnde.length - weg)]);
}

// Das Badge liest NUR die Kurzform. Was hier herauskommt, geht an
// pruefeConfig - Ziele, Schalter und die Einstellungen der Leiste kommen
// dabei gar nicht erst an.
//
// `buttons` ist im Badge ein Fehler und kein stilles Nichts: Ein Feld, das
// angenommen und nie gelesen wird, saehe aus wie ein Badge, das nicht tut,
// was man eingestellt hat.
//
// MIT EINER AUSNAHME, und die habe ich selbst verursacht: Am Abend des
// 13.10.2026 legte der Waehler dem Badge eine knappe Stunde lang
//
//     buttons: [{ function: mode }, { function: fullscreen }]
//
// an statt `controls`. Der Maintainer hat in der Zeit ein Badge angelegt, und
// als das Badge `buttons` danach abwies, stand dort eine Fehlermeldung statt
// des Badges. Genau diese Form - nur Bedienteile, nichts sonst - meint dasselbe
// wie die Kurzform und wird als sie gelesen.
export function badgeKurzform(config) {
  let controls = config?.controls;
  const knoepfe = config?.buttons;
  if (knoepfe !== undefined) {
    const nurBedienteile = Array.isArray(knoepfe) && knoepfe.every((b) =>
      b && typeof b === "object" && BEDIENTEILE.includes(b.function)
      && Object.keys(b).every((feld) => feld === "function"));
    if (!nurBedienteile) throw new Error(TEXTE[sprache()].nurKurzform);
    controls = knoepfe.map((b) => b.function);
  }
  return { controls, kiosk_only: config?.kiosk_only };
}

// Wer HAs Kopfzeile ersetzt, nimmt ihren Menueknopf und ihren Stift mit weg.
// Am Telefon ist der Menueknopf der einzige Weg in die Seitenleiste und damit
// zu den Einstellungen; ohne Stift kaeme niemand mehr in den
// Bearbeitungsmodus. Beide kommen deshalb von selbst dazu, wenn die Leiste sie
// nicht schon hat. Der Stift entfaellt mit dem Einstellungsfenster: Dort steht
// er.
export function mitKopfKnoepfen(knoepfe, kopf) {
  if (!kopf) return knoepfe;
  const hat = (f) => knoepfe.some((k) => k.function === f);
  const vorn = hat("sidebar") ? [] : [{ ...einKnopf({ function: "sidebar" }, -1), auto: true }];
  const hinten = hat("edit") || hat("settings")
    ? [] : [{ ...einKnopf({ function: "edit", align_end: true }, -1), auto: true }];
  // Neu gezaehlt: Die Kapsel findet ihren Knopf ueber index, und index ist
  // die Stelle in DIESER Liste. Ohne das sass sie am 14.10.2026 einen Knopf
  // zu weit rechts - auf dem Zahnrad statt auf "Eigene".
  return [...vorn, ...knoepfe, ...hinten].map((k, index) => ({ ...k, index }));
}

export function pruefeConfig(config) {
  const kopf = config?.replace_header === true;
  return {
    knoepfe: mitKopfKnoepfen(leseKnoepfe(config), kopf),
    kopf,
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

// ---- Bewegung des Hintergrunds ----------------------------------------------
//
// Auf Ansage vom 13.10.2026: "die soll dafuer gleich ein slider dafuer
// einbauen" - und auf die Frage, ob er dauerhaft gelten soll oder nur bis zum
// Neuladen: "soll dauerhaft gelten."
//
// Dauerhaft heisst: Die Bewegung steht als CSS im Stilziel uix-root IN DER
// THEME-DATEI, und die Leiste schreibt sie dorthin. Sie ist damit das erste
// Bauteil ausserhalb des Panels, das eine Theme schreibt. Drei Regeln folgen
// daraus, jede aus einer Stelle, an der HATS oder HATG schon einmal bezahlt hat:
//
// 1. MIT DEM CODE DES PANELS, NICHT MIT EINEM ZWEITEN. Die Leiste laedt
//    theme.js und hintergrund.js nach und ruft, was das Panel ruft. In der
//    Datei steht dann derselbe Block mit denselben Markern, und das Panel
//    liest ihn wieder. Ein eigener Schreiber waere ein zweiter Ort, an dem
//    dieselbe Sache steht.
// 2. LESEN DIREKT VOR JEDEM SCHREIBEN. Die Leiste haelt kein Modell. Jedes
//    Speichern holt die Datei neu und aendert nur den einen Block.
// 3. NUR SCHREIBEN, WENN NICHTS VERLOREN GEHEN KANN. Eine Datei, die sich
//    nicht ganz lesen laesst, die nicht von HATS stammt oder eine andere Theme
//    traegt als die wirksame, wird nicht angefasst - mit dem Grund im Regler.
//
// Was die Leiste NICHT loesen kann: Hat das Panel dieselbe Theme offen und
// speichert spaeter, gewinnt sein Stand. Das Panel weiss nicht, dass die Datei
// sich geaendert hat.

// Das Raster des Ausschlags, wie im Panel (hintergrund-seite.js). Ein Test
// vergleicht die beiden.
export const AUSSCHLAEGE = [20, 40, 60, 90, 180, 360];

const BEWEGUNG_AUS = { drift: 0, punkte: 0, farbe: 0, weite: 40 };
// Dieselbe Zeichenfolge, an der der Server eine HATS-Datei erkennt.
const HATS_MARKE = "Erzeugt mit HATS ";

// Die Module erst laden, wenn jemand den Regler oeffnet - wer nur ein Menue
// hat, laedt sie nie. Relativ zur Leiste selbst: Seit 0.2.0b5 steht die
// Pruefsumme im PFAD, die Nachbarn liegen also unter derselben Summe und
// koennen nicht aelter sein als sie.
let werkzeugLaden = null;

function ladeWerkzeug() {
  werkzeugLaden ??= Promise.all([
    import(new URL("./theme.js", import.meta.url).href),
    import(new URL("./hintergrund.js", import.meta.url).href),
    import(new URL("./baukasten.js", import.meta.url).href),
    import(new URL("./hintergrund-seite.js", import.meta.url).href),
    import(new URL("./vorlagen.js", import.meta.url).href),
  ]).then((module) => Object.assign({}, ...module), (fehler) => {
    // Ein gescheitertes Laden nicht merken - der naechste Versuch darf gelingen.
    werkzeugLaden = null;
    throw fehler;
  });
  return werkzeugLaden;
}

// Aus dem Text der Theme-Datei: die vier Werte, und ob sie sich schreiben
// laesst. `w` sind die Funktionen aus theme.js und hintergrund.js - hereingereicht,
// damit ein Test dieselbe Strecke ohne Browser fahren kann.
//
//   zurueck  { grund, detail }               nicht anfassen
//            { modell, werte, punktebild }   lesbar und schreibbar
// Was fuer jeden Regler gilt, bevor er die Datei anfasst.
function pruefeDatei(text, themeName, w) {
  const m = w.leseTheme(text);
  if (m.fehler) return { grund: "unlesbar", detail: m.fehler };
  // Eine Zeile, die der Leser nicht einordnen kann, fehlte nach dem Schreiben.
  if (m.unklar?.length) return { grund: "unklar", detail: m.unklar.length };
  if (m.name !== themeName) return { grund: "name", detail: m.name };
  if (!m.kopf?.some((zeile) => zeile.startsWith(HATS_MARKE))) return { grund: "fremd" };
  return { modell: m };
}

export function leseBewegungAusDatei(text, themeName, w) {
  const stand = pruefeDatei(text, themeName, w);
  if (stand.grund) return stand;
  const m = stand.modell;

  // Die Punkte einzeln zu bewegen geht nur auf einem Bild aus Farbpunkten - in
  // JEDEM Modus, in dem ein Hintergrund gesetzt ist. Dieselbe Frage stellt
  // bewegungNachBild() im Panel.
  const bilder = [m.flach, m.light, m.dark]
    .map((ebene) => ebene["lovelace-background"])
    .filter((wert) => typeof wert === "string" && wert.trim());
  return {
    modell: m,
    werte: w.leseBewegung(m.flach[`uix-${w.HINTERGRUND_ZIEL}`]) ?? { ...BEWEGUNG_AUS },
    punktebild: bilder.length > 0 && bilder.every(w.istPunkteBild),
  };
}

// Der neue Text der Datei mit diesen vier Werten. Geaendert wird nur der eine
// Block; alles andere geht durch leseTheme und schreibeTheme, wie es das Panel
// auch taete.
//
//   zurueck  { grund, detail }   wie oben
//            { yaml, werte }     werte sind die, die wirklich geschrieben wurden
export function schreibeBewegungInDatei(text, themeName, werte, w) {
  const stand = leseBewegungAusDatei(text, themeName, w);
  if (stand.grund) return stand;
  const vorlage = w.bewegung(werte, { punkte: stand.punktebild });
  // Alles auf null heisst: der Block geht ganz. Ein leerer bliebe als Ballast
  // in der Datei, und UIX legte dafuer trotzdem einen Knoten an.
  if (vorlage) w.vorlageAn(stand.modell, vorlage);
  else w.vorlageAus(stand.modell, { id: w.BEWEGUNG_ID, ziel: w.HINTERGRUND_ZIEL });
  return {
    yaml: w.schreibeTheme(stand.modell),
    werte: vorlage ? vorlage.einstellung : { ...BEWEGUNG_AUS, weite: werte.weite ?? BEWEGUNG_AUS.weite },
    punktebild: stand.punktebild,
  };
}

// Der Ausschlag liegt auf einem Raster. Ein Wert aus der Datei, der daneben
// liegt, zeigt auf die naechste Stelle.
export function ausschlagStelle(grad) {
  let beste = 0;
  AUSSCHLAEGE.forEach((g, i) => {
    if (Math.abs(g - grad) < Math.abs(AUSSCHLAEGE[beste] - grad)) beste = i;
  });
  return beste;
}

// ---- Transparenz und Schrift ----------------------------------------------
//
// Zwei gewoehnliche Theme-Felder statt eines Blocks, der HATS gehoert:
// --ha-card-background und --ha-font-size-scale. Beide stehen auch im Panel.
// Daraus folgen die zwei Regeln hier:
//
// - Geschrieben wird NUR das Feld, an dem gezogen wurde. Was das Panel am
//   anderen inzwischen geaendert hat, bleibt.
// - Geschrieben wird dort, wo der Wert schon steht. Flach oder je Modus ist
//   eine Wahl im Panel; die Karte trifft sie nicht neu. Steht die Kartenflaeche
//   je Modus, aendert der Regler den geltenden - hell und dunkel brauchen
//   verschiedene Deckkraft (glaswerk: 0,42 und 0,46).

// Prozent. Transparenz 80 heisst Deckkraft 0,20; die Schrift ist der Faktor
// der Skala.
//
// Eine Schwelle, ab der HAs Kacheln Namen abschneiden, gibt es nicht. Am
// 14.10.2026 an 161 px breiten Kacheln gemessen: "Living Room Fan" war schon
// bei 90 % gekuerzt, "Ceiling Lights" ab 110 %. Es haengt an Breite und Name;
// der Hinweis sagt deshalb nur "frueher", sobald es ueber 100 % geht.
export const TRANSPARENZ = { min: 0, max: 80, schritt: 2 };
export const SCHRIFT = { min: 90, max: 120, schritt: 5 };
// Pixel der Weichzeichnung. glaswerk steht auf 26.
export const UNSCHAERFE_SPANNE = { min: 0, max: 40, schritt: 2 };

const FLAECHE = "ha-card-background";
const UNSCHAERFE = "ha-card-backdrop-filter";
const SKALA = "ha-font-size-scale";

// --ha-font-size-scale multipliziert HAs ganze Leiter; Kachel und Bubble
// folgen, Mushroom nicht - es rechnet mit eigenen 14px und 12px
// (mushroom-light-card, am 14.10.2026 aus elementStyles gelesen). Diese zwei
// Stufen der Leiter SIND bei Skala 1 genau diese Werte und wachsen danach mit.
// Einmal geschrieben, folgt Mushroom dem einen Feld; ein Wert, der schon
// steht, bleibt stehen.
export const MUSHROOM_SCHRIFT = {
  "mush-card-primary-font-size": "var(--ha-font-size-m)",
  "mush-card-secondary-font-size": "var(--ha-font-size-s)",
};

const zahlText = (x) => String(Math.round(x * 100) / 100);

// Die Weichzeichnung steht als Filterkette im Feld, glaswerk etwa
// "blur(26px) saturate(180%)". Gestellt wird nur die Zahl im blur(); was
// sonst in der Kette steht, bleibt. Ein var() laesst sich nicht stellen, ohne
// zu raten - dann ist der Regler gesperrt.
const BLUR = /blur\(\s*(\d+(?:\.\d+)?)px\s*\)/;

export function leseUnschaerfe(wert) {
  const s = String(wert ?? "").trim();
  if (s.includes("var(")) return null;
  const m = BLUR.exec(s);
  return m ? Number(m[1]) : 0;
}

export function mitUnschaerfe(wert, px) {
  const s = String(wert ?? "").trim();
  if (BLUR.test(s)) return s.replace(BLUR, `blur(${zahlText(px)}px)`);
  if (s === "" || s === "none") return px > 0 ? `blur(${zahlText(px)}px)` : "none";
  return px > 0 ? `blur(${zahlText(px)}px) ${s}` : s;
}

// Eine einfache Farbe als Rot, Gruen, Blau und Deckkraft - oder null. Den
// Kartenstil "Liquid Glass" legt HATS als zwei Verlaeufe ab; die vierte Zahl
// darin zu ersetzen zerlegte ihn. Ein var() oder ein Farbname laesst sich
// genauso wenig durchsichtiger machen, ohne zu raten.
export function leseFarbe(wert) {
  const s = String(wert ?? "").trim().toLowerCase();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const zahl = "(\\d{1,3}(?:\\.\\d+)?)";
  const alpha = "(\\d*\\.?\\d+%?)";
  const m = s.match(new RegExp(`^rgba?\\(\\s*${zahl}\\s*,\\s*${zahl}\\s*,\\s*${zahl}\\s*(?:,\\s*${alpha}\\s*)?\\)$`))
    || s.match(new RegExp(`^rgba?\\(\\s*${zahl}\\s+${zahl}\\s+${zahl}\\s*(?:\\/\\s*${alpha}\\s*)?\\)$`));
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if ([r, g, b].some((x) => x > 255)) return null;
  const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  if (!(a >= 0 && a <= 1)) return null;
  return { r, g, b, a };
}

// Immer in der Form, in der Panel und Baukasten sie schreiben. Aus #rrggbb
// wird beim ersten Mal ein rgba() - danach bleibt die Datei stabil.
export function mitDeckkraft(farbe, a) {
  return `rgba(${farbe.r}, ${farbe.g}, ${farbe.b}, ${zahlText(a)})`;
}

// Woher ein Feld im geltenden Modus kommt: aus dem Block des Modus, sonst flach.
function ebeneVon(m, name, modus) {
  if (m[modus]?.[name] !== undefined) return modus;
  if (m.flach[name] !== undefined) return "flach";
  return null;
}

const blockVon = (m, ebene) => (ebene === "flach" ? m.flach : m[ebene]);

// Was die zwei Regler zeigen, und ob sie sich ziehen lassen. Gesperrt wird je
// Regler: Eine Kartenflaeche aus Verlaeufen sperrt die Transparenz, die
// Schrift bleibt frei.
//
//   zurueck  { grund, detail }                    die Datei nicht anfassen
//            { modell, karte, schrift, werte }    werte in Prozent, wie die Regler
export function leseDarstellungAusDatei(text, themeName, modus, w) {
  const stand = pruefeDatei(text, themeName, w);
  if (stand.grund) return stand;
  const m = stand.modell;
  const gilt = w.wirksam(m, modus);

  const karte = { ebene: ebeneVon(m, FLAECHE, modus) };
  const farbe = leseFarbe(gilt[FLAECHE]);
  if (!karte.ebene) karte.grund = "keineFlaeche";
  else if (!farbe) Object.assign(karte, { grund: "form", detail: gilt[FLAECHE] });
  else karte.deckkraft = farbe.a;
  // Ohne Weichzeichnung wird eine durchscheinende Karte nur blasser. HA setzt
  // das Feld selbst nirgends - fehlt es in der Theme, zeichnet nichts weich.
  const weich = String(gilt[UNSCHAERFE] ?? "").trim();
  karte.weich = weich !== "" && weich !== "none";
  const unschaerfe = { ebene: ebeneVon(m, UNSCHAERFE, modus), px: leseUnschaerfe(gilt[UNSCHAERFE]) };
  if (unschaerfe.px === null) Object.assign(unschaerfe, { grund: "unschaerfe", detail: gilt[UNSCHAERFE] });

  const schrift = { ebene: ebeneVon(m, SKALA, modus) ?? "flach", faktor: 1 };
  if (gilt[SKALA] !== undefined) {
    const f = Number(String(gilt[SKALA]).trim());
    if (Number.isFinite(f) && f > 0) schrift.faktor = f;
    else Object.assign(schrift, { grund: "skala", detail: gilt[SKALA] });
  }
  // Ein Mushroom-Feld, das nicht an der Leiter haengt, waechst nicht mit.
  schrift.mushFest = Object.keys(MUSHROOM_SCHRIFT).map((n) => gilt[n])
    .find((v) => v !== undefined && !/--ha-font-size-/.test(v)) ?? null;

  return {
    modell: m, karte, schrift, unschaerfe,
    werte: {
      transparenz: karte.deckkraft === undefined ? null : Math.round((1 - karte.deckkraft) * 100),
      schrift: Math.round(schrift.faktor * 100),
      unschaerfe: unschaerfe.px ?? 0,
    },
  };
}

// Der neue Text der Datei. werte traegt nur, was geschrieben werden soll -
// { transparenz } oder { schrift } oder beides, in Prozent.
//
//   zurueck  { grund, detail }   wie oben
//            { yaml }
export function schreibeDarstellungInDatei(text, themeName, modus, werte, w) {
  const stand = leseDarstellungAusDatei(text, themeName, modus, w);
  if (stand.grund) return stand;
  const m = stand.modell;
  if (werte.transparenz !== undefined) {
    if (stand.karte.grund) return { grund: stand.karte.grund, detail: stand.karte.detail };
    const block = blockVon(m, stand.karte.ebene);
    block[FLAECHE] = mitDeckkraft(leseFarbe(block[FLAECHE]), 1 - werte.transparenz / 100);
  }
  if (werte.schrift !== undefined) {
    if (stand.schrift.grund) return { grund: stand.schrift.grund, detail: stand.schrift.detail };
    blockVon(m, stand.schrift.ebene)[SKALA] = zahlText(werte.schrift / 100);
    const gilt = w.wirksam(m, modus);
    for (const [name, wert] of Object.entries(MUSHROOM_SCHRIFT)) {
      if (gilt[name] === undefined) m.flach[name] = wert;
    }
  }
  if (werte.unschaerfe !== undefined) {
    const u = stand.unschaerfe;
    if (u.grund) return { grund: u.grund, detail: u.detail };
    // Fehlt das Feld und soll es bei null bleiben, wird nichts geschrieben -
    // sonst stuende ein "none" in der Datei, das vorher niemand wollte.
    if (u.ebene || werte.unschaerfe > 0) {
      const block = blockVon(m, u.ebene ?? "flach");
      block[UNSCHAERFE] = mitUnschaerfe(block[UNSCHAERFE], werte.unschaerfe);
    }
  }
  return { yaml: w.schreibeTheme(m) };
}

// ---- Alle Regler zusammen -------------------------------------------------
//
// Die beiden Gruppen liegen in derselben Datei. Das Fenster liest sie in
// einem Zug und schreibt in einem Zug - aber nur die Gruppe, an der gezogen
// wurde: Der Bewegungsblock wird nicht neu geschrieben, weil jemand die
// Transparenz verstellt hat.

export const BEWEGUNG_REGLER = ["drift", "punkte", "farbe", "weite"];
export const DARSTELLUNG_REGLER = ["transparenz", "schrift", "unschaerfe"];

const nurDie = (werte, namen) => Object.fromEntries(namen.filter((n) => n in werte).map((n) => [n, werte[n]]));

//   art      "bewegung" | "darstellung" | "alles"
//   zurueck  { grund, detail }   oder alles, was die Regler zeigen
export function leseReglerAusDatei(text, themeName, modus, art, w) {
  if (art === "bewegung") return leseBewegungAusDatei(text, themeName, w);
  if (art === "darstellung") return leseDarstellungAusDatei(text, themeName, modus, w);
  const b = leseBewegungAusDatei(text, themeName, w);
  if (b.grund) return b;
  const d = leseDarstellungAusDatei(text, themeName, modus, w);
  return { punktebild: b.punktebild, karte: d.karte, schrift: d.schrift, unschaerfe: d.unschaerfe,
    werte: { ...b.werte, ...d.werte } };
}

//   geaendert  die Namen der Regler, an denen gezogen wurde
//   zurueck    { grund, detail }   oder { yaml }
export function schreibeReglerInDatei(text, themeName, modus, werte, geaendert, w) {
  const namen = [...geaendert];
  let yaml = text;
  if (namen.some((n) => BEWEGUNG_REGLER.includes(n))) {
    const stand = schreibeBewegungInDatei(yaml, themeName, nurDie(werte, BEWEGUNG_REGLER), w);
    if (stand.grund) return stand;
    yaml = stand.yaml;
  }
  const dargestellt = nurDie(werte, namen.filter((n) => DARSTELLUNG_REGLER.includes(n)));
  if (Object.keys(dargestellt).length) {
    const stand = schreibeDarstellungInDatei(yaml, themeName, modus, dargestellt, w);
    if (stand.grund) return stand;
    yaml = stand.yaml;
  }
  return { yaml };
}

// ---- Das Einstellungsfenster: was es liest und schreibt -------------------
//
// Die Teile des Baukastens, mit den Funktionen des Panels: erkenneTeil sagt,
// welches gerade sitzt, teilAnwenden setzt eines. Das Fenster rechnet nichts
// selbst - eine Palette sieht hier aus und wirkt wie im Panel, weil es
// dieselbe Strecke ist.

export const FENSTER_SORTEN = ["palette", "karten", "schrift", "rundung", "dichte", "hintergrund"];

// Alles, was das Fenster zeigt: die Regler wie im Fenster "alles", dazu
// welches Teil je Sorte sitzt und welcher Hintergrund im geltenden Modus steht.
export function leseFensterAusDatei(text, themeName, modus, w) {
  const alles = leseReglerAusDatei(text, themeName, modus, "alles", w);
  if (alles.grund) return alles;
  const m = w.leseTheme(text);
  const lies = (name, ebene) => {
    const k = name.replace(/^--/, "");
    return ebene === "beide" ? m.flach[k] : m[ebene]?.[k];
  };
  const sitzt = Object.fromEntries(FENSTER_SORTEN.map((s) => [s, w.erkenneTeil(s, lies)]));
  // Welche UIX-Vorlagen im Theme stehen - am Marker erkannt, wie im Panel.
  const vorlagen = Object.fromEntries((w.VORLAGEN ?? []).map((v) => [v.id, w.vorlageIstAn(m, v)]));
  return { ...alles, sitzt, vorlagen, bild: w.wirksam(m, modus)["lovelace-background"] ?? "" };
}

// Ein Teil setzen - so, wie das Panel es tut: ein leerer Wert nimmt das Feld
// heraus, statt ein leeres hineinzuschreiben, und ein neuer Hintergrund zieht
// die Bewegung nach (hintergrundGewaehlt).
export function schreibeTeilInDatei(text, themeName, sorte, teilId, w) {
  const stand = pruefeDatei(text, themeName, w);
  if (stand.grund) return stand;
  const teil = FENSTER_SORTEN.includes(sorte) ? w.BAUKASTEN?.[sorte]?.teile?.find((t) => t.id === teilId) : null;
  if (!teil) return { grund: "teil", detail: `${sorte}/${teilId}` };
  const m = stand.modell;
  w.teilAnwenden(sorte, teil, (name, wert, ebene) => {
    const k = name.replace(/^--/, "");
    if (wert === "" || wert === null || wert === undefined) w.entferne(m, k);
    else w.setze(m, k, wert, ebene);
  });
  if (sorte === "hintergrund") w.hintergrundGewaehlt(m);
  return { yaml: w.schreibeTheme(m) };
}

// Nur Bilder, die Home Assistant selbst unter /local/hats ausliefert - eine
// Adresse, die nur HATS kennt, machte die Theme unuebertragbar. Und nichts,
// was aus dem url() ausbrechen koennte.
export const BILD_ADRESSE = /^\/local\/hats\/[A-Za-z0-9._-]+$/;

export function bildWert(url, w) {
  return w.stelleFest(`url(${url}) center / cover no-repeat`, true);
}

// Ein eigenes Bild als Hintergrund, fuer hell und dunkel zugleich - ein
// Hintergrundbild wie am Mac. Fest am Fenster, wie jeder Hintergrund des
// Baukastens.
export function schreibeBildInDatei(text, themeName, url, w) {
  if (!BILD_ADRESSE.test(String(url))) return { grund: "bild", detail: url };
  const stand = pruefeDatei(text, themeName, w);
  if (stand.grund) return stand;
  const m = stand.modell;
  const wert = bildWert(url, w);
  w.setze(m, "lovelace-background", wert, "light");
  w.setze(m, "lovelace-background", wert, "dark");
  w.hintergrundGewaehlt(m);
  return { yaml: w.schreibeTheme(m) };
}

// Die UIX-Vorlagen im Fenster. Auf Ansage vom 15.10.2026: "koennten wir hier
// auch die uix tweaks einbinden".
//
// Gegliedert nach den Sorten des Baukastens (SORTEN_VORLAGEN), nicht nach den
// Gruppen der Vorlagen: "Karten", "Oberflaeche" und "Hintergrund" sagen auf
// dem Tablett, WO etwas wirkt; "Liquid Glass" und "Gleichziehen" nicht. Eine
// Vorlage ohne Sorte faellt nicht weg, sie steht unter "weitere" - sonst
// verschwaende sie still, sobald vorlagen.js eine neue bekommt.
export const FENSTER_VORLAGEN_SORTEN = ["karten", "oberflaeche", "hintergrund"];

export function vorlagenFuersFenster(w) {
  const alle = w.VORLAGEN ?? [];
  const sorten = w.SORTEN_VORLAGEN ?? {};
  const vergeben = new Set(FENSTER_VORLAGEN_SORTEN.flatMap((s) => sorten[s] ?? []));
  const gruppen = FENSTER_VORLAGEN_SORTEN.map((sorte) => ({
    sorte, vorlagen: (sorten[sorte] ?? []).map((id) => alle.find((v) => v.id === id)).filter(Boolean),
  }));
  gruppen.push({ sorte: "weitere", vorlagen: alle.filter((v) => !vergeben.has(v.id)) });
  return gruppen.filter((g) => g.vorlagen.length);
}

// Eine Vorlage an- oder abschalten, mit dem Code des Panels: vorlageAn haengt
// den Block an (eigenes CSS daneben bleibt), vorlageAus nimmt nur ihn heraus.
// Geschrieben wird ueber schreibeTheme - nur so setzt uixSchalterSetzen das
// Feld uix-theme, ohne das UIX keine einzige Vorlage anwendet.
export function schreibeVorlageInDatei(text, themeName, id, an, w) {
  const vorlage = (w.VORLAGEN ?? []).find((v) => v.id === id);
  if (!vorlage) return { grund: "teil", detail: `uix/${id}` };
  const stand = pruefeDatei(text, themeName, w);
  if (stand.grund) return stand;
  const m = stand.modell;
  // Schon so, wie gewuenscht: nichts schreiben. Ein erneutes vorlageAn wuerde
  // den Block ans Ende des Felds ruecken und die Datei aendern.
  if (w.vorlageIstAn(m, vorlage) === Boolean(an)) return { yaml: text };
  if (an) w.vorlageAn(m, vorlage);
  else w.vorlageAus(m, vorlage);
  return { yaml: w.schreibeTheme(m) };
}

export function aktuellerModus(hass) {
  return hass?.themes?.darkMode ? "dark" : "light";
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

// Mehrere Leisten auf einer Ansicht: Jede sagt nur fuer sich, ob die
// Kopfzeile weg soll, und weg ist sie, solange EINE es will. Am 14.10.2026 so
// gesehen: Auf /hats-test/eigene stand neben der Leiste mit replace_header
// eine kleine Steuerkarte mit Vollbild - und die blendete die Kopfzeile bei
// jedem Durchlauf wieder ein, weil bei IHR kein Vollbild an war.
const KOPF_WUENSCHE = new WeakMap();

// Das Ziel wird gemerkt: Ausgehaengt findet der Weg nach oben nichts mehr, und
// genau dann muss eine Leiste ihren Wunsch zuruecknehmen.
function kopfzeile(leiste, verstecken) {
  const ziel = kopfWirt(leiste) ?? leiste._kopfZiel;
  if (!ziel) return;
  leiste._kopfZiel = ziel;
  let wuensche = KOPF_WUENSCHE.get(ziel.wurzel);
  if (!wuensche) KOPF_WUENSCHE.set(ziel.wurzel, (wuensche = new Set()));
  if (verstecken && leiste.isConnected !== false) wuensche.add(leiste);
  else wuensche.delete(leiste);
  for (const l of wuensche) if (l.isConnected === false) wuensche.delete(l);
  const soll = wuensche.size > 0 && !wirdBearbeitet();
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

  .liste, .regler { display: none; }
  [hidden] { display: none !important; }
  /* Der Inhalt der Karte - bei jeder neuen Breite neu gebaut. Das
     Einstellungsfenster steht daneben und uebersteht das. */
  .inhalt { display: contents; }
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

  /* Ersetzt die Leiste HAs Kopfzeile, wird ha-card fest, sobald der Wirt oben
     hinausrollt - an derselben Stelle und in derselben Ebene wie die
     Kopfzeile (z-index 4, gemessen). Der Wirt bleibt im Raster. */
  :host([fest]) ha-card {
    position: fixed; z-index: 4; box-sizing: border-box;
    top: var(--safe-area-inset-top, 0px); left: var(--_fest-links); width: var(--_fest-breite);
    /* ha-card nimmt sonst height: 100% - fest heisst das: des Fensters. Am
       14.10.2026 so gesehen, eine Glasflaeche ueber dem ganzen Bildschirm. */
    height: auto;
  }

  /* Eingeklappt: die Ziele haengen als Liste unter dem Menueknopf. Offen
     braucht die Karte Luft nach unten und muss ueber den Karten danach liegen. */
  :host([offen]) { position: relative; z-index: 4; }
  :host([offen]) ha-card { overflow: visible; }
  .pfeil { --mdc-icon-size: 16px; }
  :host([offen="liste"]) .liste {
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

  /* Die Regler fuer Bewegung, Transparenz und Schrift. Der Schieber ist der
     des Browsers, gefaerbt mit accent-color - wie die Knoepfe aus button
     gebaut sind statt aus einem Bauteil, das vielleicht nicht angemeldet ist. */
  :host([offen="bewegung"]) .regler, :host([offen="darstellung"]) .regler {
    display: flex; flex-direction: column; gap: var(--ha-space-2, 8px);
    position: absolute; z-index: 5; top: calc(100% + var(--ha-space-3, 12px));
    width: min(340px, 100%); box-sizing: border-box; padding: var(--ha-space-3, 12px);
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    box-shadow: var(--ha-card-box-shadow, none);
    color: var(--primary-text-color); font-size: var(--ha-font-size-m, 14px);
  }
  .rtitel { font-weight: var(--ha-font-weight-medium, 500); }
  .rzeile {
    display: grid; grid-template-columns: 6.5em 1fr 5.5em;
    align-items: center; gap: var(--ha-space-2, 8px);
  }
  .rzeile input { width: 100%; margin: 0; accent-color: var(--primary-color); }
  .rzeile:has(input:disabled) { color: var(--disabled-text-color); }
  .rwert, .rstatus, .rhinweis {
    color: var(--secondary-text-color); font-size: var(--ha-font-size-s, 12px);
  }
  .rwert { text-align: end; white-space: nowrap; }
  .rhinweis { display: flex; flex-direction: column; gap: var(--ha-space-1, 4px); }

  /* Das Einstellungsfenster. Nach dem Vorbild der macOS-Systemeinstellungen:
     links die Bereiche, rechts Gruppen auf einer etwas abgesetzten Flaeche,
     darin Kacheln mit Bild und Namen. Alle Farben aus HA. Der Schleier ist
     der der Theme (--mdc-dialog-scrim-color); fehlt er, HAs eigener Wert,
     Schwarz bei 25 Prozent. --wa-color-overlay-modal, das HA dafuer
     liest, steht am 14.10.2026 gemessen NICHT auf html - es lebt im Dialog
     selbst, und ein Rueckfall darauf liefe hier ins Leere. */
  dialog.fenster {
    padding: 0; border: none; box-sizing: border-box;
    width: min(880px, calc(100vw - 32px)); height: min(680px, calc(100vh - 32px));
    max-width: none; max-height: none;
    border-radius: var(--ha-card-border-radius, 12px);
    /* Die Flaeche, die die Theme fuer Dialoge vorgibt, mit ihrer
       Weichzeichnung - glaswerk: ein Blau bei 90 Prozent und blur(26px), am
       14.10.2026 gemessen. Auf Ansage: "kannst du da auch die theme farben
       uebernehmen". */
    background: var(--ha-dialog-surface-background, var(--card-background-color));
    backdrop-filter: var(--ha-card-backdrop-filter, none);
    -webkit-backdrop-filter: var(--ha-card-backdrop-filter, none);
    color: var(--primary-text-color);
    box-shadow: var(--ha-card-box-shadow, none);
    font-size: var(--ha-font-size-m, 14px);
  }
  dialog.fenster[open] { display: flex; flex-direction: column; }
  dialog.fenster::backdrop {
    background: var(--mdc-dialog-scrim-color, color-mix(in srgb, var(--black-color, #000) 25%, transparent));
  }
  .fkopf {
    display: flex; align-items: center; gap: var(--ha-space-3, 12px);
    padding: var(--ha-space-3, 12px) var(--ha-space-3, 12px) var(--ha-space-3, 12px) var(--ha-space-4, 16px);
    border-bottom: 1px solid var(--divider-color);
  }
  .ftitel { font-size: var(--ha-font-size-l, 16px); font-weight: var(--ha-font-weight-medium, 500); }
  .fdatei { color: var(--secondary-text-color); font-size: var(--ha-font-size-s, 12px); }
  .fkoerper { flex: 1; min-height: 0; display: grid; grid-template-columns: 210px minmax(0, 1fr); }
  .fnav {
    display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
    padding: var(--ha-space-2, 8px); border-inline-end: 1px solid var(--divider-color);
  }
  .fnavknopf {
    display: flex; align-items: center; justify-content: flex-start; gap: var(--ha-space-2, 8px); width: 100%;
    padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px); border-radius: var(--ha-border-radius-lg, 12px);
    color: var(--primary-text-color); font-size: var(--ha-font-size-m, 14px); text-align: start;
  }
  .fnavknopf ha-icon { --mdc-icon-size: 20px; width: 20px; color: var(--secondary-text-color); }
  .fnavknopf[aria-current="true"] { background: var(--primary-color); color: var(--ha-color-on-primary-loud, #fff); }
  .fnavknopf[aria-current="true"] ha-icon { color: inherit; }
  .fseite {
    overflow-y: auto; padding: var(--ha-space-4, 16px);
    display: flex; flex-direction: column; gap: var(--ha-space-3, 12px);
  }
  .fseite > .rtitel { font-size: var(--ha-font-size-l, 16px); }
  /* Jede Gruppe sieht aus wie eine Karte der Theme. Vorher stand hier HAs
     neutrales --secondary-background-color, ein festes Grau, auf dem Blau von
     glaswerk, die Farbe keiner Theme. */
  .fgruppe {
    display: flex; flex-direction: column; gap: var(--ha-space-3, 12px);
    padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--ha-card-background, var(--card-background-color));
    border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
  }
  .fgtitel { font-weight: var(--ha-font-weight-medium, 500); }
  .fspalte { display: flex; flex-direction: column; gap: var(--ha-space-2, 8px); }
  .fzeile { display: flex; align-items: center; justify-content: space-between; gap: var(--ha-space-3, 12px); }
  .fknopf { align-self: flex-start; }
  .fknopf:not([aria-pressed="true"])::before { background-color: var(--disabled-color); opacity: .2; }
  .fwahl {
    height: var(--_h); padding: 0 var(--ha-space-3, 12px); border-radius: var(--ha-border-radius-lg, 12px);
    border: 1px solid var(--divider-color); background: var(--card-background-color);
    color: var(--primary-text-color); font: inherit;
  }
  .kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: var(--ha-space-3, 12px); }
  .kachel {
    display: flex; flex-direction: column; align-items: stretch; gap: 6px;
    color: var(--secondary-text-color); font-size: var(--ha-font-size-s, 12px);
  }
  .kbild {
    position: relative; display: flex; align-items: center; justify-content: center;
    aspect-ratio: 16 / 10; border-radius: var(--ha-border-radius-lg, 12px); overflow: hidden;
    border: 1px solid var(--divider-color); background: var(--primary-background-color);
  }
  .kbild ha-icon { --mdc-icon-size: 24px; width: 24px; color: var(--primary-text-color); }
  .kachel[aria-pressed="true"] { color: var(--primary-text-color); font-weight: var(--ha-font-weight-medium, 500); }
  .kachel[aria-pressed="true"] .kbild { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .kachel[aria-disabled="true"] { cursor: not-allowed; }
  .kachel:focus-visible .kbild { outline: 2px solid var(--secondary-text-color); outline-offset: 2px; }
  .kname { text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* Die Probe einer Karte: dieselben Felder wie an ha-card, aus dem Teil
     gesetzt - so sieht man Flaeche, Rundung, Rahmen und Schatten, bevor man
     waehlt. Die Dichte zeigt ihre Luecke als Abstand zwischen zwei Proben. */
  .kprobe {
    width: 64%; height: 58%; box-sizing: border-box;
    background: var(--ha-card-background, var(--card-background-color));
    border-radius: var(--ha-card-border-radius, 12px);
    border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
    box-shadow: var(--ha-card-box-shadow, none);
    backdrop-filter: var(--ha-card-backdrop-filter, none);
  }
  .kschrift { font-size: 26px; color: var(--primary-text-color); }
  @media (max-width: 600px) {
    dialog.fenster { width: 100vw; height: 100dvh; border-radius: 0; }
    .fkoerper { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
    .fnav { flex-direction: row; overflow-x: auto; border-inline-end: none; border-bottom: 1px solid var(--divider-color); }
    .fnavknopf { width: auto; white-space: nowrap; }
  }
  .rabschnitt {
    margin-top: var(--ha-space-1, 4px); padding-top: var(--ha-space-2, 8px);
    border-top: 1px solid var(--divider-color);
    color: var(--secondary-text-color); font-size: var(--ha-font-size-s, 12px);
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .rstatus:empty, .rhinweis:empty { display: none; }
  /* Die UIX-Vorlagen: Zeilen mit Schalter, durch Linien getrennt. */
  .vliste { display: flex; flex-direction: column; }
  .vzeile {
    display: flex; align-items: center; justify-content: space-between; gap: var(--ha-space-3, 12px);
    width: 100%; padding: var(--ha-space-2, 8px) 0; text-align: start;
    color: var(--primary-text-color); font-size: var(--ha-font-size-m, 14px);
  }
  .vzeile + .vzeile { border-top: 1px solid var(--divider-color); }
  .vtext { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .vzweck { color: var(--secondary-text-color); font-size: var(--ha-font-size-s, 12px); }
  .vschalter {
    position: relative; flex: none; width: 40px; height: 24px; box-sizing: border-box;
    border-radius: var(--ha-border-radius-pill, 999px);
    background: color-mix(in srgb, var(--disabled-color) 45%, transparent);
    transition: background-color .15s;
  }
  .vschalter::after {
    content: ""; position: absolute; top: 3px; inset-inline-start: 3px; width: 18px; height: 18px;
    border-radius: 50%; background: var(--white-color);
    transition: transform .15s;
  }
  .vzeile[aria-checked="true"] .vschalter { background: var(--primary-color); }
  .vzeile[aria-checked="true"] .vschalter::after { transform: translateX(16px); }
  .vzeile:focus-visible .vschalter { outline: 2px solid var(--secondary-text-color); outline-offset: 2px; }
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
    this._beiAussen = (ev) => { if (!ev.composedPath().includes(this)) this._zu(); };
    this._beiTaste = (ev) => { if (ev.key === "Escape") this._zu(); };
    // Waehrend des Ziehens nur die Anzeige, geschrieben wird beim Loslassen:
    // Jedes Schreiben ist eine Datei und ein Neuladen aller Themes.
    this.shadowRoot.addEventListener("input", (ev) => this._beiRegler(ev, false));
    this.shadowRoot.addEventListener("change", (ev) => {
      // Die Wahl der Theme - derselbe Weg wie die Zeile im Profil: settheme,
      // gemischt in die Wahl, also bleibt der Modus stehen.
      if (ev.target?.dataset?.themeWahl !== undefined) {
        this._sende("settheme", { theme: ev.target.value });
        return;
      }
      this._beiRegler(ev, true);
    });
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
      // Dasselbe gilt fuer das Passen: Als die Karte ihre Breite bekam, waren
      // die Symbole noch nicht gezeichnet, und die Reihe passte. Gemessen am
      // 14.10.2026 - danach lief sie 61 Pixel ueber, und niemand sah nach.
      this._knopfbeobachter = new ResizeObserver(() => {
        this._setzeKapsel();
        this._passeBald();
      });
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
    this._zu();
    // Eine Ansicht ohne die Leiste haette sonst weder Kopfzeile noch Leiste -
    // und keinen Weg mehr hinaus.
    this._klebe(false);
    kopfzeile(this, false);
  }

  // HAs Kopfzeile steht fest oben; wer sie ersetzt, muss das auch. CSS sticky
  // geht nicht: Ein klebendes Element bleibt in seinem Eltern-Element, und das
  // ist hier eine Rasterzelle. Am 14.10.2026 gemessen: Die Seite rollt im
  // Fenster, und ueber der Karte faengt nichts ein position: fixed ab - kein
  // transform, kein filter, kein contain. Also bleibt der Wirt im Raster und
  // haelt den Platz, und nur ha-card wird fest, sobald er oben hinausrollt.
  _klebe(an) {
    if (an && !this._beimRollen) {
      this._beimRollen = () => {
        if (this._rollBild) return;
        this._rollBild = requestAnimationFrame(() => {
          this._rollBild = 0;
          this._kleben();
        });
      };
      window.addEventListener("scroll", this._beimRollen, { passive: true });
      window.addEventListener("resize", this._beimRollen, { passive: true });
    } else if (!an && this._beimRollen) {
      window.removeEventListener("scroll", this._beimRollen);
      window.removeEventListener("resize", this._beimRollen);
      this._beimRollen = null;
    }
    this._kleben();
  }

  _kleben() {
    if (!this.getBoundingClientRect) return;
    const r = this.getBoundingClientRect();
    const fest = Boolean(this._beimRollen) && r.height > 0 && r.top < 0;
    if (fest) {
      // Der Wirt behaelt seine Hoehe, sonst rueckte alles darunter nach.
      if (!this.hasAttribute("fest")) this.style.minHeight = `${r.height}px`;
      this.style.setProperty("--_fest-links", `${r.left}px`);
      this.style.setProperty("--_fest-breite", `${r.width}px`);
    } else if (this.hasAttribute("fest")) {
      this.style.minHeight = "";
    }
    this.toggleAttribute("fest", fest);
  }

  setConfig(config) {
    this._config = this._liesConfig(config);
    // Nur diese Entitaeten loesen ein Zeichnen aus.
    this._beobachtet = [...new Set(this._config.knoepfe
      .flatMap((k) => [k.entity, k.temperature]).filter(Boolean))];
    this._gebaut = null;
    this._plan = null;
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

  // Die Reihe muss in die Karte passen. Am 14.10.2026 im Editor gesehen: Mit
  // neun Knoepfen lief sie 52 Pixel ueber, und der letzte Knopf stand halb
  // hinter dem Rand - erreichbar nur durch seitliches Rollen, und das sah
  // niemand. Passt sie nicht, wandert Schritt fuer Schritt mehr in die Liste
  // unter dem Menueknopf: erst die Ziele, wie "wenn es eng wird" es
  // verspricht, dann vom rechten Ende her die Knoepfe am Rand.
  //
  // Neu geplant wird, wenn sich Breite, Sprache oder Konfiguration aendern -
  // dann von vorn, damit eine breitere Karte auch wieder auslegt. Ein Wert,
  // der breiter wird (die Temperatur), schiebt nur weiter in die Liste.
  _zeichne() {
    if (!this._config || !this._hass) return;
    const spr = sprache(this._hass);
    if (!this._plan || this._plan.spr !== spr || this._plan.breite !== this._breite) {
      this._plan = { spr, breite: this._breite, weg: 0,
        zu: this._einklappbar() && eingeklappt(this._config, this._breite) };
    }
    this._baueNach(this._plan);
    this._stelle(spr);
    this._passe();
  }

  _passe() {
    const plan = this._plan;
    if (!plan) return;
    while (this._laeuftUeber() && this._mehrInListe(plan)) {
      this._baueNach(plan);
      this._stelle(plan.spr);
    }
  }

  // Aus dem Beobachter heraus erst im naechsten Bild: Ein Neubau dort legt
  // neue Knoepfe unter denselben Beobachter, und der meldete sich noch im
  // selben Durchlauf - der Browser bricht das mit einer Fehlermeldung ab.
  _passeBald() {
    if (this._passtBald) return;
    this._passtBald = true;
    requestAnimationFrame(() => {
      this._passtBald = false;
      if (this.isConnected) this._passe();
    });
  }

  // Neu gebaut wird nur, wenn sich der Plan aendert. Sonst wechseln bloss
  // Werte - der Fokus bleibt, wo er ist.
  _baueNach(plan) {
    const marke = `${plan.spr}|${plan.zu}|${plan.weg}`;
    if (this._gebaut === marke) return;
    this._eingeklappt = plan.zu;
    this._weg = plan.weg;
    this._baue(plan.spr);
    this._gebaut = marke;
    this._beobachteKnoepfe();
  }

  // Eine Reihe ohne Breite ist nicht gezeichnet (verdeckt, noch nicht
  // eingehaengt) - dann laesst sich nichts sagen, und es bleibt beim Plan.
  _laeuftUeber() {
    const r = this._reihe;
    return Boolean(r && r.clientWidth > 0 && r.scrollWidth > r.clientWidth + 1);
  }

  _mehrInListe(plan) {
    const naechster = mehrInDieListe(plan, this._config, this._einklappbar());
    if (!naechster) return false;
    Object.assign(plan, naechster);
    return true;
  }

  _baue(spr) {
    const t = TEXTE[spr];
    const c = this._config;
    // Das Einstellungsfenster bleibt offen, waehrend die Leiste neu baut - eine
    // neue Breite (das Vollbild!) baut sie neu, und das Fenster ginge mit.
    if (this.getAttribute("offen") !== "fenster") this._zu();
    if (!this._inhalt) {
      this._stilblatt = document.createElement("style");
      this._inhalt = neu("div", "inhalt");
      this.shadowRoot.append(this._stilblatt, this._inhalt);
    }
    this._stilblatt.textContent = `${STIL_GEMEINSAM}${this._stil()}`;
    this._inhalt.innerHTML = this._rahmen();

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

    // Eingeklappt fuehrt der Menueknopf die Reihe an - nach dem Knopf der
    // Seitenleiste, wie in HAs Kopfzeile. Es sind DIESELBEN Knopfelemente, die
    // in die Liste wandern, kein zweiter Satz: Aktionen, Zustand und
    // Lampenfarbe arbeiten dort weiter, ohne zu wissen, dass sie umgezogen
    // sind. Was ans Ende geschoben ist, bleibt in der Reihe.
    let menueDa = !this._eingeklappt;

    const reihenfolge = geordnet(c.knoepfe);
    const liste = inDieListe(c.knoepfe, this._eingeklappt, this._weg || 0);

    let fueller = false;
    let davor = null;
    for (const k of reihenfolge) {
      if (!menueDa && k.function !== "sidebar") {
        this._menueknopf = this._baueMenueknopf();
        this._reihe.append(this._menueknopf);
        menueDa = true;
      }
      const inListe = liste.has(k);
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
        this._stelleModus(e, t);
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

      if (k.function === "sidebar") {
        this._beschrifte(e, k.icon || SYMBOL.seitenleiste, k.name, t.seitenleiste);
        continue;
      }
      if (k.function === "settings") {
        this._beschrifte(e, k.icon || SYMBOL.alles, k.name, t.alles);
        e.setAttribute("aria-haspopup", "dialog");
        continue;
      }
      if (k.function === "assist") {
        this._beschrifte(e, k.icon || SYMBOL.assist, k.name, t.assist);
        continue;
      }
      // Den Stift zeigt HA nur Administratoren - die Leiste auch.
      if (k.function === "edit") {
        e.hidden = !hass.user?.is_admin;
        this._beschrifte(e, k.icon || SYMBOL.bearbeiten, k.name, t.bearbeiten);
        continue;
      }

      if (k.function === "theme") {
        // Faerbt sich nicht: Er schaltet den Browser, kein Geraet im Haus, und
        // im dunklen Modus staende er sonst dauerhaft in der Auswahlfarbe.
        this._beschrifte(e, k.icon || SYMBOL.theme, k.name, t.hellDunkel);
        continue;
      }

      if (REGLER[k.function]) {
        const art = REGLER[k.function];
        this._beschrifte(e, k.icon || SYMBOL[art], k.name, t[art]);
        e.setAttribute("aria-haspopup", "true");
        e.setAttribute("aria-expanded", String(this.getAttribute("offen") === art));
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
    // Das Fenster hinter settings traegt das Vollbild auch - eine Leiste mit
    // ihm muss es beim Neuladen genauso wiederherstellen.
    const mitVollbild = hatVollbild || this._config.knoepfe.some((k) => k.function === "settings");
    if (mitVollbild) gleicheVollbildAb(hass);
    if (mitVollbild || this._config.kopf) {
      kopfzeile(this, (mitVollbild && hass.kioskMode === true) || this._config.kopf);
    }
    this._klebe(this._config.kopf && !wirdBearbeitet());

    if (this.getAttribute?.("offen") === "fenster" && this._regler?.art === "fenster") this._stelleFenster(t);
    this._folgeModus();

    this._aktivIndex = this._bestimmeAktiv();
    this._stelleMenueknopf(t);
    // Gemessen wird, nachdem der Browser die Reihe ausgelegt hat. Eine Leiste,
    // die auf der Ansicht entsteht, auf die sie zeigt, haette ihre Kapsel
    // sonst mit Breite null.
    this._setzeKapsel();
    if (globalThis.requestAnimationFrame) requestAnimationFrame(() => this._setzeKapsel());
  }

  // Die Modus-Gruppe, in der Leiste wie im Fenster.
  _stelleModus(gruppe, t) {
    const lage = modusLage(this._hass);
    // Der Theme-Name kommt aus einer YAML-Datei und geht deshalb als
    // Attribut hinein, nie als HTML.
    gruppe.setAttribute("aria-disabled", String(!lage.schaltbar));
    if (lage.schaltbar) gruppe.removeAttribute("title");
    else gruppe.setAttribute("title", t.fest(lage.theme, lage.fest));
    for (const w of gruppe.querySelectorAll(".wahl")) {
      w.setAttribute("aria-pressed", String(w.dataset.wahl === lage.aktiv));
    }
  }

  // Symbol, Beschriftung und Name fuer Vorleser - an einer Stelle. Der Text
  // kommt aus der Konfiguration und geht als textContent hinein, nie als HTML.
  // In der Liste steht ein Funktionsknopf mit Namen da: Eine Spalte aus
  // Symbolen sagt nicht, was hinter jedem steckt, und einen title sieht auf
  // dem Tablett niemand.
  _beschrifte(e, symbol, name, titel) {
    if (!name && e._inListe && e._k?.function) name = titel;
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
    // Neben dem Knopf der Seitenleiste stuende sonst ein zweites mdi:menu.
    const eigenes = this._config.einklappsymbol === ""
      || (this._config.einklappsymbol === undefined && this._config.knoepfe.some((k) => k.function === "sidebar"));
    const symbol = eigenes ? (gezeigt?.icon ?? "") : (this._config.einklappsymbol || SYMBOL.menue);
    this._beschrifte(b, symbol, gezeigt?.name ?? "", gezeigt?.name || t.menue);
  }

  // Unter der Leiste kann zweierlei aufklappen: die Liste der Ziele und die
  // Regler der Bewegung. Nie beides - das Attribut traegt, was offen ist.
  _oeffne(was) {
    this._zu();
    this.setAttribute("offen", was);
    if (was === "liste") this._menueknopf?.setAttribute("aria-expanded", "true");
    document.addEventListener("click", this._beiAussen, true);
    document.addEventListener("keydown", this._beiTaste);
  }

  _zu() {
    if (!this.hasAttribute?.("offen")) return;
    const warFenster = this.getAttribute("offen") === "fenster";
    this.removeAttribute("offen");
    if (warFenster && this._fenster?.open) this._fenster.close();
    this._menueknopf?.setAttribute("aria-expanded", "false");
    for (const b of this.shadowRoot?.querySelectorAll("button[aria-haspopup]") ?? []) {
      b.setAttribute("aria-expanded", "false");
    }
    document.removeEventListener("click", this._beiAussen, true);
    document.removeEventListener("keydown", this._beiTaste);
  }

  // ---- Die Regler: Bewegung oder Darstellung unter der Leiste ----
  //
  // Ein Feld unter der Leiste, zwei Belegungen. this._regler haelt, was beim
  // Oeffnen gelesen wurde - welche Belegung, aus welcher Theme, in welchem
  // Modus. Geschrieben wird genau dorthin. Dieselben Regler stehen auch im
  // Einstellungsfenster; this._feld ist der Behaelter, in dem sie gerade
  // stehen.

  async _reglerAuf(knopf, art) {
    const feld = this.shadowRoot.querySelector(".regler");
    if (!feld) return;
    this._oeffne(art);
    knopf.setAttribute("aria-expanded", "true");
    this._feld = feld;
    this._reglerMeldung(art, TEXTE[sprache(this._hass)].laedt);
    // Unter den Knopf, aber nie ueber den Rand der Leiste hinaus.
    const platz = feld.parentElement.clientWidth - feld.offsetWidth;
    const links = knopf._inListe ? 0 : knopf.offsetLeft;
    feld.style.insetInlineStart = `${Math.max(0, Math.min(links, platz))}px`;
    await this._reglerLaden(art);
  }

  async _reglerLaden(art) {
    const t = TEXTE[sprache(this._hass)];
    this._regler = null;
    let stand;
    try {
      stand = await this._themeLesen(art);
    } catch (fehler) {
      stand = { grund: "unlesbar", detail: fehler?.message || fehler?.code || String(fehler) };
    }
    // Inzwischen wieder geschlossen? Dann nichts mehr hineinzeichnen.
    if (this.getAttribute("offen") !== art) return;
    if (stand.grund && art !== "fenster") {
      this._reglerMeldung(art, t.grund[stand.grund](stand.detail));
      return;
    }
    // Im Fenster bleiben Modus, Vollbild und die Wahl der Theme bedienbar,
    // auch wenn sich die Datei nicht schreiben laesst - nur was in die Datei
    // schreibt, faellt dann weg, mit dem Grund als Satz.
    this._regler = stand.grund
      ? { art, sperre: stand, name: this._hass.themes?.theme, modus: aktuellerModus(this._hass),
          werte: {}, geaendert: new Set() }
      : { art, ...stand, werte: { ...stand.werte }, geaendert: new Set() };
    this._reglerBaue(t);
  }

  // Wer nicht schreiben darf oder wessen Theme keine Datei hat, erfaehrt es,
  // BEVOR er an einem Regler zieht - nicht erst beim Speichern.
  async _themeLesen(art) {
    const hass = this._hass;
    if (!hass.user?.is_admin) return { grund: "admin" };
    const name = hass.themes?.theme;
    // Dieselbe Regel wie auf dem Server (ws_load_theme_file).
    if (!name || name === "default" || !/^[A-Za-z0-9_-]{1,64}$/.test(name)) {
      return { grund: "ohneDatei", detail: name || "default" };
    }
    const modus = aktuellerModus(hass);
    this._w = await ladeWerkzeug();
    let text;
    try {
      text = (await hass.connection.sendMessagePromise({
        type: "hats/load_theme_file", filename: `${name}.yaml` })).content;
    } catch {
      return { grund: "ohneDatei", detail: name };
    }
    const stand = art === "fenster"
      ? leseFensterAusDatei(text, name, modus, this._w)
      : leseReglerAusDatei(text, name, modus, art, this._w);
    if (stand.grund) return stand;
    if (art === "fenster") {
      // Beides darf fehlen, ohne dass das Fenster leer bleibt.
      const frage = (nachricht, feld) => hass.connection.sendMessagePromise(nachricht)
        .then((r) => r?.[feld] ?? [], () => []);
      stand.bilder = await frage({ type: "hats/list_images" }, "bilder");
      stand.sicherungen = await frage({ type: "hats/list_backups", name }, "backups");
    }
    return { ...stand, name, modus };
  }

  _reglerMeldung(art, text) {
    const t = TEXTE[sprache(this._hass)];
    const titel = neu("div", "rtitel");
    titel.textContent = art === "fenster" ? t.fenster.seiten[this._fensterSeite] : t[art];
    const meldung = neu("div", "rstatus");
    meldung.textContent = text;
    this._feld?.replaceChildren(titel, meldung);
  }

  _reglerStatus(text) {
    const status = this._feld?.querySelector(".rstatus");
    if (status) status.textContent = text;
  }

  _reglerBaue(t) {
    const r = this._regler;
    if (r.art === "fenster") {
      this._fensterZeichne(t);
      return;
    }
    const titel = neu("div", "rtitel");
    titel.textContent = t[r.art];
    this._feld.replaceChildren(titel, ...this._baueGruppe(t, r.art, false), neu("div", "rstatus"));
    this._reglerStelle(t);
  }

  _baueGruppe(t, gruppe, mitTitel) {
    const stufen = this._w.BEWEGUNG_STUFEN ?? 10;
    const spannen = gruppe === "bewegung"
      ? {
        drift: [0, stufen, 1], punkte: [0, stufen, 1], farbe: [0, stufen, 1],
        weite: [0, AUSSCHLAEGE.length - 1, 1],
      }
      : {
        transparenz: [TRANSPARENZ.min, TRANSPARENZ.max, TRANSPARENZ.schritt],
        unschaerfe: [UNSCHAERFE_SPANNE.min, UNSCHAERFE_SPANNE.max, UNSCHAERFE_SPANNE.schritt],
        schrift: [SCHRIFT.min, SCHRIFT.max, SCHRIFT.schritt],
      };
    const teile = [];
    if (mitTitel) {
      const abschnitt = neu("div", "rabschnitt");
      abschnitt.textContent = t[gruppe];
      teile.push(abschnitt);
    }
    for (const [was, [min, max, schritt]] of Object.entries(spannen)) {
      const zeile = neu("label", "rzeile");
      const name = neu("span", "rname");
      name.textContent = gruppe === "bewegung" ? t.regler[was] : t[was];
      const regler = neu("input");
      regler.type = "range";
      regler.min = String(min);
      regler.max = String(max);
      regler.step = String(schritt);
      regler.dataset.was = was;
      zeile.append(name, regler, neu("span", "rwert"));
      teile.push(zeile);
    }
    if (gruppe === "darstellung") {
      const hinweis = neu("div", "rhinweis");
      hinweis.dataset.gruppe = "darstellung";
      teile.push(hinweis);
    }
    return teile;
  }

  _reglerStelle(t) {
    const r = this._regler;
    if (!r) return;
    if (r.art === "fenster") this._stelleFenster(t);
    if (r.sperre) return;
    if (r.art !== "darstellung") this._stelleBewegung(t);
    if (r.art !== "bewegung") this._stelleDarstellung(t);
  }

  _reglerEingaben(namen) {
    return [...(this._feld?.querySelectorAll("input[data-was]") ?? [])]
      .filter((e) => namen.includes(e.dataset.was));
  }

  // Die Sperren sind die des Panels: Punkte nur auf einem Punktebild, der
  // Ausschlag nur mit Farbwechsel. Gesperrt heisst auch hier leiser, mit dem
  // Grund als title - und die Dauer daneben sagt, was die Stufe bedeutet.
  _stelleBewegung(t) {
    const { werte: b, punktebild } = this._regler;
    const dauer = { drift: this._w.driftDauer, punkte: this._w.punkteDauer, farbe: this._w.farbDauer };
    for (const regler of this._reglerEingaben(BEWEGUNG_REGLER)) {
      const was = regler.dataset.was;
      const zeile = regler.parentElement;
      const wert = zeile.querySelector(".rwert");
      if (was === "weite") {
        const stelle = ausschlagStelle(b.weite);
        regler.value = String(stelle);
        regler.disabled = !b.farbe;
        wert.textContent = AUSSCHLAEGE[stelle] === 360 ? t.kreis : `${AUSSCHLAEGE[stelle]}°`;
        zeile.title = b.farbe ? "" : t.weiteNur;
      } else {
        regler.value = String(b[was]);
        regler.disabled = was === "punkte" && !punktebild;
        wert.textContent = b[was] ? `${b[was]} · ${dauer[was](b[was])} s` : t.aus;
        zeile.title = regler.disabled ? t.punkteNur : "";
      }
    }
  }

  // Eine Sperre steht hier als Satz unter den Reglern, nicht nur als title:
  // Wer mit dem Finger auf einem Tablett zieht, sieht keinen title.
  _stelleDarstellung(t) {
    const { werte, karte, schrift, unschaerfe, modus } = this._regler;
    const sperre = { transparenz: karte, schrift, unschaerfe: unschaerfe ?? {} };
    const hinweise = [];
    for (const regler of this._reglerEingaben(DARSTELLUNG_REGLER)) {
      const was = regler.dataset.was;
      const zeile = regler.parentElement;
      const wert = zeile.querySelector(".rwert");
      const grund = sperre[was].grund;
      const satz = grund ? t.grund[grund](sperre[was].detail) : "";
      regler.disabled = Boolean(grund);
      zeile.title = satz;
      if (satz) hinweise.push(satz);
      if (was === "transparenz") {
        regler.value = String(werte.transparenz ?? 0);
        wert.textContent = grund ? "" : werte.transparenz ? `${werte.transparenz} %` : t.deckend;
        if (!grund && karte.ebene === modus) hinweise.push(t.nurHier(modus));
        if (!grund && werte.transparenz > 0 && !karte.weich && !werte.unschaerfe) hinweise.push(t.ohneUnschaerfe);
      } else if (was === "unschaerfe") {
        regler.value = String(werte.unschaerfe ?? 0);
        wert.textContent = grund ? "" : werte.unschaerfe ? `${werte.unschaerfe} px` : t.aus;
      } else {
        regler.value = String(werte.schrift);
        wert.textContent = grund ? "" : `${werte.schrift} %`;
        if (!grund && werte.schrift > 100) hinweise.push(t.kachelnKurz);
        if (!grund && schrift.mushFest) hinweise.push(t.mushFest(schrift.mushFest));
      }
    }
    this._feld?.querySelector('.rhinweis[data-gruppe="darstellung"]')?.replaceChildren(
      ...hinweise.map((satz) => {
        const zeile = neu("div");
        zeile.textContent = satz;
        return zeile;
      }));
  }

  // Wechselt der Modus, solange Regler offen sind - im Fenster geht das ja -,
  // gehoert die Transparenz des anderen Modus hinein. Die Bewegung gilt fuer
  // beide, ihr Feld bleibt. Wechselt die Theme - im Fenster geht auch das -,
  // stammt alles Gelesene aus der falschen Datei: neu lesen, egal welches Feld.
  _folgeModus() {
    const r = this._regler;
    if (!r || this.getAttribute("offen") !== r.art) return;
    const andereTheme = r.name !== (this._hass.themes?.theme ?? r.name);
    if (andereTheme || (r.art !== "bewegung" && r.modus !== aktuellerModus(this._hass))) {
      if (r.art === "fenster") this._fensterNav(TEXTE[sprache(this._hass)]);
      this._reglerLaden(r.art);
    }
  }

  // ---- Das Einstellungsfenster ----
  //
  // Auf Ansage vom 14.10.2026, mit einem Bild der macOS-Systemeinstellungen:
  // "eigendlich koennten wir die einstellungsseite 1 zu eins uebernehmen.
  // wallpaper schriftgoesse und den rest den wir brauchen. dann geht ein
  // ganzes fenster auf fuer die settings". Links die Bereiche, rechts die
  // Einstellungen - wie dort.
  //
  // Ein <dialog> mit showModal: Er liegt in der obersten Ebene des Browsers,
  // ueber HAs Kopfzeile und Seitenleiste, Escape schliesst ihn, und der Fokus
  // bleibt darin. Er steht NEBEN dem Inhalt der Karte, nicht darin: Die Karte
  // baut ihren Inhalt bei jeder neuen Breite neu, und ein offenes Fenster
  // ginge dabei mit.

  async _fensterAuf() {
    const t = TEXTE[sprache(this._hass)];
    if (!this._fenster) this._fenster = this._baueFenster(t);
    this._oeffne("fenster");
    if (!this._fenster.open) this._fenster.showModal?.();
    this._fensterSeite ??= "aussehen";
    this._feld = this._fenster.querySelector(".fseite");
    this._fensterNav(t);
    // Die Knoepfe oben haengen nicht an der Datei - sie stehen sofort.
    this._stelleFenster(t);
    this._reglerMeldung("fenster", t.laedt);
    await this._reglerLaden("fenster");
  }

  _baueFenster(t) {
    const d = neu("dialog", "fenster");
    d.setAttribute("aria-label", t.fenster.titel);
    const kopf = neu("div", "fkopf");
    const titel = neu("div", "ftitel");
    titel.textContent = t.fenster.titel;
    const datei = neu("div", "fdatei");
    const zu = neu("button", "knopf nur-symbol fzu");
    zu.type = "button";
    zu.dataset.fensterZu = "";
    zu.setAttribute("aria-label", t.fenster.zu);
    zu.title = t.fenster.zu;
    const symbol = neu("ha-icon");
    symbol.setAttribute("icon", SYMBOL.zu);
    zu.append(symbol, neu("ha-ripple"));
    // Bearbeiten und Vollbild stehen oben neben dem Schliessen, nicht auf einer
    // Seite - auf Ansage vom 14.10.2026, mit einem Bild der Kopfzeile. Sie
    // gehoeren zu keinem Bereich, man will sie von ueberall erreichen.
    const knopf = (daten) => {
      const b = neu("button", "knopf nur-symbol");
      b.type = "button";
      b.dataset[daten] = "";
      b._symbol = neu("ha-icon");
      b._name = neu("span", "name");
      b.append(b._symbol, b._name, neu("ha-ripple"));
      return b;
    };
    kopf.append(titel, datei, neu("span", "fueller"), knopf("bearbeiten"), knopf("vollbild"), zu);
    const koerper = neu("div", "fkoerper");
    koerper.append(neu("nav", "fnav"), neu("div", "fseite"));
    d.append(kopf, koerper);
    // Escape und der Knopf schliessen den Dialog selbst; die Leiste raeumt
    // danach auf. Ein Klick auf den Schleier trifft den Dialog als solchen.
    d.addEventListener("close", () => this._zu());
    d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); });
    this.shadowRoot.append(d);
    return d;
  }

  _fensterNav(t) {
    const nav = this._fenster.querySelector(".fnav");
    nav.replaceChildren(...Object.keys(t.fenster.seiten).map((seite) => {
      const b = neu("button", "fnavknopf");
      b.type = "button";
      b.dataset.seite = seite;
      b.setAttribute("aria-current", String(seite === this._fensterSeite));
      const symbol = neu("ha-icon");
      symbol.setAttribute("icon", SYMBOL[seite]);
      const name = neu("span");
      name.textContent = t.fenster.seiten[seite];
      b.append(symbol, name);
      return b;
    }));
    const datei = this._fenster.querySelector(".fdatei");
    const theme = this._hass.themes?.theme;
    datei.textContent = theme && theme !== "default" ? `${theme}.yaml` : "";
  }

  _fensterZeichne(t) {
    const r = this._regler;
    const tf = t.fenster;
    const seite = this._fensterSeite;
    const titel = neu("div", "rtitel");
    titel.textContent = tf.seiten[seite];
    const teile = [titel];
    const gesperrt = () => {
      const satz = neu("div", "rhinweis");
      satz.textContent = t.grund[r.sperre.grund](r.sperre.detail);
      return satz;
    };

    if (seite === "aussehen") {
      teile.push(this._gruppe(tf.modus, this._kacheln(["auto", "light", "dark"].map((w) =>
        // Auf der Kachel nur das erste Wort: "Automatisch - folgt dem Geraet"
        // passt nicht darunter; der ganze Satz steht als title.
        this._kachel({ name: t[w].split(" - ")[0], zweck: t[w], daten: { wahl: w }, symbol: SYMBOL[w] })))));
      if (r.sperre) teile.push(gesperrt());
      else {
        teile.push(this._gruppe(tf.karten, this._baukastenKacheln(t, "karten")));
        teile.push(this._gruppe(tf.farbe, this._baukastenKacheln(t, "palette")));
        teile.push(this._gruppe(tf.flaeche, ...this._baueGruppe(t, "darstellung", false)
          .filter((e) => e.dataset?.was !== "schrift" && e.querySelector?.("[data-was=schrift]") === null)));
      }
    } else if (seite === "hintergrund") {
      if (r.sperre) teile.push(gesperrt());
      else {
        teile.push(this._gruppe(tf.verlaeufe, this._baukastenKacheln(t, "hintergrund")));
        const bilder = (r.bilder ?? []).filter((b) => BILD_ADRESSE.test(b.url));
        const hinweis = neu("div", "rhinweis");
        hinweis.textContent = tf.keineBilder;
        teile.push(this._gruppe(tf.bilder, bilder.length
          ? this._kacheln(bilder.map((b) => this._kachel({
            name: b.name.replace(/\.[^.]+$/, ""), daten: { bild: b.url },
            an: String(r.bild).includes(b.url), hintergrund: `url(${b.url}) center / cover no-repeat`,
          })))
          : hinweis));
      }
    } else if (seite === "schrift") {
      if (r.sperre) teile.push(gesperrt());
      else {
        const schrift = this._baueGruppe(t, "darstellung", false)
          .filter((e) => e.querySelector?.("[data-was=schrift]") || e.dataset?.gruppe);
        teile.push(this._gruppe(tf.groesse, ...schrift));
        teile.push(this._gruppe(tf.schriftart, this._baukastenKacheln(t, "schrift")));
        teile.push(this._gruppe(tf.rundung, this._baukastenKacheln(t, "rundung")));
        // Die Dichte steht hier NICHT, obwohl der Baukasten sie hat. Am
        // 14.10.2026 gemeldet: "das zerstoert uns die seitenleiste die icons
        // verutschen." Gemessen: Die Dichten setzen --ha-space-1 bis -20
        // global, und HAs Seitenleiste liest sieben davon. Nur bei "Home
        // Assistant" stehen ihre Symbole in einer Linie mit dem Menueknopf
        // (x 16/16); weit 17/13, sehr weit 18/10, eng 15/19. Zurueck ins
        // Fenster, sobald die Dichte nur das Dashboard trifft.
      }
    } else if (seite === "bewegung") {
      teile.push(r.sperre ? gesperrt() : this._gruppe("", ...this._baueGruppe(t, "bewegung", false)));
    } else if (seite === "uix") {
      if (r.sperre) teile.push(gesperrt());
      else {
        const hinweis = neu("div", "rhinweis");
        hinweis.textContent = tf.uixHinweis;
        teile.push(hinweis);
        for (const g of vorlagenFuersFenster(this._w)) {
          teile.push(this._gruppe(tf.vorlagen[g.sorte], this._vorlagenListe(g.vorlagen)));
        }
      }
    } else if (seite === "anzeige") {
      teile.push(this._gruppe(tf.theme, this._themeWahl(t)));
      if (!r.sperre) teile.push(this._gruppe(tf.sicherungen, this._sicherungsListe(t)));
    }
    teile.push(neu("div", "rstatus"));
    this._feld.replaceChildren(...teile);
    this._reglerStelle(t);
  }

  // Vorlagen als Zeilen mit Schalter, wie die Schalter am Mac: Name, darunter
  // wozu sie da ist. Kein Bild - eine Kachel braucht eines, und fuer die
  // meisten Vorlagen gibt es noch keins; der Zweck sagt mehr als der Name.
  _vorlagenListe(vorlagen) {
    const en = sprache(this._hass) === "en";
    const an = this._regler?.vorlagen ?? {};
    const liste = neu("div", "vliste");
    liste.append(...vorlagen.map((v) => {
      const b = neu("button", "vzeile");
      b.type = "button";
      b.dataset.vorlage = v.id;
      b.setAttribute("role", "switch");
      b.setAttribute("aria-checked", String(an[v.id] === true));
      const text = neu("span", "vtext");
      const name = neu("span", "vname");
      name.textContent = en ? v.en : v.de;
      const zweck = neu("span", "vzweck");
      zweck.textContent = en ? v.zweckEn : v.zweckDe;
      text.append(name, zweck);
      b.append(text, neu("span", "vschalter"));
      return b;
    }));
    return liste;
  }

  _gruppe(titel, ...kinder) {
    const g = neu("section", "fgruppe");
    if (titel) {
      const h = neu("div", "fgtitel");
      h.textContent = titel;
      g.append(h);
    }
    g.append(...kinder);
    return g;
  }

  _kacheln(kinder) {
    const k = neu("div", "kacheln");
    k.append(...kinder);
    return k;
  }

  // Eine Kachel: ein Bild und ein Name darunter, wie die Auswahl am Mac.
  // Daten gehen als data-Attribute an den Knopf; _klick liest sie.
  _kachel({ name, daten = {}, an = false, symbol, hintergrund, probe, schrift, zweck }) {
    const b = neu("button", "kachel");
    b.type = "button";
    for (const [k, v] of Object.entries(daten)) b.dataset[k] = v;
    b.setAttribute("aria-pressed", String(an));
    if (zweck) b.title = zweck;
    const bild = neu("span", "kbild");
    if (hintergrund) bild.style.background = hintergrund;
    if (symbol) {
      const s = neu("ha-icon");
      s.setAttribute("icon", symbol);
      bild.append(s);
    }
    if (probe) {
      const p = neu("span", "kprobe");
      for (const [k, v] of Object.entries(probe)) if (v !== undefined && v !== "") p.style.setProperty(k, v);
      bild.append(p);
    }
    if (schrift) {
      const p = neu("span", "kschrift");
      p.textContent = "Aa";
      p.style.fontFamily = schrift;
      bild.append(p);
    }
    const n = neu("span", "kname");
    n.textContent = name;
    b.append(bild, n);
    return b;
  }

  // Die Teile einer Sorte des Baukastens als Kacheln, das sitzende markiert.
  // Sitzt keins, sagt eine Zeile darunter warum - sonst saehe es aus, als
  // haette die Theme nichts.
  _baukastenKacheln(t, sorte) {
    const r = this._regler;
    const w = this._w;
    const en = sprache(this._hass) === "en";
    const dunkel = r.modus === "dark";
    const wert = (teil, name) => teil[r.modus]?.[name] ?? teil.flach?.[name] ?? teil.felder?.[name];
    const kacheln = (w.BAUKASTEN?.[sorte]?.teile ?? []).map((teil) => {
      const k = { name: en ? teil.en : teil.de, daten: { sorte, teil: teil.id },
                  an: r.sitzt?.[sorte] === teil.id, zweck: en ? teil.zweckEn : teil.zweckDe };
      if (sorte === "palette") {
        const punkte = w.palettenVorschau(teil, dunkel).map((p) => p.hex);
        k.hintergrund = `linear-gradient(90deg, ${punkte.map((hex, i) =>
          `${hex} ${Math.round(i / punkte.length * 100)}% ${Math.round((i + 1) / punkte.length * 100)}%`).join(", ")})`;
      } else if (sorte === "hintergrund") {
        const bild = teil.vorschau?.[r.modus] ?? w.ohneFest(String(wert(teil, "--lovelace-background") ?? ""));
        k.hintergrund = bild || "var(--primary-background-color)";
      } else if (sorte === "karten") {
        k.probe = Object.fromEntries(["--ha-card-background", "--ha-card-border-radius", "--ha-card-border-width",
          "--ha-card-border-color", "--ha-card-box-shadow", "--ha-card-backdrop-filter"].map((n) => [n, wert(teil, n)]));
      } else if (sorte === "rundung") {
        k.probe = { "--ha-card-border-radius": wert(teil, "--ha-card-border-radius") };
      } else if (sorte === "schrift") {
        k.schrift = wert(teil, "--ha-font-family-body");
      }
      return this._kachel(k);
    });
    const raster = this._kacheln(kacheln);
    if (r.sitzt?.[sorte]) return raster;
    const satz = neu("div", "rhinweis");
    satz.textContent = t.fenster.eigene;
    const huelle = neu("div");
    huelle.append(raster, satz);
    return huelle;
  }

  // Die Themes, die Home Assistant kennt - dieselbe Liste wie im Profil.
  _themeWahl(t) {
    const wahl = neu("select", "fwahl");
    wahl.dataset.themeWahl = "";
    const namen = Object.keys(this._hass.themes?.themes ?? {}).sort((a, b) => a.localeCompare(b));
    const jetzt = this._hass.selectedTheme?.theme ?? this._hass.themes?.theme ?? "default";
    for (const name of ["default", ...namen]) {
      const o = neu("option");
      o.value = name;
      o.textContent = name === "default" ? "Home Assistant" : name;
      o.selected = name === jetzt;
      wahl.append(o);
    }
    const hilfe = neu("div", "rhinweis");
    hilfe.textContent = t.fenster.themeHilfe;
    const huelle = neu("div", "fspalte");
    huelle.append(wahl, hilfe);
    return huelle;
  }

  _sicherungsListe(t) {
    const liste = this._regler.sicherungen ?? [];
    if (!liste.length) {
      const satz = neu("div", "rhinweis");
      satz.textContent = t.fenster.keineSicherungen;
      return satz;
    }
    const huelle = neu("div", "fspalte");
    for (const s of liste.slice(0, 5)) {
      const zeile = neu("div", "fzeile");
      const zeit = neu("span");
      zeit.textContent = t.fenster.zeit(s.backup);
      const b = neu("button", "knopf fknopf");
      b.type = "button";
      b.dataset.sicherung = s.backup;
      b._symbol = neu("ha-icon");
      b._name = neu("span", "name");
      b.append(b._symbol, b._name, neu("ha-ripple"));
      this._beschrifte(b, "mdi:history", t.fenster.zurueck, t.fenster.zurueck);
      zeile.append(zeit, b);
      huelle.append(zeile);
    }
    return huelle;
  }

  // Was sich ohne neues Lesen aendert: Modus und Vollbild.
  _stelleFenster(t) {
    const feld = this._feld;
    if (!feld) return;
    const lage = modusLage(this._hass);
    for (const k of feld.querySelectorAll(".kachel[data-wahl]")) {
      k.setAttribute("aria-pressed", String(k.dataset.wahl === lage.aktiv));
      k.setAttribute("aria-disabled", String(!lage.schaltbar));
      k.title = lage.schaltbar ? "" : t.fest(lage.theme, lage.fest);
    }
    const kopf = this._fenster?.querySelector(".fkopf");
    const voll = kopf?.querySelector("[data-vollbild]");
    if (voll) {
      const an = this._hass.kioskMode === true;
      voll.setAttribute("aria-pressed", String(an));
      this._beschrifte(voll, an ? SYMBOL.vollbildAus : SYMBOL.vollbild, "", an ? t.vollbildAus : t.vollbild);
    }
    // Den Stift zeigt HA nur Administratoren - das Fenster auch.
    const stift = kopf?.querySelector("[data-bearbeiten]");
    if (stift) {
      stift.hidden = !this._hass.user?.is_admin;
      this._beschrifte(stift, SYMBOL.bearbeiten, "", t.bearbeiten);
    }
  }

  // Ein Teil, ein Bild oder eine Sicherung schreiben - eins nach dem anderen,
  // frisch gelesen, und danach das Fenster neu: Was jetzt sitzt, sagt die
  // Datei, nicht der Klick.
  async _fensterSchreiben(machen) {
    if (this._speichert) return;
    const r = this._regler;
    if (!r || r.sperre) return;
    const t = TEXTE[sprache(this._hass)];
    this._speichert = true;
    try {
      const hass = this._hass;
      if (hass.themes?.theme !== r.name) {
        this._reglerStatus(t.grund.wechsel(hass.themes?.theme || "default"));
        return;
      }
      this._reglerStatus(t.speichert);
      const text = (await hass.connection.sendMessagePromise({
        type: "hats/load_theme_file", filename: `${r.name}.yaml` })).content;
      const stand = await machen(text, r);
      if (stand.grund) {
        this._reglerStatus(t.grund[stand.grund](stand.detail));
        return;
      }
      if (stand.yaml !== text) {
        await hass.connection.sendMessagePromise({
          type: "hats/save_theme", name: r.name, yaml: stand.yaml, overwrite: true });
        await hass.callService("frontend", "reload_themes");
      }
      this._speichert = false;
      await this._reglerLaden("fenster");
      this._reglerStatus(stand.meldung ?? t.gespeichert(r.name));
    } catch (fehler) {
      this._reglerStatus(`${t.nichtGespeichert}: ${fehler?.message || fehler?.code || fehler}`);
    } finally {
      this._speichert = false;
    }
  }

  _fensterKlick(knopf) {
    const t = TEXTE[sprache(this._hass)];
    const d = knopf.dataset;
    if (d.fensterZu !== undefined) { this._fenster?.close(); return true; }
    if (d.seite) {
      this._fensterSeite = d.seite;
      this._fensterNav(t);
      if (this._regler) this._reglerBaue(t);
      return true;
    }
    if (d.sorte && d.teil) {
      // Wie im Panel: Ein Klick auf das Teil, das schon sitzt, wendet es nicht
      // noch einmal an - sonst ginge jede Feinjustierung im Panel verloren.
      if (knopf.getAttribute("aria-pressed") === "true") return true;
      this._fensterSchreiben((text, r) => schreibeTeilInDatei(text, r.name, d.sorte, d.teil, this._w));
      return true;
    }
    if (d.vorlage) {
      const an = knopf.getAttribute("aria-checked") !== "true";
      this._fensterSchreiben((text, r) => schreibeVorlageInDatei(text, r.name, d.vorlage, an, this._w));
      return true;
    }
    if (d.bild) {
      if (knopf.getAttribute("aria-pressed") === "true") return true;
      this._fensterSchreiben((text, r) => schreibeBildInDatei(text, r.name, d.bild, this._w));
      return true;
    }
    if (d.sicherung) {
      const kennung = d.sicherung;
      this._fensterSchreiben(async (text, r) => {
        const alt = (await this._hass.connection.sendMessagePromise({
          type: "hats/load_backup", name: r.name, backup: kennung })).content;
        // Eine Sicherung ist eine fruehere Fassung DIESER Datei - sonst nicht.
        const stand = pruefeDatei(alt, r.name, this._w);
        if (stand.grund) return stand;
        return { yaml: alt, meldung: t.fenster.zurueckGeholt(t.fenster.zeit(kennung)) };
      });
      return true;
    }
    return false;
  }

  _beiRegler(ev, losgelassen) {
    const regler = ev.target;
    const was = regler?.dataset?.was;
    const r = this._regler;
    if (!was || !r) return;
    r.werte[was] = was === "weite" ? AUSSCHLAEGE[Number(regler.value)] : Number(regler.value);
    r.geaendert.add(was);
    this._reglerStelle(TEXTE[sprache(this._hass)]);
    if (losgelassen) this._reglerSpeichern();
  }

  // Ein Speichern nach dem anderen. Kommt waehrenddessen ein neuer Wert,
  // laeuft danach genau EIN weiteres - mit dem letzten Stand, nicht mit jedem
  // Zwischenschritt.
  async _reglerSpeichern() {
    if (this._speichert) { this._nochmal = true; return; }
    this._speichert = true;
    const t = TEXTE[sprache(this._hass)];
    try {
      do {
        this._nochmal = false;
        const r = this._regler;
        if (!r || r.sperre) return;
        this._reglerStatus(t.speichert);
        const hass = this._hass;
        // Gilt inzwischen eine andere Theme, gehoeren die Werte nicht in
        // deren Datei - sie stammen aus dieser.
        if (hass.themes?.theme !== r.name) {
          this._reglerStatus(t.grund.wechsel(hass.themes?.theme || "default"));
          return;
        }
        // Frisch gelesen, jedes Mal: Was das Panel oder ein zweiter Browser
        // inzwischen gespeichert hat, soll mit.
        const text = (await hass.connection.sendMessagePromise({
          type: "hats/load_theme_file", filename: `${r.name}.yaml` })).content;
        const stand = schreibeReglerInDatei(text, r.name, r.modus, r.werte, r.geaendert, this._w);
        if (stand.grund) {
          this._reglerStatus(t.grund[stand.grund](stand.detail));
          return;
        }
        if (stand.yaml !== text) {
          await hass.connection.sendMessagePromise({
            type: "hats/save_theme", name: r.name, yaml: stand.yaml, overwrite: true });
          await hass.callService("frontend", "reload_themes");
        }
        this._reglerStatus(t.gespeichert(r.name));
      } while (this._nochmal);
    } catch (fehler) {
      // Der Server prueft mit PyYAML, bevor er schreibt. Seine Meldung
      // woertlich - umschrieben waere sie nicht mehr nachschlagbar.
      this._reglerStatus(`${t.nichtGespeichert}: ${fehler?.message || fehler?.code || fehler}`);
    } finally {
      this._speichert = false;
    }
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
      if (this.getAttribute("offen") === "liste") this._zu();
      else this._oeffne("liste");
      return;
    }

    if (this._fensterKlick(knopf)) return;
    if (knopf.dataset.bearbeiten !== undefined) {
      this._bearbeiten();
      return;
    }
    // Der Vollbildknopf im Fenster: derselbe Weg wie der in der Leiste.
    if (knopf.dataset.vollbild !== undefined) {
      schalteVollbild(this._hass.kioskMode !== true, this._config.kiosk_only);
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
    if (REGLER[k.function]) {
      if (this.getAttribute("offen") === REGLER[k.function]) this._zu();
      else this._reglerAuf(knopf, REGLER[k.function]);
      return;
    }
    if (k.function === "settings") {
      this._fensterAuf();
      return;
    }
    // Die drei Knoepfe aus HAs Kopfzeile, auf HAs eigenen Wegen - am
    // 14.10.2026 an der Testmaschine ausgeloest: hass-toggle-menu klappt die
    // Seitenleiste (255 -> 55 -> 255 px), die Aktion assist oeffnet den
    // Sprachdialog, ?edit=1 ueber navigate den Bearbeitungsmodus.
    if (k.function === "sidebar") {
      this._sende("hass-toggle-menu");
      return;
    }
    if (k.function === "assist") {
      if (knopf._inListe) this._zu();
      this._sende("hass-action", { config: { tap_action: { action: "assist" } }, action: "tap" });
      return;
    }
    if (k.function === "edit") {
      this._bearbeiten();
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
    if (knopf._inListe) this._zu();
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

  // Bearbeiten heisst in Home Assistant: dieselbe Adresse mit ?edit=1.
  _bearbeiten() {
    this._zu();
    this._sende("hass-action", { config: { tap_action: { action: "navigate",
      navigation_path: `${globalThis.location.pathname}?edit=1` } }, action: "tap" });
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

// ---- Der Editor ------------------------------------------------------------
//
// Home Assistant zeichnet die Liste der Knoepfe selbst (ha-selector-object) und
// beschriftet jede Zeile mit EINEM Feld, label_field. Am 14.10.2026 aus dem
// Buendel von 2026.10.1 gelesen:
//
//     label = label_field in fields ? format(item[label_field])
//           : alle Felder, formatiert, mit " · " verbunden
//
// Mit name als label_field standen die Funktionsknoepfe als LEERE Zeilen da -
// sie haben keinen Namen. Ohne label_field stuende "fullscreen · true" da:
// Eine Auswahl formatiert HA als rohen Wert, einen Schalter als "true".
//
// Die Zeile bekommt deshalb zwei Anzeigefelder, die nur im Editor leben. Ihr
// Waehler ist "constant" mit leerer Beschriftung; HAs ha-selector-constant
// zeichnet `label ?? value`, und "" ist ein Wert - im Unterformular steht
// also nichts. Vor jedem config-changed fallen beide wieder heraus. In der
// Konfiguration landen sie nie.
const ZEILE = "_zeile";
const ZEILE_UNTER = "_zeile_unter";

// Was in der Zeile steht: der Name, sonst was der Knopf ist. Darunter, was er
// tut - aber nur, wenn oben der Name steht, sonst stuende es zweimal da.
export function knopfZeile(b, index, hass, t) {
  const name = String(b?.name ?? "").trim();
  let art = "";
  if (b?.function) art = t.funktion[b.function] ?? b.function;
  else if (b?.link) art = b.link;
  else if (b?.entity) art = hass?.states?.[b.entity]?.attributes?.friendly_name || b.entity;
  return { titel: name || art || b?.icon || t.knopf(index + 1), unter: name ? art : "" };
}

export function mitZeilen(config, hass, t) {
  if (!Array.isArray(config?.buttons)) return config;
  return {
    ...config,
    buttons: config.buttons.map((b, i) => {
      if (!b || typeof b !== "object") return b;
      const z = knopfZeile(b, i, hass, t);
      return { ...b, [ZEILE]: z.titel, [ZEILE_UNTER]: z.unter };
    }),
  };
}

export function ohneZeilen(config) {
  if (!Array.isArray(config?.buttons)) return config;
  return {
    ...config,
    buttons: config.buttons.map((b) => {
      if (!b || typeof b !== "object") return b;
      const { [ZEILE]: _titel, [ZEILE_UNTER]: _unter, ...rest } = b;
      return rest;
    }),
  };
}

// Das Formular der Karte. mitAnzeige: mit den beiden Anzeigefeldern fuer den
// eigenen Editor; ohne sie fuer HAs Formular-Editor, falls der einspringt.
//
// kiosk_only ist absichtlich so herum benannt, dass "aus" die Vorgabe ist:
// Ein Schalter im Formular zeigt ein fehlendes Feld als aus. Hiesse es
// browser_fullscreen mit Vorgabe an, staende der Schalter auf aus, waehrend
// die Karte das Gegenteil taete. Aus demselben Grund fehlen state_background,
// light_background und show_highlight: Sie sind von sich aus an.
export function kartenFormular(t, mitAnzeige) {
  const wahl = (werte) => ({ select: { mode: "dropdown",
    options: werte.map((wert) => ({ value: wert, label: t.wahl[wert] })) } });
  const anzeige = { selector: { constant: { value: "", label: "" } } };
  return {
    schema: [
      // Eine Liste von Objekten, jedes mit eigenem Unterformular - auch das
      // zeichnet Home Assistant selbst (am 13.10.2026 an 2026.10.1 gesehen:
      // Zeilen mit Griff, Stift und Papierkorb, darunter "Hinzufuegen").
      // Die Kurzform `controls` steht hier absichtlich nicht mehr: Sie gilt
      // im YAML weiter, aber zwei Wege im selben Formular waeren einer zu viel.
      { name: "buttons",
        selector: { object: { multiple: true,
          label_field: mitAnzeige ? ZEILE : "name",
          description_field: mitAnzeige ? ZEILE_UNTER : "link",
          fields: {
            name: { label: t.knopffeld.name, selector: { text: {} } },
            icon: { label: t.knopffeld.icon, selector: { icon: {} } },
            link: { label: t.knopffeld.link, selector: { navigation: {} } },
            entity: { label: t.knopffeld.entity, selector: { entity: {} } },
            tap_action: { label: t.knopffeld.tap_action, selector: { ui_action: {} } },
            function: { label: t.knopffeld.function, selector: { select: { mode: "dropdown",
              options: FUNKTIONEN.map((wert) => ({ value: wert, label: t.funktion[wert] })) } } },
            temperature: { label: t.knopffeld.temperature, selector: { entity: { domain: "sensor" } } },
            temperature_source: { label: t.knopffeld.temperature_source, selector: wahl(["sensor", "weather"]) },
            align_end: { label: t.knopffeld.align_end, selector: { boolean: {} } },
            separator_before: { label: t.knopffeld.separator_before, selector: { boolean: {} } },
            ...(mitAnzeige ? { [ZEILE]: anzeige, [ZEILE_UNTER]: anzeige } : {}),
          } } } },
      { name: "kiosk_only", selector: { boolean: {} } },
      { name: "replace_header", selector: { boolean: {} } },
      { name: "menu_shape", selector: wahl(FORMEN) },
      { name: "menu_size", selector: wahl(GROESSEN) },
      { name: "collapse", selector: wahl(EINKLAPPEN) },
      { name: "collapse_width", selector: { number: { min: 200, max: 1200, step: 10, mode: "box" } } },
    ],
    computeLabel: (feld) => t.feld[feld.name],
    computeHelper: (feld) => t.hilfe[feld.name],
  };
}

// ha-form ist ein Bauteil von Home Assistant, angemeldet wird es aber erst,
// wenn ein Editor es braucht. HAs Formular-Editor laedt es selbst; ein eigener
// Editor muss darum bitten. Das geht ueber den Editor einer HA-Karte, der es
// mitbringt - loadCardHelpers stellt Home Assistant dafuer bereit.
//
//   zurueck  true, sobald ha-form angemeldet ist; false nach drei Sekunden
async function ladeFormular() {
  const da = () => Boolean(customElements.get("ha-form"));
  if (da()) return true;
  try {
    const helfer = await window.loadCardHelpers?.();
    const karte = await helfer?.createCardElement({ type: "entities", entities: [] });
    await karte?.constructor?.getConfigElement?.();
  } catch {
    // Unten wird ohnehin gewartet - vielleicht laedt es jemand anders.
  }
  await Promise.race([customElements.whenDefined("ha-form"), new Promise((ok) => setTimeout(ok, 3000))]);
  return da();
}

// HAs ha-form mit beschrifteten Zeilen - mehr tut der Editor nicht. Felder,
// Unterformulare, Liste und Ziehen zeichnet weiter Home Assistant.
class HatsControlCardEditor extends Basis {
  setConfig(config) {
    this._config = ohneZeilen(config);
    this._zeichne();
  }

  // hass kommt bei jeder Zustandsaenderung. Neu beschriftet wird nur, wenn
  // es das erste ist (vorher fehlten die Namen der Entitaeten) oder die
  // Sprache wechselt.
  set hass(hass) {
    const neu = !this._hass || sprache(this._hass) !== sprache(hass);
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    if (neu) this._zeichne();
  }

  connectedCallback() { this._zeichne(); }

  _zeichne() {
    if (!this._config || !this.isConnected) return;
    const t = TEXTE[sprache(this._hass)];
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config = ohneZeilen(ev.detail.value);
        this.dispatchEvent(new CustomEvent("config-changed",
          { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.append(this._form);
    }
    const formular = kartenFormular(t, true);
    this._form.hass = this._hass;
    this._form.schema = formular.schema;
    this._form.computeLabel = formular.computeLabel;
    this._form.computeHelper = formular.computeHelper;
    this._form.data = mitZeilen(this._config, this._hass, t);
  }
}

class HatsControlCard extends Steuerung {
  // Der Waehler legt die Liste ausdruecklich an. Ohne das zeigte der Editor
  // eine leere Liste, waehrend die Vorgabe - Modus und Vollbild - gezeichnet
  // wird.
  static getStubConfig() {
    return { buttons: BEDIENTEILE.map((funktion) => ({ function: funktion })) };
  }

  // Home Assistant baut den Editor aus diesem Schema selbst - ueber
  // getConfigElement unten mit beschrifteten Zeilen, und nur wenn das nicht
  // geht, ueber dieses Schema allein.
  static getConfigForm() {
    return kartenFormular(TEXTE[sprache()], false);
  }

  static async getConfigElement() {
    // Ohne ha-form zeichnete der Editor nichts. Dann lieber HAs eigener
    // Formular-Editor aus getConfigForm - mit leeren Zeilen, aber bedienbar.
    if (!(await ladeFormular())) return undefined;
    return document.createElement(EDITOR);
  }

  _liesConfig(config) { return pruefeConfig(config); }
  _stil() { return STIL_KARTE; }
  _einklappbar() { return true; }
  _gruppenstrich() { return false; }
  _rahmen() {
    return `<ha-card><div class="leiste"><div class="reihe"><div class="kapsel"></div></div>`
      + `<div class="liste"></div><div class="regler" role="group"></div></div></ha-card>`;
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

  _liesConfig(config) { return pruefeConfig(badgeKurzform(config)); }
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
  if (!customElements.get(EDITOR)) customElements.define(EDITOR, HatsControlCardEditor);
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

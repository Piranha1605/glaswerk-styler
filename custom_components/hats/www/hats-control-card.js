// HATS - die Steuerkarte
//
// Eine Lovelace-Karte, die im Moment zwei Dinge schaltet: den Modus
// (automatisch, hell, dunkel) und das Vollbild.
//
//     type: custom:hats-control-card
//
// DIE REGEL DIESER DATEI: ALLES, WAS SIE BENUTZT, STELLT HOME ASSISTANT.
// Keine Bibliothek, keine fremde Karte, kein eigenes Symbol, keine eigene
// Farbe. Im Einzelnen, am 13.10.2026 an HA 2026.10.1 gemessen:
//
//   Bauteile   ha-card, ha-icon (mdi), ha-ripple
//   Farben     --primary-color, --disabled-color, --primary-text-color ...
//              dieselben Namen, die ha-control-select und ha-control-button
//              lesen - aus deren elementStyles abgeschrieben, nicht geraten
//   Modus      das Ereignis "settheme", dasselbe wie die Zeile im Profil
//   Vollbild   das Ereignis "hass-kiosk-mode" auf window
//   Meldung    das Ereignis "hass-notification" (HAs eigener Toast)
//   Editor     getConfigForm - Home Assistant zeichnet das Formular selbst
//
// Warum nicht ha-control-select selbst, wo es doch genau so aussieht: Das
// Bauteil laedt Home Assistant erst mit den Kachel-Funktionen nach. Auf einem
// Dashboard ohne solche Kachel waere es nicht angemeldet, und ein nicht
// angemeldetes Element zeichnet nichts - ohne Meldung. ha-card und ha-icon
// stehen dagegen auf jedem Dashboard.
//
// Die eine Ausnahme von der Regel ist das Vollbild des BROWSERS
// (requestFullscreen). Home Assistant hat kein eigenes: Sein Kiosk-Modus
// blendet die Seitenleiste und die Knoepfe der Kopfzeile aus, das Fenster
// bleibt, wie es ist. Mit kiosk_only: true bleibt es dabei.

const KARTE = "hats-control-card";

// Die Reihenfolge hier ist die Vorgabe fuer die Anzeige. Was dazukommt, kommt
// hier dazu - und nur hier.
export const BEDIENTEILE = ["mode", "fullscreen"];

const TEXTE = {
  de: {
    name: "HATS Steuerkarte",
    beschreibung: "Schaltet den Modus (automatisch, hell, dunkel) und das Vollbild.",
    modus: "Modus",
    auto: "Automatisch - folgt dem Gerät",
    light: "Hell",
    dark: "Dunkel",
    vollbild: "Vollbild",
    vollbildAus: "Vollbild beenden",
    fest: (theme, modus) =>
      `Die Theme „${theme}“ bringt nur den ${modus === "dark" ? "dunklen" : "hellen"} Modus mit.`,
    leer: "Kein Bedienteil gewählt.",
    feld: { controls: "Bedienteile", kiosk_only: "Vollbild nur in Home Assistant" },
    hilfe: {
      controls: "Angezeigt in dieser Reihenfolge.",
      kiosk_only: "Blendet nur Seitenleiste und Kopfknöpfe aus. Das Browserfenster bleibt, wie es ist.",
    },
    teil: { mode: "Modus", fullscreen: "Vollbild" },
  },
  en: {
    name: "HATS control card",
    beschreibung: "Switches the mode (auto, light, dark) and fullscreen.",
    modus: "Mode",
    auto: "Auto - follows the device",
    light: "Light",
    dark: "Dark",
    vollbild: "Fullscreen",
    vollbildAus: "Exit fullscreen",
    fest: (theme, modus) =>
      `The theme "${theme}" only has a ${modus === "dark" ? "dark" : "light"} mode.`,
    leer: "No control selected.",
    feld: { controls: "Controls", kiosk_only: "Fullscreen in Home Assistant only" },
    hilfe: {
      controls: "Shown in this order.",
      kiosk_only: "Only hides the sidebar and the header buttons. The browser window stays as it is.",
    },
    teil: { mode: "Mode", fullscreen: "Fullscreen" },
  },
};

const SYMBOL = {
  auto: "mdi:theme-light-dark",
  light: "mdi:white-balance-sunny",
  dark: "mdi:weather-night",
  vollbild: "mdi:fullscreen",
  vollbildAus: "mdi:fullscreen-exit",
};

export function sprache(hass) {
  const s = String(
    hass?.locale?.language || hass?.language
    || globalThis.document?.documentElement?.lang
    || globalThis.navigator?.language || "en"
  ).toLowerCase();
  return s.startsWith("de") ? "de" : "en";
}

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
// gespeichert, und zu sehen waere nichts. Deshalb sperrt die Karte die Wahl
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

// Was mit dem Ereignis mitgeht. NUR dark, nie theme: Die Karte schaltet den
// Modus, nicht die Theme. Home Assistant mischt das Detail in die bestehende
// Wahl ({...selectedTheme, ...detail}), der Theme-Name bleibt also stehen.
//
// Der Schluessel muss fuer "automatisch" DA sein und undefined tragen. Fehlt
// er, laesst das Mischen den alten Wert stehen - und "automatisch" taete
// nichts.
export function modusDetail(wahl) {
  return { dark: wahl === "dark" ? true : wahl === "light" ? false : undefined };
}

// Ein unbekanntes Bedienteil ist ein Fehler, kein stilles Nichts. Ein
// Tippfehler in der Liste liesse den Knopf sonst einfach verschwinden, und
// man suchte den Grund in der Karte statt in der eigenen Zeile.
export function pruefeConfig(config) {
  const roh = config?.controls;
  if (roh !== undefined && !Array.isArray(roh)) {
    throw new Error("controls muss eine Liste sein / controls must be a list");
  }
  const teile = roh === undefined ? BEDIENTEILE : roh;
  const fremd = teile.filter((t) => !BEDIENTEILE.includes(t));
  if (fremd.length) {
    throw new Error(
      `Unbekanntes Bedienteil / unknown control: ${fremd.join(", ")} `
      + `(bekannt / known: ${BEDIENTEILE.join(", ")})`
    );
  }
  return { controls: [...new Set(teile)], kiosk_only: config?.kiosk_only === true };
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
// "Bearbeiten" verschwinden - und der Menueknopf auch. Die Kopfzeile selbst
// bleibt stehen; dafuer hat Home Assistant keinen Schalter.
//
// GESPEICHERT WIRD DAS NICHT. Ein Neuladen der Seite stellt alles zurueck, und
// das ist auch der Ausweg, wenn man auf einer Ansicht ohne diese Karte steht:
// Im Kiosk-Modus gibt es keinen Menueknopf mehr.

function kiosk(an) {
  window.dispatchEvent(new CustomEvent("hass-kiosk-mode", { detail: { enable: an } }));
}

// Die Karte raeumt nur auf, was sie selbst angerichtet hat. Ein Vollbild, das
// jemand anders geoeffnet hat - ein Kamerabild etwa -, beendet sie nicht.
// Auf Modulebene, nicht in der Karte: Beim Wechsel der Ansicht entsteht die
// Karte neu und wuesste sonst nichts mehr davon.
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

// Beide Haelften in einem Aufruf - auch, damit ein Test die Kopplung ohne
// Browser fahren kann.
export function schalteVollbild(an, nurKiosk) {
  kiosk(an);
  if (!nurKiosk) browserVollbild(an);
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
    kiosk(false);
  });
}

// ---- Aussehen ------------------------------------------------------------
//
// Die Masse und Farben stehen in den elementStyles von ha-control-select und
// ha-control-button: Spur in --disabled-color bei 20 Prozent, Auswahl in
// --primary-color, 40 Pixel hoch, 4 Pixel Polster, 20-Pixel-Symbole. Die
// Rundung nimmt denselben Weg wie in den Kachel-Funktionen
// (--ha-card-features-border-radius, sonst --ha-border-radius-lg). Damit
// steht die Karte neben einer Kachel, ohne aufzufallen, und zieht mit, wenn
// die Theme eins dieser Felder aendert.
//
// Die Flaechen liegen als ::before UNTER dem Symbol, wie bei Home Assistant:
// So laesst sich die Deckkraft der Flaeche stellen, ohne das Symbol
// mitzunehmen.
//
// Jeder Knopf setzt seine Schriftfarbe selbst. button erbt sie nicht von der
// Karte, sondern vom Browser - dieselbe Falle wie im Panel.
const STIL = `
  :host { display: block; height: 100%; }
  ha-card {
    height: 100%; box-sizing: border-box;
    display: flex; align-items: center;
    padding: var(--ha-space-2, 8px);
  }
  .reihe {
    --_rund: var(--ha-card-features-border-radius, var(--ha-border-radius-lg, 12px));
    flex: 1; min-width: 0;
    display: flex; align-items: center; gap: var(--ha-space-2, 8px);
  }
  button {
    position: relative; z-index: 0; box-sizing: border-box;
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
  ha-icon { --mdc-icon-size: 20px; display: flex; pointer-events: none; }
  ha-ripple:not(:defined) { display: none; }

  .modus {
    position: relative; flex: 1; min-width: 0; height: 40px; box-sizing: border-box;
    display: flex; gap: 4px; padding: 4px;
    border-radius: var(--_rund);
  }
  .modus::before {
    content: ""; position: absolute; inset: 0; border-radius: inherit;
    background: var(--disabled-color); opacity: .2; pointer-events: none;
  }
  .wahl {
    flex: 1; min-width: 0; height: 100%;
    border-radius: calc(var(--_rund) - 4px);
  }
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

  .knopf {
    flex: none; width: 40px; height: 40px; overflow: hidden;
    border-radius: var(--_rund);
  }
  .knopf::before { background-color: var(--disabled-color); opacity: .2; }
  .knopf:focus-visible { box-shadow: 0 0 0 2px var(--secondary-text-color); }
  .knopf[aria-pressed="true"] { color: var(--ha-color-on-primary-loud, #fff); }
  .knopf[aria-pressed="true"]::before { background-color: var(--primary-color); opacity: 1; }

  .leer { color: var(--secondary-text-color); font-size: var(--ha-font-size-m, 14px);
          padding: 0 var(--ha-space-2, 8px); }
`;

const Basis = globalThis.HTMLElement || class {};

class HatsControlCard extends Basis {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("click", (ev) => this._klick(ev));
  }

  // Der Kartenwaehler legt die Liste ausdruecklich an. Ohne das zeigte der
  // Editor ein leeres Auswahlfeld, waehrend die Karte beide Teile zeichnet.
  static getStubConfig() {
    return { controls: [...BEDIENTEILE] };
  }

  // Home Assistant baut den Editor aus diesem Schema selbst.
  //
  // kiosk_only ist absichtlich so herum benannt, dass "aus" die Vorgabe ist:
  // Ein Schalter im Formular zeigt ein fehlendes Feld als aus. Hiesse es
  // browser_fullscreen mit Vorgabe an, staende der Schalter auf aus, waehrend
  // die Karte das Gegenteil taete.
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

  setConfig(config) {
    this._config = pruefeConfig(config);
    this._gebaut = null;
    this._zeichne();
  }

  // Home Assistant setzt hass bei JEDER Zustandsaenderung im Haus neu. Die
  // Karte haengt nur an vier Dingen, und nur die loesen ein Zeichnen aus.
  // Unveraenderte Teile reicht Home Assistant als dasselbe Objekt weiter, ein
  // Vergleich der Verweise genuegt also.
  set hass(hass) {
    const alt = this._hass;
    this._hass = hass;
    if (!alt
        || alt.themes !== hass.themes
        || alt.selectedTheme !== hass.selectedTheme
        || alt.kioskMode !== hass.kioskMode
        || sprache(alt) !== sprache(hass)) {
      this._zeichne();
    }
  }

  getCardSize() { return 1; }

  // Eine Zeile im Sections-Raster ist 56 Pixel hoch: 40 fuer die Bedienteile
  // und zweimal 8 Polster.
  getGridOptions() {
    return { columns: 6, rows: 1, min_columns: 4, min_rows: 1 };
  }

  _zeichne() {
    if (!this._config || !this._hass) return;
    const spr = sprache(this._hass);
    // Neu gebaut wird nur, wenn sich Aufbau oder Sprache aendern. Sonst
    // wechseln bloss Attribute - der Fokus bleibt, wo er ist.
    const marke = spr + "|" + this._config.controls.join(",");
    if (this._gebaut !== marke) { this._baue(spr); this._gebaut = marke; }
    this._stelle(spr);
  }

  _baue(spr) {
    const t = TEXTE[spr];
    const teil = {
      mode: `
        <div class="modus" role="group" aria-label="${t.modus}">
          ${["auto", "light", "dark"].map((w) => `
            <button type="button" class="wahl" data-wahl="${w}"
                    title="${t[w]}" aria-label="${t[w]}">
              <ha-icon icon="${SYMBOL[w]}"></ha-icon>
            </button>`).join("")}
        </div>`,
      fullscreen: `
        <button type="button" class="knopf" data-aktion="vollbild">
          <ha-icon></ha-icon>
          <ha-ripple></ha-ripple>
        </button>`,
    };
    const inhalt = this._config.controls.map((c) => teil[c]).join("")
      || `<div class="leer">${t.leer}</div>`;
    this.shadowRoot.innerHTML =
      `<style>${STIL}</style><ha-card><div class="reihe">${inhalt}</div></ha-card>`;
  }

  _stelle(spr) {
    const t = TEXTE[spr];
    const wurzel = this.shadowRoot;

    const gruppe = wurzel.querySelector(".modus");
    if (gruppe) {
      const lage = modusLage(this._hass);
      // Der Theme-Name kommt aus einer YAML-Datei und geht deshalb als
      // Attribut hinein, nie als HTML.
      gruppe.setAttribute("aria-disabled", String(!lage.schaltbar));
      if (lage.schaltbar) gruppe.removeAttribute("title");
      else gruppe.setAttribute("title", t.fest(lage.theme, lage.fest));
      for (const k of gruppe.querySelectorAll(".wahl")) {
        k.setAttribute("aria-pressed", String(k.dataset.wahl === lage.aktiv));
      }
    }

    const knopf = wurzel.querySelector(".knopf");
    if (knopf) {
      const an = this._hass.kioskMode === true;
      const text = an ? t.vollbildAus : t.vollbild;
      knopf.setAttribute("aria-pressed", String(an));
      knopf.setAttribute("title", text);
      knopf.setAttribute("aria-label", text);
      knopf.querySelector("ha-icon").setAttribute("icon", an ? SYMBOL.vollbildAus : SYMBOL.vollbild);
    }
  }

  _klick(ev) {
    const knopf = ev.target.closest?.("button");
    if (!knopf || !this._hass) return;

    if (knopf.dataset.wahl) {
      const lage = modusLage(this._hass);
      if (!lage.schaltbar) {
        this._melde(TEXTE[sprache(this._hass)].fest(lage.theme, lage.fest));
        return;
      }
      // Home Assistant hoert am Element <home-assistant>. Das Ereignis muss
      // also aufsteigen UND durch die Shadow-Grenzen - ohne composed bleibt
      // es in der Karte stecken, und nichts passiert, ohne Meldung.
      //
      // Was Home Assistant damit tut, am 13.10.2026 gemessen: Es legt die Wahl
      // im Browser ab UND in den Nutzerdaten auf dem Server (Schluessel
      // "theme"). Sie gilt damit fuer jedes Geraet, an dem derselbe Nutzer
      // angemeldet ist - nicht nur fuer dieses.
      this.dispatchEvent(new CustomEvent("settheme", {
        detail: modusDetail(knopf.dataset.wahl), bubbles: true, composed: true,
      }));
      return;
    }

    if (knopf.dataset.aktion === "vollbild") {
      schalteVollbild(this._hass.kioskMode !== true, this._config.kiosk_only);
    }
  }

  _melde(text) {
    this.dispatchEvent(new CustomEvent("hass-notification", {
      detail: { message: text }, bubbles: true, composed: true,
    }));
  }
}

if (globalThis.customElements && !customElements.get(KARTE)) {
  customElements.define(KARTE, HatsControlCard);
  // Damit die Karte im Kartenwaehler steht. Den Eintrag gibt es nur in einer
  // Sprache, also in der der Seite.
  const t = TEXTE[sprache()];
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: KARTE, name: t.name, description: t.beschreibung, preview: true,
  });
}

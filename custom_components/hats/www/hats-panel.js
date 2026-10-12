// HATS - Home Assistant Theme Studio
//
// Erster Stand: zeigt das Geruest, auf dem alles weitere aufsetzt - sechs
// Rollen, drei Lautstaerken, drei Zustaende, gelesen aus der laufenden Theme.
// Noch kein Schreiben; das kommt, wenn die Abstufung geklaert ist (siehe
// CLAUDE.md, "Noch nicht sauber").
//
// Gemessen wird ueber getComputedStyle, nicht ueber hass.themes - nur das
// Berechnete beweist, dass ein Wert ankommt.

const HATS_VERSION = "0.1.0b1";

const ROLLEN = ["primary", "neutral", "success", "warning", "danger", "disabled"];
const LAUT = ["quiet", "normal", "loud"];
const ZUSTAENDE = ["resting", "hover", "active"];

// Uebersetzungen gehoeren in den en-Block, nicht daneben. In HATG standen 21
// Eintraege eine Ebene zu hoch und waren damit stumm unerreichbar.
const TEXTE = {
  en: {
    "Rollen und Lautstärken": "Roles and loudness",
    "Aus diesen Feldern rechnet Home Assistant seine Oberfläche.":
      "Home Assistant computes its interface from these fields.",
    "Rolle": "Role",
    "ruhend": "resting",
    "überfahren": "hover",
    "gedrückt": "active",
    "Modus": "Mode",
    "hell": "light",
    "dunkel": "dark",
    "aktive Theme": "active theme",
    "nicht gesetzt": "not set",
    "Noch kein Schreiben – dieser Stand liest nur.":
      "No writing yet – this build only reads.",
  },
};

function uebersetze(text, sprache) {
  const tabelle = TEXTE[sprache];
  return (tabelle && tabelle[text]) || text;
}

class HatsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._gezeichnet = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._gezeichnet) {
      this._gezeichnet = true;
      this.zeichne();
    }
  }

  get sprache() {
    const s = (this._hass && this._hass.language) || "de";
    return s.startsWith("en") ? "en" : "de";
  }

  // Liest ein Feld und sagt, woher der Wert kommt. Ein leerer Wert ist eine
  // Aussage: Home Assistant setzt das Feld in diesem Modus nicht.
  lies(name) {
    const cs = getComputedStyle(document.documentElement);
    return cs.getPropertyValue(name).trim();
  }

  zeichne() {
    const t = (s) => uebersetze(s, this.sprache);
    const dunkel = Boolean(this._hass && this._hass.themes && this._hass.themes.darkMode);
    const theme = (this._hass && this._hass.themes && this._hass.themes.theme) || "default";

    const kopf = ZUSTAENDE.map((z) => `<th>${t(z === "resting" ? "ruhend" : z === "hover" ? "überfahren" : "gedrückt")}</th>`).join("");

    let zeilen = "";
    for (const rolle of ROLLEN) {
      for (const laut of LAUT) {
        const felder = ZUSTAENDE.map((zus) => {
          const name = `--ha-color-fill-${rolle}-${laut}-${zus}`;
          const wert = this.lies(name);
          if (!wert) return `<td class="leer">${t("nicht gesetzt")}</td>`;
          return `<td><span class="tupfen" style="background:${wert}"></span><code>${wert}</code></td>`;
        }).join("");
        const schrift = this.lies(`--ha-color-on-${rolle}-${laut}`);
        zeilen += `<tr>
          <th class="rolle"><b>${rolle}</b><span>${laut}</span></th>
          ${felder}
          <td class="auf" style="background:${this.lies(`--ha-color-fill-${rolle}-${laut}-resting`) || "transparent"};color:${schrift || "inherit"}">Aa</td>
        </tr>`;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 24px; box-sizing: border-box;
                background: var(--ha-color-surface-default, var(--primary-background-color));
                color: var(--ha-color-text-primary, var(--primary-text-color));
                font-family: var(--ha-font-family-body, Roboto, sans-serif);
                min-height: 100%; }
        h1 { font-size: var(--ha-font-size-2xl, 24px); font-weight: var(--ha-font-weight-heading, 700);
             margin: 0 0 4px; }
        p.unter { color: var(--ha-color-text-secondary, var(--secondary-text-color));
                  margin: 0 0 20px; font-size: var(--ha-font-size-m, 14px); }
        .leiste { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .chip { padding: 6px 12px; border-radius: var(--ha-border-radius-pill, 9999px);
                background: var(--ha-color-fill-neutral-quiet-resting, rgba(127,127,127,.12));
                font-size: var(--ha-font-size-s, 12px); }
        table { border-collapse: collapse; width: 100%; max-width: 920px; }
        th, td { text-align: left; padding: 6px 10px; font-size: var(--ha-font-size-s, 12px);
                 border-bottom: var(--ha-border-width-sm, 1px) solid
                                var(--ha-color-border-neutral-quiet, rgba(127,127,127,.2)); }
        th.rolle { white-space: nowrap; }
        th.rolle b { display: block; }
        th.rolle span { color: var(--ha-color-text-secondary, var(--secondary-text-color));
                        font-weight: var(--ha-font-weight-body, 400); }
        .tupfen { display: inline-block; width: 14px; height: 14px; vertical-align: -3px;
                  margin-right: 6px; border-radius: var(--ha-border-radius-sm, 4px);
                  box-shadow: inset 0 0 0 1px rgba(127,127,127,.3); }
        code { font-family: var(--ha-font-family-code, monospace); font-size: 11px; }
        td.leer { color: var(--ha-color-text-disabled, #999); font-style: italic; }
        td.auf { text-align: center; border-radius: var(--ha-border-radius-sm, 4px);
                 font-weight: var(--ha-font-weight-action, 500); }
        footer { margin-top: 24px; color: var(--ha-color-text-secondary, var(--secondary-text-color));
                 font-size: var(--ha-font-size-s, 12px); }
      </style>
      <h1>${t("Rollen und Lautstärken")}</h1>
      <p class="unter">${t("Aus diesen Feldern rechnet Home Assistant seine Oberfläche.")}</p>
      <div class="leiste">
        <span class="chip">${t("aktive Theme")}: <b>${theme}</b></span>
        <span class="chip">${t("Modus")}: <b>${dunkel ? t("dunkel") : t("hell")}</b></span>
        <span class="chip">HATS ${HATS_VERSION}</span>
      </div>
      <table>
        <thead><tr><th>${t("Rolle")}</th>${kopf}<th></th></tr></thead>
        <tbody>${zeilen}</tbody>
      </table>
      <footer>${t("Noch kein Schreiben – dieser Stand liest nur.")}</footer>
    `;
  }
}

customElements.define("hats-panel", HatsPanel);

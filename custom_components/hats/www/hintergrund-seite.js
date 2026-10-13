// Die Seite "Hintergrund" im Baukasten: was ueber die Wahl des Teils hinaus
// einstellbar ist - fest oder mitlaufend, Bewegung, Farbwechsel, Himmel.
//
// Warum eine eigene Datei und nicht ein paar Zeilen mehr im Panel: Die anderen
// Sorten schalten ihre Vorlagen ueber ein Kaestchen, weil eine Vorlage dort
// ein fester Block ist. Hier haben die Vorlagen Stellgroessen - Stufe,
// Ausschlag, Entitaet, Staerke -, und die stehen nirgends ausser im CSS, das
// im Theme liegt. Lesen und Schreiben gehoeren deshalb zusammen an einen Ort.
//
// Drei Teile, mit Absicht getrennt:
//
//   hintergrundStand()     liest aus dem Modell, was eingestellt ist
//   hintergrundAendern()   schreibt EINE Aenderung und meldet die Felder
//   ...Html() / binde...() zeichnen und verdrahten - duenn, ohne eigene Regeln
//
// Die ersten beiden kommen ohne Browser aus und sind so geprueft.

import { vorlageAn, vorlageAus } from "./theme.js";
import {
  istFest, festUnerkannt, stelleFest,
  bewegung, leseBewegung, bewegungNachBild, driftDauer, farbDauer, punkteDauer,
  istPunkteBild, PUNKTE_VORGABE,
  BEWEGUNG_ID, BEWEGUNG_STUFEN, BEWEGUNG_VORGABE,
  himmel, leseHimmel, istWetterEntitaet, HIMMEL_ID, HIMMEL_STUFEN, HIMMEL_VORGABE,
  vertraegtVorlage, HINTERGRUND_ZIEL,
} from "./hintergrund.js";

const FELD = "lovelace-background";
const STILZIEL = "uix-" + HINTERGRUND_ZIEL;
const EBENEN = ["flach", "light", "dark"];

// Der Ausschlag des Farbwechsels als Raster. Ein freier Regler von 5 bis 360
// haette 356 Stellungen, von denen sich keine zwei benachbarten unterscheiden.
export const AUSSCHLAEGE = [20, 40, 60, 90, 180, 360];

const stilText = (modell) => (typeof modell?.flach?.[STILZIEL] === "string" ? modell.flach[STILZIEL] : "");

// ---------------------------------------------------------------------------
// Lesen

export function hintergrundStand(modell) {
  const gesetzt = EBENEN
    .map((e) => modell?.[e]?.[FELD])
    .filter((w) => typeof w === "string" && w.trim());
  const text = stilText(modell);
  return {
    // Ohne Wert gibt es nichts fest zu stellen: Home Assistant malt dann
    // --primary-background-color, eine einzelne Farbe.
    hatHintergrund: gesetzt.length > 0,
    fest: gesetzt.length > 0 && gesetzt.every(istFest),
    // Hell fest und dunkel nicht - das kann nur von Hand entstanden sein.
    teilsFest: gesetzt.some(istFest) && !gesetzt.every(istFest),
    unerkannt: gesetzt.some(festUnerkannt),
    // Die Punkte einzeln zu bewegen geht nur auf einem Bild aus Farbpunkten.
    // Auf einem Foto oder einem einfachen Verlauf verschoebe derselbe Block
    // dessen erste Ebene - der Regler gehoert dort gesperrt, nicht versteckt:
    // Ein fehlender Regler sieht aus wie eine fehlende Funktion.
    punkteMoeglich: gesetzt.length > 0 && gesetzt.every(istPunkteBild),
    bewegung: leseBewegung(text),
    himmel: leseHimmel(text),
    stoerungen: vertraegtVorlage(text),
  };
}

// Die Wetter-Entitaeten dieser Instanz, fuer die Auswahl. Sortiert nach ID -
// Home Assistants eigene Reihenfolge ist keine, auf die man sich verlassen kann.
export function wetterEntitaeten(hass) {
  const zustaende = hass?.states || {};
  return Object.keys(zustaende)
    .filter(istWetterEntitaet)
    .sort()
    .map((id) => ({ id, name: String(zustaende[id]?.attributes?.friendly_name || id) }));
}

// ---------------------------------------------------------------------------
// Schreiben
//
// Eine Aenderung, ein Aufruf. Zurueck kommt, welche Felder sich WIRKLICH
// geaendert haben - das Panel fuehrt darueber Buch, und ein Regler, der auf
// seinem Wert losgelassen wird, soll keine Aenderung melden.
//
//   was      "fest" | "drift" | "punkte" | "farbe" | "weite" | "wetter" | "staerke"
//   zurueck  { felder: [...], abgelehnt: null | "stoerung" | "entitaet" }

export function hintergrundAendern(modell, was, wert) {
  const aus = { felder: [], abgelehnt: null };
  if (!modell) return aus;
  modell.flach = modell.flach || {};

  if (was === "fest") {
    // Der Wert wird dort geaendert, wo er steht - nicht ueber setze(). Das
    // raeumt beim Schreiben die andere Ebene weg: Aus einem Hintergrund je
    // Modus wuerde einer fuer beide, oder der Dunkelmodus stuende ohne da.
    for (const e of EBENEN) {
      const w = modell[e]?.[FELD];
      if (typeof w !== "string" || !w.trim()) continue;
      const neu = stelleFest(w, !!wert);
      if (neu !== w) { modell[e][FELD] = neu; aus.felder = [FELD]; }
    }
    return aus;
  }

  const vorher = stilText(modell);

  if (was === "drift" || was === "punkte" || was === "farbe" || was === "weite") {
    const alt = leseBewegung(vorher) || { drift: 0, punkte: 0, farbe: 0, weite: BEWEGUNG_VORGABE.weite };
    // bild.punkte muss bei JEDER Groesse mit, nicht nur beim Punkte-Regler:
    // Sonst schriebe ein Zug am Treiben die Punktbewegung wieder mit hinein,
    // die leseBewegung() aus dem alten Block durchgereicht hat - auf einem
    // Hintergrund, der sie nicht vertraegt.
    const v = bewegung({ ...alt, [was]: Number(wert) }, { punkte: hintergrundStand(modell).punkteMoeglich });
    if (v) vorlageAn(modell, v);
    else vorlageAus(modell, { id: BEWEGUNG_ID, ziel: HINTERGRUND_ZIEL });
  } else if (was === "wetter" || was === "staerke") {
    const alt = leseHimmel(vorher) || { wetter: "", staerke: HIMMEL_VORGABE.staerke };
    const neu = { ...alt, [was]: was === "staerke" ? Number(wert) : String(wert ?? "") };
    if (!neu.wetter) {
      // Ausschalten geht immer - auch wenn das Feld inzwischen gestoert ist.
      vorlageAus(modell, { id: HIMMEL_ID, ziel: HINTERGRUND_ZIEL });
    } else if (!istWetterEntitaet(neu.wetter)) {
      aus.abgelehnt = "entitaet";
      return aus;
    } else if (vertraegtVorlage(vorher).length) {
      // Eine Vorlage im Feld schickt das GANZE Feld durch Jinja. Steht dort
      // etwas, das Jinja anders liest als CSS, ist danach alles weg - auch
      // die Kopfleiste. Also nicht schreiben, sondern die Stelle zeigen.
      aus.abgelehnt = "stoerung";
      return aus;
    } else {
      vorlageAn(modell, himmel(neu));
    }
  } else {
    return aus;
  }

  if (stilText(modell) !== vorher) aus.felder = [STILZIEL];
  return aus;
}

// Nach JEDEM Wechsel des Hintergrunds aufzurufen - vom Panel, direkt hinter
// teilAnwenden(). Zwei Dinge, die sonst still schiefgehen:
//
// 1. Wer von den Farbpunkten zu einem Foto wechselt, waehrend die Punkte
//    laufen, verschiebt von da an die erste Ebene des Fotos. Das sieht nach
//    einem kaputten Bild aus, nicht nach einer Bewegung.
// 2. "Die Farbpunkte sollen sich leicht bewegen" - Ansage des Maintainers vom
//    13.10.2026. Wer einen der Farbverlaeufe waehlt und noch gar keine
//    Bewegung eingestellt hat, bekommt sie deshalb. Wer schon eine hat, behaelt
//    seine: Eine Vorgabe, die eine Einstellung ueberschreibt, ist keine
//    Vorgabe, sondern ein Verlust.
//
// zurueck: die Felder, die sich geaendert haben - dieselbe Form wie oben.
export function hintergrundGewaehlt(modell) {
  const aus = { felder: [], abgelehnt: null };
  if (!modell) return aus;
  modell.flach = modell.flach || {};
  const vorher = stilText(modell);
  const s = hintergrundStand(modell);

  const r = bewegungNachBild(vorher, EBENEN.map((e) => modell?.[e]?.[FELD]));
  if (r === null) vorlageAus(modell, { id: BEWEGUNG_ID, ziel: HINTERGRUND_ZIEL });
  else if (r) vorlageAn(modell, r);
  else if (!s.bewegung && s.punkteMoeglich) vorlageAn(modell, bewegung(PUNKTE_VORGABE, { punkte: true }));

  if (stilText(modell) !== vorher) aus.felder = [STILZIEL];
  return aus;
}

// ---------------------------------------------------------------------------
// Zeichnen

const TEXTE = {
  lage: ["Lage", "Position"],
  fest: ["Fest am Fenster", "Fixed to the window"],
  festZweck: ["Der Hintergrund bleibt beim Rollen stehen und liegt auch unter der Seitenleiste. Ohne das ist er so hoch wie die ganze Seite - auf einer langen Ansicht rutscht ein Teil davon aus dem ersten Bildschirm.",
    "The background stays put while scrolling and also sits behind the sidebar. Without it, it is as tall as the whole page - on a long view part of it slides below the first screen."],
  festOhne: ["Erst einen Hintergrund waehlen.", "Choose a background first."],
  festUnerkannt: ["Im Wert steht \"fixed\" an einer Stelle, an der Home Assistant es nicht erkennt (hinter einem Komma oder einem Umbruch). Das Bild steht dann still, seine Flaeche laeuft aber mit.",
    "The value contains \"fixed\" in a place where Home Assistant does not recognise it (after a comma or a line break). The image then stands still while its surface keeps scrolling."],
  festTeils: ["Hell und dunkel sind verschieden aufgehaengt. Der Schalter stellt beide gleich.",
    "Light and dark are attached differently. The switch makes both the same."],
  bewegung: ["Bewegung", "Motion"],
  brauchtUix: ["braucht UI eXtension", "needs UI eXtension"],
  drift: ["Treiben", "Drift"],
  punkte: ["Farbpunkte", "Colour spots"],
  punkteNur: ["Die Farbpunkte lassen sich nur auf einem Hintergrund aus Farbpunkten einzeln bewegen. Auf einem Foto oder einem einfachen Verlauf wuerde derselbe Regler das Bild verschieben.",
    "Colour spots can only be moved individually on a background made of colour spots. On a photo or a plain gradient the same slider would shift the image."],
  farbe: ["Farbwechsel", "Colour shift"],
  weite: ["Ausschlag", "Range"],
  bewegungZweck: ["Der Hintergrund treibt langsam und kann dabei seinen Farbton wechseln. Wer am Geraet \"Bewegung reduzieren\" eingestellt hat, bekommt keine. Fuer das Treiben wird die Flaeche fest gestellt.",
    "The background drifts slowly and can shift its hue while doing so. Devices set to \"reduce motion\" get none. Drifting fixes the surface to the window."],
  himmel: ["Himmel", "Sky"],
  wetter: ["Wetter", "Weather"],
  staerke: ["Staerke", "Strength"],
  aus: ["aus", "off"],
  kreis: ["Kreis", "full"],
  nichtHier: ["nicht auf dieser Instanz", "not on this instance"],
  himmelZweck: ["Ein Farbschleier ueber dem Hintergrund, der der Wetter-Entitaet und dem Sonnenstand folgt. Die Farben kommen aus der Theme. Die Entitaet steht in der Theme-Datei - wer sie weitergibt, gibt den Namen mit.",
    "A colour veil over the background that follows the weather entity and the sun. The colours come from the theme. The entity is written into the theme file - whoever passes it on passes the name along."],
  keinWetter: ["Auf dieser Instanz gibt es keine Wetter-Entitaet.", "This instance has no weather entity."],
  stoerung: ["Der Himmel laesst sich so nicht einschalten: Im Stilziel \"Grundgeruest\" steht CSS, das eine Vorlage zerlegen wuerde. Danach kaeme von dem ganzen Feld nichts mehr an.",
    "The sky cannot be switched on like this: the style target \"Dashboard root\" contains CSS that a template would break. Nothing of the whole field would arrive afterwards."],
  zeile: ["Zeile", "line"],
};
const T = (k, spr) => TEXTE[k][spr === "en" ? 1 : 0];

// Namen von Entitaeten kommen aus der Instanz und gehoeren nicht ungeprueft
// ins HTML.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Was neben einem Regler steht. Eigene Funktion, weil dieselbe Zeile beim
// Zeichnen und bei jedem Schritt des Reglers gebraucht wird.
export function anzeige(was, wert, spr) {
  const z = Number(wert);
  if (was === "drift") return z ? driftDauer(z) + " s" : T("aus", spr);
  if (was === "punkte") return z ? punkteDauer(z) + " s" : T("aus", spr);
  if (was === "farbe") return z ? farbDauer(z) + " s" : T("aus", spr);
  if (was === "weite") { const g = AUSSCHLAEGE[z] ?? AUSSCHLAEGE[1]; return g === 360 ? T("kreis", spr) : g + "°"; }
  return String(wert);
}

const weiteStelle = (grad) => {
  let beste = 0;
  AUSSCHLAEGE.forEach((g, i) => { if (Math.abs(g - grad) < Math.abs(AUSSCHLAEGE[beste] - grad)) beste = i; });
  return beste;
};

export function hintergrundSeiteHtml({ modell, spr = "de", wetter = [] } = {}) {
  const s = hintergrundStand(modell);
  const zu = modell ? "" : "disabled";
  const b = s.bewegung || { drift: 0, punkte: 0, farbe: 0, weite: BEWEGUNG_VORGABE.weite };
  const h = s.himmel || { wetter: "", staerke: HIMMEL_VORGABE.staerke };
  const regel = (was, min, max, wert, sperre = "") => `
            <label class="bk-regel">
              <span>${T(was, spr)}</span>
              <input type="range" data-hg="${was}" min="${min}" max="${max}" step="1" value="${wert}" ${zu} ${sperre}>
              <b data-hg-wert="${was}">${esc(anzeige(was, wert, spr))}</b>
            </label>`;

  // Die Entitaet aus der Theme steht immer in der Liste, auch wenn es sie hier
  // nicht gibt - sonst zeigte die Auswahl "aus", waehrend der Himmel laeuft.
  const liste = wetter.slice();
  if (h.wetter && !liste.some((w) => w.id === h.wetter)) liste.push({ id: h.wetter, name: `${h.wetter} (${T("nichtHier", spr)})` });

  return `
        <style>
          .hg-wahl { width: 100%; min-width: 0; font: inherit; font-size: 13px; padding: 6px 8px;
                     border-radius: 8px; border: 1px solid rgba(27,36,48,.18);
                     background: var(--s-karte); color: var(--s-tinte); }
          .hg-stoerung code { display: block; margin-top: 6px; font-size: 11.5px; white-space: pre-wrap; }
        </style>

        <section class="bk-sorte" data-hg-seite>
          <h3>${T("lage", spr)}</h3>
          <div class="bk-tweaks">
            <label class="bk-tweak ${s.fest ? "an" : ""}">
              <input type="checkbox" data-hg="fest" ${s.fest ? "checked" : ""} ${zu} ${s.hatHintergrund ? "" : "disabled"}>
              <span class="bk-name">${T("fest", spr)}</span>
              <span class="bk-zweck">${s.hatHintergrund ? T("festZweck", spr) : T("festOhne", spr)}</span>
            </label>
          </div>
          ${s.unerkannt ? `<p class="bk-hinweis">${T("festUnerkannt", spr)}</p>` : ""}
          ${s.teilsFest ? `<p class="bk-hinweis">${T("festTeils", spr)}</p>` : ""}
        </section>

        <section class="bk-sorte">
          <h3>${T("bewegung", spr)} <span class="bk-zahl">${T("brauchtUix", spr)}</span></h3>
          <div class="bk-regler">${regel("drift", 0, BEWEGUNG_STUFEN, b.drift)}${regel("punkte", 0, BEWEGUNG_STUFEN, b.punkte, s.punkteMoeglich ? "" : "disabled")}${regel("farbe", 0, BEWEGUNG_STUFEN, b.farbe)}${regel("weite", 0, AUSSCHLAEGE.length - 1, weiteStelle(b.weite), b.farbe ? "" : "disabled")}
          </div>
          <p class="bk-zweck">${T("bewegungZweck", spr)}</p>
          ${s.hatHintergrund && !s.punkteMoeglich ? `<p class="bk-hinweis">${T("punkteNur", spr)}</p>` : ""}
        </section>

        <section class="bk-sorte">
          <h3>${T("himmel", spr)} <span class="bk-zahl">${T("brauchtUix", spr)}</span></h3>
          ${s.stoerungen.length ? `
          <p class="bk-hinweis hg-stoerung"><span>${T("stoerung", spr)}
            <code>${s.stoerungen.slice(0, 3).map((f) => `${T("zeile", spr)} ${f.zeile}: ${esc(f.text)}`).join("\n")}</code></span></p>` : ""}
          <div class="bk-regler">
            <label class="bk-regel">
              <span>${T("wetter", spr)}</span>
              <select class="hg-wahl" data-hg="wetter" ${zu}>
                <option value="">${T("aus", spr)}</option>
                ${liste.map((w) => `<option value="${esc(w.id)}" ${w.id === h.wetter ? "selected" : ""}>${esc(w.name)}</option>`).join("")}
              </select>
              <b></b>
            </label>${regel("staerke", 1, HIMMEL_STUFEN, h.staerke, h.wetter ? "" : "disabled")}
          </div>
          <p class="bk-zweck">${wetter.length || h.wetter ? T("himmelZweck", spr) : T("keinWetter", spr)}</p>
        </section>`;
}

// Verdrahten. Die Regler schreiben erst beim Loslassen ins Modell, wie auf
// den anderen Seiten des Baukastens - beim Ziehen aendert sich nur die Zahl
// daneben.
//
//   modell    () => das Modell, zum Zeitpunkt der Aenderung gelesen
//   gemeldet  (felder) => Buchfuehrung des Panels
//   zeichne   () => die Seite neu zeichnen
export function bindeHintergrundSeite(wurzel, { modell, spr = "de", gemeldet, zeichne }) {
  wurzel.querySelectorAll("[data-hg]").forEach((el) => {
    const was = el.dataset.hg;
    const zahl = wurzel.querySelector(`[data-hg-wert="${was}"]`);
    if (el.type === "range") el.addEventListener("input", () => { if (zahl) zahl.textContent = anzeige(was, el.value, spr); });
    el.addEventListener("change", () => {
      const m = modell();
      if (!m) return;
      const wert = el.type === "checkbox" ? el.checked : was === "weite" ? AUSSCHLAEGE[Number(el.value)] : el.value;
      const r = hintergrundAendern(m, was, wert);
      if (r.felder.length) gemeldet(r.felder);
      zeichne();
    });
  });
}

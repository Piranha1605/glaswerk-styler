// Der Baukasten der Bedienelemente.
//
// Formen nach der Vorlage vom 12.10.2026 (Dribbble): Kapsel, Bahn, Segmente,
// und rechts an jedem Element ein Zurueck-Knopf. Die Farben sind unsere -
// das Panel faerbt sich aus eigenen Werten, nicht aus der Theme, die es
// bearbeitet.
//
// Jede Funktion liefert HTML und bekommt eine `id`. Das Binden der Ereignisse
// macht `binde()` nachtraeglich, damit die Elemente auch in einer Liste
// erzeugt werden koennen, die erst spaeter in den Baum kommt.

import { hexZuHsl, hslZuHex } from "./palette.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// Zuruecksetzen heisst: Feld leeren. Leer ist kein Mangel, sondern der
// Zustand, in dem Home Assistant selbst entscheidet - und bei allem, was je
// nach Zusammenhang anders belegt ist, der einzig richtige.
export function zuruecksetzen(id, titel = "Auf die Vorgabe zuruecksetzen") {
  return `<button class="be-zurueck" data-be-reset="${esc(id)}" title="${esc(titel)}" aria-label="${esc(titel)}">⟲</button>`;
}

export function regler({ id, wert, min = 0, max = 100, schritt = 1, einheit = "" }) {
  const v = Number.isFinite(+wert) ? +wert : min;
  return `
    <div class="be be-regler">
      <input type="range" data-be="${esc(id)}" min="${min}" max="${max}" step="${schritt}" value="${v}">
      <output data-be-aus="${esc(id)}">${v}${esc(einheit)}</output>
      ${zuruecksetzen(id)}
    </div>`;
}

// Eine Farbe wird gezeigt UND eingegeben: die Bahn traegt den Verlauf, der
// Waehler daneben den genauen Wert. Ein Farbwaehler allein zeigt nicht, wie
// die Farbe im Verhaeltnis zu den anderen steht.
export function hexTeilen(wert) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(wert || "").trim());
  if (!m) return { hex: "#888888", alpha: 100 };
  return { hex: "#" + m[1], alpha: m[2] === undefined ? 100 : Math.round((parseInt(m[2], 16) / 255) * 100) };
}

// Alpha wird als ACHTSTELLIGES HEX geschrieben, nicht als rgba(). Home
// Assistant leitet --rgb-<name> nur aus Werten ab, die mit # beginnen - aus
// rgba() entsteht kein Tripel, und Mushroom baut seine Zustandsfarben aus
// genau diesen Tripeln. Achtstelliges Hex parst culori, das Alpha faellt beim
// Tripel weg; die Farbe stimmt also, und die Durchsichtigkeit bleibt im CSS.
export function hexFuegen(hex, alpha) {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "#888888";
  const a = Math.min(100, Math.max(0, Math.round(Number(alpha))));
  if (a >= 100) return h;
  return h + Math.round((a / 100) * 255).toString(16).padStart(2, "0");
}

// Beide Schieber sind gleich gebaut und liegen in derselben Rasterspalte -
// gleiche Laenge, gleiche Bahn, gleiches Ziehen. Die obere Bahn fuehrt durch
// die Helligkeit des gewaehlten Tons, die untere durch seine Deckung.
export function farbe({ id, wert, bahn = [], alpha = true }) {
  const { hex, alpha: a } = hexTeilen(wert);
  const hsl = hexZuHsl(hex) || { h: 0, s: 0, l: 0.5 };
  const dunkel = hslZuHex(hsl.h, hsl.s, 0.02), voll = hslZuHex(hsl.h, hsl.s, 0.5), hellster = hslZuHex(hsl.h, hsl.s, 0.98);
  const verlauf = bahn.length >= 2
    ? `linear-gradient(90deg, ${bahn.join(", ")})`
    : `linear-gradient(90deg, ${dunkel}, ${voll}, ${hellster})`;
  const alphaTeil = alpha ? `
      <input type="range" class="be-schiene be-karo" data-be-alpha="${esc(id)}"
             min="0" max="100" step="1" value="${a}"
             style="--bahn:linear-gradient(90deg, ${hex}00, ${hex})">
      <span></span>
      <output data-be-alpha-aus="${esc(id)}">${a}%</output>
      <span></span>` : "";
  return `
    <div class="be be-farbe${alpha ? " mit-alpha" : ""}"
         data-h="${hsl.h.toFixed(1)}" data-s="${hsl.s.toFixed(3)}">
      <input type="range" class="be-schiene" data-be-hell="${esc(id)}"
             min="2" max="98" step="1" value="${Math.round(hsl.l * 100)}"
             style="--bahn:${verlauf}">
      <input type="color" data-be-farbe="${esc(id)}" value="${esc(hex)}">
      <!-- Eintippbar, nicht nur lesbar. Vorher stand hier ein <code>, und die
           einzige Art, einen Ton zu wechseln, war ein Klick auf das Quadrat -
           also der Farbwaehler des Betriebssystems. Wer eine Farbe aus einem
           Entwurf uebernehmen will, hat sie als Hexwert und nicht als Mausweg. -->
      <input type="text" class="be-hex" data-be-aus="${esc(id)}" data-be-hex="${esc(id)}"
             value="${esc(wert || "")}" placeholder="nicht gesetzt"
             spellcheck="false" autocapitalize="off" autocomplete="off">
      ${zuruecksetzen(id)}
      ${alphaTeil}
    </div>`;
}

// Ein schmaler Streifen ueber dem Feld: in welchem Modus gearbeitet wird, ob
// Bubble und Mushroom mitziehen, und ein Weg zurueck auf HAs Vorgabe.
export function infostreifen({ id, modus = "beide", modi = [], sync = [], zurueck = true }) {
  // titel traegt die Begruendung, warum ein Knopf allein steht - sonst sieht
  // ein Feld ohne Hell/Dunkel nach einem Versehen aus.
  const knopf = (m) => `<button data-be-modus="${esc(id)}" data-wert="${esc(m.wert)}"
      class="${m.wert === modus ? "an" : ""}" ${m.aus ? "disabled" : ""}
      ${m.titel ? `title="${esc(m.titel)}"` : ""}>${esc(m.name)}</button>`;
  const lampe = (s) => `<span class="ampel ${s.stand}" title="${esc(s.titel || "")}">
      <i></i>${esc(s.name)}</span>`;
  return `
    <div class="infostreifen">
      <div class="be-segmente klein">${modi.map(knopf).join("")}</div>
      <div class="ampeln">${sync.map(lampe).join("")}</div>
      ${zurueck ? zuruecksetzen(id, "Zurueck auf die Vorgabe von Home Assistant") : ""}
    </div>`;
}

export function segmente({ id, wert, optionen }) {
  return `
    <div class="be be-segmente" role="group">
      ${optionen.map((o) => `
        <button data-be="${esc(id)}" data-wert="${esc(o.wert)}" class="${o.wert === wert ? "an" : ""}"
                ${o.titel ? `title="${esc(o.titel)}"` : ""}>${esc(o.name)}</button>`).join("")}
      ${zuruecksetzen(id)}
    </div>`;
}

export function schalter({ id, an, aus = "aus", ein = "an" }) {
  return segmente({ id, wert: an ? "an" : "aus",
    optionen: [{ wert: "aus", name: aus }, { wert: "an", name: ein }] });
}

export function textfeld({ id, wert, platzhalter = "" }) {
  return `
    <div class="be be-text">
      <input type="text" data-be="${esc(id)}" value="${esc(wert || "")}" placeholder="${esc(platzhalter)}">
      ${zuruecksetzen(id)}
    </div>`;
}

// Nach Feldart das passende Element. Eine Stelle, an der entschieden wird -
// wer eine Art ergaenzt, aendert nur hier und in den Felddaten.
export function fuerFeld(f, wert) {
  const id = f.v || f.t;
  switch (f.art) {
    // Bei einer Rolle kein Alpha: die elf Stufen entstehen deckend, eine
    // durchsichtige Grundfarbe waere irrefuehrend - sie wirkte nur auf den
    // Grundton, nicht auf die Rampe.
    case "farbe": return farbe({ id, wert, bahn: f.bahn, alpha: !f.rolle && f.alpha !== false });
    case "mass": return regler({ id, wert: parseFloat(wert), min: f.min ?? 0, max: f.max ?? 48, schritt: f.schritt ?? 1, einheit: f.einheit ?? "px" });
    case "zahl": return regler({ id, wert: parseFloat(wert), min: f.min ?? 0, max: f.max ?? 2, schritt: f.schritt ?? 0.05, einheit: "" });
    case "auswahl": return segmente({ id, wert, optionen: f.optionen || [] });
    case "schalter": return schalter({ id, an: wert === "an" || wert === true });
    default: return textfeld({ id, wert, platzhalter: f.platzhalter });
  }
}

// Ereignisse nachtraeglich binden. `aendern(id, wert)` bekommt immer einen
// String oder null - null heisst "zuruecksetzen", also Feld leeren.
// Ein Ausgabeziel kann ein <code> oder ein <input> sein.
function setzeAus(el, v) {
  if (el.tagName === "INPUT") {
    if (document.activeElement !== el) el.value = v;
  } else {
    el.textContent = v;
  }
}

// Was als Farbe durchgeht. Drei, vier, sechs oder acht Stellen - dieselbe
// Spanne, die auch hexTeilen kennt.
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function binde(wurzel, aendern) {
  // Der Hexwert laesst sich eintippen. Geprueft wird bei jedem Zeichen, aber
  // gemeldet nur, was gueltig ist - sonst stuende nach dem ersten Tastendruck
  // "#" im Theme.
  wurzel.querySelectorAll("[data-be-hex]").forEach((el) => {
    const id = el.dataset.beHex;
    const farbEl = wurzel.querySelector(`[data-be-farbe="${CSS.escape(id)}"]`);
    const alphaEl = wurzel.querySelector(`[data-be-alpha="${CSS.escape(id)}"]`);
    const pruefe = () => {
      const roh = el.value.trim();
      const mitRaute = roh && !roh.startsWith("#") ? "#" + roh : roh;
      el.classList.toggle("falsch", Boolean(mitRaute) && !HEX_RE.test(mitRaute));
      if (!HEX_RE.test(mitRaute)) return;
      const { hex, alpha } = hexTeilen(mitRaute);
      if (farbEl) { farbEl.value = hex; }
      if (alphaEl) { alphaEl.value = alpha; }
      // Ueber das Farbfeld melden, damit Bahn, Helligkeitsregler und Rampe
      // denselben Weg nehmen wie bei jeder anderen Aenderung.
      if (farbEl) farbEl.dispatchEvent(new Event("input"));
      else aendern(id, mitRaute);
    };
    el.addEventListener("input", pruefe);
    el.addEventListener("change", pruefe);
  });

  // Farbe und Alpha gehoeren zusammen: jede Bewegung meldet den fertigen Wert,
  // nicht die Haelfte davon.
  wurzel.querySelectorAll("[data-be-farbe]").forEach((el) => {
    const id = el.dataset.beFarbe;
    const kasten = el.closest(".be");
    const schieber = wurzel.querySelector(`[data-be-alpha="${CSS.escape(id)}"]`);
    const hellSch = wurzel.querySelector(`[data-be-hell="${CSS.escape(id)}"]`);

    // Der Helligkeitsschieber faehrt durch den gewaehlten Ton. Hue und
    // Saettigung bleiben, wo sie sind - sonst springt die Farbe beim Ziehen.
    if (hellSch) hellSch.addEventListener("input", () => {
      const h = parseFloat(kasten.dataset.h), sa = parseFloat(kasten.dataset.s);
      el.value = hslZuHex(h, sa, hellSch.value / 100);
      el.dispatchEvent(new Event("input"));
    });

    const melde = () => {
      const neu = hexZuHsl(el.value);
      if (neu) { kasten.dataset.h = neu.h.toFixed(1); kasten.dataset.s = neu.s.toFixed(3);
                 if (hellSch && document.activeElement !== hellSch) hellSch.value = Math.round(neu.l * 100);
                 if (hellSch) hellSch.style.setProperty("--bahn",
                   `linear-gradient(90deg, ${hslZuHex(neu.h, neu.s, 0.02)}, ${hslZuHex(neu.h, neu.s, 0.5)}, ${hslZuHex(neu.h, neu.s, 0.98)})`); }
      const v = hexFuegen(el.value, schieber ? schieber.value : 100);
      const aus = wurzel.querySelector(`[data-be-aus="${CSS.escape(id)}"]`);
      // Das Ausgabefeld ist bei Farben ein Eingabefeld - dort gehoert der Wert
      // in .value, nicht in .textContent. Waehrend getippt wird, bleibt es in
      // Ruhe, sonst springt der Cursor.
      if (aus) setzeAus(aus, v);
      const aAus = wurzel.querySelector(`[data-be-alpha-aus="${CSS.escape(id)}"]`);
      if (aAus && schieber) aAus.textContent = schieber.value + "%";
      if (schieber) schieber.style.setProperty("--bahn",
        `linear-gradient(90deg, ${el.value}00, ${el.value})`);
      aendern(id, v);
    };
    el.addEventListener("input", melde);
    el.addEventListener("change", melde);
    if (schieber) { schieber.addEventListener("input", melde); schieber.addEventListener("change", melde); }
  });

  wurzel.querySelectorAll("[data-be]").forEach((el) => {
    const id = el.dataset.be;
    if (el.tagName === "BUTTON") {
      el.addEventListener("click", () => {
        wurzel.querySelectorAll(`button[data-be="${CSS.escape(id)}"]`).forEach((b) => b.classList.remove("an"));
        el.classList.add("an");
        aendern(id, el.dataset.wert);
      });
      return;
    }
    const melde = () => {
      const aus = wurzel.querySelector(`[data-be-aus="${CSS.escape(id)}"]`);
      if (aus) setzeAus(aus, el.value + (el.type === "range" ? (el.dataset.einheit || "") : ""));
      aendern(id, el.value);
    };
    el.addEventListener("input", melde);
    el.addEventListener("change", melde);
  });
  wurzel.querySelectorAll("[data-be-modus]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.disabled) return;
      wurzel.querySelectorAll(`[data-be-modus="${CSS.escape(b.dataset.beModus)}"]`)
        .forEach((x) => x.classList.remove("an"));
      b.classList.add("an");
      aendern(b.dataset.beModus, { modus: b.dataset.wert });
    })
  );
  wurzel.querySelectorAll("[data-be-reset]").forEach((b) =>
    b.addEventListener("click", () => aendern(b.dataset.beReset, null))
  );
}

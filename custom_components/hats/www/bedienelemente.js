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
export function farbe({ id, wert, bahn = [] }) {
  const v = /^#[0-9a-fA-F]{6}$/.test(String(wert || "")) ? wert : "#888888";
  const verlauf = bahn.length >= 2
    ? `linear-gradient(90deg, ${bahn.join(", ")})`
    : `linear-gradient(90deg, #000, ${v}, #fff)`;
  return `
    <div class="be be-farbe">
      <span class="be-bahn" style="background:${verlauf}"></span>
      <input type="color" data-be="${esc(id)}" value="${esc(v)}">
      <code data-be-aus="${esc(id)}">${esc(wert || "nicht gesetzt")}</code>
      ${zuruecksetzen(id)}
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
    case "farbe": return farbe({ id, wert, bahn: f.bahn });
    case "mass": return regler({ id, wert: parseFloat(wert), min: f.min ?? 0, max: f.max ?? 48, schritt: f.schritt ?? 1, einheit: f.einheit ?? "px" });
    case "zahl": return regler({ id, wert: parseFloat(wert), min: f.min ?? 0, max: f.max ?? 2, schritt: f.schritt ?? 0.05, einheit: "" });
    case "auswahl": return segmente({ id, wert, optionen: f.optionen || [] });
    case "schalter": return schalter({ id, an: wert === "an" || wert === true });
    default: return textfeld({ id, wert, platzhalter: f.platzhalter });
  }
}

// Ereignisse nachtraeglich binden. `aendern(id, wert)` bekommt immer einen
// String oder null - null heisst "zuruecksetzen", also Feld leeren.
export function binde(wurzel, aendern) {
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
      if (aus) aus.textContent = el.value + (el.type === "range" ? (el.dataset.einheit || "") : "");
      aendern(id, el.value);
    };
    el.addEventListener("input", melde);
    el.addEventListener("change", melde);
  });
  wurzel.querySelectorAll("[data-be-reset]").forEach((b) =>
    b.addEventListener("click", () => aendern(b.dataset.beReset, null))
  );
}

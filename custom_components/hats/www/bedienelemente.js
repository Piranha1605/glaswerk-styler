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

export function farbe({ id, wert, bahn = [], alpha = true }) {
  const { hex, alpha: a } = hexTeilen(wert);
  const verlauf = bahn.length >= 2
    ? `linear-gradient(90deg, ${bahn.join(", ")})`
    : `linear-gradient(90deg, #000, ${hex}, #fff)`;
  // Das Karo zeigt die Durchsichtigkeit - ohne es sieht halbdurchsichtiges
  // Weiss aus wie deckendes Weiss.
  const alphaTeil = alpha ? `
      <span class="be-alpha">
        <i class="be-karo"><b style="background:linear-gradient(90deg, ${hex}00, ${hex})"></b></i>
        <input type="range" data-be-alpha="${esc(id)}" min="0" max="100" step="1" value="${a}">
        <output data-be-alpha-aus="${esc(id)}">${a}%</output>
      </span>` : "";
  return `
    <div class="be be-farbe${alpha ? " mit-alpha" : ""}">
      <span class="be-bahn" style="background:${verlauf}"></span>
      <input type="color" data-be-farbe="${esc(id)}" value="${esc(hex)}">
      <code data-be-aus="${esc(id)}">${esc(wert || "nicht gesetzt")}</code>
      ${zuruecksetzen(id)}
      ${alphaTeil}
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
export function binde(wurzel, aendern) {
  // Farbe und Alpha gehoeren zusammen: jede Bewegung meldet den fertigen Wert,
  // nicht die Haelfte davon.
  wurzel.querySelectorAll("[data-be-farbe]").forEach((el) => {
    const id = el.dataset.beFarbe;
    const schieber = wurzel.querySelector(`[data-be-alpha="${CSS.escape(id)}"]`);
    const melde = () => {
      const v = hexFuegen(el.value, schieber ? schieber.value : 100);
      const aus = wurzel.querySelector(`[data-be-aus="${CSS.escape(id)}"]`);
      if (aus) aus.textContent = v;
      const aAus = wurzel.querySelector(`[data-be-alpha-aus="${CSS.escape(id)}"]`);
      if (aAus && schieber) aAus.textContent = schieber.value + "%";
      const karo = wurzel.querySelector(`[data-be-farbe="${CSS.escape(id)}"]`)
        ?.closest(".be")?.querySelector(".be-karo b");
      if (karo) karo.style.background = `linear-gradient(90deg, ${el.value}00, ${el.value})`;
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

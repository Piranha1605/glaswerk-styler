// Aus einer Farbe die elf Palettenstufen rechnen.
//
// Warum ueberhaupt: Home Assistant nimmt die kraeftigen Flaechen aus Stufe 40,
// die Ueberfahr-Stufe aus 30, die leisen aus 95. Wer nur einen Wert setzt,
// laesst die halbe Oberflaeche auf der alten Farbe stehen - genau der Fall,
// der bei HATG am 11.10.2026 zu blauen Knoepfen trotz grauem Akzent fuehrte.
//
// Wie: Jede Rolle behaelt HAs eigenes Helligkeits- und Saettigungsprofil, und
// nur der Farbton kommt vom Nutzer. Ein Mittelwert ueber alle Rollen waere
// falsch - Gruen sitzt bei Stufe 50 auf 27 % Helligkeit, Rot auf 53 %, weil
// die Rampen von Hand auf die Wahrnehmung abgestimmt sind.
//
// Die Zahlen unten sind am 12.10.2026 aus docs/beispiele/ha-blanko.yaml
// gemessen, also aus HAs eigenen Werten, nicht geschaetzt. Was daraus
// entsteht, ist eine Annaeherung an HAs Handarbeit, keine Kopie.

export const STUFEN = ["05", "10", "20", "30", "40", "50", "60", "70", "80", "90", "95"];

// Je Rolle elf Paare [Helligkeit, Saettigung], 0..1.
export const HA_PROFIL = {
  primary: [[0.0647, 1.0], [0.1216, 1.0], [0.1686, 1.0], [0.2647, 1.0], [0.3902, 1.0], [0.5216, 0.8934], [0.6039, 0.9802], [0.7333, 0.9412], [0.8569, 0.9178], [0.9314, 0.8286], [0.9667, 0.8824]],
  neutral: [[0.0784, 0.0], [0.1255, 0.0], [0.2118, 0.0], [0.2902, 0.0], [0.3686, 0.0], [0.4784, 0.0], [0.5961, 0.0], [0.6941, 0.0], [0.7981, 0.0], [0.902, 0.0], [0.9529, 0.0]],
  red: [[0.0902, 0.8261], [0.1392, 0.7465], [0.2314, 0.678], [0.3078, 0.758], [0.3608, 0.9457], [0.5275, 0.7095], [0.6784, 0.8537], [0.7765, 0.9649], [0.8569, 1.0], [0.9314, 1.0], [0.9686, 1.0]],
  green: [[0.049, 0.76], [0.0784, 0.75], [0.1333, 0.7059], [0.1765, 0.7778], [0.2078, 0.9434], [0.2667, 1.0], [0.3373, 1.0], [0.5647, 0.4595], [0.7157, 0.4897], [0.8529, 0.6533], [0.9333, 0.6471]],
  orange: [[0.0784, 1.0], [0.1157, 1.0], [0.1843, 1.0], [0.2471, 1.0], [0.3078, 1.0], [0.3941, 1.0], [0.4765, 1.0], [0.6294, 1.0], [0.7686, 1.0], [0.8922, 1.0], [0.9471, 1.0]],
};

// Saettigung der Rolle bei Stufe 60 - daran wird die Wahl des Nutzers
// verhaeltnismaessig angepasst, statt sie zu ueberschreiben.
const BASIS = { primary: 0.98, neutral: 0, red: 0.854, green: 1, orange: 1 };

export function hexZuHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function hslZuHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const z = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + z(r) + z(g) + z(b);
}

// Liefert ein Objekt { "ha-color-<rolle>-05": "#...", ... } - immer
// sechsstelliges Hex, denn nur daraus leitet Home Assistant die RGB-Tripel ab,
// aus denen Mushroom seine Zustandsfarben baut.
export function rampe(basisHex, rolle) {
  const profil = HA_PROFIL[rolle];
  if (!profil) return null;
  const b = hexZuHsl(basisHex);
  if (!b) return null;
  const faktor = BASIS[rolle] ? Math.min(1.6, b.s / BASIS[rolle]) : 0;
  const aus = {};
  profil.forEach(([l, s], i) => {
    aus[`ha-color-${rolle}-${STUFEN[i]}`] = hslZuHex(b.h, rolle === "neutral" ? 0 : s * faktor, l);
  });
  return aus;
}

// Die klassischen Begleiter der Primaerfarbe.
//
// --primary-color braucht hier nichts: Home Assistant deklariert es selbst als
// var(--ha-color-primary-40), es folgt der Rampe also von allein (am
// 12.10.2026 im Stylesheet nachgelesen). Diese drei dagegen sind FESTE Werte
// und blieben sonst auf HAs Blau stehen, waehrend alles andere umschwenkt -
// dieselbe Falle wie bei HATG, wo gefuellte Knoepfe trotz grauem Akzent blau
// blieben.
export function begleiter(basisHex) {
  const r = rampe(basisHex, "primary");
  if (!r) return null;
  // primary-color selbst steht NICHT dabei: Home Assistant deklariert es als
  // var(--ha-color-primary-40) und folgt der Rampe von allein. Wer es schreibt,
  // friert es ein.
  //
  // rgb-primary-color dagegen MUSS mitgeschrieben werden. Home Assistant
  // leitet --rgb-<name> nur ab, wenn das Theme nicht schon ein eigenes rgb-
  // Feld mitbringt ("Theme has it's own rgb value", apply_themes_on_element.ts)
  // - und ha_blanko bringt eines mit. Ohne diese Zeile bliebe das Tripel auf
  // HAs Blau stehen, waehrend alle Farben umschwenken.
  return {
    "dark-primary-color": r["ha-color-primary-30"],
    "darker-primary-color": r["ha-color-primary-20"],
    "light-primary-color": r["ha-color-primary-80"],
    "state-icon-color": r["ha-color-primary-40"],
    "rgb-primary-color": alsTripel(r["ha-color-primary-40"]),
  };
}

// "r, g, b" wie Home Assistant es schreibt - mit Leerzeichen nach dem Komma.
export function alsTripel(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex).trim());
  return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)).join(", ") : null;
}

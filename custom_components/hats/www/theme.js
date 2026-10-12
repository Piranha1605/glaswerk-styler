// Das Theme-Modell: laden, aendern, schreiben.
//
// Bewusst klein. HATS schreibt nur Felder mit einzeiligen Werten - keine
// UIX-Bloecke, keine Vorlagenmarken, keine YAML-Karten. Dadurch braucht es
// keinen allgemeinen Parser, und die Stellen, die bei HATG teuer waren,
// fallen von vornherein weg.
//
// Der Aufbau einer Theme-Datei, die HATS schreibt:
//
//     name:
//       feld: "wert"        <- flache Ebene, gilt in BEIDEN Modi
//       modes:
//         light:
//           feld: "wert"    <- nur hell
//         dark:
//           feld: "wert"    <- nur dunkel

// In einem doppelt gequoteten YAML-Skalar ist der BACKSLASH das Fluchtzeichen.
// Er muss VOR dem Anfuehrungszeichen verdoppelt werden, sonst entsteht eine
// ungueltige Fluchtfolge - und wer `themes: !include_dir_merge_named themes`
// benutzt, bekommt beim naechsten Start den Wiederherstellungsmodus. Das ist
// der schwerste Ausfall, den dieses Werkzeug ausloesen kann.
export function quote(wert) {
  return '"' + String(wert).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

export function leeresModell(name) {
  return { name, flach: {}, light: {}, dark: {}, kopf: [] };
}

// Liest genau den Aufbau, den schreibeTheme erzeugt. Alles andere wird
// gemeldet statt halb verstanden - ein halb gelesenes Theme ist schlimmer als
// gar keines.
export function leseTheme(text) {
  const zeilen = String(text).split("\n");
  const kopf = [];
  let name = null, ebene = null;
  const m = { flach: {}, light: {}, dark: {} };
  const unklar = [];

  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (/^\s*$/.test(z)) continue;
    if (/^\s*#/.test(z)) { if (name === null) kopf.push(z.replace(/^#\s?/, "")); continue; }

    const wurzel = /^([A-Za-z0-9_-]+):\s*$/.exec(z);
    if (wurzel) {
      if (name !== null) { unklar.push(`Zeile ${i + 1}: zweites Theme "${wurzel[1]}"`); continue; }
      name = wurzel[1]; ebene = "flach"; continue;
    }
    if (/^ {2}modes:\s*$/.test(z)) { ebene = null; continue; }
    if (/^ {4}light:\s*$/.test(z)) { ebene = "light"; continue; }
    if (/^ {4}dark:\s*$/.test(z)) { ebene = "dark"; continue; }

    const feld = /^ +([a-zA-Z0-9][a-zA-Z0-9_-]*):\s*(.*)$/.exec(z);
    if (feld && ebene) { m[ebene][feld[1]] = entquote(feld[2]); continue; }
    unklar.push(`Zeile ${i + 1}: ${z.trim().slice(0, 60)}`);
  }

  if (name === null) return { fehler: "Kein Theme-Name gefunden", unklar };
  return { name, ...m, kopf, unklar };
}

function entquote(roh) {
  const v = roh.trim();
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"')
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'")
    return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

// Ein Feld mit leerem Wert wird NICHT geschrieben. Das ist kein Sonderfall,
// sondern der Normalfall fuer alles, was Home Assistant je nach Zusammenhang
// anders belegt: ein Wert dort nagelt jeden Zusammenhang darauf fest.
export function schreibeTheme(modell) {
  const sort = (o) => Object.keys(o).filter((k) => o[k] !== "" && o[k] !== undefined && o[k] !== null).sort();
  let aus = modell.kopf.map((z) => "# " + z).join("\n");
  if (aus) aus += "\n\n";
  aus += modell.name + ":\n";
  for (const k of sort(modell.flach)) aus += `  ${k}: ${quote(modell.flach[k])}\n`;
  const h = sort(modell.light), d = sort(modell.dark);
  if (h.length || d.length) {
    aus += "\n  modes:\n";
    if (h.length) { aus += "    light:\n"; for (const k of h) aus += `      ${k}: ${quote(modell.light[k])}\n`; }
    if (d.length) { aus += (h.length ? "\n" : "") + "    dark:\n"; for (const k of d) aus += `      ${k}: ${quote(modell.dark[k])}\n`; }
  }
  return aus;
}

// Was in einem Modus wirklich gilt: flach, darueber der Modus.
export function wirksam(modell, modus) {
  return { ...modell.flach, ...(modus === "dark" ? modell.dark : modell.light) };
}

// Setzen auf der richtigen Ebene. "beide" heisst flach - und raeumt einen
// alten Eintrag je Modus weg, sonst gewinnt der Modus und die Aenderung
// kommt nicht an.
export function setze(modell, name, wert, ebene = "beide") {
  if (ebene === "beide") {
    modell.flach[name] = wert;
    delete modell.light[name];
    delete modell.dark[name];
  } else {
    delete modell.flach[name];
    modell[ebene] = modell[ebene] || {};
    modell[ebene][name] = wert;
  }
  return modell;
}

export function entferne(modell, name) {
  delete modell.flach[name];
  delete modell.light[name];
  delete modell.dark[name];
  return modell;
}

// Home Assistant leitet --rgb-<name> nur aus Werten ab, die mit # beginnen
// (einziger Filter in apply_themes_on_element.ts). Mushroom baut seine
// Zustandsfarben aus genau diesen Tripeln: wer rgba() schreibt, nimmt sie ihm
// weg - ohne Fehlermeldung.
export function gibtTripel(wert) {
  return typeof wert === "string" && wert.trim().startsWith("#");
}

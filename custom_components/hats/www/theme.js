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

// Einen var()-Verweis bis zur Farbe verfolgen.
//
// 86 Felder der Grundlage tragen einen Verweis auf eine Palettenstufe statt
// eines Hexwertes - fill-primary-quiet-resting steht etwa auf
// var(--ha-color-primary-05). Ohne Aufloesung bleibt der Farbtupfer grau, und
// man sieht nicht, was das Feld tut.
//
// Nachgeschlagen wird im MODELL, nicht auf der Seite: Was gilt, ist die Theme,
// die gerade gebaut wird. Die Tiefe ist begrenzt, weil eine Kette im Kreis
// laufen kann - ohne das haengt die Oberflaeche.
export function loeseFarbe(modell, wert, modus = "light", tiefe = 0) {
  if (!wert || tiefe > 6) return null;
  const w = String(wert).trim();
  if (/^#|^rgba?\(|^hsla?\(/.test(w)) return w;
  const m = /^var\(\s*--([a-z0-9-]+)/.exec(w);
  if (!m || !modell) return null;
  const ziel = wirksam(modell, modus === "dark" ? "dark" : "light")[m[1]];
  return ziel === undefined ? null : loeseFarbe(modell, ziel, modus, tiefe + 1);
}

// Ein flaches Feld in zwei Modi aufteilen.
//
// Der geltende Wert wird in BEIDE Modi kopiert, erst dann faellt der flache
// weg. Das Kopieren ist der ganze Punkt: setze(modell, name, wert, "light")
// loescht den flachen Eintrag und schreibt nur nach hell - der Dunkelmodus
// stuende danach ohne Wert da, still und ohne Meldung.
export function teileAuf(modell, name) {
  const w = modell.flach[name];
  if (w === undefined) return modell;
  modell.light = modell.light || {};
  modell.dark = modell.dark || {};
  if (modell.light[name] === undefined) modell.light[name] = w;
  if (modell.dark[name] === undefined) modell.dark[name] = w;
  delete modell.flach[name];
  return modell;
}

// Zurueck auf flach: Der Wert des angegebenen Modus gilt dann fuer beide.
// Welcher gewinnt, ist eine Entscheidung - deshalb steht sie im Aufruf und
// nicht hier drin.
export function fuehreZusammen(modell, name, modus = "light") {
  const quelle = modus === "dark" ? modell.dark : modell.light;
  const w = quelle[name] !== undefined ? quelle[name] : modell.flach[name];
  if (w === undefined) return entferne(modell, name);
  return setze(modell, name, w, "beide");
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

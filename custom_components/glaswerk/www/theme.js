// Das Theme-Modell: laden, aendern, schreiben.
//
// Bewusst klein. Glaswerk schreibt nur Felder mit einzeiligen Werten - keine
// UIX-Bloecke, keine Vorlagenmarken, keine YAML-Karten. Dadurch braucht es
// keinen allgemeinen Parser, und die Stellen, die bei HATG teuer waren,
// fallen von vornherein weg.
//
// Der Aufbau einer Theme-Datei, die Glaswerk schreibt:
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

// Ein mehrzeiliger Wert gehoert in einen Blockskalar, nicht in
// Anfuehrungszeichen.
//
// quote() wuerde die Zeilenumbrueche mitten in einen doppelt gequoteten
// Skalar legen. YAML faltet die dann zu Leerzeichen - aus einem CSS-Block
// wird eine einzige Zeile, und Kommentare wie "/* ... */" fressen alles
// dahinter. Am 13.10.2026 beim ersten Import einer HATG-Theme aufgefallen.
//
// "|-" statt "|": Ohne das Minus haengt YAML beim Lesen einen
// Zeilenumbruch an, und der Rundlauf stimmt nicht mehr.
function schreibeWert(k, wert, einzug) {
  const w = String(wert);
  if (!w.includes("\n")) return `${einzug}${k}: ${quote(w)}\n`;
  const endetMitUmbruch = w.endsWith("\n");
  const koerper = (endetMitUmbruch ? w.slice(0, -1) : w)
    .split("\n").map((z) => (z.length ? einzug + "  " + z : "")).join("\n");
  return `${einzug}${k}: ${endetMitUmbruch ? "|" : "|-"}\n${koerper}\n`;
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

    const feld = /^( +)([a-zA-Z0-9][a-zA-Z0-9_-]*):\s*(.*)$/.exec(z);
    if (feld && ebene) {
      const [, einzug, schluessel, rest] = feld;
      // Ein Blockskalar: der Wert steht in den eingerueckten Zeilen darunter.
      // Ohne das verschluckt der Leser jeden mehrzeiligen Wert - bei einer
      // HATG-Theme waren das am 13.10.2026 155 Zeilen CSS, spurlos.
      const block = /^([|>])([-+]?)\d*$/.exec(rest.trim());
      if (block) {
        const [, art, chomp] = block;
        const koerper = [];
        let j = i + 1;
        for (; j < zeilen.length; j++) {
          const n = zeilen[j];
          if (/^\s*$/.test(n)) { koerper.push(""); continue; }
          const tiefer = /^(\s*)/.exec(n)[1].length > einzug.length;
          if (!tiefer) break;
          koerper.push(n);
        }
        // Nachlaufende Leerzeilen gehoeren zum naechsten Block, nicht zu diesem.
        while (koerper.length && koerper[koerper.length - 1] === "") koerper.pop();
        const tiefen = koerper.filter((x) => x).map((x) => /^(\s*)/.exec(x)[1].length);
        const weg = tiefen.length ? Math.min(...tiefen) : 0;
        let wert = koerper.map((x) => x.slice(weg)).join(art === ">" ? " " : "\n");
        if (chomp !== "-") wert += "\n";
        m[ebene][schluessel] = wert;
        i = j - 1;
        continue;
      }
      m[ebene][schluessel] = entquote(rest);
      continue;
    }
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
// UIX wendet seine Felder NUR an, wenn die Theme sich mit ihrem Namen als
// UIX-Theme ausweist - uix-theme auf Theme-Ebene ist der Schalter.
//
// Der Name steht als Konstante da und nicht dreimal als Zeichenkette: Der
// Bericht weiter unten muss ihn auch kennen, sonst meldet er Glaswerk' eigenen
// Schalter als fremd.
//
// Am 13.10.2026 an der laufenden Instanz gemessen, nachdem der Maintainer
// meldete, Bubble laufe nicht richtig: Von 39 uix-node-Knoten waren 39 leer,
// auch die von drawer, sidebar und root, die sonst sofort stehen. Die Felder
// lagen korrekt am html-Element, UIX war geladen, die Konsole meldete nichts.
// Auch eine triviale Regel (ha-card { outline: 3px solid lime }) kam nicht an
// - es lag also nicht am CSS.
//
// Der Unterschied zu den sieben Themes auf derselben Instanz, die
// funktionieren: Jede von ihnen trug uix-theme, Glaswerk' Theme als einzige nicht.
// Nach dem Ergaenzen: 31 von 39 Knoten gefuellt.
//
// Ohne diesen Schalter ist jede Vorlage wirkungslos, und zwar lautlos - die
// Datei sieht vollstaendig aus, die Oberflaeche sieht fast richtig aus (die
// FELDER wirken ja), und nur die Vorlagen fehlen.
export const UIX_SCHALTER = "uix-theme";

export function uixSchalterSetzen(modell) {
  const hatVorlagen = Object.keys(modell.flach || {}).some((k) => /^uix-/.test(k) && k !== UIX_SCHALTER);
  if (hatVorlagen && modell.name) modell.flach[UIX_SCHALTER] = modell.name;
  // Kein Stilziel mehr im Theme? Dann hat der Schalter nichts mehr zu schalten.
  else if (!hatVorlagen) delete modell.flach[UIX_SCHALTER];
  return modell;
}

export function schreibeTheme(modell) {
  // Der Schalter gehoert in JEDE Ausgabe, nicht nur in den Speicherweg - sonst
  // fehlt er in der heruntergeladenen Datei und in der Zwischenablage.
  uixSchalterSetzen(modell);
  const sort = (o) => Object.keys(o).filter((k) => o[k] !== "" && o[k] !== undefined && o[k] !== null).sort();
  let aus = modell.kopf.map((z) => "# " + z).join("\n");
  if (aus) aus += "\n\n";
  aus += modell.name + ":\n";
  for (const k of sort(modell.flach)) aus += schreibeWert(k, modell.flach[k], "  ");
  const h = sort(modell.light), d = sort(modell.dark);
  if (h.length || d.length) {
    aus += "\n  modes:\n";
    if (h.length) { aus += "    light:\n"; for (const k of h) aus += schreibeWert(k, modell.light[k], "      "); }
    if (d.length) { aus += (h.length ? "\n" : "") + "    dark:\n"; for (const k of d) aus += schreibeWert(k, modell.dark[k], "      "); }
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

// Was beim Import mit einer fremden Datei passiert - als Bericht, nicht als
// Gefuehl.
//
// Glaswerk wirft beim Lesen nichts weg: Jedes Feld landet im Modell und wird beim
// Speichern wieder mitgeschrieben, auch wenn die Oberflaeche es nicht kennt.
// Genau das muss man aber SEHEN, bevor man auf Speichern drueckt - sonst
// glaubt man, ein Feld sei weg, nur weil keine Kachel dafuer da ist.
//
// bekannt ist die Menge der Feldnamen OHNE "--", so wie sie in der Datei
// stehen.
// stilziele: die Kennungen aus UIX_ZIELE (ohne Vorsilbe). Ohne sie kann der
// Bericht nicht unterscheiden, ob ein uix-Feld Glaswerk gehoert oder einem anderen
// Werkzeug - und meldete dann die eigenen als fremd.
// Hintergrundbilder, die nur aus ihrer Adresse bestehen.
//
// `url(...)` allein heisst in CSS: Originalgroesse, GEKACHELT, mitrollend. Bei
// einem 7 kB kleinen Bild sieht man das sofort - es fuellt die Flaeche nicht,
// bricht ab, und darunter beginnt die naechste Kachel. Genau so stand es am
// 17.10.2026 in Enricos hats_test, einer Theme aus HATG.
//
// Glaswerk schreibt seit dem 17.10.2026 selbst "center / cover no-repeat
// fixed" dazu. Fremde Dateien bleiben aber, wie sie sind - das ist das
// Versprechen, das diese Funktion nicht bricht: Sie FINDET nur, geaendert wird
// auf Ansage.
export const BILD_ZUSATZ = "center / cover no-repeat fixed";

export function bilderOhneMass(modell) {
  const treffer = [];
  for (const ebene of ["flach", "light", "dark"]) {
    for (const [k, v] of Object.entries(modell?.[ebene] || {})) {
      if (typeof v !== "string") continue;
      if (!/^\s*url\(/.test(v)) continue;                       // ein Verlauf regelt sich selbst
      if (/\b(cover|contain|repeat|center|top|bottom|left|right)\b/.test(v)) continue;
      treffer.push({ ebene, feld: k, wert: v.trim() });
    }
  }
  return treffer;
}

export function berichtUeberTheme(modell, bekannt, stilziele = null) {
  const zaehl = { bedienbar: [], mitgenommen: [] };
  const gesehen = new Set();
  const eigenesZiel = (k) =>
    stilziele instanceof Set && /^uix-/.test(k) && !/-yaml$/.test(k) && stilziele.has(k.slice(4));
  // uix-theme ist KEIN Stilziel, sondern Glaswerk' eigener Schalter:
  // uixSchalterSetzen() setzt ihn bei jeder Ausgabe und nimmt ihn wieder
  // heraus, wenn die letzte Vorlage ausgeht.
  //
  // Ohne diese Zeile meldete der Bericht ihn ZWEIMAL als fremd - einmal als
  // "kennt Glaswerk nicht", einmal als "Stilziel von HATG". Beides falsch, und
  // beides sah jeder, der eine Glaswerk-Theme mit Vorlagen oeffnete. Am 14.10.2026
  // beim Durchgehen aufgefallen. Eine Warnung, die bei der eigenen Arbeit
  // anschlaegt, lernt man weg - dieselbe Lehre wie bei den Stilzielen
  // darunter, nur ein Feld spaeter.
  const selbstGefuehrt = (k) => k === UIX_SCHALTER;
  for (const ebene of ["flach", "light", "dark"]) {
    for (const k of Object.keys(modell[ebene] || {})) {
      if (gesehen.has(k)) continue;
      gesehen.add(k);
      // Ein eigenes Stilziel ist bedienbar - es steht auf der UIX-Seite.
      (bekannt.has(k) || eigenesZiel(k) || selbstGefuehrt(k) ? zaehl.bedienbar : zaehl.mitgenommen).push(k);
    }
  }
  zaehl.bedienbar.sort();
  zaehl.mitgenommen.sort();
  return {
    name: modell.name,
    felder: gesehen.size,
    flach: Object.keys(modell.flach || {}).length,
    hell: Object.keys(modell.light || {}).length,
    dunkel: Object.keys(modell.dark || {}).length,
    bedienbar: zaehl.bedienbar,
    mitgenommen: zaehl.mitgenommen,
    // Bilder, die nur ihre Adresse tragen - siehe bilderOhneMass.
    bilderOhneMass: bilderOhneMass(modell),
    // Zeilen, die der Leser nicht einordnen konnte. Die stehen danach NICHT
    // mehr in der Datei - als einziges geht hier etwas verloren, und deshalb
    // wird es beim Namen genannt.
    unklar: modell.unklar || [],
    // Marken FREMDER Werkzeuge - und nur die.
    //
    // Bis zum 13.10.2026 galt hier jedes uix-Feld als fremd. Seit Glaswerk eigene
    // Vorlagen hat, war das schlicht falsch: Eine Theme aus Glaswerk' eigenem
    // Generator meldete "7 Stilziele von HATG oder card-mod. Die pflegt Glaswerk
    // nicht" - ueber ihre eigenen sieben. Eine Warnung, die bei der eigenen
    // Arbeit anschlaegt, lernt man weg; dann greift sie auch dann nicht mehr,
    // wenn sie recht hat.
    //
    // Fremd ist, was Glaswerk nicht schreiben kann:
    //   card-mod-*        das alte Format, das HATG anbietet
    //   uix-*-yaml        Shadow-DOM-Pfade; Glaswerk kennt nur die einfache Form
    //   uix-<unbekannt>   ein Stilziel, das nicht in UIX_ZIELE steht
    stilziele: [...gesehen].filter((k) => {
      if (selbstGefuehrt(k)) return false;
      if (/^card-mod-/.test(k)) return true;
      if (!/^uix-/.test(k)) return false;
      if (/-yaml$/.test(k)) return true;
      return !(stilziele instanceof Set) || !stilziele.has(k.slice(4));
    }),
  };
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

// ---------------------------------------------------------------------------
// Vorlagen: ein Block CSS in einem Stilziel, an- und abschaltbar
//
// Eine Vorlage schreibt ihr CSS zwischen zwei Marker in das Feld ihres
// Stilziels. Daran erkennt Glaswerk sie spaeter wieder - auch in einer Theme, die
// jemand von Hand bearbeitet hat.
//
//     /* Glaswerk:glas-karten:START */
//     ha-card { ... }
//     /* Glaswerk:glas-karten:ENDE */
//
// Drei Dinge sind aus HATG uebernommen, jedes davon dort teuer gelernt:
//
// 1. Beim Einschalten wird ANGEHAENGT, nicht ersetzt. Eigenes CSS daneben
//    bleibt stehen - sonst waere ein Klick der Verlust einer Stunde Arbeit.
// 2. Von doppelten Bloecken derselben Vorlage bleibt nur der LETZTE. In HATG
//    lagen so einmal 23 Glas-Vorlagen doppelt in einer Theme.
// 3. Fremde Vorsilben werden mitgelesen. Eine umbenannte Kopie traegt
//    /* HORIZON:... */ statt /* Glaswerk:... */ - wer nur auf die eigene Vorsilbe
//    schaut, haengt die Vorlage ein zweites Mal an.
//
// Das Muster liest auch gemischte Schreibweisen. Bis zum 16.10.2026 stand hier
// [A-Z][A-Z0-9]{2,15} - nur GROSSBUCHSTABEN. Das trug, solange die Marke
// "HATS" hiess; beim Rebranding auf "Glaswerk" fiel jeder Marker durch das
// Muster, und jede vorhandene Vorlage galt als nicht vorhanden. Beim Einschalten
// waere sie ein zweites Mal angehaengt worden - genau der Fehler aus Punkt 3.
const MARKE_VOR = "[A-Za-z][A-Za-z0-9]{2,15}";

export function vorlagenMarke(id, ende = false) {
  return `/* Glaswerk:${id}:${ende ? "ENDE" : "START"} */`;
}

function markenRegex(id) {
  const si = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `[ \\t]*/\\* ${MARKE_VOR}:${si}:START \\*/[\\s\\S]*?/\\* ${MARKE_VOR}:${si}:ENDE \\*/[ \\t]*\\n?`,
    "g"
  );
}

// Steht die Vorlage im Theme? Gefragt wird nach dem Marker, nicht nach dem
// CSS - der Inhalt darf sich zwischen zwei Glaswerk-Fassungen aendern.
export function vorlageIstAn(modell, vorlage) {
  const wert = modell.flach["uix-" + vorlage.ziel];
  if (typeof wert !== "string") return false;
  return markenRegex(vorlage.id).test(wert);
}

// Einschalten heisst: alten Block (auch unter fremder Vorsilbe) herausnehmen,
// dann den aktuellen anhaengen. Damit ist Einschalten zugleich Auffrischen -
// eine Vorlage, die Glaswerk inzwischen anders schreibt, wird beim naechsten Mal
// richtig.
export function vorlageAn(modell, vorlage) {
  const feld = "uix-" + vorlage.ziel;
  const alt = typeof modell.flach[feld] === "string" ? modell.flach[feld] : "";
  const ohne = alt.replace(markenRegex(vorlage.id), "").replace(/\n{3,}/g, "\n\n").trim();
  const block = `${vorlagenMarke(vorlage.id)}\n${vorlage.css.trim()}\n${vorlagenMarke(vorlage.id, true)}`;
  setze(modell, feld, ohne ? `${ohne}\n${block}` : block, "beide");
  return modell;
}

// Abschalten nimmt nur den eigenen Block heraus. Bleibt danach nichts uebrig,
// faellt das ganze Feld weg - ein leeres uix-Feld in der Datei waere Ballast,
// und UIX legt dafuer trotzdem einen Knoten an.
export function vorlageAus(modell, vorlage) {
  const feld = "uix-" + vorlage.ziel;
  const alt = typeof modell.flach[feld] === "string" ? modell.flach[feld] : "";
  const rest = alt.replace(markenRegex(vorlage.id), "").replace(/\n{3,}/g, "\n\n").trim();
  if (rest) setze(modell, feld, rest, "beide");
  else entferne(modell, feld);
  return modell;
}

// Doppelte Bloecke derselben Vorlage zusammenfassen und fremde Vorsilben auf
// Glaswerk zuruecksetzen. Laeuft nach jedem Import ueber jedes Stilziel.
export function vereinheitlicheVorlagen(modell, vorlagen) {
  const bericht = { vereinheitlicht: [], entdoppelt: [] };
  for (const v of vorlagen) {
    const feld = "uix-" + v.ziel;
    const wert = modell.flach[feld];
    if (typeof wert !== "string") continue;
    const treffer = wert.match(markenRegex(v.id));
    if (!treffer || !treffer.length) continue;
    if (treffer.some((b) => !b.includes(`/* Glaswerk:${v.id}:`))) bericht.vereinheitlicht.push(v.id);
    if (treffer.length > 1) bericht.entdoppelt.push(v.id);
    if (treffer.length === 1 && !bericht.vereinheitlicht.includes(v.id)) continue;
    // Nur den letzten behalten, mit eigener Vorsilbe neu geschrieben.
    const letzter = treffer[treffer.length - 1];
    const innen = letzter
      .replace(new RegExp(`^[ \\t]*/\\* ${MARKE_VOR}:${v.id}:START \\*/\\n?`), "")
      .replace(new RegExp(`/\\* ${MARKE_VOR}:${v.id}:ENDE \\*/[ \\t]*\\n?$`), "")
      .trim();
    const ohne = wert.replace(markenRegex(v.id), "").replace(/\n{3,}/g, "\n\n").trim();
    const block = `${vorlagenMarke(v.id)}\n${innen}\n${vorlagenMarke(v.id, true)}`;
    setze(modell, feld, ohne ? `${ohne}\n${block}` : block, "beide");
  }
  return bericht;
}

// Welche Vorlagen stecken in dieser Theme? Fuer den Bericht nach dem Import.
export function vorlagenImTheme(modell, vorlagen) {
  return vorlagen.filter((v) => vorlageIstAn(modell, v)).map((v) => v.id);
}

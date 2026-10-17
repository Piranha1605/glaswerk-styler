// Zwei Fehler vom 17.10.2026, beide an derselben Frage:
//
//   1. Felder wie --ha-dialog-surface-background, --sidebar-background-color
//      und --app-header-background-color zeigt das Panel als "nicht gesetzt",
//      obwohl der Baukasten sie kennt.
//   2. Eine geladene Datei (Piranha.yaml) laesst den Baukasten nicht erkennen,
//      welche Teile darin stecken.
//
// Gemessen ist schon: In der Datei STEHEN die Felder - aber unter `light:`
// und `dark:`, nicht flach. Dieses Skript schickt die echte Datei durch
// erkenneTeil() und zeigt Feld fuer Feld, was der Baukasten erwartet und was
// er vorfindet. Es aendert NICHTS - weder an der Datei noch an der Instanz.
//
//   node werkzeuge/test/baukasten-erkennung.mjs [Datei.yaml]

import { verbinde } from "/Users/enricofischer/Projekte/haos-test/ws.mjs";
import { BAUKASTEN, erkenneTeil, KARTENSTIL_FELDER } from "../../custom_components/glaswerk/www/baukasten.js";

const DATEI = process.argv[2] || "Piranha.yaml";

const ha = await verbinde();
const r = await ha.ruf({ type: "glaswerk/load_theme_file", filename: DATEI });
const text = r.inhalt ?? r.text ?? r.yaml ?? r.content;
if (!text) { console.error("Datei leer oder unlesbar"); process.exit(1); }

// Die Datei in drei Ebenen zerlegen: flach, light, dark. Bewusst mit einem
// einfachen Zeilenleser statt einer YAML-Bibliothek - es geht nur um die
// Frage, auf welcher EBENE ein Feld steht.
const flach = {}, light = {}, dark = {};
let ebene = flach, tiefeModus = -1;
for (const zeile of text.split("\n")) {
  if (/^\s*#/.test(zeile) || !zeile.trim()) continue;
  const tiefe = zeile.search(/\S/);
  const m = /^\s*(light|dark):\s*$/.exec(zeile);
  if (m) { ebene = m[1] === "light" ? light : dark; tiefeModus = tiefe; continue; }
  if (tiefeModus >= 0 && tiefe <= tiefeModus) { ebene = flach; tiefeModus = -1; }
  const f = /^\s*(--?[a-zA-Z0-9-]+|[a-zA-Z][a-zA-Z0-9-]*):\s*(.+?)\s*$/.exec(zeile);
  if (!f) continue;
  const name = f[1].startsWith("--") ? f[1] : "--" + f[1];
  ebene[name] = f[2].replace(/^["']|["']$/g, "");
}

console.log(`${DATEI}: ${Object.keys(flach).length} flach, `
          + `${Object.keys(light).length} light, ${Object.keys(dark).length} dark\n`);

// Genau das, was das Panel tut: ein Feld auf einer Ebene lesen.
const lies = (feld, e) => {
  if (e === "light") return light[feld] ?? flach[feld];
  if (e === "dark") return dark[feld] ?? flach[feld];
  return flach[feld];
};

// 1. Die Flächenfelder: wo stehen sie wirklich?
console.log("== Die Felder aus dem Bild ==");
for (const f of ["--ha-dialog-surface-background", "--mdc-dialog-scrim-color",
                 "--sidebar-background-color", "--app-header-background-color",
                 "--karten-gewaehlt", "--karten-gewaehlt-vorn", "--karten-gewaehlt-schatten"]) {
  const wo = [flach[f] && "flach", light[f] && "light", dark[f] && "dark"].filter(Boolean);
  console.log("  " + f.padEnd(34) + (wo.length ? wo.join("+") : "NIRGENDS")
            + (flach[f] ? "" : wo.length ? "   (nicht flach!)" : ""));
}

// 2. Welche Teile erkennt der Baukasten - und woran scheitert es?
console.log("\n== Was der Baukasten erkennt ==");
for (const sorte of Object.keys(BAUKASTEN)) {
  // erkenneTeil liefert die ID, nicht das Teil.
  const id = erkenneTeil(sorte, lies);
  console.log("  " + sorte.padEnd(14) + (id ? "erkannt: " + id : "NICHTS erkannt"));
}

// 3. Beim Kartenstil genau hinsehen: Welches Feld passt nicht?
console.log("\n== Kartenstil Feld fuer Feld ==");
const stile = BAUKASTEN.karten?.teile ?? [];
for (const teil of stile) {
  const abw = [];
  for (const [k, v] of Object.entries(teil.light ?? {})) {
    const ist = lies(k.startsWith("--") ? k : "--" + k, "light");
    if (String(ist ?? "") !== String(v ?? "")) abw.push(`light ${k}: ist ${ist ?? "(leer)"} soll ${v}`);
  }
  for (const [k, v] of Object.entries(teil.dark ?? {})) {
    const ist = lies(k.startsWith("--") ? k : "--" + k, "dark");
    if (String(ist ?? "") !== String(v ?? "")) abw.push(`dark ${k}: ist ${ist ?? "(leer)"} soll ${v}`);
  }
  const name = String(teil.id ?? teil.name).padEnd(12);
  if (!abw.length) console.log("  " + name + "PASST");
  else console.log("  " + name + abw.length + " Abweichungen, erste drei:\n"
                 + abw.slice(0, 3).map((a) => "      " + a).join("\n"));
}

process.exit(0);

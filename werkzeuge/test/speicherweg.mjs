// Der ganze Speicherweg am laufenden Panel - die Strecke, die ein Nutzer geht.
//
// Anlass am 17.10.2026: Die Baukasten-Kachel hat geladene Themes weggeworfen
// (behoben, c4a7c9d). Enricos Einwand danach: "wenn in der ersten version die
// wir hochladen keiner speichern kann ist auch nicht gut, das macht alles
// kaputt." Stimmt - und ein Fehler, den man per Zufall findet, sagt nichts
// ueber die anderen. Also die Strecke abfahren statt stichprobenartig lesen.
//
// Anders als die Dateien in tests/ prueft das hier nicht den Quelltext,
// sondern das LAUFENDE Panel an der Testmaschine. Deshalb steht es in
// werkzeuge/ und nicht in tests/: Es braucht eine Instanz.
//
// Es legt nur eigene Dateien an (pruef_weg_*) und raeumt sie am Ende weg.
// Fremde Themes fasst es nicht an.
//
//   node werkzeuge/test/speicherweg.mjs

import { starteChrome, warte, TIEF } from "./chrome.mjs";

const NAME = "pruef_weg";
let rot = 0, n = 0;
const ok   = (s) => { n++; console.log("  \x1b[32mok\x1b[0m   " + s); };
const fehl = (s) => { n++; rot++; console.log("  \x1b[31mROT\x1b[0m  " + s); };
const pruefe = (was, bedingung, detail = "") =>
  bedingung ? ok(was) : fehl(was + (detail ? "  -> " + detail : ""));

const c = await starteChrome({ breite: 1500, hoehe: 950, ziel: "/tmp/speicherweg" });
await c.geh("/glaswerk", 11000);
await c.pruefeAnmeldung();
await warte(3500);

const P = `tief(document, e => e.tagName === "GLASWERK-PANEL")[0]`;
const im      = (a) => c.lies(`(() => { ${TIEF} const p = ${P}; const w = p.shadowRoot; return ${a}; })()`);
const imAsync = (a) => c.lies(`(async () => { ${TIEF} const p = ${P}; const w = p.shadowRoot; return ${a}; })()`);

const stand = () => im(`JSON.stringify({
  name: w.querySelector("input")?.value ?? null,
  herkunft: [...w.querySelectorAll(".sewert")][0]?.textContent?.trim() ?? null,
})`).then(JSON.parse);

// Eine Datei ueber die Integration lesen - unabhaengig vom Panel.
const datei = (nm) => c.lies(`(async () => {
  const hass = document.querySelector("home-assistant").hass;
  try {
    const r = await hass.connection.sendMessagePromise({ type: "glaswerk/load_theme_file", filename: ${JSON.stringify("")} + nm });
    return (r.content ?? r.inhalt ?? "").length;
  } catch (e) { return -1; }
})()`.replace("nm", JSON.stringify(nm)));

console.log("\n== 1. Leer beginnen und den Baukasten oeffnen ==");
await imAsync(`(await p.neuBeginnen(), "x")`);
await warte(1500);
let s = await stand();
pruefe("Leerer Start zeigt ha_blanko", s.herkunft === "ha_blanko", JSON.stringify(s));

await im(`([...w.querySelectorAll("[data-start]")].find(b => b.dataset.start === "baukasten")?.click(), "x")`);
await warte(2500);
const kacheln = await im(`[...w.querySelectorAll("[data-bk-teil]")].length`);
pruefe("Baukasten oeffnet mit Kacheln", kacheln > 0, kacheln + " Kacheln");

console.log("\n== 2. Ein Teil waehlen und speichern ==");
const gewaehlt = await im(`(() => {
  const k = [...w.querySelectorAll('[data-bk-teil]')];
  const ziel = k.find(x => x.dataset.bkSorte === "karten" && x.dataset.bkTeil !== "glas") ?? k[1];
  if (!ziel) return null;
  ziel.click();
  return ziel.dataset.bkSorte + "/" + ziel.dataset.bkTeil;
})()`);
pruefe("Ein Teil liess sich waehlen", !!gewaehlt, String(gewaehlt));
await warte(1800);

// Baukasten zu, Namen setzen, speichern
await im(`([...w.querySelectorAll("button")].find(b => /schliessen|close/i.test(b.getAttribute("aria-label")||""))?.click(), "x")`);
await warte(1200);
await im(`(() => { const i = w.querySelector("input");
  i.value = ${JSON.stringify(NAME)}; i.dispatchEvent(new Event("input", { bubbles: true })); return "x"; })()`);
await warte(900);
await imAsync(`(await p.speichern(), "x")`);
await warte(3000);

const groesse1 = await datei(NAME + ".yaml");
pruefe("Die Datei ist angekommen und nicht leer", groesse1 > 20000, groesse1 + " Zeichen");

console.log("\n== 3. Datei oeffnen - kommen Name und Herkunft zurueck? ==");
await imAsync(`(await p.oeffneDatei(${JSON.stringify(NAME + ".yaml")}), "x")`);
await warte(2500);
s = await stand();
pruefe("Name steht nach dem Oeffnen", s.name === NAME, JSON.stringify(s));
pruefe("Herkunft steht nach dem Oeffnen", s.herkunft === NAME, JSON.stringify(s));

console.log("\n== 4. Baukasten ueber geladener Theme (der Fehler vom 17.10.) ==");
await im(`([...w.querySelectorAll("[data-start]")].find(b => b.dataset.start === "baukasten")?.click(), "x")`);
await warte(2500);
s = await stand();
pruefe("Name ueberlebt das Oeffnen", s.name === NAME, JSON.stringify(s));
pruefe("Herkunft ueberlebt das Oeffnen", s.herkunft === NAME, JSON.stringify(s));
await im(`([...w.querySelectorAll("button")].find(b => /schliessen|close/i.test(b.getAttribute("aria-label")||""))?.click(), "x")`);
await warte(1200);

console.log("\n== 5. Speichern ueber einer geladenen Theme - bleibt sie voll? ==");
await imAsync(`(await p.speichern(), "x")`);
await warte(3000);
const groesse2 = await datei(NAME + ".yaml");
pruefe("Die Datei ist nach dem zweiten Speichern nicht geschrumpft",
  groesse2 >= groesse1 * 0.9, groesse1 + " -> " + groesse2 + " Zeichen");

console.log("\n== 6. Verwerfen nimmt die Datei, nicht die leere Vorlage ==");
await imAsync(`(await p.oeffneDatei(${JSON.stringify(NAME + ".yaml")}), "x")`);
await warte(2000);
await im(`(() => { const i = w.querySelector("input");
  i.value = ${JSON.stringify(NAME + "_x")}; i.dispatchEvent(new Event("input", { bubbles: true })); return "x"; })()`);
await warte(800);
await im(`(p.verwerfen(), "x")`);
await warte(1500);
s = await stand();
pruefe("Nach Verwerfen steht wieder die Datei da", s.herkunft === NAME, JSON.stringify(s));

console.log("\n== 7. Aufraeumen ==");
const weg = await c.lies(`(async () => {
  const hass = document.querySelector("home-assistant").hass;
  try { await hass.connection.sendMessagePromise({ type: "glaswerk/delete_theme", filename: ${JSON.stringify(NAME + ".yaml")} }); return "geloescht"; }
  catch (e) { return "kein Loeschbefehl - " + ${JSON.stringify(NAME)} + ".yaml bleibt liegen"; }
})()`);
console.log("  " + weg);

await c.schuss("ende");
await c.zu();
console.log(`\n${rot ? "\x1b[31mFehlschlag\x1b[0m" : "\x1b[32mAlles gruen\x1b[0m"} - ${n} Pruefungen, ${rot} rot`);
process.exit(rot ? 1 : 0);

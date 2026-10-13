// Meldet die Horizon-Buendel als Lovelace-Ressourcen an der Testmaschine an.
//
// Ohne diesen Schritt liegen die Dateien zwar auf der Platte, aber Home
// Assistant laedt sie nie - im Kartenwaehler fehlt der Eintrag, und eine
// Karte vom Typ custom:horizon-cards rendert als Fehlerkarte mit
// "Custom element doesn't exist".
//
// Idempotent: Eine Ressource, die schon angemeldet ist, wird nicht doppelt
// eingetragen. Doppelte Ressourcen laedt HA beide, und das zweite Modul
// ueberschreibt die Registrierung des ersten.

import { verbinde } from "/Users/enricofischer/Projekte/haos-test/ws.mjs";

// Nur die Buendel, die eigene Custom Elements anmelden. remix-icons.json ist
// Daten und die LICENSE-Datei Text - beide gehoeren NICHT als Modul geladen.
const RESSOURCEN = [
  "/hacsfiles/horizon-cards/horizon-cards.js",
  "/hacsfiles/horizon-cards/horizon-widgets.js",
  "/hacsfiles/horizon-cards/horizon-dashboard.js",
  "/hacsfiles/horizon-cards/horizon-claude.js",
  "/hacsfiles/horizon-cards/horizon-remix.js",
];

const ha = await verbinde();
try {
  const da = await ha.ruf({ type: "lovelace/resources" });
  const bekannt = new Set(da.map((r) => r.url.split("?")[0]));

  for (const url of RESSOURCEN) {
    if (bekannt.has(url)) { console.log("  schon da   ", url); continue; }
    await ha.ruf({ type: "lovelace/resources/create", res_type: "module", url });
    console.log("  angemeldet ", url);
  }

  // Gegenprobe vom Server.
  const nach = await ha.ruf({ type: "lovelace/resources" });
  console.log(`\n${nach.length} Ressourcen insgesamt:`);
  for (const r of nach) console.log(`  ${r.type.padEnd(8)} ${r.url}`);
  console.log("\nHome Assistant muss einmal neu geladen werden, damit die Module greifen.");
} finally { ha.zu(); }

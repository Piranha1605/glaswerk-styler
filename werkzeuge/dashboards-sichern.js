// Sichert jede Dashboard-Konfiguration, bevor irgendjemand daran arbeitet.
//
// Anlass: Am 13.10.2026 stand die Musterseite serverseitig auf {"views":[]}
// - 12 Bytes -, waehrend ein offener Tab sie noch vollstaendig zeigte. Der
// gerenderte Zustand ueberlebt den Verlust; gerettet werden konnte sie nur,
// weil jedes hui-card-Element seine config noch trug. Das ist Glueck, keine
// Methode.
//
// In die Browser-Konsole einer angemeldeten HA-Seite werfen. Ergebnis landet
// als Download, einer je Dashboard.

(async () => {
  const hass = document.querySelector("home-assistant")?.hass;
  const conn = hass?.connection;
  if (!conn) { console.error("Keine Verbindung - bist du angemeldet?"); return; }

  // Lebt die Verbindung wirklich? Ein Tab kann angemeldet AUSSEHEN und tot
  // sein: hass.user steht da, die Seite ist gezeichnet, und jede Anfrage
  // scheitert mit der nackten Zahl 3 (ERR_CONNECTION_LOST). JSON.stringify
  // ergibt dann "3", e.message ist undefined.
  try {
    await conn.sendMessagePromise({ type: "ping" });
  } catch (e) {
    console.error("Verbindung tot (Code " + JSON.stringify(e) + ") - Seite neu laden.");
    return;
  }

  const liste = await conn.sendMessagePromise({ type: "lovelace/dashboards/list" });
  const stand = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

  for (const d of [{ url_path: null, title: "(Standard)" }, ...liste]) {
    const msg = { type: "lovelace/config", force: true };
    if (d.url_path) msg.url_path = d.url_path;
    const name = d.url_path || "_standard";
    let cfg;
    try {
      cfg = await conn.sendMessagePromise(msg);
    } catch (e) {
      // config_not_found heisst: das Dashboard laeuft im YAML-Modus oder ist
      // noch nie bearbeitet worden. Kein Grund zur Sorge.
      console.warn(name + ": " + JSON.stringify(e));
      continue;
    }
    const karten = (cfg.views || []).reduce((n, v) =>
      n + (v.cards || []).length +
      (v.sections || []).reduce((m, s) => m + (s.cards || []).length, 0), 0);
    console.log(`${name}: ${(cfg.views || []).length} Ansichten, ${karten} Karten`);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(cfg, null, 1)], { type: "application/json" }));
    a.download = `lovelace-${name}-${stand}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    await new Promise((r) => setTimeout(r, 300));   // sonst verschluckt der Browser Downloads
  }
  console.log("Fertig.");
})();

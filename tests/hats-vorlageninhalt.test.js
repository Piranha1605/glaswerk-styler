// Was in den Vorlagen stehen DARF und was nicht.
//
// Jede Pruefung hier ist ein Fehler, der in HATG einmal im Theme eines Nutzers
// gelandet ist. Sie kosten nichts und fangen genau die Sorte Fehler, die man
// im Browser nicht sieht - weil nichts kaputtgeht, sondern etwas lautlos
// ausbleibt.

import assert from "node:assert";
import { VORLAGEN, VORLAGEN_GRUPPEN } from "../custom_components/hats/www/vorlagen.js";
import { UIX_ZIELE } from "../custom_components/hats/www/uix.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Jede Vorlage zielt auf ein Stilziel, das es gibt", () => {
  // Ein Tippfehler im Ziel erzeugt ein Feld, das UIX nie liest - und nichts
  // meldet sich. HATG hatte uix-states-history-charts eine Weile im Plural.
  const ids = new Set(UIX_ZIELE.map((z) => z.id));
  for (const v of VORLAGEN) assert.ok(ids.has(v.ziel), `${v.id}: Ziel ${v.ziel} gibt es nicht`);
});

pruefe("Jede Vorlage hat Kennung, beide Sprachen und einen Zweck", () => {
  const gesehen = new Set();
  for (const v of VORLAGEN) {
    assert.match(v.id, /^[a-z][a-z0-9-]{2,47}$/, `${v.id}: die Kennung steht spaeter im Marker`);
    assert.ok(!gesehen.has(v.id), `${v.id} kommt doppelt vor`);
    gesehen.add(v.id);
    for (const f of ["de", "en", "zweckDe", "zweckEn"])
      assert.ok(v[f] && v[f].length > 3, `${v.id}: ${f} fehlt`);
    assert.ok(VORLAGEN_GRUPPEN.some((g) => g.id === v.gruppe), `${v.id}: Gruppe ${v.gruppe} gibt es nicht`);
  }
});

pruefe("Kein Filter auf blankem :host", () => {
  // Ein backdrop-filter (ebenso filter, transform, will-change, contain) macht
  // ein Element zum Bezugsrahmen fuer position: fixed. Bubble-Pop-ups sind
  // fixed und fallen dann auf die Groesse des Wirts zusammen - gemessen:
  // Hoehe 0 statt 742, nur die Kopfzeile schwebte ueber dem Dashboard.
  for (const v of VORLAGEN.filter((x) => x.ziel === "card")) {
    const bloecke = v.css.split("}").filter((b) => /(^|,)\s*:host\s*(,|\{)/m.test(b.replace(/\/\*[\s\S]*?\*\//g, "")));
    for (const b of bloecke)
      assert.doesNotMatch(b, /backdrop-filter|(^|\s)filter:|transform:|will-change/,
        `${v.id}: Filter auf blankem :host - das laesst Bubble-Pop-ups zusammenfallen`);
  }
});

pruefe("Keine Weichzeichnung auf einer Dialogflaeche", () => {
  // Die Auswahllisten in einem Dialog sind position: fixed. Mit Filter wird
  // der Dialog ihr Bezugsrahmen, sie landen neben dem Bildschirm, und die
  // Liste bleibt leer. An HACS' Versionsauswahl und HAs Info-Dialog gemessen.
  for (const v of VORLAGEN.filter((x) => ["dialog", "more-info"].includes(x.ziel))) {
    const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
    const zeilen = ohneKommentar.split("\n").filter((z) => /backdrop-filter/.test(z));
    for (const z of zeilen)
      assert.match(z, /none/, `${v.id}: ${z.trim()} - eine Weichzeichnung legt die Auswahllisten lahm`);
  }
});

pruefe("Kein ':host, ha-card' dort, wo gemalt wird", () => {
  // Auf einem Dashboard patcht UIX das Karten-Element unter hui-card. ":host,
  // ha-card" trifft dann beide, Fuellung und Glanz liegen doppelt
  // uebereinander, und der Glanz wirkt ausgewaschen. Richtig ist
  // ":host(ha-card), ha-card".
  //
  // Fuer VARIABLEN gilt das nicht, im Gegenteil: Eine Variable doppelt zu
  // setzen kostet nichts (die innere gewinnt, mit demselben Wert), und beide
  // Faelle muessen erreicht werden. Der Test schlaegt deshalb nur an, wenn in
  // so einem Block wirklich eine Flaeche entsteht.
  const malt = /(^|\s)(background|box-shadow|backdrop-filter|-webkit-backdrop-filter|border|outline)\s*:/m;
  for (const v of VORLAGEN) {
    const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const block of ohneKommentar.split("}")) {
      if (!/^\s*:host\s*,\s*$/m.test(block)) continue;
      if (!/^\s*ha-card\s*\{/m.test(block)) continue;
      assert.doesNotMatch(block, malt,
        `${v.id}: ":host, ha-card" malt eine Flaeche - auf Dashboards liegt sie doppelt`);
    }
  }
});

pruefe("Kein --card-background-color in einer Vorlage ueberschrieben", () => {
  // HA faerbt damit auch Auswahlfelder und Menues. Halbtransparent sind die
  // unlesbar, weil der Inhalt dahinter durchschlaegt.
  for (const v of VORLAGEN) {
    const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(ohneKommentar, /^\s*--card-background-color\s*:/m,
      `${v.id}: ueberschreibt --card-background-color`);
  }
});

pruefe("Zwei Kopfleisten, weil es zwei Bauteile sind", () => {
  // Am 13.10.2026 an einem Dashboard gemessen: ha-top-app-bar-fixed existiert
  // dort NICHT - null Elemente. Die Kopfleiste eines Dashboards sind zwei divs
  // im Shadow Root von hui-root (.header und .toolbar). ha-top-app-bar-fixed
  // traegt die Leiste auf den Einstellungsseiten.
  //
  // Eine Vorlage auf dem falschen Ziel faellt nicht auf: Der UIX-Knoten kommt
  // an, der Selektor trifft nichts, und die Leiste SIEHT richtig aus, weil
  // ihre Farbe aus --app-header-background-color kommt. Nur verschwommen ist
  // nichts.
  const dash = VORLAGEN.find((x) => x.id === "glas-kopfleiste");
  assert.ok(dash, "glas-kopfleiste fehlt");
  assert.strictEqual(dash.ziel, "root", "die Dashboard-Leiste haengt an uix-root");
  assert.match(dash.css, /\.header/);
  assert.match(dash.css, /\.toolbar/);

  const conf = VORLAGEN.find((x) => x.id === "glas-kopfleiste-einstellungen");
  assert.ok(conf, "glas-kopfleiste-einstellungen fehlt");
  assert.strictEqual(conf.ziel, "top-app-bar-fixed");
  // Beide Schreibweisen: Unter HA 2026 .top-app-bar, bis HA 2025
  // .mdc-top-app-bar. Wer die alte streicht, nimmt aelteren Instanzen die
  // Vorlage weg.
  assert.match(conf.css, /\.mdc-top-app-bar/);
  assert.match(conf.css, /(^|[^-])\.top-app-bar/m);
});

pruefe("Die Seitenleiste trifft den Eintrag, den es wirklich gibt", () => {
  // Am 13.10.2026 gemessen: Von den drei naheliegenden Selektoren traf KEINER
  // ein Element. Der aktive Eintrag ist ein ha-list-item-button.selected.
  const v = VORLAGEN.find((x) => x.id === "glas-seitenleiste");
  assert.ok(v, "glas-seitenleiste fehlt");
  assert.match(v.css, /\.selected/, "der Selektor, der wirklich trifft, fehlt");
  // Die alten bleiben als zusaetzliche stehen, fuer aeltere Instanzen.
  assert.match(v.css, /\.iron-selected/);
});

pruefe("Eine Schicht ueber der Karte schluckt keine Klicks", () => {
  // Ohne pointer-events: none laesst sich auf der Karte nichts mehr schalten.
  for (const v of VORLAGEN) {
    if (!/::before|::after/.test(v.css)) continue;
    if (!/position:\s*absolute/.test(v.css)) continue;
    assert.match(v.css, /pointer-events:\s*none/,
      `${v.id}: eine absolute Schicht ohne pointer-events: none schluckt jeden Klick`);
  }
});

pruefe("Vorlagen lesen Theme-Felder, statt Farben festzunageln", () => {
  // Eine feste Farbe in der Vorlage ist ein zweiter Ort, an dem dieselbe Farbe
  // steht: Der Nutzer aendert das Feld, und nichts tut sich. Flaeche, Rundung
  // und Schatten der Karte muessen deshalb aus var() kommen.
  const v = VORLAGEN.find((x) => x.id === "glas-karten");
  assert.match(v.css, /var\(--ha-card-background/);
  assert.match(v.css, /var\(--ha-card-border-radius/);
  assert.match(v.css, /var\(--ha-card-box-shadow/);
});

pruefe("Gegenprobe: die Fallenpruefungen wuerden anschlagen", () => {
  // Ohne das sagen die Pruefungen oben nichts aus - sie koennten auch deshalb
  // gruen sein, weil sie an der falschen Stelle suchen.
  const boese = { id: "test", ziel: "card", css: ":host {\n  backdrop-filter: blur(4px);\n}" };
  const bloecke = boese.css.split("}").filter((b) => /(^|,)\s*:host\s*(,|\{)/m.test(b));
  assert.ok(bloecke.length > 0, "der Blockfinder findet :host nicht");
  assert.match(bloecke[0], /backdrop-filter/, "die Filterpruefung wuerde nichts finden");
  // Und die geschaerfte Doppelmal-Regel: Variablen durch, Flaechen nicht.
  const malt = /(^|\s)(background|box-shadow|backdrop-filter|-webkit-backdrop-filter|border|outline)\s*:/m;
  assert.doesNotMatch(":host,\nha-card {\n  --x: 1;\n", malt, "Variablen gelten faelschlich als Flaeche");
  assert.match(":host,\nha-card {\n  background: red;\n", malt, "eine Flaeche wird nicht erkannt");
});

console.log(`\n${n} Pruefungen`);
if (n < 11) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

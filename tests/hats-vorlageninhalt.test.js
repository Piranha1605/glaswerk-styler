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
  // Geprueft wird der Block OHNE Kommentare, und nur auf echte Eigenschaften.
  // Zwei Dinge sind ausdruecklich erlaubt:
  //   - :host(ha-card) - das greift nur, wenn der Wirt wirklich eine ha-card
  //     ist, also nie bei einer bubble-card. Nur blankes :host ist gefaehrlich.
  //   - eine Variable --irgendwas-filter: Die wird woanders angewendet; wo,
  //     entscheidet das Bauteil, das sie liest.
  const gefaehrlich = /(^|[\s;{])(backdrop-filter|filter|transform|will-change|contain)\s*:/;
  for (const v of VORLAGEN.filter((x) => x.ziel === "card")) {
    const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const b of ohneKommentar.split("}")) {
      if (!/(^|,)\s*:host\s*(,|\{)/m.test(b)) continue;
      // Variablendeklarationen aus dem Block nehmen - die sind harmlos.
      const nurEigenschaften = b.replace(/--[a-z0-9-]+\s*:[^;]*;?/gi, "");
      assert.doesNotMatch(nurEigenschaften, gefaehrlich,
        `${v.id}: Filter auf blankem :host - das laesst Bubble-Pop-ups zusammenfallen`);
    }
  }
});

pruefe("Gegenprobe: ein echter Filter auf blankem :host faellt auf", () => {
  // Ohne das koennte die Pruefung oben auch deshalb gruen sein, weil sie seit
  // der Lockerung gar nichts mehr trifft.
  const gefaehrlich = /(^|[\s;{])(backdrop-filter|filter|transform|will-change|contain)\s*:/;
  const boese = ":host,\nha-card {\n  backdrop-filter: blur(4px);\n";
  const harmlos = ":host,\nha-card {\n  --bubble-backdrop-filter: blur(4px);\n";
  assert.match(boese.replace(/--[a-z0-9-]+\s*:[^;]*;?/gi, ""), gefaehrlich, "der echte Fall wird nicht gefangen");
  assert.doesNotMatch(harmlos.replace(/--[a-z0-9-]+\s*:[^;]*;?/gi, ""), gefaehrlich, "eine Variable gilt faelschlich als Filter");
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


pruefe("Kein ::part durch zwei Shadow-Grenzen", () => {
  // ::part reicht genau EINE Shadow-Grenze durch. Von einer Karte aus liegen
  // zwischen der Regel und dem inneren .button zwei: Karte -> ha-icon-button
  // -> ha-button. Und ha-button traegt kein exportparts.
  //
  // Am 13.10.2026 gemessen: Die Regel kam an und traf nichts - die Fuellung
  // blieb rgba(0, 0, 0, 0). In HATG geht derselbe Griff, weil dort eine
  // Pfadangabe das CSS direkt in den Shadow Root von ha-icon-button legt.
  // HATS kennt diese Pfadform bewusst nicht.
  for (const v of VORLAGEN) {
    const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(ohneKommentar, /[a-z-]+\s+[a-z-]+::part\(/,
      `${v.id}: ein ::part hinter einem zweiten Element greift nicht`);
    assert.doesNotMatch(ohneKommentar, /ha-icon-button::part\(/,
      `${v.id}: ha-icon-button::part greift von aussen nicht - ha-button hat kein exportparts`);
  }
});

pruefe("Bubbles Filter liegt auf dem Container, nicht auf dem Wirt", () => {
  // Ein backdrop-filter auf :host macht den Wirt zum Bezugsrahmen fuer
  // position: fixed - und ein Bubble-Pop-up ist fixed. Es faellt dann auf die
  // Groesse des Wirts zusammen.
  //
  // Am 13.10.2026 mit offenem Pop-up gegengeprueft: .bubble-pop-up ist ein
  // GESCHWISTER von .bubble-container, kein Kind. Die Regel trifft es deshalb
  // nicht, und das Pop-up stand mit 843 x 540 Pixeln. Wer den Filter
  // stattdessen auf :host legt, bekommt Hoehe 0.
  const v = VORLAGEN.find((x) => x.id === "glas-bubble");
  assert.ok(v, "glas-bubble fehlt");
  const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(ohneKommentar, /\.bubble-container\s*\{[^}]*backdrop-filter/,
    "die Weichzeichnung steht nicht auf .bubble-container");
  // Und der Separator ist ausgenommen - sonst liegt ein verschwommener Balken
  // mit heller Oberkante hinter jedem Gruppentitel.
  assert.match(ohneKommentar, /\.bubble-separator/,
    "die Ausnahme fuer Separatoren fehlt");
  assert.doesNotMatch(ohneKommentar, /\.bubble-separator-container/,
    "den Namen .bubble-separator-container gibt es nicht");
});

pruefe("Gegenprobe: ein verschachteltes ::part wuerde auffallen", () => {
  const boese = "ha-icon-button ha-button::part(base) { background: red; }";
  assert.match(boese, /[a-z-]+\s+[a-z-]+::part\(/, "die Pruefung oben findet nichts");
});

pruefe("Kein Feld, das ein Verlauf sein darf, landet in background-color", () => {
  // Am 14.10.2026 gemessen, als der Kartenstil "Liquid Glass" dazukam: Er
  // legt ZWEI Verlaeufe in --ha-card-background, weil ha-card die Kurzform
  // background liest und dort alles erlaubt ist, was CSS als Hintergrund
  // kennt. glas-karten schrieb den Wert aber in background-color - und das
  // nimmt nur Farben. Die Zeile fiel still weg, das background-image: none
  // darunter loeschte auch noch ha-cards eigenen Verlauf, und die Karte stand
  // auf rgba(0, 0, 0, 0): keine Fuellung, nur Weichzeichnung.
  //
  // Still ist das Entscheidende. Eine ungueltige Deklaration meldet nichts,
  // und die Karte sah mit Saum und Schatten immer noch nach Glas aus.
  const DUERFEN_VERLAUF_SEIN = ["--ha-card-background", "--lovelace-background",
                                "--ha-dialog-surface-background", "--popup-custom-wallpaper"];
  const schlecht = [];
  for (const v of VORLAGEN)
    for (const feld of DUERFEN_VERLAUF_SEIN) {
      // Nicht hinter einem Bindestrich: --bubble-main-background-color ist
      // eine eigene Variable, keine Deklaration. Sie DARF den Wert tragen -
      // ob Bubble damit umgehen kann, steht auf einem anderen Blatt und
      // haengt an Bubbles Code, nicht an unserem.
      const re = new RegExp("(?<![-\\w])background-color\\s*:[^;]*var\\(\\s*" + feld.replace(/-/g, "\\-"), "g");
      for (const m of v.css.matchAll(re)) schlecht.push(`${v.id}: ${m[0].slice(0, 60)}`);
    }
  assert.deepStrictEqual(schlecht, [], "ein Verlauf in background-color faellt still weg");

  // Gegenprobe 1: Der Ausdruck trifft die alte Fassung wirklich.
  const alt = "  background-color: var(--ha-card-background, var(--card-background-color)) !important;";
  assert.match(alt, /background-color\s*:[^;]*var\(\s*--ha-card-background/);

  // Gegenprobe 2: glas-karten setzt die Fuellung ueberhaupt noch - sonst
  // waere die Pruefung gruen, weil die Zeile ganz fehlt.
  const karten = VORLAGEN.find((v) => v.id === "glas-karten");
  assert.ok(karten, "glas-karten gibt es nicht mehr");
  assert.match(karten.css, /\n\s*background:\s*var\(--ha-card-background/,
    "glas-karten fuellt die Karte gar nicht mehr");
  // Und im SELBEN Regelblock steht kein background-image: none mehr - das war
  // der zweite Teil des Fehlers. Anderswo in der Vorlage ist die Zeile
  // richtig: Reine Textkarten und Auswahllisten sollen gar keine Flaeche
  // haben, und dort steht sie hinter einem "background: none".
  const ab = karten.css.indexOf("background: var(--ha-card-background");
  const block = karten.css.slice(ab, karten.css.indexOf("}", ab));
  assert.doesNotMatch(block, /background-image:\s*none/,
    "background-image: none loescht den Verlauf gleich wieder");
  // Gegenprobe: Anderswo steht sie noch, die Pruefung ist also nicht blind.
  assert.match(karten.css, /background-image:\s*none/,
    "die Zeile ist ueberall weg - dann raeumt nichts mehr auf");
});

if (n < 15) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

pruefe("Keine Jinja-Zeichen in einer Vorlage", () => {
  // Sobald {{ oder {% in einem uix-Feld steht, schickt UIX das GANZE Feld
  // durch render_template - ein Fehler darin leert alles, auch die Bloecke,
  // die keine Vorlage sind.
  //
  // Und {# ist in Jinja ein Kommentaranfang. "@media (...) {#view { ... }}"
  // ist gueltiges CSS; steht im selben Stilziel eine Vorlage, kommt davon
  // nichts mehr an. Hinter einer oeffnenden Klammer gehoert deshalb ein
  // Leerzeichen oder ein Umbruch.
  //
  // Gemeldet am 13.10.2026 von der Sitzung, die den Hintergrund baut - sie
  // schreibt Jinja nach uix-root, und glas-kopfleiste liegt dort auch.
  for (const v of VORLAGEN) {
    const treffer = [...v.css.matchAll(/\{[#%{]/g)];
    for (const m of treffer) {
      const stelle = v.css.slice(Math.max(0, m.index - 40), m.index + 20).replace(/\n/g, " ");
      assert.fail(`${v.id}: Jinja-Zeichen "${m[0]}" bei ...${stelle}...`);
    }
  }
});

pruefe("Die Seitenleiste zentriert ueber max-width, nicht ueber width", () => {
  // Gemeldet am 14.10.2026 mit einem Bild der schmalen Leiste: "erstens sind
  // die icons nicht mittig". Die Ursache ist unsere Abstandsleiter - HAs
  // Kette (48 + 2*4 = 56) ist genau auf vier Pixel je Stufe getrimmt, die
  // Schiene steht dagegen fest.
  //
  // Und die Behebung hat eine eigene Falle: Auf width liegt HAs
  // "transition: width .25s". Eine Breite von aussen wird davon
  // aufgefressen - selbst inline mit !important blieb der Knopf bei 60,
  // dreimal gemessen. max-width wird nicht mitanimiert.
  const sb = VORLAGEN.find((v) => v.id === "glas-seitenleiste");
  assert.ok(sb, "glas-seitenleiste gibt es nicht mehr");
  const regel = sb.css.slice(sb.css.indexOf(":host(:not([expanded]))"));
  assert.ok(regel.startsWith(":host(:not([expanded]))"), "die Regel fuer die schmale Leiste fehlt");
  const block = regel.slice(0, regel.indexOf("}") + 1);
  assert.match(block, /max-width:/, "zentriert nicht ueber max-width");
  assert.doesNotMatch(block, /(^|[^-])width:\s*calc/m,
    "setzt width - das frisst HAs eigene transition auf");
  // Gerechnet wird aus der Schiene, nicht aus der Leiter: Sonst waere das
  // Ergebnis wieder an die Dichte gekoppelt, und genau die war das Problem.
  assert.match(block, /--ha-sidebar-width/, "rechnet nicht aus der Schiene");
  assert.match(block, /--ha-row-item-padding-inline/, "ruecke das Symbol nicht ein");
});

pruefe("Der Verlauf der Seitenleiste haengt am Akzent, nicht an festen Farben", () => {
  // Auf Ansage vom 14.10.2026: "im alten hatg konnten wir die aktiven buttons
  // mit einem farbverlauf belegen". Eine Vorlage liest Theme-Felder, sie
  // nagelt keine Farben fest - sonst aendert der Nutzer den Akzent und der
  // Verlauf bleibt stehen.
  const sb = VORLAGEN.find((v) => v.id === "glas-seitenleiste");
  const ab = sb.css.indexOf("background-image: linear-gradient");
  assert.ok(ab > -1, "der Verlauf fehlt");
  const block = sb.css.slice(ab, sb.css.indexOf(";", ab));
  // Beide Stufen kommen aus --accent-color.
  assert.strictEqual((block.match(/var\(--accent-color\)/g) || []).length, 2,
    "nicht beide Stufen haengen am Akzent");
  // Kein Hex und kein rgb() im Verlauf - white und black sind das Aufhellen
  // und Abdunkeln, keine Farben der Theme.
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b/i, "feste Hexfarbe im Verlauf");
  assert.doesNotMatch(block, /\brgba?\(/i, "feste rgb-Farbe im Verlauf");
  // Und die flache Flaeche bleibt als Rueckfall stehen: Ein Browser ohne
  // color-mix zeigt sonst gar nichts.
  const vor = sb.css.slice(sb.css.indexOf(".selected::before"));
  assert.match(vor.slice(0, vor.indexOf("}")), /background-color:\s*var\(--accent-color\)/,
    "ohne color-mix bliebe die Pille leer");
});

console.log(`\n${n} Pruefungen`);

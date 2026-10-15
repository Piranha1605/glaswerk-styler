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

pruefe("Die Dichte haelt sich aus der Seitenleiste heraus", () => {
  // Gemeldet am 14.10.2026 ("erstens sind die icons nicht mittig") und am
  // 15.10.2026 noch einmal: "das zerschiesst uns die position der icons und
  // die aktive schalterpille wird am rand abgeschnitten."
  //
  // Die Ursache ist unsere Abstandsleiter. HAs Schiene steht fest auf 56px
  // (home-assistant-main), und die Kette darin ist genau auf vier Pixel je
  // Stufe getrimmt: --ha-space-12 (48) + 2 * --ha-space-1 (4) = 56. Bei fuenf
  // Pixeln wird der Knopf 60 breit. Gemessen an der eingeklappten Leiste:
  // Ueberstand 10 px, Symbolmitte 40 statt 27,5 - der Ueberstand IST das
  // abgeschnittene Ende der Pille.
  //
  // Die sieben Stufen stehen deshalb in der Leiste auf HAs eigenen Werten.
  // WELCHE sieben, ist aus customElements.get("ha-sidebar").elementStyles
  // gelesen, nicht geraten - eine Stufe zu wenig, und ein Mass verschiebt
  // sich weiter.
  const sb = VORLAGEN.find((v) => v.id === "glas-seitenleiste");
  assert.ok(sb, "glas-seitenleiste gibt es nicht mehr");

  const ab = sb.css.indexOf("\n:host {");
  assert.ok(ab > -1, "der Block fuer die Leiste selbst fehlt");
  const bloecke = [];
  let i = ab;
  while (i > -1) { bloecke.push(sb.css.slice(i, sb.css.indexOf("}", i))); i = sb.css.indexOf("\n:host {", i + 1); }
  const leiter = bloecke.find((b) => b.includes("--ha-space-"));
  assert.ok(leiter, "die Leiter wird in der Leiste nicht festgehalten");

  const erwartet = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 10: 40, 12: 48 };
  for (const [stufe, wert] of Object.entries(erwartet))
    assert.match(leiter, new RegExp(`--ha-space-${stufe}:\\s*${wert}px`),
      `--ha-space-${stufe} steht nicht auf HAs ${wert}px`);
  const gesetzt = (leiter.match(/--ha-space-\d+/g) || []).length;
  assert.strictEqual(gesetzt, 7, `${gesetzt} Stufen statt der sieben, die die Leiste liest`);

  // Und KEINE zweite Geometrie daneben. Vorher stutzte eine Regel den Knopf
  // mit max-width zurecht und rechnete das Symbol wieder mittig; mit der
  // Leiter auf HAs Werten kommt HAs eigene Rechnung heraus, und zwei
  // Mechanismen fuer dieselbe Sache laufen auseinander.
  // Geprueft wird ohne Kommentare - die Begruendung oben nennt die alten
  // Namen, und das ist kein Rueckfall.
  const ohneKommentar = sb.css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(ohneKommentar, /max-width:\s*calc\(var\(--ha-sidebar-width/,
    "die alte Breitenregel steht wieder da - sie rechnet neben HA her");
  assert.doesNotMatch(ohneKommentar, /--ha-row-item-padding-inline/,
    "das Symbol wird wieder von Hand eingerueckt");
});

pruefe("Jeder aktive Knopf traegt DENSELBEN Verlauf, aus dem Akzent", () => {
  // Auf Ansage vom 14.10.2026: "im alten hatg konnten wir die aktiven buttons
  // mit einem farbverlauf belegen", und dann, mit drei Bildern: "bekommen wir
  // den farbverlauf aus dem kalender auf die aktiven buttons". Am 15.10.2026
  // kamen die Zahlen und das Nutzerbild dazu: "kannst du dem usericon und den
  // zahlenhintergrund auch den farbverlauf drueber legen".
  //
  // Die Zahlen sind am Datumsfeld der Kalender-Kachel abgelesen, nicht
  // gewaehlt: 150 Grad, 48 Prozent nach 24 Prozent Akzent. Sie stehen
  // inzwischen an VIER Stellen, und genau deshalb prueft dieser Test sie
  // gegeneinander statt gegen eine eigene Erwartung. Ein Verlauf, der an
  // einer Stelle anders gerechnet wird, laeuft auseinander, sobald jemand
  // eine davon anfasst.
  const hol = (id) => {
    const v = VORLAGEN.find((x) => x.id === id);
    assert.ok(v, `${id} gibt es nicht mehr`);
    const bloecke = [];
    let ab = v.css.indexOf("background-image: linear-gradient");
    while (ab > -1) {
      bloecke.push(v.css.slice(ab, v.css.indexOf(";", ab)));
      ab = v.css.indexOf("background-image: linear-gradient", ab + 1);
    }
    assert.ok(bloecke.length, `${id}: der Verlauf fehlt`);
    return { v, bloecke };
  };
  const stellen = [hol("glas-seitenleiste"), hol("verlauf-kapsel")];
  const alle = stellen.flatMap(({ v, bloecke }) => bloecke.map((b) => [v.id, b]));
  assert.strictEqual(alle.length, 4,
    `vier Stellen erwartet, gefunden ${alle.length} - Pille, Zahl, Nutzerbild, Kapsel`);

  // !important faellt beim Vergleich weg: Es sagt, ob die Regel sich gegen
  // eine von HA durchsetzen muss - die Pille und die Ziffer muessen das, der
  // Wirt des Nutzerbilds nicht. Der VERLAUF selbst muss derselbe sein.
  const ohneLeerraum = (t) => t.replace(/\s*!important\s*$/, "").replace(/\s+/g, " ").trim();
  for (const [id, block] of alle.slice(1))
    assert.strictEqual(ohneLeerraum(block), ohneLeerraum(alle[0][1]),
      `${id}: dieser Verlauf ist nicht mehr derselbe wie die anderen`);

  for (const [id, block] of alle) {
    // Beide Stufen kommen aus --accent-color.
    assert.strictEqual((block.match(/var\(--accent-color\)/g) || []).length, 2,
      `${id}: nicht beide Stufen haengen am Akzent`);
    // Keine festen Farben - der Nutzer aendert den Akzent, der Verlauf geht mit.
    assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b/i, `${id}: feste Hexfarbe im Verlauf`);
    assert.doesNotMatch(block, /\brgba?\(/i, `${id}: feste rgb-Farbe im Verlauf`);
    // Und der Winkel des Kalenders.
    assert.match(block, /150deg/, `${id}: nicht der Winkel des Kalenders`);
  }

  // KEIN deckender Rueckfall, und das ist Absicht: Ein durchscheinender
  // Verlauf ueber einer deckenden Akzentflaeche ergibt wieder eine deckende
  // Flaeche - der Rueckfall haette die Wirkung aufgehoben. Der Kalender macht
  // es genauso, dort steht background-color auf rgba(0,0,0,0) (gemessen).
  //
  // Geprueft wird jede Regel, die einen Verlauf traegt. Wo Home Assistant
  // selbst eine Flaeche malt - die Pille, die Zahl -, muss sie ausdruecklich
  // geraeumt sein; das Nutzerbild hat gar keine und braucht es nicht.
  const malenSelbst = [".selected::before", ".badge"];
  for (const { v, bloecke } of stellen) {
    let ab = v.css.indexOf("background-image: linear-gradient");
    while (ab > -1) {
      const regel = v.css.slice(v.css.lastIndexOf("{", ab), v.css.indexOf("}", ab));
      const waehler = v.css.slice(v.css.lastIndexOf("*/", ab) + 2, v.css.lastIndexOf("{", ab));
      assert.doesNotMatch(regel, /background-color:\s*var\(--accent-color\)/,
        `${v.id}: deckende Akzentflaeche unter dem Verlauf - er wird unsichtbar`);
      if (malenSelbst.some((w) => waehler.includes(w)))
        assert.match(regel, /background-color:\s*transparent/,
          `${v.id} (${waehler.trim().split("\n").pop()}): background-color muss ausdruecklich transparent sein`);
      ab = v.css.indexOf("background-image: linear-gradient", ab + 1);
    }
  }
});

pruefe("Die Schrift geht mit der Flaeche mit", () => {
  // Der eigentliche Fehler beim Verlauf auf Zahl und Nutzerbild, am
  // 15.10.2026 an glaswerk gemessen: Beide Flaechen waren HELL und trugen
  // deshalb dunkle Schrift. Der Verlauf ist im Dunkelmodus dunkel.
  //
  //     Ziffer, hell    weiss auf dem Verlauf     1,85 : 1
  //     "e", dunkel     #212121 auf dem Verlauf   1,38 : 1
  //
  // Beide Namen zeigen jetzt auf --primary-text-color, das dem Modus folgt.
  // Ohne diese Zeilen ist der Verlauf da und der Inhalt weg - und genau das
  // sieht man auf einem Bildschirmfoto nicht, man liest es nur nicht mehr.
  const v = VORLAGEN.find((x) => x.id === "glas-seitenleiste");
  const regel = (wahl) => {
    const ab = v.css.indexOf(`\n${wahl} {`);
    assert.ok(ab > -1, `${wahl} fehlt in glas-seitenleiste`);
    return v.css.slice(ab, v.css.indexOf("}", ab));
  };
  assert.match(regel(".badge"), /--text-accent-color:\s*var\(--primary-text-color\)/,
    "die Ziffer behaelt ihre weisse Schrift auf dem Verlauf");
  const user = regel("ha-user-badge");
  assert.match(user, /--light-primary-color:\s*transparent/,
    "der helle Kreis liegt weiter ueber dem Verlauf");
  assert.match(user, /--text-light-primary-color:\s*var\(--primary-text-color\)/,
    "der Buchstabe behaelt seine dunkle Schrift auf dem Verlauf");
  // Gegenprobe: Die beiden Namen sind die, die ha-user-badge wirklich liest -
  // sonst pruefte das hier eine Zeile, die niemand anfasst. Gemessen aus
  // customElements.get("ha-user-badge").elementStyles:
  //   .initials { background-color: var(--light-primary-color);
  //               color: var(--text-light-primary-color, var(--primary-text-color)) }
  assert.doesNotMatch(user, /\.initials/,
    "ein Selektor auf .initials - der kommt durch die Shadow-Grenze nicht durch");
});

pruefe("Die Regel fuer verschachtelte Karten steht ALLEIN", () => {
  // Gemeldet am 15.10.2026 von der Sitzung an den Horizon-Cards: Eine Karte
  // in einer Karte bekam zweimal Glas. UIX haengt seinen Knoten in beide
  // Shadow Roots, und die innere Regel weiss nicht, dass ueber ihr schon
  // eine Karte steht. :host-context() weiss es - es prueft die Vorfahren
  // ueber Shadow-Grenzen hinweg und ist das Einzige in CSS, das das kann.
  //
  // DIE PRUEFUNG IST DER EIGENE BLOCK, nicht der Selektor. Firefox kennt
  // :host-context() nicht, und ein Browser wirft eine Regel GANZ weg, sobald
  // ein Selektor in ihrer Liste unbekannt ist. Stuende die Zeile in der
  // Liste der uebrigen Ausnahmen, verloeren Ueberschriften und Textkarten
  // dort ihre Ausnahme mit - in einem Browser, den hier niemand misst.
  // Geprueft wird JEDE Vorlage, nicht nur glas-karten: Die Regel ist seit
  // dem 15.10.2026 in zweien drin, und die naechste kommt bestimmt.
  let gefunden = 0;
  for (const v of VORLAGEN) {
  const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
  const treffer = [...ohneKommentar.matchAll(/:host-context\([^)]*\)/g)];
  gefunden += treffer.length;

  for (const m of treffer) {
    // Der Selektorkopf dieser Regel: vom vorigen "}" bis zum "{".
    const auf = ohneKommentar.indexOf("{", m.index);
    const zu = ohneKommentar.lastIndexOf("}", m.index);
    const kopf = ohneKommentar.slice(zu + 1, auf);
    assert.ok(!kopf.includes(","),
      `:host-context steht in einer Selektorliste (${kopf.trim().replace(/\s+/g, " ")}) ` +
      "- ein Browser ohne Unterstuetzung wirft dann die ganze Regel weg");
    const block = ohneKommentar.slice(auf, ohneKommentar.indexOf("}", auf));
    // Weichzeichnung raeumt JEDE dieser Regeln ab; Flaeche und Schatten nur
    // die, die ueberhaupt eine Flaeche malt.
    assert.match(block, /backdrop-filter:\s*none/, `${v.id}: die Regel raeumt die Weichzeichnung nicht ab`);
    if (/background:/.test(block))
      for (const eig of ["background", "box-shadow"])
        assert.ok(new RegExp(`${eig}:\\s*none`).test(block), `${v.id}: die Regel raeumt ${eig} nicht ab`);
  }
  }
  assert.ok(gefunden >= 1, `keine Regel fuer verschachtelte Karten (${gefunden})`);
  // Und NUR in "Karten in Glas". In "Nur Weichzeichnung" waere sie falsch:
  // Dort ist die innere Karte oft die einzige, die ueberhaupt noch
  // weichzeichnen darf - die Huelle schalten solche Karten sich selbst ab.
  const nur = VORLAGEN.find((x) => x.id === "glas-nur-weichzeichnung");
  assert.doesNotMatch(nur.css.replace(/\/\*[\s\S]*?\*\//g, ""), /:host-context/,
    "Nur-Weichzeichnung nimmt verschachtelte Karten aus - dann bleibt bei Horizon-Cards keine uebrig");
  // Und die uebrigen Ausnahmen stehen weiter in IHRER Liste - sonst waere
  // der Test oben auch dann gruen, wenn es sie gar nicht mehr gaebe.
  const karten = VORLAGEN.find((x) => x.id === "glas-karten").css;
  assert.match(karten, /:host\(hui-heading-card\) ha-card,/, "die Ueberschriften-Ausnahme fehlt");
  assert.match(karten, /ha-card\.text-only \{/, "die Textkarten-Ausnahme fehlt");
});

pruefe("Nur-Weichzeichnung malt keine Flaeche", () => {
  // Aus HATG uebernommen, auf Ansage vom 15.10.2026. Ihr ganzer Sinn ist,
  // dass die Karte ihre Flaeche SELBST malt - Horizon-Cards, Shelly-Karten.
  // Eine Flaeche oder ein Schatten aus dieser Vorlage waere genau das, was
  // sie vermeiden soll, und der Unterschied zu "Karten in Glas" waere weg.
  const v = VORLAGEN.find((x) => x.id === "glas-nur-weichzeichnung");
  assert.ok(v, "die Vorlage gibt es nicht");
  const ohneKommentar = v.css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Die erste Regel ist die der Karte selbst.
  const auf = ohneKommentar.indexOf("{");
  const block = ohneKommentar.slice(auf, ohneKommentar.indexOf("}", auf));
  assert.match(block, /backdrop-filter:\s*var\(--ha-card-backdrop-filter/, "sie zeichnet nicht weich");
  assert.match(block, /border-radius:\s*var\(--ha-card-border-radius/, "sie folgt nicht der Rundung der Theme");
  assert.doesNotMatch(block, /(^|[\s;{])background(-color|-image)?:/,
    "sie malt eine Flaeche - dann ist sie 'Karten in Glas' mit anderem Namen");
  assert.doesNotMatch(block, /(^|[\s;{])box-shadow:/, "sie setzt einen Schatten auf die Karte");
  // Die beiden Werte kommen aus der Theme, nicht aus der Vorlage.
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b/i, "feste Farbe in der Kartenregel");
  // Und die Ausnahmen von "Karten in Glas" gelten hier auch: Was keine
  // Flaeche hat, braucht keinen Weichzeichner.
  for (const w of ["hui-heading-card", "mushroom-title-card", "type-custom-bubble-card", "text-only"])
    assert.ok(ohneKommentar.includes(w), `die Ausnahme fuer ${w} fehlt`);
});

pruefe("Der Grund ausserhalb des Dashboards liegt UNTER dem bewegten", () => {
  // Gemeldet am 14.10.2026 von der Sitzung an der Steuerkarte: Die
  // Hintergrundbewegung lief nur im Vollbild. Sie lief in Wahrheit immer -
  // sie war verdeckt.
  //
  // hui-view-background traegt z-index: -1, und ein Element mit negativem
  // z-index wird VOR den Flaechen der gewoehnlichen Bloecke desselben Stapels
  // gemalt. Ein Hintergrund direkt auf .layout (static, z-index auto) liegt
  // also DARUEBER. Weil es dasselbe Bild ist, faellt es nur dadurch auf, dass
  // nichts sich bewegt - die teuerste Sorte Fehler.
  const g = VORLAGEN.find((v) => v.id === "grund-ueberall");
  assert.ok(g, "grund-ueberall gibt es nicht mehr");

  // Der Grund gehoert in eine eigene feste Ebene mit negativem z-index.
  const ab = g.css.indexOf(".layout::before");
  assert.ok(ab > -1, "keine eigene Ebene - der Grund liegt wieder auf .layout");
  const block = g.css.slice(ab, g.css.indexOf("}", ab));
  assert.match(block, /position:\s*fixed/, "die Ebene ist nicht fest");
  assert.match(block, /pointer-events:\s*none/, "die Ebene faengt Klicks ab");
  const z = /z-index:\s*(-?\d+)/.exec(block);
  assert.ok(z, "kein z-index auf der Ebene");
  assert.ok(Number(z[1]) < -1,
    `z-index ${z[1]} liegt nicht unter hui-view-background (-1)`);
  assert.match(block, /var\(--lovelace-background/, "die Ebene liest das Feld nicht");

  // Und .layout selbst traegt keinen Hintergrund mehr. Die Variable darf dort
  // stehen bleiben - sie ist etwas anderes als eine Flaeche.
  const rest = g.css.slice(0, ab) + g.css.slice(g.css.indexOf("}", ab));
  const layout = rest.slice(rest.indexOf("\n.layout {"));
  assert.doesNotMatch(layout.slice(0, layout.indexOf("}")), /\n\s*background(-image)?:/,
    "auf .layout liegt wieder eine Flaeche - sie verdeckt den bewegten Grund");
});

console.log(`\n${n} Pruefungen`);

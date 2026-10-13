// Vorlagen: fertige CSS-Bloecke fuer die Stilziele von UI eXtension.
//
// Jede Vorlage schreibt in GENAU EIN Stilziel, zwischen zwei Marker. Die
// Mechanik dazu steht in theme.js; hier steht nur, was drinsteht.
//
// Zwei Regeln, die den Unterschied zwischen "sieht gut aus" und "funktioniert"
// ausmachen:
//
// 1. Eine Vorlage LIEST die Theme-Felder, sie setzt keine festen Werte.
//    `var(--ha-card-background)` statt `rgba(255,255,255,.5)`. Sonst waere die
//    Vorlage ein zweiter Ort, an dem dieselbe Farbe steht - und der Nutzer
//    aendert das Feld, ohne dass sich etwas tut. Nur was HA gar nicht als Feld
//    anbietet (Weichzeichnung der Seitenleiste etwa), steht als fester Wert
//    da, mit var() davor, falls es das Feld doch gibt.
//
// 2. Ein uix-Feld gilt fuer HELL UND DUNKEL zugleich. Was sich zwischen den
//    Modi unterscheiden muss, gehoert deshalb in ein Theme-Feld, nicht hierher.
//    `light-dark()` hilft nicht: Es folgt dem Betriebssystem, und Home
//    Assistant setzt kein color-scheme.
//
// Die Kommentare im CSS sind Absicht. Sie stehen spaeter in der Theme-Datei
// des Nutzers, und dort erklaert sie sonst niemand mehr.

export const VORLAGEN = [
  // -------------------------------------------------------------------------
  {
    id: "glas-karten",
    gruppe: "glas",
    ziel: "card",
    de: "Karten in Glas",
    en: "Cards in glass",
    zweckDe: "Die Grundflaeche: Weichzeichnung, Rundung und Schatten fuer jede Karte. Ueberschriften und reine Textkarten bleiben ohne Flaeche, Auswahlfelder bleiben deckend.",
    zweckEn: "The base surface: blur, radius and shadow for every card. Headings and text-only cards stay without a surface, dropdowns stay opaque.",
    css: `/* Nur die Karte selbst, nicht ihr Wirt.

   Auf einem Dashboard haengt eine Karte unter hui-card, und UIX patcht dann
   das KARTEN-Element - :host ist dieses Element, ha-card die Karte darin. Ein
   Selektor ":host, ha-card" bemalt deshalb beide: Fuellung, Glanz und
   Weichzeichnung liegen doppelt uebereinander und wirken ausgewaschen.

   Und ein backdrop-filter auf dem Wirt macht ihn zum Bezugsrahmen fuer
   position: fixed. Bubble-Pop-ups sind fixed und fallen dann auf die Groesse
   des Wirts zusammen - gemessen: Hoehe 0 statt 742. */
:host(ha-card),
ha-card {
  background-color: var(--ha-card-background, var(--card-background-color)) !important;
  background-image: none !important;
  backdrop-filter: var(--ha-card-backdrop-filter, blur(20px) saturate(160%));
  -webkit-backdrop-filter: var(--ha-card-backdrop-filter, blur(20px) saturate(160%));
  /* Ohne eigenen Radius zeichnet der Rand ein eckiges Rechteck um die runde Karte. */
  border-radius: var(--ha-card-border-radius, 22px) !important;
  /* Der Rand liegt als innerer Ring IM Schatten. Ein echtes border verschiebt
     das Layout um seine Breite - bei eigenen Panels rutscht damit der ganze
     Inhalt nach unten. */
  box-shadow: var(--ha-card-box-shadow) !important;
  border: 0 !important;
}

/* Bubble-Karten haben im Shadow Root ebenfalls eine ha-card. Die zeichnet die
   Bubble-Vorlage schon - ohne Ausnahme laege darunter ein zweites Glas.
   Ueberschriften und reine Textkarten brauchen gar keine Flaeche. */
:host(.type-custom-bubble-card) ha-card,
:host(hui-heading-card) ha-card,
:host(mushroom-title-card) ha-card,
:host(mushroom-chips-card) ha-card,
:host(.text-only),
ha-card.text-only {
  background: none !important;
  background-image: none !important;
  border: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Auswahlfelder und Menues bleiben deckend - durchscheinend sind sie
   unlesbar, weil der Text der Karte darunter durchschlaegt. */
ha-dropdown,
ha-combo-box,
ha-select,
vaadin-combo-box-overlay,
.menu-surface,
.mdc-menu-surface,
mwc-menu-surface {
  --ha-card-background: var(--card-background-color) !important;
  background-color: var(--card-background-color) !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Bubble legt ein unsichtbares ha-select als Klickflaeche ueber runde
   Auswahl-Sub-Buttons. Mit deckender Farbe wird daraus ein eckiges dunkles
   Quadrat mitten auf dem Knopf. */
ha-select.bubble-dropdown-select {
  background-color: transparent !important;
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-lichtkante",
    gruppe: "glas",
    ziel: "card",
    de: "Lichtkante auf Karten",
    en: "Light edge on cards",
    zweckDe: "Der helle Saum oben und der weiche Schimmer quer ueber die Flaeche - das, was echtes Glas von einer halbtransparenten Flaeche unterscheidet.",
    zweckEn: "The bright rim along the top and the soft sheen across the surface - what separates real glass from a merely translucent panel.",
    css: `/* Der Saum liegt als ::before UEBER der Flaeche und unter dem Inhalt.
   Zwei Dinge zusammen machen den Glaseindruck aus: ein heller Ring, der oben
   kraeftiger ist als unten (so faellt Licht), und ein schraeger Verlauf, der
   quer ueber die Flaeche laeuft.

   Zwei Dinge sind hier Absicht:

   pointer-events: none - ohne das schluckt die Schicht jeden Klick auf die
   Karte, und nichts laesst sich mehr schalten.

   KEIN overflow: hidden. Die Schicht deckt die Flaeche ohnehin genau ab
   (inset: 0 plus border-radius: inherit), und overflow wuerde alles
   abschneiden, was aus der Karte herausragen soll - Badges auf
   Ueberschriften etwa. */
:host(ha-card),
ha-card {
  position: relative;
}
:host(ha-card)::before,
ha-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  /* Bewusst 0 und nicht -1. Ein Reflex liegt auch in echt UEBER dem, was
     hinter dem Glas ist - und -1 waere unzuverlaessig: Es haengt davon ab, ob
     die Karte gerade einen Stacking-Context bildet (ein backdrop-filter tut
     das, eine Karte ohne Weichzeichnung nicht). Mal laege der Schimmer dann
     vor dem Inhalt, mal hinter der Flaeche und damit unsichtbar. Dass er
     sichtbar bleibt, kostet hier nichts: 22 % Weiss am oberen Rand, nach
     55 % der Flaeche ist er ganz weg. */
  z-index: 0;
  /* Der Ring. Drei Dinge, nicht eins:

     Oben ein kraeftiger heller Saum - das ist die Kante, an der das Licht
     bricht. Unten ein DUNKLER, denn eine Glasscheibe wirft an ihrer Unterkante
     Schatten in sich selbst. Und an den Seiten ein schwacher heller.

     Der dunkle Saum unten ist der Unterschied zwischen "durchsichtig" und
     "dick". Ohne ihn liegt die Flaeche flach auf dem Hintergrund; mit ihm hat
     sie eine Staerke. Auf hellem Grund ist er ausserdem das Einzige, was man
     ueberhaupt sieht - ein heller Saum auf hellem Grund ist unsichtbar. */
  box-shadow:
    inset 0 1.5px 0 0 rgba(255, 255, 255, .72),
    inset 0 -1.5px 0 0 rgba(10, 20, 45, .1),
    inset 1px 0 0 0 rgba(255, 255, 255, .3),
    inset -1px 0 0 0 rgba(255, 255, 255, .22),
    inset 0 14px 22px -16px rgba(255, 255, 255, .5);
  /* Der Schimmer: ein helles Band schraeg ueber die obere Haelfte, und ein
     zweites, schwaecheres von unten rechts - so als laege eine zweite
     Lichtquelle dort. Mit nur einem wirkt die Flaeche wie gekippt. */
  background:
    linear-gradient(135deg,
      rgba(255, 255, 255, .34) 0%,
      rgba(255, 255, 255, .1) 26%,
      rgba(255, 255, 255, 0) 52%),
    linear-gradient(315deg,
      rgba(255, 255, 255, .14) 0%,
      rgba(255, 255, 255, 0) 38%);
}

/* Karten ohne Flaeche bekommen auch keinen Saum - sonst schwebt ein heller
   Rahmen um eine Ueberschrift. */
:host(.type-custom-bubble-card) ha-card::before,
:host(hui-heading-card) ha-card::before,
:host(mushroom-title-card) ha-card::before,
:host(mushroom-chips-card) ha-card::before,
:host(.text-only)::before,
ha-card.text-only::before {
  display: none;
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-symbolkachel",
    gruppe: "glas",
    ziel: "card",
    de: "Symbole als Kachel",
    en: "Icons as rounded tiles",
    zweckDe: "Macht aus den runden Symbolflaechen weiche Quadrate - in Kacheln, bei Mushroom, in Zeilen und auf Glance-Karten zugleich.",
    zweckEn: "Turns the round icon backgrounds into soft squares - in tiles, in Mushroom, in rows and on glance cards at once.",
    css: `/* Kein Pfad noetig: Symbolbehaelter lesen alle eine Rundungs-Variable, und
   Variablen erben durch jede Shadow-Grenze. Ein :host-Block erreicht damit
   Kacheln, Mushroom, Zeilen und Glance auf einmal.

   Bei Mushroom muss es --mush-icon-border-radius sein, nicht
   --icon-border-radius: Mushroom setzt letzteres selbst weiter unten im Baum
   (--icon-border-radius: var(--mush-icon-border-radius, 50%)), ein Wert von
   aussen traegt dort nicht.

   UND BEI BUBBLE REICHT DER ALLGEMEINE NAME NICHT. Am 13.10.2026 an der
   laufenden Instanz gemessen: Von fuenf Bubble-Icons wurden genau zwei eckig,
   drei blieben rund - obwohl --bubble-icon-border-radius an jedem von ihnen
   nachweislich auf 28 % stand. Der Grund steht in Bubbles eigener Kette:

       border-radius: var(--bubble-card-type-icon-border-radius,
                          var(--bubble-icon-border-radius,
                              var(--bubble-border-radius, 50%)))

   Die erste Stufe ist TYPSPEZIFISCH - Bubble setzt sie je Kartentyp selbst
   (bei einem Separator etwa aus --bubble-separator-icon-border-radius). Wo sie
   gesetzt ist, kommt die allgemeine nie zum Zug. Wer eine Form durchsetzen
   will, muss deshalb die erste Stufe setzen.

   Dasselbe Muster gilt fuer die Kartenflaeche:
   var(--bubble-card-type-border-radius, var(--bubble-border-radius, ...)). */
:host,
ha-card {
  --ha-tile-icon-border-radius: 28%;
  --state-badge-border-radius: 28%;
  --mush-icon-border-radius: 28%;
  /* Beide Stufen. Die erste gewinnt, die zweite faengt die Faelle, in denen
     Bubble die erste nicht setzt. */
  --bubble-card-type-icon-border-radius: 28%;
  --bubble-icon-border-radius: 28%;
  --bubble-button-icon-border-radius: 28%;
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-seitenleiste",
    gruppe: "glas",
    ziel: "sidebar",
    de: "Seitenleiste in Glas",
    en: "Sidebar in glass",
    zweckDe: "Weichzeichnung hinter der Seitenleiste und eine gerundete Pille fuer den aktiven Eintrag.",
    zweckEn: "Blur behind the sidebar and a rounded pill for the active entry.",
    css: `/* Die Flaechenfarbe kommt aus dem Theme-Feld sidebar-background-color.
   Die Weichzeichnung bietet HA als Feld nicht an, sie steht deshalb als
   fester Wert hier - mit var() davor, falls es das Feld doch einmal gibt. */
:host {
  backdrop-filter: var(--sidebar-backdrop-filter, blur(24px) saturate(170%));
  -webkit-backdrop-filter: var(--sidebar-backdrop-filter, blur(24px) saturate(170%));
}

/* Der aktive Eintrag als Pille. Nur ein INNERER Schatten - ein Aussenschatten
   wird von der Liste abgeschnitten und steht dann als dunkles Rechteck um die
   runde Pille. */
.iron-selected,
a[role="option"][aria-selected="true"],
ha-md-list-item[selected] {
  border-radius: 999px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .45) !important;
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-kopfleiste",
    gruppe: "glas",
    ziel: "top-app-bar-fixed",
    de: "Kopfleiste in Glas",
    en: "Top bar in glass",
    zweckDe: "Weichzeichnung unter der Kopfleiste des Dashboards. Die Farbe kommt aus app-header-background-color.",
    zweckEn: "Blur under the dashboard top bar. The colour comes from app-header-background-color.",
    css: `/* Beide Schreibweisen, nicht nur eine: Unter HA 2026 heisst die Klasse
   .top-app-bar, bis HA 2025 hiess sie .mdc-top-app-bar. Wer die alte streicht,
   nimmt aelteren Instanzen die Vorlage weg.

   Dieselbe Vorlage war in HATG eine Weile tot, ohne dass es auffiel: Der
   UIX-Knoten kam an, der Selektor traf nichts, und die Leiste SAH trotzdem
   richtig aus - weil die Farbe aus --app-header-background-color kommt, das
   die Leiste selbst liest. Nur verschwommen war nichts. */
.mdc-top-app-bar,
.top-app-bar,
header.top-app-bar {
  backdrop-filter: var(--app-header-backdrop-filter, blur(22px) saturate(170%));
  -webkit-backdrop-filter: var(--app-header-backdrop-filter, blur(22px) saturate(170%));
  box-shadow: none !important;
  border-bottom: 1px solid rgba(255, 255, 255, .16);
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-dialoge",
    gruppe: "glas",
    ziel: "dialog",
    de: "Dialoge in Glas",
    en: "Dialogs in glass",
    zweckDe: "Gerundete Dialogflaeche mit Lichtkante. Bewusst OHNE Weichzeichnung - die macht die Auswahllisten darin unerreichbar.",
    zweckEn: "Rounded dialog surface with a light edge. Deliberately WITHOUT blur - it makes the dropdowns inside unreachable.",
    css: `/* KEIN backdrop-filter auf der Dialogflaeche.

   Ein Filter macht den Dialog zum Bezugsrahmen fuer position: fixed. Die
   Auswahllisten darin sind fixed: Sie landen neben dem sichtbaren Bereich,
   und die Liste bleibt leer. An der Versionsauswahl von HACS und am
   Info-Dialog von HA gemessen. Ein Filter auf einem ::before hilft nicht.

   Welcher Selektor unter HA 2026 traegt, ist am 13.10.2026 an einem offenen
   Info-Dialog gemessen: In keinem der Dialog-Bauteile kommt noch eine einzige
   mdc-Klasse vor. Der Dialog ist eine wa-dialog von Web Awesome, und sie gibt
   ihre Flaeche als CSS-Teil nach aussen - ein Teil reicht durch die
   Shadow-Grenze, deshalb greift wa-dialog::part(dialog) von hier aus.
   Nachgemessen: Radius 26px, Schatten gesetzt.

   Die mdc-Zeile bleibt trotzdem stehen. Sie ist unter HA 2026 tot, aber wer
   eine aeltere Instanz faehrt, braucht sie - und eine tote Zeile kostet
   nichts. Die Korrektur gehoert als ZUSAETZLICHER Selektor geschrieben, nicht
   als Ersatz. */
.mdc-dialog__surface,
wa-dialog::part(dialog),
wa-drawer::part(dialog) {
  border-radius: var(--ha-dialog-border-radius, 26px) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, .28),
    inset 0 1px 0 rgba(255, 255, 255, .5) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-more-info",
    gruppe: "glas",
    ziel: "more-info",
    de: "Info-Dialog in Glas",
    en: "More-info dialog in glass",
    zweckDe: "Rundung und Lichtkante fuer den Dialog, der sich beim Klick auf eine Entitaet oeffnet.",
    zweckEn: "Radius and light edge for the dialog that opens when you tap an entity.",
    css: `/* :host ist hier ha-more-info-dialog. Auch hier keine Weichzeichnung auf
   der Flaeche - aus demselben Grund wie bei den uebrigen Dialogen. */
wa-dialog::part(dialog),
wa-drawer::part(dialog),
.mdc-dialog__surface {
  border-radius: var(--ha-dialog-border-radius, 26px) !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, .3),
    inset 0 1px 0 rgba(255, 255, 255, .45) !important;
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-badges",
    gruppe: "glas",
    ziel: "badge",
    de: "Badges in Glas",
    en: "Badges in glass",
    zweckDe: "Die kleinen Zustandsplaketten oben auf dem Dashboard bekommen dieselbe Glasflaeche wie die Karten.",
    zweckEn: "The small state badges at the top of the dashboard get the same glass surface as the cards.",
    css: `:host,
.badge {
  backdrop-filter: var(--ha-card-backdrop-filter, blur(18px) saturate(160%));
  -webkit-backdrop-filter: var(--ha-card-backdrop-filter, blur(18px) saturate(160%));
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5);
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-toast",
    gruppe: "glas",
    ziel: "toast",
    de: "Meldungen in Glas",
    en: "Toasts in glass",
    zweckDe: "Die Meldung unten links bekommt Glasflaeche, Rundung und Lichtkante.",
    zweckEn: "The message at the bottom left gets a glass surface, radius and light edge.",
    css: `:host,
.toast,
ha-toast {
  backdrop-filter: blur(20px) saturate(170%);
  -webkit-backdrop-filter: blur(20px) saturate(170%);
  border-radius: 18px;
  box-shadow:
    0 12px 36px rgba(0, 0, 0, .22),
    inset 0 1px 0 rgba(255, 255, 255, .4);
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-knoepfe",
    gruppe: "glas",
    ziel: "card",
    de: "Symbolknoepfe mit Glasflaeche",
    en: "Icon buttons on glass",
    zweckDe: "Legt den Symbolknoepfen in Karten eine gerundete Glasflaeche unter.",
    zweckEn: "Puts a rounded glass surface under the icon buttons inside cards.",
    css: `/* ::part(base) ist das innere .button von ha-button, das ha-icon-button als
   CSS-Teil nach aussen gibt - ein Teil reicht durch die Shadow-Grenze.

   Die FUELLUNG braucht !important: ha-button steht auf appearance="plain",
   und :host([appearance~="plain"]) .button setzt ein hartes
   background-color: rgba(0,0,0,0) ohne Variable davor. Rundung, Schatten und
   Filter kommen dagegen ohne durch.

   Die Deckkraft von ::after bleibt in Ruhe: Sie traegt die Rueckmeldung beim
   Zeigen und Druecken (0 -> 0.1). Ein !important darauf legt sie still. */
ha-icon-button::part(base),
ha-icon-button ha-button::part(base) {
  background-color: rgba(255, 255, 255, .14) !important;
  border-radius: var(--ha-button-border-radius, 14px);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35);
}
/* Der Schimmer beim Zeigen bekommt die Form des Knopfes statt eines Kreises. */
ha-icon-button ha-button::after {
  border-radius: var(--ha-button-border-radius, 14px) !important;
}`,
  },
];

// Die Gruppen in der Reihenfolge, in der sie angezeigt werden.
export const VORLAGEN_GRUPPEN = [
  { id: "glas", de: "Liquid Glass", en: "Liquid Glass" },
];

export const VORLAGEN_ANZAHL = VORLAGEN.length;

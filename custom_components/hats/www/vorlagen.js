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
    id: "glas-bubble",
    gruppe: "glas",
    ziel: "card",
    de: "Bubble Card in Glas",
    en: "Bubble Card in glass",
    zweckDe: "Gibt Bubble-Karten dieselbe Glasflaeche, Rundung, Lichtkante und denselben Schatten wie den HA-Karten. Ohne sie bleiben Bubble-Karten flach - \"Karten in Glas\" nimmt sie ausdruecklich aus.",
    zweckEn: "Gives Bubble cards the same glass surface, radius, light edge and shadow as the HA cards. Without it Bubble cards stay flat - \"Cards in glass\" deliberately excludes them.",
    css: `/* Bubble braucht BEIDES: Variablen und eine Regel.

   Flaeche, Rand und Schatten liest Bubble aus eigenen --bubble-*-Werten.
   CSS-Regeln kommen nicht ueber Shadow-Grenzen, Variablen schon.

   Die Weichzeichnung dagegen geht NUR ueber eine Regel. Am 13.10.2026 in
   bubble-card.js 3.4.1 nachgesehen: Es gibt genau drei Namen mit "backdrop",
   und alle drei gehoeren zum Abdunkel-Schleier HINTER einem Pop-up
   (.bubble-backdrop, position: fixed) - nicht zur Kartenflaeche.
   .bubble-container traegt ueberhaupt kein backdrop-filter. Eine Variable
   dafuer gibt es also nicht.

   Die Regel steht auf .bubble-container und ausdruecklich NICHT auf :host.
   Ein backdrop-filter auf dem Wirt macht ihn zum Bezugsrahmen fuer
   position: fixed - und Bubble-Pop-ups sind fixed. Sie fielen dann auf die
   Groesse des Wirts zusammen; in HATG gemessen: Hoehe 0 statt 742, nur die
   Kopfzeile schwebte ueber dem Dashboard.

   WELCHE Variablenstufe, das ist die zweite Frage. Jede Eigenschaft loest
   Bubble ueber eine dreistufige Kette auf:

       var(--bubble-card-type-X, var(--bubble-X, <vorgabe>))

   Am 13.10.2026 an acht Karten durchprobiert, je Variable einzeln gesetzt,
   abgelesen am .bubble-container:

       --bubble-card-type-border-radius       0 von 8   wirkungslos
       --bubble-border-radius                 8 von 8
       --bubble-button-border-radius          3 von 8   genau die button-Karten
       --bubble-separator-border-radius       3 von 8   genau die Separatoren
       --bubble-climate-border-radius         1 von 8   genau die Klimakarte
       --bubble-media-player-border-radius    1 von 8   genau der Player

   Die card-type-Stufe setzt Bubble selbst - ein Wert von aussen kommt dort
   nie an. Deshalb hier die ALLGEMEINE Stufe: Sie erreicht jeden Kartentyp und
   laesst Bubbles Typlogik in Ruhe. */
:host,
ha-card {
  /* Flaeche aus demselben Feld wie die HA-Karten - damit zieht Bubble mit,
     wenn der Regler bewegt wird. */
  --bubble-main-background-color: var(--ha-card-background, var(--card-background-color));
  --bubble-secondary-background-color: var(--ha-card-background, var(--card-background-color));

  /* Die Lichtkante steckt IM Schatten, nicht in --bubble-border.
     --bubble-border ist ein echtes border und verschiebt das Layout um seine
     Breite - bei einer 56px hohen Bubble-Zeile sieht man das sofort. Ein
     inset-Schatten liegt dagegen in der Flaeche. */
  --bubble-border: none;
  --bubble-box-shadow:
    inset 0 1.5px 0 0 rgba(255, 255, 255, .6),
    inset 0 -1.5px 0 0 rgba(10, 20, 45, .08),
    var(--ha-card-box-shadow, 0 10px 30px rgba(22, 40, 78, .14));
}

/* Die Weichzeichnung auf den Container, nicht auf den Wirt. */
.bubble-container {
  backdrop-filter: var(--ha-card-backdrop-filter, blur(20px) saturate(160%));
  -webkit-backdrop-filter: var(--ha-card-backdrop-filter, blur(20px) saturate(160%));
}

/* Eine eingeschaltete Karte legt ihre Zustandsfarbe als Schicht ueber die
   ganze Flaeche - und deckt damit das Glas zu.

   Am 13.10.2026 an fuenf Karten gemessen: Nur die trifft es, die wirklich eine
   Farbe traegt. Bubble setzt die Deckkraft INLINE, deshalb braucht es hier
   !important:

       Keller, Licht an    rgb(209, 209, 195)   opacity 0.7   <- deckt zu
       Buero, Slider       transparent          opacity 0.5
       Buero, Climate      transparent          opacity 1
       Garage, aus         transparent          opacity 0.5

   55 % ist die Wahl des Nutzers, zwischen zwei Nachteilen: Deckend sieht man
   den Zustand klar und das Glas nicht; zu schwach getoent bleibt das Glas, und
   bei einer blassen Lichtfarbe (warmweiss, beige) sieht man kaum noch, dass
   etwas an ist.

   Der AUS-Zustand bleibt unberuehrt. Dort ist die Schicht ohnehin farblos -
   den Unterschied macht die Farbe, nicht die Deckkraft. */
ha-card.is-on .bubble-background {
  opacity: .55 !important;
}

/* Ein Separator ist eine Ueberschriftenzeile, keine Kachel. Bubble laesst ihn
   schon ohne Flaeche; ohne diese Ausnahme laegen trotzdem Weichzeichnung und
   Lichtkante darauf - ein verschwommener Balken mit heller Oberkante hinter
   jedem Gruppentitel.

   Die Klassen am Container, am 13.10.2026 an acht Karten abgelesen - jeder
   Kartentyp traegt neben .bubble-container noch einen eigenen Namen:

       separator      bubble-container bubble-separator separator-container
       button         bubble-button-container bubble-container …
       climate        bubble-climate-container bubble-container
       media-player   bubble-media-player-container bubble-container

   Damit laesst sich jeder Typ einzeln ansprechen, ohne die Variablenkette zu
   bemuehen. Ein erster Versuch zielte auf .bubble-separator-container - den
   Namen gibt es nicht, und die Ausnahme traf nichts. */
.bubble-separator,
.separator-container {
  background: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
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

   UND BEI BUBBLE: nur die allgemeine Stufe, nicht die typspezifische.

   Bubble loest den Radius ueber eine dreistufige Kette auf:

       var(--bubble-card-type-icon-border-radius,
           var(--bubble-icon-border-radius,
               var(--bubble-border-radius, 50%)))

   Am 13.10.2026 an fuenf Bubble-Karten durchprobiert, je Variable einzeln
   gesetzt und der berechnete Radius gemessen:

       --bubble-card-type-icon-border-radius   0 von 5   wirkungslos
       --bubble-icon-border-radius             5 von 5
       --bubble-button-icon-border-radius      3 von 5   nur card_type: button
       --bubble-border-radius                  5 von 5   faerbt aber auch Flaechen

   Die ERSTE Stufe setzt Bubble selbst, je Kartentyp - ein Wert von aussen
   kommt dort nie an. Die typspezifischen Namen wie
   --bubble-button-icon-border-radius treffen genau ihren Kartentyp; climate
   und media-player bleiben davon unberuehrt. Deshalb steht hier die
   ALLGEMEINE Stufe, und nur sie: Sie erreicht alle fuenf und laesst Bubbles
   eigene Typlogik in Ruhe.

   (Eine frühere Fassung setzte zusaetzlich die card-type-Stufe. Das war aus
   einer Messung geschlossen, bei der die aktive Theme des Nutzers genau diese
   Stufe belegt hatte - gemessen wurde also deren Wirkung, nicht die eigene.
   Wer bei Bubble misst, legt die laufende Theme vorher stumm.) */
:host,
ha-card {
  --ha-tile-icon-border-radius: 28%;
  --state-badge-border-radius: 28%;
  --mush-icon-border-radius: 28%;
  --bubble-icon-border-radius: 28%;
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

/* Der aktive Eintrag als Pille.

   Am 13.10.2026 an der laufenden Instanz nachgesehen, welcher Selektor ihn
   wirklich trifft - die drei naheliegenden trafen NULL Elemente:

       .iron-selected                            0   (Polymer, lange her)
       a[role="option"][aria-selected="true"]    0
       ha-md-list-item[selected]                 0
       .selected                                 1   <- dieser

   Der aktive Eintrag ist ein ha-list-item-button.selected in einer
   ha-list-nav. Die drei alten bleiben als zusaetzliche Selektoren stehen: Wer
   eine aeltere HA faehrt, braucht sie, und eine tote Zeile kostet nichts.

   Nur ein INNERER Schatten. Ein Aussenschatten wird von der Liste
   abgeschnitten und steht dann als dunkles Rechteck um die runde Pille. */
ha-list-item-button.selected,
.selected,
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
    ziel: "root",
    de: "Kopfleiste in Glas (Dashboard)",
    en: "Top bar in glass (dashboard)",
    zweckDe: "Weichzeichnung unter der Kopfleiste eines Dashboards. Die Farbe kommt aus app-header-background-color.",
    zweckEn: "Blur under a dashboard's top bar. The colour comes from app-header-background-color.",
    css: `/* Das Ziel ist uix-root, NICHT uix-top-app-bar-fixed.

   Am 13.10.2026 an einem Dashboard gemessen: ha-top-app-bar-fixed existiert
   dort ueberhaupt nicht - null Elemente. Die Kopfleiste eines Dashboards sind
   zwei divs im Shadow Root von hui-root:

       div.header    56px hoch
       div.toolbar   56px hoch

   ha-top-app-bar-fixed traegt die Leiste auf den EINSTELLUNGSSEITEN; dafuer
   gibt es die Vorlage daneben.

   Dieselbe Vorlage war in HATG eine Weile tot, ohne dass es auffiel: Der
   UIX-Knoten kam an, der Selektor traf nichts, und die Leiste SAH trotzdem
   richtig aus - weil die Farbe aus --app-header-background-color kommt, das
   die Leiste selbst liest. Nur verschwommen war nichts. Das ist der Grund,
   warum hier jeder Selektor nachgemessen ist. */
.header,
.toolbar {
  backdrop-filter: var(--app-header-backdrop-filter, blur(22px) saturate(170%));
  -webkit-backdrop-filter: var(--app-header-backdrop-filter, blur(22px) saturate(170%));
  box-shadow: none !important;
}
.header {
  border-bottom: 1px solid rgba(255, 255, 255, .16);
}`,
  },

  // -------------------------------------------------------------------------
  {
    id: "glas-kopfleiste-einstellungen",
    gruppe: "glas",
    ziel: "top-app-bar-fixed",
    de: "Kopfleiste in Glas (Einstellungen)",
    en: "Top bar in glass (settings)",
    zweckDe: "Dasselbe fuer die Leiste der Einstellungsseiten - die ist ein anderes Bauteil als die des Dashboards.",
    zweckEn: "The same for the settings pages' bar - a different component from the dashboard one.",
    css: `/* Beide Schreibweisen, nicht nur eine: Unter HA 2026 heisst die Klasse
   .top-app-bar, bis HA 2025 hiess sie .mdc-top-app-bar. Wer die alte streicht,
   nimmt aelteren Instanzen die Vorlage weg. In 629 Elementen einer
   Einstellungsseite kommt unter HA 2026 keine einzige mdc-Klasse mehr vor. */
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
    de: "Symbolknoepfe anpassen",
    en: "Icon buttons",
    zweckDe: "Groesse, Rundung, Schatten und die Klick-Welle der Symbolknoepfe - alles ueber Variablen, die durch jede Shadow-Grenze erben.",
    zweckEn: "Size, radius, shadow and the ripple of icon buttons - all through variables, which inherit through every shadow boundary.",
    css: `/* Nur Variablen, keine Regeln auf das Innere des Knopfes.

   Der naheliegende Weg waere ha-icon-button::part(base) - das innere .button
   von ha-button. Am 13.10.2026 an der Instanz gemessen: Er funktioniert NICHT
   von hier aus. ::part reicht genau EINE Shadow-Grenze durch, und ha-button
   traegt kein exportparts; von der Karte aus liegen aber zwei Grenzen
   dazwischen (Karte -> ha-icon-button -> ha-button). Die Regel kam an und traf
   nichts:

       ha-icon-button ha-button::part(base) { background-color: … !important }
       -> gemessen: rgba(0, 0, 0, 0), also unveraendert

   In HATG geht das, weil dort eine Pfadangabe das CSS direkt in den Shadow
   Root von ha-icon-button legt (uix-card-yaml mit "ha-icon-button $"). HATS
   kennt diese Pfadform bewusst nicht - ein -yaml-Feld verdeckt sein einfaches
   Feld vollstaendig, und das ist eine Falle, die HATS sich nicht einhandelt.

   Was ohne Pfad geht, sind Variablen: Die erben durch jede Shadow-Grenze.
   Die Fuellung des Knopfes gehoert nicht dazu - ha-button steht auf
   appearance="plain" und setzt dort ein hartes background-color ohne Variable
   davor. Groesse, Form und Rueckmeldung dagegen schon. */
:host,
ha-card {
  --ha-icon-button-size: 40px;
  --ha-button-border-radius: 14px;
  /* Die Klick-Welle in der Akzentfarbe statt in Grau - das ist die einzige
     Farbe am Knopf, die von aussen erreichbar ist. */
  --ha-ripple-color: var(--accent-color);
  --ha-ripple-hover-opacity: 0.1;
  --ha-ripple-pressed-opacity: 0.16;
}`,
  },
];

// Die Gruppen in der Reihenfolge, in der sie angezeigt werden.
export const VORLAGEN_GRUPPEN = [
  { id: "glas", de: "Liquid Glass", en: "Liquid Glass" },
];

export const VORLAGEN_ANZAHL = VORLAGEN.length;

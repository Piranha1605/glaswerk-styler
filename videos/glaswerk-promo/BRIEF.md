---
workflow: general-video
flow: companion
storyboard: yes
message: "Der Name Glaswerk wird Programm - Theme, App, Karten und Widgets werden zu Glaswerk"
destination: youtube
aspect: 1920x1080
language: de
length: 30s
angle: product-promo
---

## Intent

Werbevideo fuer **Glaswerk**, die Theme des HATS-Projekts (Home Assistant Theme
Studio). Es soll zeigen, dass Glaswerk nicht eine Einstellung unter vielen ist,
sondern eine durchgehende Handschrift: dieselbe Glasfläche auf dem Dashboard,
in den Karten, in den Widgets und bis in die Einstellungsseiten hinein.

Die Bildidee kommt vom Maintainer, woertlich: *"ich wuerde eine aufnahme von
schraeg oben nehmen wo sich schoen die farben glas und schattenarten abwechseln
und langsam auf den settingsknopf zoomt. und dann geht das feuerwerk ab."*
Dazu: *"das video kann ruhig spektakulaer werden."*

Ton: ruhig und praezise im Aufbau, dann ein Bruch. Kein Marketing-Sprech, keine
Emojis - dieselbe Schreibhaltung wie im ganzen Projekt.

## Assets

Kein Fremdmaterial und keine Bildschirmaufnahme. Das Dashboard wird in der
Komposition **aus den echten Theme-Werten nachgebaut** - dieselben
`--ha-color-*`, dieselben Kartenstile, derselbe Hintergrund. Gruende:

- Eine Theme ist CSS. Sie laeuft in der Komposition genauso wie in Home
  Assistant, nur dass sie sich dort in 3D kippen, zoomen und umschalten laesst.
- Ein Bildschirmfoto haette 1179 x 846 px; das Video hat 1920 x 1080. Nachgebaut
  ist es scharf, in jeder Brennweite.
- Der Wechsel der Kartenstile ist damit eine echte Umschaltung der Variablen,
  kein Ueberblenden zweier Bilder.

Quelle der Werte: `werkzeuge/themes/glaswerk.yaml` und
`custom_components/hats/www/baukasten.js` (KARTENSTILE, HINTERGRUENDE) im
HATS-Repository.

## Customizations

- Schraege Aufsicht: das Dashboard als gekippte Ebene im Raum, nicht flach.
- Die Kartenstile wechseln sichtbar durch (Glas, macOS, Gepraegt, Kontur,
  Papier) - das ist der Baukasten, der sich selbst vorfuehrt.
- Langsame Kamerafahrt auf den Einstellungsknopf der Steuerkarte als Scharnier
  zum Schluss.
- Feuerwerk als Abschluss, in den Farben der Palette.

## Notes

- Zuerst nur YouTube, 16:9. Eine hochkante Fassung kann spaeter folgen; der
  Text liegt deshalb in Variablen.
- Deutsch. Eine englische Fassung ist vorgesehen, aber nicht Teil dieses Laufs.
- Der Name im Bild ist **Glaswerk**, nicht HATS - HATS ist das Werkzeug, das
  sie baut.

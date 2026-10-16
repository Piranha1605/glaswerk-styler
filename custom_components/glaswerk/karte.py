"""Die Steuerkarte in Home Assistants Ressourcenliste eintragen.

Warum eine Ressource und kein zusaetzliches Modul der Oberflaeche
(frontend.add_extra_js_url): Ein solches Modul steht als Zeile IN der Seite,
die Home Assistant ausliefert. Und die Seite gibt sein Service Worker beim
ersten Laden aus dem Zwischenspeicher zurueck - "stale while revalidate", aus
sw-modern.js von 2026.10.1 gelesen:

    registerRoute(/\\/.*/, new StaleWhileRevalidate({cacheName: "file-cache", ...}))

Wer die Seite nach dem Einrichten neu lud, bekam also noch die alte, ohne die
Zeile, und die Karte zeigte "Custom element doesn't exist". Erst das ZWEITE
Neuladen half. Am 13.10.2026 gemeldet - und im eingebauten Browser der
Claude-App nicht zu sehen gewesen, weil dort der Service Worker gar nicht
laeuft.

Die Ressourcenliste holt die Oberflaeche dagegen ueber den Websocket
(lovelace/resources). Die kann nicht veraltet sein. Es ist derselbe Weg, auf
dem jede Karte aus HACS ankommt.

Diese Datei importiert Home Assistant absichtlich NICHT. Von der Liste braucht
sie vier Methoden, und so laesst sich der Abgleich ohne laufende Instanz
pruefen (tests/glaswerk-kartenanmeldung.test.js).
"""

from __future__ import annotations

from typing import Any


def ohne_abfrage(url: str) -> str:
    """Die Adresse ohne ?v=... - daran erkennt die Karte ihren Eintrag wieder."""
    return url.split("?", 1)[0]


def _eigene(ressourcen: Any, url: str, praefix: str) -> list[dict]:
    """Die Eintraege, die auf unsere Karte zeigen - egal unter welcher Summe.

    Verglichen wird nicht die ganze Adresse, sondern zweierlei: Der Pfad liegt
    unter unserem Praefix, und die letzte Stelle ist unsere Datei. Das ist
    noetig, seit die Pruefsumme im Pfad steht (/glaswerk_static/<summe>/...): Ein
    Vergleich auf Gleichheit haette bei jeder Aenderung an irgendeiner Datei
    im www-Ordner einen ZWEITEN Eintrag angelegt und den alten stehen lassen -
    und weil der unversionierte Pfad weiter ausgeliefert wird, laedt Home
    Assistant die Karte dann zweimal.
    """
    datei = ohne_abfrage(url).rsplit("/", 1)[-1]
    unter = praefix.rstrip("/") + "/"

    def passt(roh: str) -> bool:
        b = ohne_abfrage(roh)
        return b.startswith(unter) and b.rsplit("/", 1)[-1] == datei

    return [r for r in ressourcen.async_items() if passt(r.get("url", ""))]


async def ressource_abgleichen(ressourcen: Any, url: str, praefix: str) -> str:
    """Dafuer sorgen, dass GENAU EIN Eintrag auf die Karte zeigt, und zwar dieser.

    Gibt zurueck, was geschah: "angelegt", "erneuert" oder "unveraendert".

    Geschrieben wird nur, wenn sich etwas aendert. Home Assistant meldet jede
    Aenderung an der Liste an alle offenen Oberflaechen; ein Eintrag, der bei
    jedem Start neu geschrieben wird, waere bei jedem Start eine Meldung.
    """
    # Laedt die Liste, falls das noch nicht geschehen ist. async_items() allein
    # tut das nicht - es gaebe eine leere Liste zurueck, und die Karte wuerde
    # bei jedem Start ein weiteres Mal eingetragen.
    await ressourcen.async_get_info()

    eigene = _eigene(ressourcen, url, praefix)
    if not eigene:
        await ressourcen.async_create_item({"res_type": "module", "url": url})
        return "angelegt"

    erster, *doppelte = eigene
    ergebnis = "unveraendert"
    if erster.get("url") != url or erster.get("type") != "module":
        await ressourcen.async_update_item(erster["id"], {"res_type": "module", "url": url})
        ergebnis = "erneuert"
    # Zwei Eintraege auf dieselbe Datei laedt Home Assistant beide.
    for eintrag in doppelte:
        await ressourcen.async_delete_item(eintrag["id"])
    return ergebnis


async def ressource_entfernen(ressourcen: Any, url: str, praefix: str) -> int:
    """Den eigenen Eintrag wieder herausnehmen. Gibt die Anzahl zurueck."""
    await ressourcen.async_get_info()
    eigene = _eigene(ressourcen, url, praefix)
    for eintrag in eigene:
        await ressourcen.async_delete_item(eintrag["id"])
    return len(eigene)

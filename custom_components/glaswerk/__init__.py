"""Glaswerk - Home Assistant Theme Studio.

Registriert das Panel und die drei Websocket-Befehle, die Glaswerk braucht:
Themes auflisten, eine Theme-Datei lesen, eine Theme-Datei schreiben.

Dazu die Steuerkarte fuer Dashboards (glaswerk-bar.js). Glaswerk traegt sie
selbst in die Ressourcenliste ein und nimmt sie beim Entfernen der Integration
wieder heraus - warum eine Ressource, steht in karte.py.

Mehr ist absichtlich nicht drin. Vorlagen, Marker und Shadow-DOM-Pfade bleiben
bei HATG - Glaswerk schreibt gewoehnliche Theme-Felder, und die erben durch jede
Shadow-Grenze. Siehe CLAUDE.md.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import logging
import re
from pathlib import Path

import voluptuous as vol
import yaml as yaml_lib

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    BILDER_LOCAL_PATH,
    BILDER_LOCAL_PATH_ALT,
    BILDER_SUBDIR,
    BILDER_SUBDIR_ALT,
    CARD_FILE,
    DOMAIN,
    FRONTEND_MODULE,
    PANEL_FILE,
    PANEL_ICON,
    PANEL_TAG,
    PANEL_TITLE,
    PANEL_URL,
    SICHERUNGEN_SUBDIR,
    STATIC_PATH,
    THEMES_SUBDIR,
    VERSION,
    WWW_SUBDIR,
)
from .bilder import umziehen
from .datei import sicherungen_von, theme_schreiben
from .karte import ressource_abgleichen, ressource_entfernen

_LOGGER = logging.getLogger(__name__)

_WS_REGISTERED_FLAG = f"{DOMAIN}_ws_registered"
_KARTEN_URL = f"{DOMAIN}_karten_url"
_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

# Woran eine von Glaswerk gebaute Datei zu erkennen ist. Dieselbe Zeichenfolge
# schreibt schreibeTheme() in den Kopf - stimmen beide nicht ueberein, findet
# die Oberflaeche ihre eigenen Dateien nicht mehr. Ein Test vergleicht sie.
GLASWERK_MARKE = "# Erzeugt mit Glaswerk "

# Nur Bilder, und nur mit harmlosem Namen. Beides zusammen schliesst einen
# Pfadausbruch aus: Path(...).name wirft jedes Verzeichnis weg, die
# Endungsliste jede ausfuehrbare Datei.
_BILD_ENDUNGEN = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
_BILD_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
# Drei Megabyte, nicht zwoelf.
#
# Hier stand 12 MB, und das war eine Grenze, die nie griff: Home Assistants
# Websocket nimmt 4.194.304 Bytes je Nachricht und wirft bei mehr die
# VERBINDUNG weg ("Decompressed message exceeds size limit"). Der Server sah
# ein zu grosses Bild also nie - es kam nicht bei ihm an. Im Panel stand
# dann "Nicht hochgeladen: [object Object]", weil ein Verbindungsabbruch
# keine Meldung traegt. Am 16.10.2026 an einem 1920x1200-Foto gemessen.
#
# Base64 blaeht um ein Drittel auf: 4 MB Nachricht sind rund 3 MB Datei. Das
# Panel prueft seit demselben Tag VOR dem Senden gegen 2,8 MB und sagt es
# verstaendlich; diese Grenze faengt, was auf anderem Weg hereinkaeme.
_BILD_MAX_BYTES = 3 * 1024 * 1024
KOPF_BYTES = 512


def _bilder_ordner(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(WWW_SUBDIR, BILDER_SUBDIR))


def _bild_url(name: str) -> str:
    return f"{BILDER_LOCAL_PATH}/{name}"


def _bild_name_saeubern(roh: str) -> str | None:
    """Macht aus einem hochgeladenen Namen einen, der im Ordner stehen darf."""
    if not roh:
        return None
    basis = Path(roh).name                      # wirft jedes Verzeichnis weg
    endung = Path(basis).suffix.lower()
    if endung not in _BILD_ENDUNGEN:
        return None
    stamm = basis[: -len(endung)] if endung else basis
    stamm = _BILD_NAME_RE.sub("_", stamm).strip("._") or "bild"
    return f"{stamm}{endung}"


def _bild_pruefsumme(pfad: Path) -> str:
    h = hashlib.sha256()
    with pfad.open("rb") as f:
        for block in iter(lambda: f.read(131072), b""):
            h.update(block)
    return h.hexdigest()


def _bild_mit_inhalt(ordner: Path, summe: str) -> Path | None:
    """Liegt dasselbe Bild schon da? Dann nicht ein zweites Mal ablegen."""
    if not ordner.exists():
        return None
    for eintrag in sorted(ordner.iterdir()):
        if not eintrag.is_file() or eintrag.suffix.lower() not in _BILD_ENDUNGEN:
            continue
        try:
            if _bild_pruefsumme(eintrag) == summe:
                return eintrag
        except OSError:
            continue
    return None


def _freier_bildpfad(ordner: Path, name: str) -> Path:
    """Bei Namensgleichheit -2, -3 ... anhaengen, statt zu ueberschreiben."""
    ziel = ordner / name
    if not ziel.exists():
        return ziel
    stamm, endung = Path(name).stem, Path(name).suffix
    n = 2
    while True:
        ziel = ordner / f"{stamm}-{n}{endung}"
        if not ziel.exists():
            return ziel
        n += 1


def _www_pruefsumme(www: Path) -> str:
    """Eine kurze Summe ueber den GANZEN www-Ordner.

    Ueber den Ordner, nicht ueber eine Datei: Die Summe steht im Pfad, unter
    dem auch die Module liegen, und sie muss sich deshalb aendern, sobald
    IRGENDEINE von ihnen sich aendert. Eine Summe nur ueber glaswerk-panel.js
    liesse genau den Fall durch, der den Fehler ausgemacht hat - geaenderte
    vorlagen.js, unveraenderter Einstieg.

    Der Name geht mit in die Summe, nicht nur der Inhalt: Sonst waere eine
    umbenannte Datei dieselbe.

    Faellt das Lesen aus, kommt "" zurueck - dann bleibt es beim
    unversionierten Pfad. Ein Panel ohne Cache-Buster ist besser als keines.
    """
    h = hashlib.md5(usedforsecurity=False)
    try:
        for p in sorted(www.rglob("*")):
            if not p.is_file():
                continue
            h.update(str(p.relative_to(www)).encode("utf-8"))
            h.update(b"\0")
            h.update(p.read_bytes())
            h.update(b"\0")
    except OSError:
        return ""
    return h.hexdigest()[:8]


def _ist_sicherer_name(name: str) -> bool:
    """Ein Theme-Name darf keinen Pfad enthalten."""
    return bool(_SAFE_NAME_RE.match(name))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list_themes"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list_themes(hass: HomeAssistant, connection, msg) -> None:
    """Die Dateien in config/themes auflisten, mit Herkunft.

    Ob eine Datei von Glaswerk stammt, steht in ihrer ersten Zeile - schreibeTheme
    setzt dort "# Erzeugt mit Glaswerk <version> am <datum>". Geprueft wird nur der
    Dateianfang: Eine Theme kann einige hundert Zeilen haben, und fuer die
    Antwort brauchen wir nur den Kopf.

    Fremde Dateien werden MITGELIEFERT, nicht weggelassen - die Oberflaeche
    zeigt sie ausgegraut mit Grund. Wer seine Datei in der Liste nicht findet,
    sucht sonst den Fehler bei sich.
    """
    themes_dir = Path(hass.config.path(THEMES_SUBDIR))

    def _lies() -> list[dict]:
        if not themes_dir.is_dir():
            return []
        aus = []
        for p in sorted(themes_dir.glob("*.yaml")):
            if not p.is_file():
                continue
            try:
                kopf = p.open("r", encoding="utf-8").read(KOPF_BYTES)
            except OSError:
                continue
            marke = next(
                (z for z in kopf.splitlines() if z.startswith(GLASWERK_MARKE)), None
            )
            aus.append({
                "name": p.name,
                "glaswerk": marke is not None,
                "kopf": marke[2:] if marke else None,
                "bytes": p.stat().st_size,
            })
        return aus

    dateien = await hass.async_add_executor_job(_lies)
    connection.send_result(msg["id"], {
        "dateien": dateien,
        # Die alte Form bleibt, damit nichts bricht, was sie schon liest.
        "files": [d["name"] for d in dateien],
    })


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/load_theme_file", vol.Required("filename"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_load_theme_file(hass: HomeAssistant, connection, msg) -> None:
    """Eine Theme-Datei im Klartext zurueckgeben."""
    name = msg["filename"]
    if not name.endswith(".yaml") or not _ist_sicherer_name(name[:-5]):
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Dateiname.")
        return

    pfad = Path(hass.config.path(THEMES_SUBDIR)) / name
    # Die Grundlage liefert die Integration mit - sie gehoert nicht dem Nutzer.
    #
    # Bis zum 17.10.2026 lag ha_blanko.yaml NUR im Entwicklungsbaum unter
    # docs/beispiele/ und kam allein ueber eine Sonderzeile in sync-dateien.txt
    # an ihren Platz. Auf der Testmaschine war sie dadurch da, bei jeder
    # HACS-Installation nicht. Was dann passiert, war in Enricos Haus zu
    # besichtigen: Das Panel konnte die Grundlage nicht laden, begann mit einem
    # leeren Modell und schrieb beim Speichern eine Theme von 116 Bytes - nur
    # der Name, kein Inhalt. Also genau die leere Theme, an der Home Assistant
    # beim Laden ALLER Themes scheitert.
    #
    # Eine Datei in config/themes geht weiterhin vor: Wer seine eigene
    # ha_blanko pflegt, behaelt sie.
    mitgeliefert = Path(__file__).parent / "vorlagen" / name

    def _lies() -> str | None:
        for p in (pfad, mitgeliefert):
            try:
                return p.read_text(encoding="utf-8")
            except OSError:
                continue
        return None

    inhalt = await hass.async_add_executor_job(_lies)
    if inhalt is None:
        connection.send_error(msg["id"], "read_failed", f"{name} nicht lesbar.")
        return
    connection.send_result(msg["id"], {"content": inhalt})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_theme",
        vol.Required("name"): str,
        vol.Required("yaml"): str,
        vol.Optional("overwrite", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_theme(hass: HomeAssistant, connection, msg) -> None:
    """Eine Theme-Datei schreiben - nach Pruefung mit PyYAML.

    Geprueft wird mit demselben Parser, den Home Assistant beim Start benutzt.
    Ein eigener Parser liest manches klaglos zurueck, was HA in den
    Wiederherstellungsmodus schickt - siehe CLAUDE.md, Abschnitt Backslash.
    """
    name = msg["name"]
    if not _ist_sicherer_name(name):
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Theme-Name.")
        return

    try:
        geparst = yaml_lib.safe_load(msg["yaml"])
    except yaml_lib.YAMLError as err:
        connection.send_error(msg["id"], "invalid_yaml", f"YAML ist ungueltig: {err}")
        return

    # Eine leere Theme nicht schreiben - sie legt ALLE Themes lahm.
    #
    # "NewHome:" ohne Inhalt ist gueltiges YAML und wird zu None. Home
    # Assistant erwartet unter frontend->themes an jeder Stelle eine
    # Zuordnung und verweigert dann den gesamten Block - nicht nur diese eine
    # Theme. Die Meldung nennt zwar den Namen, aber nicht die Datei, und wer
    # sie nicht kennt, sucht lange.
    #
    # Am 17.10.2026 in Enricos Haus passiert: Die Grundlage fehlte, das Panel
    # begann mit einem leeren Modell, und das Speichern schrieb NewHome.yaml
    # mit 116 Bytes. Beim naechsten Neustart stand die Oberflaeche ohne jede
    # Theme da. Die Ursache ist behoben (die Grundlage faehrt jetzt mit), aber
    # der Weg dorthin bleibt offen, solange niemand ihn versperrt - und
    # versperrt gehoert er HIER, nicht im Panel: Der Server ist das letzte
    # Tor, durch das jeder Client muss.
    if not isinstance(geparst, dict) or not geparst:
        connection.send_error(
            msg["id"], "empty_theme", "Die Theme ist leer - das legt in Home Assistant alle Themes lahm."
        )
        return
    leere = [k for k, v in geparst.items() if not isinstance(v, dict) or not v]
    if leere:
        connection.send_error(
            msg["id"],
            "empty_theme",
            f"Ohne Inhalt wuerde das in Home Assistant alle Themes lahmlegen: {', '.join(leere)}",
        )
        return

    themes_dir = Path(hass.config.path(THEMES_SUBDIR))
    sicherungen = Path(hass.config.path(SICHERUNGEN_SUBDIR))

    # In einem Schritt und mit Sicherung der Fassung davor - siehe datei.py.
    def _schreibe() -> str | None:
        try:
            return theme_schreiben(themes_dir, sicherungen, name, msg["yaml"], msg["overwrite"])
        except OSError as err:
            return f"write_failed: {err}"

    fehler = await hass.async_add_executor_job(_schreibe)
    if fehler == "exists":
        connection.send_error(msg["id"], "exists", f"{name}.yaml gibt es schon.")
        return
    if fehler:
        connection.send_error(msg["id"], "write_failed", fehler)
        return

    connection.send_result(msg["id"], {"saved": True, "path": f"/config/themes/{name}.yaml"})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list_images"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list_images(hass: HomeAssistant, connection, msg) -> None:
    """Die Bilder in config/www/glaswerk auflisten."""
    ordner = _bilder_ordner(hass)

    def _lies() -> list[dict]:
        if not ordner.is_dir():
            return []
        aus = []
        for p in sorted(ordner.iterdir()):
            if not p.is_file() or p.suffix.lower() not in _BILD_ENDUNGEN:
                continue
            aus.append({"name": p.name, "url": _bild_url(p.name), "bytes": p.stat().st_size})
        return aus

    connection.send_result(msg["id"], {"bilder": await hass.async_add_executor_job(_lies)})


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/upload_image",
    vol.Required("filename"): str,
    vol.Required("data"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_upload_image(hass: HomeAssistant, connection, msg) -> None:
    """Ein Bild nach config/www/glaswerk legen."""
    name = _bild_name_saeubern(msg["filename"])
    if name is None:
        connection.send_error(msg["id"], "invalid_name",
                              "Nur Bilder (jpg, png, webp, gif, svg, avif).")
        return
    try:
        roh = base64.b64decode(msg["data"], validate=True)
    except (binascii.Error, ValueError) as err:
        connection.send_error(msg["id"], "invalid_data", f"Bild nicht lesbar: {err}")
        return
    if not roh:
        connection.send_error(msg["id"], "invalid_data", "Die Datei ist leer.")
        return
    if len(roh) > _BILD_MAX_BYTES:
        connection.send_error(msg["id"], "too_large",
                              f"Groesser als {_BILD_MAX_BYTES // 1024 // 1024} MB.")
        return

    ordner = _bilder_ordner(hass)

    def _schreibe() -> tuple[str, bool]:
        ordner.mkdir(parents=True, exist_ok=True)
        # Inhaltsgleiche Bilder nicht doppelt ablegen. Wer dasselbe Bild zweimal
        # waehlt, soll nicht zwei Dateien bekommen - und die Theme soll auf
        # dieselbe Adresse zeigen.
        summe = hashlib.sha256(roh).hexdigest()
        schon_da = _bild_mit_inhalt(ordner, summe)
        if schon_da is not None:
            return schon_da.name, True
        ziel = _freier_bildpfad(ordner, name)
        ziel.write_bytes(roh)
        return ziel.name, False

    try:
        endname, war_da = await hass.async_add_executor_job(_schreibe)
    except OSError as err:
        connection.send_error(msg["id"], "write_failed", f"Nicht gespeichert: {err}")
        return

    connection.send_result(msg["id"], {
        "name": endname, "url": _bild_url(endname), "doppelt": war_da,
    })


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/delete_image",
    vol.Required("name"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete_image(hass: HomeAssistant, connection, msg) -> None:
    """Ein Bild loeschen - nur aus diesem einen Ordner."""
    name = _bild_name_saeubern(msg["name"])
    if name is None or name != Path(msg["name"]).name:
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Dateiname.")
        return
    pfad = _bilder_ordner(hass) / name

    def _loesche() -> str | None:
        if not pfad.is_file():
            return "not_found"
        try:
            pfad.unlink()
        except OSError as err:
            return f"delete_failed: {err}"
        return None

    fehler = await hass.async_add_executor_job(_loesche)
    if fehler == "not_found":
        connection.send_error(msg["id"], "not_found", f"{name} gibt es nicht.")
        return
    if fehler:
        connection.send_error(msg["id"], "delete_failed", fehler)
        return
    connection.send_result(msg["id"], {"deleted": True, "name": name})


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/list_backups", vol.Required("name"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list_backups(hass: HomeAssistant, connection, msg) -> None:
    """Die Sicherungen einer Theme, die neueste zuerst."""
    name = msg["name"]
    if not _ist_sicherer_name(name):
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Theme-Name.")
        return
    sicherungen = Path(hass.config.path(SICHERUNGEN_SUBDIR))

    def _liste() -> list[dict]:
        return [{"backup": p.stem, "size": p.stat().st_size} for p in sicherungen_von(sicherungen, name)]

    connection.send_result(msg["id"], {"backups": await hass.async_add_executor_job(_liste)})


@websocket_api.websocket_command(
    # "backup", nicht "id": id ist im Websocket-Protokoll die Nummer der
    # Nachricht selbst. So hiess das Feld zuerst - und die Antwort kam nie an
    # (am 14.10.2026 an der Testmaschine, Zeitueberschreitung statt Fehler).
    {vol.Required("type"): f"{DOMAIN}/load_backup", vol.Required("name"): str, vol.Required("backup"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_load_backup(hass: HomeAssistant, connection, msg) -> None:
    """Eine Sicherung im Klartext. Zurueckgeschrieben wird ueber save_theme -
    das sichert dabei die Fassung, die gerade gilt, und nichts geht verloren."""
    name, kennung = msg["name"], msg["backup"]
    # Die Kennung ist der Zeitstempel aus list_backups, nichts sonst: kein
    # Pfad, kein Punkt, keine Endung.
    if not _ist_sicherer_name(name) or not re.fullmatch(r"\d{8}-\d{6}(-\d+)?", kennung):
        connection.send_error(msg["id"], "invalid_name", "Ungueltige Sicherung.")
        return
    pfad = Path(hass.config.path(SICHERUNGEN_SUBDIR)) / name / f"{kennung}.yaml"

    def _lies() -> str | None:
        try:
            return pfad.read_text(encoding="utf-8")
        except OSError:
            return None

    inhalt = await hass.async_add_executor_job(_lies)
    if inhalt is None:
        connection.send_error(msg["id"], "read_failed", "Sicherung nicht lesbar.")
        return
    connection.send_result(msg["id"], {"content": inhalt})


def _registriere_websocket(hass: HomeAssistant) -> None:
    """Die Befehle anmelden - bei jedem Setup neu.

    Frueher stand hier eine Sperre, die beim zweiten Mal heraussprang. Gedacht
    war sie gegen doppelte Anmeldungen bei mehreren Eintraegen; sie hatte aber
    eine Folge, die beim Entwickeln teuer ist: Ein Reload der Integration liess
    die ALTE Funktion registriert. Wer einen Websocket-Befehl aendert, bekam
    nach dem Reload weiter die alte Antwort - ohne Fehlermeldung, weil nichts
    kaputt war. Am 12.10.2026 eine halbe Stunde damit verloren.

    Mehrfaches Anmelden ist unschaedlich: async_register_command schreibt in
    ein Dict und ueberschreibt den Eintrag einfach.
    """
    hass.data[_WS_REGISTERED_FLAG] = True
    websocket_api.async_register_command(hass, ws_list_themes)
    websocket_api.async_register_command(hass, ws_load_theme_file)
    websocket_api.async_register_command(hass, ws_save_theme)
    websocket_api.async_register_command(hass, ws_list_backups)
    websocket_api.async_register_command(hass, ws_load_backup)
    websocket_api.async_register_command(hass, ws_list_images)
    websocket_api.async_register_command(hass, ws_upload_image)
    websocket_api.async_register_command(hass, ws_delete_image)


def _bilder_umziehen(hass: HomeAssistant) -> dict:
    """Einmaliger Umzug nach HATGs Ordner - die Arbeit steht in bilder.py.

    Hier steht nur, WOMIT: die vier Pfade und der Schreiber, der jede
    geaenderte Theme vorher sichert. bilder.py selbst kennt Home Assistant
    nicht und laesst sich deshalb gegen ein echtes Verzeichnis pruefen.
    """
    themes = Path(hass.config.path(THEMES_SUBDIR))
    sicherungen = Path(hass.config.path(SICHERUNGEN_SUBDIR))

    def schreibe(name: str, text: str) -> None:
        theme_schreiben(themes, sicherungen, name, text, True)

    return umziehen(
        Path(hass.config.path(WWW_SUBDIR, BILDER_SUBDIR_ALT)),
        Path(hass.config.path(WWW_SUBDIR, BILDER_SUBDIR)),
        themes,
        BILDER_LOCAL_PATH_ALT,
        BILDER_LOCAL_PATH,
        GLASWERK_MARKE,
        schreibe,
    )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel registrieren und Websocket anmelden."""
    www_path = Path(__file__).parent / "www"

    # Home Assistant registriert /local NUR, wenn config/www beim Start schon
    # da war. Legen wir den Ordner gerade erst an, bleibt /local bis zum
    # naechsten Neustart tot - und dann sucht man den Fehler in der Theme,
    # obwohl die Adresse stimmt. Deshalb steht es im Log.
    def _bilderordner_anlegen() -> bool:
        eltern = Path(hass.config.path(WWW_SUBDIR))
        www_fehlte = not eltern.is_dir()
        _bilder_ordner(hass).mkdir(parents=True, exist_ok=True)
        return www_fehlte

    if await hass.async_add_executor_job(_bilderordner_anlegen):
        _LOGGER.warning(
            "config/www wurde gerade erst angelegt. Home Assistant liefert %s "
            "erst nach einem Neustart aus - bis dahin bleiben Hintergrundbilder leer.",
            BILDER_LOCAL_PATH,
        )

    # Der Umzug in HATGs Ordner, einmalig. Er laeuft bei jedem Start, tut aber
    # nach dem ersten Mal nichts mehr: Ohne config/www/glaswerk gibt es nichts zu
    # tun, und der Ordner ist danach weg.
    umzug = await hass.async_add_executor_job(_bilder_umziehen, hass)
    if umzug["bilder"] or umzug["doppelt"] or umzug["themes"]:
        _LOGGER.info(
            "Bilder nach %s umgezogen: %s verschoben, %s waren schon da%s%s",
            BILDER_LOCAL_PATH,
            umzug["bilder"],
            umzug["doppelt"],
            f", umbenannt: {', '.join(umzug['umbenannt'])}" if umzug["umbenannt"] else "",
            f", Adressen nachgezogen in: {', '.join(umzug['themes'])}" if umzug["themes"] else "",
        )

    # Die Pruefsumme steht im PFAD, nicht in der Abfrage - und sie deckt den
    # ganzen Ordner ab, nicht nur die Einstiegsdatei.
    #
    # Vorher hing sie als "?v=<version>.<summe>" an glaswerk-panel.js und an der
    # Karte. Das Panel importiert seine Module aber statisch und ohne Abfrage
    # ("./vorlagen.js"), und die kamen damit weiter aus dem Cache: neuer
    # Einstieg, alte Teile. Am 13.10.2026 gemeldet als "ich habe immer noch den
    # alten Stand", nachdem an einem Tag 18 Modul-Commits gelaufen waren.
    #
    # Liegt die Summe im Pfad, loest sich das von selbst: Ein relativer Import
    # wird gegen die Adresse SEINES Moduls aufgeloest, also erbt jedes Modul
    # die Summe, ohne dass eine Importzeile sich aendert.
    summe = await hass.async_add_executor_job(_www_pruefsumme, www_path)

    # Beide Pfade werden angemeldet:
    #
    #   /glaswerk_static/<summe>/...  der Produktpfad, einen Monat cachebar -
    #                             richtig, weil eine Aenderung die Adresse
    #                             aendert
    #   /glaswerk_static/...          unversioniert, ohne Cache-Kopfzeile. Die
    #                             Werkzeuge lesen darueber byteweise gegen
    #                             (einspielen-test.sh), und er ist der
    #                             Rueckfall, wenn sich die Summe nicht
    #                             rechnen laesst.
    #
    # Die Reihenfolge ist egal: aiohttp laeuft die Pfadteile von hinten nach
    # vorn ab und nimmt den laengsten passenden Praefix zuerst. Der
    # versionierte Pfad gewinnt also auch, wenn er spaeter dazukommt.
    pfade = [StaticPathConfig(STATIC_PATH, str(www_path), False)]
    basis = STATIC_PATH
    if summe:
        basis = f"{STATIC_PATH}/{summe}"
        pfade.insert(0, StaticPathConfig(basis, str(www_path), True))
    await hass.http.async_register_static_paths(pfade)

    # Die Version steht trotzdem in der Abfrage - sie beweist nichts, aber in
    # der Netzwerkansicht sieht man ohne Nachschlagen, welche geladen ist.
    module_url = f"{basis}/{PANEL_FILE}?v={VERSION}" if summe else FRONTEND_MODULE
    karten_url = f"{basis}/{CARD_FILE}?v={VERSION}"

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_TAG,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL,
        module_url=module_url,
        require_admin=True,
    )

    await _karte_anmelden(hass, karten_url)

    _registriere_websocket(hass)
    return True


async def _karte_anmelden(hass: HomeAssistant, karten_url: str) -> None:
    """Die Steuerkarte so anmelden, dass ein einziges Neuladen genuegt.

    Der Weg ist die Ressourcenliste - siehe karte.py. Bis zum 13.10.2026 stand
    hier frontend.add_extra_js_url, mit der Begruendung, eine Ressource bliebe
    in der Konfiguration des Nutzers liegen. Das Liegenbleiben erledigt jetzt
    async_remove_entry; der Preis des anderen Wegs war dagegen eine Karte, die
    nach dem ersten Neuladen noch fehlt.

    Das zusaetzliche Modul bleibt als Ausweg: wenn die Ressourcen in YAML
    stehen (dann ist die Liste nicht beschreibbar) und falls Home Assistant
    seine Liste einmal anders baut. Glaswerk soll dann trotzdem starten - das Panel
    haengt nicht an der Karte.
    """
    lovelace = hass.data.get(LOVELACE_DATA)
    if lovelace is not None and lovelace.resource_mode == MODE_STORAGE:
        try:
            was = await ressource_abgleichen(lovelace.resources, karten_url, STATIC_PATH)
        except Exception:  # noqa: BLE001 - die Liste gehoert Home Assistant
            _LOGGER.exception(
                "Die Steuerkarte liess sich nicht in die Ressourcen eintragen. "
                "Sie wird stattdessen als zusaetzliches Modul geladen"
            )
        else:
            if was != "unveraendert":
                _LOGGER.info("Steuerkarte in den Ressourcen %s: %s", was, karten_url)
            return
    else:
        _LOGGER.info(
            "Die Ressourcen stehen in YAML. Die Steuerkarte wird als zusaetzliches "
            "Modul geladen; verlaesslicher ist ein eigener Eintrag: "
            "url: %s, type: module",
            karten_url,
        )

    # Die Adresse wird gemerkt, weil async_unload_entry genau DIESE wieder
    # abmelden muss: Nach einem Reload mit geaenderter Datei ist die Pruefsumme
    # eine andere, und eine neu gerechnete Adresse traefe die alte nicht.
    frontend.add_extra_js_url(hass, karten_url)
    hass.data[_KARTEN_URL] = karten_url


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel wieder abmelden.

    Der Eintrag in den Ressourcen BLEIBT: Ein Reload ist kein Abschied, und
    eine Karte, die waehrend des Reloads aus der Liste faellt, zeigte auf jedem
    offenen Dashboard kurz einen Fehler. Er geht erst mit async_remove_entry.
    """
    frontend.async_remove_panel(hass, PANEL_URL)
    karten_url = hass.data.pop(_KARTEN_URL, None)
    if karten_url:
        frontend.remove_extra_js_url(hass, karten_url)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Beim Entfernen der Integration den Eintrag in den Ressourcen mitnehmen.

    Dieselbe Regel wie bei den Theme-Feldern: nichts hinterlassen, was spaeter
    ins Leere zeigt. Wer nur den Ordner loescht, statt die Integration zu
    entfernen, behaelt den Eintrag - er laedt dann nichts mehr und schadet
    nicht, steht aber noch in der Liste.
    """
    lovelace = hass.data.get(LOVELACE_DATA)
    if lovelace is None or lovelace.resource_mode != MODE_STORAGE:
        return
    try:
        await ressource_entfernen(
            lovelace.resources, f"{STATIC_PATH}/{CARD_FILE}", STATIC_PATH
        )
    except Exception:  # noqa: BLE001 - die Liste gehoert Home Assistant
        _LOGGER.exception("Der Eintrag der Steuerkarte liess sich nicht entfernen")

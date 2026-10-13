# HATS — Home Assistant Theme Studio

A panel for the Home Assistant sidebar for building a complete theme visually —
built on the colour layer of HA 2026 rather than on the classic individual
variables.

**Status: early build.** This build only reads. It shows the framework
everything else will sit on.

## What this is about

Since 2026, Home Assistant computes its interface from a colour layer of its
own: six roles (`primary`, `neutral`, `success`, `warning`, `danger`,
`disabled`), three loudness levels (`quiet`, `normal`, `loud`) and three states
(`resting`, `hover`, `active`). **15 decisions** produce 51 fill colours and 19
text colours.

HATS builds on exactly that. The guiding rule: **only change what you can see.**

And because Bubble Card and Mushroom can read their variables from the same
layer, one assignment covers light and dark at once — no UI eXtension, no CSS
rules, no shadow DOM paths. CSS variables inherit through every shadow boundary;
measured, a value set on `html` arrives twelve levels deep.

What comes out at the end is an ordinary theme file.

## Relationship to HATG

[HATG](https://github.com/Piranha1605/ha-theme-generator) stays in service and
continues to be maintained. HATS does not replace it — it is a second, simpler
route, deliberately in its own repository with its own integration domain so
both can be installed side by side.

One rule when running both: **a theme belongs to one tool.** A HATS theme
survives HATG's import intact — every reference stays verbatim — but HATG adds
its own defaults. Don't edit the same file in both.

The measured knowledge about Home Assistant, Bubble Card and Mushroom lives in
HATG's `CLAUDE.md` and in `docs/uebergabe-neues-projekt.md`. HATS builds on it
instead of working it out again.

## The control card

HATS ships a card for dashboards. It switches the mode (auto, light, dark) and
fullscreen.

![The control card in light mode](docs/bilder/steuerkarte-hell.jpg)
![The control card in dark mode](docs/bilder/steuerkarte-dunkel.jpg)

The card three times at the top, two Home Assistant tiles below for comparison.

```yaml
type: custom:hats-control-card
```

It appears in the card picker as soon as the integration is set up and the
page has been reloaded once — on the **"By card"** tab, search for "HATS". The
dialog opens on "By entity", and the card is not listed there: it has no
entity.

There is no resource to register. HATS adds the card to the list under
Settings → Dashboards → Resources itself and removes it again when the
integration is removed. Only if you keep your resources in YAML do you add it
by hand; the log shows the line.

| Field | Default | |
|---|---|---|
| `controls` | `[mode, fullscreen]` | which controls, in which order |
| `kiosk_only` | `false` | `true`: fullscreen in Home Assistant only, the browser window stays |

### As a badge

The same control exists in a small form, for the badge row above the cards:

![The badge in light mode](docs/bilder/steuerbadge-hell.jpg)
![The badge in dark mode](docs/bilder/steuerbadge-dunkel.jpg)

```yaml
type: custom:hats-control-badge
```

The fields are the same. In the badge picker it is listed on the **"By
badge"** tab, section Community badges, as "HATS control":

![The badge picker showing the HATS control](docs/bilder/steuerbadge-waehler.jpg)

Everything the card uses is provided by Home Assistant: the elements, the
icons, the colour variables and the two switches behind it. It therefore
follows any theme and needs no further card from HACS.

Worth knowing:

- **The mode belongs to the user, not to the device.** Since 2026.10 Home
  Assistant stores the choice with the user on the server. Switching on the
  wall tablet also switches every other device the same user is logged in on.
- **A theme with only one mode cannot be switched.** The card then locks the
  choice and says why when pressed.
- **Fullscreen means two things.** Home Assistant hides the sidebar and the
  header buttons (its kiosk mode), and the browser goes fullscreen where it
  offers that. The header row with the view tabs stays — Home Assistant has no
  switch for it.
- **Fullscreen is not stored.** Reloading the page resets everything. That is
  also the way out after moving to a view without the card while in
  fullscreen: there is no menu button any more.

## Installation

Not via HACS yet. To try it, copy the `custom_components/hats` folder into
`config/custom_components/`, restart Home Assistant and add the integration
under Settings → Devices & Services.

Requires Home Assistant 2026.10.0 or newer.

## Licence

MIT

---

German version: [README.md](README.md)

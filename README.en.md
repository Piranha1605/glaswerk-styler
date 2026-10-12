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

## Installation

Not via HACS yet. To try it, copy the `custom_components/hats` folder into
`config/custom_components/`, restart Home Assistant and add the integration
under Settings → Devices & Services.

Requires Home Assistant 2026.10.0 or newer.

## Licence

MIT

---

German version: [README.md](README.md)

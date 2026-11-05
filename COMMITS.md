# Commit format

Short and factual. No names, no small talk, no signatures. English.

```
<Type>: <what changed, max. 72 characters>
```

Types: `Fix`, `Add`, `Change`, `Remove`, `Docs`, `Test`, `Build`.

A `Fix` adds two lines after a blank line:

```
Fix: Theme file is written empty when no variables are set

Problem: Saving a theme without variables produced a null mapping and Home Assistant rejected all themes.
Solution: theme_schreiben now refuses to write an empty mapping.
```

Everything else needs the first line only. One change per commit.

Enable the check once per clone, optionally with a list of blocked names
(whole words, kept out of the repository):

```
git config core.hooksPath .githooks
git config commit-msg.blocked 'name1|name2'
```

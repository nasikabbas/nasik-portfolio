# Changelog

Written for a reader of the site, not for whoever made the change. Newest first.

**What the version means here.** This site ships no API, so its contract is **the claims it publishes**.
A figure on a live page can be quoted, cited, or acted on. Changing or withdrawing one after publication
changes something a reader may already rely on — so that is a MAJOR bump, not a tidy-up.

- **MAJOR** — a published claim changes meaning or is withdrawn.
- **MINOR** — new content or a new surface; nothing existing invalidated.
- **PATCH** — nothing a reader relies on changes.

**A corrected figure always states its prior value.** A correction that does not is a quiet replacement,
and on a site whose argument is honest measurement that is the one thing that cannot happen.

## [Unreleased]

### Changed
- Claude Code's own commit attribution is switched off in `.claude/settings.json`, so commits stay
  anonymous by setting, not only by convention.

*No published claim changed.*

## [0.1.1] — 2026-09-19

### Added
- Project conventions recorded in `CLAUDE.md`: where each kind of thing lives, the provenance rules,
  the verification standard, and the public/private boundary — plus the lessons carried in from prior
  production work, generalised.
- `deploy` and `release` skills, committed rather than kept local. They encode the gates: never ship
  past a failing provenance check, and verify the served page rather than the pipeline that built it.
- This changelog.

*No published claim changed.*

## [0.1.0] — 2026-09-19

### Added
- The site, live at [nasikabbas.com](https://nasikabbas.com) — Astro static, no client JavaScript, no
  web fonts, no analytics.
- A provenance gate over every published figure. Numbers carry the source they came from, and a figure
  that has not been traced to one **cannot be written into the data file at all** — the build fails at
  parse time rather than shipping a plausible-looking invention.
- Limits that travel with the value. Where a true number would mislead on its own, the limit is stored
  beside it and rendered wherever it appears. The published win-rate figure carries its calibration
  failure for exactly this reason: it is a measurement, not a result, and it says so.
- Six opening evidence points covering production releases, the agent tool surface, the evaluation
  corpus, the capability-gap finding, the win rate, and authorship share.

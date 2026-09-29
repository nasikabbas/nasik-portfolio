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

## [4.1.2] — 2026-09-29

**Why PATCH:** the uptime check itself is corrected; nothing a reader sees changes.

### Fixed
- **The uptime check no longer cancels itself.** A second run used to cancel one already in
  progress; runs now queue, so every check that starts finishes. It also runs every step in strict
  shell mode, and says plainly when the registry has no record of the domain.

## [4.1.1] — 2026-09-29

**Why PATCH:** nothing a reader sees changes; the site is now watched.

### Added
- **An hourly uptime check, run from outside:** the domain is not on hold or close to expiring, it
  resolves through its own nameservers and four public resolvers, and every page still serves
  correctly. A failure emails the owner, so "the site is down" can be told apart from one visitor's
  network in seconds.

## [4.1.0] — 2026-09-29

**Why MINOR:** existing dates gain detail; nothing published changes meaning.

### Added
- **Months on every role.** Experience now reads to the month — PadelOS from Jan 2024, PadelGPT from
  Jan 2025, and so on down to the 2014 internship. A year-only date now fails the build.

### Fixed
- **Alignment on wide screens.** The prose sections — "What we're building now" and the case studies'
  narrative sections — and "About the numbers" now line up with the rest of the page; they had been
  centred in a narrower column, and the notes' divider stopped halfway across.
- Bullet points no longer leave a single word on their last line, and "co‑founder" no longer breaks
  across two lines.

## [4.0.0] — 2026-09-29

**Why MAJOR:** a published claim is withdrawn.

### Removed
- **A funding detail from the Spectre Bionics entry.** The entry now says why the company closed — it
  needed a full-time technical co-founder and never had one — and describes no investment. **The
  withdrawn detail is not restated here**, for the same reason as in 2.0.0: restating it would
  republish it.

## [3.0.0] — 2026-09-28

**Why MAJOR:** a published figure is corrected.

### Changed
- **The evaluation page's position-balance figure.** It read **"50.2% over 12,000 verdicts"**; it now
  reads **"50.2% across 12,000 slot assignments"**. The 12,000 were checks of how the judge's slots are
  assigned, run when the judge was built — before any real judging — not 12,000 judge verdicts. The
  balance itself is unchanged; the unit was wrong.

## [2.0.0] — 2026-09-28

**Why MAJOR:** published material is withdrawn. The site no longer carries PadelOS's internal evaluation
results, any absolute cost figure (percentages remain), or notes on what the product could not yet do.
**The withdrawn values are not restated here**, because restating them would republish them — the one
deliberate exception to this changelog's rule that a correction states its prior value.

### Changed — published claims
- **Withdrawn:** internal evaluation measurements, every absolute cost figure, and the list of the
  assistant's current limits.
- **Replaced:** the consulting proof point is now the six industries worked in, not an investment total.
- **Reworded:** earlier entries in this changelog no longer describe the withdrawn material.

### Changed
- A natural voice throughout, in place of a string of "I did this". The home page now leads with what
  is being built and what is being learned, and the 2014 Unilever internship is described as the
  university programme it was.
- The technical evaluation case study now covers the method — replaying real conversations safely,
  judging blind, a person in front of every published number — and the product direction it produced.

## [1.0.1] — 2026-09-27

### Changed
- The live-site check launches its gate directly rather than through a shell, and a missing folder
  now names the folder it looked for.

*No published claim changed.*

## [1.0.0] — 2026-09-27

**Why MAJOR:** one published figure is withdrawn and another changes value. Both are stated below with
what they were.

### Changed — published claims
- **Replaced:** an evaluation figure from an early classification pass, with the study's final load
  measurement, taken from what club admins actually did.
- **Commits authored on the PadelGPT codebase: 565 of 703 → 601 of 818** (counted again on 2026-09-27;
  the repository kept growing).
- **Production releases: still 33, now with its range.** Versions 1.0.0 (3 August 2026) to 1.16.0
  (17 September 2026). The earlier source note said "through 1.15.3"; the production changelog lists
  1.16.0.
- The headline is now *"I make AI work inside real businesses, and I measure whether it does"* (was
  *"Production AI engineer — making AI systems work in real operating conditions"*).
- The location names the country only — Pakistan, open to relocation (was Islamabad, Pakistan).

### Added
- **Two versions of the site.** Plain English is the default, written for a recruiter or HR partner;
  the technical version is one click away on every page, for engineers. Both are built from the same
  data, so they cannot quote different numbers.
- **The full career**, from a 2014 manufacturing internship at Unilever to PadelOS — solar engineering,
  consulting, three founder years, product management in Saudi Arabia and applied AI — including a
  trainee programme cut from four and a half months to under two, a public–private partnership model
  designed for PIDC, and about $2 million in cloud and software credits raised for an education
  startup.
- **Case study: *Answers in seconds, not hours*** — PadelGPT measured against club support staff, from
  the report PadelOS published. Every headline number links to it.
- **Case study: the evaluation harness** behind PadelGPT — replaying real support conversations
  without touching production.
- Every figure with a public source links to it, and every page ends with the limits on its numbers.

### Checked on every build
- The published pages are checked, not just the data: no private client, colleague or personal detail;
  every number that needs a limit shows it; plain pages contain no technical vocabulary and stay easy
  to read; every link resolves. After each deploy, the same checks run over the live site itself.

## [0.1.2] — 2026-09-26

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
  beside it and rendered wherever it appears.
- Six opening evidence points covering production releases, the agent tool surface, the evaluation
  corpus, two evaluation findings, and authorship share.

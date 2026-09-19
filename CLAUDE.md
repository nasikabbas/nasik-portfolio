# CLAUDE.md — nasik-portfolio

> **Two layers.** *How we work* — communication, cadence, diagnosis discipline, versioning and git
> principles, the learnings system — lives in the operator's global `~/.claude/CLAUDE.md`. **This file
> holds only what is specific to this project.** Method there; facts here. Where they overlap, the
> global file wins on method and this one wins on facts.

## What this project is

- **`nasik-portfolio`** = the portfolio, case studies and résumé system for Nasik Abbas — **Astro 7**
  static, **TypeScript strict**, **Zod**, no client JavaScript, no web fonts, no analytics.
- **Flow:** `data/profile.yaml` → Zod schema (`src/schema/`) → pages (`src/pages/`) → static `dist/` →
  GitHub Pages at **`nasikabbas.com`**.
- **One source, many surfaces.** Every published artifact is generated from `profile.yaml`. A candidate
  whose site, résumé and LinkedIn disagree looks careless; generating them from one file makes
  disagreement impossible rather than merely unlikely.
- **Private, never in this repo:** `.wh/` (the working area — career plan, finances, working history)
  and `source-material/` (confidential decks, personal essays, employer material). Both excluded via
  `.git/info/exclude`, **not** `.gitignore` — this repo is public, and a tracked ignore file publishes
  the shape of a private convention to everyone who clones it.

## The thing this project exists to get right

The portfolio's argument is that its author **measures honestly** — the centrepiece is an evaluation
study whose own judge failed calibration, reported as such. That argument is worth exactly as much as
its weakest number, and the readers being addressed are the ones who check.

So provenance is a **type**, not a habit:

| Field kind | Builder | `assumed` allowed? |
|---|---|---|
| Descriptive statement | `claim()` | Yes, with a ≥20-character `basis` |
| Any figure a reader could check | `strictClaim()` | **No branch exists** |

An unconfirmed number is *unrepresentable* — the build fails at parse time. Fabricating requires
writing `state: verified` next to something untrue: commission, not omission.

**`caveat` travels with the value.** Some true numbers mislead alone. A win rate measured by a judge
that failed calibration is not false; it is unpublishable without its limit, and a limit kept in
someone's head eventually ships without the number it belongs to. When `caveat` is set the renderer
**must** display it wherever the value appears. Make the honest presentation the only expressible one.

## Where each kind of thing lives

- `data/` — the single source of truth. Facts live here and nowhere else.
- `src/schema/` — Zod schemas and the provenance types. **`claim.ts` is the guardrail; changing it
  changes what can be published.**
- `src/config/site.ts` — the **only** place `SITE_URL` and `BASE_PATH` are written. Nothing in `src/`
  may hard-code an origin or base path; always go through `path()` or `absoluteUrl()`.
- `src/pages/` — routes. `src/layouts/`, `src/components/` — markup. `public/styles/` — the design system.
- `scripts/` — build-time gates and generators. A check that matters belongs here, wired into
  `npm run check`, not in a comment asking someone to remember.
- **Put a thing where its kind lives.** Never inline a schema into a page or a fact into markup.

## Conventions

- **Annotate to the bar, including internal plumbing.** Type every signature. Docstring every exported
  function with *why*, not *what*. This bar is higher than most projects and it applies everywhere, not
  just to the public surface.
- **Naming:** `camelCase` for TS identifiers, `kebab-case` for files and routes, `SCREAMING_SNAKE` for
  module constants.
- **Keep docs current with the change**, in the same commit series — `README.md` when structure moves,
  this file when an invariant changes.
- **Content claims are re-derived from the source, never paraphrased from what they replace.** See the
  lessons below; this is the failure mode most likely to bite a portfolio specifically.

## Verify / test / build

```bash
npm run check     # provenance gate (scripts/check-profile.ts), then astro check
npm run build     # static build to dist/
npm run dev       # local dev server
npm run format    # prettier
```

`npm run check` prints **every** non-verified field and every caveated figure on each run, pass or fail.
That list is the work queue: a reported gap stays a task, a silent one ages into apparent fact.

**Verification standard for this repo — verify at the consumer, not the seam.** A green build says an
artifact was produced, not that a reader gets a correct page. Before calling a change done, fetch the
served page and inspect it:

```bash
curl -s https://nasikabbas.com | grep -o '<title>[^<]*</title>'
curl -s -o /dev/null -w '%{http_code}\n' https://nasikabbas.com/styles/global.css
```

## Git, versioning, deploy

- **Commits are anonymous** — no `Co-Authored-By`, no tool attribution. Authorship lives in git
  metadata, not the message. Imperative, `type: summary`, the *why* in the body, one focused commit per
  logical change.
- **Branch** for anything substantial; trivial one-liners can go to `main`.
- **Never force-push or rewrite history** without asking. Never delete a branch — err toward keeping
  something you might later discover held information.
- **Deploy:** push to `main` → `.github/workflows/deploy.yml` → GitHub Pages. CI runs `check` then
  `build` on every push and PR. **A red CI is not a deploy candidate.**
- **`public/CNAME` must agree with `SITE_URL`.** The apex domain is functional, not decorative:
  `robots.txt` is only ever read at a domain root, so on a Pages sub-path an AI-crawler allowlist is
  inert — and being retrievable when someone asks an assistant about this person is one reason the site
  exists.

---

## Lessons carried in from prior work

Generalised from a long production cycle on another project. Each is here because it cost something
real, and each is stated in the form that applies *to this repo*.

**Verify at the outcome boundary, not the layer you edited.** Writing code and its test in one pass
encodes the same misunderstanding twice; a test derived from the implementation can only confirm the
implementation exists. **Write the assertion first and watch it fail against the unfixed version.** A
guard that has never been seen failing is unproven. *(This is why `claim.ts` shipped only after a
deliberately fabricated metric was submitted and the build rejected it with exit code 1.)*

**Look at the actual artifact.** Running a script to confirm correctness and never opening the thing
itself misses defects a green suite passes. For this repo that means opening the rendered page and the
generated PDF, not just checking that the build exited zero.

**Re-derive a replacement from the authority, never from the thing you are replacing.** Rewriting a
description by paraphrasing the prose being deleted reproduces its errors and invents new ones. **This
is the highest-risk failure mode here**: portfolio copy is exactly the kind of text that gets rewritten
from an older draft rather than from the repository, the report or the log it describes. Every figure
goes back to its `basis`.

**Enumerate the authoritative list; salience is not coverage.** Reasoning from the most available item
instead of listing the real one is invisible from the inside — asked directly, you produce the complete
answer immediately, because nothing was missing except the act of looking. Before a contract change,
`grep` the dependents and name them. Separate *"did not know"* from **"did not look."**

**A guard scoped by a list protects only what you had already found**, and a guard anchored to a name
the same change rewrites measures nothing. **A green guard has two causes: the property holds, or the
guard measured nothing.**

**A check whose verdict changes with the environment is measuring the environment.** Assert names, not
counts. Never widen a tolerance to make something pass.

**A failing verification is a claim about the verifier until proven otherwise.** Verification code is
written fast, late, and reviewed by nobody, so it is *more* defect-prone than what it audits. *(A
local resolver once reported this domain had no AAAA records; authoritative DNS showed all four.)*

**Lead with the absolute number; the ratio is colour.** "A 93% saving" and "~11 MB a month" describe
the same fact and license different decisions. Measure at the real operating point before quoting a
payoff, and never let a stated caveat substitute for a measurement that was available.

**Write output as you go.** Long runs that persist only at the end lose everything to one failure.

**Back up the complete scope a write can reach** before touching any data source, and prefer reversible
steps. **Fail loud on missing essentials** — a genuinely-absent required input should error, not
silently produce a degraded object.

**Emit recommendations as mechanisms.** A rule written as prose gets partially applied — including by
its own author, within hours. If something matters, make it a failing check, a required argument or a
gate. *"Be more careful" is never the remedy.*

## Definition of done, for this repo

Not "the build is green". Done means: **verified at the consumer** (the served page, not the pipeline)
· **every published figure traces to a `basis`**, and every caveated one renders its limit ·
**documented** where the next reader looks · **the edge marked** — what is unfinished said plainly,
in `README.md` or the working history, rather than left to be discovered.

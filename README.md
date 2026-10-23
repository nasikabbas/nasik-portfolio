# nasik-portfolio

Portfolio, case studies and résumé system for **Nasik Abbas**, generated from a single source of
truth and published at **[nasikabbas.com](https://nasikabbas.com)**.

Live: the site in two versions (plain English and technical), the full career, a case study, an
evaluation page and two essays. The current version, and what each release changed, is in
[CHANGELOG.md](CHANGELOG.md). Not built yet: the résumé variants, `llms.txt` and the LinkedIn pack
described below.

---

## Why it is built this way

**One source, many surfaces.** `data/profile.yaml` is the only place a fact is written. The site is
generated from it, and so are the share card and, once built, the résumé variants, `llms.txt` and the
LinkedIn pack. A candidate whose
site, résumé and LinkedIn disagree looks careless; generating them from one file makes disagreement
impossible rather than merely unlikely.

**Provenance is enforced, not intended.** This site's argument is that its author measures things
honestly — every figure traced to a source, every estimate shown with its limits. That argument is
worth exactly as much as its weakest number, and the audience that checks is
the audience being addressed. So the rule is a type, not a habit:

| Field kind | Builder | `assumed` allowed? |
|---|---|---|
| Descriptive statement | `claim()` | Yes, with a ≥20-character `basis` |
| Any figure a reader could check | `strictClaim()` | **No branch exists** |

An unconfirmed number is *unrepresentable*: `npm run check` fails at parse time rather than shipping
a plausible-looking invention. Fabricating requires writing `state: verified` next to something
untrue — commission rather than omission.

**Caveats travel with the value.** Some true numbers mislead on their own. "28 of 40" from one small
sample is not false; it is unpublishable without its limit — and a limit kept in someone's head
eventually ships without the number it belongs to. So `strictClaim`
carries an optional `caveat`, and the renderer displays it wherever the value appears. The honest
presentation is the only expressible one.

**Two registers, one source.** The first reader is usually a recruiter or HR partner, often on a
phone; the second is an engineer. So the site exists twice — **plain English** at `/` (the default)
and **technical** at `/technical/` — generated from the same data, with a switch on every page that
keeps the reader on the equivalent page. Prose never types a number: it embeds a figure by id
(`{pg_ai_median}`), so the two versions cannot quote different values for the same fact.

**Design intent.** Restrained and evidence-forward: large readable type, big numbers, dates a reader
can scan down the left edge. No client JavaScript, no web fonts, no analytics.

---

## Layout

```
data/profile.yaml          single source of truth: person, sources, figures, roles, credentials
data/og-card.json          the share card's stamp: the words drawn and their seal; generated, never hand-edited
src/config/site.ts         SITE_URL + BASE_PATH + path() + absoluteUrl() — the ONLY place either is written
src/schema/claim.ts        claim() / strictClaim() / resolve() / isPresent() / hasCaveat()
src/schema/profile.ts      the Zod schema; rejects a {token} that names no figure, at parse time
src/schema/card.ts         the share card stamp's schema
src/lib/figures.ts         the figure ledger: renders {tokens}, collects each page's caveats and sources
src/lib/view.ts            view models for the timeline and proof cards, resolved per register
src/lib/profile.ts         loads and parses profile.yaml once, for every page
src/lib/identity.ts        the one-line description of him (above his name, on the share card), built once
src/layouts/Base.astro     head (with the share card's og:image), header with the register switch, footer
src/components/            Rich (prose with figures), ProofCards, Timeline, Notes
src/pages/                 /  /work/padelgpt/  /writing/  /technical/  /technical/evaluation/
                           /technical/writing/ and one page per essay under it
public/styles/global.css   the design system — tokens for light and dark
public/CNAME               binds the apex domain; must agree with SITE_URL
public/og/card.png         the share card, rendered by scripts/og-card.ts and committed
scripts/check-profile.ts   the provenance gate over the data
scripts/check-dist.ts      the gate over the BUILT pages: privacy, caveats, plain language, links, share card
scripts/og-card.ts         renders the share card and its stamp; re-run after changing name, role, employer,
                           focus, the plain headline or SITE_URL (check-dist fails until you do)
scripts/share-card.ts      the card's seal and PNG-size checks, shared by og-card.ts and check-dist.ts
scripts/shots.ts           true phone and desktop screenshots, light and dark, for review
scripts/chrome.ts          finds Chrome or Edge for the two tools above; neither runs in CI
.github/workflows/ci.yml   check + build on every push and PR
.github/workflows/deploy.yml  Pages deploy on main (its build runs check-dist)
```

Two local folders, `.wh/` (a personal working area) and `source-material/` (reference material), are
never part of this repository, and deliberately **not** listed in the tracked `.gitignore`. Both are
excluded via `.git/info/exclude`, which is local and never tracked — a
tracked ignore file in a public repository publishes the shape of a private convention to everyone who
clones it, which is a small disclosure and an avoidable one.

## Commands

```bash
npm run check     # provenance gate over the data, then astro check
npm run build     # static build to dist/, then check-dist over the built pages
npm run dev       # local dev server
npm run preview   # serve dist/ (Astro 7 runs it as a daemon: `npx astro preview stop` ends it)
npm run shots     # screenshots of the served site into ./shots — needs preview running
npm run og-card   # re-render the share card after changing name, role, employer, focus, headline or SITE_URL
npm run check:live  # after a deploy: the build's gates, run over what nasikabbas.com serves
npm run format    # prettier
```

`npm run check` prints **every** non-verified item and every caveated figure on each run, pass or
fail. That list is the work queue — a gap that is reported stays a task, while a gap that is silent
ages into apparent fact.

**`check-dist` runs inside `npm run build`**, which is what the deploy workflow runs. CI and deploy
start independently on each push, so a check that lived only in `npm run check` would not stop a
deploy. In the build, a page that breaks a rule is never published.

**Why `shots` exists.** Headless Chrome's `--window-size=390,…` renders at a minimum of ~504 px and
crops the image, so a "phone" screenshot shows clipped text no phone would see. `shots.ts` drives
Chrome over the DevTools protocol with real device emulation, and reports any horizontal overflow.

## Deployment

GitHub Pages from `main` via `withastro/action@v5`, custom apex domain.

The apex domain is functional rather than decorative. No `robots.txt` is served, so every crawler,
AI assistants included, may read the site — being retrievable when someone asks an assistant about
this person is one of the reasons the site exists. Should one ever be added, **`robots.txt` is only
read at a domain root**, so on a `user.github.io/project` sub-path it would be inert.

Moving origin or sub-path is a two-constant edit in `src/config/site.ts`; nothing in `src/` may
hard-code either.

**Uptime is checked every hour, from outside** (`.github/workflows/uptime.yml`): the domain is not on
hold or near expiry, it resolves through its own nameservers and four public resolvers, and the served
pages pass the build's gates. A failed run emails the owner, and the run history answers "was the site
down at that moment?" with evidence. It cannot see a single visitor's network DNS — the deploy skill's triage
table covers that case.

## Conventions

- **Node ≥ 22.12** (`.nvmrc` pins 24). TypeScript strict, `noUncheckedIndexedAccess` on.
- **LF everywhere** (`.gitattributes`). Git Bash refuses to run a script whose shebang ends in CR,
  so any shell script checked out with CRLF is silently broken.
- **Commits are anonymous** — no attribution trailers, matching the author's other repositories.
- Type every signature; docstring every exported function; comment the *why*, not the *what*.

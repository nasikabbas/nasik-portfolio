# nasik-portfolio

Portfolio, case studies and résumé system for **Syed Nasik Abbas**, generated from a single source of
truth and published at **[nasikabbas.com](https://nasikabbas.com)**.

Status: **scaffold**. The guardrails and the deploy path are in place; content is set once positioning
fixes the case studies.

---

## Why it is built this way

**One source, many surfaces.** `data/profile.yaml` is the only place a fact is written. The site,
the résumé variants, `llms.txt` and the LinkedIn pack are all generated from it. A candidate whose
site, résumé and LinkedIn disagree looks careless; generating them from one file makes disagreement
impossible rather than merely unlikely.

**Provenance is enforced, not intended.** This site's argument is that its author measures things
honestly — the centrepiece is an evaluation study whose own judge failed calibration, reported as
such. That argument is worth exactly as much as its weakest number, and the audience that checks is
the audience being addressed. So the rule is a type, not a habit:

| Field kind | Builder | `assumed` allowed? |
|---|---|---|
| Descriptive statement | `claim()` | Yes, with a ≥20-character `basis` |
| Any figure a reader could check | `strictClaim()` | **No branch exists** |

An unconfirmed number is *unrepresentable*: `npm run check` fails at parse time rather than shipping
a plausible-looking invention. Fabricating requires writing `state: verified` next to something
untrue — commission rather than omission.

**Caveats travel with the value.** Some true numbers mislead on their own. A 65.1% win rate measured
by a judge that failed human calibration is not false; it is unpublishable without its limit — and a
limit kept in someone's head eventually ships without the number it belongs to. So `strictClaim`
carries an optional `caveat`, and the renderer displays it wherever the value appears. The honest
presentation is the only expressible one.

**Design intent.** Restrained and evidence-forward. The reader is an engineer or a hiring manager
deciding in about fifteen seconds whether to keep reading, and a personal site that looks like a
template costs credibility rather than buying it. No client JavaScript, no web fonts, no analytics.

---

## Layout

```
data/profile.yaml          single source of truth
src/config/site.ts         SITE_URL + BASE_PATH + path() + absoluteUrl() — the ONLY place either is written
src/schema/claim.ts        claim() / strictClaim() / resolve() / isPresent() / hasCaveat()
src/schema/profile.ts      the Zod schema for profile.yaml
src/pages/                 routes
public/styles/global.css   the design system (provisional)
public/CNAME               binds the apex domain; must agree with SITE_URL
scripts/check-profile.ts   the provenance gate
.github/workflows/ci.yml   check + build on every push and PR
.github/workflows/deploy.yml  Pages deploy on main
```

Private, never tracked (see `.gitignore`): `transition/` (career and financial planning),
`source-material/` (confidential decks and personal essays), `.wh/` (private working area).

## Commands

```bash
npm run check     # provenance gate, then astro check
npm run dev       # local dev server
npm run build     # static build to dist/
npm run format    # prettier
```

`npm run check` prints **every** non-verified field and every caveated figure on each run, pass or
fail. That list is the work queue — a gap that is reported stays a task, while a gap that is silent
ages into apparent fact.

## Deployment

GitHub Pages from `main` via `withastro/action@v5`, custom apex domain.

The apex domain is functional rather than decorative: **`robots.txt` is only ever read at a domain
root**, so on a `user.github.io/project` sub-path the AI-crawler allowlist is inert — and being
retrievable when someone asks an assistant about this person is one of the reasons the site exists.

Moving origin or sub-path is a two-constant edit in `src/config/site.ts`; nothing in `src/` may
hard-code either.

## Conventions

- **Node ≥ 22.12** (`.nvmrc` pins 24). TypeScript strict, `noUncheckedIndexedAccess` on.
- **LF everywhere** (`.gitattributes`). Git Bash refuses to run a script whose shebang ends in CR,
  so any shell script checked out with CRLF is silently broken.
- **Commits are anonymous** — no attribution trailers, matching the author's other repositories.
- Type every signature; docstring every exported function; comment the *why*, not the *what*.

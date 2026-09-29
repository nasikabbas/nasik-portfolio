---
name: deploy
description: Ship the portfolio to nasikabbas.com — run the gates, push to main, watch the Pages workflow, and verify the served page rather than the pipeline. Use when asked to deploy, ship, publish, or push the site live.
---

# Deploy — ship to nasikabbas.com

One environment, continuous deployment: push to `main` → `.github/workflows/deploy.yml` → GitHub Pages
→ **https://nasikabbas.com**. No promotion chain, so the discipline moves from *gates between
environments* to **gates before the push** and **verification at the consumer**.

## 🔴 Step 0 — version gate, before pushing

```bash
git diff --stat origin/main..HEAD
git diff origin/main..HEAD -- data/profile.yaml
```

**If `package.json` version is unchanged, or `CHANGELOG.md` has no entry for this change — stop and run
the `release` skill first.** Never ship a site whose reported version does not describe what it serves.
"It is only a copy edit" is exactly the change that skips the bump and starts the drift.

## Step 1 — gates

```bash
npm run check     # provenance gate, then astro check
npm run build     # must produce dist/ clean
git status --porcelain --untracked-files=all
```

All three must be clean. Specifically:

- **`check` must exit 0.** A fabricated or unverified figure fails here, which is the point.
- **Read the caveated-figures list it prints.** Every caveat must still render on the page that shows
  its value. A figure that shipped bare is a correctness bug, not a style choice.
- **`--untracked-files=all`** — a plain `git status` hides files inside an ignored directory and reports
  clean either way. `.wh/` and `source-material/` must show **zero** entries. This repo is public.

## Step 2 — push

```bash
git push origin main
```

## Step 3 — watch the workflow, then stop trusting it

```bash
gh run watch --exit-status "$(gh run list --workflow=deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

**A green workflow says an artifact was published. It does not say a reader gets a correct page.** That
distinction is the whole reason step 4 exists — the same failure as a health check that returns 200
while the thing behind it is broken.

## Step 4 — verify at the consumer

```bash
npm run check:live
```

`scripts/check-live.ts` downloads every page in the live sitemap and every asset those pages
reference, then runs **the build's own gates** (`check-dist`) over the served copy. It fails on:

1. **A page or asset that is not 200** — an asset 404 means the origin or base path moved and
   `src/config/site.ts` was not updated with it.
2. **Anything `check-dist` rejects** — a private term, a caveated figure without its limit, jargon on a
   plain page, a broken link or fragment.
3. **`http://` that does not 301 to `https://`** — a 200 means HTTPS enforcement was turned off, or
   the custom domain was re-bound and reset it.

It prints each page's `Last-Modified`: confirm it moved, or that the change is visibly present.
*This replaced a hand-run `curl | grep` block, one line of which grepped for a CSS class the redesign
removed — it would have reported zero caveats on a correct page.* Then **open the site on a phone**.

Pages caches for 600 seconds. If a check fails **immediately after a deploy**, re-read `Cache-Control`
and `expires` before diagnosing anything — a stale edge response is not a broken deploy, and treating
it as one sends you looking in the wrong place. Wait out the TTL and re-check once.

## When someone says the site won't open

Read the error before touching anything — each kind points at a different layer:

| What they see | Layer | First check |
|---|---|---|
| "Server can't be found", `ERR_NAME_NOT_RESOLVED`, `DNS_PROBE_FINISHED_NXDOMAIN` | DNS — the request never reached the site | The latest **Uptime** run (`gh run list --workflow=uptime.yml --limit 3`). Green: it's the visitor's network DNS — retry, switch Wi‑Fi ↔ mobile data, or set the router's DNS to 1.1.1.1 / 8.8.8.8. Red on *Registration*: the domain is on hold at the registrar. |
| GitHub's "404 — There isn't a GitHub Pages site here" | Pages ↔ domain binding | Settings → Pages: the custom domain is still `nasikabbas.com`, and the last deploy succeeded. |
| A certificate warning | HTTPS | Settings → Pages: the certificate's state, and *Enforce HTTPS*. |
| The page loads but looks wrong | The site | `npm run check:live`, then screenshots: `npx tsx scripts/shots.ts https://nasikabbas.com <dir>`. |

For a one-off look from outside this network:
`curl -s "https://dns.google/resolve?name=nasikabbas.com&type=A"`.

**A green Uptime run with a failing visitor is not a site bug.** *(2026-09-29: one phone on one Wi‑Fi
network failed the lookup while ten public resolvers, the domain's own nameservers and the site were
all fine.)*

## Rollback

Pages serves whatever `main` last built. So a rollback is a revert:

```bash
git revert --no-edit <bad-sha>
git push origin main
```

Then re-run step 4. **Do not force-push `main` to roll back** — it destroys the record of what was
published and for how long, which on a site making public claims is the part worth keeping.

## Rules

- **A red CI is not a deploy candidate.** Never push past a failing `check` — it is the guardrail the
  whole site rests on, and a bypassed guardrail is worse than none because it still reads as protection.
- **Never `--force` or rewrite `main`'s history.**
- **`public/CNAME` must agree with `SITE_URL`** in `src/config/site.ts`. They are two halves of one
  fact, and nothing enforces their agreement yet, so check it whenever either moves.
- **If a verification fails and you cannot tell whether the page or the check is wrong, say so and ask.**
  A failing verification is a claim about the verifier until proven otherwise — verification code is
  written fast, late, and reviewed by nobody.

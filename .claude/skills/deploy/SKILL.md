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
curl -s https://nasikabbas.com -o /tmp/live.html -w 'status=%{http_code}\n'
grep -o '<title>[^<]*</title>' /tmp/live.html
grep -c 'evidence__caveat' /tmp/live.html                                   # caveats rendering
curl -s -o /dev/null -w 'css=%{http_code}\n' https://nasikabbas.com/styles/global.css
curl -sI http://nasikabbas.com | head -1                                    # expect 301 -> https
```

Check, in order:

1. **200**, and the page is the new one — `Last-Modified` moved, or the change is visibly present.
2. **Assets resolve.** `BASE_PATH` is `''` for the apex domain; an asset 404 means the origin or base
   path moved and `src/config/site.ts` was not updated with it.
3. **Every caveated figure renders its caveat.** Count them against what `npm run check` printed.
4. **`http://` returns 301.** A 200 means HTTPS enforcement has been turned off, or the custom domain
   was re-bound and reset it.

Pages caches for 600 seconds. If a check fails **immediately after a deploy**, re-read `Cache-Control`
and `expires` before diagnosing anything — a stale edge response is not a broken deploy, and treating
it as one sends you looking in the wrong place. Wait out the TTL and re-check once.

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

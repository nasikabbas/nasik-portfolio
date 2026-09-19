---
name: release
description: Cut a release of the portfolio — decide the SemVer bump, update package.json, and roll the changelog. Use when finalizing a change for publication, asked to bump the version, or to update the changelog before deploying.
---

# Release — version bump + changelog

## What the version means here

This site ships no API, so the instinct is that a version is ceremony. It is not. **The contract this
site publishes is its claims.** A figure on a live page can be read, quoted, cited in an application, or
acted on by someone deciding whether to reply to an email. Changing or withdrawing one after it has been
published is a change to something a reader may already be relying on — which is exactly what a MAJOR
bump exists to signal.

One version, in `package.json`. It moves with **every** shipped change, including ones with no visible
surface.

## Decide the bump

| Bump | When | Examples |
|---|---|---|
| **MAJOR** | A published claim **changes meaning or is withdrawn** | A figure is corrected or removed; a caveat is added to a number that shipped bare; a case study's conclusion is reversed |
| **MINOR** | New content or a new surface, nothing existing invalidated | A new case study, a new résumé variant, a new page, a new evidence point |
| **PATCH** | Nothing a reader relies on changes | Copy edits, styling, accessibility fixes, build tooling, dependency bumps, refactors |

**When unsure, take the higher one and say why.** A reader who quoted a figure you quietly changed is
the failure this classification exists to prevent, and the cost of over-signalling is a line in a file.

⚠️ **A change with no visible surface still gets a bump.** Tooling, CI, dependency upgrades, a refactor
in `src/schema/` — bump PATCH. A version that stands still while the artifact moves is how the reported
version stops describing what is actually served.

## First: find out what actually changed

Do not classify from memory of the work. Read the diff.

```bash
git log --oneline "$(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)"..HEAD
git diff --stat HEAD~1
git diff HEAD~1 -- data/profile.yaml     # the one that decides MAJOR vs MINOR
```

**`data/profile.yaml` is the file that determines the bump.** Everything else is presentation; that file
is the claims. A diff touching a `figure`, a `basis` or a `caveat` is a MAJOR candidate until shown
otherwise.

## Steps

1. **Bump `version` in `package.json`.**

2. **Roll `CHANGELOG.md`.** Move the `## [Unreleased]` entries under a new `## [x.y.z] — YYYY-MM-DD`
   heading, add a fresh empty `## [Unreleased]` on top. Newest first. Entries are written for a
   **reader of the site**, not for the person who made the change.

3. **If a figure changed, the changelog says what it was and what it is now.** Not "updated metrics".
   A correction that does not state the prior value is not a correction, it is a quiet replacement —
   and on a site whose argument is honest measurement, that is the one thing that cannot happen.

   ```markdown
   ### Changed
   - Win rate against human support corrected from 65.1% to 61.4% — the earlier figure counted
     ties as wins. Basis updated to the re-scored run.
   ```

4. **Verify:** `npm run check && npm run build`. The provenance gate must pass, and every non-verified
   field it prints is a deliberate choice you can defend, not a leftover.

5. **Confirm the changelog against the diff, not against intent.** A changelog entry is an assertion;
   the diff is the evidence. Walk them against each other before committing.

6. Commit version + changelog together, then ship with the **`deploy`** skill.

## Rules

- **Never defer a bump.** "It is not published yet" is not a reason to fold more work under a version
  already cut — the moment it deploys, the reported version describes behaviour it never saw.
- **`package.json` version and the top changelog entry are identical.** No exceptions.
- **A withdrawn claim is not deleted silently.** Remove it from `profile.yaml`, and say so in the
  changelog. Someone may have read it.

import { z } from 'zod';

import { claim, strictClaim } from './claim';

/**
 * Schema for `data/profile.yaml` — the single source of truth.
 *
 * Every published surface is generated from this one file, so those surfaces cannot disagree
 * with each other. The site now has two registers (ADR 002): **plain** for the recruiter or HR
 * partner who reads first, **technical** for the engineer who reads second. Both render from
 * the same entries, so a figure is written exactly once and the two versions cannot quote
 * different numbers for the same fact.
 *
 * ## How figures reach prose
 *
 * A number typed into a sentence is a second copy of a fact, and copies drift — the same
 * release count was already stale here once. So prose never carries a number by value: it
 * embeds a figure by id, as `{figure_id}`, and the renderer (`src/lib/figures.ts`) substitutes
 * the value, attaches its caveat and records its source. An id that does not resolve fails
 * the parse below, not the reader.
 */

/** A free-text statement where a recorded inference is acceptable. */
export const Statement = claim(z.string().min(1));

/** A figure an interviewer could ask to be substantiated. Never inferable. */
export const Figure = strictClaim(z.string().min(1));

/**
 * Identifier shared by figures and sources. Lowercase snake case only, so a `{token}` in prose
 * is unambiguous and cannot collide with ordinary braces in text.
 */
const Id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'Ids are lowercase snake_case.');

/** Matches a figure token inside prose. Kept beside {@link Id} so the two cannot disagree. */
export const FIGURE_TOKEN = /\{([a-z][a-z0-9_]*)\}/g;

/** A public document a reader can open to check a figure for themselves. */
export const SourceSchema = z.object({
  /** Title as the document gives it. */
  title: z.string().min(1),
  /** Where it lives. Must be public — a private link is not a source a reader can use. */
  url: z.url(),
});

/** A figure, plus the public source that backs it when one exists. */
export const FigureEntrySchema = z.object({
  /** The claim: value, provenance, and any limit that must travel with it. */
  figure: Figure,
  /** Id in `sources`. Absent when the figure comes from private records or his own account. */
  source: Id.optional(),
});

/**
 * One line of prose. A bare string is a statement he has confirmed; a claim object is used when
 * a statement is an inference, so it is reported on every `check` run until he confirms it.
 */
export const LineSchema = z.union([z.string().min(1), Statement]);

/** A position inside a role block — a job title, or one venture inside the founder years. */
export const PositionSchema = z.object({
  title: z.string().min(1),
  /** Set when the position belongs to a different organisation than its block (the ventures). */
  org: z.string().min(1).optional(),
  period: z.string().min(1),
  /** One plain sentence on what the product or company is, for a reader who has never heard of it. */
  about: LineSchema.optional(),
  /** Outcomes in plain words, for the default register. */
  plain: z.array(LineSchema).min(1),
  /** The systems and methods behind the same outcomes, for the technical register. */
  technical: z.array(LineSchema).min(1),
});

/** One block on the timeline: an employer, or the founder years. */
export const RoleSchema = z.object({
  id: Id,
  org: z.string().min(1),
  /** What the organisation is, in one plain line. */
  about: LineSchema,
  period: z.string().min(1),
  location: z.string().min(1).optional(),
  positions: z.array(PositionSchema).min(1),
  /** Where this role's statements come from. Printed by the gate; never rendered. */
  basis: z.string().min(10),
});

export const ProfileSchema = z
  .object({
    person: z.object({
      name: z.string().min(1),
      /** The job title a recruiter will search for. */
      role: z.string().min(1),
      /** Country only — his instruction: the site never names his current city. */
      location: z.string().min(1),
      /** Whether he will move for a role; stated because it decides international applications. */
      relocation: z.string().min(1),
      email: z.email(),
      pronouns: z.string().min(1),
      links: z.object({ linkedin: z.url(), github: z.url() }),
      /** One line stating what he does, per register. Not a slogan. */
      headline: z.object({ plain: z.string().min(1), technical: z.string().min(1) }),
      /** Two or three sentences under the headline, per register. */
      summary: z.object({ plain: z.array(LineSchema).min(1), technical: z.array(LineSchema).min(1) }),
      /**
       * The contact line. Deliberately carries no availability date: a stated date signals
       * urgency and costs leverage (his decision, 2026-09-27). `check-dist` enforces it.
       */
      contact: z.string().min(1),
    }),
    sources: z.record(Id, SourceSchema),
    figures: z.record(Id, FigureEntrySchema),
    roles: z.array(RoleSchema).min(1),
    education: z
      .array(z.object({ degree: z.string().min(1), institution: z.string().min(1), year: z.string().min(4) }))
      .min(1),
    certifications: z.array(
      z.object({ name: z.string().min(1), issuer: z.string().min(1), year: z.string().optional() }),
    ),
  })
  .superRefine((profile, ctx) => {
    // Every figure's source must exist — a dangling source id would render a sources list
    // that silently omits the document the figure depends on.
    for (const [id, entry] of Object.entries(profile.figures)) {
      if (entry.source !== undefined && !(entry.source in profile.sources)) {
        ctx.addIssue({
          code: 'custom',
          path: ['figures', id, 'source'],
          message: `Unknown source "${entry.source}".`,
        });
      }
    }
    // Every {token} in any line must resolve to a figure. Checked here, at parse time, so a
    // typo fails the build with a path instead of rendering a blank where a number should be.
    for (const { path, text } of profileLines(profile)) {
      for (const match of text.matchAll(FIGURE_TOKEN)) {
        const id = match[1];
        if (id === undefined || !(id in profile.figures)) {
          ctx.addIssue({ code: 'custom', path, message: `Unknown figure "{${id ?? ''}}".` });
        } else if (profile.figures[id]?.figure.state === 'missing') {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `Figure "{${id}}" is missing — a sentence cannot quote a number that is not established.`,
          });
        }
      }
    }
  });

export type Profile = z.infer<typeof ProfileSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Line = z.infer<typeof LineSchema>;
export type FigureEntry = z.infer<typeof FigureEntrySchema>;
export type Source = z.infer<typeof SourceSchema>;

/** A line's text, or `undefined` when it is a `missing` claim and must be omitted. */
export function lineText(line: Line): string | undefined {
  if (typeof line === 'string') return line;
  return line.state === 'missing' ? undefined : line.value;
}

/**
 * Every prose line in the profile, with its path. Shared by the parse-time token check and by
 * `scripts/check-profile.ts`, so the two walk exactly the same set of lines.
 */
export function profileLines(profile: {
  person: { summary: { plain: Line[]; technical: Line[] } };
  roles: Array<{ about: Line; positions: Array<{ about?: Line | undefined; plain: Line[]; technical: Line[] }> }>;
}): Array<{ path: (string | number)[]; text: string; line: Line }> {
  const out: Array<{ path: (string | number)[]; text: string; line: Line }> = [];
  const add = (path: (string | number)[], line: Line | undefined): void => {
    if (line === undefined) return;
    const text = lineText(line);
    if (text !== undefined) out.push({ path, text, line });
  };
  profile.person.summary.plain.forEach((l, i) => add(['person', 'summary', 'plain', i], l));
  profile.person.summary.technical.forEach((l, i) => add(['person', 'summary', 'technical', i], l));
  profile.roles.forEach((role, r) => {
    add(['roles', r, 'about'], role.about);
    role.positions.forEach((pos, p) => {
      add(['roles', r, 'positions', p, 'about'], pos.about);
      pos.plain.forEach((l, i) => add(['roles', r, 'positions', p, 'plain', i], l));
      pos.technical.forEach((l, i) => add(['roles', r, 'positions', p, 'technical', i], l));
    });
  });
  return out;
}

import { z } from 'zod';

import { claim, strictClaim } from './claim';

/**
 * Schema for `data/profile.yaml` — the single source of truth.
 *
 * Every published surface (site, resume variants, `llms.txt`, LinkedIn pack) is generated
 * from this one file, so those surfaces cannot disagree with each other. Disagreement
 * between a site and a resume reads as carelessness; generating both from one source makes
 * it impossible rather than merely unlikely.
 *
 * The content model is deliberately thin for now. It grows once positioning fixes the case
 * studies; what matters at this stage is that the provenance rules are load-bearing from
 * the first commit rather than retrofitted onto data that already exists.
 */

/** A free-text statement where a recorded inference is acceptable. */
const Statement = claim(z.string().min(1));

/** A figure an interviewer could ask to be substantiated. Never inferable. */
const Figure = strictClaim(z.string().min(1));

/** One piece of evidence: a short label and the figure that backs it. */
export const EvidencePointSchema = z.object({
  /** What the figure demonstrates, e.g. "Production releases shipped". */
  label: z.string().min(1),
  /** The figure itself, carrying provenance and any limit that must travel with it. */
  figure: Figure,
  /** Optional context shown beneath the figure. */
  note: Statement.optional(),
});

export type EvidencePoint = z.infer<typeof EvidencePointSchema>;

export const ProfileSchema = z.object({
  person: z.object({
    name: z.string().min(1),
    /** One line stating what he is. Not a slogan. */
    headline: z.string().min(1),
    email: z.email(),
    location: z.string().min(1),
    pronouns: z.string().min(1),
  }),
  /**
   * Figures that carry the argument. Kept few and all verifiable — the case for this
   * person is made by numbers a reader can check, not by adjectives.
   */
  evidence: z.array(EvidencePointSchema).min(1),
});

export type Profile = z.infer<typeof ProfileSchema>;

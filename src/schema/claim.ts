import { z } from 'zod';

/**
 * Provenance wrapper for every fact and figure that reaches a published surface.
 *
 * ## Why this exists here specifically
 *
 * This portfolio's entire argument is that its author measures things honestly — the
 * centrepiece is an evaluation study whose own judge failed calibration, reported as
 * such. That argument is worth exactly as much as its weakest number. One figure that
 * cannot be traced to a source undoes the thing being sold, and it undoes it in the one
 * audience that checks: engineers reading a claim about measurement.
 *
 * The risk is not dishonesty. It is that a plausible number is *easy to type* and
 * impossible to distinguish later from a real one. Wrapping the field forces provenance
 * to be stated beside the value, so fabricating becomes an act of commission — writing
 * `state: verified` next to something untrue — rather than a drift of omission. Every
 * non-verified field is listed on each `check` run, so a gap stays visible instead of
 * quietly ageing into apparent fact.
 *
 * ## The three states
 *
 * | State      | Meaning                                  | Reaches a built artifact?        |
 * |------------|------------------------------------------|----------------------------------|
 * | `verified` | Traced to a named source                 | Yes                              |
 * | `assumed`  | An inference, with its basis recorded    | Yes, and only via {@link claim}  |
 * | `missing`  | Not established yet                      | No — omitted and reported        |
 *
 * Use {@link claim} for descriptive statements where a recorded inference is acceptable,
 * and {@link strictClaim} for anything an interviewer could ask to be substantiated.
 */
export const CLAIM_STATES = ['verified', 'assumed', 'missing'] as const;

export type ClaimState = (typeof CLAIM_STATES)[number];

/** A resolved claim as consumed by generators: the value, or `undefined` when unavailable. */
export interface ResolvedClaim<T> {
  readonly value: T | undefined;
  readonly state: ClaimState;
  readonly basis: string | undefined;
  /** Limit that must be rendered wherever the value is. See {@link strictClaim}. */
  readonly caveat: string | undefined;
}

/**
 * Build a schema for a claim that tolerates a recorded inference.
 *
 * `assumed` requires a `basis` of real substance — a bare "probably" is rejected, because
 * an unjustified inference is indistinguishable from a guess.
 *
 * @param value - Schema for the underlying value.
 */
export function claim<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('state', [
    z.object({ state: z.literal('verified'), value, basis: z.string().optional() }),
    z.object({
      state: z.literal('assumed'),
      value,
      basis: z
        .string()
        .min(20, 'An assumed claim must record the reasoning that supports it, in full.'),
    }),
    z.object({ state: z.literal('missing'), basis: z.string().optional() }),
  ]);
}

/**
 * Build a schema for a figure that may **never** be inferred.
 *
 * Omitting the `assumed` branch makes an unconfirmed number *unrepresentable*: the build
 * fails at parse time rather than shipping a plausible-looking invention. Use for counts,
 * percentages, money, durations, dates, version numbers, and anything else that could be
 * checked against a repository, a report or a public page.
 *
 * ## `caveat` — the addition this portfolio needs
 *
 * Some true numbers are misleading on their own. A 65.1% win rate measured by a judge that
 * failed human calibration is not false; it is *unpublishable without its limit*, and a
 * limit kept in someone's head is a limit that eventually ships without the number it
 * belongs to. So the qualification rides on the datum: when `caveat` is set, the renderer
 * must display it wherever the value appears, and `scripts/check-profile.ts` fails the
 * build if a caveated figure is rendered bare.
 *
 * This makes the honest presentation the *only expressible* one, rather than the one that
 * depends on remembering. It is the same move as omitting the `assumed` branch, applied to
 * context rather than to provenance.
 *
 * @param value - Schema for the underlying value.
 */
export function strictClaim<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('state', [
    z.object({
      state: z.literal('verified'),
      value,
      /** Where the figure came from — a repo path, a report, a public URL. */
      basis: z.string().optional(),
      /**
       * A limit that travels with the value. Must be a complete statement a reader can
       * act on, not a hedge: "uncalibrated judge, Cohen's kappa -0.170" rather than
       * "approximate".
       */
      caveat: z
        .string()
        .min(20, 'A caveat must state the limit in full, so a reader can weigh the number.')
        .optional(),
    }),
    z.object({ state: z.literal('missing'), basis: z.string().optional() }),
  ]);
}

/** Shape shared by both builders once parsed, before resolution. */
type ParsedClaim<T> =
  | { state: 'verified'; value: T; basis?: string | undefined; caveat?: string | undefined }
  | { state: 'assumed'; value: T; basis: string }
  | { state: 'missing'; basis?: string | undefined };

/**
 * Reduce a parsed claim to the value a generator should use.
 *
 * @returns The value for `verified` and `assumed` claims; `undefined` for `missing`.
 */
export function resolve<T>(parsed: ParsedClaim<T>): ResolvedClaim<T> {
  if (parsed.state === 'missing') {
    return { value: undefined, state: 'missing', basis: parsed.basis, caveat: undefined };
  }
  return {
    value: parsed.value,
    state: parsed.state,
    basis: parsed.basis,
    caveat: parsed.state === 'verified' ? parsed.caveat : undefined,
  };
}

/** Narrowing helper: does this claim carry a usable value? */
export function isPresent<T>(
  parsed: ParsedClaim<T>,
): parsed is Exclude<ParsedClaim<T>, { state: 'missing' }> {
  return parsed.state !== 'missing';
}

/** Does this claim carry a limit that must be rendered alongside it? */
export function hasCaveat<T>(parsed: ParsedClaim<T>): boolean {
  return parsed.state === 'verified' && typeof parsed.caveat === 'string';
}

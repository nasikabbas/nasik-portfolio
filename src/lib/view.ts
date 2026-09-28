import { lineText, type Line, type Profile } from '../schema/profile';

import type { FigureLedger, Part } from './figures';

/**
 * View models for the timeline, resolved through a page's {@link FigureLedger}.
 *
 * Kept out of the components so resolution happens in the page frontmatter, before the
 * template renders — which is what lets the page's notes and sources lists be complete
 * regardless of the order Astro renders children in.
 */

/** Which version of the site a page belongs to (ADR 002). */
export type Register = 'plain' | 'technical';

export interface PositionView {
  readonly title: string;
  readonly org: string | undefined;
  readonly period: string;
  readonly about: Part[];
  readonly bullets: Part[][];
}

export interface RoleView {
  readonly id: string;
  readonly org: string;
  readonly about: Part[];
  readonly period: string;
  readonly positions: PositionView[];
}

/** A proof card as authored: a category, one figure (or two, shown as "A vs B"), a label. */
export interface ProofItem {
  /** Short category shown above the number, e.g. "AI product". */
  readonly tag: string;
  readonly figures: readonly [string] | readonly [string, string];
  /** Plain label; may embed further figures by id. */
  readonly label: string;
}

/** A proof card resolved for rendering. Caveats are carried to be shown inside the card. */
export interface CardView {
  readonly tag: string;
  readonly values: string[];
  readonly label: Part[];
  readonly caveats: string[];
  readonly sourceUrl: string | undefined;
}

/**
 * Resolve proof cards. A card shows its figures' limits inline — the card is where a skimming
 * reader takes the number from, so it is where the limit has to be.
 */
export function resolveProof(items: readonly ProofItem[], ledger: FigureLedger): CardView[] {
  return items.map((item) => {
    const figs = item.figures.map((id) => ledger.card(id));
    return {
      tag: item.tag,
      values: figs.map((f) => f.value),
      label: ledger.render(item.label),
      caveats: figs.flatMap((f) => (f.caveat === undefined ? [] : [f.caveat])),
      sourceUrl: figs.find((f) => f.sourceUrl !== undefined)?.sourceUrl,
    };
  });
}

/**
 * Resolve every role for one register. A `missing` line is dropped rather than rendered, so
 * an unconfirmed statement can sit in the data without reaching a page.
 */
export function resolveRoles(profile: Profile, register: Register, ledger: FigureLedger): RoleView[] {
  const render = (line: Line | undefined): Part[] => (line === undefined ? [] : ledger.render(line));
  return profile.roles.map((role) => ({
    id: role.id,
    org: role.org,
    about: render(role.about),
    period: role.period,
    positions: role.positions.map((pos) => ({
      title: pos.title,
      org: pos.org,
      period: pos.period,
      about: render(pos.about),
      bullets: pos[register]
        .filter((line) => lineText(line) !== undefined)
        .map((line) => ledger.render(line)),
    })),
  }));
}

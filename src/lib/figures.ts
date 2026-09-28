import { FIGURE_TOKEN, lineText, type Line, type Profile } from '../schema/profile';

/**
 * Figure ledger — renders prose that embeds figures by id, and remembers what a page used.
 *
 * ## Why a ledger, rather than a helper
 *
 * Two obligations follow a figure onto a page, and both are easy to forget one at a time:
 *
 * 1. **Its caveat must be shown wherever it appears** (`claim.ts`). A limit kept in someone's
 *    head eventually ships without the number it belongs to.
 * 2. **Its source should be checkable** — a reader who can open the public report should be
 *    given the link.
 *
 * A page creates one ledger, resolves all of its prose through it in the frontmatter, and then
 * renders {@link FigureLedger.notes} and {@link FigureLedger.sources} at the bottom. Because every
 * figure passes through here, neither list can be incomplete by omission — and `check-dist`
 * verifies the first one on the built page.
 *
 * Resolution happens in frontmatter, not in child components, so the lists are complete before
 * the template renders: nothing depends on the order in which Astro renders children.
 */

/** A run of literal text. */
export interface TextPart {
  readonly kind: 'text';
  readonly text: string;
}

/** A figure's value, with the number of its note when it carries a caveat. */
export interface FigurePart {
  readonly kind: 'figure';
  readonly id: string;
  readonly value: string;
  /** Footnote number, present only for caveated figures. */
  readonly note: number | undefined;
}

export type Part = TextPart | FigurePart;

/** A caveat to render at the foot of the page, keyed by the number shown beside the figure. */
export interface Note {
  readonly n: number;
  readonly value: string;
  readonly caveat: string;
}

/** A public source used on the page, with the figures that rely on it. */
export interface UsedSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

/** A figure rendered as a standalone card: its caveat is shown inside the card, not as a note. */
export interface CardFigure {
  readonly value: string;
  readonly caveat: string | undefined;
  readonly sourceUrl: string | undefined;
}

export class FigureLedger {
  private readonly noteById = new Map<string, Note>();
  private readonly sourceIds = new Set<string>();

  constructor(private readonly profile: Profile) {}

  /**
   * Resolve `{id}` tokens in a line of prose into parts.
   *
   * @throws When an id is unknown or its figure is `missing`. The schema already rejects both
   *   for lines in `profile.yaml`; this covers prose written in page files, so the build fails
   *   loudly rather than printing a blank where a number should be.
   */
  render(line: Line | string): Part[] {
    const text = typeof line === 'string' ? line : lineText(line);
    if (text === undefined) return [];
    const parts: Part[] = [];
    let last = 0;
    for (const match of text.matchAll(FIGURE_TOKEN)) {
      const at = match.index ?? 0;
      if (at > last) parts.push({ kind: 'text', text: text.slice(last, at) });
      const id = match[1] ?? '';
      const { value, caveat } = this.resolve(id);
      parts.push({ kind: 'figure', id, value, note: caveat === undefined ? undefined : this.noteFor(id, value, caveat) });
      last = at + match[0].length;
    }
    if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
    return parts;
  }

  /**
   * Resolve a line to a flat string, for places that cannot carry a note — `<title>`, a meta
   * description, `alt` text.
   *
   * @throws When the line embeds a caveated figure: a place that cannot show the limit must not
   *   show the number.
   */
  plain(line: Line | string): string {
    return this.render(line)
      .map((part) => {
        if (part.kind === 'text') return part.text;
        if (part.note !== undefined) {
          throw new Error(`Figure "{${part.id}}" carries a caveat and cannot be used where the caveat cannot be shown.`);
        }
        return part.value;
      })
      .join('');
  }

  /** A figure for a proof card. The caveat is returned so the card can show it inline. */
  card(id: string): CardFigure {
    const { value, caveat, sourceUrl } = this.resolve(id);
    return { value, caveat, sourceUrl };
  }

  /** Caveats of the figures used so far, in the order they were first used. */
  notes(): Note[] {
    return [...this.noteById.values()];
  }

  /** Public sources of the figures used so far. */
  sources(): UsedSource[] {
    return [...this.sourceIds].map((id) => {
      const source = this.profile.sources[id];
      if (source === undefined) throw new Error(`Unknown source "${id}".`);
      return { id, title: source.title, url: source.url };
    });
  }

  private resolve(id: string): { value: string; caveat: string | undefined; sourceUrl: string | undefined } {
    const entry = this.profile.figures[id];
    if (entry === undefined) throw new Error(`Unknown figure "{${id}}".`);
    if (entry.figure.state !== 'verified') {
      throw new Error(`Figure "{${id}}" is not verified and cannot be rendered.`);
    }
    let sourceUrl: string | undefined;
    if (entry.source !== undefined) {
      this.sourceIds.add(entry.source);
      sourceUrl = this.profile.sources[entry.source]?.url;
    }
    return { value: entry.figure.value, caveat: entry.figure.caveat, sourceUrl };
  }

  private noteFor(id: string, value: string, caveat: string): number {
    const existing = this.noteById.get(id);
    if (existing !== undefined) return existing.n;
    const note: Note = { n: this.noteById.size + 1, value, caveat };
    this.noteById.set(id, note);
    return note.n;
  }
}

/**
 * The essays: one list, read by the essay pages and by both writing indexes, so a title or a date
 * is written once and cannot disagree between them.
 *
 * Each essay lives in the technical register — the plain register's vocabulary gate rejects the
 * words these essays are about (agents, prompts, protocols) — and carries a plain title and summary
 * for the plain writing page that sits opposite it (ADR 002).
 */
import type { Part, UsedSource } from './figures';

/** The blocks an essay body is written in; rendered by `src/components/EssayBody.astro`. */
export interface ListItem {
  /** A short bold lead-in, when the item has one. */
  readonly lead?: string;
  readonly parts: Part[];
}

export interface Reference {
  readonly title: string;
  readonly url?: string;
  /** What was read, or how far — "read in full", "abstract". */
  readonly note: string;
}

export type Block =
  | { readonly kind: 'h2'; readonly text: string }
  | { readonly kind: 'p'; readonly parts: Part[] }
  | { readonly kind: 'list'; readonly ordered?: boolean; readonly items: ListItem[] }
  | { readonly kind: 'quote'; readonly parts: Part[] }
  | { readonly kind: 'table'; readonly head: readonly string[]; readonly rows: ReadonlyArray<readonly string[]> }
  | { readonly kind: 'refs'; readonly items: readonly Reference[] };

export interface Essay {
  /** URL segment under /technical/writing/. Immutable once published. */
  readonly slug: string;
  readonly title: string;
  /** One or two sentences: what the essay argues. */
  readonly dek: string;
  /** ISO date of first publication. */
  readonly published: string;
  /** The same essay, named for a reader who does not work in software. */
  readonly plainTitle: string;
  readonly plainSummary: string;
}

export const ESSAYS: readonly Essay[] = [
  {
    slug: 'knowledge-does-not-cross',
    title: "Agents are learning. Organisations aren't.",
    dek: "In 2026 an AI agent can build up skills from its own experience and keep them. What it learns still doesn't reach the colleague at the next desk — and, as far as I can find, nobody has built the thing that would carry it there.",
    published: '2026-10-02',
    plainTitle: 'When AI learns on the job, does the team learn too?',
    plainSummary:
      "AI assistants can now keep what they learn from their own work and get better with it. What one person's assistant learns still doesn't reach a colleague's, and nobody seems to have built the thing that would carry it there. The essay looks at what the research has solved, what it hasn't, and what a fix would need.",
  },
  {
    slug: 'whose-opinion-counts',
    title: "Your agents can talk. They can't tell whose opinion counts.",
    dek: "The protocols that connect AI agents can say what an agent can do and which agent handles a task. None of them can say who owns a decision — or get the right person's judgement in before the work is built, rather than after.",
    published: '2026-10-02',
    plainTitle: 'Who decides, and when?',
    plainSummary:
      "The standards that let AI tools work together can say what a tool can do and who handles a task. They can't say whose judgement counts on a decision, or bring it in while the work is still cheap to change. The essay maps that gap and what would close it, and reports a test that didn't go the way we expected.",
  },
];

/** The essay with this slug. Throws rather than rendering a page for an essay that is not listed. */
export function essay(slug: string): Essay {
  const found = ESSAYS.find((e) => e.slug === slug);
  if (found === undefined) throw new Error(`No essay "${slug}" in src/lib/essays.ts.`);
  return found;
}

/** "2 October 2026" — how the site writes a date in prose. */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Fail the build if a figure on the page relies on a source the essay's references omit. Essays
 * list every work they cite, including ones that contribute no figure, so the references are a
 * superset of the ledger's sources — and this keeps it one.
 */
export function assertReferencesCover(used: readonly UsedSource[], refs: readonly Reference[]): void {
  const listed = new Set(refs.map((ref) => ref.url));
  const missing = used.filter((source) => !listed.has(source.url));
  if (missing.length > 0) {
    throw new Error(`Essay references omit sources its figures use: ${missing.map((s) => s.url).join(', ')}`);
  }
}

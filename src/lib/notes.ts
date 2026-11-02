/**
 * The notes: short, dated research notes that sit beside the essays. One list, read by the note
 * pages and by both writing indexes, so a title, a date or a status is written once and cannot
 * disagree between them.
 *
 * A note is thinking in public at the size of a few hundred words: why a question is being asked,
 * what has been read, what will be tested. Each carries a **status**, so a reader can tell an idea
 * from a result without reading to the end — an essay argues something that holds; a note says
 * where the thinking is today. Notes live in the technical register for the same reason the
 * essays do (ADR 002): their vocabulary is what the plain register rejects. Each carries a plain
 * title and summary for the plain writing page.
 */

/** Where a note's thinking stands. Shown beside the date, in these words. */
export type NoteStatus = 'reading' | 'idea' | 'experiment planned' | 'result';

export interface Note {
  /** URL segment under /technical/notes/. Immutable once published. */
  readonly slug: string;
  readonly title: string;
  /** One or two sentences: what the note says. */
  readonly dek: string;
  /** ISO date of first publication. */
  readonly published: string;
  readonly status: NoteStatus;
  /** The same note, named for a reader who does not work in software. */
  readonly plainTitle: string;
  readonly plainSummary: string;
}

export const NOTES: readonly Note[] = [
  {
    slug: 'the-form-said-no-ai',
    title: "The form said: don't use AI to write this",
    dek: 'An application form asked me not to use AI to draft my answers. I understand why. I also know that ten years ago that one line would have ended my application before it started.',
    published: '2026-11-02',
    status: 'idea',
    plainTitle: 'Who gets to write clearly?',
    plainSummary:
      'An application form asked for answers written without AI help. The note explains why that one line would once have stopped the author from applying at all. It also says how he writes now, and why that is the question he wants to study.',
  },
];

/** The note with this slug. Throws rather than rendering a page for a note that is not listed. */
export function note(slug: string): Note {
  const found = NOTES.find((n) => n.slug === slug);
  if (found === undefined) throw new Error(`No note "${slug}" in src/lib/notes.ts.`);
  return found;
}

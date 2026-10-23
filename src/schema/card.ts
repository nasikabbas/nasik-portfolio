import { z } from 'zod';

/**
 * The share card's stamp: `data/og-card.json`, written by `scripts/og-card.ts`, read by the page head
 * (for the image's versioned URL) and by `check-dist`. Generated, never edited by hand: a hand edit
 * breaks the seal, which is the point of having one.
 */
export const CardStampSchema = z.object({
  /** The words drawn on the card, exactly as `cardText()` composed them when it was rendered. */
  text: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    line: z.string().min(1),
    /** The site's host, drawn at the foot of the card. */
    site: z.string().min(1),
  }),
  /** SHA-256 (hex) over the words and then the PNG's bytes: it ties these words to that image. */
  seal: z.string().regex(/^[0-9a-f]{64}$/, 'A seal is 64 lower-case hex digits.'),
});

export type CardStamp = z.infer<typeof CardStampSchema>;
export type CardText = CardStamp['text'];

/**
 * The share card's two checks that need Node, shared by the renderer (`og-card.ts`) and the gate
 * (`check-dist.ts`) so the two can never disagree on how a card is sealed or measured.
 */

import { createHash } from 'node:crypto';

import type { CardText } from '../src/schema/card';

/** The eight bytes every PNG file starts with. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The seal over a card's words and image. The words go in as a fixed-order array, not as an object,
 * so the seal does not depend on the order in which a JSON parser returns keys.
 */
export function sealOf(text: CardText, png: Uint8Array): string {
  return createHash('sha256')
    .update(JSON.stringify([text.name, text.title, text.line, text.site]))
    .update(png)
    .digest('hex');
}

/** Width and height from a PNG's IHDR chunk, or `undefined` when the bytes are not a PNG at all. */
export function pngSize(png: Buffer): [number, number] | undefined {
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) return undefined;
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

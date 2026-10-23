import { absoluteUrl } from '../config/site';
import type { Profile } from '../schema/profile';

/**
 * How the site names him in a line: above his name on both home pages, and on the share card a link
 * to the site shows.
 *
 * Built once, here, so those surfaces cannot drift apart when the role, the employer or the current
 * focus changes. The share card is a committed image, and `check-dist` compares the text its stamp
 * records against {@link cardText}, so a title change that forgets to re-render the card fails the
 * build instead of shipping a picture with the old title.
 */

type Person = Profile['person'];

/** "Applied AI Lead at PadelOS": the role and where it is held. */
function held(person: Person): string {
  return `${person.role} at ${person.employer}`;
}

/** "Applied AI Lead at PadelOS · building h9k": the role, where it is held, and what else he is building. */
export function roleLine(person: Person): string {
  return `${held(person)} · ${person.focus}`;
}

/**
 * The line above his name on the home pages: the role, the focus, then the country. It wraps on a
 * phone, so no-break spaces decide where: before each dot, so no line starts with one, and inside
 * the short focus ("building h9k"), so it never splits. The longer role may still wrap, which keeps
 * the line from overflowing a narrow screen.
 */
export function eyebrow(person: Person): string {
  return [held(person), person.focus.replaceAll(' ', ' '), person.location].join(' · ');
}

/**
 * The share card: the image platforms show for a link to any page. One card for the whole site,
 * because every page is about the same person. 1200×630 is the size Open Graph consumers ask for.
 */
export const SHARE_CARD = {
  /** Site-root path of the image. */
  path: '/og/card.png',
  /** Site-root path of its stamp: the text the image shows and the image's hash. */
  stamp: '/og/card.json',
  width: 1200,
  height: 630,
} as const;

/** The words drawn on the card. */
export interface CardText {
  name: string;
  title: string;
  line: string;
}

/** What `scripts/og-card.ts` records beside the image, and `check-dist` checks. */
export interface CardStamp {
  text: CardText;
  /** SHA-256 of the PNG, hex: proves the image is the one rendered from `text`. */
  sha256: string;
}

/** The card's words, from the profile: the same role line the pages show, and the plain headline. */
export function cardText(person: Person): CardText {
  return { name: person.name, title: roleLine(person), line: person.headline.plain };
}

/** Alt text for the card, for readers who cannot see the image. */
export function cardAlt(person: Person): string {
  return `${person.name}, ${roleLine(person)}`;
}

/** The card's absolute URL, as Open Graph requires. */
export function cardUrl(): string {
  return absoluteUrl(SHARE_CARD.path);
}

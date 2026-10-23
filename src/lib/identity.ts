import { absoluteUrl, SITE_URL } from '../config/site';
import type { CardStamp, CardText } from '../schema/card';
import type { Profile } from '../schema/profile';

/**
 * How the site names him in a line: above his name on both home pages, and on the share card a link
 * to the site shows.
 *
 * Built once, here, so those surfaces cannot drift apart when the role, the employer or the current
 * focus changes. The share card is a committed image, and `check-dist` compares the words its stamp
 * records with {@link cardText}, so a title change that forgets to re-render the card fails the build
 * instead of shipping a picture with the old title.
 */

type Person = Profile['person'];

/** A no-break space, named because the character itself is invisible in source. */
const NBSP = String.fromCharCode(0xa0);

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
  return [held(person), person.focus.replaceAll(' ', NBSP), person.location].join(`${NBSP}· `);
}

/**
 * The share card: the image platforms show for a link to any page. One card for the whole site,
 * because every page is about the same person. 1200×630 is the size Open Graph consumers ask for.
 */
export const SHARE_CARD = {
  /** Site-root path of the image. Its stamp, which is not served, is `data/og-card.json`. */
  path: '/og/card.png',
  width: 1200,
  height: 630,
} as const;

/**
 * The card's words: the same role line the pages show, the plain headline, and the site's own host
 * (from `SITE_URL`, so a move of the site re-renders the card rather than leaving the old domain).
 */
export function cardText(person: Person): CardText {
  return { name: person.name, title: roleLine(person), line: person.headline.plain, site: new URL(SITE_URL).host };
}

/**
 * Alt text: every line the card shows, for readers who cannot see it. Commas stand in for the card's
 * dot, which some screen readers read aloud.
 */
export function cardAlt(person: Person): string {
  return `${person.name}, ${held(person)}, ${person.focus}. ${person.headline.plain}`;
}

/**
 * The card's absolute URL, versioned by its seal. Link previews cache an image by its URL, so a
 * changed card needs a changed URL, or previews keep showing the old title.
 */
export function cardUrl(stamp: CardStamp): string {
  return `${absoluteUrl(SHARE_CARD.path)}?v=${stamp.seal.slice(0, 12)}`;
}

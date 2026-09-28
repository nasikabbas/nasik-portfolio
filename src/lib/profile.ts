import { parse } from 'yaml';

import raw from '../../data/profile.yaml?raw';
import { ProfileSchema, type Profile } from '../schema/profile';

/**
 * The parsed profile, shared by every page.
 *
 * Imported as raw text so the YAML is bundled with the page. Resolving it from disk at build
 * time works locally and then fails in the prerender chunk, where a module-relative path
 * resolves nowhere — a trap already documented once in a sibling project.
 *
 * Parsing here, once, means a data error fails the build at the first page that loads it,
 * with the schema's path-level message, rather than as a blank on some later page.
 */
export const profile: Profile = ProfileSchema.parse(parse(raw));

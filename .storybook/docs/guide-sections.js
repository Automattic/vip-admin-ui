/**
 * The guides in `docs/*.md` ship in the package and are what a consumer's
 * agent reads, so they stay the one copy of every rule. A family's docs pages
 * don't restate them: they render a guide one `##` section at a time and put
 * the live pieces (recipes, do/don'ts, anatomy) between the sections.
 */

/**
 * GitHub's heading slug: `Weight: what \`variant\` means` → `weight-what-variant-means`.
 * @param {string} heading A `##` heading's text.
 * @return {string} Its slug.
 */
export function slugify( heading ) {
	return heading
		.trim()
		.toLowerCase()
		.replace( /[^\p{L}\p{N}\s_-]/gu, '' )
		.replace( /\s/g, '-' );
}

/**
 * One section of a guide: the `##` heading whose slug is `slug` and
 * everything up to the next `##`. `intro` is the text between the `#` title
 * and the first `##`, without the title, which the page writes itself.
 * Throws on an unknown slug, so a renamed heading breaks the build instead of
 * silently emptying a page.
 *
 * @param {string} markdown The whole guide.
 * @param {string} slug     A heading slug, or `intro`.
 * @return {string} The section's markdown.
 */
export function guideSection( markdown, slug ) {
	const parts = markdown.split( /^(?=## )/m );
	if ( slug === 'intro' ) {
		return parts[ 0 ].replace( /^# .*\n/, '' ).trim();
	}
	const found = parts.find(
		( part ) =>
			part.startsWith( '## ' ) &&
			slugify( part.slice( 3, part.indexOf( '\n' ) ) ) === slug
	);
	if ( ! found ) {
		throw new Error( `No "## " heading with the slug "${ slug }"` );
	}
	return found.trim();
}

/**
 * Every `##` slug in a guide, in order.
 * @param {string} markdown The whole guide.
 * @return {string[]} The slugs.
 */
export function guideSlugs( markdown ) {
	return [ ...markdown.matchAll( /^## (.*)$/gm ) ].map( ( [ , heading ] ) =>
		slugify( heading )
	);
}

/**
 * Where a guide's docs live in Storybook. A family that has its three pages
 * links to its Usage page; one that doesn't yet still has a Guidelines page.
 * `i18n.md` is the Strings guide.
 */
export const FAMILY_PAGES = new Set( [
	'actions',
	'modals',
	'settings',
	'inspector',
	'graph',
	'avatar',
] );

/**
 * Which page renders each heading of each guide, as `family#slug` → page.
 * Read from the pages themselves (`<GuideSection section="…">`), and every
 * heading inside a `##` section goes with it, so an anchor lands on the page
 * that shows it.
 *
 * @param {Object<string, string>} pages  MDX source by path, `…/pages/<family>/<Page>.mdx`.
 * @param {Object<string, string>} guides Guide source by path, `…/docs/<family>.md`.
 * @return {Map<string, string>} `family#slug` → `usage`, `build` or `reference`.
 */
export function sectionPages( pages, guides ) {
	const map = new Map();
	for ( const [ path, mdx ] of Object.entries( pages ) ) {
		const match = /\/([a-z0-9-]+)\/(Usage|Build|Reference)\.mdx$/.exec(
			path
		);
		if ( ! match ) {
			continue;
		}
		const [ , family, page ] = match;
		const guide = Object.entries( guides ).find( ( [ guidePath ] ) =>
			guidePath.endsWith( `/${ family }.md` )
		)?.[ 1 ];
		for ( const [ , slug ] of mdx.matchAll( /section="([^"]+)"/g ) ) {
			const headings =
				guide && slug !== 'intro'
					? [
							...guideSection( guide, slug ).matchAll(
								/^#+ (.*)$/gm
							),
						].map( ( [ , heading ] ) => slugify( heading ) )
					: [ slug ];
			for ( const heading of headings ) {
				map.set( `${ family }#${ heading }`, page.toLowerCase() );
			}
		}
	}
	return map;
}

/**
 * The Storybook href for a link in a guide: to another guide
 * (`modals.md#useconfirm`) or to a heading of its own (`#vocabulary`). An
 * anchor goes to the page that renders its heading, per `pages`. Anything
 * else comes back unchanged.
 *
 * @param {string}              href     A link target from a guide.
 * @param {Map<string, string>} [pages]  From `sectionPages`.
 * @param {string}              [family] The guide the link is in, for `#…` links.
 * @return {string} The href to render.
 */
export function guideHref( href, pages = new Map(), family ) {
	const match = /^(?:([a-z0-9-]+)\.md)?(?:#(.*))?$/.exec( href );
	if ( ! match || ( ! match[ 1 ] && ! family ) || href === '' ) {
		return href;
	}
	const target = match[ 1 ] === 'i18n' ? 'strings' : ( match[ 1 ] ?? family );
	const anchor = match[ 2 ];
	if ( ! FAMILY_PAGES.has( target ) ) {
		return `./?path=/docs/guidelines-${ target }--docs${
			anchor ? `#${ anchor }` : ''
		}`;
	}
	const page =
		( anchor && pages.get( `${ target }#${ anchor }` ) ) || 'usage';
	return `./?path=/docs/${ target }-${ page }--docs${
		anchor ? `#${ anchor }` : ''
	}`;
}

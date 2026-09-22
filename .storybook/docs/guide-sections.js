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
		.replace( /[^\p{L}\p{N}\s-]/gu, '' )
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
export const FAMILY_PAGES = new Set( [ 'actions' ] );

/**
 * The Storybook href for a link between guides (`modals.md#useconfirm`), or
 * the href unchanged when it points anywhere else.
 *
 * @param {string} href A link target from a guide.
 * @return {string} The href to render.
 */
export function guideHref( href ) {
	const match = /^([a-z0-9-]+)\.md(#.*)?$/.exec( href );
	if ( ! match ) {
		return href;
	}
	const family = match[ 1 ] === 'i18n' ? 'strings' : match[ 1 ];
	const id = FAMILY_PAGES.has( family )
		? `${ family }-usage--docs`
		: `guidelines-${ family }--docs`;
	// ponytail: every link lands on Usage; an anchor on Build or Reference
	// scrolls nowhere. Map anchors to pages if that starts to bite.
	return `./?path=/docs/${ id }${ match[ 2 ] ?? '' }`;
}

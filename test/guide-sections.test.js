import {
	guideHref,
	guideSection,
	guideSlugs,
	slugify,
} from '../.storybook/docs/guide-sections';

const GUIDE = `# Actions

The one pattern.

## TL;DR

Rules.

## Weight: what \`variant\` means

Weight.
`;

describe( 'guide sections', () => {
	it( 'slugs headings the way GitHub does', () => {
		expect( slugify( 'Weight: what `variant` means' ) ).toBe(
			'weight-what-variant-means'
		);
		expect( slugify( 'TL;DR' ) ).toBe( 'tldr' );
	} );

	it( 'returns the intro without the title', () => {
		expect( guideSection( GUIDE, 'intro' ) ).toBe( 'The one pattern.' );
	} );

	it( 'returns a section up to the next heading', () => {
		expect( guideSection( GUIDE, 'tldr' ) ).toBe( '## TL;DR\n\nRules.' );
		expect( guideSection( GUIDE, 'weight-what-variant-means' ) ).toBe(
			'## Weight: what `variant` means\n\nWeight.'
		);
	} );

	it( 'throws on a heading that is not there', () => {
		expect( () => guideSection( GUIDE, 'size' ) ).toThrow( /size/ );
	} );

	it( 'lists every slug', () => {
		expect( guideSlugs( GUIDE ) ).toEqual( [
			'tldr',
			'weight-what-variant-means',
		] );
	} );

	it( 'routes links between guides to their Storybook page', () => {
		expect( guideHref( 'actions.md' ) ).toBe(
			'./?path=/docs/actions-usage--docs'
		);
		expect( guideHref( 'modals.md#useconfirm' ) ).toBe(
			'./?path=/docs/guidelines-modals--docs#useconfirm'
		);
		expect( guideHref( 'i18n.md' ) ).toBe(
			'./?path=/docs/guidelines-strings--docs'
		);
		expect( guideHref( 'https://example.com' ) ).toBe(
			'https://example.com'
		);
	} );
} );

/**
 * The @wordpress/scripts flat config, plus the overrides VIP plugins share:
 *
 * - jsdoc/no-undefined-types: `JSX` (React's namespace, in `@return
 *   {JSX.Element}`) is a real type the jsdoc plugin doesn't know.
 * - @wordpress/no-unsafe-wp-apis: off. Several controls we rely on are still
 *   `__experimental*` in @wordpress/components (e.g. ToggleGroupControl, the
 *   segmented control). We accept that API risk rather than hand-roll them.
 * - jsx-a11y/heading-has-content: off. Headings render as
 *   `<Text variant="heading-*" render={ <h3 /> }>…</Text>`; the rule only sees
 *   the empty `<h3 />` and can't tell that Text fills it.
 */
const wpConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	{ ignores: [ 'build-module/**', 'storybook-static/**' ] },
	...wpConfig,
	{
		rules: {
			'jsdoc/no-undefined-types': [
				'error',
				{ definedTypes: [ 'JSX' ] },
			],
			'@wordpress/no-unsafe-wp-apis': 'off',
			'jsx-a11y/heading-has-content': 'off',
		},
	},
];

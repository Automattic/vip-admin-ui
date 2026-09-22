import { transformWithOxc } from 'vite';

/**
 * WordPress code puts JSX in `.js` files, and Vite only parses JSX in `.jsx`
 * and `.tsx`. Compile this repo's own `.js` as JSX before Vite sees it. The
 * dev server's dependency scan parses the stories before any plugin runs, so it
 * gets the same instruction through `optimizeDeps` below.
 */
const jsxInJs = {
	name: 'vip-admin-ui:jsx-in-js',
	enforce: 'pre',
	transform( code, id ) {
		if ( id.includes( '/node_modules/' ) || ! /\.js$/.test( id ) ) {
			return null;
		}
		return transformWithOxc( code, id, {
			lang: 'jsx',
			jsx: { runtime: 'automatic' },
		} );
	},
};

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
	stories: [ './pages/**/*.mdx', '../src/**/*.stories.js' ],
	addons: [
		'@storybook/addon-docs',
		'@storybook/addon-a11y',
		'@storybook/addon-vitest',
	],
	framework: '@storybook/react-vite',
	viteFinal: ( viteConfig ) => ( {
		...viteConfig,
		plugins: [ jsxInJs, ...( viteConfig.plugins ?? [] ) ],
		optimizeDeps: {
			...viteConfig.optimizeDeps,
			rolldownOptions: {
				...viteConfig.optimizeDeps?.rolldownOptions,
				moduleTypes: {
					...viteConfig.optimizeDeps?.rolldownOptions?.moduleTypes,
					'.js': 'jsx',
				},
			},
		},
	} ),
};

export default config;

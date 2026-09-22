/**
 * What every family shares, written once. A Reference page notes one with
 * `<Convention name>`, Usage and Build link it with `<ConventionLink name>`,
 * and the Conventions page lists them all. Change a sentence here and every
 * page changes with it.
 */
export const CONVENTIONS = {
	setup: {
		title: 'Setup',
		body: 'Import tokens.css and reset.css once per entry, and put the vipui-page class on the admin page’s root element. Without the class, wp-admin’s own p and heading rules override WPDS text styles. Modals are covered without it.',
	},
	strings: {
		title: 'Strings',
		body: 'The package ships no translatable strings. Words a component shows on its own come from StringsProvider, and a component that needs one throws without it. Wrap each React root in the provider, with your plugin’s strings.',
	},
	layout: {
		title: 'Layout',
		body: 'A composite owns its spacing through Stack gaps. Do not add margins to its children or restyle it for spacing. A new layout is a new prop.',
	},
	'focus-ring': {
		title: 'Focus ring',
		body: 'WPDS components supply their own focus ring. Do not add another. A custom control uses the same focus-ring style.',
	},
	wpds: {
		title: 'WPDS first',
		body: 'A composite is built from @wordpress/ui, or @wordpress/components where ui has no equivalent. When WPDS ships an equivalent, the composite is removed.',
	},
};

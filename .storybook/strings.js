/**
 * English strings for Storybook only. A plugin writes its own set with `__()`
 * and its text domain — see docs/i18n.md. Never export this from the package.
 */
export const strings = {
	confirm: 'Confirm',
	cancel: 'Cancel',
	loading: 'Loading…',
	expandPanel: 'Expand panel',
	collapsePanel: 'Collapse panel',
	needsKey: 'Needs a key',
	keyRequired: 'A key is required.',
	duplicateKey: 'Duplicate key',
	duplicateKeyDetail: 'Another field already uses this key.',
	configureItem: ( name ) => `Configure ${ name }`,
	selectItem: ( name ) => `Select ${ name }`,
	reorderItem: ( name ) => `Reorder ${ name }`,
	settingValue: ( label, value ) => `${ label }: ${ value }`,
	aboutSetting: ( name ) => `About ${ name }`,
};

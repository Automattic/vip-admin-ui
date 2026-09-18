/**
 * The words this package puts on screen, supplied by the plugin using it.
 *
 * A `__()` in a shared package cannot be translated. WordPress registers a
 * plugin's JavaScript translations under that plugin's text domain, for that
 * plugin's own script handle; a string compiled into the bundle from here would
 * carry a domain no plugin loads, and `make-pot` would not extract it into the
 * plugin's POT file either. So the package holds no strings at all. Each plugin
 * writes them once, with its own `__()` and its own text domain, and hands them
 * down through `<StringsProvider>` at the root of each React tree.
 *
 * The full set of keys, as a copy-paste template, is in docs/i18n.md.
 *
 * @package
 */

import { createContext, useContext } from '@wordpress/element';

const StringsContext = createContext( null );

/**
 * @param {Object}      props          Component props.
 * @param {Object}      props.strings  Every string in docs/i18n.md, translated by the plugin.
 * @param {JSX.Element} props.children The React tree that renders this package's components.
 * @return {JSX.Element} The provider.
 */
export function StringsProvider( { strings, children } ) {
	return (
		<StringsContext.Provider value={ strings }>
			{ children }
		</StringsContext.Provider>
	);
}

/**
 * The plugin's strings. Throws without a provider rather than rendering
 * English: an untranslated fallback would ship silently to every locale.
 *
 * @return {Object} The strings passed to `<StringsProvider>`.
 */
export function useStrings() {
	const strings = useContext( StringsContext );

	if ( ! strings ) {
		throw new Error(
			'@automattic/vip-admin-ui: render this component inside <StringsProvider>. The package ships no strings of its own; see docs/i18n.md.'
		);
	}

	return strings;
}

/**
 * SettingsLoading — the one loading row for settings screens.
 *
 * The row, its centring and the gap are the `Stack`'s; the class adds only the
 * surface padding and muted tone `Stack` has no props for.
 *
 * See docs/settings.md.
 *
 * @package
 */

import { Spinner } from '@wordpress/components';
import { Stack } from '@wordpress/ui';

import { useStrings } from '../strings';

import './SettingsLoading.css';

/**
 * A spinner beside a label, while a settings screen fetches.
 *
 * @param {Object} props         Component props.
 * @param {string} [props.label] What is loading. Defaults to the plugin's `loading` string.
 * @return {JSX.Element} The loading row.
 */
export function SettingsLoading( { label } ) {
	const strings = useStrings();

	return (
		<Stack className="vipui-settings-loading" align="center" gap="sm">
			<Spinner />
			{ label || strings.loading }
		</Stack>
	);
}

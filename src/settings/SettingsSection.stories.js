import { useState } from '@wordpress/element';
import {
	Button,
	CheckboxControl,
	TextControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { Stack } from '@wordpress/ui';

import { SettingsSection } from './SettingsSection';
import { SettingsFooter } from './SettingsFooter';
import { SettingsLoading } from './SettingsLoading';

export default {
	title: 'Settings/SettingsSection',
	component: SettingsSection,
	subcomponents: { SettingsFooter, SettingsLoading },
	args: {
		title: 'Notifications',
		description: 'Who hears about a change, and how soon.',
	},
};

export const Default = {
	render: function Render( args ) {
		const [ email, setEmail ] = useState( true );
		return (
			<SettingsSection { ...args }>
				<ToggleControl
					label="Email assignees"
					help="Sends when a post is assigned to someone."
					checked={ email }
					onChange={ setEmail }
				/>
				<ToggleGroupControl
					label="Digest"
					value="daily"
					isBlock
					onChange={ () => {} }
				>
					<ToggleGroupControlOption value="off" label="Off" />
					<ToggleGroupControlOption value="daily" label="Daily" />
					<ToggleGroupControlOption value="weekly" label="Weekly" />
				</ToggleGroupControl>
			</SettingsSection>
		);
	},
};

/**
 * A whole screen: sections divided by a heading and space, the `Stack` around
 * them owning the distance between sections, and one sticky save bar.
 */
export const Screen = {
	parameters: { layout: 'fullscreen' },
	render: function Render() {
		const [ email, setEmail ] = useState( true );
		const [ lock, setLock ] = useState( false );
		return (
			<Stack direction="column" gap="2xl" className="sb-settings-screen">
				<SettingsSection
					title="Notifications"
					description="Who hears about a change, and how soon."
				>
					<ToggleControl
						label="Email assignees"
						help="Sends when a post is assigned to someone."
						checked={ email }
						onChange={ setEmail }
					/>
					<ToggleGroupControl
						label="Digest"
						value="daily"
						isBlock
						onChange={ () => {} }
					>
						<ToggleGroupControlOption value="off" label="Off" />
						<ToggleGroupControlOption value="daily" label="Daily" />
					</ToggleGroupControl>
				</SettingsSection>
				<SettingsSection title="Publishing">
					<TextControl
						label="Default reviewer"
						help="Assigned when a post enters review with nobody on it."
						value="Editorial desk"
						onChange={ () => {} }
					/>
					<CheckboxControl
						label="Lock published posts"
						help="Edits to a published post go back through review."
						checked={ lock }
						onChange={ setLock }
					/>
				</SettingsSection>
				<SettingsFooter>
					<Button variant="primary" __next40pxDefaultSize>
						Save
					</Button>
				</SettingsFooter>
			</Stack>
		);
	},
};

export const Loading = {
	render: () => <SettingsLoading />,
};

import { expect } from 'storybook/test';
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
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
	args: {
		title: 'Notifications',
		description: 'Who hears about a change, and how soon.',
	},
};

function Controls() {
	const [ email, setEmail ] = useState( true );
	return (
		<>
			<ToggleControl
				__nextHasNoMarginBottom
				label="Email assignees"
				help="Sends when a post is assigned to someone."
				checked={ email }
				onChange={ setEmail }
			/>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label="Digest"
				value="daily"
				isBlock
				onChange={ () => {} }
			>
				<ToggleGroupControlOption value="off" label="Off" />
				<ToggleGroupControlOption value="daily" label="Daily" />
				<ToggleGroupControlOption value="weekly" label="Weekly" />
			</ToggleGroupControl>
		</>
	);
}
Controls.displayName = 'Controls';

export const Default = {
	render: ( args ) => (
		<SettingsSection { ...args }>
			<Controls />
		</SettingsSection>
	),
	// The title names the group and the description describes it.
	play: async ( { canvas } ) => {
		const group = canvas.getByRole( 'group', { name: 'Notifications' } );
		await expect( group ).toHaveAccessibleDescription(
			'Who hears about a change, and how soon.'
		);
	},
};

export const TitleOnly = {
	args: { description: undefined },
	render: ( args ) => (
		<SettingsSection { ...args }>
			<Controls />
		</SettingsSection>
	),
};

/** The Stack around the sections sets the space between them; one Save for the screen. */
export const Screen = {
	parameters: {
		layout: 'fullscreen',
		// The dynamic source prints @wordpress/ui's Stack as React.ForwardRef.
		docs: {
			source: {
				code: `<Stack direction="column" gap="2xl">
	<SettingsSection
		title={ __( 'Notifications', 'my-plugin' ) }
		description={ __( 'Who hears about a change, and how soon.', 'my-plugin' ) }
	>
		<ToggleControl __nextHasNoMarginBottom … />
	</SettingsSection>
	<SettingsSection title={ __( 'Publishing', 'my-plugin' ) }>
		<TextControl __next40pxDefaultSize __nextHasNoMarginBottom … />
	</SettingsSection>
	<SettingsFooter>
		<Button variant="primary" __next40pxDefaultSize>
			{ __( 'Save', 'my-plugin' ) }
		</Button>
	</SettingsFooter>
</Stack>`,
			},
		},
	},
	// The content column is the story's frame, not part of the recipe.
	decorators: [
		( Story ) => (
			<div className="sb-settings-screen">
				<Story />
			</div>
		),
	],
	render: function Render() {
		const [ lock, setLock ] = useState( false );
		return (
			<Stack direction="column" gap="2xl">
				<SettingsSection
					title="Notifications"
					description="Who hears about a change, and how soon."
				>
					<Controls />
				</SettingsSection>
				<SettingsSection title="Publishing">
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label="Default reviewer"
						help="Assigned when a post enters review with nobody on it."
						value="Editorial desk"
						onChange={ () => {} }
					/>
					<CheckboxControl
						__nextHasNoMarginBottom
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
	play: async ( { canvas } ) => {
		await expect(
			canvas.getAllByRole( 'button', { name: 'Save' } )
		).toHaveLength( 1 );
	},
};

export const Footer = {
	render: () => (
		<SettingsFooter>
			<Button variant="primary" __next40pxDefaultSize>
				Save
			</Button>
		</SettingsFooter>
	),
	play: async ( { canvasElement } ) => {
		const footer = canvasElement.querySelector( '.vipui-settings-footer' );
		const { position } =
			canvasElement.ownerDocument.defaultView.getComputedStyle( footer );
		await expect( position ).toBe( 'sticky' );
	},
};

export const FooterSaving = {
	render: () => (
		<SettingsFooter>
			<Button variant="primary" __next40pxDefaultSize isBusy disabled>
				Save
			</Button>
		</SettingsFooter>
	),
};

export const FooterNothingToSave = {
	render: () => (
		<SettingsFooter>
			<Button variant="primary" __next40pxDefaultSize disabled>
				Save
			</Button>
		</SettingsFooter>
	),
};

export const Loading = {
	render: () => <SettingsLoading />,
};

export const LoadingWithLabel = {
	render: () => <SettingsLoading label="Loading channels…" />,
};

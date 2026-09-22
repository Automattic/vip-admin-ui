import { expect, userEvent, waitFor } from 'storybook/test';
import { ToggleControl, TextControl } from '@wordpress/components';
import { Stack, Text } from '@wordpress/ui';

import { InspectorSection } from './InspectorSection';
import { InspectorFieldListAdd } from './InspectorFieldList';
import { FIELD_KINDS } from './story-fixtures';

export default {
	title: 'Inspector/InspectorSection',
	component: InspectorSection,
	args: { title: 'Identity' },
	decorators: [
		( Story ) => (
			<div className="sb-inspector-column">
				<Story />
			</div>
		),
	],
};

const controls = (
	<>
		<TextControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label="Name"
			value="Legal review"
			onChange={ () => {} }
		/>
		<TextControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label="Key"
			value="legal-review"
			onChange={ () => {} }
		/>
	</>
);

export const Default = {
	render: ( args ) => (
		<InspectorSection { ...args }>{ controls }</InspectorSection>
	),
};

export const WithHelp = {
	args: { help: 'The key is what the REST API and exports call this stage.' },
	render: ( args ) => (
		<InspectorSection { ...args }>{ controls }</InspectorSection>
	),
};

/** `actions` puts a control in the heading row, beside the title. */
export const WithActions = {
	args: {
		title: 'Fields',
		actions: (
			<InspectorFieldListAdd
				label="Add field"
				addOptions={ FIELD_KINDS }
				onAdd={ () => {} }
			/>
		),
	},
	render: ( args ) => (
		<InspectorSection { ...args }>
			<Text
				variant="body-sm"
				render={ <p /> }
				className="vipui-inspector-section__help"
			>
				No fields yet.
			</Text>
		</InspectorSection>
	),
};

/** For groups that don't earn permanent space. `summary` stays visible while shut. */
export const Collapsible = {
	args: { title: 'Automation', summary: 'Off', collapsible: true },
	render: ( args ) => (
		<InspectorSection { ...args }>
			<ToggleControl
				__nextHasNoMarginBottom
				label="Run checks on entry"
				checked={ false }
				onChange={ () => {} }
			/>
		</InspectorSection>
	),
	play: async ( { canvas } ) => {
		const trigger = canvas.getByRole( 'button', { name: /Automation/ } );
		await expect( trigger ).toHaveAttribute( 'aria-expanded', 'false' );
		await userEvent.click( trigger );
		await expect( trigger ).toHaveAttribute( 'aria-expanded', 'true' );
		// The panel animates open. FormToggle's own input is opacity 0, so
		// look for its label.
		await waitFor( () =>
			expect( canvas.getByText( 'Run checks on entry' ) ).toBeVisible()
		);
	},
};

/** Sections in a panel body: the parent Stack owns the gap, each section draws its rule. */
export const Stacked = {
	render: () => (
		<Stack direction="column" gap="lg">
			<InspectorSection title="Identity">{ controls }</InspectorSection>
			<InspectorSection title="Automation" summary="Off" collapsible>
				<ToggleControl
					__nextHasNoMarginBottom
					label="Run checks on entry"
					checked={ false }
					onChange={ () => {} }
				/>
			</InspectorSection>
			<InspectorSection title="Advanced" summary="2 settings" collapsible>
				{ controls }
			</InspectorSection>
		</Stack>
	),
};

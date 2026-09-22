import { expect, userEvent, waitFor } from 'storybook/test';
import { ToggleControl, TextControl } from '@wordpress/components';
import { Stack } from '@wordpress/ui';

import { InspectorSection } from './InspectorSection';
import {
	InspectorFieldList,
	InspectorFieldListAdd,
} from './InspectorFieldList';
import { FIELD_KINDS, describeField } from './story-fixtures';

// Recipe snippets are written out: a production build minifies component names,
// so the dynamic source would print them mangled.
export default {
	title: 'Inspector/InspectorSection',
	component: InspectorSection,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
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
	parameters: {
		docs: {
			source: {
				code: `<InspectorSection
	title={ __( 'Fields', 'my-plugin' ) }
	actions={
		<InspectorFieldListAdd
			label={ __( 'Add field', 'my-plugin' ) }
			addOptions={ kinds }
			onAdd={ addField }
		/>
	}
>
	<InspectorFieldList
		items={ fields }
		onChange={ setFields }
		describe={ describeField }
		removeLabel={ __( 'Remove field', 'my-plugin' ) }
		emptyLabel={ __( 'No fields yet.', 'my-plugin' ) }
	/>
</InspectorSection>`,
			},
		},
	},
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
			<InspectorFieldList
				items={ [] }
				onChange={ () => {} }
				describe={ describeField }
				removeLabel="Remove field"
				emptyLabel="No fields yet."
			/>
		</InspectorSection>
	),
};

/** For groups that don't earn permanent space. `summary` stays visible while shut. */
export const Collapsible = {
	parameters: {
		docs: {
			source: {
				code: `<InspectorSection
	title={ __( 'Automation', 'my-plugin' ) }
	summary={ automated ? __( 'On', 'my-plugin' ) : __( 'Off', 'my-plugin' ) }
	collapsible
>
	<ToggleControl
		__nextHasNoMarginBottom
		label={ __( 'Run checks on entry', 'my-plugin' ) }
		checked={ automated }
		onChange={ setAutomated }
	/>
</InspectorSection>`,
			},
		},
	},
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
	parameters: {
		docs: {
			source: {
				code: `<Stack direction="column" gap="lg" align="stretch">
	<InspectorSection title={ __( 'Identity', 'my-plugin' ) }>
		{ identityControls }
	</InspectorSection>
	<InspectorSection title={ __( 'Automation', 'my-plugin' ) } summary={ summary } collapsible>
		{ automationControls }
	</InspectorSection>
</Stack>`,
			},
		},
	},
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

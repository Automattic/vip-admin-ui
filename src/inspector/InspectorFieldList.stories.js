import { expect, userEvent, within } from 'storybook/test';
import { useState } from '@wordpress/element';

import {
	InspectorFieldList,
	InspectorFieldListAdd,
} from './InspectorFieldList';
import { InspectorSection } from './InspectorSection';
import {
	FIELDS,
	FIELD_KINDS,
	describeField,
	newField,
	renderFieldConfig,
} from './story-fixtures';

export default {
	title: 'Inspector/InspectorFieldList',
	component: InspectorFieldList,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
	subcomponents: { InspectorFieldListAdd },
	decorators: [
		( Story ) => (
			<div className="sb-inspector-column">
				<Story />
			</div>
		),
	],
};

function Demo( { initial, ...props } ) {
	const [ fields, setFields ] = useState( initial );
	return (
		<InspectorSection
			title="Fields"
			actions={
				<InspectorFieldListAdd
					label="Add field"
					addOptions={ FIELD_KINDS }
					onAdd={ ( type ) =>
						setFields( ( f ) => [ ...f, newField( type ) ] )
					}
				/>
			}
		>
			<InspectorFieldList
				items={ fields }
				onChange={ setFields }
				describe={ describeField }
				removeLabel="Remove field"
				emptyLabel="No fields yet."
				{ ...props }
			/>
		</InspectorSection>
	);
}

Demo.displayName = 'Demo';

const keyed = {
	keyOf: ( field ) => field.key,
	isStarted: ( field ) => Boolean( field.label ),
	renderConfig: renderFieldConfig,
};

/** Click a row to configure it; drag the grip (or focus it and use the arrow keys) to reorder. */
export const Configurable = {
	// The story's state lives in a helper the snippet would print as `<Demo>`.
	parameters: {
		docs: {
			source: {
				code: `<InspectorSection
	title={ __( 'Fields', 'my-plugin' ) }
	actions={
		<InspectorFieldListAdd
			label={ __( 'Add field', 'my-plugin' ) }
			addOptions={ kinds }
			onAdd={ ( type ) => setFields( [ ...fields, newField( type ) ] ) }
		/>
	}
>
	<InspectorFieldList
		items={ fields }
		onChange={ setFields }
		keyOf={ ( field ) => field.key }
		isStarted={ ( field ) => Boolean( field.label ) }
		describe={ describeField }
		renderConfig={ ( { item, problem, update } ) => (
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Key', 'my-plugin' ) }
				value={ item.key }
				help={ problem?.full }
				onChange={ ( key ) => update( { key } ) }
			/>
		) }
		removeLabel={ __( 'Remove field', 'my-plugin' ) }
		emptyLabel={ __( 'No fields yet.', 'my-plugin' ) }
	/>
</InspectorSection>`,
			},
		},
	},
	render: () => <Demo initial={ FIELDS } { ...keyed } />,
	play: async ( { canvas, canvasElement } ) => {
		const body = within( canvasElement.ownerDocument.body );
		await userEvent.click(
			canvas.getByRole( 'button', { name: 'Configure Headline' } )
		);
		await expect(
			await body.findByRole( 'textbox', { name: 'Key' } )
		).toHaveValue( 'headline' );
	},
};

/** The second item to use a key is the collision, flagged on its row as it is typed. */
export const DuplicateKey = {
	render: () => (
		<Demo
			initial={ [
				...FIELDS,
				{ label: 'Dek', key: 'kicker', type: 'text', required: false },
			] }
			{ ...keyed }
		/>
	),
};

export const EmptyList = {
	render: () => <Demo initial={ [] } { ...keyed } />,
	play: async ( { canvas, canvasElement } ) => {
		const body = within( canvasElement.ownerDocument.body );
		await expect( canvas.getByText( 'No fields yet.' ) ).toBeVisible();
		await userEvent.click(
			canvas.getByRole( 'button', { name: 'Add field' } )
		);
		await userEvent.click(
			await body.findByRole( 'menuitem', { name: /Text/ } )
		);
		await expect( canvas.queryByText( 'No fields yet.' ) ).toBeNull();
	},
};

/** No `renderConfig`: rows select elsewhere instead of opening a popover. */
export const Navigable = {
	parameters: {
		docs: {
			source: {
				code: `<InspectorFieldList
	items={ steps }
	onChange={ setSteps }
	describe={ describeStep }
	sortable={ false }
	onItemSelect={ ( step ) => selectStep( step.id ) }
	removeLabel={ __( 'Remove step', 'my-plugin' ) }
	emptyLabel={ __( 'No steps yet.', 'my-plugin' ) }
/>`,
			},
		},
	},
	render: () => (
		<Demo initial={ FIELDS } sortable={ false } onItemSelect={ () => {} } />
	),
};

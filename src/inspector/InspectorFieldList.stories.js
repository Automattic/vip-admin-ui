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

const keyed = {
	keyOf: ( field ) => field.key,
	isStarted: ( field ) => Boolean( field.label ),
	renderConfig: renderFieldConfig,
};

/** Click a row to configure it; drag the grip (or focus it and use the arrow keys) to reorder. */
export const Configurable = {
	render: () => <Demo initial={ FIELDS } { ...keyed } />,
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
	render: () => (
		<Demo initial={ FIELDS } sortable={ false } onItemSelect={ () => {} } />
	),
};

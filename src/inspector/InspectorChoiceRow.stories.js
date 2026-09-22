import { expect } from 'storybook/test';
import { useState } from '@wordpress/element';

import { InspectorChoiceRow } from './InspectorChoiceRow';
import { ROLES } from './story-fixtures';

export default {
	title: 'Inspector/InspectorChoiceRow',
	component: InspectorChoiceRow,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
	decorators: [
		( Story ) => (
			<div className="sb-inspector-column">
				<Story />
			</div>
		),
	],
};

function Demo( { initial } ) {
	const [ selected, setSelected ] = useState( initial );
	return (
		<InspectorChoiceRow
			label="Who can move posts on"
			help="Leave everything unticked to let anyone who can edit the post move it."
			options={ ROLES }
			selected={ selected }
			onToggle={ ( value ) =>
				setSelected( ( current ) =>
					current.includes( value )
						? current.filter( ( v ) => v !== value )
						: [ ...current, value ]
				)
			}
			noneLabel="Everyone"
			countLabel={ ( n ) => `${ n } roles` }
			unknownHelp="Not a role on this site. Untick it to clear it."
		/>
	);
}

Demo.displayName = 'Demo';

export const Names = {
	parameters: {
		docs: {
			source: {
				code: `<InspectorChoiceRow
	label={ __( 'Who can move posts on', 'my-plugin' ) }
	options={ roles } // [ { value, label, help? } ]
	selected={ selected }
	onToggle={ toggleRole }
	noneLabel={ __( 'Everyone', 'my-plugin' ) }
	countLabel={ ( n ) => sprintf( _n( '%d role', '%d roles', n, 'my-plugin' ), n ) }
	unknownHelp={ __( 'Not a role on this site.', 'my-plugin' ) }
/>`,
			},
		},
	},
	render: () => <Demo initial={ [ 'editor', 'author' ] } />,
	play: async ( { canvas } ) => {
		await expect(
			canvas.getByRole( 'button', { name: /Who can move posts on/ } )
		).toHaveTextContent( /Editor, Author/ );
	},
};

/** Past the character budget, the value counts instead of naming. */
export const Count = {
	render: () => (
		<Demo
			initial={ [ 'administrator', 'editor', 'author', 'contributor' ] }
		/>
	),
	play: async ( { canvas } ) => {
		await expect(
			canvas.getByRole( 'button', { name: /Who can move posts on/ } )
		).toHaveTextContent( '4 roles' );
	},
};

export const None = { render: () => <Demo initial={ [] } /> };

/** A stored value the site has no option for still gets a box. */
export const UnknownValue = {
	render: () => <Demo initial={ [ 'editor', 'legal_reviewer' ] } />,
};

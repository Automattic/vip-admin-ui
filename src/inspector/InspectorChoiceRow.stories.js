import { useState } from '@wordpress/element';

import { InspectorChoiceRow } from './InspectorChoiceRow';
import { ROLES } from './story-fixtures';

export default {
	title: 'Inspector/InspectorChoiceRow',
	component: InspectorChoiceRow,
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

export const Names = {
	render: () => <Demo initial={ [ 'editor', 'author' ] } />,
};

/** Past the character budget, the value counts instead of naming. */
export const Count = {
	render: () => (
		<Demo
			initial={ [ 'administrator', 'editor', 'author', 'contributor' ] }
		/>
	),
};

export const None = { render: () => <Demo initial={ [] } /> };

/** A stored value the site has no option for still gets a box. */
export const UnknownValue = {
	render: () => <Demo initial={ [ 'editor', 'legal_reviewer' ] } />,
};

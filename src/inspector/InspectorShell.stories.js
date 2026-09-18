import { useState } from '@wordpress/element';
import { ToggleControl } from '@wordpress/components';
import { Stack, Text } from '@wordpress/ui';

import { InspectorShell, InspectorCollapseContext } from './InspectorShell';
import { InspectorSection } from './InspectorSection';
import { Fact } from './InspectorFacts';
import {
	InspectorFieldList,
	InspectorFieldListAdd,
} from './InspectorFieldList';
import { InspectorChoiceRow } from './InspectorChoiceRow';
import { InspectorDangerZone } from './InspectorDangerZone';
import {
	FIELDS,
	FIELD_KINDS,
	ROLES,
	describeField,
	newField,
	renderFieldConfig,
} from './story-fixtures';

export default {
	title: 'Inspector/InspectorShell',
	component: InspectorShell,
	args: { eyebrow: 'Stage', title: 'Legal review' },
	decorators: [
		( Story ) => (
			<div className="sb-inspector-frame">
				<Story />
			</div>
		),
	],
};

/**
 * The whole kit in one panel: read-out facts, a choice row, an orderable field
 * list with its Add control in the section heading, a collapsible section, and
 * the one destructive control ending the body.
 */
export const Panel = {
	render: function Render( args ) {
		const [ collapsed, setCollapsed ] = useState( false );
		const [ roles, setRoles ] = useState( [ 'editor' ] );
		const [ fields, setFields ] = useState( FIELDS );
		const [ automated, setAutomated ] = useState( false );

		const toggleRole = ( role ) =>
			setRoles( ( current ) =>
				current.includes( role )
					? current.filter( ( r ) => r !== role )
					: [ ...current, role ]
			);

		return (
			<InspectorCollapseContext.Provider
				value={ {
					collapsed,
					toggle: () => setCollapsed( ( c ) => ! c ),
				} }
			>
				<InspectorShell { ...args }>
					<Stack direction="column" gap="lg">
						<InspectorSection title="Placement">
							<Stack
								render={ <ul /> }
								direction="column"
								gap="xs"
								className="vipui-inspector__facts"
							>
								<Fact label="Post status" value="Pending" />
								<Fact
									label="Checkpoint"
									value="Review"
									tip="Posts can't leave this region until someone signs off."
								/>
								<Fact label="Due" value="Not set" empty />
							</Stack>
						</InspectorSection>
						<InspectorSection title="Access">
							<InspectorChoiceRow
								label="Who can move posts on"
								options={ ROLES }
								selected={ roles }
								onToggle={ toggleRole }
								noneLabel="Everyone"
								countLabel={ ( n ) => `${ n } roles` }
								unknownHelp="Not a role on this site."
							/>
						</InspectorSection>
						<InspectorSection
							title="Fields"
							help="What a writer fills in before the post can move on."
							actions={
								<InspectorFieldListAdd
									label="Add field"
									addOptions={ FIELD_KINDS }
									onAdd={ ( type ) =>
										setFields( ( f ) => [
											...f,
											newField( type ),
										] )
									}
								/>
							}
						>
							<InspectorFieldList
								items={ fields }
								onChange={ setFields }
								keyOf={ ( field ) => field.key }
								isStarted={ ( field ) =>
									Boolean( field.label )
								}
								describe={ describeField }
								renderConfig={ renderFieldConfig }
								removeLabel="Remove field"
								emptyLabel="No fields yet."
							/>
						</InspectorSection>
						<InspectorSection
							title="Automation"
							summary={ automated ? 'On' : 'Off' }
							collapsible
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label="Run checks on entry"
								checked={ automated }
								onChange={ setAutomated }
							/>
						</InspectorSection>
						<InspectorDangerZone
							label="Delete stage"
							onClick={ () => {} }
						/>
					</Stack>
				</InspectorShell>
			</InspectorCollapseContext.Provider>
		);
	},
};

/** No `InspectorCollapseContext` provider: the panel has no collapse toggle. */
export const NotCollapsible = {
	args: { eyebrow: 'Connection', title: 'Start' },
	render: ( args ) => (
		<InspectorShell { ...args }>
			<Text
				variant="body-sm"
				render={ <p /> }
				className="vipui-inspector__help"
			>
				Every new post enters here. Drag from this node to choose the
				first stage.
			</Text>
		</InspectorShell>
	),
};

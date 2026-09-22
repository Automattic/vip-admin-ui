import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { useState } from '@wordpress/element';
import { plus, trash } from '@wordpress/icons';

import { GraphCanvas } from './GraphCanvas';
import {
	BANDS_FLOW,
	EXITS_FLOW,
	FLOW,
	ROUTING_FLOW,
	STATES_FLOW,
	useGraph,
} from './story-fixtures';

export default {
	title: 'Graph/GraphCanvas',
	component: GraphCanvas,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: {
		layout: 'fullscreen',
		docs: { source: { type: 'dynamic' } },
	},
	decorators: [
		// The canvas fills its container. On the canvas that is the viewport; on
		// a docs page, 100vh is the whole page, so the frame gets a fixed height.
		( Story, { viewMode } ) => (
			<div
				className="sb-graph-frame"
				style={ viewMode === 'docs' ? { height: 560 } : undefined }
			>
				<Story />
			</div>
		),
	],
};

// A graph story's dynamic snippet would print every fixture node and edge.
// These are the props a plugin writes instead.
const snippet = ( code ) => ( { docs: { source: { code } } } );

/**
 * Drag a card to move it, drag off a card's grip onto another to connect them,
 * or release on empty canvas to grow a new card. Select an edge to move its
 * ends. Right-click anything.
 */
export const Default = {
	render: function Render() {
		const { props, setEdges, addNodeAt } = useGraph( FLOW );
		const { onConnect, onDeleteNode, onDeleteEdge } = props;
		return (
			<GraphCanvas
				{ ...props }
				fitView
				onConnectToPane={ ( { source, sourceHandle, position } ) => {
					const id = addNodeAt( position );
					onConnect( { source, target: id, sourceHandle } );
				} }
				onReconnect={ ( edge, end, nodeId ) =>
					setEdges( ( current ) =>
						current.map( ( e ) =>
							e.id === edge.id ? { ...e, [ end ]: nodeId } : e
						)
					)
				}
				reconnectVerdict={ ( edge, end, nodeId ) => {
					// Only the far end grows a card; nothing lands on Start,
					// and nothing leaves End.
					if ( ! nodeId ) {
						return end === 'target' ? 'create' : 'invalid';
					}
					if (
						( end === 'target' && nodeId === 'start' ) ||
						( end === 'source' && nodeId === 'end' )
					) {
						return 'invalid';
					}
					return 'valid';
				} }
				reconnectGhost={ ( { position } ) => ( {
					x: position.x - 100,
					y: position.y - 40,
				} ) }
				onReconnectToPane={ ( edge, end, { position } ) => {
					const id = addNodeAt( position );
					setEdges( ( current ) =>
						current.map( ( e ) =>
							e.id === edge.id ? { ...e, target: id } : e
						)
					);
				} }
				moveSourceLabel="Drag to move where this edge starts"
				moveTargetLabel="Drag to move where this edge goes"
				contextMenu={ ( target ) => {
					if ( target.kind === 'node' ) {
						return {
							label: 'Step actions',
							items: [
								{
									id: 'delete',
									icon: trash,
									label: 'Delete step',
									onSelect: () => onDeleteNode( target.id ),
								},
							],
						};
					}
					if ( target.kind === 'edge' ) {
						return {
							label: 'Edge actions',
							items: [
								{
									id: 'delete',
									icon: trash,
									label: 'Delete edge',
									onSelect: () =>
										onDeleteEdge( { id: target.id } ),
								},
							],
						};
					}
					return {
						label: 'Canvas actions',
						items: [
							{
								id: 'add',
								icon: plus,
								label: 'Add step',
								onSelect: () => addNodeAt( target.position ),
							},
						],
					};
				} }
			/>
		);
	},
};

/**
 * A node whose exits mean different things gets a badge per exit instead of
 * the grip; hover it to see them. Each exit's edge wears its tone and leaves by
 * its glyph. Fail and error go to the same place as one record, so both lines
 * carry the link mark.
 */
export const NamedExits = {
	parameters: snippet( `const exits = [
	{ id: 'pass', icon: check, tone: 'success', title: __( 'On pass', 'my-plugin' ), routed: true },
	{ id: 'fail', icon: close, tone: 'error', title: __( 'On fail', 'my-plugin' ), routed: true },
];

const node = {
	id: 'check',
	type: GRAPH_NODE_TYPE,
	...GRAPH_NODE_SIZE,
	position,
	data: { label: __( 'Automated check', 'my-plugin' ), exits },
};

// An edge leaving by an exit names it in sourceHandle.
const edge = { id: 'check:pass->scheduled', source: 'check', target: 'scheduled', sourceHandle: 'pass' };` ),
	render: function Render() {
		return <GraphCanvas { ...useGraph( EXITS_FLOW ).props } fitView />;
	},
};

/** Default, selected, warning, accent, raised, and a footer badge; and an edge that is disabled. */
export const CardStates = {
	// a11y todo (#3): `.vipui-graph-node__meta` on a selected card is 4.11:1.
	parameters: { a11y: { test: 'todo' } },
	play: async ( { canvas } ) => {
		// A warning's strings are the flag's accessible name.
		await expect(
			await canvas.findByRole( 'img', { name: 'Nothing leads here.' } )
		).toBeInTheDocument();
	},
	render: function Render() {
		return (
			<GraphCanvas
				{ ...useGraph( STATES_FLOW, { node: 'Selected' } ).props }
				fitView
			/>
		);
	},
};

/**
 * A line passing behind a card breaks short of it, with a cup at each end and
 * the hidden span dotted over the card. Lines travelling together gather into
 * a bundle at one pitch. Drag the cards to watch the ports re-plan.
 */
export const Routing = {
	parameters:
		snippet( `// Plain React Flow edges. The canvas plans every path.
const edges = [
	{ id: 'intake->archive', source: 'intake', target: 'archive', data: { label: __( 'Skip triage', 'my-plugin' ) } },
	{ id: 'research->write', source: 'research', target: 'write' },
];

<GraphCanvas nodes={ nodes } edges={ edges } fitView />` ),
	render: function Render() {
		return <GraphCanvas { ...useGraph( ROUTING_FLOW ).props } fitView />;
	},
};

/**
 * A selected edge shows a ring on each end. Drag one onto another card to
 * move it: the line says what a drop would do while it's held — its own tone
 * where it would land, grey where nothing changes, red where it's refused.
 */
export const Rewiring = {
	parameters: snippet( `<GraphCanvas
	{ ...props }
	selectedEdgeId={ selectedEdgeId }
	onReconnect={ ( edge, end, nodeId ) => moveEnd( edge.id, end, nodeId ) }
	reconnectVerdict={ ( edge, end, nodeId ) =>
		canMoveEnd( edge, end, nodeId ) ? 'valid' : 'invalid'
	}
	moveSourceLabel={ __( 'Drag to move where this edge starts', 'my-plugin' ) }
	moveTargetLabel={ __( 'Drag to move where this edge goes', 'my-plugin' ) }
/>` ),
	render: function Render() {
		const { props, setEdges } = useGraph( FLOW, {
			edge: 'Copy edit->Legal',
		} );
		return (
			<GraphCanvas
				{ ...props }
				fitView
				onReconnect={ ( edge, end, nodeId ) =>
					setEdges( ( current ) =>
						current.map( ( e ) =>
							e.id === edge.id ? { ...e, [ end ]: nodeId } : e
						)
					)
				}
				reconnectVerdict={ ( edge, end, nodeId ) =>
					nodeId === 'start' || nodeId === 'end' ? 'invalid' : 'valid'
				}
				moveSourceLabel="Drag to move where this edge starts"
				moveTargetLabel="Drag to move where this edge goes"
			/>
		);
	},
};

/**
 * Bands are sections of the canvas: a line across the whole pane and a label
 * pinned to its left edge, at any pan or zoom. Click a label to select it.
 */
export const Bands = {
	// a11y todo (#5): React Flow's attribution link is 2.76:1 on the band background.
	parameters: {
		a11y: { test: 'todo' },
		...snippet( `<GraphCanvas
	{ ...props }
	bands={ bands }
	selectedBand={ selectedBand }
	onSelectBand={ setSelectedBand }
	dropBand={ bandUnderDrag }
/>` ),
	},
	play: async ( { canvas } ) => {
		const draft = await canvas.findByRole( 'button', { name: /Draft/ } );
		await userEvent.click( draft );
		await expect( draft ).toHaveClass( 'is-selected' );
	},
	render: function Render() {
		const [ selectedBand, setSelectedBand ] = useState( 'pending' );
		return (
			<GraphCanvas
				{ ...useGraph( BANDS_FLOW ).props }
				bands={ BANDS_FLOW.bands }
				selectedBand={ selectedBand }
				onSelectBand={ setSelectedBand }
				dropBand="publish"
				// `fitView` frames the nodes, not the bands; the padding keeps
				// the top band's line and label in view.
				fitView
				fitViewOptions={ { padding: 0.25 } }
			/>
		);
	},
};

/** A "Reset layout" button joins the zoom controls when there's a layout to reset. */
export const ResetLayout = {
	parameters: snippet( `<GraphCanvas
	{ ...props }
	onResetLayout={ resetLayout }
	resetLayoutLabel={ __( 'Reset layout', 'my-plugin' ) }
/>` ),
	play: async ( { canvas } ) => {
		await expect(
			await canvas.findByRole( 'button', { name: 'Reset layout' } )
		).toBeInTheDocument();
	},
	render: function Render() {
		return (
			<GraphCanvas
				{ ...useGraph( FLOW ).props }
				fitView
				onResetLayout={ () => {} }
				resetLayoutLabel="Reset layout"
			/>
		);
	},
};

/** Right-click the canvas: the menu names what it acts on and takes focus. */
export const ContextMenu = {
	...Default,
	parameters: snippet( `contextMenu={ ( target ) =>
	target.kind === 'node'
		? { label: __( 'Step actions', 'my-plugin' ), items: [ /* … */ ] }
		: { label: __( 'Canvas actions', 'my-plugin' ), items: [ /* … */ ] }
}` ),
	play: async ( { canvasElement } ) => {
		const pane = await waitFor( () => {
			const found = canvasElement.querySelector( '.react-flow__pane' );
			if ( ! found ) {
				throw new Error( 'No pane yet' );
			}
			return found;
		} );
		fireEvent.contextMenu( pane, { clientX: 400, clientY: 40 } );
		const menu = await within(
			canvasElement.ownerDocument.body
		).findByRole( 'menu', { name: 'Canvas actions' } );
		await waitFor( () =>
			expect(
				within( menu ).getByRole( 'menuitem', { name: 'Add step' } )
			).toHaveFocus()
		);
	},
};

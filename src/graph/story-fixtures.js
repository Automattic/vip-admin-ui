/**
 * Shared graphs for the canvas stories. Not exported from the package.
 *
 * A plugin projects its own model into nodes and edges and lays them out; these
 * are hand-placed so each story shows one thing.
 */

import { useCallback, useRef, useState } from '@wordpress/element';
import {
	check,
	close,
	error,
	login,
	postList,
	published,
} from '@wordpress/icons';

import { GRAPH_NODE_SIZE, GRAPH_NODE_TYPE } from './GraphNode';
import { GRAPH_TERMINAL_SIZE, GRAPH_TERMINAL_TYPE } from './GraphTerminal';

export const card = ( id, x, y, data ) => ( {
	id,
	type: GRAPH_NODE_TYPE,
	position: { x, y },
	...GRAPH_NODE_SIZE,
	data: { label: id, ...data },
} );

export const terminal = ( id, kind, label, x, y ) => ( {
	id,
	type: GRAPH_TERMINAL_TYPE,
	position: { x, y },
	...GRAPH_TERMINAL_SIZE,
	selectable: false,
	draggable: false,
	deletable: false,
	focusable: false,
	data: { kind, label },
} );

export const edge = ( source, target, data = {}, sourceHandle = null ) => ( {
	id: sourceHandle
		? `${ source }:${ sourceHandle }->${ target }`
		: `${ source }->${ target }`,
	source,
	target,
	sourceHandle,
	data: { label: `Move to ${ target }`, ...data },
} );

// Structural edges carry no label, so they get no pill.
const bare = ( source, target ) => ( {
	...edge( source, target ),
	data: {},
	reconnectable: false,
} );

/** A plain flow: a column, a side branch, and a back edge. */
export const FLOW = {
	nodes: [
		terminal( 'start', 'start', 'Start', 40, 0 ),
		card( 'Draft', 0, 90, { meta: '1 edge', icon: login } ),
		card( 'Copy edit', 0, 250, { meta: '2 edges' } ),
		card( 'Legal', 300, 250, { meta: '2 edges' } ),
		card( 'Scheduled', 0, 410, {
			meta: '1 edge',
			badge: { icon: published, label: 'Publishes' },
		} ),
		terminal( 'end', 'end', 'End', 40, 560 ),
	],
	edges: [
		bare( 'start', 'Draft' ),
		edge( 'Draft', 'Copy edit' ),
		edge( 'Copy edit', 'Legal' ),
		edge( 'Legal', 'Copy edit' ),
		edge( 'Copy edit', 'Scheduled' ),
		edge( 'Legal', 'Draft', { label: 'Send back to Draft' } ),
		bare( 'Scheduled', 'end' ),
	],
};

// A plugin's own tone for a kind of node; here, one from the palette.
const ACCENT = 'var(--vipui-color-collaborator-stroke-1)';

const EXITS = [
	{ id: 'pass', icon: check, tone: 'success', title: 'On pass' },
	{ id: 'fail', icon: close, tone: 'error', title: 'On fail' },
	{ id: 'error', icon: error, tone: 'caution', title: 'On error' },
];

/**
 * A node with named exits. Fail and error are routed to the same place, which
 * is one record drawn twice, so both lines wear the link mark.
 */
export const EXITS_FLOW = {
	nodes: [
		card( 'Draft', 150, 0 ),
		card( 'Automated check', 150, 160, {
			accent: ACCENT,
			exits: EXITS.map( ( exit ) => ( { ...exit, routed: true } ) ),
		} ),
		card( 'Copy edit', 0, 340 ),
		card( 'Scheduled', 300, 340 ),
	],
	edges: [
		edge( 'Draft', 'Automated check' ),
		edge( 'Automated check', 'Scheduled', {}, 'pass' ),
		edge(
			'Automated check',
			'Copy edit',
			{ linkLabel: 'On fail and On error share one edge' },
			'fail'
		),
		edge(
			'Automated check',
			'Copy edit',
			{ linkLabel: 'On fail and On error share one edge' },
			'error'
		),
		edge( 'Copy edit', 'Draft', { label: 'Send back to Draft' } ),
	],
};

/** Every card state, and a disabled edge. */
export const STATES_FLOW = {
	nodes: [
		card( 'Default', 0, 0, { meta: '1 edge' } ),
		card( 'Selected', 260, 0, { meta: '1 edge' } ),
		card( 'Warning', 520, 0, {
			warnings: [ 'Nothing leads here.' ],
		} ),
		card( 'Accent', 0, 180, {
			accent: ACCENT,
			meta: '1 edge',
		} ),
		card( 'Raised', 260, 180, { raised: true, icon: login } ),
		card( 'Badge', 520, 180, {
			badge: { icon: published, label: 'Publishes' },
			description: 'Final step',
		} ),
	],
	edges: [
		edge( 'Default', 'Accent' ),
		edge( 'Selected', 'Raised' ),
		edge( 'Accent', 'Raised', { disabled: true, label: 'Held' } ),
		edge( 'Raised', 'Badge' ),
	],
};

/**
 * Edges that pass behind a card break around it, and edges that travel
 * together gather into a bundle.
 */
export const ROUTING_FLOW = {
	nodes: [
		card( 'Intake', 0, 0 ),
		card( 'Triage', 0, 170 ),
		card( 'Archive', 0, 340 ),
		card( 'Research', 380, 0 ),
		card( 'Interview', 380, 110 ),
		card( 'Write', 700, 340 ),
		card( 'Fact check', 380, 340 ),
	],
	edges: [
		edge( 'Intake', 'Triage' ),
		edge( 'Triage', 'Archive' ),
		// Straight down the column, behind Triage.
		edge( 'Intake', 'Archive', { label: 'Skip triage' } ),
		// Two edges that travel side by side.
		edge( 'Research', 'Write' ),
		edge( 'Interview', 'Write' ),
		edge( 'Fact check', 'Write' ),
	],
};

/** Cards grouped into bands, with one sitting on a band's border. */
export const BANDS_FLOW = {
	nodes: [
		card( 'Pitch', 0, 40 ),
		card( 'Outline', 260, 40 ),
		card( 'Review', 130, 190, { raised: true, icon: login } ),
		card( 'Revise', 0, 330 ),
		card( 'Approve', 260, 330 ),
		card( 'Live', 130, 530 ),
	],
	edges: [
		edge( 'Pitch', 'Outline' ),
		edge( 'Outline', 'Review' ),
		edge( 'Review', 'Revise' ),
		edge( 'Revise', 'Review' ),
		edge( 'Review', 'Approve' ),
		edge( 'Approve', 'Live' ),
	],
	bands: [
		{ id: 'draft', y: 0, label: 'Draft', meta: '2 nodes', icon: postList },
		{
			id: 'pending',
			y: 230,
			label: 'Pending',
			meta: '3 nodes',
			icon: postList,
		},
		{
			id: 'publish',
			y: 480,
			label: 'Published',
			meta: '1 node',
			icon: postList,
		},
	],
};

/**
 * A story's graph as state: positions follow drags, selection follows clicks,
 * and connections, deletions and rewiring edit the edge list — the minimum a
 * plugin does to drive the canvas.
 *
 * @param {Object} initial   `{ nodes, edges }`.
 * @param {Object} selection Starting `{ node, edge }`.
 * @return {Object} `props` for `GraphCanvas`, and the two setters the
 *                  stories that edit the graph need.
 */
export function useGraph( initial, selection = {} ) {
	const [ nodes, setNodes ] = useState( initial.nodes );
	const [ edges, setEdges ] = useState( initial.edges );
	const [ selectedNodeId, setSelectedNode ] = useState(
		selection.node ?? null
	);
	const [ selectedEdgeId, setSelectedEdge ] = useState(
		selection.edge ?? null
	);

	const onNodesChange = useCallback( ( moves ) => {
		setNodes( ( current ) =>
			current.map( ( node ) => {
				const move = moves.find( ( m ) => m.id === node.id );
				return move ? { ...node, position: move.position } : node;
			} )
		);
	}, [] );

	const onSelectNode = useCallback( ( id ) => {
		setSelectedNode( id );
		setSelectedEdge( null );
	}, [] );
	const onSelectEdge = useCallback( ( id ) => {
		setSelectedEdge( id );
		setSelectedNode( null );
	}, [] );
	const onClearSelection = useCallback( () => {
		setSelectedNode( null );
		setSelectedEdge( null );
	}, [] );

	const onConnect = useCallback(
		( { source, target, sourceHandle } ) =>
			setEdges( ( current ) => {
				const next = edge( source, target, {}, sourceHandle );
				return current.some( ( e ) => e.id === next.id )
					? current
					: [ ...current, next ];
			} ),
		[]
	);

	const added = useRef( 0 );
	const addNodeAt = useCallback( ( position ) => {
		added.current += 1;
		const id = `New step ${ added.current }`;
		setNodes( ( current ) => [
			...current,
			card(
				id,
				position.x - GRAPH_NODE_SIZE.width / 2,
				position.y - GRAPH_NODE_SIZE.height / 2
			),
		] );
		return id;
	}, [] );

	const onDeleteNode = useCallback( ( id ) => {
		setNodes( ( current ) => current.filter( ( n ) => n.id !== id ) );
		setEdges( ( current ) =>
			current.filter( ( e ) => e.source !== id && e.target !== id )
		);
	}, [] );

	const onDeleteEdge = useCallback(
		( gone ) =>
			setEdges( ( current ) =>
				current.filter( ( e ) => e.id !== gone.id )
			),
		[]
	);

	return {
		props: {
			nodes,
			edges,
			selectedNodeId,
			selectedEdgeId,
			onNodesChange,
			onSelectNode,
			onSelectEdge,
			onClearSelection,
			onConnect,
			onDeleteNode,
			onDeleteEdge,
		},
		setEdges,
		addNodeAt,
	};
}

/**
 * GraphCanvas — a node/edge canvas built on `@xyflow/react`.
 *
 * The shell wires the kit's parts into React Flow and leaves every decision
 * about what the graph *means* to the plugin. It renders `GraphNode` cards,
 * `GraphTerminal` pills and `GraphEdge` lines, plans every edge together
 * (`EdgePlanProvider`), draws the marks that have to clear the cards
 * (`GraphEdgeOverlay`), the grab handles that move a selected edge's ends
 * (`GraphEdgeAnchors`), screen-space bands (`GraphBands`), and a right-click
 * menu (`GraphContextMenu`).
 *
 * **The flow is controlled, and the plugin owns it.** `nodes` and `edges` come
 * in positioned — layout is the plugin's (dagre, hand placement, whatever it
 * keeps) — and every change goes back out through a callback. Structure is
 * read-only as far as React Flow's store is concerned: its `select` and
 * `remove` changes are dropped, and only position changes reach
 * `onNodesChange`, so a node the author drags can be recorded.
 *
 * **Selection is the plugin's too.** `selectedNodeId` and `selectedEdgeId` are
 * drawn; a click, or Enter/Space on a focused card or line, reports through
 * `onSelectNode` / `onSelectEdge`. React Flow's own keyboard activation only
 * emits a `select` change and never a click, so without the key handler here a
 * keyboard author could reach every card and open none. Not read back from the
 * store's selection either: in a controlled flow the store catches up in an
 * effect after render, so it reports the *previous* selection.
 *
 * **Edges are rewired by their ends, not by React Flow.** Its reconnect anchors
 * sit on the handle an edge nominally uses, and this canvas plans its own ports,
 * so they would land nowhere near the line. `edgesReconnectable` stays off and
 * `GraphEdgeAnchors` draws the ends where the edge actually ends, on the
 * selected edge only. Pass `onReconnect` to turn it on, and `reconnectVerdict`
 * to say — while the end is still held — what a drop would do.
 *
 * **A connection dropped on empty canvas** reports `onConnectToPane` with the
 * point it was released at, so the plugin can grow the node the drag was
 * reaching for. Escape abandons a connection drag: `XYHandle` ends one only on
 * release, and on this canvas a release over empty space *means* something.
 *
 * Every callback that carries a pointer position carries it twice: `client`,
 * in viewport px, and `position`, in flow coordinates — the canvas holds the
 * React Flow instance, so the plugin doesn't have to.
 *
 * Paint order, bottom to top: backdrop nodes (`zIndex: 0`, set by the plugin),
 * edges (`1`), cards and pills (`2`). The canvas fills in the last two when a
 * node or edge doesn't set its own. React Flow floors a node's z-index at 0, so
 * a backdrop can't go below the edges — the edges have to be lifted above it.
 *
 * Import React Flow's stylesheet once from your entry (see docs/graph.md);
 * this package can't, because the file is named `style.css`.
 *
 * @package
 */

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import {
	ReactFlow,
	ReactFlowProvider,
	Background,
	BackgroundVariant,
	Controls,
	ControlButton,
	useReactFlow,
	useStoreApi,
} from '@xyflow/react';
import { Icon } from '@wordpress/ui';
import { rotateLeft } from '@wordpress/icons';

import { EdgePlanProvider } from './EdgePlanProvider';
import { GraphNode, GRAPH_NODE_TYPE } from './GraphNode';
import { GraphTerminal, GRAPH_TERMINAL_TYPE } from './GraphTerminal';
import { GraphEdge, GRAPH_EDGE_TYPE } from './GraphEdge';
import { GraphEdgeOverlay } from './GraphEdgeOverlay';
import { GraphEdgeAnchors, landingNode } from './GraphEdgeAnchors';
import { GraphBands } from './GraphBands';
import { GraphContextMenu } from './GraphContextMenu';

import './graph.css';

const KIT_NODE_TYPES = {
	[ GRAPH_NODE_TYPE ]: GraphNode,
	[ GRAPH_TERMINAL_TYPE ]: GraphTerminal,
};
const KIT_EDGE_TYPES = { [ GRAPH_EDGE_TYPE ]: GraphEdge };

// Paint order: backdrop 0 (the plugin's), edges, then cards.
const EDGE_Z = 1;
const NODE_Z = 2;

// Zoom range. The floor goes below React Flow's default 0.5 so a long graph
// can be read end to end.
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

// A controlled flow needs change handlers to stay quiet; edge changes are
// driven entirely by `edges`, so this one only opts in.
const noop = () => {};

// One empty list, so a canvas with no backdrops doesn't hand every memo below a
// new array on each render.
const NO_TYPES = [];

/**
 * Sort a batch of React Flow `position` changes into the three things they can
 * mean.
 *
 * The change's own `dragging` flag doesn't say: React Flow emits
 * `dragging: false` for the closing change of a pointer drag, for an aborted
 * one, *and* for a discrete keyboard move, which is not part of a drag at all.
 * What separates them is whether that node had a drag in flight. A pointer drag
 * reaches its closing change only after at least one `dragging: true` change,
 * and an abort emits its closing change from inside the same session. A
 * keyboard move arrives with nothing in flight.
 *
 * Exported for plugins that record where the author puts things: a keyboard
 * step never reaches `onNodeDragStop`, so it has to be committed from
 * `onNodesChange`, or the next layout snaps the node back while React Flow's
 * live region says it moved.
 *
 * @param {Array}       moves    Position changes carrying a position.
 * @param {Set<string>} inFlight Node ids with a pointer drag in progress. Read
 *                               and updated in place — ids go in as their drag
 *                               starts moving and come out as it ends.
 * @return {{ moving: Array, released: Array, stepped: Array }} `moving` are
 *         in-flight drag positions; `released` are the ids whose drag just
 *         ended, dropped or aborted alike; `stepped` are the keyboard moves.
 */
export function classifyPositionChanges( moves, inFlight ) {
	const moving = [];
	const released = [];
	const stepped = [];
	moves.forEach( ( move ) => {
		if ( move.dragging ) {
			inFlight.add( move.id );
			moving.push( move );
			return;
		}
		if ( inFlight.delete( move.id ) ) {
			released.push( move.id );
			return;
		}
		stepped.push( move );
	} );
	return { moving, released, stepped };
}

/**
 * The tone a named exit gives the edges that leave by it.
 *
 * @param {Map}    nodesById Nodes by id.
 * @param {Object} edge      The edge.
 * @return {?Object} The exit (`{ id, icon, tone }`), or null.
 */
function exitOf( nodesById, edge ) {
	if ( ! edge.sourceHandle ) {
		return null;
	}
	const exits = nodesById.get( edge.source )?.data?.exits;
	return exits?.find( ( exit ) => exit.id === edge.sourceHandle ) || null;
}

function Flow( {
	nodes: nodesProp,
	edges: edgesProp,
	nodeTypes: extraNodeTypes,
	edgeTypes: extraEdgeTypes,
	backdropTypes,
	bands = [],
	selectedBand = null,
	dropBand = null,
	onSelectBand,
	selectedNodeId = null,
	selectedEdgeId = null,
	onSelectNode,
	onSelectEdge,
	onClearSelection,
	onNodesChange,
	onDeleteNode,
	onDeleteEdge,
	onConnect,
	onConnectToPane,
	reconnectEnds,
	reconnectVerdict,
	reconnectGhost,
	onReconnect,
	onReconnectToPane,
	moveSourceLabel,
	moveTargetLabel,
	contextMenu,
	onResetLayout,
	resetLayoutLabel,
	className,
	children,
	...flowProps
} ) {
	const { screenToFlowPosition } = useReactFlow();
	const store = useStoreApi();
	const viewportRef = useRef( null );

	const nodeTypes = useMemo(
		() => ( { ...KIT_NODE_TYPES, ...extraNodeTypes } ),
		[ extraNodeTypes ]
	);
	const edgeTypes = useMemo(
		() => ( { ...KIT_EDGE_TYPES, ...extraEdgeTypes } ),
		[ extraEdgeTypes ]
	);

	// A pointer position in both coordinate spaces.
	const at = useCallback(
		( clientX, clientY ) => ( {
			client: { x: clientX, y: clientY },
			position: screenToFlowPosition( { x: clientX, y: clientY } ),
		} ),
		[ screenToFlowPosition ]
	);

	// --- State the canvas owns ----------------------------------------------

	// Hover comes from React Flow's edge events (its edges carry a wide
	// invisible interaction stroke). Those cover the pill too: it is portalled
	// out of the edge's `<g>` in the DOM but not in the React tree, so moving
	// between line and pill neither leaves nor re-enters the edge. It rides in
	// `data` because the pill renders in a separate DOM subtree the edge's class
	// can't reach, and as a class, because the overlay reads its tones from the
	// edge's className.
	const [ hoveredEdgeId, setHoveredEdgeId ] = useState( null );

	// Node hover isn't in React Flow's store. The overlay needs it: exit badges
	// paint on hover, and a mark landing on one yields for exactly that long.
	const [ hoveredNodeId, setHoveredNodeId ] = useState( null );

	// The edge one of whose ends is being dragged. Its line is hidden while it
	// is: the drag line is where that edge now goes, and drawing both says it
	// is in two places at once.
	const [ reconnectingEdgeId, setReconnectingEdgeId ] = useState( null );

	// True while a node is under the pointer: easing is suspended, since eased
	// transforms would leave the node and its edges trailing the cursor.
	const [ draggingNode, setDraggingNode ] = useState( false );
	const draggingIdsRef = useRef( new Set() );

	// --- Decoration -----------------------------------------------------------

	const nodesById = useMemo(
		() => new Map( nodesProp.map( ( node ) => [ node.id, node ] ) ),
		[ nodesProp ]
	);

	const nodes = useMemo(
		() =>
			nodesProp.map( ( node ) => ( {
				...node,
				zIndex:
					node.zIndex ??
					( backdropTypes.includes( node.type ) ? 0 : NODE_Z ),
				selected: node.id === selectedNodeId,
			} ) ),
		[ nodesProp, backdropTypes, selectedNodeId ]
	);

	const edges = useMemo(
		() =>
			edgesProp.map( ( edge ) => {
				const exit = exitOf( nodesById, edge );
				const disabled = Boolean( edge.data?.disabled );
				const hovered = edge.id === hoveredEdgeId;
				const reconnecting = edge.id === reconnectingEdgeId;
				return {
					...edge,
					type: edge.type ?? GRAPH_EDGE_TYPE,
					zIndex: edge.zIndex ?? EDGE_Z,
					selected: edge.id === selectedEdgeId,
					className: [
						edge.className,
						// Selecting a node lights up where it leads: every edge
						// leaving it is drawn in the selected tone.
						selectedNodeId &&
							edge.source === selectedNodeId &&
							'is-outbound',
						// An exit's edge wears the exit's tone at all times, so
						// two lines between the same pair of cards can be told
						// apart at rest. Unless disabled, so the disabled rules
						// never have to out-rank the hues.
						! disabled && exit && `is-exit is-tone-${ exit.tone }`,
						disabled && 'is-disabled',
						hovered && 'is-hovered',
						reconnecting && 'is-reconnecting',
					]
						.filter( Boolean )
						.join( ' ' ),
					data: { ...edge.data, hovered, reconnecting },
				};
			} ),
		[
			edgesProp,
			nodesById,
			selectedNodeId,
			selectedEdgeId,
			hoveredEdgeId,
			reconnectingEdgeId,
		]
	);

	// The glyph an exit's departure mark carries, by edge id.
	const exitIcons = useMemo( () => {
		const icons = {};
		edgesProp.forEach( ( edge ) => {
			const exit = exitOf( nodesById, edge );
			if ( exit ) {
				icons[ edge.id ] = exit.icon;
			}
		} );
		return icons;
	}, [ edgesProp, nodesById ] );

	// --- Node moves -----------------------------------------------------------

	// Position changes are the one kind of node change worth keeping. `select`
	// and `remove` are dropped: selection is the plugin's, and structure flows
	// in through `nodes`.
	const handleNodesChange = useCallback(
		( changes ) => {
			const moves = changes.filter(
				( change ) => change.type === 'position' && change.position
			);
			if ( moves.length === 0 ) {
				return;
			}
			const { moving } = classifyPositionChanges(
				moves,
				draggingIdsRef.current
			);
			setDraggingNode( moving.length > 0 );
			onNodesChange?.( moves );
		},
		[ onNodesChange ]
	);

	// --- Selection ------------------------------------------------------------

	const isSelectable = useCallback(
		( id ) => {
			const node = nodesById.get( id );
			return Boolean( node ) && node.selectable !== false;
		},
		[ nodesById ]
	);

	// Enter or Space on a focused card or line, handed to the same callbacks a
	// click uses. Only the card or line itself: Enter on a control inside a
	// card is that control's.
	const handleKeyDown = useCallback(
		( event ) => {
			if ( event.key !== 'Enter' && event.key !== ' ' ) {
				return;
			}
			const id = event.target.getAttribute?.( 'data-id' );
			if ( event.target.classList?.contains( 'react-flow__node' ) ) {
				if ( isSelectable( id ) ) {
					onSelectNode?.( id );
				}
			} else if (
				event.target.classList?.contains( 'react-flow__edge' )
			) {
				onSelectEdge?.( id );
			}
		},
		[ isSelectable, onSelectNode, onSelectEdge ]
	);

	// --- Connections ----------------------------------------------------------

	// Escape abandons a connection drag. `cancelConnection` is React Flow's own
	// teardown, but it closes through `onPointerUp`, which still reports
	// `onConnect` and `onConnectEnd` from the state it had reached — this flag
	// is what tells those two the gesture was abandoned.
	const connectAborted = useRef( false );

	useEffect( () => {
		const onKeyDown = ( event ) => {
			if ( event.key !== 'Escape' ) {
				return;
			}
			const { connection, cancelConnection } = store.getState();
			if ( ! connection.inProgress ) {
				return;
			}
			connectAborted.current = true;
			cancelConnection();
		};
		document.addEventListener( 'keydown', onKeyDown );
		return () => document.removeEventListener( 'keydown', onKeyDown );
	}, [ store ] );

	const handleConnectStart = useCallback( () => {
		connectAborted.current = false;
	}, [] );

	const handleConnect = useCallback(
		( connection ) => {
			if ( connectAborted.current || ! onConnect ) {
				return;
			}
			if ( connection.source && connection.target ) {
				onConnect( {
					source: connection.source,
					target: connection.target,
					sourceHandle: connection.sourceHandle || null,
				} );
			}
		},
		[ onConnect ]
	);

	// A connection released on empty canvas. Only a drag off a *source* handle
	// qualifies — a node grown this way flows out of its source.
	const handleConnectEnd = useCallback(
		( event, connectionState ) => {
			// Cleared here because this is the last of the two callbacks a
			// release fires.
			if ( connectAborted.current ) {
				connectAborted.current = false;
				return;
			}
			if (
				! onConnectToPane ||
				connectionState.isValid ||
				connectionState.fromHandle?.type !== 'source' ||
				! connectionState.fromNode
			) {
				return;
			}
			const pointer =
				'changedTouches' in event ? event.changedTouches[ 0 ] : event;
			// Landing on anything but empty canvas is a cancelled connection,
			// not a request for a node. Nodes render inside the pane, so being
			// within it isn't enough; a backdrop node is empty canvas.
			const target =
				'changedTouches' in event
					? document.elementFromPoint(
							pointer.clientX,
							pointer.clientY
						)
					: event.target;
			if (
				! target?.closest?.( '.react-flow__pane' ) ||
				landingNode( target, backdropTypes )
			) {
				return;
			}
			onConnectToPane( {
				source: connectionState.fromNode.id,
				sourceHandle: connectionState.fromHandle?.id || null,
				...at( pointer.clientX, pointer.clientY ),
			} );
		},
		[ onConnectToPane, backdropTypes, at ]
	);

	// --- Rewiring -------------------------------------------------------------

	// Anchors belong to the selected edge only. Selection rather than hover:
	// reaching an anchor takes the pointer off the line, so an anchor put
	// there by hover would unmount and flicker.
	const anchorEdge = useMemo( () => {
		if ( ! selectedEdgeId || ! onReconnect ) {
			return null;
		}
		const edge = edges.find( ( e ) => e.id === selectedEdgeId );
		if ( ! edge || edge.reconnectable === false ) {
			return null;
		}
		const ends = reconnectEnds?.( edge ) ?? { source: true, target: true };
		if ( ! ends.source && ! ends.target ) {
			return null;
		}
		return { ...edge, ends };
	}, [ selectedEdgeId, edges, onReconnect, reconnectEnds ] );

	const verdictFor = useCallback(
		( edge, end, nodeId, { onPane, client } ) => {
			if ( ! nodeId ) {
				return onPane && reconnectVerdict
					? reconnectVerdict(
							edge,
							end,
							null,
							at( client.x, client.y )
						)
					: 'invalid';
			}
			const unchanged =
				end === 'source'
					? edge.source === nodeId
					: edge.target === nodeId;
			if ( unchanged ) {
				return 'unchanged';
			}
			return reconnectVerdict
				? reconnectVerdict(
						edge,
						end,
						nodeId,
						at( client.x, client.y )
					)
				: 'valid';
		},
		[ reconnectVerdict, at ]
	);

	const ghostFor = useCallback(
		( client ) => reconnectGhost?.( at( client.x, client.y ) ) ?? null,
		[ reconnectGhost, at ]
	);

	const handleReconnectToPane = useCallback(
		( edge, end, client ) =>
			onReconnectToPane?.( edge, end, at( client.x, client.y ) ),
		[ onReconnectToPane, at ]
	);

	// --- Right-click menu -----------------------------------------------------

	// `{ x, y, label, items }`, in px from the canvas's own box. Resolved when
	// it opens: panning, zooming or clicking closes it before it could go stale.
	const [ menu, setMenu ] = useState( null );
	const closeMenu = useCallback( () => setMenu( null ), [] );

	// Ask the plugin what the thing under the pointer offers. A node or edge
	// with nothing to offer gets the canvas's own menu, and one that does is
	// selected, exactly as a left-click would — the menu carries its verbs and
	// the inspector behind them carries the rest.
	const openMenuFor = useCallback(
		( event, kind, id = null ) => {
			if ( ! contextMenu ) {
				return;
			}
			event.preventDefault();
			const rect = viewportRef.current?.getBoundingClientRect();
			if ( ! rect ) {
				return;
			}
			const point = at( event.clientX, event.clientY );
			let resolved = contextMenu( { kind, id, ...point } );
			if ( resolved && kind === 'node' ) {
				onSelectNode?.( id );
			} else if ( resolved && kind === 'edge' ) {
				onSelectEdge?.( id );
			} else if ( ! resolved && kind !== 'pane' ) {
				resolved = contextMenu( { kind: 'pane', id: null, ...point } );
			}
			if ( ! resolved?.items?.length ) {
				setMenu( null );
				return;
			}
			setMenu( {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
				...resolved,
			} );
		},
		[ contextMenu, at, onSelectNode, onSelectEdge ]
	);

	return (
		<div
			className={ [
				'vipui-graph',
				draggingNode && 'is-dragging',
				// The grab cursor for an end in flight is claimed here: the
				// anchors stop taking pointer events for the length of the drag,
				// and an element that never hit-tests never paints a cursor.
				reconnectingEdgeId && 'is-rewiring',
				className,
			]
				.filter( Boolean )
				.join( ' ' ) }
			ref={ viewportRef }
		>
			<ReactFlow
				minZoom={ MIN_ZOOM }
				maxZoom={ MAX_ZOOM }
				// Double-click zoom fights double-clicking a node.
				zoomOnDoubleClick={ false }
				{ ...flowProps }
				onKeyDown={ handleKeyDown }
				nodes={ nodes }
				edges={ edges }
				nodeTypes={ nodeTypes }
				edgeTypes={ edgeTypes }
				onNodesChange={ handleNodesChange }
				onEdgesChange={ noop }
				// Selection is drawn from props, so React Flow's automatic
				// elevation would only lift a backdrop over its own cards.
				elevateNodesOnSelect={ false }
				// Off on purpose; see `GraphEdgeAnchors`.
				edgesReconnectable={ false }
				onConnectStart={ handleConnectStart }
				onConnect={ handleConnect }
				onConnectEnd={ handleConnectEnd }
				onEdgeMouseEnter={ ( _e, edge ) => setHoveredEdgeId( edge.id ) }
				onEdgeMouseLeave={ () => setHoveredEdgeId( null ) }
				onNodeMouseEnter={ ( _e, node ) => setHoveredNodeId( node.id ) }
				onNodeMouseLeave={ () => setHoveredNodeId( null ) }
				// A pan or zoom slides a card out from under a still pointer
				// with no mouse event, and a stale id would keep a mark
				// yielding to a badge that is no longer painted.
				onMoveStart={ () => setHoveredNodeId( null ) }
				onMove={ closeMenu }
				onNodeClick={ ( _e, node ) =>
					isSelectable( node.id )
						? onSelectNode?.( node.id )
						: onClearSelection?.()
				}
				onEdgeClick={ ( _e, edge ) => onSelectEdge?.( edge.id ) }
				onPaneClick={ () => onClearSelection?.() }
				onPaneContextMenu={ ( event ) => openMenuFor( event, 'pane' ) }
				onNodeContextMenu={ ( event, node ) =>
					openMenuFor(
						event,
						backdropTypes.includes( node.type ) ? 'pane' : 'node',
						node.id
					)
				}
				onEdgeContextMenu={ ( event, edge ) =>
					openMenuFor( event, 'edge', edge.id )
				}
				onNodesDelete={ ( deleted ) =>
					deleted.forEach( ( n ) => onDeleteNode?.( n.id ) )
				}
				onEdgesDelete={ ( deleted ) =>
					deleted.forEach( ( e ) => onDeleteEdge?.( e ) )
				}
			>
				<Background
					variant={ BackgroundVariant.Dots }
					gap={ 16 }
					size={ 1 }
					className="vipui-graph__background"
				/>
				<GraphBands
					bands={ bands }
					selectedBand={ selectedBand }
					dropBand={ dropBand }
					onSelectBand={ onSelectBand }
					onContextMenu={ ( event, id ) =>
						openMenuFor( event, 'band', id )
					}
				/>
				<Controls showInteractive={ false }>
					{ onResetLayout && (
						<ControlButton
							onClick={ onResetLayout }
							title={ resetLayoutLabel }
							aria-label={ resetLayoutLabel }
						>
							<Icon icon={ rotateLeft } size={ 16 } />
						</ControlButton>
					) }
				</Controls>
				<GraphEdgeOverlay
					hoveredNodeId={ hoveredNodeId }
					exitIcons={ exitIcons }
				/>
				<GraphEdgeAnchors
					anchor={ anchorEdge }
					verdictFor={ verdictFor }
					ghostFor={ ghostFor }
					onReconnect={ onReconnect }
					onReconnectToPane={ handleReconnectToPane }
					onDragChange={ setReconnectingEdgeId }
					backdropTypes={ backdropTypes }
					sourceLabel={ moveSourceLabel }
					targetLabel={ moveTargetLabel }
				/>
				{ children }
			</ReactFlow>
			{ menu && (
				<GraphContextMenu
					x={ menu.x }
					y={ menu.y }
					items={ menu.items }
					label={ menu.label }
					onClose={ closeMenu }
				/>
			) }
		</div>
	);
}

/**
 * A node/edge canvas. See docs/graph.md for the props and the node and edge
 * data each part reads.
 *
 * @param {Object}   props               Canvas props.
 * @param {string[]} props.backdropTypes Node types that are ground, not
 *                                       obstacles or landings.
 * @return {JSX.Element} The canvas.
 */
export function GraphCanvas( { backdropTypes = NO_TYPES, ...props } ) {
	return (
		<ReactFlowProvider>
			<EdgePlanProvider backdropTypes={ backdropTypes }>
				<Flow backdropTypes={ backdropTypes } { ...props } />
			</EdgePlanProvider>
		</ReactFlowProvider>
	);
}

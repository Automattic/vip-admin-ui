/**
 * EdgePlanProvider — the whole canvas's edges, planned in one pass.
 *
 * Ports, spreads, bundles, and underpass breaks are cross-edge decisions
 * (`edge-pipeline.js`), so an edge component can no longer plan itself from
 * its own two nodes: planning runs here, once per geometry change, and each
 * `GraphEdge` reads its finished plan from context. Node geometry lives
 * in React Flow's store rather than in the nodes we pass it — a controlled
 * flow keeps measurements internal — so this reads `nodeLookup`, and leans on
 * the store firing on both position changes and measurement. The equality
 * checks are what keep that from becoming a re-plan of every edge on
 * unrelated store activity, like a selection.
 *
 * Backdrop nodes are excluded from the geometry. A node that spans a band is a
 * node as far as React Flow is concerned, but it is the ground the cards stand
 * on — a repelling rectangle containing every other rectangle would leave
 * nothing plannable. A start terminal is included, and flagged, because its
 * one exit is pinned rather than routed (`edge-pipeline.js`).
 *
 * Port smoothing is the pipeline's one stateful pass: its per-edge easing
 * memory lives in a ref here, and while any jump is still easing the provider
 * schedules another frame and re-plans with the advanced clock.
 *
 * @package
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { useStore } from '@xyflow/react';
import { buildEdgePlans } from './edge-pipeline';
import { GRAPH_TERMINAL_TYPE } from './GraphTerminal';

const EdgePlanContext = createContext( { plans: {}, portOrder: {} } );

/**
 * Every measured, routable node as a plain rectangle.
 *
 * @param {Object}      state         React Flow store state.
 * @param {Set<string>} backdropTypes Node types that are ground, not obstacles.
 * @return {Array<{ id: string, x: number, y: number, width: number, height: number, pinnedExit: boolean }>}
 *         Node rectangles in flow coordinates.
 */
function selectRects( state, backdropTypes ) {
	const rects = [];
	state.nodeLookup.forEach( ( node ) => {
		if ( backdropTypes.has( node.type ) || node.hidden ) {
			return;
		}
		const width = node.measured?.width;
		const height = node.measured?.height;
		// Unmeasured on the first paint, and nothing to plan between yet.
		if ( ! width || ! height ) {
			return;
		}
		const { x, y } = node.internals.positionAbsolute;
		rects.push( {
			id: node.id,
			x,
			y,
			width,
			height,
			pinnedExit:
				node.type === GRAPH_TERMINAL_TYPE &&
				node.data?.kind === 'start',
		} );
	} );
	return rects;
}

function sameRects( a, b ) {
	return (
		a.length === b.length &&
		a.every( ( rect, index ) => {
			const other = b[ index ];
			return (
				rect.id === other.id &&
				rect.x === other.x &&
				rect.y === other.y &&
				rect.width === other.width &&
				rect.height === other.height &&
				rect.pinnedExit === other.pinnedExit
			);
		} )
	);
}

/**
 * The facts about an edge the pipeline actually plans from. Selection, hover
 * and the rest of `data` deliberately excluded — they change the drawing's
 * tones, not its geometry.
 *
 * @param {Object} state React Flow store state.
 * @return {Array<{ id: string, source: string, target: string, sourceHandle: ?string }>}
 *         Plannable edges.
 */
function selectEdges( state ) {
	return state.edges.map( ( edge ) => ( {
		id: edge.id,
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle || null,
	} ) );
}

function sameEdges( a, b ) {
	return (
		a.length === b.length &&
		a.every( ( edge, index ) => {
			const other = b[ index ];
			return (
				edge.id === other.id &&
				edge.source === other.source &&
				edge.target === other.target &&
				edge.sourceHandle === other.sourceHandle
			);
		} )
	);
}

/**
 * Publishes finished edge plans to the components beneath it. Belongs inside
 * `ReactFlowProvider` (it reads the store) and around `ReactFlow` (edges and
 * nodes render within it).
 *
 * @param {Object}                    props
 * @param {string[]}                  props.backdropTypes Node types left out of
 *                                                        the geometry.
 * @param {import('react').ReactNode} props.children      Canvas.
 * @return {JSX.Element} Provider.
 */
export function EdgePlanProvider( { backdropTypes = [], children } ) {
	const backdropKey = backdropTypes.join( '|' );
	const select = useCallback(
		( state ) => selectRects( state, new Set( backdropKey.split( '|' ) ) ),
		[ backdropKey ]
	);
	const rects = useStore( select, sameRects );
	const edges = useStore( selectEdges, sameEdges );

	// Port-easing state, carried between frames. Keyed by edge id; stale
	// entries are dropped when their edge goes.
	const memoryRef = useRef( {} );
	const frameRef = useRef( null );
	const [ tick, setTick ] = useState( 0 );

	const value = useMemo( () => {
		const rectsById = {};
		rects.forEach( ( rect ) => {
			rectsById[ rect.id ] = rect;
		} );

		const memory = memoryRef.current;
		const known = new Set( edges.map( ( edge ) => edge.id ) );
		Object.keys( memory ).forEach( ( id ) => {
			if ( ! known.has( id ) ) {
				delete memory[ id ];
			}
		} );

		const now =
			typeof performance !== 'undefined' ? performance.now() : Date.now();
		const { plans, portOrder, animating } = buildEdgePlans(
			edges,
			rectsById,
			memory,
			now
		);
		return { plans, portOrder, animating };
		// The tick is a dependency on purpose: each animation frame bumps it,
		// invalidating the memo so the smoothing clock (`now`) advances even
		// though nothing else changed.
	}, [ rects, edges, tick ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// While a port jump is easing, re-plan on the next frame with the clock
	// advanced. The effect re-arms after every render the easing is still
	// live in, and the last frame (easing finished) schedules nothing.
	useEffect( () => {
		if ( ! value.animating || frameRef.current ) {
			return undefined;
		}
		frameRef.current = window.requestAnimationFrame( () => {
			frameRef.current = null;
			setTick( ( t ) => t + 1 );
		} );
		return () => {
			if ( frameRef.current ) {
				window.cancelAnimationFrame( frameRef.current );
				frameRef.current = null;
			}
		};
	} );

	return (
		<EdgePlanContext.Provider value={ value }>
			{ children }
		</EdgePlanContext.Provider>
	);
}

/**
 * The finished plan for one edge, or null before its nodes are measured.
 *
 * @param {string} id Edge id.
 * @return {Object|null} `{ d, mid, plan, tunnel }` or null.
 */
export function useEdgePlan( id ) {
	const { plans } = useContext( EdgePlanContext );
	return plans[ id ] || null;
}

/**
 * The order a node's named-exit edges leave in, or null when it has none.
 *
 * @param {string} id Node id.
 * @return {?Array} Exit ids in port order.
 */
export function usePortOrder( id ) {
	const { portOrder } = useContext( EdgePlanContext );
	return portOrder[ id ] || null;
}

/**
 * Every finished plan, for canvas-level layers (the underpass ghosts).
 *
 * @return {Object} Plans by edge id.
 */
export function useEdgePlans() {
	const { plans } = useContext( EdgePlanContext );
	return plans;
}

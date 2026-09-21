/**
 * GraphEdgeAnchors — the grab handles that move an edge's endpoints.
 *
 * React Flow ships this gesture, and this canvas cannot use it. Its reconnect
 * anchors are placed from the *handle* an edge nominally uses, and here an edge
 * does not end at its handle: ports are planned across the whole canvas at once
 * (`edge-pipeline.js`), so the anchors would sit on every card's top border
 * while the line they belonged to visibly arrived somewhere else. So the grab
 * target goes where the edge actually ends: `plan.source` and `plan.target`,
 * the same two points `GraphEdgeOverlay` stamps the socket and arrowhead on.
 *
 * So the anchor sits *on the mark*, and the rest follows from that:
 *
 * - **The layer is the overlay's.** An anchor under a card is not merely
 *   invisible, it is unclickable, so this draws in a `ViewportPortal` above the
 *   nodes, like `GraphEdgeOverlay`, and unlike it takes pointer events — on the
 *   circles only, never on the sheet, so the canvas beneath stays live.
 *
 * - **Only the selected edge has anchors,** and they are painted rather than
 *   invisible: a ring at the socket and at the arrowhead saying "this end
 *   moves". Selection rather than hover is load-bearing: an anchor revealed by
 *   hover flickers, because reaching it takes the pointer off the very edge
 *   that put it there.
 *
 * - **The drag is this file's, not React Flow's.** A React Flow connection
 *   would have to start at a handle and could only land on another, so moving
 *   an edge's *source* end would mean hitting a 22px grip instead of the card.
 *   Dragging here hit-tests the node under the pointer, so both ends land on a
 *   whole card.
 *
 * **What a drop means is not decided here.** Every endpoint the drag offers is
 * answered by the plugin (`verdictFor`), so the line is only ever drawn as
 * droppable where the commit will be accepted, and a refused move reads as
 * refused *while it is held there* instead of springing back unexplained on
 * release. Over a card the answer is asked once per landing; over open canvas
 * it is asked per frame, because there it can depend on *where* — the band
 * under the pointer, say.
 *
 * **What is committed is where the pointer was let go**, hit-tested again on
 * the release rather than read off the last `pointermove`: browsers coalesce
 * moves under load, so a flick can end somewhere no move ever reported.
 *
 * Released on empty canvas with a `'create'` verdict, the end grows the node it
 * was reaching for, previewed as a ghost card at the drop point.
 *
 * Pointer-only, like the connect gesture it belongs beside: the anchors are
 * painted on a decorative layer with no focus target. Deleting the edge and
 * drawing a new one remains the non-pointer route, so an inspector should
 * offer another way to change an edge's ends.
 *
 * @package
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import {
	Position,
	ViewportPortal,
	getBezierPath,
	useReactFlow,
} from '@xyflow/react';

import { useEdgePlan } from './EdgePlanProvider';
import { arrowTip, outward } from './edge-geometry';
import { useSourceHandles } from './source-handles';
import { GRAPH_NODE_SIZE } from './GraphNode';

/**
 * The invisible circle the pointer has to be inside to grab an end, and the
 * painted ring that says it is there. The grab is wider than the ring for the
 * same reason the edge carries a wide invisible hit stroke: the mark is small
 * and the pointer is not precise.
 */
const GRAB_RADIUS = 11;
const RING_RADIUS = 4.5;

/**
 * The border a curve leaves by, mirrored — where the free end of a drag is
 * assumed to arrive from while it is still over open canvas. React Flow's own
 * connection line does the same with the handle it started at.
 */
const OPPOSITE = {
	[ Position.Top ]: Position.Bottom,
	[ Position.Bottom ]: Position.Top,
	[ Position.Left ]: Position.Right,
	[ Position.Right ]: Position.Left,
};

/**
 * Push a point clear of a handle rect, along the border's outward normal.
 *
 * The source anchor sits on `plan.source`, which for the commonest edge of all —
 * a plain card leaving by its bottom border — is exactly where the card's drag
 * grip is. `GraphEdgeOverlay` meets the same collision and resolves it by drawing
 * nothing: a socket there would be a blob on the grip, and the grip already
 * reads as the port. An anchor cannot do the same. It is not decoration but the
 * only control that moves this end of the edge, and its invisible grab
 * disc is wider than the grip it would cover — so yielding the spot would trade
 * a cosmetic overlap for the loss of both gestures: no source rewire, and no
 * new connection out of a card while one of its edges is selected.
 *
 * So it steps aside instead, onto the line it belongs to, just past the far
 * edge of whatever covers it. Measured from the rect rather than nudged by a
 * constant because the grip and a named exit's badge are different sizes, and
 * "just clear of it" is the rule either way.
 *
 * Exported for its tests: the component can only be exercised against a live
 * React Flow store.
 *
 * @param {{ x: number, y: number }} point The anchor's planned spot.
 * @param {?Object}                  rect  The handle covering it, if any.
 * @param {string}                   side  The border the edge leaves by.
 * @return {{ x: number, y: number }} The spot to draw it at.
 */
export function clearOf( point, rect, side ) {
	if ( ! rect ) {
		return point;
	}
	// The direction the curve leaves that border by — `edge-geometry`'s, the
	// same one `arrowTip` above measures the head's clearance along.
	const away = outward( side );
	// How far past the rect's far edge the anchor has to travel before the grab
	// disc stops overlapping it: the rect's remaining depth in the direction of
	// travel, plus the disc's own radius. `away` is axis-aligned, so the dot
	// product below picks the axis that matters and zeroes the other.
	const far = {
		x: away.x > 0 ? rect.x + rect.width : rect.x,
		y: away.y > 0 ? rect.y + rect.height : rect.y,
	};
	const depth = away.x * ( far.x - point.x ) + away.y * ( far.y - point.y );
	const step = Math.max( 0, depth ) + GRAB_RADIUS;
	return { x: point.x + away.x * step, y: point.y + away.y * step };
}

/**
 * Where an edge's two ends are drawn, in flow coordinates.
 *
 * The departure is the path's own start — the socket is stamped there. The
 * arrival is not the path's end but the arrowhead's tip, which `arrowTip` is
 * the one statement of (`GraphEdgeOverlay` stamps the head on the same point), so
 * the anchor goes on the head rather than on the gap behind it.
 *
 * @param {Object} plan The edge's finished plan.
 * @return {{ source: { x: number, y: number }, target: { x: number, y: number } }}
 *         The two grab points.
 */
function endsOf( plan ) {
	return { source: plan.source, target: arrowTip( plan ) };
}

/**
 * The node element a DOM element would land a drop on: any node but a backdrop.
 *
 * A backdrop node (one spanning a band, say) is empty canvas, not a landing.
 * Named here rather than left to the backdrop's `pointer-events: none`, so the
 * gesture a band exists to receive does not depend on a stylesheet winning a
 * cascade tie. `GraphCanvas` asks the same question of a dropped connection.
 *
 * @param {?Object}  element       The DOM element under the pointer.
 * @param {string[]} backdropTypes Node types that are ground, not landings.
 * @return {?Object} The node's DOM element, or null.
 */
export function landingNode( element, backdropTypes ) {
	const node = element?.closest?.( '.react-flow__node' );
	if (
		! node ||
		backdropTypes.some( ( type ) =>
			node.classList.contains( `react-flow__node-${ type }` )
		)
	) {
		return null;
	}
	return node;
}

/**
 * What is under the pointer: the node it would land on, or whether it is over
 * open canvas.
 *
 * @param {number}   clientX       Pointer x, in client coordinates.
 * @param {number}   clientY       Pointer y, in client coordinates.
 * @param {string[]} backdropTypes Node types that are ground, not landings.
 * @return {{ node: ?string, onPane: boolean }} The node id under the pointer,
 *         and whether the pointer is over the canvas at all.
 */
function dropAt( clientX, clientY, backdropTypes ) {
	const under = document.elementFromPoint( clientX, clientY );
	const node = landingNode( under, backdropTypes );
	if ( node ) {
		return { node: node.getAttribute( 'data-id' ), onPane: true };
	}
	return {
		node: null,
		onPane: Boolean( under?.closest?.( '.react-flow__pane' ) ),
	};
}

/**
 * @param {Object}   props
 * @param {?Object}  props.anchor            The edge to draw anchors for — the
 *                                           React Flow edge plus `ends:
 *                                           { source, target }`, which of its
 *                                           ends may move — or null.
 * @param {Function} props.verdictFor        `( edge, end, nodeId, { onPane,
 *                                           client } )` → `'valid' | 'invalid'
 *                                           | 'unchanged' | 'create'`.
 * @param {Function} props.ghostFor          `( client )` → the flow-coordinate
 *                                           `{ x, y }` top-left (and optionally
 *                                           `width`, `height`) of the card a
 *                                           `'create'` would make.
 * @param {Function} props.onReconnect       `( edge, end, nodeId )` — commit a
 *                                           move onto an existing node.
 * @param {Function} props.onReconnectToPane `( edge, end, client )` — commit a
 *                                           `'create'` release on empty canvas.
 * @param {Function} props.onDragChange      `( edgeId )` — a drag started or
 *                                           ended.
 * @param {string[]} props.backdropTypes     Node types that are not landings.
 * @param {string}   props.sourceLabel       Tooltip on the source anchor.
 * @param {string}   props.targetLabel       Tooltip on the target anchor.
 * @return {?JSX.Element} The anchor layer.
 */
export function GraphEdgeAnchors( {
	anchor,
	verdictFor,
	ghostFor,
	onReconnect,
	onReconnectToPane,
	onDragChange,
	backdropTypes,
	sourceLabel,
	targetLabel,
} ) {
	const { screenToFlowPosition } = useReactFlow();
	const { handleUnder } = useSourceHandles();

	// The live drag: which edge and which of its ends. Held rather than derived
	// so the gesture survives the pointer leaving the edge it started on.
	const [ session, setSession ] = useState( null );

	// Where the free end currently is and what would happen if it were let go
	// there. The state drives the render; the ref is what the release handler
	// reads, since the pointer handlers are bound once per drag and would
	// otherwise close over the first frame's value.
	const [ preview, setPreview ] = useState( null );
	const previewRef = useRef( null );

	const edge = session ? session.edge : anchor;
	const plan = useEdgePlan( edge?.id || null )?.plan || null;

	// The press began on the anchor and — over open canvas — ends on the pane,
	// so the browser synthesizes one click on the box that contains both: the
	// pane itself, whose own handler clears the selection (`onPaneClick`, and
	// React Flow's `resetSelectedElements` behind it). That would undo the
	// selection the release just set — the new node the author has to name
	// next. React Flow suppresses the same click after its own drop-on-pane
	// gesture; this one has to say so itself.
	//
	// Armed here rather than inside the drag effect, because arming it is the
	// last thing a release does and ENDING the drag is the second-to-last: the
	// effect's own cleanup runs on the session it just closed, and would take
	// the listener down again before the click it was armed for ever arrived.
	// Held in a ref so a disarm has something to remove.
	//
	// Scoped to the canvas, and to this turn of the event loop, because the
	// click it waits for is not always coming: `begin` calls `preventDefault`
	// on the press, which suppresses the compatibility mouse events, so a
	// release over a card produces no click at all. An unscoped listener left
	// armed for one that never arrives eats the author's next real click
	// instead — Save, a field, a menu item — and the press appears to do
	// nothing whatever.
	const swallowRef = useRef( null );
	const disarmTimerRef = useRef( null );

	const disarmClick = useCallback( () => {
		if ( disarmTimerRef.current ) {
			window.clearTimeout( disarmTimerRef.current );
			disarmTimerRef.current = null;
		}
		if ( swallowRef.current ) {
			document.removeEventListener( 'click', swallowRef.current, true );
			swallowRef.current = null;
		}
	}, [] );

	const swallowNextClick = useCallback( () => {
		disarmClick();
		const swallow = ( event ) => {
			// The canvas's own click, and only that one. The synthesized click
			// is aimed at the box holding both ends of the gesture, which is
			// inside the flow wrapper wherever the release landed; anything
			// outside it is the author's next move and has to reach its
			// handler.
			if ( event.target?.closest?.( '.vipui-graph' ) ) {
				event.stopPropagation();
			}
			disarmClick();
		};
		swallowRef.current = swallow;
		document.addEventListener( 'click', swallow, true );
		// The synthesized click, when there is one, is dispatched with the
		// release that caused it — so anything still armed once this turn of
		// the loop is over was waiting for a click that is not coming.
		disarmTimerRef.current = window.setTimeout( disarmClick, 0 );
	}, [ disarmClick ] );

	// A release outside the window never produces the click it was armed for,
	// and an armed listener left behind would eat an unrelated one. The next
	// press is the latest moment that can still be true, and unmounting is the
	// other way this layer goes away.
	useEffect( () => disarmClick, [ disarmClick ] );

	const begin = useCallback(
		( event, end ) => {
			// Left button only, like every other drag on the canvas.
			if ( event.button !== 0 || ! anchor ) {
				return;
			}
			disarmClick();
			// The anchor floats over the canvas; without this the press starts
			// a pane drag underneath it and the graph pans away.
			event.stopPropagation();
			event.preventDefault();
			previewRef.current = null;
			setPreview( null );
			setSession( { edge: anchor, end } );
			onDragChange( anchor.id );
		},
		[ anchor, onDragChange, disarmClick ]
	);

	useEffect( () => {
		if ( ! session ) {
			return undefined;
		}
		const { edge: dragged, end } = session;

		const close = () => {
			setSession( null );
			setPreview( null );
			previewRef.current = null;
			onDragChange( null );
		};

		// The verdict depends on the edge and the end being dragged — both fixed
		// for the life of this session — and on what the pointer is over. Frames
		// that stay over the same card ask the same question, so it is asked
		// once per landing rather than once per frame. The effect is re-run (and
		// this cleared) if `verdictFor` changes identity, which is how a change
		// to the graph behind the drag reaches it.
		//
		// Open canvas is not cached: there the answer can depend on *where*.
		const verdicts = new Map();
		const verdictAt = ( node, onPane, client ) => {
			if ( ! node ) {
				return verdictFor( dragged, end, null, { onPane, client } );
			}
			if ( ! verdicts.has( node ) ) {
				verdicts.set(
					node,
					verdictFor( dragged, end, node, { onPane, client } )
				);
			}
			return verdicts.get( node );
		};

		const previewAt = ( clientX, clientY ) => {
			const { node, onPane } = dropAt( clientX, clientY, backdropTypes );
			const verdict = verdictAt( node, onPane, {
				x: clientX,
				y: clientY,
			} );
			return {
				// The pointer itself, which the lead line follows.
				at: screenToFlowPosition( { x: clientX, y: clientY } ),
				client: { x: clientX, y: clientY },
				node,
				verdict,
				// Where the card would actually land. Only a 'create' draws
				// one, so only a 'create' pays for the answer.
				ghost:
					verdict === 'create'
						? ghostFor( { x: clientX, y: clientY } )
						: null,
			};
		};

		const track = ( event ) => {
			const next = previewAt( event.clientX, event.clientY );
			previewRef.current = next;
			setPreview( next );
		};

		const release = ( event ) => {
			const moved = previewRef.current;
			// Pressed and let go without moving: a grab handle is not a button,
			// so there is nothing to do — and no drag for a stray click to be
			// the tail of.
			if ( ! moved ) {
				close();
				return;
			}
			// Where the pointer was *let go*, asked again here rather than read
			// off the last `pointermove`. Browsers coalesce moves under load, so
			// a flick-and-release can end at coordinates no move ever reported —
			// committing the last-hovered node, or growing one at a stale
			// point. The release event knows where it happened; ask it.
			const landed = previewAt( event.clientX, event.clientY );
			swallowNextClick();
			close();
			if ( landed.verdict === 'valid' ) {
				onReconnect( dragged, end, landed.node );
				return;
			}
			if ( landed.verdict === 'create' ) {
				onReconnectToPane( dragged, end, landed.client );
			}
			// 'unchanged' and 'invalid' spring back. The line was drawn as one
			// or the other for as long as it was held there, so the snap back
			// is the answer to something already asked.
		};

		const abandon = ( event ) => {
			if ( event.key === 'Escape' ) {
				close();
			}
		};

		document.addEventListener( 'pointermove', track );
		document.addEventListener( 'pointerup', release );
		// A pointer stream can end without a release — a pen or touch gesture
		// the browser takes over, a device removed. Without this the session
		// would stay open with no pointer in it: the edge held invisible
		// (`is-reconnecting`), the lead line tracking a cursor that is no
		// longer dragging, and the next click anywhere committing whatever the
		// last move had reached.
		document.addEventListener( 'pointercancel', close );
		document.addEventListener( 'keydown', abandon );
		return () => {
			document.removeEventListener( 'pointermove', track );
			document.removeEventListener( 'pointerup', release );
			document.removeEventListener( 'pointercancel', close );
			document.removeEventListener( 'keydown', abandon );
		};
	}, [
		swallowNextClick,
		session,
		screenToFlowPosition,
		verdictFor,
		ghostFor,
		onReconnect,
		onReconnectToPane,
		onDragChange,
		backdropTypes,
	] );

	// Nothing engaged, or its nodes aren't measured yet and there is no plan to
	// place anything from.
	if ( ! edge || ! plan ) {
		return null;
	}

	// The departure end steps clear of any exit handle it lands on — for a plain
	// card that is the drag grip, in exactly this spot. See `clearOf`.
	const drawn = endsOf( plan );
	const points = {
		source: clearOf(
			drawn.source,
			handleUnder( edge.source, drawn.source ),
			plan.sourcePos
		),
		target: drawn.target,
	};
	const held = session ? session.end : null;
	// The end the line is still pinned to while the other one travels.
	const pinned = held === 'source' ? 'target' : 'source';
	const pinnedSide = pinned === 'source' ? plan.sourcePos : plan.targetPos;

	const lead =
		preview &&
		getBezierPath( {
			sourceX: points[ pinned ].x,
			sourceY: points[ pinned ].y,
			sourcePosition: pinnedSide,
			targetX: preview.at.x,
			targetY: preview.at.y,
			targetPosition: OPPOSITE[ pinnedSide ],
		} )[ 0 ];

	const anchorFor = ( end ) => (
		<g
			key={ end }
			// `nopan`/`nodrag` are React Flow's own opt-outs, read by the pane's
			// zoom filter and the node drag filter off the pressed element.
			// Stopping the React-synthetic pointerdown in `begin` cannot reach
			// either — both bind natively, below the root React delegates from —
			// so the classes are what actually keep the graph still under the
			// grab. The repo already marks the edge's own controls this way.
			className={ `vipui-graph-anchors__anchor vipui-graph-anchors__anchor--${ end } nodrag nopan` }
			transform={ `translate(${ points[ end ].x } ${ points[ end ].y })` }
			onPointerDown={ ( event ) => begin( event, end ) }
		>
			<title>{ end === 'source' ? sourceLabel : targetLabel }</title>
			<circle className="vipui-graph-anchors__grab" r={ GRAB_RADIUS } />
			<circle className="vipui-graph-anchors__ring" r={ RING_RADIUS } />
		</g>
	);

	return (
		<ViewportPortal>
			<svg
				className={ [ 'vipui-graph-anchors', session && 'is-dragging' ]
					.filter( Boolean )
					.join( ' ' ) }
				focusable="false"
				aria-hidden="true"
			>
				{ /* The edge's own tones (exit tone, outbound, disabled) ride
				     on the group, the same way `GraphEdgeOverlay` wears them, so
				     an anchor is unmistakably part of the line it belongs to —
				     and an accepted drop keeps that colour. The verdict rides
				     here too, and only overrules it to say the move is refused
				     or is no move at all. */ }
				<g
					className={ [
						edge.className,
						preview && `is-${ preview.verdict }`,
					]
						.filter( Boolean )
						.join( ' ' ) }
				>
					{ lead && (
						<path
							className="vipui-graph-anchors__lead"
							d={ lead }
						/>
					) }
					{ preview?.verdict === 'create' && preview.ghost && (
						<rect
							className="vipui-graph-anchors__ghost"
							x={ preview.ghost.x }
							y={ preview.ghost.y }
							width={
								preview.ghost.width ?? GRAPH_NODE_SIZE.width
							}
							height={
								preview.ghost.height ?? GRAPH_NODE_SIZE.height
							}
						/>
					) }
					{ /* The end being dragged *is* the pointer, so only the
					     other one is still drawn. */ }
					{ edge.ends.source &&
						held !== 'source' &&
						anchorFor( 'source' ) }
					{ edge.ends.target &&
						held !== 'target' &&
						anchorFor( 'target' ) }
				</g>
			</svg>
		</ViewportPortal>
	);
}

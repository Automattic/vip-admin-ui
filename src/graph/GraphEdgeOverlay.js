/**
 * GraphEdgeOverlay — the parts of an edge that have to be drawn above the cards.
 *
 * React Flow paints its edge layer below its node layer, and the canvas leans on
 * that: a line passing behind a card is the design (`edge-tunnel.js`), not a
 * defect. Two things are not, and both live here:
 *
 * - **The underpass ghost.** Where an edge passes behind a card the visible
 *   stroke breaks, and the buried stretch is repainted faint and dotted, so the
 *   line reads as continuous without reading as drawn *on* the card.
 * - **The end marks** — the socket where an edge leaves and the arrowhead where
 *   it arrives. These sit on their own card's border, and a neighbour
 *   overlapping that border would swallow them. Cards can be placed by hand and
 *   can overlap deliberately, so that is a normal arrangement, not an edge case.
 *   Above the cards they always show.
 *
 * **An edge leaving by a named exit departs by its own mark, not by a plain
 * socket.** Two exits routed to one destination are two lines between the same
 * pair of cards, and with nothing painted at rest there is no telling which is
 * which without clicking one. So a named exit's departure is a filled disc in
 * the exit's tone carrying the exit's glyph (the same one the card's badge
 * uses), drawn permanently. It is `PORT_SPREAD` across, the pitch two ports on
 * one border are normally placed at (`edge-spread.js`), so two marks along a
 * border touch rather than pile up.
 *
 * The marks are drawn here rather than as SVG `marker-start` / `marker-end`
 * because a marker is painted with its path, in that path's layer. Orientation
 * is not lost by moving them: every edge leaves and meets its border square
 * (the port stub is a straight run along the outward normal), so the normal
 * *is* the tangent.
 *
 * Clearing the cards has one cost, paid here rather than by lowering the layer:
 * a node's own exit handles live inside the card's stacking context and can't
 * be raised out of it, so a mark landing on one would paint over it. A plain
 * *socket* whose point falls inside one of its own node's source handles is
 * therefore not drawn at all: the handle is the port at that spot, and says so
 * better than a 4px dome stamped on it.
 *
 * **Arrowheads and exit marks yield only to a painted exit badge — never to
 * the grip, and never at rest.** Grips are transparent until their card is
 * hovered, so a back edge arriving dead centre on a bottom border would lose
 * its arrowhead permanently if heads yielded to the grip. An arrival mark is
 * the only thing that tells the two ends of a line apart. A named exit's badge
 * is the one real collision: it carries a glyph, and a head stamped over it
 * hides the very mark the badge exists to show. The badges paint while their
 * card is hovered or a connection is dragged from them, so a head (or exit
 * mark) over one fades out for exactly that long (`is-yielding`) and returns
 * when the badge goes. The hovered node comes from `GraphCanvas`, which owns
 * node events; the handle a connection is in flight from comes from the store.
 *
 * Everything drawn here wears the state classes its edge does (tone, outbound,
 * hovered, selected — assembled in `GraphCanvas`), so it changes colour with
 * the line it belongs to. The layer takes no pointer events.
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { ViewportPortal, useStore } from '@xyflow/react';
import { Icon } from '@wordpress/ui';

import { useEdgePlans } from './EdgePlanProvider';
import { useSourceHandles } from './source-handles';
import { arrowTip, outward } from './edge-geometry';
import { PORT_SPREAD, TUNNEL_GHOST } from './edge-constants';

/**
 * The two end marks, drawn pointing along +x so one rotation places each: the
 * socket is a filled semicircle flush with the border it leaves by, doming the
 * way the edge goes; the head is an open chevron with 5px arms at a right
 * angle, its tip on the path's end.
 */
const SOCKET = 'M 0,-4 A 4,4 0 0 1 0,4 Z';
const ARROW = 'M -3.54,-3.54 L 0,0 L -3.54,3.54';

/**
 * How far the head reaches around its tip, in px. An exit badge's bounds are
 * inflated by this when asking whether a head covers it, so a head grazing the
 * badge's edge counts too.
 */
const ARROW_REACH = 4;

/**
 * The exit mark's diameter, and the glyph inside it. A pitch, not a floor: a
 * border crowded past what it can hold at `PORT_SPREAD` is spaced tighter
 * (`edge-spread.js`), and there the discs overlap at the rim. The fix for that
 * is fewer ports on the border, not a smaller mark.
 */
const EXIT_MARK = PORT_SPREAD;
const EXIT_GLYPH = Math.round( ( EXIT_MARK * 18 ) / 22 );

/**
 * The state carried on each edge object that the overlay's colour follows, plus
 * the two nodes its marks sit on, as a string signature so unrelated store
 * activity doesn't re-render the layer — the plans context already covers
 * geometry.
 *
 * @param {Object} state React Flow store state.
 * @return {string} One `id|classes|selected|source|target` row per edge.
 */
export function selectEdgeStates( state ) {
	return state.edges
		.map( ( edge ) =>
			[
				edge.id,
				edge.className || '',
				!! edge.selected,
				edge.source,
				edge.target,
			].join( '|' )
		)
		.join( '\n' );
}

/**
 * Read that signature back into one record per edge. The other half of
 * `selectEdgeStates`, and next to it on purpose: a field added to the row but
 * not to the read shifts every field after it, which does not throw — it just
 * draws the wrong marks.
 *
 * @param {string} signature The joined rows.
 * @return {Object} `{ className, selected, source, target }` by edge id.
 */
export function readEdgeStates( signature ) {
	const states = {};
	signature.split( '\n' ).forEach( ( row ) => {
		if ( ! row ) {
			return;
		}
		const [ id, className, selected, source, target ] = row.split( '|' );
		states[ id ] = {
			className,
			selected: selected === 'true',
			source,
			target,
		};
	} );
	return states;
}

/**
 * The handle a connection drag makes paint without a hover: React Flow marks
 * the handle a connection is in flight from (`.connectingfrom`), and the
 * stylesheet keeps it up for the length of the drag. A joined string, so the
 * connection's position changing on every pointer move never re-renders.
 *
 * @param {Object} state React Flow store state.
 * @return {string} `nodeId|handleId` of the dragged-from handle, or ''.
 */
function selectConnectingHandle( state ) {
	if ( ! state.connection.inProgress ) {
		return '';
	}
	return [
		state.connection.fromNode?.id || '',
		state.connection.fromHandle?.id || '',
	].join( '|' );
}

/**
 * The exit badge a point falls on, if any.
 *
 * Works on the measured source-handle rects of one node, inflated by the head's
 * reach. Only a handle with an id — a named exit — qualifies: the anonymous
 * grip must never eat an arrival mark, because it is transparent at rest.
 *
 * @param {{ x: number, y: number }} point   The mark's tip, in flow coordinates.
 * @param {?Array}                   handles One node's source-handle rects
 *                                           (`{ id, x, y, width, height }`).
 * @return {?string} The covered exit's id, or null.
 */
export function coveredExitBadge( point, handles ) {
	return (
		( handles || [] ).find(
			( rect ) =>
				rect.id &&
				point.x >= rect.x - ARROW_REACH &&
				point.x <= rect.x + rect.width + ARROW_REACH &&
				point.y >= rect.y - ARROW_REACH &&
				point.y <= rect.y + rect.height + ARROW_REACH
		)?.id || null
	);
}

/**
 * Degrees of a unit vector, for an SVG `rotate()`.
 *
 * @param {{ x: number, y: number }} v The vector.
 * @return {number} Its angle in degrees.
 */
const angleOf = ( v ) => ( Math.atan2( v.y, v.x ) * 180 ) / Math.PI;

/**
 * @param {Object}  props
 * @param {?string} props.hoveredNodeId The node under the pointer.
 * @param {Object}  props.exitIcons     Glyph by edge id, for edges that leave
 *                                      by a named exit.
 * @return {?JSX.Element} The layer.
 */
function GraphEdgeOverlayComponent( { hoveredNodeId = null, exitIcons } ) {
	const plans = useEdgePlans();
	const stateSignature = useStore( selectEdgeStates );
	const { handles, occupied } = useSourceHandles();
	const connectingHandle = useStore( selectConnectingHandle );

	const ids = Object.keys( plans );
	if ( ! ids.length ) {
		return null;
	}

	const states = readEdgeStates( stateSignature );

	const classesFor = ( id, base ) => {
		const state = states[ id ] || { className: '', selected: false };
		return [ base, state.className, state.selected && 'selected' ]
			.filter( Boolean )
			.join( ' ' );
	};

	// Whether the exit badge a mark lands on is currently *painted*: its node
	// hovered, or a connection in flight from that very handle. Geometry alone
	// can't tell a badge that is up from one that is transparent.
	const badgeIsUp = ( nodeId, point ) => {
		const badge = coveredExitBadge( point, handles[ nodeId ] );
		if ( ! badge ) {
			return false;
		}
		return (
			nodeId === hoveredNodeId ||
			`${ nodeId }|${ badge }` === connectingHandle
		);
	};

	return (
		<ViewportPortal>
			<svg
				className="vipui-graph-overlay"
				aria-hidden="true"
				focusable="false"
			>
				{ ids.map( ( id ) => {
					const { plan, tunnel } = plans[ id ];
					const state = states[ id ];
					const leaves = outward( plan.sourcePos );
					const arrives = outward( plan.targetPos );
					const tip = arrowTip( plan );
					const exitIcon = exitIcons[ id ];
					return (
						<g key={ id }>
							{ tunnel && (
								<path
									className={ classesFor(
										id,
										'vipui-graph-overlay__ghost'
									) }
									d={ plans[ id ].d }
									strokeDasharray={ tunnel.ghost }
									opacity={ TUNNEL_GHOST }
								/>
							) }
							{ exitIcon && (
								<g
									className={ classesFor(
										id,
										[
											'vipui-graph-overlay__exit',
											badgeIsUp(
												state?.source,
												plan.source
											) && 'is-yielding',
										]
											.filter( Boolean )
											.join( ' ' )
									) }
									transform={ `translate(${ plan.source.x } ${ plan.source.y })` }
								>
									<circle
										className="vipui-graph-overlay__exit-disc"
										r={ EXIT_MARK / 2 }
									/>
									{ /* `<Icon>` renders a nested `<svg>` with its
									     own 0 0 24 24 viewBox, which starts at its
									     parent's origin; this group centres it. */ }
									<g
										transform={ `translate(${
											-EXIT_GLYPH / 2
										} ${ -EXIT_GLYPH / 2 })` }
									>
										<Icon
											icon={ exitIcon }
											size={ EXIT_GLYPH }
										/>
									</g>
								</g>
							) }
							{ ! exitIcon &&
								! occupied( state?.source, plan.source ) && (
									<path
										className={ classesFor(
											id,
											'vipui-graph-overlay__socket'
										) }
										d={ SOCKET }
										transform={ `translate(${
											plan.source.x
										} ${ plan.source.y }) rotate(${ angleOf(
											leaves
										) })` }
									/>
								) }
							<path
								className={ classesFor(
									id,
									[
										'vipui-graph-overlay__arrow',
										badgeIsUp( state?.target, tip ) &&
											'is-yielding',
									]
										.filter( Boolean )
										.join( ' ' )
								) }
								d={ ARROW }
								transform={ `translate(${ tip.x } ${
									tip.y
								}) rotate(${ angleOf( {
									x: -arrives.x,
									y: -arrives.y,
								} ) })` }
							/>
						</g>
					);
				} ) }
			</svg>
		</ViewportPortal>
	);
}

export const GraphEdgeOverlay = memo( GraphEdgeOverlayComponent );

/**
 * GraphEdge — an edge on the graph canvas.
 *
 * The geometry is not decided here. Ports, spreads, bundles and underpass
 * breaks are cross-edge decisions, so every edge on the canvas is planned
 * together (`edge-pipeline.js`, run by `EdgePlanProvider`) and this component
 * reads its finished plan from context: a path `d`, the midpoint its marks
 * stand on, and — where the line passes behind a card — a dash pattern that
 * breaks the stroke short of the card, with a small cup closing each end.
 *
 * On top of that path it adds three things:
 *
 * - a halo drawn under the line, which the stylesheet fades in on hover and
 *   selection — the edge's answer to the focus ring a card gets, since an SVG
 *   path can take neither `outline` nor `box-shadow`;
 * - a label pill at the path midpoint, shown while the edge is hovered or
 *   selected, which is what selects the edge;
 * - a link mark on that midpoint, painted at rest, on every edge of a set that
 *   is one record drawn more than once — two exits routed to the same place,
 *   say. Configuring either configures both, and two plain lines would say the
 *   opposite. Every line of the set wears it, because the question it answers
 *   ("does editing this one reach anything else?") is asked of whichever line
 *   the reader is following.
 *
 * The mark is a disc one lane pitch across (`PORT_SPREAD`), the gap a bundle of
 * co-travelling edges closes to (`edge-bundle.js`), so the marks on a bundled
 * pair sit rim to rim instead of piling up. It takes no pointer events: a
 * control-shaped thing that swallowed a click without answering it would cost
 * the edge its own midpoint.
 *
 * ## The pill
 *
 * A target before it is a label. Selecting an edge meant getting the pointer
 * almost exactly onto a 1px stroke, so two changes answer that together: the
 * invisible stroke React Flow lays over the line is `EDGE_HIT_WIDTH` in screen
 * px rather than flow px, so hovering the edge doesn't get harder the further
 * out the canvas is zoomed; and the pill that hover reveals is a target many
 * times the size of the line for the click that follows — scaled against the
 * viewport the same way. Both are undone by hand, from the live zoom: React
 * Flow zooms with a CSS `scale()` outside each edge's own `<svg>`, which
 * `vector-effect: non-scaling-stroke` cannot see.
 *
 * Shown on hover and selection only. A pill on every edge at rest would restate
 * what the geometry already says, and at bundle pitch several would overlap.
 * On a linked set the pill takes the link glyph too, so covering the mark
 * doesn't take its answer away at the moment the reader is about to act.
 *
 * A disabled edge keeps its pill, muted, and is drawn in the same dots as an
 * underpass ghost — one "this line is not the thing it looks like" texture.
 * Where an edge is both, the underpass wins. Both textures are set here, so the
 * precedence is a conditional and not a cascade race.
 *
 * Selection comes from React Flow's own edge click handling, on the pill as
 * much as on the line: `EdgeLabelRenderer` portals the pill out of the SVG
 * group in the DOM but not in the React tree, and React propagates click and
 * enter/leave along the React tree. So the pill needs no handlers of its own.
 *
 * What this component does *not* draw is either end mark, or the faint
 * continuation across a card it passes behind. All three have to sit above the
 * cards — see `GraphEdgeOverlay`.
 *
 * Edge data:
 * - `label` — the pill's text. No label, no pill.
 * - `linkLabel` — the link mark's accessible name ("On pass and On fail share
 *   one edge"). No label, no mark.
 * - `disabled` — drawn dotted and muted; still selectable and deletable.
 * - `hovered`, `reconnecting` — set by `GraphCanvas`.
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { BaseEdge, EdgeLabelRenderer, useStore } from '@xyflow/react';
import { Button } from '@wordpress/components';
import { Icon } from '@wordpress/ui';
import { link } from '@wordpress/icons';

import { useEdgePlan } from './EdgePlanProvider';
import {
	EDGE_HIT_WIDTH,
	PORT_SPREAD,
	TUNNEL_DOT,
	TUNNEL_DOT_GAP,
} from './edge-constants';

import './graph.css';

/** The edge `type` to register this component under. */
export const GRAPH_EDGE_TYPE = 'vipui-edge';

/**
 * The link mark's diameter, and the glyph inside it. The glyph takes the share
 * of the disc an exit badge's does (18 in 22), so the mark on the line, the
 * mark on the port and the badge on the card read as one mark at three sizes.
 */
const LINK_MARK = PORT_SPREAD;
const LINK_GLYPH = Math.round( ( LINK_MARK * 18 ) / 22 );

/**
 * The viewport zoom, which the hit stroke and the pill are sized against.
 *
 * @param {Object} state React Flow store state.
 * @return {number} Current zoom.
 */
const selectZoom = ( state ) => state.transform[ 2 ];

function GraphEdgeComponent( { id, data, selected } ) {
	const drawn = useEdgePlan( id );
	const zoom = useStore( selectZoom );

	// Both nodes have to be measured before there's anything to draw.
	if ( ! drawn ) {
		return null;
	}

	const { d, mid, tunnel } = drawn;
	const dashed = tunnel
		? { strokeDasharray: tunnel.dash, strokeLinecap: 'butt' }
		: undefined;
	const stroked =
		dashed ||
		( data?.disabled
			? { strokeDasharray: `${ TUNNEL_DOT } ${ TUNNEL_DOT_GAP }` }
			: undefined );

	// Both midpoint marks go with the line while either end is being dragged:
	// the line is hidden for the length of the gesture (`GraphCanvas`), and a
	// mark floating over empty canvas points at a midpoint about to move.
	const linkLabel =
		data?.linkLabel && ! data?.reconnecting ? data.linkLabel : null;
	const pill = data?.label || null;
	const pillVisible = ( data?.hovered || selected ) && ! data?.reconnecting;

	return (
		<>
			{ /* Under the line, and transparent until the edge is hovered or
			     selected — see `.vipui-graph-edge__halo`. */ }
			<path className="vipui-graph-edge__halo" d={ d } style={ dashed } />
			{ /* `interactionWidth` is the invisible stroke React Flow lays
			     over the line for the pointer, in flow px. Divided by the zoom
			     it is `EDGE_HIT_WIDTH` screen px at every zoom. */ }
			<BaseEdge
				id={ id }
				path={ d }
				className="vipui-graph-edge"
				style={ stroked }
				interactionWidth={ EDGE_HIT_WIDTH / zoom }
			/>
			{ /* The mouths of the underpasses: a semicircular cup closing each
			     end of every break, doming toward the card the line goes under. */ }
			{ ( tunnel?.caps || [] ).map( ( cap, index ) => (
				<path
					key={ index }
					className="vipui-graph-edge__cap"
					d={ cap.d }
				/>
			) ) }
			{ ( pill || linkLabel ) && (
				<EdgeLabelRenderer>
					{ /* Both children are out of flow and centred on the
					     midpoint, so the pill's width — a node's name, and so
					     anything — moves neither of them.

					     The wrapper's transform makes it a stacking context, so
					     a shown pill is lifted here rather than on the pill
					     itself; a hovered one goes above a merely selected one. */ }
					<div
						className={ [
							'vipui-graph-edge__controls',
							'nodrag',
							'nopan',
							pillVisible && 'is-visible',
							pillVisible && data?.hovered && 'is-hovered',
						]
							.filter( Boolean )
							.join( ' ' ) }
						style={ {
							transform: `translate(${ mid.x }px, ${ mid.y }px)`,
						} }
					>
						{ linkLabel && (
							/* wpds-allow R7 -- a filled disc one lane pitch across: surface, radius and a knocked-out glyph, none of which a <Stack> carries */
							<span
								className="vipui-graph-edge__mark"
								style={ {
									width: LINK_MARK,
									height: LINK_MARK,
								} }
								role="img"
								aria-label={ linkLabel }
							>
								<Icon icon={ link } size={ LINK_GLYPH } />
							</span>
						) }
						{ pill && (
							// wpds-allow system/inline-style -- the pill's scale is the live zoom, which no prop or stylesheet can know
							<Button
								type="button"
								size="small"
								icon={ linkLabel ? link : undefined }
								iconSize={ LINK_GLYPH }
								className={ [
									'vipui-graph-edge__pill',
									pillVisible && 'is-visible',
									data?.disabled && 'is-muted',
								]
									.filter( Boolean )
									.join( ' ' ) }
								// Scaled against the viewport, so it is the same
								// size on screen at every zoom.
								style={ {
									transform: `translate(-50%, -50%) scale(${
										1 / zoom
									})`,
								} }
								// The pill elides a long name rather than growing
								// to the width of the canvas; this gets the full
								// string back for a pointer.
								title={ pill }
							>
								{ /* An array keeps Button's icon-and-text layout
								     while the label has an ellipsis wrapper. */ }
								{ [
									<span
										key="label"
										className="vipui-graph-edge__pill-text"
									>
										{ pill }
									</span>,
								] }
							</Button>
						) }
					</div>
				</EdgeLabelRenderer>
			) }
		</>
	);
}

export const GraphEdge = memo( GraphEdgeComponent );

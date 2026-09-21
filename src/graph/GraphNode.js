/**
 * GraphNode — a card on the graph canvas.
 *
 * Every variant is driven by node data: default, selected, warning (caution),
 * accent (a tone the plugin supplies), and raised. The card itself carries the
 * state — a tinted surface and border per variant — rather than a ring or a
 * stripe around it. Cards carry no buttons of their own: a node is added by
 * dragging a connection off this one, not from a control on the card.
 *
 * Connections start at the grip on the bottom border and end anywhere on the
 * card: the target handle is an invisible sheet over the whole card rather
 * than a dot to hit, and edges float to whichever border faces the other node
 * (`floating-edge.js`), so there's no entry point to aim at. The sheet only
 * takes pointer events while a connection is in flight — otherwise it would
 * sit between the pointer and everything else in the card.
 *
 * **Named exits.** A node whose ways out mean different things (pass and fail,
 * yes and no) swaps the one grip for a badge per exit, each with its own tone
 * and glyph. Dragging from one onto a node is what routes that exit; the edge
 * carries the exit's id as its `sourceHandle`. The badges are the *affordance*,
 * and like the grip they only paint under the pointer. What says at rest where
 * an exit's line leaves is the mark on the edge's own departure point, in the
 * same tone and glyph (`GraphEdgeOverlay`): the badge is where you reach to
 * re-route, the mark is where the line comes from.
 *
 * The badges follow their edges' ports rather than the other way around
 * (`exitOrder`), so an edge always leaves from under its own badge instead of
 * crossing its sibling to reach it.
 *
 * Node data:
 * - `label` — the card's name.
 * - `icon` — an optional glyph after the name.
 * - `meta` — a muted line in the footer ("3 edges").
 * - `badge` — `{ icon, label }`, a brand-toned read-out in the footer.
 * - `description` — said to screen readers only, for a state the canvas shows
 *   some other way (an edge to End).
 * - `warnings` — strings; any at all puts the card in the caution tone and
 *   flags its title.
 * - `accent` — a CSS colour for the whole card, for a kind of node the plugin
 *   wants legible from across the canvas.
 * - `raised` — a heavier shadow, for a card sitting *on* a band's border.
 * - `exits` — `[ { id, icon, tone, title, routed } ]`, named exits in
 *   declared order. `tone` is `success`, `caution` or `error`; `routed` fills
 *   the badge.
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { Handle, Position, useConnection } from '@xyflow/react';
import { Icon, Stack, Text, VisuallyHidden } from '@wordpress/ui';
import { caution } from '@wordpress/icons';

import { exitOrder } from './edge-pipeline';
import { usePortOrder } from './EdgePlanProvider';

import './graph.css';

/** The node `type` to register this component under. */
export const GRAPH_NODE_TYPE = 'vipui-node';

/** The card's footprint, in flow px. Set it on the node as `width`/`height`. */
export const GRAPH_NODE_SIZE = { width: 200, height: 80 };

/** Centre-to-centre spacing of a node's exit badges: 22px pills, 4px apart. */
const EXIT_PITCH = 26;

// The drag-out grip (a spiral). `currentColor` so it follows the handle's
// colour, neutral to brand on hover, like the other card glyphs.
const gripIcon = (
	<svg
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		aria-hidden="true"
		focusable="false"
	>
		<path
			fill="currentColor"
			d="M12.7983 4.00177C13.2159 3.97343 13.5781 4.28876 13.6065 4.70638C13.6348 5.12399 13.3185 5.48528 12.9009 5.51362C8.85448 5.7885 6.10859 9.21366 6.37092 12.7867H6.36993C6.6423 16.3582 9.68061 18.7299 12.7854 18.4631H12.7874C15.8918 18.205 17.8852 15.5477 17.624 12.917C17.3626 10.2856 15.0928 8.67269 12.9384 8.92615H12.9354C10.7815 9.17122 9.53829 11.0471 9.78048 12.7344C10.0226 14.421 11.4993 15.282 12.7124 15.0673L12.9315 15.016C13.9861 14.7098 14.4068 13.7222 14.2282 13.0314L14.2272 13.0255C14.0418 12.2841 13.3981 12.1672 13.1525 12.2735C12.7687 12.4404 12.3217 12.2646 12.1548 11.8808C11.9882 11.4971 12.164 11.051 12.5476 10.8841C13.6968 10.3844 15.297 11.0559 15.6976 12.6584H15.6966C16.1082 14.2648 15.0441 16.1776 12.9877 16.5584L12.9838 16.5594C10.9236 16.9282 8.64441 15.485 8.28047 12.9495C7.91649 10.4136 9.76366 7.76259 12.7618 7.42022L13.043 7.39456C15.9475 7.20787 18.7977 9.40343 19.1319 12.767C19.4768 16.2394 16.8622 19.6443 12.9137 19.9729L12.9147 19.9739C8.96672 20.3131 5.19404 17.3097 4.85906 12.8992V12.8972C4.53542 8.48741 7.91214 4.33366 12.7983 4.00177Z"
		/>
	</svg>
);

function GraphNodeComponent( { id, data, selected } ) {
	const {
		label,
		icon,
		meta,
		badge,
		description,
		warnings = [],
		accent,
		raised,
		exits,
	} = data;

	// Selector form: this re-renders only when a connection starts or ends, not
	// on every pointer move of the drag.
	const connecting = useConnection( ( c ) => c.inProgress );

	// The order this node's exit edges actually leave in, so each badge sits
	// over its own edge's port.
	const portOrder = usePortOrder( id );

	const hasWarning = warnings.length > 0;
	const className = [
		'vipui-graph-node',
		selected && 'is-selected',
		hasWarning && 'is-warning',
		accent && 'is-accent',
		raised && 'is-raised',
		connecting && 'is-connecting',
	]
		.filter( Boolean )
		.join( ' ' );

	const exitsById = new Map( ( exits || [] ).map( ( e ) => [ e.id, e ] ) );
	const ordered = exits
		? exitOrder(
				exits.map( ( e ) => e.id ),
				portOrder
			).map( ( exitId ) => exitsById.get( exitId ) )
		: null;

	return (
		<div
			className={ className }
			// The plugin's tone, handed to the stylesheet's accent treatment.
			style={
				accent ? { '--vipui-graph-node-accent': accent } : undefined
			}
		>
			<Handle
				type="target"
				position={ Position.Top }
				className="vipui-graph-node__drop"
			/>

			<Stack
				className="vipui-graph-node__body"
				direction="column"
				gap="xs"
			>
				<Stack align="center" gap="xs">
					{ /* wpds-allow R7 -- the title is the card's own inherited size at medium weight, and every <Text> variant sets size, line-height and family as a package; there is no weight-only variant and no weight prop, so a <Text> would retype it */ }
					<span className="vipui-graph-node__label">{ label }</span>
					{ icon && (
						<Icon
							icon={ icon }
							size={ 16 }
							className="vipui-graph-node__flag"
						/>
					) }
					{ /* The wrapper is what carries the tooltip and the label a
					     screen reader reads the flag out by. */ }
					{ hasWarning && (
						<Stack
							render={ <span /> }
							align="center"
							title={ warnings.join( '\n' ) }
							role="img"
							aria-label={ warnings.join( ' ' ) }
						>
							<Icon
								icon={ caution }
								size={ 16 }
								className="vipui-graph-node__flag vipui-graph-node__flag--warning"
							/>
						</Stack>
					) }
				</Stack>
				<Stack align="center" gap="sm">
					{ meta && (
						<Text
							variant="body-sm"
							className="vipui-graph-node__meta"
						>
							{ meta }
						</Text>
					) }
					{ description && (
						<VisuallyHidden>{ description }</VisuallyHidden>
					) }
					{ badge && (
						<Text
							variant="body-sm"
							className="vipui-graph-node__badge"
						>
							<Icon icon={ badge.icon } size={ 16 } />
							{ badge.label }
						</Text>
					) }
				</Stack>
			</Stack>

			{ /* Named exits replace the grip entirely: every way out of the
			     node is one of them. Same pill the grip is, one per exit,
			     grouped tight around the card's midpoint rather than spread
			     across the border, so they read as one cluster of exits. */ }
			{ ordered ? (
				ordered.map( ( exit, index ) => (
					<Handle
						key={ exit.id }
						id={ exit.id }
						type="source"
						position={ Position.Bottom }
						style={ {
							left: `calc(50% + ${
								( index - ( ordered.length - 1 ) / 2 ) *
								EXIT_PITCH
							}px)`,
						} }
						title={ exit.title }
						className={ [
							'vipui-graph-node__handle',
							'vipui-graph-node__handle--exit',
							`is-tone-${ exit.tone }`,
							exit.routed && 'is-routed',
						]
							.filter( Boolean )
							.join( ' ' ) }
					>
						<Icon icon={ exit.icon } size={ 18 } />
					</Handle>
				) )
			) : (
				<Handle
					type="source"
					position={ Position.Bottom }
					className="vipui-graph-node__handle vipui-graph-node__handle--grip"
				>
					<Icon icon={ gripIcon } size={ 22 } />
				</Handle>
			) }
		</div>
	);
}

export const GraphNode = memo( GraphNodeComponent );

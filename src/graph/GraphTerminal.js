/**
 * GraphTerminal — the Start / End pills that bookend a flow.
 *
 * Start has a single source handle: drag from it to connect the flow's first
 * node, and the edge to that node departs from it too — the pipeline pins it
 * there rather than routing a port (`pinToExit`), so the one exit Start draws is
 * the one its edge leaves by. End is its own drop target — like a card, the
 * whole pill accepts a dropped connection (see `GraphNode`).
 *
 * Neither is a thing you operate: build them `selectable: false`,
 * `draggable: false`, `deletable: false` and `focusable: false`, so they cost a
 * keyboard user no tab stops. The edges either side of them are the operable
 * part.
 *
 * Node data: `kind` (`'start'` or `'end'`) and `label`, the word on the pill.
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { Handle, Position, useConnection } from '@xyflow/react';

import './graph.css';

/** The node `type` to register this component under. */
export const GRAPH_TERMINAL_TYPE = 'vipui-terminal';

/** The pill's footprint, in flow px. Set it on the node as `width`/`height`. */
export const GRAPH_TERMINAL_SIZE = { width: 120, height: 36 };

function GraphTerminalComponent( { data } ) {
	const isStart = data.kind === 'start';
	const connecting = useConnection( ( c ) => c.inProgress );
	const className = [
		'vipui-graph-terminal',
		`vipui-graph-terminal--${ isStart ? 'start' : 'end' }`,
		connecting && 'is-connecting',
	]
		.filter( Boolean )
		.join( ' ' );
	return (
		<div className={ className }>
			{ ! isStart && (
				<Handle
					type="target"
					position={ Position.Top }
					className="vipui-graph-terminal__drop"
				/>
			) }
			{ /* wpds-allow R7 -- uppercase micro-type on the pill; the class also carries letter-spacing and colour, which <Text> has no prop for */ }
			<span className="vipui-graph-terminal__label">{ data.label }</span>
			{ isStart && (
				<Handle
					type="source"
					position={ Position.Bottom }
					className="vipui-graph-terminal__handle"
				/>
			) }
		</div>
	);
}

export const GraphTerminal = memo( GraphTerminalComponent );

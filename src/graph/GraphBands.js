/**
 * GraphBands — horizontal sections of the canvas, drawn in screen space.
 *
 * A band isn't a shape sitting on the canvas; it's a stretch *of* it. So the
 * only mark it makes is its boundary: a hairline running the full width of the
 * viewport at the band's top, with the band's label riding just below it.
 * Everything between one line and the next is that band — including the parts
 * off either side of the screen.
 *
 * So this layer reads the viewport transform out of the React Flow store and
 * converts each band's top into a screen y itself:
 *
 * - the line spans the whole pane and can't run out however far you pan;
 * - the label sticks to the left edge of the viewport rather than to a point in
 *   the graph, so it's still readable when the graph is panned sideways;
 * - the hairline stays a hairline and the label stays legible at any zoom,
 *   because neither is inside the scaled transform.
 *
 * Two layers, because they belong on opposite sides of the graph: the lines go
 * *under* the nodes and edges (a boundary a card can sit astride, and edges
 * cross), the labels go *over* them (chrome, like the zoom controls — a card
 * panned across the left edge shouldn't swallow the label that says which band
 * you're looking at).
 *
 * Where the bands are is the plugin's layout's business; nothing here measures
 * the DOM. Rendered by `GraphCanvas` from its `bands` prop.
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { useStore } from '@xyflow/react';
import { Icon } from '@wordpress/ui';

import './graph.css';

/**
 * Screen-space y of a flow-space y, under the current viewport transform.
 *
 * @param {number}   flowY     Y in flow coordinates.
 * @param {number[]} transform React Flow's `[ x, y, zoom ]`.
 * @return {number} Y in pixels from the top of the pane.
 */
const toScreenY = ( flowY, [ , panY, zoom ] ) => panY + flowY * zoom;

/**
 * @param {Object}    props
 * @param {Array}     props.bands         `[ { id, y, label, meta?, icon? } ]`,
 *                                        top to bottom. `y` is the band's top
 *                                        in flow coordinates.
 * @param {?string}   props.selectedBand  The band whose label is selected.
 * @param {?string}   props.dropBand      The band a drag in flight would land
 *                                        in, when that means something.
 * @param {?Function} props.onSelectBand  `( id )` — its label was pressed.
 * @param {?Function} props.onContextMenu `( event, id )` — its label was
 *                                        right-clicked.
 * @return {?JSX.Element} The two layers.
 */
function GraphBandsComponent( {
	bands,
	selectedBand,
	dropBand,
	onSelectBand,
	onContextMenu,
} ) {
	const transform = useStore( ( state ) => state.transform );

	if ( ! bands.length ) {
		return null;
	}

	// Each section runs from its own line down to the next one, and the last
	// runs off the bottom of the pane. The gap between two bands is therefore
	// painted as the band *above* it, so a layout that attributes a drop there
	// the same way lights up the section the drop will land in.
	const sections = bands.map( ( band, index ) => {
		const next = bands[ index + 1 ];
		const top = toScreenY( band.y, transform );
		return {
			band,
			top,
			// Null height means "to the bottom of the pane".
			height: next ? toScreenY( next.y, transform ) - top : null,
		};
	} );

	const stateClass = ( id ) =>
		[
			id === selectedBand && 'is-selected',
			id === dropBand && 'is-drop-target',
		]
			.filter( Boolean )
			.join( ' ' );

	return (
		<>
			{ /* wpds-allow R7 -- a full-pane painting layer, not a layout: it is inset-0 and pointer-events:none, and every section inside it is absolutely positioned from the viewport transform, so a <Stack> would lay nothing out */ }
			<div className="vipui-graph-bands" aria-hidden="true">
				{ sections.map( ( { band, top, height } ) => (
					<div
						key={ band.id }
						className={ [
							'vipui-graph-bands__section',
							stateClass( band.id ),
						]
							.filter( Boolean )
							.join( ' ' ) }
						style={
							height === null
								? { top, bottom: 0 }
								: { top, height }
						}
					/>
				) ) }
			</div>
			{ /* wpds-allow R7 -- the matching painting layer over the graph; same absolutely-positioned, pointer-events:none pane as the bands above */ }
			<div className="vipui-graph-band-labels">
				{ sections.map( ( { band, top } ) => (
					<button
						key={ band.id }
						type="button"
						className={ [
							'vipui-graph-band-labels__label',
							stateClass( band.id ),
						]
							.filter( Boolean )
							.join( ' ' ) }
						style={ { top } }
						onClick={ () => onSelectBand?.( band.id ) }
						onContextMenu={ ( event ) =>
							onContextMenu?.( event, band.id )
						}
					>
						{ band.icon && (
							<Icon
								icon={ band.icon }
								size={ 16 }
								className="vipui-graph-band-labels__icon"
							/>
						) }
						{ /* wpds-allow R7 -- uppercase micro-type inside the pill; the class also carries letter-spacing and colour, which <Text> has no prop for */ }
						<span className="vipui-graph-band-labels__name">
							{ band.label }
						</span>
						{ band.meta && (
							/* wpds-allow R7 -- the pill's secondary label; same constraint as the name above */
							<span className="vipui-graph-band-labels__meta">
								{ band.meta }
							</span>
						) }
					</button>
				) ) }
			</div>
		</>
	);
}

export const GraphBands = memo( GraphBandsComponent );

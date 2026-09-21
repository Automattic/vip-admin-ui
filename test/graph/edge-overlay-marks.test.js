/**
 * GraphEdgeOverlay's end marks — the two halves of it that are pure.
 *
 * The yield rule's geometry, and the signature the layer reads its colours and
 * end nodes out of. Everything else about the marks needs a live React Flow
 * store and is exercised in the browser.
 *
 * ## The yield rule
 *
 * An arrowhead yields to a named exit's badge (the head would stamp itself over
 * the badge's glyph), but only while the badge is painted, and never to the
 * anonymous drag grip. `coveredExitBadge` is the geometric half of that rule:
 * which badge, if any, a mark's tip lands on.
 *
 * The one case these tests must keep true is the one the rule was shaped
 * around: a back edge arriving dead centre on a bottom border lands its tip
 * inside the drag grip's bounds, and the grip is transparent at rest — so a
 * suppressed arrowhead there left *nothing* to say where the edge lands. Only
 * a handle with an id (a named exit) may claim a head; the grip's id is null.
 *
 * Rects mirror what React Flow measures for a 200×80 card: 22px pill handles
 * straddling the bottom border (y 69–91), three exits at 26px centres around
 * the midpoint.
 *
 * @package
 */

// The module under test also exports a component; its UI imports are not
// what's being tested, and @wordpress/ui pulls in ESM Jest can't load.
jest.mock( '@wordpress/ui', () => ( {} ) );

import {
	coveredExitBadge,
	readEdgeStates,
	selectEdgeStates,
} from '../../src/graph/GraphEdgeOverlay';

// A 200×80 card at the origin; bottom border at y = 80.
const EXIT_HANDLES = [
	{ id: 'pass', x: 63, y: 69, width: 22, height: 22 },
	{ id: 'fail', x: 89, y: 69, width: 22, height: 22 },
	{ id: 'error', x: 115, y: 69, width: 22, height: 22 },
];

// A plain card's single drag grip — same pill, no id.
const GRIP_HANDLES = [ { id: null, x: 89, y: 69, width: 22, height: 22 } ];

describe( 'coveredExitBadge', () => {
	it( 'names the exit badge a tip lands inside', () => {
		expect( coveredExitBadge( { x: 100, y: 81.5 }, EXIT_HANDLES ) ).toBe(
			'fail'
		);
	} );

	it( 'never yields to the anonymous drag grip', () => {
		// The dead-centre back edge: tip at MARK_STANDOFF below the bottom
		// border's midpoint, squarely inside the grip's bounds. The grip is
		// transparent at rest, so eating the arrowhead here left nothing to
		// say where the edge lands — the regression the named-exit rule
		// exists to prevent.
		expect( coveredExitBadge( { x: 100, y: 81.5 }, GRIP_HANDLES ) ).toBe(
			null
		);
	} );

	it( 'skips the grip to find the badge underneath the same point', () => {
		// The non-vacuous half of the grip rule. The grip-only case above
		// cannot tell the id guard from its absence — a matched null-id
		// rect maps to null through `?.id || null` either way — so this pins
		// the guard itself: a null-id rect FIRST in the array and a 'pass'
		// badge second, both containing the tip. With the guard the grip is
		// skipped and the badge answers; without it, `find` stops at the grip
		// and the result collapses to null.
		expect(
			coveredExitBadge( { x: 100, y: 80 }, [
				{ id: null, x: 89, y: 69, width: 22, height: 22 },
				{ id: 'pass', x: 89, y: 69, width: 22, height: 22 },
			] )
		).toBe( 'pass' );
	} );

	it( 'leaves a tip clear of every badge alone', () => {
		// An arrival on the same border but outside the cluster — and one on
		// another border entirely — keep their arrowheads.
		expect( coveredExitBadge( { x: 30, y: 81.5 }, EXIT_HANDLES ) ).toBe(
			null
		);
		expect( coveredExitBadge( { x: 100, y: -1.5 }, EXIT_HANDLES ) ).toBe(
			null
		);
	} );

	it( 'counts a head grazing a badge’s edge as covering it', () => {
		// The chevron's arms reach ~3.54px around the tip, so the bounds are
		// inflated by that reach: a tip 3px past the error badge's outer edge
		// still lays its arms across the badge.
		expect( coveredExitBadge( { x: 140, y: 80 }, EXIT_HANDLES ) ).toBe(
			'error'
		);
		// And past the reach, it does not.
		expect( coveredExitBadge( { x: 145, y: 80 }, EXIT_HANDLES ) ).toBe(
			null
		);
	} );

	it( 'answers null for a node with no measured handles', () => {
		// End has no source handles at all, and every node is unmeasured on
		// first paint.
		expect( coveredExitBadge( { x: 100, y: 81.5 }, undefined ) ).toBe(
			null
		);
		expect( coveredExitBadge( { x: 100, y: 81.5 }, [] ) ).toBe( null );
	} );
} );

describe( 'edge-state signature', () => {
	// The layer reads its colours and its two end nodes out of a joined string,
	// because the React Flow store hands back a new object every tick and a
	// string lets the memo skip an unchanged frame. Writer and reader are one
	// format written twice: a field added to the row and not to the read shifts
	// every field after it, which draws the wrong marks without throwing. So the
	// two are held to each other here.
	const store = {
		edges: [
			{
				id: 'check:pass->done',
				className: 'is-exit is-tone-success',
				selected: true,
				source: 'check',
				target: 'done',
				sourceHandle: 'pass',
			},
			{
				id: 'first->check',
				source: 'first',
				target: 'check',
			},
		],
	};

	it( 'round-trips every field the marks are drawn from', () => {
		expect( readEdgeStates( selectEdgeStates( store ) ) ).toEqual( {
			'check:pass->done': {
				className: 'is-exit is-tone-success',
				selected: true,
				source: 'check',
				target: 'done',
			},
			// A plain edge carries no classes of its own.
			'first->check': {
				className: '',
				selected: false,
				source: 'first',
				target: 'check',
			},
		} );
	} );

	it( 'reads nothing out of an empty canvas', () => {
		expect( readEdgeStates( selectEdgeStates( { edges: [] } ) ) ).toEqual(
			{}
		);
	} );
} );

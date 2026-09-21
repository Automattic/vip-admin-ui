/**
 * Unit tests for the whole-canvas edge pipeline.
 *
 * @package
 */

import { Position } from '@xyflow/react';

import { buildEdgePlans, exitOrder } from '../../src/graph/edge-pipeline';
import {
	EDGE_PITCH,
	LEVER_ACROSS,
	LEVER_FLOOR,
	MARK_STANDOFF,
	TUNNEL_DOT,
} from '../../src/graph/edge-constants';

// Card-sized rectangles at a layered layout's usual separations.
const card = ( id, x, y ) => ( { id, x, y, width: 200, height: 80 } );

const rectsOf = ( ...cards ) => {
	const rects = {};
	cards.forEach( ( c ) => {
		rects[ c.id ] = c;
	} );
	return rects;
};

const edge = ( id, source, target, sourceHandle = null ) => ( {
	id,
	source,
	target,
	sourceHandle,
} );

const build = ( edges, rects ) => buildEdgePlans( edges, rects, {}, 0 );

describe( 'buildEdgePlans', () => {
	it( 'draws a path for every edge whose nodes are measured', () => {
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 184 ) );
		const { plans } = build( [ edge( 'e1', 'a', 'b' ) ], rects );
		expect( plans.e1 ).toBeDefined();
		expect( plans.e1.d ).toMatch( /^M / );
		expect( plans.e1.mid.total ).toBeGreaterThan( 0 );
	} );

	it( 'stops the drawn line short of the card it arrives at', () => {
		// The arrowhead sits on the path's end, so the clearance it needs from
		// the card is a gap in the line — draw to the border and the stroke
		// shows through the open chevron as a spike past the tip.
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 184 ) );
		const { plans } = build( [ edge( 'e1', 'a', 'b' ) ], rects );
		const numbers = plans.e1.d.match( /-?[\d.]+/g ).map( Number );
		const end = {
			x: numbers[ numbers.length - 2 ],
			y: numbers[ numbers.length - 1 ],
		};
		const { source, target } = plans.e1.plan;
		expect( Math.hypot( end.x - target.x, end.y - target.y ) ).toBeCloseTo(
			MARK_STANDOFF,
			1
		);
		// Only the far end moves — the near one carries the socket, which is
		// flush with its border.
		expect( numbers[ 0 ] ).toBeCloseTo( source.x, 1 );
		expect( numbers[ 1 ] ).toBeCloseTo( source.y, 1 );
	} );

	it( 'skips an edge whose node is missing rather than guessing', () => {
		const rects = rectsOf( card( 'a', 0, 0 ) );
		const { plans } = build( [ edge( 'e1', 'a', 'ghost' ) ], rects );
		expect( plans.e1 ).toBeUndefined();
	} );

	it( 'gives a same-pair fan one border and spreads its ports along it', () => {
		// Two edges between the same pair of cards (two exits routed to one
		// destination): the follower takes the borders the leader chose —
		// planned independently they can disagree, and the pair crosses. The
		// pair then travels together, so it bundles at the lane pitch: two
		// lines a lane apart, not one drawn twice.
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 184 ) );
		const { plans } = build(
			[ edge( 'e1', 'a', 'b', 'pass' ), edge( 'e2', 'a', 'b', 'fail' ) ],
			rects
		);
		const p1 = plans.e1.plan;
		const p2 = plans.e2.plan;
		expect( p1.sourcePos ).toBe( p2.sourcePos );
		expect( p1.targetPos ).toBe( p2.targetPos );
		const gap = Math.hypot(
			p1.source.x - p2.source.x,
			p1.source.y - p2.source.y
		);
		expect( gap ).toBeGreaterThanOrEqual( EDGE_PITCH - 0.01 );
	} );

	it( 'keeps a gathered pair gathered — the guard must not roll back its own pitch', () => {
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 400 ) );
		const { plans } = build(
			[ edge( 'e1', 'a', 'b', 'pass' ), edge( 'e2', 'a', 'b', 'fail' ) ],
			rects
		);
		const p1 = plans.e1.plan;
		const p2 = plans.e2.plan;
		expect( Number.isInteger( p1.loomId ) ).toBe( true );
		expect( p2.loomId ).toBe( p1.loomId );
		const gap = Math.hypot(
			p1.source.x - p2.source.x,
			p1.source.y - p2.source.y
		);
		expect( gap ).toBeLessThanOrEqual( EDGE_PITCH + 0.5 );
	} );

	it( 'remembers loom mates between frames for membership hysteresis', () => {
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 400 ) );
		const memory = {};
		buildEdgePlans(
			[ edge( 'e1', 'a', 'b', 'pass' ), edge( 'e2', 'a', 'b', 'fail' ) ],
			rects,
			memory,
			0
		);
		expect( memory.e1.mates ).toEqual( [ 'e2' ] );
		expect( memory.e2.mates ).toEqual( [ 'e1' ] );
	} );

	it( 'keeps a reciprocal pair apart', () => {
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 184 ) );
		const { plans } = build(
			[ edge( 'fwd', 'a', 'b' ), edge( 'back', 'b', 'a' ) ],
			rects
		);
		expect( plans.fwd.d ).not.toBe( plans.back.d );
		const down = plans.fwd.plan;
		const up = plans.back.plan;
		expect(
			Math.abs( down.source.x - up.target.x ) +
				Math.abs( down.target.x - up.source.x )
		).toBeGreaterThan( 1 );
	} );

	it( 'reports the order named-exit edges leave a card in', () => {
		// pass heads left, fail heads right: the pass port must sit left of
		// the fail port, and the report says so.
		const rects = rectsOf(
			card( 'check', 288, 0 ),
			card( 'left', 0, 184 ),
			card( 'right', 576, 184 )
		);
		const { portOrder } = build(
			[
				edge( 'p', 'check', 'left', 'pass' ),
				edge( 'f', 'check', 'right', 'fail' ),
			],
			rects
		);
		expect( portOrder.check ).toEqual( [ 'pass', 'fail' ] );
	} );

	it( 'reports no order for edges leaving by the anonymous grip', () => {
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 184 ) );
		const { portOrder } = build( [ edge( 'e1', 'a', 'b' ) ], rects );
		expect( portOrder ).toEqual( {} );
	} );

	it( 'pins a start terminal’s edge to the middle of its bottom border', () => {
		// The terminal draws one handle there. Routed like a card, the port
		// would follow the first card off to the side, away from the dot.
		const start = {
			id: 'start',
			x: 40,
			y: 0,
			width: 120,
			height: 36,
			pinnedExit: true,
		};
		const rects = rectsOf( start, card( 'first', 400, 60 ) );
		const { plans } = build( [ edge( 'e1', 'start', 'first' ) ], rects );
		const { plan } = plans.e1;
		expect( plan.sourcePos ).toBe( Position.Bottom );
		expect( plan.source ).toEqual( { x: 100, y: 36 } );
		expect( plan.pinnedSource ).toBe( true );
	} );

	it( 'breaks the stroke where an edge passes under a card', () => {
		// A straight run two ranks down with a card dead on the line: there
		// is no router to bend around it, so the line passes under and the
		// dash pattern opens a gap.
		const rects = rectsOf(
			card( 'top', 0, 0 ),
			card( 'mid', 0, 236 ),
			card( 'bottom', 0, 472 )
		);
		const { plans } = build( [ edge( 'e1', 'top', 'bottom' ) ], rects );
		const tunnel = plans.e1.tunnel;
		expect( tunnel ).not.toBeNull();
		// dash · gap · dash at least; the gap spans the card plus standoffs.
		const parts = tunnel.dash.split( ' ' ).map( Number );
		expect( parts.length ).toBeGreaterThanOrEqual( 3 );
		expect( Math.max( ...parts ) ).toBeGreaterThanOrEqual( 80 );
		// The mouths of the underpass are capped on both sides.
		expect( tunnel.caps.length ).toBeGreaterThanOrEqual( 2 );
	} );

	it( 'dots the ghost across exactly the span the stroke leaves open', () => {
		const rects = rectsOf(
			card( 'top', 0, 0 ),
			card( 'mid', 0, 236 ),
			card( 'bottom', 0, 472 )
		);
		const { plans } = build( [ edge( 'e1', 'top', 'bottom' ) ], rects );
		const { dash, ghost } = plans.e1.tunnel;
		const ghostParts = ghost.split( ' ' ).map( Number );

		// Even, so the browser doesn't duplicate the list and swap dashes for
		// gaps on the second pass...
		expect( ghostParts.length % 2 ).toBe( 0 );
		// ...and tiling the curve exactly once, so it never wraps and dots the
		// clear run. Both patterns cover the same total length.
		const sum = ( parts ) => parts.reduce( ( a, b ) => a + b, 0 );
		expect( sum( ghostParts ) ).toBeCloseTo(
			sum( dash.split( ' ' ).map( Number ) ),
			1
		);

		// Dotted, not one long faint line: the drawn runs are the even slots,
		// and inside the underpass they are short and there are several.
		const drawn = ghostParts.filter( ( _v, i ) => i % 2 === 0 && _v > 0 );
		expect( drawn.length ).toBeGreaterThan( 3 );
		expect( Math.max( ...drawn ) ).toBeLessThanOrEqual( TUNNEL_DOT );
	} );

	it( 'keeps a short run straight even when a long edge bundles with it', () => {
		// A card straddling a band's top border sits ~40px above the first
		// row — the one place `INLINE_RANGE` short-edge straightening applies.
		// A long edge arriving at the same border used to bundle with the
		// short one and drag it out of line into an S.
		const rects = rectsOf(
			card( 'cp', 0, -40 ),
			card( 'first', 0, 80 ),
			card( 'far', 0, 400 )
		);
		const { plans } = build(
			[ edge( 'short', 'first', 'cp' ), edge( 'long', 'far', 'cp' ) ],
			rects
		);
		// Every x in the path — ports and control points alike — is the same.
		const xs = [ ...plans.short.d.matchAll( /(-?[\d.]+),-?[\d.]+/g ) ].map(
			( m ) => Number( m[ 1 ] )
		);
		expect( xs.length ).toBeGreaterThan( 2 );
		expect( Math.max( ...xs ) - Math.min( ...xs ) ).toBeLessThan( 0.01 );
	} );

	it( 'does not let a loom stretch a member past its own target', () => {
		// A crowded corner: four cards, seven edges, and enough pairwise
		// gathering that all of them chain into one loom. The lane pass holds
		// lanes along the *loom's* perpendicular, which here lands near
		// `b→c`'s own axis — so its lever was pushed far down its own
		// direction, past the card it was going to, and the short edge looped
		// out through it and back.
		const rects = rectsOf(
			card( 'b', 240, -122 ),
			card( 'a', 0, 0 ),
			card( 'c', 273, 29 ),
			card( 'd', 240, 221 )
		);
		const { plans } = build(
			[
				edge( 'b-a', 'b', 'a' ),
				edge( 'b-c', 'b', 'c' ),
				edge( 'a-b', 'a', 'b' ),
				edge( 'a-c', 'a', 'c' ),
				edge( 'a-d', 'a', 'd' ),
				edge( 'c-a', 'c', 'a' ),
				edge( 'c-d', 'c', 'd' ),
			],
			rects
		);

		const { plan, tunnel } = plans[ 'b-c' ];
		// It runs from b's bottom straight down onto c's top, so it passes
		// under nothing at all.
		expect( tunnel ).toBeNull();
		// And its lever stays in the neighbourhood of the edge it steers.
		const span = Math.hypot(
			plan.targetStub.x - plan.sourceStub.x,
			plan.targetStub.y - plan.sourceStub.y
		);
		const home = {
			x: ( plan.sourceStub.x + plan.targetStub.x ) / 2,
			y: ( plan.sourceStub.y + plan.targetStub.y ) / 2,
		};
		const lever = plan.waypoints[ 0 ];
		expect(
			Math.hypot( lever.x - home.x, lever.y - home.y )
		).toBeLessThanOrEqual( LEVER_FLOOR + LEVER_ACROSS * span + 0.01 );
	} );

	it( 'leaves a clear edge unbroken', () => {
		const rects = rectsOf( card( 'a', 0, 0 ), card( 'b', 0, 184 ) );
		const { plans } = build( [ edge( 'e1', 'a', 'b' ) ], rects );
		expect( plans.e1.tunnel ).toBeNull();
	} );
} );

describe( 'exitOrder', () => {
	const EXITS = [ 'pass', 'fail', 'error' ];

	it( 'keeps the declared order with nothing or one thing routed', () => {
		expect( exitOrder( EXITS, null ) ).toEqual( EXITS );
		expect( exitOrder( EXITS, [ 'fail' ] ) ).toEqual( EXITS );
	} );

	it( 'follows the ports, with unrouted exits keeping their place', () => {
		expect( exitOrder( EXITS, [ 'fail', 'pass' ] ) ).toEqual( [
			'fail',
			'pass',
			'error',
		] );
	} );

	it( 'ignores a routed id the node no longer declares', () => {
		expect( exitOrder( EXITS, [ 'gone', 'fail', 'pass' ] ) ).toEqual( [
			'fail',
			'pass',
			'error',
		] );
	} );
} );

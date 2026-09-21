/**
 * How the canvas reads React Flow's position changes.
 *
 * Every node movement arrives as a batch of `{ type: 'position' }` changes, and
 * the `dragging` flag on them is ambiguous: React Flow emits `dragging: false`
 * for the closing change of a pointer drag, for an aborted drag, and for a
 * keyboard step (arrow keys on a focused, selected node), which is not a drag
 * at all. Those three want opposite handling — hold the in-flight position,
 * drop it, and commit it — so `classifyPositionChanges` separates them against
 * the set of ids whose drag is actually in flight.
 *
 * @package
 */

// The module under test also exports components; their UI imports are not
// what's being tested, and both packages pull in ESM Jest can't load.
jest.mock( '@wordpress/components', () => ( {} ) );
jest.mock( '@wordpress/ui', () => ( {} ) );

import { classifyPositionChanges } from '../../src/graph/GraphCanvas';

/**
 * A React Flow position change.
 *
 * @param {string}  id     Node id.
 * @param {number}  x      X position.
 * @param {number}  y      Y position.
 * @param {boolean} [drag] The change's `dragging` flag.
 * @return {Object} The change.
 */
const move = ( id, x, y, drag ) => ( {
	id,
	type: 'position',
	position: { x, y },
	dragging: drag,
} );

describe( 'classifyPositionChanges', () => {
	it( 'holds an in-flight drag position and remembers the node is dragging', () => {
		const inFlight = new Set();
		const result = classifyPositionChanges(
			[ move( 'first', 10, 20, true ) ],
			inFlight
		);

		expect( result.moving ).toEqual( [ move( 'first', 10, 20, true ) ] );
		expect( result.released ).toEqual( [] );
		expect( result.stepped ).toEqual( [] );
		expect( inFlight.has( 'first' ) ).toBe( true );
	} );

	it( 'releases the in-flight position when a drag ends', () => {
		// The closing change of a real drag. `onNodeDragStop` follows it and is
		// what commits, so this only has to let go of the transient position.
		const inFlight = new Set( [ 'first' ] );
		const result = classifyPositionChanges(
			[ move( 'first', 10, 20, false ) ],
			inFlight
		);

		expect( result.moving ).toEqual( [] );
		expect( result.released ).toEqual( [ 'first' ] );
		expect( result.stepped ).toEqual( [] );
		expect( inFlight.has( 'first' ) ).toBe( false );
	} );

	it( 'releases the in-flight position when a drag aborts', () => {
		// An abort (a second touch point, or the node deleted mid-drag) emits the
		// same closing change and then returns without calling `onNodeDragStop`.
		// Nothing commits, and — this is the bug the release closes — nothing is
		// left in the in-flight set or the position map either, where it would
		// outrank the layout for that node for the rest of the session.
		const inFlight = new Set( [ 'first', 'second' ] );
		const result = classifyPositionChanges(
			[ move( 'first', 10, 20, false ), move( 'second', 30, 40, false ) ],
			inFlight
		);

		expect( result.released ).toEqual( [ 'first', 'second' ] );
		expect( result.stepped ).toEqual( [] );
		expect( inFlight.size ).toBe( 0 );
	} );

	it( 'reads a position change with nothing in flight as a keyboard step', () => {
		// `useMoveSelectedNodes` calls `updateNodePositions( nodeUpdates )` with
		// no `dragging` argument, so the change looks exactly like a drag's
		// closing one — except that no drag ever started for that node.
		const inFlight = new Set();
		const result = classifyPositionChanges(
			[ move( 'first', 15, 20, false ) ],
			inFlight
		);

		expect( result.moving ).toEqual( [] );
		expect( result.released ).toEqual( [] );
		expect( result.stepped ).toEqual( [ move( 'first', 15, 20, false ) ] );
		expect( inFlight.size ).toBe( 0 );
	} );

	it( 'reads an undefined dragging flag as a keyboard step too', () => {
		// The flag defaults to `false` in `updateNodePositions`, but nothing in
		// the change's shape promises it is present at all.
		const result = classifyPositionChanges(
			[ move( 'first', 15, 20, undefined ) ],
			new Set()
		);

		expect( result.stepped ).toHaveLength( 1 );
		expect( result.released ).toEqual( [] );
	} );

	it( 'steps repeatedly without ever entering the drag set', () => {
		// Held arrow key: every press has to commit, because none of them will
		// ever reach `onNodeDragStop`.
		const inFlight = new Set();
		const stepped = [ 15, 20, 25 ].flatMap(
			( x ) =>
				classifyPositionChanges(
					[ move( 'first', x, 20, false ) ],
					inFlight
				).stepped
		);

		expect( stepped.map( ( s ) => s.position.x ) ).toEqual( [
			15, 20, 25,
		] );
		expect( inFlight.size ).toBe( 0 );
	} );

	it( 'keeps a dragged node and a stepped node apart in one batch', () => {
		const inFlight = new Set( [ 'first' ] );
		const result = classifyPositionChanges(
			[ move( 'first', 10, 20, true ), move( 'second', 30, 40, false ) ],
			inFlight
		);

		expect( result.moving.map( ( m ) => m.id ) ).toEqual( [ 'first' ] );
		expect( result.stepped.map( ( m ) => m.id ) ).toEqual( [ 'second' ] );
		expect( result.released ).toEqual( [] );
	} );

	it( 'follows a whole drag from first move to drop', () => {
		const inFlight = new Set();

		const start = classifyPositionChanges(
			[ move( 'first', 10, 20, true ) ],
			inFlight
		);
		const during = classifyPositionChanges(
			[ move( 'first', 12, 24, true ) ],
			inFlight
		);
		const end = classifyPositionChanges(
			[ move( 'first', 12, 24, false ) ],
			inFlight
		);

		expect( start.moving ).toHaveLength( 1 );
		expect( during.moving ).toHaveLength( 1 );
		// Not a step: the drop commits from `onNodeDragStop`, and committing
		// here as well would place the node twice.
		expect( end.stepped ).toEqual( [] );
		expect( end.released ).toEqual( [ 'first' ] );
		expect( inFlight.size ).toBe( 0 );
	} );
} );

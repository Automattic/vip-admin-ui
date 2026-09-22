# Graph canvas

A graph canvas is a node and edge editor on [React Flow](https://reactflow.dev):
cards connected by edges that route themselves. The kit covers the canvas's own
grammar: how a card looks and where its exits are, how edges pick their ports
and pass behind cards, how a selected edge's ends are dragged, bands across the
canvas, and the right-click menu. What the graph means stays with your plugin:
your model, your layout, and every "can this connect to that" decision.

## TL;DR

| Concern | Rule |
|---|---|
| Ownership | The flow is controlled. You project your model into `nodes` and `edges`, position them, and handle every callback. The canvas does not change structure on its own. |
| Layout | Yours. The canvas draws nodes where you put them and tells you when one is dragged (`onNodesChange`). |
| Cards | `type: GRAPH_NODE_TYPE`, sized `GRAPH_NODE_SIZE`. Every state is node data. Cards carry no buttons. |
| Start and End | `type: GRAPH_TERMINAL_TYPE`, `data.kind` `'start'` or `'end'`. Not selectable, draggable, deletable or focusable. |
| Edges | Plain React Flow edges. The canvas defaults their `type` to `GRAPH_EDGE_TYPE` and plans them all together. Do not draw your own paths. |
| Named exits | A card whose ways out mean different things declares `data.exits`. An edge leaving by one sets `sourceHandle` to the exit's id. |
| Selection | Yours: `selectedNodeId` and `selectedEdgeId` in, `onSelectNode` and `onSelectEdge` out. Click, Enter and Space all select. |
| Rewiring | Select an edge and drag a ring. Pass `reconnectVerdict` so the line says what a drop will do before it is released. |
| Words | Every string is a prop or node/edge data. The kit adds no `StringsProvider` keys. |
| Glyphs | Every `icon` is an `@wordpress/icons` glyph, filled or stroked. |

## Setup

```sh
npm install @xyflow/react
```

`@xyflow/react` is a peer dependency: one copy per bundle, since it carries
React context.

Import React Flow's stylesheet once, from your entry file, not from a
component in a lazily loaded chunk:

```js
// src/admin/index.js
import '@xyflow/react/dist/style.css';
import '@automattic/vip-admin-ui/tokens.css';
```

The package can't import it for you. The file is named `style.css`, and
`wp-scripts` moves every `style.css` into a separate `style-<entry>.css` that
you'd also have to enqueue. Imported from a lazy chunk, it can also break the
build's chunk naming. Imported from the entry, it lands in a chunk you already
load.

The canvas fills its container. Give the container a height.

## A whole canvas

```jsx
import {
	GraphCanvas, GRAPH_NODE_TYPE, GRAPH_NODE_SIZE, GRAPH_TERMINAL_TYPE, GRAPH_TERMINAL_SIZE,
} from '@automattic/vip-admin-ui';

function toGraph( steps ) {
	const nodes = [
		{ id: 'start', type: GRAPH_TERMINAL_TYPE, ...GRAPH_TERMINAL_SIZE, position: { x: 40, y: 0 },
			selectable: false, draggable: false, deletable: false, focusable: false,
			data: { kind: 'start', label: __( 'Start', 'my-plugin' ) } },
		...steps.map( ( step ) => ( {
			id: step.key,
			type: GRAPH_NODE_TYPE,
			...GRAPH_NODE_SIZE,
			position: step.position, // from your layout
			data: {
				label: step.label,
				meta: sprintf( _n( '%d edge', '%d edges', step.next.length, 'my-plugin' ), step.next.length ),
				warnings: step.problems,
			},
		} ) ),
	];
	const edges = steps.flatMap( ( step ) =>
		step.next.map( ( to ) => ( {
			id: `${ step.key }->${ to }`,
			source: step.key,
			target: to,
			data: { label: sprintf( __( 'Move to %s', 'my-plugin' ), to ) },
		} ) )
	);
	return { nodes, edges };
}

function Editor( { steps, selection, setSelection, onChange } ) {
	const { nodes, edges } = useMemo( () => toGraph( steps ), [ steps ] );
	return (
		<div className="my-plugin-editor">
			<GraphCanvas
				nodes={ nodes }
				edges={ edges }
				selectedNodeId={ selection.node }
				selectedEdgeId={ selection.edge }
				onSelectNode={ ( node ) => setSelection( { node } ) }
				onSelectEdge={ ( edge ) => setSelection( { edge } ) }
				onClearSelection={ () => setSelection( {} ) }
				onNodesChange={ ( moves ) => onChange( movedSteps( steps, moves ) ) }
				onConnect={ ( { source, target } ) => onChange( connect( steps, source, target ) ) }
				onDeleteNode={ ( id ) => onChange( removeStep( steps, id ) ) }
				onDeleteEdge={ ( edge ) => onChange( disconnect( steps, edge.source, edge.target ) ) }
				fitView
			/>
		</div>
	);
}
```

Define `nodeTypes` and `edgeTypes` outside your component if you pass any. A
new object on every render makes React Flow remount every node.

## `GraphCanvas`

Renders its own `ReactFlowProvider`. Anything the props table does not list is
passed through to `<ReactFlow>`, like `fitView`, `onInit`, `onNodeDrag`,
`onNodeDragStop`, `isValidConnection`, `nodesConnectable` or `proOptions`.
React Flow's attribution stays on unless you pass
`proOptions={ { hideAttribution: true } }`, which React Flow asks you to do
only with a Pro subscription. The event
handlers the canvas owns (clicks, hover, context menus, connect, delete,
`onNodesChange`) are not overridable. Use the canvas's own props instead.

| Prop | |
|---|---|
| `nodes`, `edges` | Positioned React Flow nodes and edges. |
| `nodeTypes`, `edgeTypes` | Your own types, merged over the kit's. |
| `backdropTypes` | Node types that are ground rather than things: a node spanning a band, say. They're left out of edge routing, and a drop on one counts as empty canvas. Give them `zIndex: 0` and `style: { pointerEvents: 'none' }`. |
| `selectedNodeId`, `selectedEdgeId` | What's selected. |
| `onSelectNode( id )`, `onSelectEdge( id )`, `onClearSelection()` | Selection requests. A node with `selectable: false` clears instead. |
| `onNodesChange( moves )` | Position changes only. Use `classifyPositionChanges` to tell a drag in flight from a drop from a keyboard step. |
| `onConnect( { source, target, sourceHandle } )` | A connection dropped on a node. |
| `onConnectToPane( { source, sourceHandle, client, position } )` | A connection dropped on empty canvas: grow the node it was reaching for. Escape abandons the drag instead. |
| `onDeleteNode( id )`, `onDeleteEdge( edge )` | React Flow's delete key (Backspace, unless you pass `deleteKeyCode`) on a selected card or edge. Build a node with `deletable: false` to protect it. |
| `onReconnect( edge, end, nodeId )` | Turns on the end-drag rings for the selected edge. `end` is `'source'` or `'target'`. |
| `reconnectVerdict( edge, end, nodeId, { client, position } )` | `'valid'`, `'invalid'`, `'unchanged'` or `'create'`. `nodeId` is null over empty canvas. Dropping an end on the node it's already on is `'unchanged'` without asking. |
| `reconnectEnds( edge )` | `{ source, target }`: which ends may move. Defaults to both. `edge.reconnectable: false` turns off both. |
| `reconnectGhost( { client, position } )` | Where a `'create'` drop's card would land: `{ x, y }` top-left in flow coordinates (plus `width`, `height` if not a card). |
| `onReconnectToPane( edge, end, { client, position } )` | A `'create'` release on empty canvas. |
| `moveSourceLabel`, `moveTargetLabel` | Tooltips on the two rings. |
| `bands`, `selectedBand`, `dropBand`, `onSelectBand( id )` | Screen-space bands. See [Bands](#bands). |
| `contextMenu( target )` | `target` is `{ kind, id, client, position }`, where `kind` is `'pane'`, `'node'`, `'edge'` or `'band'`. Return `{ label, items }` or null. A node or edge with a menu is selected as it opens. One with none falls back to the pane's menu. |
| `onResetLayout`, `resetLayoutLabel` | Adds a reset button to the zoom controls. |
| `className`, `children` | On the wrapper, and inside `<ReactFlow>`. |

**Paint order.** Backdrop nodes sit at z-index 0, edges at 1, and cards and
pills at 2. The canvas fills in the last two. React Flow does not put a node
below 0, so the edges are lifted above backdrops rather than the other way
round.

## Cards: `GRAPH_NODE_TYPE`

| `data` | |
|---|---|
| `label` | The card's name. It truncates, so keep the full name in your inspector. |
| `icon` | A glyph after the name. |
| `meta` | A muted footer line: "3 edges". |
| `badge` | `{ icon, label }`: a brand-toned footer read-out, like "Publishes". |
| `description` | Screen-reader-only text for state the canvas shows another way, such as the edge to End. |
| `warnings` | Strings. Any warning turns the card caution-toned and flags its title. The strings are the flag's tooltip and accessible name. |
| `accent` | A CSS colour: your plugin's tone for a kind of card. Border and a light wash. |
| `raised` | A heavier shadow, for a card sitting on a band's border. |
| `exits` | `[ { id, icon, tone, title, routed } ]`. See Named exits. |

A card has one way in and one way out. The whole card is the drop target, and a
connection starts from the grip that appears on its bottom border on hover.
Edges attach to whichever border faces the other card. There's no fixed port
to aim at.

**Named exits.** When a card's ways out mean different things (pass and fail,
approve and reject), declare them. Each exit replaces the grip with a badge in
its `tone` (`'success'`, `'caution'` or `'error'`) carrying its `icon`, and the
glyph is what tells them apart for anyone who can't separate the hues.
`routed` fills the badge. Dragging from a badge connects with that exit's id
as `sourceHandle`. Its edge wears the tone and leaves by a disc carrying the
same glyph, so which line is which is readable at rest. The badges reorder
to sit over their own edges' ports, so two exits' lines do not cross under the
card.

## Start and End: `GRAPH_TERMINAL_TYPE`

`data.kind` is `'start'` or `'end'`, and `data.label` is the word on the pill.
Start has one exit, and its edge is pinned to it. End is a drop target like a
card. Neither can be selected. Build them `selectable: false`,
`draggable: false`, `deletable: false` and `focusable: false`, so they take no
tab stops.

## Edges

| `data` | |
|---|---|
| `label` | The pill that appears on hover and selection, and selects the edge. No label means no pill, which suits structural edges such as Start's. |
| `linkLabel` | The accessible name of the link mark on the midpoint. Set it on every edge of a set that is one record drawn more than once. Editing one edits all. |
| `disabled` | Dotted and muted, but still selectable and deletable. |

The routing is not configurable. The constants were tuned together
against a set of scenarios, and several share one value (`edge-constants.js`).
What it does:

- Ports float. An edge meets each card wherever the line between the two
  centres crosses the border, eased off the corners.
- Ports are chosen by cost. Misalignment, S-bends, and arriving from the
  side of a card below all cost more. Near-ties keep the current choice, so an
  edge doesn't flicker while a card is dragged.
- Ports sharing a border spread out in the order their edges travel, so
  five edges out of one card leave from five places.
- Edges travelling together gather into a bundle at one pitch, and cards
  push bundles off their middles.
- There is no obstacle routing. A line passing behind a card breaks short of it, with
  a cup at each end, and the hidden span is dotted over the card. It stays
  readable in a way a line swinging wide around three cards doesn't.
- Port jumps ease rather than snap.

The end marks (socket, arrowhead, exit disc) and the underpass dots are drawn
on a layer above the cards, so a card overlapping another can't hide where its
neighbour's edges attach.

## Rewiring

Select an edge and a ring appears on each end. Drag one onto another card to
move that end. While the end is held, the line is drawn in the edge's own tone
where a drop would land, grey where nothing would change, and red where it's
refused.

- Answer `reconnectVerdict` from the same code that performs the move, so what
  the line promises and what the release does are the same thing.
- Over empty canvas, `'create'` draws a ghost card at `reconnectGhost` and
  releases into `onReconnectToPane`.
- Escape abandons the drag.

The gesture is pointer-only. Give your inspector another way to change an
edge's ends.

## Bands

```js
bands={ [
	{ id: 'draft', y: 0, label: __( 'Draft', 'my-plugin' ), meta: __( '2 steps', 'my-plugin' ), icon: postList },
	{ id: 'review', y: 240, label: __( 'Review', 'my-plugin' ) },
] }
```

A band is a section of the canvas, not a box on it: a hairline across the whole
pane at the band's top (`y`, in flow coordinates, top to bottom), and a label
pinned to the left edge of the viewport at any pan or zoom. The lines sit under
the graph and the labels over it. `selectedBand` brands a band's line and
label. `dropBand` tints the band a drag in flight would change something by
landing in. Working out which band a point is in, and what landing there
means, is your layout's job.

## Right-click menu

```jsx
contextMenu={ ( target ) => {
	if ( target.kind === 'node' ) {
		return { label: __( 'Step actions', 'my-plugin' ), items: [
			{ id: 'delete', icon: trash, label: __( 'Delete step', 'my-plugin' ), onSelect: () => remove( target.id ) },
		] };
	}
	return { label: __( 'Canvas actions', 'my-plugin' ), items: [
		{ id: 'add', icon: plus, label: __( 'Add step', 'my-plugin' ), onSelect: () => add( target.position ) },
	] };
} }
```

One level, verbs only. An item that would need to ask "which node?" belongs in
the inspector, next to the read-out of the same setting. Name the menu for what
it acts on ("Step actions"), because the items often don't say. The menu has
one tab stop, arrow keys and Home/End move between items, and Escape closes it
and returns focus to whatever opened it. Panning, zooming or clicking elsewhere
also closes it.

## With the inspector

The canvas runs full-bleed and the inspector ([Inspector](inspector.md))
floats over its right edge. Selection is the link between them. Selecting a
card or edge opens it in the inspector, and every verb that needs a second node
to name it (where an edge goes, which card an exit routes to) lives there
rather than in the menu.

/**
 * InspectorFieldList — an ordered list an author adds to, orders and prunes.
 *
 * Built for the lists an inspector keeps: fields a form captures, inputs a step
 * asks for, tools a step requires. The items differ; the list does not, so the
 * list lives here and the differences arrive as props.
 *
 * **Three of its halves are opt-in.** A row opens a configuration popover when
 * `renderConfig` says what is in it, navigates somewhere else when
 * `onItemSelect` says where, and the list polices storage keys when `keyOf`
 * says where to find one. The three are mutually compatible except that
 * `renderConfig` and `onItemSelect` compete for the row's click: when both are
 * present the popover wins, because a row that opens its own settings should
 * not also navigate away.
 *
 * **The list is the surface; one item's configuration shows at a time.**
 * Rendering every item's sub-form at once turns a panel into a wall of controls
 * with no way to see the shape of the list. A row here says what the item is and
 * what it is set to; clicking it opens that item's options in a popover,
 * anchored to the row. `__experimentalPaletteEdit` is the same idea in core —
 * copied as a pattern, not imported, since it is experimental and hardcoded to
 * colors.
 *
 * **Order is the author's, set by dragging.** The rows are `SortableFact`, so a
 * draggable list of settings looks the same wherever an inspector shows one.
 *
 * **Keys are checked here, not on the server's say-so** — in the lists that have
 * keys. A duplicate storage key is a rejected save, and reporting it after the
 * fact leaves the author hunting for the row. The row that has to change is
 * flagged as it is typed, and `renderConfig` receives the problem so the message
 * can repeat inside the popover where the key field actually is — a problem
 * hidden behind a closed disclosure is not a report.
 *
 * See docs/inspector.md.
 *
 * @package
 */

import { useState } from '@wordpress/element';
import { Button, DropdownMenu, MenuItem, Popover } from '@wordpress/components';
import { Stack, Text } from '@wordpress/ui';
import { plus, trash } from '@wordpress/icons';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	verticalListSortingStrategy,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { Fact, SortableFact } from './InspectorFacts';
import { useStrings } from '../strings';

import './inspector.css';

/**
 * The two ways a storage key gets a save refused, said on the row that has to
 * change while the author is still looking at it.
 *
 * Duplicates are walked the way a server walks them: the first item to use a key
 * owns it, later ones are the collision. A blank key is refused too, but only on
 * a row the author has started — a row added a moment ago and not yet typed into
 * is incomplete rather than wrong, and colouring it the instant it appears is
 * validation nobody asked for.
 *
 * A blank key never counts as a duplicate of another blank one, for the same
 * reason: two untouched new rows are not a collision.
 *
 * @param {Array}    items     The list.
 * @param {Function} keyOf     An item's storage key.
 * @param {Function} isStarted Whether the author has begun this item.
 * @param {Object}   strings   The plugin's strings.
 * @return {Array<Object|undefined>} Per-item problem, positionally.
 */
function keyProblems( items, keyOf, isStarted, strings ) {
	const seen = new Set();

	return items.map( ( item ) => {
		const key = keyOf( item );

		if ( ! key ) {
			return isStarted( item )
				? { short: strings.needsKey, full: strings.keyRequired }
				: undefined;
		}

		if ( seen.has( key ) ) {
			return {
				short: strings.duplicateKey,
				full: strings.duplicateKeyDetail,
			};
		}

		seen.add( key );
		return undefined;
	} );
}

/**
 * One row: what the item is, what it is set to, and its options behind a click.
 *
 * The row's body is the control that opens the options — the line an author
 * reads is the line they press, with no separate "edit" affordance to find.
 * Remove sits outside that button, because a control inside a control is not a
 * thing, and the drag handle sits outside it for the same reason.
 *
 * A row with no configuration is not that button. Nothing opens, so nothing may
 * look like it opens: it stays an inert read-out, and whatever it has to say for
 * itself arrives as `tip`.
 *
 * The popover is rendered inside the row and takes no explicit anchor, so it
 * positions against the row itself — which does not move when the summary text
 * changes under it. `onClose` covers every dismissal: Escape, a click outside,
 * and a second press on the row.
 *
 * Which row is open is the LIST's business, not a row's: rows are identified by
 * position, so a row that owned the state would hand its open popover to
 * whatever item took its place when the one above it was removed.
 *
 * @param {Object}    props                Component props.
 * @param {string}    props.id             Stable, unique id for this row's position.
 * @param {Object}    props.item           The item this row reports.
 * @param {number}    props.index          Its position in the list.
 * @param {?Object}   props.problem        Why its key would have the save refused.
 * @param {Function}  props.describe       Names the item and says what it is set to.
 * @param {?Function} [props.renderConfig] Renders the item's options, when it has any.
 * @param {?Function} [props.onItemSelect] Selects the item elsewhere.
 * @param {boolean}   [props.sortable]     Whether the row has a drag handle. Default `true`.
 * @param {boolean}   [props.removable]    Whether the row has a remove button. Default `true`.
 * @param {boolean}   props.isOpen         Whether this row's options are showing.
 * @param {Function}  props.onToggle       Opens or shuts this row's options: ( index ).
 * @param {Function}  props.onCloseConfig  Shuts whatever is open.
 * @param {Function}  props.onUpdate       Applies changes: ( index, changes ).
 * @param {Function}  props.onRemove       Removes the item: ( index ).
 * @param {string}    props.removeLabel    Accessible name for the remove button.
 * @return {JSX.Element} The row.
 */
function FieldRow( {
	id,
	item,
	index,
	problem,
	describe,
	renderConfig,
	onItemSelect,
	sortable: isSortable = true,
	removable = true,
	isOpen,
	onToggle,
	onCloseConfig,
	onUpdate,
	onRemove,
	removeLabel,
} ) {
	const strings = useStrings();
	const summary = describe( item, index );
	const configurable = Boolean( renderConfig );
	const navigable = ! configurable && Boolean( onItemSelect );

	// What pressing the row does: open a config popover, select the item
	// elsewhere, or nothing.
	let selectHandler;
	let selectAccessibleLabel;
	if ( configurable ) {
		selectHandler = () => onToggle( index );
		selectAccessibleLabel = strings.configureItem( summary.label );
	} else if ( navigable ) {
		selectHandler = () => onItemSelect( item, index );
		selectAccessibleLabel = strings.selectItem( summary.label );
	}

	const rowClassName =
		[
			summary.className,
			problem || summary.invalid ? 'is-invalid' : undefined,
		]
			.filter( Boolean )
			.join( ' ' ) || undefined;

	const trailing = (
		<>
			{ removable && (
				<Button
					icon={ trash }
					label={ removeLabel }
					showTooltip
					onClick={ () => onRemove( index ) }
					isDestructive
					size="small"
				/>
			) }
			{ configurable && isOpen && (
				<Popover
					placement="left-start"
					offset={ 36 }
					shift
					focusOnMount="firstElement"
					onClose={ onCloseConfig }
					className="vipui-inspector-field-list__popover"
					role="dialog"
					aria-label={ summary.label }
				>
					<Stack
						direction="column"
						gap="md"
						align="stretch"
						className="vipui-inspector-field-list__config"
					>
						{ renderConfig( {
							item,
							index,
							problem,
							update: ( changes ) => onUpdate( index, changes ),
						} ) }
					</Stack>
				</Popover>
			) }
		</>
	);

	const contentProps = {
		className: rowClassName,
		label: summary.label,
		value: problem ? problem.short : summary.value,
		empty: problem ? false : Boolean( summary.empty ),
		tip: configurable || navigable ? undefined : summary.tip,
		onSelect: selectHandler,
		expanded: configurable ? isOpen : undefined,
		selectLabel: selectAccessibleLabel,
		trailing,
	};

	if ( isSortable ) {
		return (
			<SortableFact
				id={ id }
				dragLabel={ strings.reorderItem( summary.label ) }
				{ ...contentProps }
			>
				{ summary.leading }
			</SortableFact>
		);
	}

	return <Fact { ...contentProps }>{ summary.leading }</Fact>;
}

/**
 * The list.
 *
 * `keyOf` and `isStarted` are a pair: together they are the storage-key check,
 * and a list whose items carry no key the author types leaves both off.
 * `renderConfig` is the other opt-in half — see `FieldRow` for what a row
 * without it becomes.
 *
 * `describe` returns what the row reads: `label` and `value`, `empty` when the
 * value stands in for a setting nobody made, `invalid` when it reports a problem
 * rather than a setting, `tip` for the explanation a row with no popover has
 * nowhere else to put, `leading` for an adornment before the name, and
 * `className` for the row.
 *
 * @param {Object}    props                Component props.
 * @param {Array}     props.items          The list, in the author's order.
 * @param {Function}  props.onChange       Reports the whole list back.
 * @param {?Function} [props.keyOf]        An item's storage key, for lists that have one.
 * @param {?Function} [props.isStarted]    Whether the author has begun this item.
 * @param {Function}  props.describe       Names an item and says what it is set to.
 * @param {?Function} [props.renderConfig] Renders an item's options: ( { item, index, problem, update } ).
 * @param {?Function} [props.onItemSelect] Selects an item elsewhere: ( item, index ).
 * @param {boolean}   [props.sortable]     Whether items can be reordered by dragging. Default `true`.
 * @param {?Function} [props.canRemove]    Per-item remove gate: ( item, index ) => boolean.
 * @param {string}    props.removeLabel    Accessible name for a row's remove button.
 * @param {string}    props.emptyLabel     What an empty list says for itself.
 * @return {JSX.Element} The list, or its empty state.
 */
export function InspectorFieldList( {
	items,
	onChange,
	keyOf,
	isStarted,
	describe,
	renderConfig,
	onItemSelect,
	sortable = true,
	canRemove,
	removeLabel,
	emptyLabel,
} ) {
	const strings = useStrings();

	// KeyboardSensor is not optional: this list lives in a narrow panel where
	// dragging is fiddly, so the keyboard route is the one that always works.
	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 8 } } ),
		useSensor( KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		} )
	);

	// Which row has its options showing. Held here because a row's identity is
	// its position: a removal or a reorder renumbers everything below it, and an
	// open popover that stayed put would be reporting — and writing to — an item
	// nobody opened. Both gestures shut it instead.
	const [ openIndex, setOpenIndex ] = useState( null );

	const problems = keyOf
		? keyProblems( items, keyOf, isStarted, strings )
		: [];

	// Position, and only position. Two items can share a key — that is the
	// collision this list flags — so a key cannot identify a row, and dnd-kit
	// needs the ids in a SortableContext to be unique or it cannot tell the pair
	// apart.
	//
	// It must not carry the key for a second reason: this doubles as the row's
	// React key, and a key derived from the item's own content changes as the
	// item is edited — remounting the row mid-keystroke and closing the popover
	// the author is typing into. Row identity is where a row sits; what it holds
	// is free to change underneath it.
	const sortId = ( item, index ) => String( index );

	const updateItem = ( index, changes ) => {
		onChange(
			items.map( ( item, i ) =>
				i === index ? { ...item, ...changes } : item
			)
		);
	};

	const removeItem = ( index ) => {
		setOpenIndex( null );
		onChange( items.filter( ( _, i ) => i !== index ) );
	};

	const handleDragEnd = ( { active, over } ) => {
		// A drop that ended where it started is no change, and reporting one
		// would mark the host dirty for a drag the author abandoned.
		if ( ! over || active.id === over.id ) {
			return;
		}

		// The sort ids ARE the positions (see `sortId`), so this is the whole
		// of the parse.
		setOpenIndex( null );
		onChange(
			arrayMove(
				items,
				parseInt( active.id, 10 ),
				parseInt( over.id, 10 )
			)
		);
	};

	if ( items.length === 0 ) {
		return (
			<Text
				variant="body-sm"
				render={ <p /> }
				className="vipui-inspector-section__help"
			>
				{ emptyLabel }
			</Text>
		);
	}

	const rows = items.map( ( item, index ) => (
		<FieldRow
			key={ sortId( item, index ) }
			id={ sortId( item, index ) }
			item={ item }
			index={ index }
			problem={ problems[ index ] }
			describe={ describe }
			renderConfig={ renderConfig }
			onItemSelect={ onItemSelect }
			sortable={ sortable }
			removable={ ! canRemove || canRemove( item, index ) }
			isOpen={ openIndex === index }
			onToggle={ ( target ) =>
				setOpenIndex( ( open ) => ( open === target ? null : target ) )
			}
			onCloseConfig={ () => setOpenIndex( null ) }
			onUpdate={ updateItem }
			onRemove={ removeItem }
			removeLabel={ removeLabel }
		/>
	) );

	const list = (
		<Stack
			render={ <ul /> }
			direction="column"
			gap="xs"
			className="vipui-inspector__facts vipui-inspector-field-list"
		>
			{ sortable ? (
				<SortableContext
					items={ items.map( sortId ) }
					strategy={ verticalListSortingStrategy }
				>
					{ rows }
				</SortableContext>
			) : (
				rows
			) }
		</Stack>
	);

	if ( ! sortable ) {
		return list;
	}

	return (
		<DndContext
			sensors={ sensors }
			collisionDetection={ closestCenter }
			onDragEnd={ handleDragEnd }
		>
			{ list }
		</DndContext>
	);
}

/**
 * The Add control for a field list, for a section's `actions` slot.
 *
 * Exported separately because it belongs in the section's heading rather than
 * inside the list — a list with nothing in it still has to be addable to, and a
 * button below an empty-state sentence reads as part of the sentence.
 *
 * The choice is made before there is a row: what KIND of item to add, or which
 * of the things the site offers. An option can be present and disabled — a kind
 * that exists and is already spoken for. That is the only thing `disabled` says
 * here: something the site cannot offer at all is left out by the caller rather
 * than greyed out, because a barred entry reads as a capability withheld from
 * the reader. If an item already in the list will not work, say so on its row,
 * where it reaches the author who is affected.
 *
 * `description` is one line under the option's name, where a catalogue's entries
 * say what they are.
 *
 * One option collapses to one button, but only when there is nothing to read
 * about it. A menu exists so an author can read before choosing; an option
 * carrying a description — or a reason it is barred — has something to be read,
 * and a bare `+` that silently commits to it would be answering a question it
 * never asked. `alwaysMenu` says the option's name is itself that thing.
 *
 * @param {Object}   props              Component props.
 * @param {Array}    props.addOptions   What can be added: `{ label, value, description?, disabled? }`.
 * @param {Function} props.onAdd        Adds one: ( optionValue ).
 * @param {string}   props.label        Accessible name for the control.
 * @param {boolean}  [props.alwaysMenu] Never collapse one option to a button.
 * @return {JSX.Element} The add control.
 */
export function InspectorFieldListAdd( {
	addOptions,
	onAdd,
	label,
	alwaysMenu = false,
} ) {
	const [ only ] = addOptions;

	if (
		! alwaysMenu &&
		1 === addOptions.length &&
		! only.description &&
		! only.disabled
	) {
		return (
			<Button
				icon={ plus }
				label={ label }
				showTooltip
				size="small"
				onClick={ () => onAdd( only.value ) }
			/>
		);
	}

	return (
		<DropdownMenu
			icon={ plus }
			label={ label }
			toggleProps={ { size: 'small', showTooltip: true } }
		>
			{ /*
			 * `MenuItem`s of our own rather than the `controls` prop, which
			 * renders a plain `Button` per entry and has nowhere to put the
			 * line under the name. Closing the menu is ours to do here, in the
			 * order `controls` did it: shut first, so focus is already on its
			 * way back to the toggle before the list grows a row.
			 */ }
			{ ( { onClose } ) =>
				addOptions.map( ( option ) => (
					<MenuItem
						key={ option.value }
						info={ option.description }
						disabled={ Boolean( option.disabled ) }
						onClick={ () => {
							onClose();
							onAdd( option.value );
						} }
					>
						{ option.label }
					</MenuItem>
				) )
			}
		</DropdownMenu>
	);
}

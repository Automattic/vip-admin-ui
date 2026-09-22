# Inspector panels

An inspector is a docked panel that floats over what it inspects (a canvas, a
graph, a list) and shows the options for the selected item. The kit has every
part of that panel: the shell, sections, read-out rows, list editors, and the
destructive control at the end. Every panel built from it reads the same way.

## TL;DR

| Concern | Rule |
|---|---|
| Shell | `InspectorShell`: eyebrow (what kind of thing), title (which one), scrolling body. Your wrapper positions the panel. The kit owns everything inside the card. |
| Header | The only control in the header is the collapse toggle. |
| Collapse | The state lives above the shell, in `InspectorCollapseContext`. With no provider, the panel does not collapse. |
| Body | One `Stack direction="column" gap="lg" align="stretch"`: sections, then the danger zone. |
| Grouping | Every group is an `InspectorSection`, open by default. Use `collapsible` only for groups that don't earn permanent space. |
| Read-outs | Every "name: value" line is a `Fact` in a `vipui-inspector__facts` list. |
| Rows are the button | A row that opens something is the button. There is no separate edit affordance. Remove buttons and drag handles go beside that button, not inside it. |
| One popover at a time | A list shows one item's options at a time, in a popover anchored to its row. Removing or reordering closes it. |
| Destructive | One `InspectorDangerZone`, at the foot of the body, as a labeled button, not an icon. |
| Explanations | Stated in place (`help`, `description`) or on a real trigger (`InfoTip`). Not a hover target on label text. |
| Docking | The kit assumes the panel docks to the right edge. Popovers and tooltips open to the left. |

## Setup

Import `@automattic/vip-admin-ui/tokens.css`, which has the panel's shadow. The
components import `inspector.css` themselves. Render inside `<StringsProvider>`
([Strings](i18n.md)), which supplies the kit's words: the collapse toggle, the
info-tip, row and grip names, and the key-problem messages. Sortable lists need
the `@dnd-kit/*` peer dependencies.

## A whole panel

```jsx
import { InspectorCollapseContext, InspectorShell, InspectorSection, InspectorFieldList,
	InspectorFieldListAdd, InspectorChoiceRow, InspectorDangerZone } from '@automattic/vip-admin-ui';

// The container stays mounted while the selection changes, so it owns collapse.
function Inspector( { selection, ...props } ) {
	const [ collapsed, setCollapsed ] = useState( false );
	const toggle = useCallback( () => setCollapsed( ( c ) => ! c ), [] );
	const collapse = useMemo( () => ( { collapsed, toggle } ), [ collapsed, toggle ] );
	return (
		<InspectorCollapseContext.Provider value={ collapse }>
			{ selection && <FormPanel form={ selection } { ...props } /> }
		</InspectorCollapseContext.Provider>
	);
}

function FormPanel( { form, roles, onChange, onAddField, onToggleRole, onDelete } ) {
	return (
		<InspectorShell eyebrow={ __( 'Form', 'my-plugin' ) } title={ form.title }>
			<Stack direction="column" gap="lg" align="stretch">
				<InspectorSection
					title={ __( 'Fields', 'my-plugin' ) }
					actions={ <InspectorFieldListAdd label={ __( 'Add field', 'my-plugin' ) } onAdd={ onAddField }
						addOptions={ [ { label: __( 'Text', 'my-plugin' ), value: 'text' } ] } /> }
				>
					<InspectorFieldList
						items={ form.fields }
						onChange={ ( fields ) => onChange( { fields } ) }
						keyOf={ ( field ) => field.key }
						isStarted={ ( field ) => Boolean( field.label ) }
						describe={ ( field ) => ( { label: field.label || __( 'Untitled', 'my-plugin' ), value: field.type } ) }
						renderConfig={ ( { item, update, problem } ) => (
							<TextControl __next40pxDefaultSize __nextHasNoMarginBottom label={ __( 'Key', 'my-plugin' ) }
								value={ item.key } help={ problem?.full } onChange={ ( key ) => update( { key } ) } />
						) }
						removeLabel={ __( 'Remove field', 'my-plugin' ) }
						emptyLabel={ __( 'No fields yet.', 'my-plugin' ) }
					/>
				</InspectorSection>
				<InspectorSection title={ __( 'Access', 'my-plugin' ) }>
					<InspectorChoiceRow
						label={ __( 'Roles', 'my-plugin' ) }
						options={ roles } // [ { value, label, help? } ]
						selected={ form.roles }
						onToggle={ onToggleRole }
						noneLabel={ __( 'All', 'my-plugin' ) }
						countLabel={ ( n ) => sprintf( _n( '%d role', '%d roles', n, 'my-plugin' ), n ) }
						unknownHelp={ __( 'Not a role on this site.', 'my-plugin' ) }
					/>
				</InspectorSection>
				<InspectorSection title={ __( 'Advanced', 'my-plugin' ) } collapsible
					summary={ form.honeypot ? __( 'On', 'my-plugin' ) : __( 'Off', 'my-plugin' ) }>
					<ToggleControl __nextHasNoMarginBottom label={ __( 'Spam trap', 'my-plugin' ) }
						checked={ form.honeypot } onChange={ ( honeypot ) => onChange( { honeypot } ) } />
				</InspectorSection>
				{ /* onDelete confirms with useConfirm first (modals.md). */ }
				<InspectorDangerZone label={ __( 'Delete form', 'my-plugin' ) } onClick={ onDelete } />
			</Stack>
		</InspectorShell>
	);
}
```

## `InspectorShell` and `InspectorCollapseContext`

The panel is a WPDS `Card` with a resting shadow, so it reads as sitting above
the surface. Its header stays put while the body scrolls inside the card.

**The header holds only the collapse toggle.** A destructive action there would
appear above every field it destroys, come first in the tab order, and be an
icon whose meaning is in a tooltip.

**Collapse state belongs to your container.** The shell unmounts whenever the
selection swaps one panel for another, so state held in the shell would reopen
the panel on every new selection. Provide `{ collapsed, toggle }` through
`InspectorCollapseContext` from something that stays mounted. Collapsing hides
the body rather than unmounting it, so sections keep their state and the body
keeps its scroll position. It does not use `CollapsibleCard`, which animates its
height to fit and conflicts with a panel that fills its container and scrolls.

## `InspectorSection`

An `InspectorSection` is how a panel groups its controls. An open section is a
divider (dropped on the first section), an `h3` title and the controls.

- `help` is one line under the title. A section with only `help` can serve as a
  one-line explanation for the panel.
- `collapsible` is for groups that do not earn permanent space, like a feature
  that is off or advanced options. `summary` shows the gist beside the title
  while it is closed ("Off", "3 fields"), and `defaultOpen` sets the starting
  state.
  Closed sections use `hiddenUntilFound`, so find-in-page still reaches their
  controls and opens the section.
- `actions` puts a control in the heading row, like Add over a list. It is a
  sibling of the disclosure trigger, because a button cannot contain a button.
  Pressing it opens a closed section first, so a newly added row is not hidden.

## Read-out rows: `Fact`, `SortableFact`, `InfoTip`

A `Fact` is one line: a name at the start, its value at the far end, an optional
adornment (`children`) before the name, and an optional control (`trailing`)
after it. Field lists and choice rows are built from it too, so "a line that
names something and opens its options" exists once. Render rows in the list
wrapper:

```jsx
<Stack render={ <ul /> } direction="column" gap="xs" className="vipui-inspector__facts">
	<Fact label={ __( 'Status', 'my-plugin' ) } value={ __( 'Not set', 'my-plugin' ) } empty />
</Stack>
```

- A row is inert until you pass `onSelect`. Then its body becomes a button, so
  the line you read is the line you press. `selectLabel` names that button,
  `expanded` sets `aria-expanded`, and `render` swaps in another element, such as
  a `Dropdown` toggle.
- `empty` italicizes a value that stands in for a missing setting. `tip` gives
  an inert row its explanation through `InfoTip`, and does not go with `onSelect`.
  `trailing` renders outside the row's button, which is where a per-row remove
  goes. `className="is-disabled"` mutes a row that cannot be used right now.

`SortableFact` is for an order only the author can express. It drags by a handle,
which is its own button, so it does not compete with the row's other controls
and gives the keyboard sensor a tab stop. Name the handle differently from the
row (`dragLabel`: "Reorder X", against the row's "Configure X"). It renders
inside a dnd-kit `SortableContext`.

`InfoTip` gives an explanation a real trigger: a button that opens on hover,
focus and tap, where label text is out of reach for keyboards and touch screens.
It is named after what it explains (`about`), so tabbing through a panel does
not announce a run of identical "More information" buttons.

## `InspectorFieldList` and `InspectorFieldListAdd`

An ordered list the author adds to, reorders and prunes: fields a form collects,
inputs or tools a step needs. The items differ but the list doesn't, so the
differences come in as props. `describe( item, index )` returns what a row
shows: `label`, `value`, `empty`, `invalid`, `tip`, `leading`, `className`.

- **Three behaviors are opt-in.** `renderConfig( { item, index, problem, update } )`
  makes a row open a settings popover. `onItemSelect` makes it navigate
  elsewhere. `keyOf` + `isStarted` turn on the storage-key check. If both
  `renderConfig` and `onItemSelect` are passed, the popover wins, because a row
  that opens its own settings does not also navigate away. A row with neither
  stays inert, and whatever it has to say goes in `tip`.
- **The list is the surface, and one item's settings show at a time.** Every
  sub-form open at once fills a panel with controls. The list owns
  which row is open. Rows are identified by position, so a remove or a reorder
  closes the popover instead of handing it to whichever item moved into its place.
- **Keys are checked here, not left to the server.** The first item to use a key
  owns it and later ones are flagged. A blank key is flagged only once the row
  has been started. The row is flagged as the author types, and `problem` reaches
  `renderConfig` so the message repeats beside the key field.
- `sortable` (default `true`) enables dragging, keyboard included. `canRemove(
  item, index )` gates removal per row. Grips and remove buttons show only on
  hover or focus.

`InspectorFieldListAdd` goes in the section's `actions` slot, not in the list.
An empty list still takes additions, and a button under an empty-state line
reads as part of the sentence. One option with no description is a `+` button.
Otherwise it is a menu, with each option's `description` under its name.
`disabled` means "exists, but already taken". Leave out anything the site cannot
offer, because a greyed-out entry reads as a capability withheld. `alwaysMenu`
forces the menu.

## `InspectorChoiceRow`

An `InspectorChoiceRow` is a multi-select that takes one line until someone needs
it. The row names the
setting and says what it's set to. Pressing it opens checkboxes in a popover
anchored to the row, the same shape core's document sidebar gives Visibility and
Author. A flat list of checkboxes charges the panel for every option on the site.

- **The value names the choices until they stop fitting, then counts them**
  (`countLabel`). The switch is a character budget, because the panel is a
  fixed-width column.
- **"All" and "None" are settings, not placeholders.** Pass whichever is true of
  your field as `noneLabel`.
- **Every stored value gets a box, even with no matching option on this site.**
  Dropping a stale value would make the row read "All" while the server offers
  the thing to nobody. `unknownHelp` explains these values.
- An option's `help` says why ticking it will not do what the author expects.
  It does not say why it cannot be ticked, because every box can be.

## `InspectorDangerZone`

An `InspectorDangerZone` is the panel's control for removing what it describes,
at the end of the body. Every panel uses it, so the delete controls stay alike.
It is a labeled, full-width button ("Delete form"), because an icon that explains
itself on hover says nothing on a touch screen. A heavier rule than the ones
between sections sets it apart, so it does not read as one more option.

`description` is said in place, not in a tooltip. It carries why the action is
unavailable, or what it costs. A `disabled` button stays focusable so that
description is announced. `busy` shows progress. Irreversible actions confirm
with [useConfirm](modals.md#useconfirm).

## Open question: `Popover` and `Menu`

`InspectorChoiceRow` and `InspectorFieldList` open with the `@wordpress/components`
`Popover`. `Dropdown` cannot be used, because it wraps its toggle in a `<div>` and
the toggle here is an `<li>` that must stay a direct child of its list.
`InspectorFieldListAdd` uses `DropdownMenu`. `@wordpress/ui` 0.22 ships `Popover`
and `Menu`, and these may move to them. The rules above (one popover at a time,
anchored to the row, opening to the left) hold whichever primitive draws them.

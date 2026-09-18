/**
 * InspectorChoiceRow — a read-out row whose value opens the choices that set it.
 *
 * A multi-select that costs one line until someone wants it. The row names the
 * setting and says what it is currently set to; pressing it opens the checkboxes
 * in a popover anchored to the row. This is the shape core's document sidebar
 * gives Visibility, Author and Post Format, and it is here for the same reason:
 * settings like allowed roles are set once and read often, and a flat list of
 * checkboxes charges the panel for every option the site has — on a site with a
 * dozen roles, pushing everything below it off the screen.
 *
 * The row is the `Fact` every other read-out is built from, so a setting behind
 * a popover still reads as one more line of the same list rather than a control
 * of its own kind.
 *
 * **The value names what is chosen, until the names stop fitting.** Past that it
 * counts them: "Editor, Author" says more than "2 roles", while a list long
 * enough to wrap says less than "5 roles" does. The switch is a character budget
 * rather than a measurement — the panel is a fixed-width column, so there is
 * nothing to measure that the budget does not already know.
 *
 * **"All" and "None" are settings, not placeholders**, which is why neither is
 * marked `empty`. The caller supplies whichever word is true of its own field.
 *
 * **Every stored value gets a box, whether or not the site has an option for
 * it.** The row makes a positive claim about what is set, so a value it declined
 * to count would be that claim made wrong — a stale slug would read "All" while
 * the server offers the thing to nobody. The author needs a box to clear it in.
 *
 * **`Popover` is from `@wordpress/components`.** `Dropdown` cannot open this
 * one: it renders a `<div>` around its toggle, and the toggle here is a `Fact`,
 * an `<li>` that has to stay a direct child of its list. `InspectorFieldList`
 * opens its per-item options the same way, from the same row.
 *
 * See docs/inspector.md.
 *
 * @package
 */

import { useState } from '@wordpress/element';
import { CheckboxControl, Popover } from '@wordpress/components';
import { Fieldset, Stack } from '@wordpress/ui';

import { Fact } from './InspectorFacts';
import { useStrings } from '../strings';

import './inspector.css';

/**
 * How many characters of names the value end of the row carries before the
 * count takes over.
 *
 * Thirty is about what is left of a 360px panel at `body-sm` once the label has
 * taken its share of the line.
 */
const VALUE_BUDGET = 30;

/**
 * The row, and the checkboxes its value opens.
 *
 * @param {Object}   props             Component props.
 * @param {string}   props.label       What is being set, on the row and as the group's name.
 * @param {?string}  [props.help]      A sentence about the setting, shown with the group.
 * @param {Array}    props.options     What can be chosen: `{ value, label, help? }`.
 * @param {Array}    props.selected    The values currently chosen.
 * @param {Function} props.onToggle    Adds or drops one: ( optionValue ).
 * @param {string}   props.noneLabel   What the row reads when nothing is chosen.
 * @param {Function} props.countLabel  Names a number of choices: ( count ).
 * @param {string}   props.unknownHelp What a stored value with no option on this site means.
 * @return {JSX.Element} The row.
 */
export function InspectorChoiceRow( {
	label,
	help,
	options,
	selected,
	onToggle,
	noneLabel,
	countLabel,
	unknownHelp,
} ) {
	const strings = useStrings();
	const [ isOpen, setIsOpen ] = useState( false );

	// A stored value the site has no option for stands in for itself, rather
	// than being dropped: it is what the setting holds, it survives every save,
	// and this is the only place it can be unticked. Its id is its name — there
	// is nothing else left to call it.
	const unrecognized = selected
		.filter(
			( value ) => ! options.some( ( option ) => option.value === value )
		)
		.map( ( value ) => ( { value, label: value, help: unknownHelp } ) );

	const allOptions = [ ...options, ...unrecognized ];
	const chosen = allOptions.filter( ( option ) =>
		selected.includes( option.value )
	);
	const names = chosen.map( ( option ) => option.label ).join( ', ' );

	let value = noneLabel;
	if ( chosen.length > 0 ) {
		value =
			names.length <= VALUE_BUDGET ? names : countLabel( chosen.length );
	}

	return (
		<Stack
			render={ <ul /> }
			direction="column"
			gap="xs"
			className="vipui-inspector__facts"
		>
			<Fact
				label={ label }
				value={ value }
				onSelect={ () => setIsOpen( ( open ) => ! open ) }
				expanded={ isOpen }
				// The label on its own would announce a button that says
				// nothing about what it is set to — which is the half of the
				// row anyone is reading it for.
				selectLabel={ strings.settingValue( label, value ) }
				trailing={
					isOpen && (
						<Popover
							placement="left-start"
							offset={ 36 }
							shift
							// The string, not a bare `true`: `useFocusOnMount`
							// only looks for a tabbable for 'firstElement' /
							// 'firstInputElement' and focuses the popover
							// container itself for every other value, landing a
							// keyboard user on a div instead of the first
							// checkbox.
							focusOnMount="firstElement"
							onClose={ () => setIsOpen( false ) }
							className="vipui-inspector-choice__popover"
							// Popover renders a role-less div, where an
							// aria-label alone is prohibited ARIA that
							// assistive tech ignores. The explicit dialog role
							// makes the label announce.
							role="dialog"
							aria-label={ label }
						>
							{ /* A real <fieldset>, named by its legend and
							     described by the help line, so the checkboxes
							     arrive as one named group rather than a run of
							     unrelated boxes. It brings its own reset and
							     column layout, so there is no CSS here. */ }
							<Fieldset.Root>
								<Fieldset.Legend>{ label }</Fieldset.Legend>
								{ help && (
									<Fieldset.Description>
										{ help }
									</Fieldset.Description>
								) }
								<Stack
									direction="column"
									gap="md"
									align="stretch"
								>
									{ allOptions.map( ( option ) => (
										<CheckboxControl
											__nextHasNoMarginBottom
											key={ option.value }
											label={ option.label }
											// Why this one will not do what
											// ticking it says, for the options
											// that have something to answer
											// for. Never a reason it cannot be
											// ticked: every box here can be,
											// and unticking is the whole point
											// of the ones that carry a note.
											help={ option.help }
											checked={ selected.includes(
												option.value
											) }
											onChange={ () =>
												onToggle( option.value )
											}
										/>
									) ) }
								</Stack>
							</Fieldset.Root>
						</Popover>
					)
				}
			/>
		</Stack>
	);
}

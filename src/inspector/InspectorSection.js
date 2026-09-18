/**
 * InspectorSection — one group of options inside an inspector panel.
 *
 * The single sectioning primitive for the panel. Every inspector groups its
 * controls with this, so every panel reads the same way.
 *
 * A section is open in place by default — a divider rule, a title, the controls.
 * Pass `collapsible` for the groups that don't earn permanent space (a feature
 * that's switched off, advanced options), and it becomes a disclosure with the
 * same title treatment. `summary` puts the collapsed state's gist next to the
 * title so the panel stays readable while shut.
 *
 * Collapsed panels use `hiddenUntilFound`, so browser find-in-page still reaches
 * the controls inside and springs the section open.
 *
 * `actions` puts a control in the heading row — the Add button over a list, say.
 * It is a SIBLING of the disclosure trigger rather than a child of it: the
 * trigger is a button, and a button inside a button is not a thing. That also
 * keeps the two apart for a pointer, so adding an item cannot toggle the section
 * shut underneath it.
 *
 * See docs/inspector.md.
 *
 * @package
 */

import { Children, useState } from '@wordpress/element';
import { Collapsible, Stack, Text } from '@wordpress/ui';
import { Icon } from '@wordpress/components';
import { chevronRight } from '@wordpress/icons';

import './inspector.css';

// The title, shared by both variants so they can't drift apart. `heading-md`
// is the whole of its type; the stylesheet only tones it.
function SectionTitle( { children } ) {
	return (
		<Text
			variant="heading-md"
			render={ <h3 /> }
			className="vipui-inspector-section__title"
		>
			{ children }
		</Text>
	);
}

// Optional explanatory line under a section title.
function SectionHelp( { children } ) {
	return (
		<Text
			variant="body-sm"
			render={ <p /> }
			className="vipui-inspector-section__help"
		>
			{ children }
		</Text>
	);
}

// Everything below a section's rule: the heading group, then the controls.
//
// Two nested columns rather than one evenly spaced list — a title and its own
// help line are a heading and its subtitle, so they belong tighter to each other
// (`xs`) than the pair belongs to the controls they introduce (`md`). Both
// variants render this; the collapsible one keeps its title in the trigger, so
// it passes only the help line.
//
// Either group is left out entirely when it holds nothing, rather than rendered
// empty: a flex gap falls between items whatever their height, so an empty box
// would still space the section as though it had content. `children` is counted
// through `Children.toArray` rather than tested for truth — a section whose
// controls are a `.map()` over a list that has not loaded yet hands us `[]`,
// which is truthy, and that is exactly the phantom gap this guard is for.
function SectionBody( { className, title, help, actions, children } ) {
	const hasChildren = Children.toArray( children ).length > 0;

	return (
		<Stack
			className={ className }
			direction="column"
			gap="md"
			align="stretch"
		>
			{ ( title || help || actions ) && (
				<Stack direction="column" gap="xs" align="stretch">
					{ /* The heading row appears only when something has to sit
					     beside the title. A bare title stays a bare title, so
					     the block margin the stylesheet gives it still lands on
					     a block rather than on a centred flex item. */ }
					{ actions ? (
						<Stack
							direction="row"
							align="center"
							gap="sm"
							justify="space-between"
							className="vipui-inspector-section__header"
						>
							{ title && <SectionTitle>{ title }</SectionTitle> }
							{ actions }
						</Stack>
					) : (
						title && <SectionTitle>{ title }</SectionTitle>
					) }
					{ help && <SectionHelp>{ help }</SectionHelp> }
				</Stack>
			) }
			{ hasChildren && (
				<Stack direction="column" gap="md" align="stretch">
					{ children }
				</Stack>
			) }
		</Stack>
	);
}

/**
 * @param {Object}      props               Component props.
 * @param {string}      props.title         The group's name.
 * @param {string}      [props.help]        One line of context under the title.
 * @param {string}      [props.summary]     The collapsed state's gist, e.g. "Off" or "3 fields".
 * @param {JSX.Element} [props.actions]     A control for the heading row, e.g. `InspectorFieldListAdd`.
 * @param {boolean}     [props.collapsible] Render as a disclosure.
 * @param {boolean}     [props.defaultOpen] Whether a disclosure starts open.
 * @param {JSX.Element} props.children      The controls.
 * @return {JSX.Element} The section.
 */
export function InspectorSection( {
	title,
	help,
	summary,
	actions,
	collapsible = false,
	defaultOpen = false,
	children,
} ) {
	if ( ! collapsible ) {
		return (
			<SectionBody
				className="vipui-inspector-section"
				title={ title }
				help={ help }
				actions={ actions }
			>
				{ children }
			</SectionBody>
		);
	}

	return (
		<CollapsibleSection
			title={ title }
			help={ help }
			summary={ summary }
			actions={ actions }
			defaultOpen={ defaultOpen }
		>
			{ children }
		</CollapsibleSection>
	);
}

// The disclosure variant, split out so its open state can be a hook — `actions`
// is a sibling of the trigger (a button inside a button is not a thing), which
// makes it pressable while the section is shut, and every action a section puts
// there adds something to the panel. `Collapsible.Root` reads `defaultOpen` once
// at mount, so an uncontrolled disclosure answered an Add by leaving the new row
// behind `hidden="until-found"` with only the summary to say it existed.
//
// Controlled here rather than opened by each caller: "adding to a group opens
// it" is the group's rule, and a caller that forgot it would fail silently.
function CollapsibleSection( {
	title,
	help,
	summary,
	actions,
	defaultOpen,
	children,
} ) {
	const [ open, setOpen ] = useState( defaultOpen );

	return (
		<Collapsible.Root
			open={ open }
			onOpenChange={ setOpen }
			className="vipui-inspector-section vipui-inspector-section--collapsible"
		>
			<Stack
				direction="row"
				align="center"
				gap="sm"
				className="vipui-inspector-section__header"
			>
				<Collapsible.Trigger className="vipui-inspector-section__toggle">
					<Icon
						icon={ chevronRight }
						size={ 20 }
						className="vipui-inspector-section__chevron"
					/>
					<SectionTitle>{ title }</SectionTitle>
					{ summary && (
						<Text
							variant="body-sm"
							className="vipui-inspector-section__summary"
						>
							{ summary }
						</Text>
					) }
				</Collapsible.Trigger>
				{ /* `display: contents`, so the wrapper carries the handler and
				     nothing else: the action stays a direct flex item of the
				     header and the row lays out exactly as it did. Capture
				     rather than bubble, so the section is already open by the
				     time the control's own click runs. */ }
				{ actions && (
					<div
						className="vipui-inspector-section__actions"
						onClickCapture={ () => setOpen( true ) }
					>
						{ actions }
					</div>
				) }
			</Stack>
			<Collapsible.Panel
				hiddenUntilFound
				className="vipui-inspector-section__panel"
			>
				{ /* Everything that has to vanish with the section goes on this
				     inner column, spacing included — never on the panel.
				     `hiddenUntilFound` shuts the panel with
				     `hidden="until-found"`, which the HTML rendering spec gives
				     `content-visibility: hidden` rather than `display: none`:
				     the panel still generates a box and still lays out its own
				     padding and border, and only its *contents* are skipped. A
				     padded panel therefore keeps that padding while collapsed,
				     as a strip of dead space under the header. */ }
				<SectionBody
					className="vipui-inspector-section__disclosed"
					help={ help }
				>
					{ children }
				</SectionBody>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}

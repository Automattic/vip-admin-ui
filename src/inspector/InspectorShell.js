/**
 * InspectorShell — the floating panel chrome shared by every inspector view.
 *
 * A small eyebrow label (e.g. "Stage" / "Transition"), a title, and a scrolling
 * body. Keeps the inspector views visually consistent without each one
 * re-implementing the header.
 *
 * The panel is a WPDS <Card> hovering over whatever it inspects, so its border,
 * radius, and elevation come from the design system rather than being redrawn
 * here. The consumer's wrapper positions it; this owns everything inside. The
 * header stays put while the body scrolls, so the title never scrolls away.
 *
 * The header carries no control but the collapse toggle. A panel's destructive
 * action ends its body instead, through `InspectorDangerZone`. In the header it
 * would sit above every field it destroys, be reached first in the tab order,
 * and be an icon whose meaning lived in a tooltip.
 *
 * **Collapse is deliberately hand-rolled rather than using `CollapsibleCard`.**
 * That component animates its content height to fit, which fights a panel that
 * fills its container and scrolls internally. Collapsing here just hides the
 * body, leaving the header bar — so the card keeps telling you what's selected
 * while the space behind it clears.
 *
 * See docs/inspector.md.
 *
 * @package
 */

import { createContext, useContext, useId } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { chevronUp, chevronDown } from '@wordpress/icons';
import { Card, Stack, Text } from '@wordpress/ui';

import { useStrings } from '../strings';

import './inspector.css';

/**
 * Collapsed state for the panel: `{ collapsed, toggle }`.
 *
 * It lives above the shell on purpose: the shell unmounts whenever the
 * selection swaps one panel for another, so state held here would spring back
 * open every time a different item was selected. The consumer's container stays
 * mounted, so it owns the flag and provides it through this context — which
 * keeps every panel component from threading two props it doesn't care about.
 *
 * No provider means the panel simply isn't collapsible.
 */
export const InspectorCollapseContext = createContext( null );

/**
 * @param {Object}      props           Component props.
 * @param {string}      [props.eyebrow] What kind of thing is selected.
 * @param {string}      [props.title]   Which one.
 * @param {JSX.Element} props.children  The panel body: sections, then the danger zone.
 * @return {JSX.Element} The panel.
 */
export function InspectorShell( { eyebrow, title, children } ) {
	const strings = useStrings();
	const collapse = useContext( InspectorCollapseContext );
	const bodyId = useId();
	const collapsed = Boolean( collapse?.collapsed );

	return (
		<Card.Root
			className={ `vipui-inspector${
				collapsed ? ' vipui-inspector--collapsed' : ''
			}` }
		>
			<Stack
				className="vipui-inspector__head"
				gap="sm"
				align="flex-start"
				justify="space-between"
			>
				<div className="vipui-inspector__heading">
					{ eyebrow && (
						// heading-sm is the uppercase label variant, so the
						// small caps come from the variant rather than the
						// stylesheet.
						<Text
							variant="heading-sm"
							render={ <span /> }
							className="vipui-inspector__eyebrow"
						>
							{ eyebrow }
						</Text>
					) }
					{ title && (
						// heading-lg is the whole of its type; the stylesheet
						// only tones it and lets a long one wrap.
						<Text
							variant="heading-lg"
							render={ <h2 /> }
							className="vipui-inspector__title"
						>
							{ title }
						</Text>
					) }
				</div>
				{ collapse && (
					<Button
						className="vipui-inspector__collapse"
						icon={ collapsed ? chevronDown : chevronUp }
						onClick={ collapse.toggle }
						label={
							collapsed
								? strings.expandPanel
								: strings.collapsePanel
						}
						showTooltip
						aria-expanded={ ! collapsed }
						aria-controls={ bodyId }
						__next40pxDefaultSize
					/>
				) }
			</Stack>
			{ /* Hidden rather than unmounted, so the options keep their state —
			     an expanded section is still expanded on the way back, and the
			     body keeps its scroll position. */ }
			<div
				id={ bodyId }
				className="vipui-inspector__body"
				hidden={ collapsed }
			>
				{ children }
			</div>
		</Card.Root>
	);
}

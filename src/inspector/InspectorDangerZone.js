/**
 * InspectorDangerZone — the panel's one destructive control, ending its body.
 *
 * Every inspector has exactly one way to remove what it describes. All of them
 * render through here, so they cannot drift into slightly different controls.
 *
 * A labelled button, not an icon: "Delete stage" is a word worth spending, and
 * an icon that only says what it does on hover says nothing at all to a touch
 * screen. And at the foot of the body rather than pinned in the header, where it
 * would sit above every field it destroys and ahead of all of them in the tab
 * order.
 *
 * The separation is doing real work. A long panel body means this ends a scroll
 * rather than a short list — the rule above it is heavier than the one between
 * option groups, and the button spans the panel, so nothing about it reads as
 * one more option.
 *
 * `description` is said in place rather than through a tooltip: it carries the
 * reason a disabled control is disabled, which is exactly the state a tooltip
 * is worst at reaching.
 *
 * See docs/inspector.md.
 *
 * @package
 */

import { useId } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { Stack, Text } from '@wordpress/ui';

import './inspector.css';

/**
 * @param {Object}   props               Component props.
 * @param {string}   props.label         The button's label, e.g. "Delete stage".
 * @param {Function} props.onClick       Runs the destructive action.
 * @param {boolean}  [props.disabled]    Whether the action is unavailable.
 * @param {boolean}  [props.busy]        Whether the action is in flight.
 * @param {string}   [props.description] Why it is unavailable, or what it costs.
 * @return {JSX.Element} The danger zone.
 */
export function InspectorDangerZone( {
	label,
	onClick,
	disabled = false,
	busy = false,
	description,
} ) {
	const descriptionId = useId();

	return (
		<div className="vipui-inspector-danger">
			<Stack direction="column" gap="sm" align="stretch">
				<Button
					variant="secondary"
					isDestructive
					onClick={ onClick }
					disabled={ disabled || busy }
					// Focusable while disabled, or the one state that needs
					// explaining is the one nobody can reach to hear it — the
					// description below is announced on focus.
					accessibleWhenDisabled
					isBusy={ busy }
					aria-describedby={ description ? descriptionId : undefined }
					__next40pxDefaultSize
				>
					{ label }
				</Button>
				{ description && (
					<Text
						variant="body-sm"
						id={ descriptionId }
						className="vipui-inspector-danger__help"
					>
						{ description }
					</Text>
				) }
			</Stack>
		</div>
	);
}

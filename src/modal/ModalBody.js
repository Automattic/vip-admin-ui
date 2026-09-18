/**
 * ModalBody — the standard modal body container.
 *
 * A vertical stack that owns the spacing between a modal's content blocks, so
 * individual bodies don't hand-roll per-child margins or ad-hoc `Stack`s. It is
 * the body counterpart to `<ModalActions>`: wrap a modal's content in it and let
 * the `gap` provide consistent rhythm.
 *
 * Exceptions that do NOT use `<ModalBody>`: full-bleed surfaces like a
 * `DataViews` grid (which owns its own padding), and static documentation
 * modals.
 *
 * See docs/modals.md.
 *
 * @package
 */

import { Stack } from '@wordpress/ui';

/**
 * @param {Object}      props             Component props.
 * @param {JSX.Element} props.children    The modal's content blocks.
 * @param {string}      [props.gap]       A WPDS gap size. Default `md`.
 * @param {string}      [props.className] Extra class.
 * @return {JSX.Element} The body.
 */
export function ModalBody( { children, gap = 'md', className } ) {
	const classNames = [ 'vipui-modal-body', className ]
		.filter( Boolean )
		.join( ' ' );

	return (
		<Stack direction="column" gap={ gap } className={ classNames }>
			{ children }
		</Stack>
	);
}

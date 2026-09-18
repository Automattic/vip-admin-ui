/**
 * useConfirm — a promise-based replacement for `window.confirm()` built on the
 * WPDS `Modal`.
 *
 * Browser-native `confirm()` is not a design-system component and cannot be
 * styled or made accessible to match the rest of the admin. This hook returns
 * an async `confirm( message, options )` that resolves `true`/`false`, plus the
 * dialog node to render once:
 *
 *   const [ confirm, confirmDialog ] = useConfirm();
 *   // …
 *   if ( ! ( await confirm( __( 'Delete this?', 'my-plugin' ) ) ) ) {
 *       return;
 *   }
 *   // …
 *   return ( <>{ confirmDialog } …</> );
 *
 * `options` may set `title`, `confirmLabel`, `cancelLabel`, and `isDestructive`.
 * Unset labels come from the plugin's strings (`confirm`, `cancel`).
 *
 * @package
 */

import { Modal, Button } from '@wordpress/components';
import { Text } from '@wordpress/ui';
import { useState, useRef, useCallback, useEffect } from '@wordpress/element';

import { ModalActions } from './ModalActions';
import { useStrings } from '../strings';

export function useConfirm() {
	const strings = useStrings();
	const [ dialog, setDialog ] = useState( null );
	const resolverRef = useRef( null );

	const confirm = useCallback( ( message, options = {} ) => {
		return new Promise( ( resolve ) => {
			// A confirm opened while another is still pending: settle the prior
			// one as cancelled so its awaiter never hangs.
			resolverRef.current?.( false );
			resolverRef.current = resolve;
			setDialog( { message, ...options } );
		} );
	}, [] );

	// Resolve a still-pending confirm as cancelled if the host unmounts, so the
	// awaiting caller never hangs.
	useEffect(
		() => () => {
			resolverRef.current?.( false );
			resolverRef.current = null;
		},
		[]
	);

	const settle = useCallback( ( result ) => {
		setDialog( null );
		const resolve = resolverRef.current;
		resolverRef.current = null;
		resolve?.( result );
	}, [] );

	const confirmDialog = dialog ? (
		<Modal
			title={ dialog.title || strings.confirm }
			onRequestClose={ () => settle( false ) }
			size="small"
		>
			{ typeof dialog.message === 'string' ? (
				<Text variant="body-md" render={ <p /> }>
					{ dialog.message }
				</Text>
			) : (
				dialog.message
			) }
			<ModalActions>
				<Button variant="tertiary" onClick={ () => settle( false ) }>
					{ dialog.cancelLabel || strings.cancel }
				</Button>
				<Button
					variant="primary"
					isDestructive={ dialog.isDestructive }
					onClick={ () => settle( true ) }
				>
					{ dialog.confirmLabel || strings.confirm }
				</Button>
			</ModalActions>
		</Modal>
	) : null;

	return [ confirm, confirmDialog ];
}

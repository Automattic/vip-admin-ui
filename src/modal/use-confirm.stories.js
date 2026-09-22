import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { Stack, Text } from '@wordpress/ui';

import { useConfirm } from './use-confirm';

export default {
	title: 'Modals/useConfirm',
	parameters: {
		docs: {
			description: {
				component:
					'`const [ confirm, confirmDialog ] = useConfirm();` — `await confirm( message, { title, confirmLabel, cancelLabel, isDestructive } )` resolves `true` or `false`. Render `confirmDialog` once.',
			},
		},
	},
};

function Demo( { message, options, trigger } ) {
	const [ confirm, confirmDialog ] = useConfirm();
	const [ result, setResult ] = useState( null );

	return (
		<Stack direction="column" gap="md" align="flex-start">
			<Button
				variant="secondary"
				isDestructive={ options.isDestructive }
				onClick={ async () =>
					setResult( await confirm( message, options ) )
				}
			>
				{ trigger }
			</Button>
			{ result !== null && (
				<Text variant="body-sm">Resolved: { String( result ) }</Text>
			) }
			{ confirmDialog }
		</Stack>
	);
}

export const Destructive = {
	render: () => (
		<Demo
			trigger="Delete post"
			message="“Weekly roundup” moves to the trash."
			options={ {
				title: 'Delete post?',
				confirmLabel: 'Delete',
				isDestructive: true,
			} }
		/>
	),
	play: async ( { canvas, canvasElement } ) => {
		const body = within( canvasElement.ownerDocument.body );
		await userEvent.click(
			canvas.getByRole( 'button', { name: 'Delete post' } )
		);
		const dialog = await body.findByRole( 'dialog', {
			name: 'Delete post?',
		} );
		await userEvent.click(
			within( dialog ).getByRole( 'button', { name: 'Delete' } )
		);
		await expect(
			await canvas.findByText( 'Resolved: true' )
		).toBeVisible();
	},
};

/** No options: the title and both labels come from the plugin's strings. */
export const Defaults = {
	render: () => (
		<Demo
			trigger="Reset filters"
			message="Clear every filter on this view?"
			options={ {} }
		/>
	),
	play: async ( { canvas, canvasElement } ) => {
		const body = within( canvasElement.ownerDocument.body );
		await userEvent.click(
			canvas.getByRole( 'button', { name: 'Reset filters' } )
		);
		const dialog = await body.findByRole( 'dialog' );
		// Without options, the labels come from StringsProvider. The modal fades in.
		await waitFor( () =>
			expect(
				within( dialog ).getByRole( 'button', { name: 'Confirm' } )
			).toBeVisible()
		);
		await userEvent.click(
			within( dialog ).getByRole( 'button', { name: 'Cancel' } )
		);
		await expect(
			await canvas.findByText( 'Resolved: false' )
		).toBeVisible();
	},
};

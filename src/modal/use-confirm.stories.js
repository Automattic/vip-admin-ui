import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { Stack, Text } from '@wordpress/ui';

import { useConfirm } from './use-confirm';

export default {
	title: 'Modals/useConfirm',
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: {
		// The play opens the dialog; a frame keeps it off the docs page.
		docs: { story: { inline: false, iframeHeight: 360 } },
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
Demo.displayName = 'Demo';

export const Destructive = {
	parameters: {
		docs: {
			source: {
				code: `const [ confirm, confirmDialog ] = useConfirm();

const onDelete = async () => {
	if ( await confirm( __( '“Weekly roundup” moves to the trash.', 'my-plugin' ), {
		title: __( 'Delete post?', 'my-plugin' ),
		confirmLabel: __( 'Delete', 'my-plugin' ),
		isDestructive: true,
	} ) ) {
		remove();
	}
};

return <>{ confirmDialog }<Button isDestructive onClick={ onDelete }>…</Button></>;`,
			},
		},
	},
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

export const Defaults = {
	parameters: {
		docs: {
			source: {
				code: `if ( await confirm( __( 'Clear every filter on this view?', 'my-plugin' ) ) ) {
	resetFilters();
}`,
			},
		},
	},
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

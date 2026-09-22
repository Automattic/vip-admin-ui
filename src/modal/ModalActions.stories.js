import { expect, within } from 'storybook/test';
import { useState } from '@wordpress/element';
import {
	Button,
	Modal,
	Notice,
	TextControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { Text } from '@wordpress/ui';

import { ModalActions } from './ModalActions';
import { ModalBody } from './ModalBody';

export default {
	title: 'Modals/ModalActions',
	component: ModalActions,
	// Docgen reads nothing off these components, so the Props table is written here.
	argTypes: {
		children: {
			description: 'The buttons, Cancel first and the primary last.',
			table: { type: { summary: 'ReactNode' } },
		},
		className: {
			description: 'A class for the footer container.',
			table: { type: { summary: 'string' } },
		},
	},
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: {
		// Each story renders an open modal; give each its own frame on the
		// docs page instead of stacking every overlay on top of the others.
		docs: {
			story: { inline: false, iframeHeight: 460 },
			source: { type: 'dynamic' },
		},
	},
};

/**
 * A modal that starts open and can be reopened. It is the story's frame, so
 * each story sets `docs.source.code` to the modal a consumer writes.
 *
 * @param {Object}   props
 * @param {Function} props.children Renders the body and footer, given `close`.
 */
function OpenModal( { children, ...props } ) {
	const [ isOpen, setIsOpen ] = useState( true );
	const close = () => setIsOpen( false );
	return (
		<>
			<Button variant="secondary" onClick={ () => setIsOpen( true ) }>
				Open modal
			</Button>
			{ isOpen && (
				<Modal onRequestClose={ close } { ...props }>
					{ children( close ) }
				</Modal>
			) }
		</>
	);
}
OpenModal.displayName = 'OpenModal';

const source = ( code ) => ( { docs: { source: { code } } } );

const dialog = ( canvasElement ) =>
	within( canvasElement.ownerDocument.body ).findByRole( 'dialog' );

export const Form = {
	parameters:
		source( `<Modal title={ __( 'Add source', 'my-plugin' ) } onRequestClose={ onClose }>
	<ModalBody>
		<Text variant="body-md" render={ <p /> }>…</Text>
		<TextControl __next40pxDefaultSize __nextHasNoMarginBottom label={ __( 'Name', 'my-plugin' ) } … />
		<TextControl __next40pxDefaultSize __nextHasNoMarginBottom label={ __( 'Feed URL', 'my-plugin' ) } … />
	</ModalBody>
	<ModalActions>
		<Button variant="tertiary" onClick={ onClose }>{ __( 'Cancel', 'my-plugin' ) }</Button>
		<Button variant="primary" onClick={ onSave }>{ __( 'Add source', 'my-plugin' ) }</Button>
	</ModalActions>
</Modal>` ),
	render: () => (
		<OpenModal title="Add source">
			{ ( close ) => (
				<>
					<ModalBody>
						<Text variant="body-md" render={ <p /> }>
							Sources are checked every hour for new items.
						</Text>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label="Name"
							value="City council agendas"
							onChange={ () => {} }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label="Feed URL"
							value="https://example.com/feed"
							onChange={ () => {} }
						/>
						<ToggleGroupControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label="Check every"
							value="hour"
							isBlock
							onChange={ () => {} }
						>
							<ToggleGroupControlOption
								value="hour"
								label="Hour"
							/>
							<ToggleGroupControlOption value="day" label="Day" />
						</ToggleGroupControl>
					</ModalBody>
					<ModalActions>
						<Button variant="tertiary" onClick={ close }>
							Cancel
						</Button>
						<Button variant="primary" onClick={ close }>
							Add source
						</Button>
					</ModalActions>
				</>
			) }
		</OpenModal>
	),
	play: async ( { canvasElement } ) => {
		const footer = ( await dialog( canvasElement ) ).querySelector(
			'.vipui-modal-actions'
		);
		const buttons = within( footer ).getAllByRole( 'button' );
		await expect( buttons[ 0 ] ).toHaveTextContent( 'Cancel' );
		await expect( buttons.at( -1 ) ).toHaveTextContent( 'Add source' );
	},
};

export const Informational = {
	parameters:
		source( `<Modal title={ __( 'Why this post is locked', 'my-plugin' ) } size="small" onRequestClose={ onClose }>
	<ModalBody>
		<Text variant="body-md" render={ <p /> }>…</Text>
	</ModalBody>
	<ModalActions>
		<Button variant="primary" onClick={ onClose }>{ __( 'Close', 'my-plugin' ) }</Button>
	</ModalActions>
</Modal>` ),
	render: () => (
		<OpenModal title="Why this post is locked" size="small">
			{ ( close ) => (
				<>
					<ModalBody>
						<Text variant="body-md" render={ <p /> }>
							Published posts go back through review before their
							changes go live.
						</Text>
					</ModalBody>
					<ModalActions>
						<Button variant="primary" onClick={ close }>
							Close
						</Button>
					</ModalActions>
				</>
			) }
		</OpenModal>
	),
};

export const Saving = {
	parameters: source( `<ModalActions>
	<Button variant="tertiary" onClick={ onClose } disabled={ saving }>{ __( 'Cancel', 'my-plugin' ) }</Button>
	<Button variant="primary" onClick={ onSave } isBusy={ saving } disabled={ saving }>{ __( 'Save', 'my-plugin' ) }</Button>
</ModalActions>` ),
	render: () => (
		<OpenModal title="Rename stage" size="small">
			{ () => (
				<>
					<ModalBody>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label="Name"
							value="Legal review"
							disabled
							onChange={ () => {} }
						/>
					</ModalBody>
					<ModalActions>
						<Button variant="tertiary" disabled>
							Cancel
						</Button>
						<Button variant="primary" isBusy disabled>
							Save
						</Button>
					</ModalActions>
				</>
			) }
		</OpenModal>
	),
	play: async ( { canvasElement } ) => {
		const save = within( await dialog( canvasElement ) ).getByRole(
			'button',
			{ name: 'Save' }
		);
		await expect( save ).toBeDisabled();
	},
};

export const WithError = {
	parameters: source( `<ModalBody>
	{ error && <Notice status="error" isDismissible={ false }>{ error }</Notice> }
	<TextControl … />
</ModalBody>` ),
	render: () => (
		<OpenModal title="Add source" size="small">
			{ ( close ) => (
				<>
					<ModalBody>
						<Notice status="error" isDismissible={ false }>
							The feed URL did not respond.
						</Notice>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label="Feed URL"
							value="https://example.com/feed"
							onChange={ () => {} }
						/>
					</ModalBody>
					<ModalActions>
						<Button variant="tertiary" onClick={ close }>
							Cancel
						</Button>
						<Button variant="primary">Retry</Button>
					</ModalActions>
				</>
			) }
		</OpenModal>
	),
};

export const Blocking = {
	parameters: source( `<Modal
	title={ __( 'Session expired', 'my-plugin' ) }
	size="small"
	isDismissible={ false }
	shouldCloseOnEsc={ false }
	shouldCloseOnClickOutside={ false }
	onRequestClose={ undefined }
>
	…
</Modal>` ),
	render: () => (
		<OpenModal
			title="Session expired"
			size="small"
			isDismissible={ false }
			shouldCloseOnEsc={ false }
			shouldCloseOnClickOutside={ false }
		>
			{ ( close ) => (
				<>
					<ModalBody>
						<Text variant="body-md" render={ <p /> }>
							Sign in again to keep your changes.
						</Text>
					</ModalBody>
					<ModalActions>
						<Button variant="primary" onClick={ close }>
							Sign in
						</Button>
					</ModalActions>
				</>
			) }
		</OpenModal>
	),
	play: async ( { canvasElement } ) => {
		const modal = await dialog( canvasElement );
		await expect(
			within( modal ).queryByRole( 'button', { name: /close/i } )
		).toBeNull();
	},
};

/**
 * The modal's parts drawn in place, for the anatomy: a real `Modal` renders
 * through a portal, where a docs page cannot measure it.
 */
export const Surface = {
	parameters: { docs: { story: { inline: true } } },
	render: () => (
		<div className="components-modal__frame">
			<div className="components-modal__content">
				<div className="components-modal__header">
					<div className="components-modal__header-heading-container">
						{ /* A div, not an h1: the docs page styles headings as its own. */ }
						<div className="components-modal__header-heading">
							Add source
						</div>
					</div>
				</div>
				<ModalBody>
					<Text variant="body-md" render={ <p /> }>
						Sources are checked every hour for new items.
					</Text>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label="Name"
						value="City council agendas"
						onChange={ () => {} }
					/>
				</ModalBody>
				<ModalActions>
					<Button variant="tertiary">Cancel</Button>
					<Button variant="primary">Add source</Button>
				</ModalActions>
			</div>
		</div>
	),
};

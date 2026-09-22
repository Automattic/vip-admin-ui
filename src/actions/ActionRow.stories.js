import { expect } from 'storybook/test';
import { Button } from '@wordpress/components';
import { plus } from '@wordpress/icons';

import { ActionRow } from './ActionRow';

export default {
	title: 'Actions/ActionRow',
	component: ActionRow,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
};

export const Default = {
	render: ( args ) => (
		<ActionRow { ...args }>
			<Button variant="tertiary">Cancel</Button>
			<Button variant="primary">Save</Button>
		</ActionRow>
	),
};

export const WithSecondary = {
	render: ( args ) => (
		<ActionRow { ...args }>
			<Button variant="tertiary">Cancel</Button>
			<Button variant="secondary">Save draft</Button>
			<Button variant="primary">Publish</Button>
		</ActionRow>
	),
};

/** For containers too narrow for a hugging row: a sidebar, an inspector column. */
export const Stretch = {
	args: { stretch: true },
	// The column is the story's frame, not part of the recipe's code.
	decorators: [
		( Story ) => (
			<div style={ { width: 280 } }>
				<Story />
			</div>
		),
	],
	render: ( args ) => (
		<ActionRow { ...args }>
			<Button variant="secondary" __next40pxDefaultSize>
				Save draft
			</Button>
			<Button variant="primary" __next40pxDefaultSize>
				Send to review
			</Button>
		</ActionRow>
	),
	play: async ( { canvas } ) => {
		const buttons = canvas.getAllByRole( 'button' );
		const row = buttons[ 0 ].parentElement.getBoundingClientRect().width;
		for ( const button of buttons ) {
			await expect( button.getBoundingClientRect().width ).toBe( row );
		}
		await expect( buttons.at( -1 ) ).toHaveTextContent( 'Send to review' );
	},
};

/** A destructive action next to a safe primary goes leftmost. */
export const DestructiveFirst = {
	render: ( args ) => (
		<ActionRow { ...args }>
			<Button variant="tertiary" isDestructive>
				Delete
			</Button>
			<Button variant="tertiary">Cancel</Button>
			<Button variant="primary">Save</Button>
		</ActionRow>
	),
	play: async ( { canvas } ) => {
		const buttons = canvas.getAllByRole( 'button' );
		await expect( buttons[ 0 ] ).toHaveTextContent( 'Delete' );
		await expect( buttons.at( -1 ) ).toHaveTextContent( 'Save' );
	},
};

/** Card footers and table cells take `size="small"`. */
export const CardFooter = {
	render: ( args ) => (
		<ActionRow { ...args }>
			<Button variant="tertiary" size="small">
				Duplicate
			</Button>
			<Button variant="primary" size="small">
				Edit
			</Button>
		</ActionRow>
	),
};

/** An icon from `@wordpress/icons`, before the label. */
export const WithIcon = {
	// The dynamic source would print the icon's inline SVG.
	parameters: {
		docs: {
			source: {
				code: `import { plus } from '@wordpress/icons';

<ActionRow>
	<Button variant="secondary" icon={ plus }>
		{ __( 'Add source', 'my-plugin' ) }
	</Button>
</ActionRow>`,
			},
		},
	},
	render: ( args ) => (
		<ActionRow { ...args }>
			<Button variant="secondary" icon={ plus }>
				Add source
			</Button>
		</ActionRow>
	),
};

import { Button } from '@wordpress/components';

import { ActionRow } from './ActionRow';

export default {
	title: 'Actions/ActionRow',
	component: ActionRow,
	args: { stretch: false },
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
	render: ( args ) => (
		<div style={ { width: 280 } }>
			<ActionRow { ...args }>
				<Button variant="primary" __next40pxDefaultSize>
					Send to review
				</Button>
				<Button variant="secondary" __next40pxDefaultSize>
					Save draft
				</Button>
			</ActionRow>
		</div>
	),
};

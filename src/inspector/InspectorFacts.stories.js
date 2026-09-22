import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { Stack } from '@wordpress/ui';

import { Fact, SortableFact } from './InspectorFacts';

export default {
	title: 'Inspector/Fact',
	component: Fact,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
	subcomponents: { SortableFact },
	args: { label: 'Post status', value: 'Pending' },
	decorators: [
		( Story ) => (
			<div className="sb-inspector-column">
				<Stack
					render={ <ul /> }
					direction="column"
					gap="xs"
					className="vipui-inspector__facts"
				>
					<Story />
				</Stack>
			</div>
		),
	],
};

export const Default = {};

/** The value is the absence of a setting, so it can't be mistaken for one. */
export const Empty = { args: { label: 'Due', value: 'Not set', empty: true } };

/** A row with nothing to press explains itself through an InfoTip. */
export const WithTip = {
	args: {
		label: 'Checkpoint',
		value: 'Review',
		tip: "Posts can't leave this region until someone signs off.",
	},
};

/** A row that opens what it reports is itself the button. */
export const Selectable = {
	args: {
		label: 'Send to legal',
		value: 'Legal review',
		onSelect: () => {},
		selectLabel: 'Select Send to legal',
	},
};

export const Disabled = {
	// a11y todo: `is-disabled` text is 2.77:1. The exemption covers inactive controls, and a read-out row isn't one.
	parameters: { a11y: { test: 'todo' } },
	args: { label: 'Approve', value: 'Published', className: 'is-disabled' },
};

export const Sortable = {
	// a11y todo: the grip is a 16px target (WCAG 2.5.8 wants 24px), and dnd-kit's role=status announcer lands inside the <ul>.
	parameters: { a11y: { test: 'todo' } },
	render: () => (
		<DndContext>
			<SortableContext items={ [ 'a', 'b' ] }>
				<SortableFact
					id="a"
					dragLabel="Reorder Headline"
					label="Headline"
					value="text"
				/>
				<SortableFact
					id="b"
					dragLabel="Reorder Kicker"
					label="Kicker"
					value="text"
				/>
			</SortableContext>
		</DndContext>
	),
};

import { InspectorDangerZone } from './InspectorDangerZone';

export default {
	title: 'Inspector/InspectorDangerZone',
	component: InspectorDangerZone,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: { docs: { source: { type: 'dynamic' } } },
	args: { label: 'Delete stage', onClick: () => {} },
	decorators: [
		( Story ) => (
			<div className="sb-inspector-column">
				<Story />
			</div>
		),
	],
};

export const Default = {};

/** Disabled stays focusable, so the reason is announced to whoever reaches it. */
export const Unavailable = {
	args: {
		disabled: true,
		description: 'Move the 4 posts in this stage somewhere else first.',
	},
};

export const Busy = { args: { busy: true } };

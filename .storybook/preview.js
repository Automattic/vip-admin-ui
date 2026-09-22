import '@wordpress/theme/design-tokens.css';
import '@wordpress/components/build-style/style.css';
import '@xyflow/react/dist/style.css';
import '../src/styles/tokens.css';
import '../src/styles/palette.css';
import '../src/styles/reset.css';
import './preview.css';
import './docs/docs.css';

import * as wpComponents from '@wordpress/components';

import { StringsProvider } from '../src/strings';
import { strings } from './strings';

// WPDS components are forwardRefs with no displayName, so a story's dynamic
// source prints `<React.ForwardRef>`. Name them after their export, here only.
for ( const [ name, component ] of Object.entries( wpComponents ) ) {
	if ( component?.$$typeof && ! component.displayName ) {
		component.displayName = name;
	}
}

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
	tags: [ 'autodocs' ],
	parameters: {
		layout: 'padded',
		controls: { expanded: true },
		// Every story is a WCAG 2.2 AA fixture: `npm run test:stories` fails on
		// a violation. Opt a story out with `a11y: { test: 'off' }` and a reason.
		a11y: {
			test: 'error',
			options: {
				runOnly: [
					'wcag2a',
					'wcag2aa',
					'wcag21a',
					'wcag21aa',
					'wcag22aa',
				],
			},
		},
		options: {
			storySort: {
				// A family's three docs pages come first, then its components'
				// stories. Storybook reads this statically, so no constants.
				order: [
					'Introduction',
					'Conventions',
					'Guidelines',
					'Foundations',
					'Actions',
					[ 'Usage', 'Build', 'Reference', '*' ],
					'Modals',
					[ 'Usage', 'Build', 'Reference', '*' ],
					'Settings',
					[ 'Usage', 'Build', 'Reference', '*' ],
					'Inspector',
					[ 'Usage', 'Build', 'Reference', '*' ],
					'Graph',
					[ 'Usage', 'Build', 'Reference', '*' ],
					'Avatar',
					[ 'Usage', 'Build', 'Reference', '*' ],
				],
			},
		},
	},
	decorators: [
		( Story ) => (
			<StringsProvider strings={ strings }>
				<div className="wrap">
					<div className="vipui-page">
						<Story />
					</div>
				</div>
			</StringsProvider>
		),
	],
};

export default preview;

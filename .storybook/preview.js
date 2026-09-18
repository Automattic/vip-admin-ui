import '@wordpress/theme/design-tokens.css';
import '@wordpress/components/build-style/style.css';
import '../src/styles/tokens.css';
import '../src/styles/palette.css';
import '../src/styles/reset.css';
import './preview.css';

import { StringsProvider } from '../src/strings';
import { strings } from './strings';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
	tags: [ 'autodocs' ],
	parameters: {
		layout: 'padded',
		controls: { expanded: true },
		options: {
			storySort: {
				order: [
					'Introduction',
					'Guidelines',
					[
						'Actions',
						'Modals',
						'Settings',
						'Inspector',
						'Avatar',
						'Strings',
					],
					'Foundations',
					'Actions',
					'Modals',
					'Settings',
					'Inspector',
					'Avatar',
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

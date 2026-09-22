import { expect } from 'storybook/test';
import { Stack, Text } from '@wordpress/ui';
import { globe } from '@wordpress/icons';

import { Avatar } from './Avatar';

export default {
	title: 'Avatar',
	component: Avatar,
	// The family's Usage, Build and Reference pages replace the autodocs page.
	tags: [ '!autodocs' ],
	parameters: {
		layout: 'centered',
		docs: { source: { type: 'dynamic' } },
	},
	args: { name: 'Ada Lovelace' },
	// Docgen reads no rows off the JSDoc for `src`, `icon` and `className`.
	argTypes: {
		name: {
			control: 'text',
			description: 'Display name. The source of the initials.',
		},
		src: {
			control: 'text',
			description:
				'Picture URL. An absent or broken picture falls back to the glyph, then to initials.',
		},
		icon: {
			control: false,
			description:
				'A glyph from `@wordpress/icons`, for an actor that is not a person.',
		},
		size: {
			control: 'inline-radio',
			options: [ 'sm', '2xs' ],
			description: 'Sets the box, the glyph and how many letters fit.',
			table: { defaultValue: { summary: 'sm' } },
		},
		className: {
			control: false,
			description: 'A class for the call site’s own layout.',
		},
	},
};

// A data URI, so the story renders the same offline.
const PICTURE =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#46a494"/><circle cx="32" cy="26" r="12" fill="#d9efeb"/><rect x="12" y="42" width="40" height="30" rx="15" fill="#d9efeb"/></svg>'
	);

export const Picture = { args: { src: PICTURE } };

export const Initials = {
	play: async ( { canvas } ) => {
		await expect( canvas.getByText( 'AL' ) ).toBeVisible();
	},
};

export const Size2xs = {
	name: 'Size 2xs',
	args: { size: '2xs' },
	play: async ( { canvas } ) => {
		await expect( canvas.getByText( 'A' ) ).toBeVisible();
	},
};

export const BrokenImage = {
	args: { src: 'https://invalid.example/missing.png' },
	play: async ( { canvas } ) => {
		await expect( await canvas.findByText( 'AL' ) ).toBeVisible();
		await expect( canvas.queryByRole( 'img' ) ).toBeNull();
	},
};

export const Glyph = { args: { name: 'Site', icon: globe } };

export const InARow = {
	render: () => (
		<Stack direction="column" gap="sm">
			{ [
				{ name: 'Ada Lovelace', src: PICTURE },
				{ name: 'Grace Hopper' },
				{ name: 'Site', icon: globe },
			].map( ( actor ) => (
				<Stack key={ actor.name } align="center" gap="sm">
					<Avatar { ...actor } size="2xs" />
					<Text variant="body-sm">{ actor.name }</Text>
				</Stack>
			) ) }
		</Stack>
	),
	// The dynamic source would print the map and the icon's inline SVG.
	parameters: {
		docs: {
			source: {
				code: `import { globe } from '@wordpress/icons';

<Stack direction="column" gap="sm">
	<Stack align="center" gap="sm">
		<Avatar src={ ada.avatar } name="Ada Lovelace" size="2xs" />
		<Text variant="body-sm">Ada Lovelace</Text>
	</Stack>
	<Stack align="center" gap="sm">
		<Avatar name="Grace Hopper" size="2xs" />
		<Text variant="body-sm">Grace Hopper</Text>
	</Stack>
	<Stack align="center" gap="sm">
		<Avatar name="Site" icon={ globe } size="2xs" />
		<Text variant="body-sm">Site</Text>
	</Stack>
</Stack>`,
			},
		},
	},
};

import { Stack, Text } from '@wordpress/ui';
import { globe } from '@wordpress/icons';

import { Avatar } from './Avatar';

export default {
	title: 'Avatar',
	component: Avatar,
	args: { name: 'Ada Lovelace', size: 'sm' },
	argTypes: { size: { control: 'inline-radio', options: [ 'sm', '2xs' ] } },
};

// A data URI, so the story renders the same offline.
const PICTURE =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#46a494"/><circle cx="32" cy="26" r="12" fill="#d9efeb"/><rect x="12" y="42" width="40" height="30" rx="15" fill="#d9efeb"/></svg>'
	);

export const Picture = { args: { src: PICTURE } };

/** No `src`, or one that fails to load: the initials take the same box. */
export const Initials = {};

export const BrokenImage = {
	args: { src: 'https://invalid.example/missing.png' },
};

/** An actor that is not a person passes a glyph instead of a picture. */
export const Glyph = { args: { name: 'Site', icon: globe } };

/** Every call site names the actor beside the avatar; the avatar is decorative. */
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
};

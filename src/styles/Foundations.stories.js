import { Stack, Text } from '@wordpress/ui';

export default {
	title: 'Foundations',
	parameters: {
		docs: {
			description: {
				component:
					'What the package adds to WPDS tokens. `tokens.css` and `palette.css` are imported per entry; everything else is `--wpds-*`.',
			},
		},
	},
};

const ROLES = [ 'stroke', 'background', 'highlight', 'background-dark' ];
const SLOTS = [ 1, 2, 3, 4, 5, 6, 7 ];

/** `palette.css`: seven categorical hues in four roles. For categories, never for state. */
export const CollaborationPalette = {
	render: () => (
		<Stack direction="column" gap="md">
			{ ROLES.map( ( role ) => (
				<Stack key={ role } align="center" gap="md">
					<Text variant="body-sm" className="sb-swatch-label">
						{ role }
					</Text>
					{ SLOTS.map( ( slot ) => (
						<div
							key={ slot }
							className="sb-swatch"
							title={ `--vipui-color-collaborator-${ role }-${ slot }` }
							style={ {
								background: `var(--vipui-color-collaborator-${ role }-${ slot })`,
							} }
						/>
					) ) }
				</Stack>
			) ) }
		</Stack>
	),
};

/** `--vipui-elevation-*`: the shadows WPDS removed in @wordpress/theme 1.0. */
export const Elevation = {
	render: () => (
		<Stack gap="2xl" wrap="wrap">
			{ [ 'xs', 'sm', 'md', 'lg' ].map( ( size ) => (
				<div
					key={ size }
					className="sb-elevation"
					style={ { boxShadow: `var(--vipui-elevation-${ size })` } }
				>
					<Text variant="body-sm">{ size }</Text>
				</div>
			) ) }
		</Stack>
	),
};

const TEXT = [
	'heading-2xl',
	'heading-xl',
	'heading-lg',
	'heading-md',
	'heading-sm',
	'body-xl',
	'body-lg',
	'body-md',
	'body-sm',
];

/**
 * `--vipui-text-*`: each `<Text variant>` as one `font` shorthand, for DOM that
 * cannot be a `<Text>`. Shown against the real `<Text>` so drift is visible.
 */
export const TypeComposites = {
	render: () => (
		<Stack direction="column" gap="md">
			{ TEXT.map( ( variant ) => (
				<Stack key={ variant } align="baseline" gap="xl">
					<Text variant={ variant } className="sb-type-sample">
						Text { variant }
					</Text>
					<span
						className="sb-type-sample"
						style={ {
							font: `var(--vipui-text-${ variant })`,
							textTransform:
								variant === 'heading-sm'
									? 'uppercase'
									: undefined,
						} }
					>
						--vipui-text-{ variant }
					</span>
				</Stack>
			) ) }
		</Stack>
	),
};

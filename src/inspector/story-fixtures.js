/**
 * Shared data for the inspector stories. Not exported from the package.
 */

import {
	TextControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

export const ROLES = [
	{ value: 'administrator', label: 'Administrator' },
	{ value: 'editor', label: 'Editor' },
	{ value: 'author', label: 'Author' },
	{ value: 'contributor', label: 'Contributor' },
];

export const FIELDS = [
	{ label: 'Headline', key: 'headline', type: 'text', required: true },
	{ label: 'Kicker', key: 'kicker', type: 'text', required: false },
	{ label: 'Embargo until', key: 'embargo', type: 'date', required: false },
];

export const FIELD_KINDS = [
	{ label: 'Text', value: 'text', description: 'One line of text.' },
	{
		label: 'Date',
		value: 'date',
		description: 'A day, and optionally a time.',
	},
	{ label: 'Person', value: 'user', description: 'Someone on this site.' },
];

export function describeField( field ) {
	return {
		label: field.label || 'Untitled field',
		value: field.required ? `${ field.type } · required` : field.type,
	};
}

export function renderFieldConfig( { item, problem, update } ) {
	return (
		<>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label="Name"
				value={ item.label }
				onChange={ ( label ) => update( { label } ) }
			/>
			<TextControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label="Key"
				value={ item.key }
				help={ problem?.full }
				onChange={ ( key ) => update( { key } ) }
			/>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label="Type"
				value={ item.type }
				isBlock
				onChange={ ( type ) => update( { type } ) }
			>
				{ FIELD_KINDS.map( ( kind ) => (
					<ToggleGroupControlOption
						key={ kind.value }
						value={ kind.value }
						label={ kind.label }
					/>
				) ) }
			</ToggleGroupControl>
			<ToggleControl
				__nextHasNoMarginBottom
				label="Required"
				checked={ item.required }
				onChange={ ( required ) => update( { required } ) }
			/>
		</>
	);
}

export function newField( type ) {
	return { label: '', key: '', type, required: false };
}

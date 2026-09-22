/**
 * The pieces a family's three docs pages are built from, ported from the
 * Archer workbench (dabowman/storybook, `src/docs/`) and repainted in
 * `--wpds-*` tokens. Stories are the fixtures: a recipe, an anatomy stage and
 * the testing table all read a story rather than drawing a copy of it, so
 * what the page shows is what `test:stories` checks.
 */
/* global ResizeObserver, MutationObserver */
import {
	isValidElement,
	useContext,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import {
	AnchorMdx,
	CodeOrSourceMdx,
	DocsContext,
	HeadersMdx,
	Markdown,
	Source,
	Story,
	useOf,
} from '@storybook/addon-docs/blocks';
import { Icon, Popover } from '@wordpress/ui';
import { info } from '@wordpress/icons';

import { StringsProvider } from '../../src/strings';
import { strings } from '../strings';
import { CONVENTIONS } from './conventions';
import { guideHref, guideSection } from './guide-sections';

/* ─── Guide text ──────────────────────────────────────────────────── */

const GuideLink = ( { href, ...props } ) => (
	<AnchorMdx { ...props } href={ href && guideHref( href ) } />
);

// `Markdown` spreads `options` after its own overrides, so passing any
// override means passing all of them.
const MARKDOWN_OPTIONS = {
	overrides: { code: CodeOrSourceMdx, ...HeadersMdx, a: GuideLink },
};

/**
 * One `##` section of a guide in `docs/`, heading included. `section="intro"`
 * is the lede under the guide's title.
 *
 * @param {Object}  props
 * @param {string}  props.guide    The guide, imported `?raw`.
 * @param {string}  props.section  The heading's slug.
 * @param {boolean} [props.demote] Render its headings a level down, under a page's own `##`.
 */
export function GuideSection( { guide, section, demote = false } ) {
	const markdown = guideSection( guide, section );
	return (
		<Markdown options={ MARKDOWN_OPTIONS }>
			{ demote ? markdown.replace( /^#+ /gm, '#$&' ) : markdown }
		</Markdown>
	);
}

/* ─── Three pages ─────────────────────────────────────────────────── */

const PAGES = [
	[ 'usage', 'Usage' ],
	[ 'build', 'Build' ],
	[ 'reference', 'Reference' ],
];

/** `actions-build--docs` → `actions`: the family of the page being rendered. */
function currentFamily() {
	const id = new URLSearchParams( window.location.search ).get( 'id' ) ?? '';
	return id.replace( /-(usage|build|reference)--docs$/, '' );
}

const pageHref = ( family, page, anchor ) =>
	`./?path=/docs/${ family }-${ page }--docs${ anchor ? `#${ anchor }` : '' }`;

/**
 * The strip under a family's title naming its three pages, this one marked.
 *
 * @param {Object} props
 * @param {string} props.current `usage`, `build` or `reference`.
 */
export function PageNav( { current } ) {
	const family = currentFamily();
	return (
		<nav
			className="sb-page-nav sb-unstyled"
			aria-label="Documentation pages"
		>
			<ul>
				{ PAGES.map( ( [ page, label ] ) => (
					<li key={ page }>
						{ page === current ? (
							<span aria-current="page">{ label }</span>
						) : (
							<AnchorMdx href={ pageHref( family, page ) }>
								{ label }
							</AnchorMdx>
						) }
					</li>
				) ) }
			</ul>
		</nav>
	);
}

/**
 * A link to another of the family's pages, or a heading on it.
 *
 * @param {Object} props
 * @param {string} props.page     `usage`, `build` or `reference`.
 * @param {string} [props.anchor] The heading's slug.
 * @param {string} [props.family] Another family's pages, by id segment.
 * @param {*}      props.children
 */
export function DocLink( { page, anchor, family, children } ) {
	return (
		<AnchorMdx href={ pageHref( family ?? currentFamily(), page, anchor ) }>
			{ children }
		</AnchorMdx>
	);
}

/* ─── Specimens ───────────────────────────────────────────────────── */

/**
 * What the preview decorator gives every story: the plugin's strings and the
 * `.wrap > .vipui-page` that `reset.css` keys on. A specimen drawn in MDX
 * isn't a story, so it gets the same ground here.
 * @param {Object} props
 * @param {*}      props.children
 */
function Ground( { children } ) {
	return (
		<StringsProvider strings={ strings }>
			<div className="wrap">
				<div className="vipui-page">{ children }</div>
			</div>
		</StringsProvider>
	);
}

/**
 * The Build page's unit: a story with its code open under it. The story
 * renders through Storybook's own `Story` block, which is what lets the
 * source be the JSX the story returned (`docs.source.type: 'dynamic'` on the
 * stories file's meta).
 *
 * @param {Object} props
 * @param {Object} props.of        The story.
 * @param {*}      [props.caption] A line on what the recipe shows.
 */
export function Recipe( { of, caption } ) {
	const { story } = useOf( of, [ 'story' ] );
	return (
		<figure className="sb-specimen">
			<div className="sb-specimen__stage">
				<Story of={ of } />
			</div>
			<Source of={ of } />
			<figcaption className="sb-specimen__caption">
				<span>{ caption }</span>
				<AnchorMdx href={ `./?path=/story/${ story.id }` }>
					Story
				</AnchorMdx>
			</figcaption>
		</figure>
	);
}

/**
 * A right and a wrong way, side by side, the verdict on the caption strip.
 *
 * @param {Object} props
 * @param {*}      props.do          The right way: a story, or JSX to render.
 * @param {*}      props.doCaption
 * @param {*}      props.dont        The wrong way: a story, or JSX to render.
 * @param {*}      props.dontCaption
 */
export function DoDont( { do: doExample, doCaption, dont, dontCaption } ) {
	return (
		<div className="sb-do-dont">
			{ [
				[ 'do', 'Do', doExample, doCaption ],
				[ 'dont', "Don't", dont, dontCaption ],
			].map( ( [ tone, verdict, example, caption ] ) => (
				<figure key={ tone } className="sb-specimen" data-tone={ tone }>
					<div className="sb-specimen__stage sb-unstyled">
						{ isValidElement( example ) ? (
							<Ground>{ example }</Ground>
						) : (
							// A story brings the preview's decorators.
							<Story of={ example } />
						) }
					</div>
					<figcaption className="sb-specimen__caption">
						<span>
							<strong>{ verdict }.</strong> { caption }
						</span>
					</figcaption>
				</figure>
			) ) }
		</div>
	);
}

/* ─── Anatomy ─────────────────────────────────────────────────────── */

// The negative circled digits ❶–❾: the callout and the legend use the same
// shape, so a reader carries it from the picture to the line that names it.
const GLYPHS = [ ...'❶❷❸❹❺❻❼❽❾' ];

/**
 * A story on a stage with numbered callouts measured onto its parts, and the
 * legend generated from the same list, so the numbers can't disagree with the
 * picture. A part whose selector matches nothing is listed without a marker.
 *
 * @param {Object}                                            props
 * @param {Object}                                            props.of    The story on the stage.
 * @param {Array<{label, description, note, selector, edge}>} props.parts `edge` is
 *                                                                        `top` (default), `bottom`, `left` or `right`.
 */
export function Anatomy( { of, parts } ) {
	const stage = useRef( null );
	const [ points, setPoints ] = useState( [] );

	useEffect( () => {
		const root = stage.current;
		const measure = () => {
			const origin = root.getBoundingClientRect();
			setPoints(
				parts.map( ( { selector, edge = 'top' } ) => {
					const el = selector && root.querySelector( selector );
					if ( ! el ) {
						return null;
					}
					const r = el.getBoundingClientRect();
					const x = r.left - origin.left;
					const y = r.top - origin.top;
					return {
						top: { left: x + r.width / 2, top: y - 12 },
						bottom: {
							left: x + r.width / 2,
							top: y + r.height + 12,
						},
						left: { left: x - 12, top: y + r.height / 2 },
						right: {
							left: x + r.width + 12,
							top: y + r.height / 2,
						},
					}[ edge ];
				} )
			);
		};
		const observer = new ResizeObserver( measure );
		observer.observe( root );
		const mutations = new MutationObserver( measure );
		mutations.observe( root, { childList: true, subtree: true } );
		return () => {
			observer.disconnect();
			mutations.disconnect();
		};
	}, [ parts ] );

	return (
		<figure className="sb-anatomy">
			<div className="sb-anatomy__stage" ref={ stage }>
				<Story of={ of } />
				{ points.map(
					( point, i ) =>
						point && (
							// Decorative: the legend carries the numbers.
							<span
								key={ i }
								className="sb-anatomy__marker"
								style={ point }
								aria-hidden="true"
							>
								{ GLYPHS[ i ] }
							</span>
						)
				) }
			</div>
			<ol className="sb-anatomy__legend">
				{ parts.map( ( { label, description, note } ) => (
					<li key={ label }>
						<strong>{ label }.</strong> { description }
						{ note && <DevNote>{ note }</DevNote> }
					</li>
				) ) }
			</ol>
		</figure>
	);
}

/* ─── Disclosure ───────────────────────────────────────────────────── */

// Every note registers here, so the toggle in Reference's status line can
// count them and flip all of them between popovers and inline text.
const notes = { count: 0, inline: false, listeners: new Set() };
let snapshot = { count: 0, inline: false };
const publish = () => {
	snapshot = { count: notes.count, inline: notes.inline };
	notes.listeners.forEach( ( listener ) => listener() );
};
const subscribe = ( listener ) => {
	notes.listeners.add( listener );
	return () => notes.listeners.delete( listener );
};
const useNotes = () =>
	useSyncExternalStore(
		subscribe,
		() => snapshot,
		() => snapshot
	);

/**
 * A mechanism behind a claim: an info button at the end of the sentence it
 * explains, opening the note in a popover so nothing on the page moves.
 * Reference only. Keep the content inline, since MDX puts it inside a `<p>`.
 *
 * @param {Object} props
 * @param {*}      props.children
 * @param {string} [props.label]  The button's name and the popover's title.
 */
export function DevNote( { children, label = 'Developer note' } ) {
	const { inline } = useNotes();
	useEffect( () => {
		notes.count++;
		publish();
		return () => {
			notes.count--;
			publish();
		};
	}, [] );
	if ( inline ) {
		return (
			<span className="sb-note sb-note--inline">
				<span className="sb-note__label">{ label }</span> { children }
			</span>
		);
	}
	return (
		<Popover.Root>
			<Popover.Trigger className="sb-note__button" aria-label={ label }>
				<Icon icon={ info } size={ 16 } />
			</Popover.Trigger>
			<Popover.Popup className="sb-note__popup">
				<Popover.Title className="sb-note__title">
					{ label }
				</Popover.Title>
				{ children }
			</Popover.Popup>
		</Popover.Root>
	);
}

/** "Show notes inline" with a count, for Reference's status line. */
export function DevNotesToggle() {
	const { count, inline } = useNotes();
	if ( ! count ) {
		return null;
	}
	return (
		<button
			type="button"
			className="sb-notes-toggle"
			aria-pressed={ inline }
			onClick={ () => {
				notes.inline = ! notes.inline;
				publish();
			} }
		>
			{ inline ? 'Show notes as popovers' : 'Show notes inline' } (
			{ count })
		</button>
	);
}

/**
 * A developer-only block behind a heading that opens it. A native
 * `<details>`, so find-in-page opens it on a match.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.hint]   What it holds, shown beside the title while closed.
 * @param {number} [props.level]  2, or 3 for a subsection.
 * @param {*}      props.children
 */
export function DevSection( { title, hint, level = 2, children } ) {
	const Heading = level === 3 ? 'h3' : 'h2';
	return (
		<details className="sb-dev-section">
			<summary>
				<Heading>{ title }</Heading>
				{ hint && (
					<span className="sb-dev-section__hint">{ hint }</span>
				) }
			</summary>
			{ children }
		</details>
	);
}

/* ─── Conventions ──────────────────────────────────────────────────── */

const CONVENTIONS_HREF = './?path=/docs/conventions--docs';

/**
 * A mechanism every family shares, on Reference: the canonical sentence in a
 * note titled "Convention: …", with a link to the Conventions page.
 *
 * @param {Object} props
 * @param {string} props.name   A key of `CONVENTIONS`.
 * @param {*}      [props.also] Only what this component does differently.
 */
export function Convention( { name, also } ) {
	const convention = CONVENTIONS[ name ];
	if ( ! convention ) {
		throw new Error( `Unknown convention "${ name }"` );
	}
	return (
		<DevNote label={ `Convention: ${ convention.title }` }>
			{ convention.body } { also }{ ' ' }
			<AnchorMdx href={ `${ CONVENTIONS_HREF }#${ name }` }>
				Conventions
			</AnchorMdx>
		</DevNote>
	);
}

/**
 * The same convention as a link, for Usage and Build, where nothing is
 * disclosed: "See Layout on the Conventions page."
 *
 * @param {Object} props
 * @param {string} props.name A key of `CONVENTIONS`.
 */
export function ConventionLink( { name } ) {
	const convention = CONVENTIONS[ name ];
	if ( ! convention ) {
		throw new Error( `Unknown convention "${ name }"` );
	}
	return (
		<>
			See{ ' ' }
			<AnchorMdx href={ `${ CONVENTIONS_HREF }#${ name }` }>
				{ convention.title }
			</AnchorMdx>{ ' ' }
			on the Conventions page.
		</>
	);
}

/* ─── Tables ───────────────────────────────────────────────────────── */

/**
 * A spec table with a live column: one row per state, size or mode, each row
 * a story. `note` puts a DevNote at the end of the row's last text cell.
 *
 * @param {Object}                   props
 * @param {string[]}                 props.head Headings for the text cells.
 * @param {Array<{of, cells, note}>} props.rows
 */
export function SpecimenTable( { head, rows } ) {
	return (
		<table className="sb-specimen-table">
			<thead>
				<tr>
					{ head.map( ( cell ) => (
						<th key={ cell }>{ cell }</th>
					) ) }
					<th>Example</th>
				</tr>
			</thead>
			<tbody>
				{ rows.map( ( { of, cells, note }, i ) => (
					<tr key={ i }>
						{ cells.map( ( cell, j ) => (
							<td key={ j }>
								{ cell }
								{ note && j === cells.length - 1 && (
									<DevNote>{ note }</DevNote>
								) }
							</td>
						) ) }
						<td className="sb-specimen-table__stage">
							<Story of={ of } />
						</td>
					</tr>
				) ) }
			</tbody>
		</table>
	);
}

/**
 * `Shift` + `Tab` → keycaps, with what's between the backticks left as text.
 *
 * @param {string} keys The keys, in backticks.
 * @return {Array} Keycaps and text.
 */
const keycaps = ( keys ) =>
	keys
		.split( /(`[^`]+`)/ )
		.filter( Boolean )
		.map( ( part, i ) =>
			part.startsWith( '`' ) ? (
				<kbd key={ i }>{ part.slice( 1, -1 ) }</kbd>
			) : (
				part
			)
		);

/**
 * The keyboard table, one row per key: `[ keys, action, note? ]`. Keys are
 * written in backticks, as the guides write them.
 *
 * @param {Object}  props
 * @param {Array[]} props.rows
 */
export function KeyTable( { rows } ) {
	return (
		<table className="sb-key-table">
			<thead>
				<tr>
					<th>Key</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{ rows.map( ( [ keys, action, note ] ) => (
					<tr key={ keys }>
						<td>{ keycaps( keys ) }</td>
						<td>
							{ action }
							{ note && <DevNote>{ note }</DevNote> }
						</td>
					</tr>
				) ) }
			</tbody>
		</table>
	);
}

/* ─── Testing status ──────────────────────────────────────────────── */

const A11Y = {
	error: '✅ Gate',
	todo: '⚠️ Known violation',
	off: '⬜ Off',
};

/**
 * One row per story across the family's stories files, read from the stories
 * themselves: whether axe gates it (`parameters.a11y.test`) and whether it
 * has a `play`. Order is each file's own, which is the sidebar's.
 *
 * @param {Object}        props
 * @param {Array<Object>} props.of The family's stories modules.
 */
export function TestingStatus( { of } ) {
	const context = useContext( DocsContext );
	const stories = of.flatMap( ( module ) =>
		Object.keys(
			context.resolveOf( module, [ 'meta' ] ).csfFile.stories
		).map( ( id ) => context.storyById( id ) )
	);
	return (
		<table>
			<thead>
				<tr>
					<th>Story</th>
					<th>axe, WCAG 2.2 AA</th>
					<th>Interaction test</th>
				</tr>
			</thead>
			<tbody>
				{ stories.map( ( story ) => (
					<tr key={ story.id }>
						<td>
							<AnchorMdx href={ `./?path=/story/${ story.id }` }>
								{ story.title.split( '/' ).pop() } ›{ ' ' }
								{ story.name }
							</AnchorMdx>
						</td>
						<td>
							{ A11Y[ story.parameters.a11y?.test ?? 'error' ] }
						</td>
						<td>
							{ story.playFunction ? <code>play</code> : '—' }
						</td>
					</tr>
				) ) }
			</tbody>
		</table>
	);
}

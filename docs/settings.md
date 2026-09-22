# Settings screens

A settings screen is an admin page where the user changes how a plugin
behaves. Every settings screen is divided, contained and saved the same way,
and each control says the same kinds of things about itself. [Modals](modals.md)
and [Actions](actions.md) cover the components; these rules cover the screen.
The reference is WordPress core, mainly the Gutenberg Preferences modal and
DataForm from `@wordpress/dataviews`. Where they disagree with your code, core
wins.

## TL;DR

| Concern | Rule |
|---|---|
| Page shell | A constrained-width page with a header. Say what the page is for once, in the subtitle. |
| Tabs | Split by topic, not by type of thing. Sentence case. One tab strip per screen, not nested. |
| Sections | A titled group of controls, not a card: use `SettingsSection`. Flat, no border, separated by space. |
| Cards | Only for a repeating entity the user acts on individually (a tool, a channel, an account). Not for part of the screen's own settings. |
| Card title | The entity's own name, not the section or page name. One `Card.Title`, `render={ <h2 /> }`. |
| Headings | `h1` page, `h2` section or card, `h3` sub-group. One `Text` variant per level. Do not skip a level. |
| Helper text | The control's `help` prop. Not a separate `<p>`, a legend or a badge. Context for a whole group goes in the section `description`. |
| Save | One Save per screen, in a sticky `SettingsFooter`, or in the header actions if the header already has an action. Not one per card or per section. If every control applies immediately, the screen has no Save. |
| Save feedback | `isBusy` + `disabled` on a Save button whose label does not change, plus one snackbar when it succeeds. |
| Errors | One inline error `Notice` at the top of the panel, dismissed with `onRemove`. Do not leave `console.error` as the only response. |
| Badges | Only for runtime state the user must act on. |
| Icons / emoji | Icons from `@wordpress/icons` only. No emoji. |
| Labels | Sentence case. Verbs come from the [vocabulary table](actions.md#vocabulary). |
| Toggles | A visible `label` on every toggle. |

## What core does

1. Sections are fieldsets, not cards. Each Preferences group is a borderless
   `<fieldset>` whose `<legend>` holds an `<h2>` and an optional description,
   separated by `2.5rem`. Space and a heading do the grouping. Containers are
   kept for when containment means something.
2. Every control has its own `help`. The label names the setting
   (`Always open List View`). The help states the effect
   (`Opens the List View panel by default.`). It does not restate the label,
   and it goes through the prop, which wires up `aria-describedby`.
3. A section description is for context the controls cannot hold. About half
   the Preferences sections have one.
4. Save is one button or none. Preferences save each toggle immediately. The
   site editor has one Save. Classic screens call `submit_button()` once. Core
   does not put a Save inside a repeating unit.

The only badge in core's settings surfaces is DataForm's validation badge ("N
fields need attention"). That is the bar for a badge: an error count the user
can act on.

## Setup and page shell

Import `@automattic/vip-admin-ui/reset.css` and `tokens.css` once per React
entry, and put `vipui-page` on the admin page's root element. The reset keeps
wp-admin's `common.css` from overriding the design system's type and margins.
Render the screen inside `<StringsProvider>` ([Strings](i18n.md)).

The package does not include a page scaffold. Core's version is
`@wordpress/admin-ui`'s `Page`. It is bundled rather than exposed to plugins
and uses private APIs, so copy its structure instead of importing it. Whatever
scaffold you use:

- State the page's purpose once, in the subtitle. If a panel opens with a
  paragraph explaining the page again, delete that paragraph.
- Put page-level actions in the header. An "add" or "how to" button in a bar at
  the bottom of the page belongs in the header.
- Use a constrained width for settings screens. Long lines make form text hard
  to read. Full width is for data screens.

## Tabs

| Rule | |
|---|---|
| What a tab is | A topic someone would name if asked what they came to change: `General`, `Appearance`, `Notifications`. |
| What a tab is not | One instance of something repeating. Five destinations are five cards in one tab, not five tabs. |
| Label | Sentence case, one word if possible. No `&`: a tab that needs "X & Y" should be two tabs. |
| Count | 2–6. One tab is not a tab strip. More than six means the split is wrong. |
| Nesting | None. |
| Persistence | The active tab is saved in the `tab` query parameter. |

```jsx
<Tabs.Root value={ selected } onValueChange={ onChange }>
	<Tabs.List>
		{ tabs.map( ( tab ) => <Tabs.Tab key={ tab.name } value={ tab.name }>{ tab.title }</Tabs.Tab> ) }
	</Tabs.List>
	{ tabs.map( ( tab ) => (
		<Tabs.Panel key={ tab.name } value={ tab.name } keepMounted>{ tab.content }</Tabs.Panel>
	) ) }
</Tabs.Root>
```

- Start a panel with its first section, not with a heading that repeats the tab
  name. A card titled `General` inside the `General` tab is the most common
  redundancy.
- A panel is an unstyled box, and you own its spacing. `Tabs.Panel` has no
  padding, background or border. Give it a `Stack` for rhythm, not a surface.
- A card placed directly in a panel is a list item, not a section wrapper. The
  panel is already a named, bounded region, so a card around the screen's own
  settings draws a second border and usually repeats the name.
- Categories can be tabs. The rule is against tabs that are instances. A fixed
  set of kinds is a topic split. Keep a tab even when its category is empty,
  with a line saying so, or the tab strip changes from site to site.
- Give panels with editable state `keepMounted`. Base UI unmounts hidden panels
  by default, so switching tabs discards typed input, component state and any
  save callback a component registered. In tests, `getByText` finds content in a
  hidden panel but `getByRole` does not.
- A wrapper that only adds padding has no border. Borders do not nest.

## Sections

```jsx
import { SettingsSection } from '@automattic/vip-admin-ui';

<Stack direction="column" gap="2xl">
	<SettingsSection
		title={ __( 'Publishing', 'my-plugin' ) }
		description={ __( 'How posts move from draft to live.', 'my-plugin' ) }
	>
		<ToggleControl __nextHasNoMarginBottom … />
	</SettingsSection>
	<SettingsSection title={ __( 'Access', 'my-plugin' ) }>…</SettingsSection>
</Stack>
```

`SettingsSection` renders core's layout using `@wordpress/ui`'s `Fieldset`: a
fieldset with no border, an `<h2>` (`heading-md`) as its name, an optional
description, and a column of controls. The title names the group and the
description describes it, and each goes in its own slot. The section sets the
space between its own controls. The space between sections comes from the
`Stack` you wrap them in. Do not add margins.

- Write the title as a noun phrase in sentence case: `Publishing`,
  `Bypass permissions`.
- Add a description only when it is needed. If it rephrases the title, delete
  it.
- Do not give a section the same name as a control inside it. If they share a
  name, one of them is named wrong.
- Do not add dividers. No `<hr>` between fields. The gap is the separator.

## Cards

A card is a surface for one repeating entity that can be acted on by itself.
To decide, ask whether this is something the system has many of, that the user
acts on individually. If it is, use a card (a tool, an integration, a channel).
If not, use a section ("General", "Permissions"). A section is part of the
screen. A card is an item the screen lists.

```jsx
<Card.Root>
	<Card.Header render={ <Stack justify="space-between" align="center" gap="md" /> }>
		<Card.Title render={ <h2 /> }>{ entity.name }</Card.Title>
		<ToggleControl __nextHasNoMarginBottom label={ __( 'Enabled', 'my-plugin' ) }
			checked={ entity.enabled } onChange={ onToggle } />
	</Card.Header>
	<Card.Content render={ <Stack direction="column" gap="lg" /> }>
		<Text variant="body-md" render={ <p /> }>{ entity.description }</Text>
		{ /* settings fields */ }
	</Card.Content>
</Card.Root>
```

- Header: the entity's name, then at most one control (a labeled enable
  toggle) and at most one badge. Nothing else.
- Content: start with a one-sentence description. Render the content as a
  `Stack` so controls without a bottom margin still get spacing.
- No footer: cards do not have save buttons. No nesting: a card does not
  contain another card.
- When a screen lists more than about six entities, collapse them by default
  with `@wordpress/ui`'s `CollapsibleCard` (closed unless you set
  `defaultOpen`). The screen then reads as a list of names before it becomes a
  wall of forms.

## Helper text and fields

- Put helper text in `help`, only when it prevents a mistake, and keep it
  short: one sentence, about 50 characters. If it is the label written as a
  sentence, delete it. A separate `<p>` is not read by assistive technology and
  does not get the control's spacing.
- Do not use a legend or key. "Soft = warning / Hard = blocks" is helper text
  for the control that offers soft or hard, so put it there. A capability works
  the same way: it goes in the `help` of the toggle that turns it on, not in a
  badge.
- `help` is not for errors. Errors are Notices.
- Context that covers the whole group goes in the section `description`, above
  the controls. Below a checkbox grid, it reads like a footnote to the last
  checkbox.
- Give every `@wordpress/components` control `__next40pxDefaultSize` and
  `__nextHasNoMarginBottom`. The parent `Stack` handles spacing.
- Schema-driven forms that need more than a flat list (grouping, labels beside
  fields, collapsible groups, validation) use `DataForm` from
  `@wordpress/dataviews`. Do not build a second layout engine.

## Saving

```jsx
import { SettingsFooter } from '@automattic/vip-admin-ui';

<SettingsFooter>
	<Button variant="primary" onClick={ onSave } isBusy={ saving } disabled={ saving || ! isDirty }>
		{ __( 'Save', 'my-plugin' ) }
	</Button>
</SettingsFooter>
```

`SettingsFooter` is a sticky `ActionRow` pinned to the bottom of the content
column. It has its own border, background and padding. Pass it one `primary`
button and nothing else.

- Do not put a Save on each card or each section, or both. Twelve Saves turn a
  list into twelve forms, and the user has to check each one.
- Or none. A screen where every control applies immediately has no Save. A
  screen is staged-and-saved or immediate, not half of each.
- Keep actions in one place. If the header already has an action
  (`Add channel`), Save goes last in the header actions instead of in a footer.
  Otherwise the user has to look in two places to see what they can do. The
  page renders the header, but the screen holds the unsaved-changes state, so
  move that state into a hook the page calls and pass it down.
- Saving many entities. If each entity has its own REST route, the one Save
  goes through the changed ones and calls each entity's own save. Each card
  tells the screen whether it has unsaved changes and how to save itself. The
  card sends the request, but the screen decides when. If some saves fail, the
  error names which ones. "Newsletter: Network down" is something the user can
  act on. A bare "Save failed" after five out of six succeeded is not.
- Guard the unsaved-changes report so it can do nothing. The effect runs on
  every keystroke. If the parent's setter returns new state each time, the
  screen re-renders in a loop. When nothing changed, return the previous state.

| Save feedback | How |
|---|---|
| Saving | `isBusy` + `disabled`. The label does not change. |
| Nothing to save | `disabled` |
| Success | One `createSuccessNotice( …, { type: 'snackbar' } )` |
| Failure | An inline error `Notice` at the top of the panel |

Do not swap the label (`Saving…` → `Saved!`) and do not add a separate "Unsaved
changes" line. `isBusy` and one snackbar already say it. The same goes for
every pending action (`Retry`, `Send test`).

## Status, errors and empty states

| State | Pattern |
|---|---|
| Loading | `<SettingsLoading />`: a spinner and a muted label. The label defaults to the `loading` string. |
| Load failed | `<Notice status="error" isDismissible={ false }>` filling the panel |
| An action failed | `<Notice status="error" onRemove={ … }>` at the top of the panel |
| Empty | `<Text variant="body-md" render={ <p /> }>` saying what to do next. No wrapper `<div>`, no illustration. |
| Success | Snackbar only |

Use `onRemove`, not `onDismiss`, which WPDS documents as deprecated. Show every
caught error. If the only response is `console.error`, the user sees a spinner
stop and nothing change.

> **Open question: this may move to the `@wordpress/ui` primitive.** `@wordpress/ui`
> 0.22 ships `EmptyState` (with title, description, visual and actions slots) and
> `Notice` (which uses `intent` instead of `status`). The rule "empty state is a
> `Text` with no illustration" came before `EmptyState` and may give way to it.
> The error rules stay the same whichever `Notice` you use.

## Badges

A badge is only for runtime state the user must act on: a gap they can fix
(`Setup needed` on an integration missing credentials) or a validation error
count. Not a category or type (the heading already says it), not a capability
(that is a labeled field or prose), not a static fact like `Configured` (the
absence of `Setup needed` says it), and not something an adjacent Notice
already says (keep the Notice: it names which requirement is unmet).

Use at most one badge per card header, in sentence case, two words or fewer.
`Setup needed, two sources work` is prose in a pill. `intent` is a severity
scale, not a palette. Mapping a type onto it renders a harmless category as a
warning. Where a category needs color, use a Badge shell with a custom color
from `palette.css` (`--vipui-color-collaborator-*`, categories only, not
state).

## Icons, emoji and headings

- Icons come from `@wordpress/icons` as `icon={ imported }`. Most settings rows
  do not need one: icons are for repeated actions and icon-only controls.
- Do not use emoji: not in labels, not in PHP-supplied icons, not in code
  samples. Emoji render differently on each platform, mean nothing to assistive
  technology, cannot be themed, and look unserious in a work tool.

| Level | Element | `Text` variant | Used for |
|---|---|---|---|
| Page | `h1` | `heading-lg` | The page title |
| Section / card | `h2` | `heading-md` | `SettingsSection` title, `Card.Title` |
| Sub-group | `h3` | `heading-sm` | A named cluster inside a section or card |
| Body | `p` | `body-md` | Descriptions, prose |

Use one variant per level, so readers can tell depth from weight. The exception
is `Card.Title`: it has its own type (the same as `heading-lg`), and restyling
it in CSS would be a design-system override. Pass `render={ <h2 /> }` and leave
its type alone. Do not skip a heading level. A small uppercase eyebrow label is
not a heading. Cards nested under a section heading mean the section should
have been a tab.

## Labels

Use sentence case (`Bypass permissions`, not `Bypass Permissions`). A section
heading that ends with the page's own noun (`Check Tools` on a `Tools` page)
says it twice, so call it `Checks`. A keyboard shortcut is not part of a
setting's name (`Show in command palette`, not `… (⌘K)`). Use one verb per
concept: if the button says `Add custom tools`, the dialog it opens has the same
title.

## Accessibility floor

- Every control has a visible `label`, or has `hideLabelFromVision` with the
  label still provided. Helper text goes through `help`.
- Grouped checkboxes and radios are in a `<fieldset>` with a `<legend>`.
  Heading levels go down one step at a time.
- Status is not shown by color alone. It includes a word.
- A control that is disabled because of a precondition explains why in `help`,
  not in a `title` tooltip.

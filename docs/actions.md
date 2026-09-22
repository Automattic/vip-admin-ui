# Actions

An action group is the set of buttons for one surface: a page header, a card
footer, a settings bar, an inspector panel or a list row. Every group outside a
modal footer is weighted, ordered and labelled the same way, so the user finds
the main action in the same place on every screen. [Modals](modals.md) applies
the same rules to modal footers, and [Settings](settings.md) narrows them for
Save.

Every action is a `Button` from `@wordpress/components` or a DataViews action
descriptor. No other element is used for actions.

> **Open question: this may move to the `@wordpress/ui` primitive.** `@wordpress/ui`
> 0.22 ships `Button` and `IconButton`. These rules use the props of the
> `@wordpress/components` `Button` (`variant`, `isDestructive`, `isBusy`,
> `showTooltip`, `size`). How they map onto the new primitive is not decided.

## TL;DR

| Concern | Rule |
|---|---|
| Every action | A WPDS `Button` or a DataViews action descriptor. No raw `<button>`, no `role="button"` div, no clickable `<tr>`. |
| Weight | `variant` says what happens when you click, not how important the button is. At most one `primary` per group. |
| Destructive | `isDestructive` is only for irreversible or data-losing actions. It is added on top of the variant the weight rule picked. It is not a signal by itself, and it is not a "be careful" flag on something reversible. |
| Order | Dismiss and secondary actions first, primary last (rightmost, or lowest when stacked). A destructive action is not rightmost next to a safe primary. |
| Alignment | Right-aligned in every container, using `ActionRow`. |
| Stretch | Buttons fit their content. They stretch only in columns narrower than about 280px, and then every button in the group stretches. |
| Size | Default (40px) in modal footers, page headers, settings bars and inspectors. `small` in card footers and table cells. `compact` only in columns narrower than 280px. |
| Icon | `icon={ imported }` from `@wordpress/icons`, placed before the label. Not a dashicon string, a glyph inside a translated string, or an icon passed as `children`. |
| Icon-only | `label` and `showTooltip`, both. `title` alone is not enough. |
| Busy | `isBusy` + `disabled`. Do not replace the label with a spinner. |
| Labels | Sentence case. One verb per concept (see [Vocabulary](#vocabulary)). |
| Confirms | `useConfirm` with `isDestructive: true` for irreversible actions. Do not use any other way to confirm. |
| Focus | Do not add a focus ring to a `Button`. Custom controls use the same focus-ring style. |

## Weight: what `variant` means

`variant` answers "what happens if I click this?", not "how much do I want you
to click it?"

| Variant | Means | Rule |
|---|---|---|
| `primary` | The action of this surface, the thing the user came to do. | At most one per group. If no action is clearly the main one, the group has no primary. Do not pick one arbitrarily. |
| `secondary` | A real action, but not the main one. | Any number. |
| `tertiary` | Back out, dismiss, or a low-stakes utility. | `Cancel` is always `tertiary`. |
| `link` | Goes somewhere else or reveals more. Changes nothing. | Do not use for an action that changes data. |
| `isDestructive` | Irreversible or data-losing, added on top of the variant. | Required on every irreversible action, including in menus and confirm dialogs. Not for serious but reversible actions like publishing or continuing past warnings. Give those the right weight and a confirm instead. The red keeps its meaning only while it stays rare. |

On cards, the screen's main verb (usually `Edit`) is `primary` and utilities
are `tertiary`. In DataViews quick actions, the first is `primary` and the rest
`secondary`. Disabled does not change weight. A disabled button is not the
point of a surface, so it is not `primary`, and an action is not promoted
because its siblings are disabled. Show consequence with a confirm, not color.

## Order and alignment: `ActionRow`

Every action group has the same shape as a modal footer:

```jsx
import { ActionRow } from '@automattic/vip-admin-ui';

<ActionRow>
	<Button variant="tertiary">{ __( 'Cancel', 'my-plugin' ) }</Button>
	<Button variant="secondary">{ __( 'Export', 'my-plugin' ) }</Button>
	<Button variant="primary">{ __( 'Save', 'my-plugin' ) }</Button>
</ActionRow>
```

`ActionRow` is a right-aligned `Stack` row with an `sm` gap. Buttons appear in
DOM order, left to right, with the primary last (at the bottom when stacked).
`ModalActions` is the same row plus the gap above a modal footer. The row owns
its layout. Do not style the row or its buttons for spacing: no `className` on
buttons, no `margin-left: auto`. `className` on the row is only for the
container's own styling, like a border or padding. A new layout means a new prop.

**Destructive actions are the one exception to "primary last".** A destructive
action is not the rightmost button in a group that also has a safe primary.
Put it leftmost, in a danger zone (`InspectorDangerZone`, see
[Inspector](inspector.md)), or in an overflow menu.

**Stretch vs hug.** Buttons fit their content. Stretch them only in a container
narrower than about 280px, where a small button looks lost (an editor sidebar
panel, an inspector column). There, `<ActionRow stretch>` stretches every
button in the group. Do not mix the two, and do not fake alignment with
`margin-left: auto` on one button. Fix the container.

## Size

| Context | Size |
|---|---|
| Modal footer, page header, settings bar, inspector | leave out `size` (40px default) |
| Card footer, table or DataViews cell, hover toolbar | `size="small"` |
| Columns narrower than 280px (sidebar panel, inspector rows) | `size="compact"` is allowed, because these columns are meant to be dense |
| Anywhere else | not `compact` |

Do not set a button's height in CSS. A button whose height comes from CSS is a
bug.

## Icons

One icon per concept: `plus` add · `trash` delete · `external` opens elsewhere ·
`update` refresh or re-run · `cog` settings · `edit` edit · `download` export.
Save icons for actions that appear in many places or have no text label. A
footer `Save` does not need one.

## Vocabulary

Use one verb per concept, in sentence case (`Add source`, not `Add Source`). The
confirm button in a dialog uses the same verb as the button that opened it.

| Concept | Use | Instead of |
|---|---|---|
| Save edits | **Save** | `Submit`. Use `Save {noun}` only when a screen has two Saves. Exception: **Submit** is fine when the action sends input to a process instead of saving edits. |
| Back out of a dialog with choices | **Cancel** | `Go back`, `Back`, `Keep editing`. Exception: **Back** is fine for stepping back in a multi-step flow. |
| Close an informational dialog | **Close** | `Got it`, `OK` |
| Decline an offered flow | **Skip** | `Continue without …` |
| Give up a claim or lock | **Release** | (a claim is released, not "removed") |
| Hide a suggestion that can come back | **Dismiss** | (it can be restored, so "Remove" would be wrong) |
| Remove something reversibly | **Remove** | `Clear`. `Move to Trash` stays, since it's core's wording. |
| Remove something irreversibly | **Delete** | `Delete permanently` (the confirm says it's permanent), `Remove "X"` when it can't be undone |
| Throw away unsaved edits | **Discard** | `Start over` |
| Open an item | **Open** | `View`, `View {noun}` |
| Open an item for editing | **Edit** | `Edit Post` |
| Continue past a warning | **Continue** | `Move anyway`, `Proceed Anyway`, `Ignore Warnings, Continue` |
| Run again | **Retry** | `Try again`, `Re-check`, `Retry Processing` |
| Generate new AI output | **Regenerate** | `Re-analyze` |
| Apply a result | **Use this** | `Use This` |
| Create | **Add {noun}** / **New {noun}** | `Create your first {noun}` |

Build dynamic labels with `sprintf()` and a translator comment. Do not join
strings together.

## Destructive confirmation

There is one way to confirm: `useConfirm` with `isDestructive: true` (see
[useConfirm](modals.md#useconfirm)). Do not use a double-click, where the first
click arms the button and the second one fires it. The confirm button uses the
trigger's verb (`Delete` → `Delete`). The cancel button is always `Cancel`.
Reversible removals, like trashing or dismissing, do not need a confirm.
Irreversible ones do.

## Accessibility floor

- Everything clickable is a `<button>` or `<a>`. No `role="button"` divs, and no
  clickable `<tr>`. If putting interactive content inside a `<button>` would be
  invalid HTML, put the action on an interactive element inside that area
  instead.
- An icon-only button has `label` + `showTooltip`. Every drag handle has an
  `aria-label`.
- Destructive items in a menu look different from the others.
- WPDS ships a focus ring on `Button`, so do not write your own. Custom controls
  use the same focus-ring style.

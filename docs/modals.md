# Modals

The one pattern for every modal. Left alone, modals drift into several sizing
strategies, several footer conventions, and buttons in no consistent order.
Every modal is the WPDS `Modal` from `@wordpress/components`. These rules govern
everything around it. See [`actions.md`](actions.md) for button weight and
labels, and [`settings.md`](settings.md) for screen layout.

> **Open question: this may move to the `@wordpress/ui` primitive.** `@wordpress/ui`
> 0.22 ships `Dialog` and `AlertDialog`. This package is built on `Modal`. If it
> moves, `useConfirm` fits `AlertDialog`, and the [width table](#width-size-only)
> needs remapping, because `Dialog`'s sizes are `small`, `medium`, `large`,
> `stretch` and `full`.

## TL;DR

| Concern | Rule |
|---|---|
| Header title | A plain translated **string** in `title`. Never JSX. |
| Header actions | In the `headerActions` prop, never inside `title`. |
| Header icon | None. Icons go in the body. |
| Long titles | Dynamic or user-supplied titles are shortened to one line with an ellipsis. |
| Width | Only the `size` prop: `small` / `medium` / `large` / `fill`. Never CSS `max-width`/`min-width`, and never an inline `minWidth`. |
| Footer | `<ModalActions>`. Never a raw `<div>` or a custom `Stack`. |
| Button order | Cancel on the left, primary on the right. The primary is always rightmost. |
| Button variants | Cancel is `tertiary`, the action is `primary`, and a destructive action is `primary` + `isDestructive`. |
| Pending | `isBusy` + `disabled`, and the label doesn't change. Never `{ busy ? <Spinner/> : label }`. |
| Errors | `<Notice status="error" isDismissible={ false }>` at the top of the body. |
| Content | `Text` for prose, `Badge intent` for status, tokens for color and spacing. No hardcoded hex. No inline `style`, except values computed at runtime and passed in as CSS variables. |
| Form controls | Always `__next40pxDefaultSize` + `__nextHasNoMarginBottom`. |
| Dismissing | Dismissible by default. Only a blocking modal changes the three dismiss props. |

## Header

The `Modal` builds its header from props, so never build one yourself in the
body. JSX in `title` breaks the fixed-height header. A button next to the close
button goes in `headerActions`:

```jsx
<Modal
	title={ post.title }
	headerActions={ <Button __next40pxDefaultSize icon={ external } showTooltip
		label={ __( 'Open in editor', 'my-plugin' ) } href={ post.editLink } /> }
	onRequestClose={ onClose }
	size="medium"
/>
```

The fixed-height header clips long titles. Titles that are dynamic or come from
the user (post titles, item names) need a one-line ellipsis. Static titles are
short and don't. This package doesn't ship a class for this yet, so use your own
modifier class:

```css
.my-plugin-modal--truncate-title .components-modal__header-heading-container { min-width: 0; }
.my-plugin-modal--truncate-title .components-modal__header-heading {
	min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
```

## Width: `size` only

| `size` | Use for |
|---|---|
| `small` | confirmations, a single text field or textarea, short forms |
| `medium` | standard forms, detail panels |
| `large` | search results, data grids, rich or multi-column content |
| `fill` | rarely: nearly full-screen work areas |

Don't use `.components-modal__content { max-width: … }`, `style={ { maxWidth: … } }`
or `<div style={ { minWidth: … } }>` wrappers. If a preset width looks wrong,
choose a different `size` rather than overriding it. The only allowed change to
`__content` is `padding: 0` for a full-bleed `DataViews` body.

## Footer: `<ModalActions>`

```jsx
import { ModalActions } from '@automattic/vip-admin-ui';

<ModalActions>
	<Button variant="tertiary" onClick={ onClose } disabled={ saving }>{ __( 'Cancel', 'my-plugin' ) }</Button>
	<Button variant="primary" onClick={ onSave } isBusy={ saving } disabled={ saving }>{ __( 'Save', 'my-plugin' ) }</Button>
</ModalActions>
```

`<ModalActions>` is an [`ActionRow`](actions.md#order-and-alignment-actionrow)
that also adds the gap between body and footer, so no modal needs its own
`marginTop`. All actions are right-aligned in DOM order, so put Cancel first and
the primary last. A footer with one button (the `Close` of an informational
dialog) still uses `<ModalActions>`. A secondary action that navigates is a
`tertiary` `Button` with `href`, not a bare `Link`, so it matches the buttons
beside it. The footer handles its own layout. Don't add `className` to the
buttons for spacing, don't use `margin-right: auto`, and don't write footer CSS
for a single modal. If you need something different, add a prop to
`ModalActions`.

## Body: `<ModalBody>`

A vertical `Stack` that spaces the content blocks, so children need no margins
and no extra `Stack`s. Use `Text` for prose, never raw `<p>`, `<h4>` or `<span>`.

```jsx
<Modal title={ … } onRequestClose={ onClose } size="medium">
	<ModalBody>
		{ error && <Notice status="error" isDismissible={ false }>{ error }</Notice> }
		{ /* fields, or Text for prose */ }
	</ModalBody>
	<ModalActions>{ /* buttons */ }</ModalActions>
</Modal>
```

`gap` defaults to `md`. Skip `ModalBody` for a full-bleed `DataViews` grid,
which handles its own padding, and for static documentation modals. Modals are
rendered outside `.wrap`, so `reset.css` has a separate
`.components-modal__content` rule to keep wp-admin's `p` and `h*` styles away
from `Text`.

## Pending, errors, dismissing

**Pending.** The button shows `isBusy` and is `disabled`, and its label stays the
same. Use a `Spinner` only while the modal's **body content** is loading, never
as a button's label.

**Errors.** Show them in a `Notice` at the top of the body, not in a control's
`help={ error }`, which reads as guidance rather than failure. `@wordpress/ui`
0.22 ships its own `Notice` (with `intent` instead of `status`). These rules
apply to either one. Open question: which of the two to standardize on.

**Dismissing.** Keep the `Modal` defaults. A **blocking** modal, one the user
has to resolve before moving on, sets all of the following. That's the only
reason to change these props:

```jsx
<Modal isDismissible={ false } shouldCloseOnEsc={ false }
	shouldCloseOnClickOutside={ false } onRequestClose={ undefined } … />
```

## `useConfirm`

Use this instead of `window.confirm()`, which can't be styled or made accessible
to match the admin. It returns an async `confirm( message, options )` that
resolves to `true` or `false`, and a dialog node you render once:

```jsx
const [ confirm, confirmDialog ] = useConfirm();
const onDelete = async () => {
	if ( await confirm( __( 'This can’t be undone.', 'my-plugin' ), {
		title: __( 'Delete this form?', 'my-plugin' ),
		confirmLabel: __( 'Delete', 'my-plugin' ),
		isDestructive: true,
	} ) ) { remove(); }
};
return <>{ confirmDialog }{ /* … */ }</>;
```

- `message` can be a string or a node. `options`: `title`, `confirmLabel`,
  `cancelLabel`, `isDestructive`.
- Labels you don't set, and a missing `title`, fall back to the `confirm` and
  `cancel` strings from `<StringsProvider>` ([`i18n.md`](i18n.md)). Always give
  a destructive confirmation a real title.
- It renders a `small` `Modal` with a `tertiary` Cancel and a `primary` confirm
  button. If a new confirmation opens, or the host unmounts, while one is still
  waiting, that one resolves `false`, so no caller is left hanging.

`useConfirm` always shows two buttons, so it's only for yes/no questions. An
informational dialog is a `Modal` with a single `Close` in `ModalActions`.

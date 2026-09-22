# Avatar

An avatar is a fixed square that shows who did something. It shows a person's
picture, and falls back to their initials when the picture does not load.

## TL;DR

| Concern | Rule |
|---|---|
| Use | Every avatar in the admin. Do not use a bare `<img src={ user.avatar }>`. |
| Failure | Built in. A missing, blocked or 404ing image falls back to initials, or to the `icon`. There is no `onError` and no "did it load" state. |
| Sizes | `sm` (default) and `2xs`. |
| Non-people | Pass `icon` for an actor that is not a person, such as an agent or the site itself. |
| Accessibility | Decorative (`alt=""`). The actor's name is shown as text next to it. |

## Why it exists

Avatar URLs come from Gravatar, or from whatever `get_avatar_url` is filtered
to. When a request 404s, is blocked or is empty, a bare `<img>` shows the
browser's broken-image icon. `Avatar` handles that once, for every call site. It
uses Base UI's `Avatar` (the base `@wordpress/ui` is built on), which loads the
image separately and shows the fallback when it fails or `src` is missing.

```jsx
import { Avatar } from '@automattic/vip-admin-ui';
import { Stack, Text } from '@wordpress/ui';

<Stack align="center" gap="xs">
	<Avatar src={ user.avatar_urls?.[ 48 ] } name={ user.name } size="2xs" />
	<Text variant="body-sm">{ user.name }</Text>
</Stack>
```

## Sizes

| `size` | Box | Glyph | Initials |
|---|---|---|---|
| `sm` (default) | `--wpds-dimension-size-sm` | 16px | two letters |
| `2xs` | `--wpds-dimension-size-2xs` | 12px | one letter |

What fits changes with the size, so the component sets the size, not CSS or
the call site. Two letters do not fit at `2xs`. Initials are the first letters
of the first and last words ("Ada Lovelace" becomes "AL"), uppercased, and safe
for characters outside the Basic Multilingual Plane.

## Actors that aren't people

An agent, or the site itself, has no picture and no initials worth showing.
Pass it an `icon` from `@wordpress/icons`. The icon appears in the same box, so
a row of mixed actors lines up. Use `className` only for the call site's own
layout.

## Accessibility

The image and the icon are decorative (`alt=""`), because every call site shows
the actor's name next to the avatar, and hearing it twice is noise. So the name
is required. Do not render an `Avatar` without the name next to it. `Avatar`
needs `tokens.css` for its radius and its initials typography.

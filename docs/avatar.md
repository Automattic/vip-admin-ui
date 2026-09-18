# Avatar

Shows who did something, in a fixed square of space: a person's picture that
falls back to their initials.

## TL;DR

| Concern | Rule |
|---|---|
| Use | Every avatar in the admin. Never use a bare `<img src={ user.avatar }>`. |
| Failure | Built in. A missing, blocked or 404ing image falls back to initials, or to the `icon`. There's no `onError` and no "did it load" state. |
| Sizes | `sm` (default) and `2xs`. |
| Non-people | Pass `icon` for an actor that isn't a person, such as an agent or the site itself. |
| Accessibility | Decorative (`alt=""`). The actor's name is always shown as text right next to it. |

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

A smaller avatar isn't just scaled down: what fits changes too, so the size is
the component's decision, not CSS's or the call site's. Two letters don't fit at
`2xs`. Initials are the first letters of the first and last words ("Ada
Lovelace" becomes "AL"), uppercased, and safe for characters outside the Basic
Multilingual Plane.

## Actors that aren't people

An agent, or the site itself, has no picture and no initials worth
showing. Pass it an `icon` from `@wordpress/icons`: it goes in the same box,
drawn differently. Using the same component is what lines up a row of mixed
actors. Use `className` only for the call site's own layout.

## Accessibility

Both the image and the icon are decorative (`alt=""`), because every call site
shows the actor's name right next to the avatar, and hearing it twice is noise.
That makes the name required: **never render an `Avatar` without the name next
to it.** `Avatar` needs `tokens.css` for its radius and its initials typography.

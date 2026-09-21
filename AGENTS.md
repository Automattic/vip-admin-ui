# AGENTS.md — VIP Admin UI

Shared WordPress Design System composites for VIP admin plugins, published to
npm as `@automattic/vip-admin-ui` and bundled into each consuming plugin. Read
`README.md` first; the guidelines are in `docs/`.

## Commands

```bash
npm run storybook        # dev server on :6006
npm run lint             # ESLint + stylelint (unknown --wpds-* tokens fail)
npm test                 # Jest: the pure logic in test/ (edge routing, etc.)
npm run build            # babel: build-module/ (ESM) and build/ (CJS)
npm run build-storybook  # must pass before a change is done
loupe check              # design-system conformance
```

## Layout

- `src/<family>/<Component>.js` with its `<Component>.css` and
  `<Component>.stories.js` beside it. `src/index.js` is the public API.
- `src/styles/` — `reset.css`, `tokens.css`, `palette.css`, exported as
  subpaths.
- `src/strings.js` — `StringsProvider` / `useStrings`.
- `patterns.json` — the Loupe registry consumers point at.
- `.storybook/` — config, English strings for stories, story-only CSS.
- `test/` — Jest tests for pure logic. Outside `src/`, so the build never
  ships them.

## Rules

- **No `__()` in `src/`.** Strings are props, or keys on `StringsProvider`
  (adding a key breaks every consumer — see `docs/i18n.md`). Keep
  `.storybook/strings.js` and the template in `docs/i18n.md` in step.
- **Build on WPDS.** `@wordpress/ui` first, `@wordpress/components` where ui has
  no equivalent. Nothing here duplicates something WPDS ships.
- **Prefix:** classes `vipui-`, custom properties `--vipui-`. Tokens only in
  `src/styles/tokens.css`; raw hex only there and in `palette.css`.
- **Never name a stylesheet `style.css`.** `wp-scripts` splits those into a
  separate `style-<entry>.css` that consumers would also have to enqueue.
- **Peers, not dependencies,** for anything that must be one copy per bundle
  (React, `@wordpress/*` that carries context, `@dnd-kit/*`).
- **Every component gets stories** covering its states, and `build-storybook`
  must pass. Story fixtures that aren't stories go in `story-fixtures.js`,
  which the build excludes.
- **No product vocabulary** in code, props, classes, or docs, and no private
  issue identifiers anywhere.
- Suppress a Loupe finding only with `wpds-allow <ruleId> -- <reason>` on the
  anchored line or the line above it.

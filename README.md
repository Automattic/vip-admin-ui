# VIP Admin UI

Shared composites for WordPress admin plugins, built on the WordPress Design
System (`@wordpress/ui`, `@wordpress/components`, `--wpds-*` tokens).

WPDS ships the parts. This package ships the patterns several VIP plugins kept
rebuilding out of those parts: the action row, the modal footer, the settings
section and save bar, the inspector panel kit, the graph canvas. It also ships
the one wp-admin CSS fix every plugin rediscovers on its own. It is not a second design system:
anything WPDS ships is used as-is, and anything here is deleted the day WPDS
ships an equivalent.

## What's in it

|               |                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actions**   | `ActionRow`                                                                                                                                                                                     |
| **Modals**    | `ModalBody`, `ModalActions`, `useConfirm`                                                                                                                                                       |
| **Settings**  | `SettingsSection`, `SettingsFooter`, `SettingsLoading`                                                                                                                                          |
| **Inspector** | `InspectorShell`, `InspectorCollapseContext`, `InspectorSection`, `Fact`, `SortableFact`, `InfoTip`, `InspectorFieldList`, `InspectorFieldListAdd`, `InspectorChoiceRow`, `InspectorDangerZone` |
| **Graph**     | `GraphCanvas`, `classifyPositionChanges`, `GRAPH_NODE_TYPE`, `GRAPH_NODE_SIZE`, `GRAPH_TERMINAL_TYPE`, `GRAPH_TERMINAL_SIZE`, `GRAPH_EDGE_TYPE` |
| **Avatar**    | `Avatar`                                                                                                                                                                                        |
| **Strings**   | `StringsProvider`                                                                                                                                                                               |
| **Styles**    | `reset.css` (the wp-admin cascade fix), `tokens.css` (tokens WPDS lacks), `palette.css` (the collaboration palette)                                                                             |
| **Loupe**     | `patterns.json`, the composite registry for [Loupe](https://github.com/dabowman/loupe)                                                                                                          |

Guidelines live in [`docs/`](docs/): [actions](docs/actions.md),
[modals](docs/modals.md), [settings](docs/settings.md),
[inspector](docs/inspector.md), [graph](docs/graph.md), [avatar](docs/avatar.md),
[strings](docs/i18n.md). Storybook shows every component and renders the same
guides.

## Using it in a plugin

```sh
npm install @automattic/vip-admin-ui
```

npm 7+ installs the peer dependencies too. They are peers because each needs to
exist once per bundle: `@wordpress/ui` (^0.22), `@wordpress/components`,
`@wordpress/element`, React, `@dnd-kit/*`, and `@xyflow/react` (for the graph
canvas).

Then, once per React entry:

```js
import '@automattic/vip-admin-ui/tokens.css';
import '@automattic/vip-admin-ui/reset.css';

import { StringsProvider, SettingsSection } from '@automattic/vip-admin-ui';
import { strings } from './vip-admin-ui-strings'; // see docs/i18n.md
```

1. **Put `vipui-page` on the admin page's root element.** `reset.css` hands
   typography back to WPDS inside `.wrap:has( .vipui-page )`; without the class,
   wp-admin's unlayered `p` and `h1`–`h6` rules override every `<Text>` on the
   page. Modals are covered without it.
2. **Wrap each React root in `<StringsProvider>`.** The package ships no
   translatable strings; your plugin supplies them with its own text domain.
   Components that need one throw without the provider. The template is in
   [`docs/i18n.md`](docs/i18n.md).

### How it ships

The package is **bundled into each plugin's build**, not registered as a shared
WordPress script. That is deliberate:

- `@wordpress/ui` is not a WordPress script handle, so every plugin already
  bundles its own copy. A shared handle for this package would force every
  consumer onto one version at once, and make every plugin depend on another
  plugin being active.
- `@wordpress/components` and `@wordpress/element` **are** externalized by
  `wp-scripts`, so at runtime the components come from WordPress core, whatever
  version the site runs, not the version in your `package.json`. That is why
  the package still passes props like `__next40pxDefaultSize` that newer
  versions treat as defaults.
- Components import their own CSS. `wp-scripts` puts it in your entry's
  `<entry>.css`, which you already enqueue. None of the package's files are
  named `style.css`, so nothing lands in the separate `style-<entry>.css` chunk.
- That CSS goes through **your** PostCSS config, like your own. It uses
  `--wpds-*` tokens with no fallbacks, and WordPress 7.0 doesn't define those
  tokens on the page. Either add
  `@wordpress/theme/postcss-plugins/postcss-ds-token-fallbacks` to your
  `postcss.config.js` (it bakes in the default values, for your CSS and this
  package's alike) or enqueue `@wordpress/theme/design-tokens.css` yourself.
- The published build is plain ESM (`build-module/`) plus CommonJS (`build/`)
  for Jest. Only JSX is compiled; everything else runs as written in the
  browsers WordPress supports.

### Loupe

To have Loupe steer agents toward these components and flag hand-built copies,
point your `loupe.config.json` at the registry. The path is relative to your
repository root:

```json
{
	"extends": "wpds",
	"patterns": "node_modules/@automattic/vip-admin-ui/patterns.json"
}
```

It is merged over the WPDS profile's registry and wins on key.

## Developing

```sh
npm install
npm run storybook        # http://localhost:6006
npm run lint             # ESLint + stylelint (WPDS token names included)
npm test                 # Jest unit tests for the pure logic
npm run build            # build-module/ and build/
npm run build-storybook  # static Storybook in storybook-static/
loupe check              # design-system conformance, if Loupe is installed
```

## What belongs here

- **A composite that a second plugin needs.** One plugin's pattern stays in that
  plugin until another one wants it.
- **Generic, not product-specific.** No product vocabulary in components, props,
  classes or docs.
- **No translatable strings.** Take a prop, or, when a component truly needs its
  own words, add a key to `StringsProvider` (a breaking change; see
  [`docs/i18n.md`](docs/i18n.md)).
- **`vipui-` for classes, `--vipui-` for custom properties.**
- **Delete on upstream.** When WPDS ships an equivalent, move consumers to it and
  remove the one here.

## Releasing

```sh
npm version <patch|minor|major>
npm publish --access public
```

`prepublishOnly` runs the build. Until 1.0, a minor version may break.

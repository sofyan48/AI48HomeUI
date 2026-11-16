# AGENTS.md

CPAHomeUI is the browser-based admin and user interface for AI48Home (Home), the database-backed control plane for CLIProxyAPI (CPA). It can run separately during development or be generated as a static bundle embedded into Home.

## Stack And Repository

- Nuxt 4, Vue 3, TypeScript, and Vue Router.
- Client-side SPA: `ssr: false` in `nuxt.config.ts`.
- Nuxt UI 4, Tailwind CSS 4, and Tabler icons (`i-tabler-*`).
- Pinia 3 with `@pinia/nuxt` for application state.
- `bun.lock` is the checked-in dependency lockfile. Prefer Bun for dependency installation and scripts; do not introduce another lockfile unless explicitly requested.
- `go.mod` exists, but this repository's application and build workflow are JavaScript/TypeScript, not a Go service.
- Related backend: `../AI48Home` when both repositories are checked out next to each other.

## Commands

Run from the repository root:

```bash
bun install                 # Install dependencies; postinstall runs nuxt prepare
bun run dev                 # Development server, normally http://localhost:3000
bun run build               # Production build
bun run generate            # Generate static output into .output/public
bun run preview             # Preview the production build
bun run build:embedded      # Generate and package the embedded SPA into dist/
```

- `package.json` also supports running scripts through npm, but keep dependency changes consistent with `bun.lock`.
- The development script sets `TMPDIR=/tmp`; preserve this unless intentionally changing the development workflow.
- `bun run test` runs the Bun test suite in `scripts/*.test.ts` and `**/*.test.ts` (unit, i18n key, SFC compile, and file-size checks). It is fast; prefer it over a full build for quick verification.
- There are currently no `lint` or `typecheck` scripts in `package.json`.
- README mentions `node scripts/test-state.mjs`, but that file is not currently present. Do not treat it as an available test command.
- Use `bun run test` for routine verification. Do not run production builds, static generation, or embedded packaging unless explicitly requested; these are slow. When requested, use `bun run build` for application builds and `bun run build:embedded` for embedded packaging.
- A successful build is not proof of TypeScript type-checking or browser behavior. Report the validation actually performed.
- Documentation-only changes do not require an application build.

## Architecture

- `app.vue`: root `UApp`, toast configuration, and Nuxt layout/page rendering.
- `nuxt.config.ts`: SPA mode, Nuxt modules, runtime configuration, Vite integration, and root redirect.
- `app.config.ts`: shared Nuxt UI colors, component slots, and defaults.
- `assets/main.css`: Tailwind/Nuxt UI imports, theme variables, and shared workbench/user styling.
- `pages/admin/`: management workspace for dashboards, upstream providers/accounts, credentials, routing, users, billing, configuration, diagnostics, logs, and usage.
- Route shells belong in `pages/admin/<feature>/index.vue` or `pages/app/<feature>/index.vue`, including nested features such as `pages/admin/routing/channels/index.vue`. Keep `pages/admin/index.vue` and `pages/app/index.vue` as workspace route indexes; do not invent a general page folder. Folder moves must preserve URL routes and page metadata.
- `pages/app/`: user workspace and public account flows, including login, registration, password recovery, email verification, model catalog, API keys, balance, profile, and settings.
- `layouts/default.vue`: admin shell, navigation, connection state, capabilities, and synchronization controls.
- `layouts/app.vue`: user shell, public/authenticated route handling, navigation, and session integration.
- `components/App*.vue`: shared base components for buttons, cards, tables, panels, modals (`AppFormModal`, `AppConfirmModal`), empty states, summary rows, and synchronization.
- Organize components by feature, not by file size alone. Keep route shells thin: compose sections/dialogs and wire events; put feature UI and logic in their own folders. Do not just move a monolith into a large composable.
- `components/admin/<feature>/`: admin feature components. Use meaningful subfolders such as `editor/`, `list/`, `overview/`, `models/`, or `dialogs/` when a feature has multiple parts. No loose `.vue` files directly under `components/admin/`.
- `components/admin/general/`: reusable admin-only components (tables, panels, row actions, detail items, modal cards, and other cross-feature primitives). Cross-workspace base components remain in `components/App*.vue`.
- `components/app/<feature>/`: portal feature components. No loose `.vue` files directly under `components/app/`. Put reusable portal-only primitives in `components/app/general/` when needed, not in the admin folder.
- Portal workspace entry: `components/app/workspace/UserWorkspace.vue`; its dashboard, billing, keys, and settings sections live in matching subfolders. `LimitReset.vue` belongs in `workspace/dashboard/`; `SecurityRow.vue` belongs in `workspace/settings/`.
- `composables/<feature>/`: feature state, API loading, normalization, validation, formatting, and other feature-only helpers. Keep helpers beside their feature; do not add a global `utils/` folder.
- Examples: `pages/admin/dashboard/index.vue` → `components/admin/dashboard/` + `composables/dashboard/`; `pages/app/models/index.vue` → `components/app/models/` + `composables/models/`.
- Keep source files under 500 lines, preferably 150–300 lines per focused module. `scripts/file-size.test.ts` currently has an empty allowlist; do not add exemptions merely to bypass decomposition. Translation data is outside this source-size check. See `CONTRIBUTING.md` for the split pattern.
- Moving components changes Nuxt auto-import names. Update every consumer with an explicit import or the new component name, including page/layout consumers and relative sibling imports. Do not leave compatibility wrappers at obsolete paths or depend on stale `.nuxt/components.d.ts`.
- Folder moves must preserve route URLs/metadata, props, emits, slots, API payloads, capability fallbacks, styling, focus behavior, and state lifecycle. Update source-reading test fixtures to the new implementation paths without weakening their assertions.
- Folder/import/route regression tests include `scripts/page-folders.test.ts` and the component/workspace tests. Run the existing suite after structural changes; successful SFC compilation is not a browser interaction or visual test.
- `composables/`: API wrappers, capability access, workspace refs, asynchronous data loading, synchronization, and upstream quota helpers.
- `stores/`: Pinia session, capability, configuration cache, and workspace stores.
- `middleware/mail-link.global.ts`: translates backend email-link fragments into frontend verification/reset routes.
- `public/`: static public assets.
- `scripts/build-embedded.mjs`: packages generated output for Home's embedded asset loader.

Keep the root-level source layout used by this repository; do not move it into a Nuxt `app/` directory as an unrelated cleanup.

## API And Backend Contract

- `NUXT_PUBLIC_API_URL` configures the backend address used by the browser. Prefer an origin-only value such as `http://127.0.0.1:8327`.
- An empty API URL uses same-origin requests, as required by the embedded deployment. A separate UI origin requires Home to allow that origin.
- Admin requests go through `useApi()` in `composables/useApi.ts`; the Management API base is `/v8/management`.
- User requests go through `useUserApi()`, which wraps `stores/userSession.ts`; the user API base is `/user`.
- Preserve the existing API URL normalization, including management suffix handling and localhost-to-IPv4 normalization.
- Do not bypass the management URL boundary checks or send management credentials to arbitrary origins/endpoints.
- Preserve query serialization, request body handling, response types, cancellation support, and structured API errors when modifying the wrappers.
- Management configuration reads use a short-lived cache with request deduplication. Provider-group reads can be derived from `/config`; mutations invalidate the cache. Preserve these behaviors.
- Use `useCapabilities()` and user capabilities to gate optional features. Keep existing unsupported-feature and unavailable-endpoint fallbacks; do not assume every Home deployment supports every feature.
- Verify endpoint names, payloads, and response fields against current Home handlers and route registration rather than inventing contracts.
- When a task changes backend API behavior, update Home's `docs/management/api.md` and applicable language-specific documentation in the backend repository. UI-only changes should not modify backend behavior unnecessarily.

## State And Lifecycle

- `stores/userSession.ts`: user authentication, account, capabilities, server metadata, persistence, and passkey helpers.
- `stores/managementSession.ts`: management token and remember preference.
- `stores/managementCapabilities.ts`: admin capabilities and server metadata.
- `stores/managementConfig.ts`: management configuration cache and in-flight request deduplication.
- `stores/workspace.ts`: namespaced data, generation ownership, and registered synchronization loaders.
- Use `useWorkspaceState()` for writable store-backed workspace refs and `useStoreData()` for asynchronous page data, following nearby usage.
- Namespace admin workspace keys with `admin:` and user workspace keys with `user:`. Token changes clear the corresponding domain.
- Each workspace owner starts with fresh state. Preserve generation/version guards so obsolete owners or stale requests cannot overwrite newer state.
- Create each `useWorkspaceState(key)` exactly once per mounted owner: calling it again for the same key starts a new generation and resets the value. When extracted sections share state, create it once in the page/entry scope and expose focused feature composables through `provide`/`inject`; children must not recreate the same keys. Preserve form lifetimes and cleanup across tab changes.
- Workspace data is not persisted. Keep transient forms, modal visibility, filters, and pagination component-local unless the task explicitly requires shared state.
- Register shared refresh behavior through `useDataSync()` when appropriate. Dispose registrations, timers, listeners, and in-flight work with the component scope.
- Use `storeToRefs()` when exposing reactive store state; avoid losing reactivity through plain destructuring.

## Authentication And Security

- Admin connection is configured at `/admin/connect`; user login is at `/app/login`.
- Keep admin and user sessions separate. Preserve cookie names, storage keys, remember-session semantics, expiry handling, and logout behavior unless explicitly changing the session contract.
- Never put real management secrets in public runtime configuration or `NUXT_PUBLIC_*` environment variables. `runtimeConfig.public.secretKey` currently exists as a fallback, but public runtime configuration is visible to the browser and is not secure secret storage.
- Do not log secrets, passwords, bearer tokens, API keys, passkey material, or one-time email tokens.
- Email verification and password-reset links keep one-time tokens in URL fragments. Preserve fragment-based routing and token removal; do not move tokens into URL query strings or server-visible paths.
- Client-side navigation/capability checks are UI behavior, not a replacement for backend authorization.

## UI And Code Conventions

- Follow existing Vue single-file component patterns with `<script setup lang="ts">`, Composition API, and Nuxt auto-imports.
- Use `~/` imports for project source and `#imports` where the existing store/composable pattern requires Nuxt helpers.
- Match the formatting of the file being edited; avoid unrelated quote, semicolon, indentation, or component-order rewrites.
- Prefer existing `App*` primitives and feature components over adding parallel abstractions or dependencies.
- The approved shadcn-vue migration is in progress: `AppButton`, `AppCard`, and `AppModal` use source-owned primitives in `components/ui/`. Keep their existing consumer contracts. Use `shadcn-nuxt` with the `Shadcn` prefix or explicit imports to avoid Nuxt UI name collisions.
- Nuxt UI 4 remains temporarily for unmigrated inputs, tables, menus, toasts, icons, and the root provider. Migrate feature by feature; do not remove it until remaining consumers and module-provided services have replacements. Do not add other UI frameworks.
- Use Tailwind 4 and semantic shadcn tokens bridged to the existing `--ui-*` palette in `assets/shadcn.css`. Read `.agents/skills/shadcn-vue/SKILL.md` before changing shadcn components; preserve light/dark themes and slot overrides.
- Preserve responsive layouts, light/dark themes, compact workspace density, and mobile navigation behavior.
- Provide loading, empty, unsupported, error, and mutation feedback states where applicable. Prevent duplicate submissions for pending actions.
- Keep icon-only controls accessible with labels, and preserve keyboard/focus and modal behavior.
- Existing user-visible text is predominantly English. Follow the feature's existing language; write new code comments and non-language-specific documentation in English.
- Keep changes focused, preserve uncommitted user work, and do not commit or create branches unless requested.

## Embedded Deployment

- `bun run build:embedded` clears `NUXT_PUBLIC_API_URL`, runs static generation, then invokes `scripts/build-embedded.mjs`.
- The packaging script recreates `dist/`, copies hashed Nuxt assets and fonts, and rewrites `/_nuxt/`, `/_fonts/`, and favicon URLs to `/assets/` paths.
- The output includes `dist/index.html`, `dist/management.html`, `dist/user.html`, and `dist/assets/`. These HTML filenames are internal embedded build artifacts, not the recommended browser entry points.
- Home embeds these files through `internal/managementasset`. Admin entry points are `/admin` and `/admin/*`; user entry points are `/app` and `/app/*`. Use `/admin/connect` for administrator connection and `/app/login` for user login.
- With sibling repositories, the integration command is:

```bash
make -C ../AI48Home panel-assets-local PANEL_SOURCE_DIR=../AI48HomeUI
```

- Preserve SPA deep-link support and same-origin API behavior. Do not replace embedded entry points with development-only URLs.
- Do not hand-edit or commit generated `dist/`, `.nuxt/`, `.output/`, or dependency files under `node_modules/`; change the source or packaging script instead.
- Home ini adalah merupakan pengembangan lebih jauh dari Home Management Center (https://github.com/router-for-me/Home-Management-Center) jika ada perubahan baru di repositories tersebut segera terapkan perubahan dengan cara design saat ini ada

# Contributing to AI48HomeUI

Thanks for helping. This guide covers how the frontend code is organised, so a new contributor can find and change things without reading a 3000-line file.

## Quick start

```bash
bun install
bun run dev     # http://localhost:3000
bun run test    # fast: unit, i18n, SFC compile and file-size checks (~1s)
bun run build   # slow: full production build, run before opening a PR
```

## File size rule

- Keep every source file **under 500 lines**. `scripts/file-size.test.ts` enforces this.
- Legacy files that are still too big are listed in the test's `allowlist` with their current size as a ceiling. You can shrink an entry or remove it. **Never raise it.** If your change would push a file past its ceiling, split the file first.
- Translation files in `locales/` and test files don't count.

## Where code goes

| Layer | Folder | Contains | Must not contain |
|---|---|---|---|
| Page | `pages/` | Route shell: alerts, tabs, placing sections and dialogs, wiring events | Forms, tables, API calls for a single feature |
| Feature component | `components/admin/<page>/`, `components/app/<feature>/` | One section, tab, dialog or panel of that page | State shared by sibling components |
| Feature logic | `composables/<page>/` | State, API loading and the page's helpers (formatters, API-shape normalisers) | Templates |
| Base component | `components/App*.vue` | Generic UI building blocks with no feature knowledge | Feature-specific API calls or i18n keys |

Do not place Vue files directly in `components/admin/`. Feature components belong in `components/admin/<feature>/`; reusable admin-only primitives belong in `components/admin/general/`. Root-level `components/App*.vue` base components remain unchanged. Import moved components explicitly in each consumer to preserve template aliases (for example, `import AdminDataPanel from '~/components/admin/general/DataPanel.vue'`); Nuxt's automatic names include folder prefixes.

Every feature gets its own page directory, for example `pages/admin/dashboard/index.vue` → `components/admin/dashboard/` + `composables/dashboard/`. User pages use `pages/app/<feature>/index.vue`; nested routes use the same pattern, such as `pages/admin/routing/channels/index.vue`. Only the legitimate workspace route indexes remain at `pages/admin/index.vue` and `pages/app/index.vue`; do not invent general pages. Moving a route shell must preserve its URL, metadata, and imports. Don't create a global `utils/` folder; helpers live next to the feature that uses them.

## shadcn-vue migration

The migration is incremental, not a completed removal of Nuxt UI. `AppButton`, `AppCard`, and `AppModal` now render the source-owned shadcn-vue Button, Card, and Sheet families in `components/ui/`. Their compatibility APIs preserve existing feature consumers. `AppFormModal` and `AppConfirmModal` inherit the Sheet implementation through `AppModal`.

- Configuration: `components.json`; Nuxt registration: `shadcn-nuxt` with a `Shadcn` prefix. Prefer explicit imports from `~/components/ui/<component>`.
- Theme: `assets/shadcn.css` bridges semantic shadcn tokens to the existing admin/portal palette. Keep both workspaces and dark mode working.
- Official agent skill: `.agents/skills/shadcn-vue/`; provenance: `skills-lock.json`. It is the Vue skill from `unovue/shadcn-vue`, not the React skill.
- Add components with `bunx --bun shadcn-vue@latest add <component>`. Review generated source and declare its direct dependencies. Do not overwrite customized primitives without reviewing the diff.
- `/app` pages and feature components use portal-only adapters in `components/app/general/`: shadcn inputs/input groups, fields, checkboxes, native selects, alerts, badges, skeletons, pagination, and tables. Select updates preserve numeric values; form labels and error descriptions are linked to controls. Portal tables preserve cell slots and page-offset numbering without changing the admin table.
- Portal model details and limit-reset confirmation use `AppModal` (a right-side Sheet). The reset confirmation is no longer a centered Nuxt modal; its pending dismissal locks remain.
- Nuxt UI is still required for admin controls, shared theme/language popovers, toasts, icons, `UApp`, and module services. These remain follow-up work before removing `@nuxt/ui` and the palette bridge.
- Do not rename routes, change API contracts, or replace workspace state as part of component migration.
- Run `bun run test`; `scripts/shadcn-migration.test.ts` covers SFC compilation and lightweight renderer regressions. These do not replace browser checks for focus restoration, overlays, responsive layout, and visual appearance.

## Base components

Use these before writing markup by hand:

| Component | Use for |
|---|---|
| `AppButton`, `AppCard`, `AppPanel`, `AppTable`, `AppPanelTabs` | Standard buttons, cards, panels, tables and tabs |
| `AppModal` | Raw slide-over dialog (prefer the two below) |
| `AppFormModal` | Every create/edit form dialog: title, error alert, body slot, cancel/submit footer, `loading`, `locked`, `divided` |
| `AppConfirmModal` | Confirmation of destructive or irreversible actions (`message` prop or default slot) |
| `AppEmptyState` | Empty table/list state with icon and text |
| `AppSummaryRow` | Label/value lines in review and confirmation summaries |
| `AdminTablePanel`, `AdminDataPanel`, `AdminTableAction`, `AdminRowActions` | Admin table panels and row actions |

Example:

```vue
<AppFormModal
  v-model:open="open"
  :title="t('users.newUser')"
  :error="formError"
  :submit-label="t('users.createUser')"
  :loading="saving"
  @submit="submit"
>
  <UFormField :label="t('users.username')"><UInput v-model="form.username" /></UFormField>
</AppFormModal>
```

## Splitting a large page: the users page pattern

`pages/admin/users/index.vue` used to be 3214 lines. It is now a ~110-line shell, and it is the reference for splitting other pages:

```
pages/admin/users/index.vue                shell: alerts, tabs, dialogs, events
composables/users/useUsersWorkspace.ts     shared state + helpers, provided once by the page
composables/users/useUserSegments.ts       status segment counts and filter
composables/users/useBindingCandidates.ts  credential/model candidate loading
composables/users/common.ts | normalize.ts | periods.ts   helpers used only by the users page
components/admin/users/Users*Tab.vue       one component per tab
components/admin/users/Users*Dialog.vue    one component per dialog
```

How the pieces talk to each other:

- **Shared state.** The page calls `provideUsersWorkspace()` once. Children call `useUsersWorkspace()`, which uses `inject`, so there is no props drilling.
- **Workspace keys.** Each `useWorkspaceState(key)` is created exactly once per page, by whichever component owns it. Calling it again for the same key starts a new generation and resets the value, so never do that.
- **Dialogs own their form state.** Each dialog exposes `openFor(...)`, `openCreate()` or `openEdit(...)` through `defineExpose`. The page calls them via a template `ref`. After saving, the dialog calls `syncAll()` from the workspace.
- **Tabs emit intents** such as `edit`, `delete` or `bind`, and the page routes them to the right dialog.

## Conventions

- Use `<script setup lang="ts">` for new components. When you touch an old Options API component, convert it if it's small.
- Use `~/` imports. Feature components import their sibling components explicitly.
- Write user-visible text through `useAdminI18n()` / `usePortalI18n()`. The i18n tests fail on unknown keys.
- Write comments in English, and only for intent that the code doesn't already make obvious.
- Do one refactor per PR, with no behaviour changes mixed in. Then manually check the main flows of the page you touched (create, edit, delete, dialogs).

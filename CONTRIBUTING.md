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

Every page gets its own folder pair, for example `pages/admin/dashboard.vue` → `components/admin/dashboard/` + `composables/dashboard/`. Don't create a global `utils/` folder; helpers live next to the feature that uses them.

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

`pages/admin/users.vue` used to be 3214 lines. It is now a ~110-line shell, and it is the reference for splitting other pages:

```
pages/admin/users.vue                      shell: alerts, tabs, dialogs, events
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

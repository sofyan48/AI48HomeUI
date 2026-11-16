# AI48HomeUI

The Nuxt UI can run separately during development or be embedded into AI48Home. The admin workspace is under `/admin`, and the user workspace is under `/app`. For local development, open `http://localhost:3000/admin/connect` to connect as an administrator, or `http://localhost:3000/app/login` to sign in as a user.

Configure `NUXT_PUBLIC_API_URL` to reach Home from the browser. Prefer an origin-only value such as `http://127.0.0.1:8327`; a full URL ending in `/v8/management` is normalized to its origin. The Management UI always uses `/v8/management`. The management secret is entered at `/admin/connect`. Home must allow requests from the UI origin. Never put the management secret in a public runtime environment variable.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## State management

Application state is managed by Pinia:

- `stores/userSession.ts`: user session, capabilities, account, and authentication actions.
- `stores/managementSession.ts`: management token and remember preference.
- `stores/managementCapabilities.ts`: management capabilities and server metadata.
- `stores/managementConfig.ts`: short-lived configuration cache and request deduplication.
- `stores/workspace.ts`: namespaced admin/user data and request status.

The existing API/capability composables remain compatible wrappers. Pages use `useWorkspaceState` for writable store-backed refs and `useStoreData` for asynchronous data loading. Workspace owners initialize fresh state on mount, and obsolete owners cannot overwrite replacement state. Token changes clear the corresponding workspace domain. Workspace data is not persisted; existing session cookies and browser storage formats are unchanged.

Transient forms, modal visibility, filters, and pagination remain component-local. Request timers and lifecycle cleanup remain with their components.

Run focused store checks with `node scripts/test-state.mjs`, and verify the production build with `npm run build`.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

## Embedded Home build

Generate the static bundle expected by `AI48Home/internal/managementasset`:

```bash
bun run build:embedded
```

This writes `dist/index.html`, `dist/management.html`, `dist/user.html`, and hashed files under `dist/assets/`. These HTML filenames are internal embedded build artifacts; use `/admin` and `/app` as the browser entry points.

With both repositories next to each other, build and copy the UI into Home with:

```bash
make -C ../AI48Home panel-assets-local PANEL_SOURCE_DIR=../AI48HomeUI
```

The next Home build embeds those files through Go's `embed` package. Home serves the admin SPA at `/admin` and `/admin/*`, and the user SPA at `/app` and `/app/*`. Administrator connection is at `/admin/connect`; user login is at `/app/login`.

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Release and deployment

Every push to `main` runs `.github/workflows/ci.yml`: install, request-telemetry tests, and `bun run build:embedded`. When it passes, the workflow sends a `panel-updated` dispatch to [AI48Home](https://github.com/sofyan48/AI48Home), which embeds this bundle and publishes `ghcr.io/sofyan48/ai48home:edge`. Release tags (`v*`) on AI48Home publish `:<version>` and `:latest`.

The dispatch needs one repository secret here:

| Secret | Value |
| --- | --- |
| `HOME_DISPATCH_TOKEN` | Fine-grained PAT for `sofyan48/AI48Home` with **Contents: Read and write** (classic PAT: `repo`). |

Without it, CI still builds and tests, and only skips the image trigger.

Install the published image as described in the [AI48Home README](https://github.com/sofyan48/AI48Home#install-from-ghcr):

```bash
docker pull ghcr.io/sofyan48/ai48home:latest   # or :edge for the newest panel
```

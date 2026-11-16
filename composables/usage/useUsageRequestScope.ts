/**
 * Shared cancellation state for the usage overview requests.
 * The page context replaces `controller` when the management token changes and sets
 * `disposed` when the page scope ends, so late responses are ignored.
 */
export type UsageRequestScope = { controller: AbortController; disposed: boolean }

export const createUsageRequestScope = (): UsageRequestScope => ({ controller: new AbortController(), disposed: false })

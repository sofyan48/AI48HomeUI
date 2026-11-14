type User = { id: number | string; username: string; deleted_at?: string | null }
type Bindings = { user_id?: number | string | null; channels?: number[]; model_groups?: number[] }

export function usersKeyOwnerOptions(users: User[], owner: number) {
  const options = [{ label: 'Unassigned', value: 0 }]
  for (const user of users) {
    if (!user.deleted_at || Number(user.id) === owner) {
      options.push({ label: `${user.username}${user.deleted_at ? ' (deleted)' : ''}`, value: Number(user.id) })
    }
  }
  if (owner && !users.some(user => Number(user.id) === owner)) {
    options.push({ label: `#${owner} (unavailable)`, value: owner })
  }
  return options
}

function sameIds(left: number[] = [], right: number[] = []) {
  const a = new Set(left.map(Number))
  const b = new Set(right.map(Number))
  return a.size === b.size && [...a].every(id => b.has(id))
}

export function changedUsersKeyBindings(original: Bindings, next: Bindings) {
  // Omission preserves bindings without revalidating deleted owners or restoring removed scopes.
  return {
    ...(Number(original.user_id || 0) === Number(next.user_id || 0) ? {} : { user_id: Number(next.user_id) || 0 }),
    ...(sameIds(original.channels, next.channels) ? {} : { channels: [...(next.channels || [])] }),
    ...(sameIds(original.model_groups, next.model_groups) ? {} : { model_groups: [...(next.model_groups || [])] })
  }
}

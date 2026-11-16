// API-shape normalisers and pure helpers for the admin access keys page (/admin/access-keys).

export type AccessKeyResource = {
  id: string
  index: number
  numericId: number | null
  identifier: string | null
  displayName: string | null
  value: string
  maskedValue: string
  prefix: string
  suffix: string
  length: number
  userId: number | null
  channelGroupIds: number[]
  modelGroupIds: number[]
  raw: unknown
}

export type AccessKeyUser = { id: number; deletedAt: unknown; name: string }
export type AccessKeyGroup = { id: number; disabled: boolean; name: string }
export type AccessKeyGroupField = 'channelGroupIds' | 'modelGroupIds'

export const MAX_DISPLAY_NAME_LENGTH = 128

export function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(object: any, keys: string[]): string | null {
  for (const key of keys) {
    if (typeof object?.[key] === "string") return object[key];
  }
  return null;
}

function firstNumber(object: any, keys: string[]): number | null {
  for (const key of keys) {
    const value = object?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function numericArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "number" && Number.isFinite(item))
    : [];
}

export function selectAPIKeyEntries(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload;
  const entries = payload?.api_key_entries ?? payload?.items;
  if (Array.isArray(entries) && entries.length > 0) return entries;
  const legacy = payload?.["api-keys"] ?? payload?.api_keys;
  return Array.isArray(legacy)
    ? legacy.filter((value) => typeof value === "string")
    : [];
}

export function normalizeResource(raw: unknown, index: number): AccessKeyResource {
  const object = isPlainObject(raw) ? raw : null;
  const value = (
    object
      ? (firstString(object, ["api_key", "api-key", "key", "value"]) ?? "")
      : typeof raw === "string"
        ? raw
        : ""
  ).trim();
  const numericId = object
    ? firstNumber(object, ["id", "api_key_id", "api-key-id"])
    : null;
  const displayNameValue = object
    ? firstString(object, ["display_name"])
    : null;
  const displayName = displayNameValue?.trim() || null;
  const modelGroupValue = object
    ? (object.model_groups ?? object["model-groups"])
    : null;
  const rawUserId = object ? firstNumber(object, ["user_id", "user-id"]) : null;
  return {
    id: numericId != null ? String(numericId) : `${index}:${value}`,
    index,
    numericId,
    identifier: numericId != null ? `api-key-${numericId}` : null,
    displayName,
    value,
    maskedValue: value
      ? value.length <= 10
        ? `${value.slice(0, 2)}***`
        : `${value.slice(0, 6)}...${value.slice(-4)}`
      : "",
    prefix: value.slice(0, 6),
    suffix: value.slice(-4),
    length: value.length,
    userId: rawUserId != null && rawUserId > 0 ? rawUserId : null,
    channelGroupIds: numericArray(object?.channels),
    modelGroupIds: numericArray(modelGroupValue),
    raw,
  };
}

export function serializeEntry(
  resource: Pick<AccessKeyResource, 'value' | 'userId' | 'channelGroupIds' | 'modelGroupIds'>,
  displayName: string | undefined,
) {
  return {
    api_key: resource.value.trim(),
    ...(displayName === undefined
      ? {}
      : { display_name: displayName.trim() || null }),
    user_id: resource.userId ?? 0,
    channels: resource.channelGroupIds ?? [],
    model_groups: resource.modelGroupIds ?? [],
  };
}

function topLevelArray(payload: any, keys: string[]): any[] {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

export function normalizeUsers(payload: unknown): AccessKeyUser[] {
  return topLevelArray(payload, ["users", "items", "records", "data"])
    .map((item): AccessKeyUser | null => {
      if (!isPlainObject(item)) return null;
      const id = firstNumber(item, ["id", "user_id", "userId"]);
      if (id == null) return null;
      return {
        id,
        deletedAt: item.deleted_at ?? null,
        name:
          firstString(item, [
            "username",
            "user_name",
            "userName",
            "name",
          ])?.trim() || String(id),
      };
    })
    .filter((user): user is AccessKeyUser => Boolean(user));
}

export function normalizeGroups(payload: unknown, kind: 'channel' | 'model'): AccessKeyGroup[] {
  const topLevelKey = kind === "channel" ? "channel_groups" : "model_groups";
  const nameKeys =
    kind === "channel"
      ? ["channel_name", "name", "label"]
      : ["group_name", "name", "label"];
  const fallbackPrefix = kind === "channel" ? "channel-group" : "model-group";
  return topLevelArray(payload, [topLevelKey, "items"]).filter((item) => !item?.deleted_at).map((item, index) => {
    const object = isPlainObject(item) ? item : {};
    const id = firstNumber(object, ["id"]) ?? index + 1;
    return {
      id,
      disabled: Boolean(object.disabled),
      name:
        firstString(object, nameKeys)?.trim() ||
        `${fallbackPrefix}-${index + 1}`,
    };
  });
}

export function sameGroupIds(left: number[], right: number[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

export function generatedKey() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sk-${hex}`;
}

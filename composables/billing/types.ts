import type { Ref } from 'vue'
import type { BillingCharge as UserBillingCharge, BillingBalanceRecord as UserBalanceRecord, BillingOverview as UserBillingOverview, BillingTopItem } from '~/stores/userSession'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import type { normalizeBillingSettings } from '~/composables/billingPreferences'
import type { provideBillingPriceImport } from './useBillingPriceImport'

export type BillingSection = 'overview' | 'charges' | 'balances' | 'prices'
export interface BillingRangeFilters { from: string; to: string; user?: string; organization?: string; member?: string; provider?: string; model?: string }
export interface BillingCharge extends UserBillingCharge {
  user_id?: number;
  actor_user_id?: number | null;
  username?: string;
  actual_model?: string;
  endpoint?: string;
  cache_tokens?: number;
  balance_before?: number;
  matched_price_rule?: string;
  api_key_label?: string;
  api_key_masked?: string;
  price_snapshot?: string | Record<string, unknown> | null;
}
export interface BillingBalanceRecord extends UserBalanceRecord { user_id?: number; operator?: string; note?: string }
export interface BillingRankingItem extends BillingTopItem { model?: string; provider?: string }
export type BillingOverview = Partial<Omit<UserBillingOverview, 'top_models'>> & {
  range?: { from?: string; to?: string; report_timezone?: string };
  total_balance?: number;
  active_user_count?: number;
  daily_trend?: { date: string; charge_amount: number; request_count?: number }[];
  top_users?: BillingRankingItem[];
  top_models?: BillingRankingItem[];
  top_providers?: BillingRankingItem[];
}
export interface BillingOverviewResponse { overview?: BillingOverview }
export interface BillingListResponse<T> { items?: T[]; total?: number }
export interface BillingPriceRule {
  id: string; provider: string; model: string; source: string;
  service_tier?: string;
  min_input_tokens?: number;
  input_price_per_million?: number;
  output_price_per_million?: number;
  cache_read_price_per_million?: number;
  cache_write_price_per_million?: number;
  request_price?: number;
  enabled?: boolean;
  note?: string;
  created_at?: string;
  updated_at?: string;
}
export interface BillingPricesResponse extends BillingListResponse<BillingPriceRule> { price_rule_schema_version?: number; schema_version?: number }
export interface BillingUser { id: number; username: string; credits: number; credits_unlimited?: boolean }
export interface BillingUsersResponse { users?: BillingUser[] }
export interface BillingTierDiagnostics { supported?: boolean; fallback_requests?: number; eligible_requests?: number }
export type BillingSettings = Omit<ReturnType<typeof normalizeBillingSettings>, 'report_timezone'> & { report_timezone: string }
export type BillingPriceImporter = Pick<ReturnType<typeof provideBillingPriceImport>, 'openImport' | 'checkUpdates'>
export type BillingNumericField = 'min_input_tokens' | 'input_price_per_million' | 'output_price_per_million' | 'cache_read_price_per_million' | 'cache_write_price_per_million' | 'request_price'
export type BillingPricePayload = { service_tier: string; source: string; enabled: boolean; note: string } & Partial<Record<BillingNumericField, number>>
export interface BillingPresentationOptions {
  overview: Readonly<Ref<BillingOverviewResponse | null>>;
  selectedBalance: Readonly<Ref<BillingBalanceRecord | null>>;
  selectedCharge: Readonly<Ref<BillingCharge | null>>;
  t: ReturnType<typeof useAdminI18n>['t'];
  formatCredits: (value: unknown) => string;
  formatNumber: (value: unknown) => string;
  formatDateTime: (value: string | undefined) => string;
  balanceTypeLabel: (type: string) => string;
}

<template>
    <AppModal v-model:open="adjustmentOpen" :title="adjustmentForm.type === 'recharge' ? t('billing.adjust.rechargeTitle') : t('billing.adjust.deductTitle')" :description="t('billing.adjust.description')">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitBalanceAdjustment">
          <PortalAlert v-if="modalError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('billing.adjust.failedTitle')" :description="modalError" />
          <div class="grid grid-cols-2 gap-2">
            <AppButton type="button" :color="adjustmentForm.type === 'recharge' ? 'success' : 'neutral'" :variant="adjustmentForm.type === 'recharge' ? 'soft' : 'outline'" @click="adjustmentForm.type = 'recharge'">{{ t('billing.balances.recharge') }}</AppButton>
            <AppButton type="button" :color="adjustmentForm.type === 'deduct' ? 'warning' : 'neutral'" :variant="adjustmentForm.type === 'deduct' ? 'soft' : 'outline'" @click="adjustmentForm.type = 'deduct'">{{ t('billing.balances.deduct') }}</AppButton>
          </div>
          <AdminField :label="t('common.user')" required>
            <AdminSelectMenu v-model="adjustmentForm.user_id" :items="userOptions" value-key="value" label-key="label" :placeholder="t('billing.adjust.searchUsers')" :search-input="{ placeholder: t('billing.adjust.searchUserInput') }" class="w-full" />
          </AdminField>
          <AdminField :label="t('billing.col.amount')" required><AdminInput v-model="adjustmentForm.amount" type="number" min="0.000001" step="0.000001" class="w-full" /></AdminField>
          <AdminField :label="t('billing.col.note')" :required="adjustmentForm.type === 'deduct'" :hint="adjustmentForm.type === 'deduct' ? t('billing.adjust.noteRequiredHint') : t('common.optional')"><AdminTextarea v-model="adjustmentForm.note" :rows="3" class="w-full" /></AdminField>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4"><AppButton type="button" color="neutral" variant="ghost" @click="adjustmentOpen = false">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :color="adjustmentForm.type === 'recharge' ? 'success' : 'warning'" :loading="adjustmentSaving">{{ adjustmentForm.type === 'recharge' ? t('billing.balances.recharge') : t('billing.balances.deduct') }}</AppButton></div>
        </form>
      </template>
    </AppModal>

</template>
<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, adjustmentOpen, adjustmentForm, submitBalanceAdjustment, modalError, userOptions, adjustmentSaving } = useBillingWorkspace()
</script>

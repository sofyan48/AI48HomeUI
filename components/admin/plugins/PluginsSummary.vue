<template>
        <section class="bay" :aria-label="t('plugins.summaryAria')">
            <div class="bay__slots" aria-hidden="true">
                <span
                    v-for="(plugin, index) in installed.slice(0, 12)"
                    :key="plugin.id || index"
                    class="bay__slot"
                    :class="plugin.effective_enabled ? 'bay__slot--on' : plugin.enabled ? 'bay__slot--idle' : ''"
                    :title="plugin.id"
                />
                <span v-for="index in Math.max(0, 6 - installed.length)" :key="`empty-${index}`" class="bay__slot bay__slot--empty" />
            </div>
            <dl class="bay__stats">
                <div>
                    <dt>{{ t('plugins.stats.installed') }}</dt>
                    <dd>{{ installed.length }}<span>{{ t('plugins.stats.effective', { count: installed.filter((plugin) => plugin.effective_enabled).length }) }}</span></dd>
                </div>
                <div>
                    <dt>{{ t('plugins.stats.inStore') }}</dt>
                    <dd>{{ store.length }}<span>{{ t('plugins.stats.availableToInstall') }}</span></dd>
                </div>
                <div>
                    <dt>{{ t('plugins.stats.authRules') }}</dt>
                    <dd>{{ authRules.length }}<span>{{ t('plugins.stats.accessRules') }}</span></dd>
                </div>
            </dl>
        </section>
</template>

<style scoped>
/* Plugins signature: module bay of slot LEDs, one per installed plugin. */
.bay {
    display: grid;
    gap: 1rem 2rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--admin-panel-border);
    border-radius: 0.875rem;
    background:
        radial-gradient(ellipse 60% 140% at 0% 50%, color-mix(in oklch, var(--page-accent) 12%, transparent), transparent 70%),
        var(--admin-panel-bg);
    box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
@media (min-width: 64rem) { .bay { grid-template-columns: auto minmax(0, 1fr); align-items: center; } }
.bay__slots {
    display: grid;
    width: fit-content;
    grid-template-columns: repeat(6, 1.75rem);
    gap: 0.375rem;
    padding: 0.5rem;
    border-radius: 0.75rem;
    background: oklch(0.2 0.02 270);
}
.bay__slot { position: relative; height: 1.75rem; border-radius: 0.375rem; background: rgb(255 255 255 / 8%); }
.bay__slot::after { position: absolute; top: 0.3125rem; left: 0.3125rem; width: 0.3125rem; height: 0.3125rem; border-radius: 9999px; background: rgb(255 255 255 / 20%); content: ''; }
.bay__slot--on { background: color-mix(in oklch, var(--page-accent) 35%, rgb(255 255 255 / 6%)); }
.bay__slot--on::after { background: var(--color-emerald-400); box-shadow: 0 0 6px var(--color-emerald-400); }
.bay__slot--idle::after { background: var(--color-amber-400); }
.bay__slot--empty { background: transparent; outline: 1px dashed rgb(255 255 255 / 14%); outline-offset: -1px; }
.bay__slot--empty::after { display: none; }
.bay__stats { display: grid; gap: 0.75rem 1.5rem; }
@media (min-width: 40rem) { .bay__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.bay__stats dt { font-size: 0.75rem; color: var(--ui-text-muted); }
.bay__stats dd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; font-family: var(--admin-display-font); font-size: 1.5rem; line-height: 2rem; font-weight: 800; color: var(--ui-text-highlighted); }
.bay__stats dd span { font-family: inherit; font-size: 0.75rem; font-weight: 500; color: var(--ui-text-muted); }
</style>

<script setup lang="ts">
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, installed, store, authRules } = usePluginsWorkspace();
</script>

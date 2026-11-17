<template>
        <AppCard
          class="sticky top-24 z-20 mb-4 xl:hidden"
          :ui="{ body: 'flex gap-1 overflow-x-auto p-2' }"
        >
          <AppButton
            v-for="section in outline"
            :key="section.id"
            size="sm"
            :color="activeSection === section.id ? 'primary' : 'neutral'"
            :variant="activeSection === section.id ? 'soft' : 'ghost'"
            :aria-current="activeSection === section.id ? 'location' : undefined"
            class="shrink-0"
            @click="scrollToSection(section.id)"
            >{{ section.short }}</AppButton
          >
        </AppCard>
</template>

<script setup lang="ts">
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const { outline, activeSection, scrollToSection } = useConfigWorkspace()
</script>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root"><i class="ti ti-alert-triangle" style="margin-right: 8px;"></i>{{ i18n.ts.remoteUserCaution }} <MkLink v-if="href" :class="$style.link" :url="href" target="_blank">{{ i18n.ts.showOnRemote }}</MkLink></div>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n.js';
import MkLink from '@/components/MkLink.vue';

defineProps<{
	href?: string;
}>();
</script>

<style lang="scss" module>
.root {
	font-size: 0.8em;
	padding: 16px;
	background: color-mix(in srgb, var(--MI_THEME-infoWarnBg) 65%, transparent);
	color: var(--MI_THEME-infoWarnFg);
	border-radius: var(--MI-radius);
	overflow: clip;
	z-index: 1;
}

.link {
	color: var(--MI_THEME-accent);
}
</style>

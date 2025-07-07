<!--
SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
SPDX-License-Identifier: AGPL-3.0-only

Horizontal strip that displays a user's badges.
-->

<template>
<div :class="$style.badges">
	<div
		v-for="badge of badges"
		:key="badge.key"
		:class="[$style.badge, $style[`semantic_${badge.style ?? 'neutral'}`]]"
	>
		{{ badge.label }}
	</div>
</div>
</template>

<script lang="ts">
export interface Badge {
	/**
	 * ID/key of this badge, must be unique within the strip.
	 */
	key: string;

	/**
	 * Label text to display.
	 * Should already be translated.
	 */
	label: string;

	/**
	 * Semantic style of the badge.
	 * Defaults to "neutral" if unset.
	 */
	style?: 'success' | 'neutral' | 'warning' | 'error';
}
</script>

<script setup lang="ts">
defineProps<{
	badges: Badge[],
}>();
</script>

<style module lang="scss">
.badges {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: var(--MI-margin);
}

.badge {
	display: inline-block;
	border: solid 1px;
	border-radius: var(--MI-radius-sm);
	padding: 2px 6px;
	font-size: 85%;
}

.semantic_error {
	color: var(--MI_THEME-error);
	border-color: var(--MI_THEME-error);
}

.semantic_warning {
	color: var(--MI_THEME-warn);
	border-color: var(--MI_THEME-warn);
}

.semantic_success {
	color: var(--MI_THEME-success);
	border-color: var(--MI_THEME-success);
}
</style>

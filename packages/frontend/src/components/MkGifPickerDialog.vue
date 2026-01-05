<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal
	ref="modal"
	v-slot="{ type, maxHeight }"
	:zPriority="'middle'"
	:preferType="'auto'"
	:transparentBg="true"
	:manualShowing="manualShowing"
	:src="src"
	@click="modal?.close()"
	@esc="modal?.close()"
	@opening="opening"
	@close="emit('close')"
	@closed="emit('closed')"
>
	<MkGifPicker
		ref="picker"
		class="_popup _shadow"
		:class="{ [$style.drawer]: type === 'drawer' }"
		:asDrawer="type === 'drawer'"
		:max-height="maxHeight"
		@chosen="chosen"
		@esc="modal?.close()"
	/>
</MkModal>
</template>

<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkGifPicker from '@/components/MkGifPicker.vue';

const props = withDefaults(defineProps<{
	manualShowing?: boolean | null;
	src?: HTMLElement;
}>(), {
	manualShowing: null,
});

const emit = defineEmits<{
	(ev: 'done', v: string): void;
	(ev: 'close'): void;
	(ev: 'closed'): void;
}>();

const modal = useTemplateRef('modal');
const picker = useTemplateRef('picker');

function chosen(gifUrl: string) {
	emit('done', gifUrl);
	modal.value?.close();
}

function opening() {
	picker.value?.reset();
	picker.value?.focus();

	// 何故かちょっと待たないとフォーカスされない
	window.setTimeout(() => {
		picker.value?.focus();
	}, 10);
}
</script>

<style lang="scss" module>
.drawer {
	border-radius: var(--MI-radius-lg);
	border-bottom-right-radius: 0;
	border-bottom-left-radius: 0;
}
</style>

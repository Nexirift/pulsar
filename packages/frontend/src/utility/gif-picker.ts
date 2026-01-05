/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent, ref } from 'vue';
import type { Ref } from 'vue';
import { popup } from '@/os.js';

/**
 * GIF ピッカーを表示する
 */
class GifPicker {
	private src: Ref<HTMLElement | null> = ref(null);
	private manualShowing = ref(false);
	private onChosen?: (gifUrl: string) => void;
	private onClosed?: () => void;

	constructor() {
		// nop
	}

	public async init() {
		await popup(defineAsyncComponent(() => import('@/components/MkGifPickerDialog.vue')), {
			src: this.src,
			manualShowing: this.manualShowing,
		}, {
			done: gifUrl => {
				if (this.onChosen) this.onChosen(gifUrl);
			},
			close: () => {
				this.manualShowing.value = false;
			},
			closed: () => {
				this.src.value = null;
				if (this.onClosed) this.onClosed();
			},
		});
	}

	public show(
		src: HTMLElement,
		onChosen?: GifPicker['onChosen'],
		onClosed?: GifPicker['onClosed'],
	) {
		this.src.value = src;
		this.manualShowing.value = true;
		this.onChosen = onChosen;
		this.onClosed = onClosed;
	}
}

export const gifPicker = new GifPicker();

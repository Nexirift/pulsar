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
	public async show(
		src: HTMLElement,
		onChosen?: (gifUrl: string) => void,
		onClosed?: () => void,
	) {
		await popup(defineAsyncComponent(() => import('@/components/MkGifPickerDialog.vue')), {
			src: ref(src),
			manualShowing: ref(true),
		}, {
			done: gifUrl => {
				if (onChosen) onChosen(gifUrl);
			},
			closed: () => {
				if (onClosed) onClosed();
			},
		});
	}
}

export const gifPicker = new GifPicker();

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { TimeService, TimerHandle } from '@/global/TimeService.js';

type Job<V> = {
	value: V;
	timer: TimerHandle;
};

// TODO: redis使えるようにする
export class CollapsedQueue<K, V> {
	private jobs: Map<K, Job<V>> = new Map();

	constructor(
		public readonly name: string,
		protected readonly timeService: TimeService,
		private readonly timeout: number,
		private readonly collapse: (oldValue: V, newValue: V) => V,
		private readonly perform: (key: K, value: V) => Promise<void | unknown>,
		private readonly onError?: (queue: CollapsedQueue<K, V>, error: unknown) => void,
	) {}

	enqueue(key: K, value: V) {
		if (this.jobs.has(key)) {
			const old = this.jobs.get(key)!;
			const merged = this.collapse(old.value, value);
			this.jobs.set(key, { ...old, value: merged });
		} else {
			const timer = this.timeService.startTimer(() => {
				const job = this.jobs.get(key)!;
				this.jobs.delete(key);
				this._perform(key, job.value);
			}, this.timeout);
			this.jobs.set(key, { value, timer });
		}
	}

	async performAllNow() {
		const entries = [...this.jobs.entries()];
		this.jobs.clear();
		for (const [_key, job] of entries) {
			this.timeService.stopTimer(job.timer);
		}
		return await Promise.allSettled(entries.map(([key, job]) => this._perform(key, job.value)));
	}

	private async _perform(key: K, value: V) {
		try {
			await this.perform(key, value);
		} catch (err) {
			this.onError?.(this, err);
			throw err;
		}
	}
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { get, set } from "idb-keyval";

const PENDING_ACTIONS_KEY = "pendingActions";

export interface PendingAction {
	id: string;
	type: "note" | "reaction" | "renote" | "follow" | "unfollow";
	data: any;
	timestamp: number;
	accountId: string;
}

/**
 * Add a pending action to be synced when back online
 */
export async function addPendingAction(
	action: Omit<PendingAction, "id" | "timestamp">,
): Promise<void> {
	const actions = (await get<PendingAction[]>(PENDING_ACTIONS_KEY)) || [];

	const newAction: PendingAction = {
		...action,
		id: crypto.randomUUID(),
		timestamp: Date.now(),
	};

	actions.push(newAction);
	await set(PENDING_ACTIONS_KEY, actions);

	// Request background sync if available
	if (
		"serviceWorker" in navigator &&
		"sync" in (navigator.serviceWorker as any)
	) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await (registration as any).sync.register("sync-actions");
			console.log("[Offline] Registered background sync for pending action");
		} catch (error) {
			console.error("[Offline] Failed to register background sync:", error);
		}
	}
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
	return (await get<PendingAction[]>(PENDING_ACTIONS_KEY)) || [];
}

/**
 * Clear all pending actions
 */
export async function clearPendingActions(): Promise<void> {
	await set(PENDING_ACTIONS_KEY, []);
}

/**
 * Register periodic sync for updates
 */
export async function registerPeriodicSync(
	tag: "update-timeline" | "update-notifications",
	intervalMs: number = 15 * 60 * 1000,
): Promise<void> {
	if (
		"serviceWorker" in navigator &&
		"periodicSync" in (navigator.serviceWorker as any)
	) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await (registration as any).periodicSync.register(tag, {
				minInterval: intervalMs,
			});
			console.log(
				`[Periodic Sync] Registered ${tag} with interval ${intervalMs}ms`,
			);
		} catch (error) {
			console.error(`[Periodic Sync] Failed to register ${tag}:`, error);
		}
	}
}

/**
 * Unregister periodic sync
 */
export async function unregisterPeriodicSync(tag: string): Promise<void> {
	if (
		"serviceWorker" in navigator &&
		"periodicSync" in (navigator.serviceWorker as any)
	) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await (registration as any).periodicSync.unregister(tag);
			console.log(`[Periodic Sync] Unregistered ${tag}`);
		} catch (error) {
			console.error(`[Periodic Sync] Failed to unregister ${tag}:`, error);
		}
	}
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { get, set } from "idb-keyval";
import * as Misskey from "misskey-js";
import type { PushNotificationDataMap } from "@/types.js";
import type { I18n } from "@@/js/i18n.js";
import type { Locale } from "../../../locales/index.js";
import { createNotification } from "@/scripts/create-notification.js";
import { swLang } from "@/scripts/lang.js";
import * as swos from "@/scripts/operations.js";

const CACHE_NAME = `pulsar-pages-${_VERSION_}`;
const ASSETS_CACHE_NAME = `pulsar-assets-${_VERSION_}`;
const PENDING_ACTIONS_KEY = "pendingActions";

interface PendingAction {
	id: string;
	type: "note" | "reaction" | "renote" | "follow" | "unfollow";
	data: any;
	timestamp: number;
	accountId: string;
}

// Type assertion for ServiceWorker context
const ctx = globalThis as unknown as ServiceWorkerGlobalScope;

ctx.addEventListener("install", (ev) => {
	ev.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				return cache.addAll(["/", "/index.html", "/manifest.json"]);
			})
			.then(() => ctx.skipWaiting()),
	);
});

ctx.addEventListener("activate", (ev) => {
	ev.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames
						.filter(
							(v) =>
								v !== swLang.cacheName &&
								v !== CACHE_NAME &&
								v !== ASSETS_CACHE_NAME,
						)
						.map((name) => caches.delete(name)),
				),
			)
			.then(() => ctx.clients.claim()),
	);
});

async function offlineContentHTML() {
	const i18n = (await (swLang.i18n ?? swLang.fetchLocale())) as Partial<
		I18n<Locale>
	>;
	const messages = {
		title:
			i18n.ts?._offlineScreen.title ?? "Offline - Could not connect to server",
		header: i18n.ts?._offlineScreen.header ?? "Could not connect to server",
		reload: i18n.ts?.reload ?? "Reload",
	};

	return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta content="width=device-width,initial-scale=1"name="viewport"><title>${messages.title}</title><style>body{background-color:#0c1210;color:#dee7e4;font-family:Hiragino Maru Gothic Pro,BIZ UDGothic,Roboto,HelveticaNeue,Arial,sans-serif;line-height:1.35;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box}.icon{max-width:120px;width:100%;height:auto;margin-bottom:20px;}.message{text-align:center;font-size:20px;font-weight:700;margin-bottom:20px}.version{text-align:center;font-size:90%;margin-bottom:20px}button{padding:7px 14px;min-width:100px;font-weight:700;font-family:Hiragino Maru Gothic Pro,BIZ UDGothic,Roboto,HelveticaNeue,Arial,sans-serif;line-height:1.35;border-radius:99rem;background-color:#b4e900;color:#192320;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent}button:hover{background-color:#c6ff03}</style></head><body><svg class="icon"fill="none"height="24"stroke="currentColor"stroke-linecap="round"stroke-linejoin="round"stroke-width="2"viewBox="0 0 24 24"width="24"xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"fill="none"stroke="none"/><path d="M9.58 5.548c.24 -.11 .492 -.207 .752 -.286c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 .957 -.383 1.824 -1.003 2.454m-2.997 1.033h-11.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.13 -.582 .37 -1.128 .7 -1.62"/><path d="M3 3l18 18"/></svg><div class="message">${messages.header}</div><div class="version">v${_VERSION_}</div><button onclick="reloadPage()">${messages.reload}</button><script>function reloadPage(){location.reload(!0)}</script></body></html>`;
}

globalThis.addEventListener("fetch", (ev) => {
	const fetchEvent = ev as FetchEvent;
	const url = new URL(fetchEvent.request.url);

	// Only handle requests from our origin
	if (url.origin !== globalThis.location.origin) return;

	// Check if it's an HTML request
	let isHTMLRequest = false;
	if (fetchEvent.request.headers.get("sec-fetch-dest") === "document") {
		isHTMLRequest = true;
	} else if (fetchEvent.request.headers.get("accept")?.includes("/html")) {
		isHTMLRequest = true;
	} else if (fetchEvent.request.url.endsWith("/")) {
		isHTMLRequest = true;
	}

	// Check if it's an asset request (CSS, JS, fonts, images)
	const isAsset =
		/\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/i.test(
			url.pathname,
		);

	if (isHTMLRequest) {
		// Network-first strategy for HTML pages
		fetchEvent.respondWith(
			fetch(fetchEvent.request)
				.then(async (response) => {
					// Cache the successful response
					if (response.ok) {
						const cache = await caches.open(CACHE_NAME);
						cache.put(fetchEvent.request, response.clone());
					}
					return response;
				})
				.catch(async () => {
					// Try to serve from cache first
					const cache = await caches.open(CACHE_NAME);
					const cachedResponse = await cache.match(fetchEvent.request);

					if (cachedResponse) {
						// Serve cached content - the offline banner will appear in the UI
						return cachedResponse;
					}

					// If no cache available, show offline screen as fallback
					const html = await offlineContentHTML();
					return new Response(html, {
						status: 200,
						headers: {
							"content-type": "text/html",
						},
					});
				}),
		);
	} else if (isAsset) {
		// Cache-first strategy for assets
		fetchEvent.respondWith(
			caches.open(ASSETS_CACHE_NAME).then((cache) => {
				return cache.match(fetchEvent.request).then((cachedResponse) => {
					if (cachedResponse) {
						return cachedResponse;
					}

					return fetch(fetchEvent.request).then((response) => {
						// Only cache successful responses
						if (response.ok) {
							cache.put(fetchEvent.request, response.clone());
						}
						return response;
					});
				});
			}),
		);
	}
});

ctx.addEventListener("push", (ev: PushEvent) => {
	// クライアント取得
	ev.waitUntil(
		ctx.clients
			.matchAll({
				includeUncontrolled: true,
				type: "window",
			})
			.then(async () => {
				try {
					if (!ev.data) {
						console.error("Push event has no data");
						return;
					}

					const data: PushNotificationDataMap[keyof PushNotificationDataMap] =
						ev.data.json();

					if (_DEV_) {
						console.log("Push notification received:", data);
					}

					if (!data || !data.type) {
						console.error("Invalid push notification data:", data);
						return;
					}

					switch (data.type) {
						// case 'driveFileCreated':
						case "notification":
						case "unreadAntennaNote":
						case "newChatMessage": {
							// 1日以上経過している場合は無視
							if (Date.now() - data.dateTime > 1000 * 60 * 60 * 24) {
								if (_DEV_) {
									console.log("Ignoring old notification", data);
								}
								return; // Return without showing notification for old items
							}

							await createNotification(data);
							return;
						}
						case "readAllNotifications":
							await ctx.registration
								.getNotifications()
								.then((notifications: Notification[]) =>
									notifications.forEach(
										(n: Notification) =>
											n.tag !== "read_notification" && n.close(),
									),
								);
							return; // Return after closing notifications
					}
				} catch (error) {
					console.error("Error processing push notification:", error);
					// Re-throw to ensure the event handler knows it failed
					throw error;
				}
			}),
	);
});

ctx.addEventListener("notificationclick", (ev: NotificationEvent) => {
	ev.waitUntil(
		(async (): Promise<void> => {
			if (_DEV_) {
				console.log("notificationclick", ev.action, ev.notification.data);
			}

			const { action, notification } = ev;
			const data: PushNotificationDataMap[keyof PushNotificationDataMap] =
				notification.data ?? {};
			const { userId: loginId } = data;
			let client: WindowClient | null = null;

			switch (data.type) {
				case "notification":
					switch (action) {
						case "follow":
							if ("userId" in data.body)
								await swos.api("following/create", loginId, {
									userId: data.body.userId,
								});
							break;
						case "showUser":
							if ("user" in data.body)
								client = await swos.openUser(
									Misskey.acct.toString(data.body.user),
									loginId,
								);
							break;
						case "reply":
							if ("note" in data.body)
								client = await swos.openPost(
									{ reply: data.body.note },
									loginId,
								);
							break;
						case "renote":
							if ("note" in data.body)
								await swos.api("notes/create", loginId, {
									renoteId: data.body.note.id,
								});
							break;
						case "accept":
							switch (data.body.type) {
								case "receiveFollowRequest":
									await swos.api("following/requests/accept", loginId, {
										userId: data.body.userId,
									});
									break;
							}
							break;
						case "reject":
							switch (data.body.type) {
								case "receiveFollowRequest":
									await swos.api("following/requests/reject", loginId, {
										userId: data.body.userId,
									});
									break;
							}
							break;
						case "showFollowRequests":
							client = await swos.openClient(
								"push",
								"/my/follow-requests",
								loginId,
							);
							break;
						case "edited":
							if ("note" in data.body)
								client = await swos.openPost(
									{ reply: data.body.note },
									loginId,
								);
							break;
						default:
							switch (data.body.type) {
								case "receiveFollowRequest":
									client = await swos.openClient(
										"push",
										"/my/follow-requests",
										loginId,
									);
									break;
								case "reaction":
									client = await swos.openNote(data.body.note.id, loginId);
									break;
								default:
									if ("note" in data.body) {
										client = await swos.openNote(data.body.note.id, loginId);
									} else if ("user" in data.body) {
										client = await swos.openUser(
											Misskey.acct.toString(data.body.user),
											loginId,
										);
									}
									break;
							}
					}
					break;
				case "unreadAntennaNote":
					client = await swos.openAntenna(data.body.antenna.id, loginId);
					break;
				case "newChatMessage":
					client = await swos.openChat(data.body, loginId);
					break;
				default:
					switch (action) {
						case "markAllAsRead":
							await ctx.registration
								.getNotifications()
								.then((notifications: Notification[]) =>
									notifications.forEach(
										(n: Notification) =>
											n.tag !== "read_notification" && n.close(),
									),
								);
							await get<
								Pick<Misskey.entities.SignupResponse, "id" | "token">[]
							>("accounts").then((accounts) => {
								return Promise.all(
									(accounts ?? []).map(async (account) => {
										await swos.sendMarkAllAsRead(account.id);
									}),
								);
							});
							break;
						case "settings":
							client = await swos.openClient(
								"push",
								"/settings/notifications",
								loginId,
							);
							break;
					}
			}

			if (client) {
				client.focus();
			}
			if (data.type === "notification") {
				await swos.sendMarkAllAsRead(loginId);
			}

			notification.close();
		})(),
	);
});

ctx.addEventListener("notificationclose", (ev: NotificationEvent) => {
	const data: PushNotificationDataMap[keyof PushNotificationDataMap] =
		ev.notification.data;

	ev.waitUntil(
		(async (): Promise<void> => {
			if (data.type === "notification") {
				await swos.sendMarkAllAsRead(data.userId);
			}
			return;
		})(),
	);
});

ctx.addEventListener("message", (ev: ExtendableMessageEvent) => {
	ev.waitUntil(
		(async (): Promise<void> => {
			switch (ev.data) {
				case "clear":
					// Cache Storage全削除
					await caches
						.keys()
						.then((cacheNames) =>
							Promise.all(cacheNames.map((name) => caches.delete(name))),
						);
					return; // TODO
			}

			if (typeof ev.data === "object") {
				// E.g. '[object Array]' → 'array'
				const otype = Object.prototype.toString
					.call(ev.data)
					.slice(8, -1)
					.toLowerCase();

				if (otype === "object") {
					if (ev.data.msg === "initialize") {
						swLang.setLang(ev.data.lang);
					}
				}
			}
		})(),
	);
});

// Background Sync - for offline actions
ctx.addEventListener("sync", (ev) => {
	const syncEvent = ev as ExtendableEvent & { tag: string };
	if (_DEV_) {
		console.log("[SW] Background sync event:", syncEvent.tag);
	}

	syncEvent.waitUntil(
		(async () => {
			// Handle different sync tags
			switch (syncEvent.tag) {
				case "sync-notes":
				case "sync-actions":
					// Sync pending notes and actions when back online
					if (_DEV_) console.log("[SW] Syncing pending actions...");
					await syncPendingActions();
					break;
				case "sync-notifications":
					// Sync notification state
					if (_DEV_) console.log("[SW] Syncing notifications...");
					await syncNotificationRead();
					break;
				default:
					if (_DEV_) console.log("[SW] Unknown sync tag:", syncEvent.tag);
			}
		})(),
	);
});

// Periodic Background Sync - for periodic updates
ctx.addEventListener("periodicsync", (ev) => {
	const periodicEvent = ev as ExtendableEvent & { tag: string };
	if (_DEV_) {
		console.log("[SW] Periodic sync event:", periodicEvent.tag);
	}

	periodicEvent.waitUntil(
		(async () => {
			// Handle different periodic sync tags
			switch (periodicEvent.tag) {
				case "update-timeline":
					// Periodically check for timeline updates
					if (_DEV_) console.log("[SW] Checking for timeline updates...");
					await checkForUpdates("timeline");
					break;
				case "update-notifications":
					// Periodically check for new notifications
					if (_DEV_) console.log("[SW] Checking for new notifications...");
					await checkForUpdates("notifications");
					break;
				default:
					if (_DEV_)
						console.log("[SW] Unknown periodic sync tag:", periodicEvent.tag);
			}
		})(),
	);
});

// Sync pending actions that were created while offline
async function syncPendingActions() {
	try {
		const actions = (await get<PendingAction[]>(PENDING_ACTIONS_KEY)) || [];
		if (actions.length === 0) return;

		if (_DEV_)
			console.log(`[SW] Found ${actions.length} pending actions to sync`);

		const successfulIds: string[] = [];

		for (const action of actions) {
			try {
				switch (action.type) {
					case "note":
						await swos.api("notes/create", action.accountId, action.data);
						if (_DEV_) console.log("[SW] Synced note:", action.id);
						successfulIds.push(action.id);
						break;
					case "reaction":
						await swos.api(
							"notes/reactions/create",
							action.accountId,
							action.data,
						);
						if (_DEV_) console.log("[SW] Synced reaction:", action.id);
						successfulIds.push(action.id);
						break;
					case "renote":
						await swos.api("notes/create", action.accountId, {
							renoteId: action.data.noteId,
						});
						if (_DEV_) console.log("[SW] Synced renote:", action.id);
						successfulIds.push(action.id);
						break;
					case "follow":
						await swos.api("following/create", action.accountId, {
							userId: action.data.userId,
						});
						if (_DEV_) console.log("[SW] Synced follow:", action.id);
						successfulIds.push(action.id);
						break;
					case "unfollow":
						await swos.api("following/delete", action.accountId, {
							userId: action.data.userId,
						});
						if (_DEV_) console.log("[SW] Synced unfollow:", action.id);
						successfulIds.push(action.id);
						break;
				}
			} catch (error) {
				console.error("[SW] Failed to sync action:", action.id, error);
				// Keep failed actions for retry
			}
		}

		// Remove successfully synced actions
		if (successfulIds.length > 0) {
			const remainingActions = actions.filter(
				(a) => !successfulIds.includes(a.id),
			);
			await set(PENDING_ACTIONS_KEY, remainingActions);
			if (_DEV_)
				console.log(
					`[SW] Synced ${successfulIds.length} actions, ${remainingActions.length} remaining`,
				);
		}
	} catch (error) {
		console.error("[SW] Error syncing pending actions:", error);
	}
}

// Sync read notifications
async function syncNotificationRead() {
	try {
		const accounts =
			await get<Pick<Misskey.entities.SignupResponse, "id" | "token">[]>(
				"accounts",
			);
		if (!accounts || accounts.length === 0) return;

		for (const account of accounts) {
			try {
				await swos.sendMarkAllAsRead(account.id);
				if (_DEV_)
					console.log(
						"[SW] Synced notification read state for account:",
						account.id,
					);
			} catch (error) {
				console.error(
					"[SW] Failed to sync notifications for account:",
					account.id,
					error,
				);
			}
		}
	} catch (error) {
		console.error("[SW] Error syncing notification read state:", error);
	}
}

// Check for updates and notify clients
async function checkForUpdates(type: "timeline" | "notifications") {
	try {
		const accounts =
			await get<Pick<Misskey.entities.SignupResponse, "id" | "token">[]>(
				"accounts",
			);
		if (!accounts || accounts.length === 0) return;

		const clients = await ctx.clients.matchAll({
			type: "window",
			includeUncontrolled: true,
		});

		for (const account of accounts) {
			try {
				if (type === "notifications") {
					// Check for unread notifications
					const response = await swos.api("i/notifications", account.id, {
						limit: 1,
						includeTypes: [
							"follow",
							"mention",
							"reply",
							"renote",
							"quote",
							"reaction",
						],
					});
					if (response && Array.isArray(response) && response.length > 0) {
						// Notify clients about new notifications
						for (const client of clients) {
							client.postMessage({
								type: "notification-update",
								hasNew: true,
							});
						}
						if (_DEV_)
							console.log(
								"[SW] Found new notifications for account:",
								account.id,
							);
					}
				} else if (type === "timeline") {
					// Check for timeline updates
					const response = await swos.api("notes/timeline", account.id, {
						limit: 1,
					});
					if (response && Array.isArray(response) && response.length > 0) {
						// Notify clients about timeline updates
						for (const client of clients) {
							client.postMessage({
								type: "timeline-update",
								hasNew: true,
							});
						}
						if (_DEV_)
							console.log(
								"[SW] Found timeline updates for account:",
								account.id,
							);
					}
				}
			} catch (error) {
				console.error(
					`[SW] Failed to check ${type} for account:`,
					account.id,
					error,
				);
			}
		}
	} catch (error) {
		console.error(`[SW] Error checking for ${type} updates:`, error);
	}
}

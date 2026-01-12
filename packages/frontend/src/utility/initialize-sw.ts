/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { lang } from '@@/js/config.js';

export async function initializeSw() {
	if (!('serviceWorker' in navigator)) return;

	try {
		// Register the service worker
		const registration = await navigator.serviceWorker.register('/sw.js', { 
			scope: '/', 
			type: 'classic',
			updateViaCache: 'none', // Ensure we get the latest service worker
		});

		console.info('[SW] Service Worker registered:', registration);

		// Wait for the service worker to be ready
		await navigator.serviceWorker.ready;

		// Send initialization message
		if (registration.active) {
			registration.active.postMessage({
				msg: 'initialize',
				lang,
			});
			console.info('[SW] Initialization message sent');
		}

		// Listen for service worker updates
		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			if (newWorker) {
				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'activated') {
						console.info('[SW] Service Worker updated and activated');
					}
				});
			}
		});

		// Handle controller change (when a new SW takes over)
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			console.info('[SW] Service Worker controller changed');
		});
	} catch (error) {
		console.error('[SW] Service Worker registration failed:', error);
	}
}

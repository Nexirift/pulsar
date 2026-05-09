<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<Transition
		:enterActiveClass="$style.transition_enterActive"
		:leaveActiveClass="$style.transition_leaveActive"
		:enterFromClass="$style.transition_enterFrom"
		:leaveToClass="$style.transition_leaveTo"
	>
		<div v-if="!isOnline" :class="$style.offlineBanner">
			<div :class="$style.content">
				<i class="ti ti-wifi-off" :class="$style.icon"></i>
				<span :class="$style.text">{{ i18n.ts._offlineScreen.header }}</span>
				<button :class="$style.retryButton" @click="retry">
					<i class="ti ti-refresh"></i>
					{{ i18n.ts.retry }}
				</button>
			</div>
		</div>
	</Transition>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, getCurrentInstance } from "vue";
import { i18n } from "@/i18n.js";

const isOnline = ref(navigator.onLine);
let checkInterval: number | undefined;

function updateOnlineStatus() {
	isOnline.value = navigator.onLine;
}

function retry() {
	// Force a connectivity check by making a lightweight request
	fetch("/", { method: "HEAD", cache: "no-cache" })
		.then(() => {
			isOnline.value = true;
			window.location.reload();
		})
		.catch(() => {
			isOnline.value = false;
		});
}

// Start periodic connectivity check when offline
function startConnectivityCheck() {
	if (checkInterval) return;
	checkInterval = window.setInterval(() => {
		if (!navigator.onLine) {
			isOnline.value = false;
		} else {
			// Double-check with an actual request
			fetch("/", { method: "HEAD", cache: "no-cache" })
				.then(() => {
					isOnline.value = true;
					stopConnectivityCheck();
				})
				.catch(() => {
					isOnline.value = false;
				});
		}
	}, 5000); // Check every 5 seconds
}

function stopConnectivityCheck() {
	if (checkInterval) {
		clearInterval(checkInterval);
		checkInterval = undefined;
	}
}

function handleOffline() {
	updateOnlineStatus();
	startConnectivityCheck();
}

// Only register lifecycle hooks if we're in a valid component instance
const instance = getCurrentInstance();
if (instance) {
	onMounted(() => {
		window.addEventListener("online", updateOnlineStatus);
		window.addEventListener("offline", handleOffline);

		// Initial check
		if (!navigator.onLine) {
			isOnline.value = false;
			startConnectivityCheck();
		}
	});

	onBeforeUnmount(() => {
		window.removeEventListener("online", updateOnlineStatus);
		window.removeEventListener("offline", handleOffline);
		stopConnectivityCheck();
	});
}
</script>

<style lang="scss" module>
.offlineBanner {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 10000;
	background: linear-gradient(90deg, #ff6b6b, #ee5a6f);
	color: white;
	padding: 12px 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10px);
}

.content {
	max-width: 1200px;
	margin: 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	font-weight: 600;
}

.icon {
	font-size: 20px;
	flex-shrink: 0;
}

.text {
	flex: 1;
	text-align: center;
}

.retryButton {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	background: rgba(255, 255, 255, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.3);
	border-radius: 6px;
	color: white;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	&:active {
		transform: scale(0.95);
	}
}

.transition_enterActive,
.transition_leaveActive {
	transition: all 0.3s ease;
}

.transition_enterFrom,
.transition_leaveTo {
	transform: translateY(-100%);
	opacity: 0;
}

@media (max-width: 500px) {
	.text {
		display: none;
	}

	.content {
		justify-content: space-between;
	}
}
</style>

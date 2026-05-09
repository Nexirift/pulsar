<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<SearchMarker
		path="/settings/my-apps"
		:label="i18n.ts.myApps"
		:keywords="['oauth', 'apps', 'developer', 'api', 'client']"
		icon="ti ti-api"
	>
		<div class="_gaps_m">
			<MkInfo v-if="apps.length === 0">{{ i18n.ts.noOAuthAppsCreated }}</MkInfo>
			<div v-else class="_gaps">
				<MkFolder v-for="app in apps" :key="app.id" :defaultOpen="false">
					<template #icon><i class="ti ti-api"></i></template>
					<template #label>{{ app.name }}</template>
					<template #footer>
						<MkButton primary @click="editApp(app)"
							><i class="ti ti-pencil"></i> {{ i18n.ts.edit }}</MkButton
						>
					</template>

					<div class="_gaps_s">
						<MkKeyValue oneline>
							<template #key>{{ i18n.ts.clientId }}</template>
							<template #value>
								<span class="wrap-text">{{ app.clientId }}</span>
							</template>
						</MkKeyValue>
						<MkKeyValue oneline>
							<template #key>{{ i18n.ts.callbackUrl }}</template>
							<template #value>{{ app.callbackUrl || i18n.ts.none }}</template>
						</MkKeyValue>
						<MkFolder>
							<template #label>{{ i18n.ts.permission }}</template>
							<template #suffix>{{ app.permission.length }}</template>
							<ul>
								<li v-for="p of app.permission" :key="p">
									{{ i18n.ts._permissions[p] || p }}
								</li>
							</ul>
						</MkFolder>
						<div class="_dangerZone">
							<MkButton danger @click="rotateSecret(app)"
								><i class="ti ti-refresh"></i>
								{{ i18n.ts.rotateClientSecret }}</MkButton
							>
							<MkButton danger @click="deleteApp(app)"
								><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton
							>
						</div>
					</div>
				</MkFolder>
			</div>
			<MkButton primary rounded @click="createApp"
				><i class="ti ti-plus"></i> {{ i18n.ts.createNewApp }}</MkButton
			>
		</div>
	</SearchMarker>
</template>

<script lang="ts" setup>
import { ref, onMounted, defineAsyncComponent } from "vue";
import * as Misskey from "misskey-js";
import * as os from "@/os.js";
import { misskeyApi } from "@/utility/misskey-api.js";
import { i18n } from "@/i18n.js";
import MkButton from "@/components/MkButton.vue";
import MkFolder from "@/components/MkFolder.vue";
import MkKeyValue from "@/components/MkKeyValue.vue";
import MkCode from "@/components/MkCode.vue";
import MkInfo from "@/components/MkInfo.vue";

const apps = ref<Misskey.entities.MyAppsResponse>([]);
const revealedSecrets = ref<Record<string, boolean>>({});

async function fetchApps() {
	apps.value = await misskeyApi("my/apps", { limit: 100, offset: 0 });
}

function revealSecret(appId: string) {
	revealedSecrets.value[appId] = true;
}

async function createApp() {
	const { canceled, result } = await os.form(i18n.ts.createApp, {
		name: {
			type: "string",
			label: i18n.ts.name,
		},
		description: {
			type: "string",
			label: i18n.ts.description,
			multiline: true,
		},
		callbackUrl: {
			type: "string",
			label: i18n.ts.callbackUrl,
			nullable: true,
		},
	});

	if (canceled) return;

	// Use a popup to select permissions
	os.popup(
		defineAsyncComponent(
			() => import("@/components/MkPermissionSelectDialog.vue"),
		),
		{
			defaultPermissions: [],
		},
		{
			done: async (permissions: string[]) => {
				try {
					await os.promiseDialog(async () => {
						const app = await misskeyApi("app/create", {
							...result,
							permission: permissions,
						});
						apps.value.unshift(app);

						// Show the created app with its secret
						await os.alert({
							type: "success",
							title: i18n.ts.appCreated,
							text: i18n.tsx.appCreatedMessage({
								name: app.name,
								id: app.clientId,
								secret: app.secret ?? "",
							}),
						});
					});
				} catch (err) {
					console.error("Failed to create app:", err);
					os.alert({
						type: "error",
						text: (err as Error)?.message || "Failed to create app",
					});
				}
			},
		},
	);
}

async function editApp(app: Misskey.entities.MyAppsResponse[number]) {
	const { canceled, result } = await os.form(i18n.ts.editApp, {
		name: {
			type: "string",
			label: i18n.ts.name,
			default: app.name,
		},
		callbackUrl: {
			type: "string",
			label: i18n.ts.callbackUrl,
			nullable: true,
			default: app.callbackUrl,
		},
	});

	if (canceled) return;

	// Use a popup to select permissions
	os.popup(
		defineAsyncComponent(
			() => import("@/components/MkPermissionSelectDialog.vue"),
		),
		{
			defaultPermissions: app.permission,
		},
		{
			done: async (permissions: string[]) => {
				try {
					await os.promiseDialog(async () => {
						const updatedApp = await misskeyApi("my/apps/update", {
							appId: app.id,
							...result,
							permission: permissions,
						});

						const index = apps.value.findIndex((a) => a.id === app.id);
						if (index !== -1) {
							apps.value[index] = updatedApp;
						}
					});
				} catch (err) {
					console.error("Failed to update app:", err);
					os.alert({
						type: "error",
						text: (err as Error)?.message || "Failed to update app",
					});
				}
			},
		},
	);
}

async function rotateSecret(app: Misskey.entities.MyAppsResponse[number]) {
	const { canceled } = await os.confirm({
		type: "warning",
		title: i18n.ts.rotateClientSecret,
		text: i18n.ts.rotateClientSecretConfirm,
	});

	if (canceled) return;

	await os.promiseDialog(async () => {
		const updatedApp = await misskeyApi("my/apps/rotate-secret", {
			appId: app.id,
		});

		const index = apps.value.findIndex((a) => a.id === app.id);
		if (index !== -1) {
			apps.value[index] = updatedApp;
			revealedSecrets.value[app.id] = true; // Auto-reveal the new secret
		}

		await os.alert({
			type: "success",
			title: i18n.ts.rotateClientSecret,
			text: i18n.tsx.rotateClientSecretSuccess({
				secret: updatedApp.secret ?? "",
			}),
		});
	});
}

async function deleteApp(app: Misskey.entities.MyAppsResponse[number]) {
	const { canceled } = await os.confirm({
		type: "warning",
		title: i18n.ts.deleteApp,
		text: i18n.tsx.deleteAppConfirm({ name: app.name }),
	});

	if (canceled) return;

	await os.promiseDialog(async () => {
		await misskeyApi("my/apps/delete", { appId: app.id });
		apps.value = apps.value.filter((a) => a.id !== app.id);
	});
}

onMounted(() => {
	fetchApps();
});
</script>

<style lang="scss" scoped>
._dangerZone {
	padding: 16px;
	margin-top: 16px;
	border: 1px solid var(--divider);
	border-radius: 8px;
	background: var(--panel);
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.wrap-text {
	white-space: normal; /* Allow wrapping */
	word-break: break-word; /* Break long words */
	overflow-wrap: break-word; /* Ensure proper wrapping */
	display: inline-block; /* Ensure proper rendering */
}
</style>

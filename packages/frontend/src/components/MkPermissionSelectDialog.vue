<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="550"
	:canClose="true"
	:withOkButton="true"
	:okButtonDisabled="false"
	@close="cancel()"
	@ok="ok()"
	@closed="emit('closed')"
>
	<template #header>
		{{ i18n.ts.permission }}
	</template>

	<div class="_gaps_m" style="padding: 20px;">
		<MkInfo>{{ i18n.ts.selectPermissions }}</MkInfo>

		<div class="_gaps_s">
			<div v-for="category in permissionCategories" :key="category.name">
				<div style="font-weight: 700; margin-bottom: 8px;">{{ category.name }}</div>
				<div class="_gaps_s">
					<label v-for="perm in category.permissions" :key="perm" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
						<input 
							type="checkbox" 
							:value="perm" 
							v-model="selectedPermissions"
							style="cursor: pointer;"
						/>
						<span>{{ i18n.ts._permissions[perm] || perm }}</span>
					</label>
				</div>
			</div>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import MkModalWindow from './MkModalWindow.vue';
import MkInfo from './MkInfo.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	defaultPermissions?: string[];
}>();

const emit = defineEmits<{
	(ev: 'done', v: string[]): void;
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');
const selectedPermissions = ref<string[]>(props.defaultPermissions || []);

const permissionCategories = [
	{
		name: 'Account',
		permissions: ['read:account', 'write:account'],
	},
	{
		name: 'Blocks',
		permissions: ['read:blocks', 'write:blocks'],
	},
	{
		name: 'Drive',
		permissions: ['read:drive', 'write:drive'],
	},
	{
		name: 'Favorites',
		permissions: ['read:favorites', 'write:favorites'],
	},
	{
		name: 'Following',
		permissions: ['read:following', 'write:following'],
	},
	{
		name: 'Messaging',
		permissions: ['read:messaging', 'write:messaging'],
	},
	{
		name: 'Mutes',
		permissions: ['read:mutes', 'write:mutes'],
	},
	{
		name: 'Notes',
		permissions: ['read:notes', 'write:notes'],
	},
	{
		name: 'Notifications',
		permissions: ['read:notifications', 'write:notifications'],
	},
	{
		name: 'Reactions',
		permissions: ['read:reactions', 'write:reactions'],
	},
	{
		name: 'Voting',
		permissions: ['read:votes', 'write:votes'],
	},
	{
		name: 'Pages',
		permissions: ['read:pages', 'write:pages'],
	},
	{
		name: 'Page Likes',
		permissions: ['read:page-likes', 'write:page-likes'],
	},
	{
		name: 'User Groups',
		permissions: ['read:user-groups', 'write:user-groups'],
	},
	{
		name: 'Channels',
		permissions: ['read:channels', 'write:channels'],
	},
	{
		name: 'Gallery',
		permissions: ['read:gallery', 'write:gallery'],
	},
	{
		name: 'Gallery Likes',
		permissions: ['read:gallery-likes', 'write:gallery-likes'],
	},
	{
		name: 'Flash',
		permissions: ['read:flash', 'write:flash'],
	},
	{
		name: 'Flash Likes',
		permissions: ['read:flash-likes', 'write:flash-likes'],
	},
	{
		name: 'Admin',
		permissions: [
			'read:admin:abuse-user-reports',
			'write:admin:abuse-user-reports',
			'read:admin:accounts',
			'write:admin:accounts',
			'read:admin:ad',
			'write:admin:ad',
			'read:admin:announcements',
			'write:admin:announcements',
			'read:admin:avatar-decorations',
			'write:admin:avatar-decorations',
			'read:admin:drive',
			'write:admin:drive',
			'read:admin:emoji',
			'write:admin:emoji',
			'read:admin:federation',
			'write:admin:federation',
			'read:admin:index-stats',
			'read:admin:invite-codes',
			'write:admin:invite-codes',
			'read:admin:meta',
			'write:admin:meta',
			'read:admin:queue',
			'write:admin:queue',
			'read:admin:relays',
			'write:admin:relays',
			'read:admin:roles',
			'write:admin:roles',
			'read:admin:server-info',
			'read:admin:show-moderation-log',
			'read:admin:show-user',
			'write:admin:suspend-user',
			'write:admin:unset-user-avatar',
			'write:admin:unset-user-banner',
			'write:admin:unsuspend-user',
			'write:admin:delete-account',
			'write:admin:delete-all-files-of-a-user',
			'read:admin:table-stats',
			'read:admin:user-ips',
		],
	},
];

function ok() {
	emit('done', selectedPermissions.value);
	dialog.value?.close();
}

function cancel() {
	dialog.value?.close();
}
</script>

<style lang="scss" scoped>
label {
	user-select: none;
}
</style>

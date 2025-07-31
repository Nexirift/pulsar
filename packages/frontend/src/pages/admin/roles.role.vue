<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<div class="_gaps">
			<div class="_buttons">
				<MkButton primary rounded @click="edit"><i class="ti ti-pencil"></i> {{ i18n.ts.edit }}</MkButton>
				<MkButton secondary rounded @click="clone"><i class="ti ti-copy"></i> {{ i18n.ts.clone }}</MkButton>
				<MkButton danger rounded @click="del"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
			</div>
			<MkFolder>
				<template #icon><i class="ti ti-info-circle"></i></template>
				<template #label>{{ i18n.ts.info }}</template>
				<XEditor :modelValue="role" readonly/>
			</MkFolder>
			<MkFolder v-if="role.target === 'manual'" defaultOpen>
				<template #icon><i class="ti ti-users"></i></template>
				<template #label>{{ i18n.ts.users }}</template>
				<template #suffix>{{ role.usersCount }}</template>
				<div class="_gaps">
					<MkButton primary rounded @click="assign"><i class="ti ti-plus"></i> {{ i18n.ts.assign }}</MkButton>

					<MkPagination :pagination="usersPagination" :displayLimit="50">
						<template #empty><MkResult type="empty" :text="i18n.ts.noUsers"/></template>

						<template #default="{ items }">
							<div class="_gaps_s">
								<div v-for="item in items" :key="item.user.id" :class="[$style.userItem, { [$style.userItemOpend]: expandedItems.includes(item.id) }]">
									<div :class="$style.userItemMain">
										<MkA :class="$style.userItemMainBody" :to="`/admin/user/${item.user.id}`">
											<MkUserCardMini :user="item.user"/>
										</MkA>
										<button class="_button" :class="$style.userToggle" @click="toggleItem(item)"><i :class="$style.chevron" class="ti ti-chevron-down"></i></button>
										<button class="_button" :class="$style.unassign" @click="unassign(item.user, $event)"><i class="ti ti-x"></i></button>
									</div>
									<div v-if="expandedItems.includes(item.id)" :class="$style.userItemSub">
										<div>Assigned: <MkTime :time="item.createdAt" mode="detail"/></div>
										<div v-if="item.expiresAt">Period: {{ new Date(item.expiresAt).toLocaleString() }}</div>
										<div v-else>Period: {{ i18n.ts.indefinitely }}</div>
									</div>
								</div>
							</div>
						</template>
					</MkPagination>
				</div>
			</MkFolder>
			<MkFolder v-else>
				<template #icon><i class="ti ti-flask"></i></template>
				<template #label>{{ i18n.ts._role.roleTester }}</template>
				<div class="_gaps">
					<div v-if="testUser == null">
						<MkButton
							transparent
							:class="$style.userSelectButton"
							@click="selectUser"
						>
							<div :class="$style.userSelectButtonInner">
								<span><i class="ti ti-plus"></i></span>
								<span>{{ i18n.ts.selectUser }}</span>
							</div>
						</MkButton>
					</div>
					<div v-else :class="$style.userSelectedButtons">
						<div style="overflow: hidden;">
							<MkUserCardMini
								:user="testUser"
								:withChart="false"
								:class="$style.userSelectedCard"
							/>
						</div>
						<div>
							<button
								class="_button"
								:class="$style.userSelectedRemoveButton"
								@click="removeUser"
							>
								<i class="ti ti-x"></i>
							</button>
						</div>
					</div>
					<div v-if="testUser != null">
						<RolesTester v-model="role.condFormula"	:user="testUser"/>
					</div>
				</div>
			</MkFolder>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, shallowRef } from 'vue';
import XEditor from './roles.editor.vue';
import RolesTester from './RolesTester.vue';
import type * as Misskey from 'misskey-js';
import MkFolder from '@/components/MkFolder.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkButton from '@/components/MkButton.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import MkPagination from '@/components/MkPagination.vue';
import { useRouter } from '@/router.js';
import { instance } from '@/instance.js';

const router = useRouter();

const props = defineProps<{
	id?: string;
}>();

const usersPagination = {
	endpoint: 'admin/roles/users' as const,
	limit: 20,
	params: computed(() => ({
		roleId: props.id,
	})),
};

const expandedItems = ref([]);

const role = reactive(await misskeyApi('admin/roles/show', {
	roleId: props.id,
}));

const testUser = shallowRef<Misskey.entities.UserDetailed | null>(null);

function edit() {
	router.push('/admin/roles/' + role.id + '/edit');
}

async function clone() {
	const newRole = await misskeyApi('admin/roles/clone', {
		roleId: role.id,
	});
	router.push('/admin/roles/' + newRole.id + '/edit');
}

async function del() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.deleteAreYouSure({ x: role.name }),
	});
	if (canceled) return;

	await os.apiWithDialog('admin/roles/delete', {
		roleId: role.id,
	});

	router.push('/admin/roles');
}

async function assign() {
	const user = await os.selectUser({ includeSelf: true });

	const { canceled: canceled2, result: period } = await os.select({
		title: i18n.ts.period + ': ' + role.name,
		items: [{
			value: 'indefinitely', text: i18n.ts.indefinitely,
		}, {
			value: 'oneHour', text: i18n.ts.oneHour,
		}, {
			value: 'oneDay', text: i18n.ts.oneDay,
		}, {
			value: 'oneWeek', text: i18n.ts.oneWeek,
		}, {
			value: 'oneMonth', text: i18n.ts.oneMonth,
		}],
		default: 'indefinitely',
	});
	if (canceled2) return;

	const expiresAt = period === 'indefinitely' ? null
		: period === 'oneHour' ? Date.now() + (1000 * 60 * 60)
		: period === 'oneDay' ? Date.now() + (1000 * 60 * 60 * 24)
		: period === 'oneWeek' ? Date.now() + (1000 * 60 * 60 * 24 * 7)
		: period === 'oneMonth' ? Date.now() + (1000 * 60 * 60 * 24 * 30)
		: null;

	await os.apiWithDialog('admin/roles/assign', { roleId: role.id, userId: user.id, expiresAt });
	//role.users.push(user);
}

async function unassign(user, ev) {
	os.popupMenu([{
		text: i18n.ts.unassign,
		icon: 'ti ti-x',
		danger: true,
		action: async () => {
			await os.apiWithDialog('admin/roles/unassign', { roleId: role.id, userId: user.id });
			//role.users = role.users.filter(u => u.id !== user.id);
		},
	}], ev.currentTarget ?? ev.target);
}

async function toggleItem(item) {
	if (expandedItems.value.includes(item.id)) {
		expandedItems.value = expandedItems.value.filter(x => x !== item.id);
	} else {
		expandedItems.value.push(item.id);
	}
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: `${i18n.ts.role}: ${role.name}`,
	icon: 'ti ti-badge',
}));

function selectUser() {
	os.selectUser({
		includeSelf: true,
		localOnly: instance.noteSearchableScope === 'local',
	}).then(_user => {
		testUser.value = _user;
	});
}

function removeUser() {
	testUser.value = null;
}
</script>

<style lang="scss" module>
.userItemMain {
	display: flex;
}

.userItemSub {
	padding: 6px 12px;
	font-size: 85%;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.75);
}

.userItemMainBody {
	flex: 1;
	min-width: 0;
	margin-right: 8px;

	&:hover {
		text-decoration: none;
	}
}

.userToggle,
.unassign {
	width: 32px;
	height: 32px;
	align-self: center;
}

.chevron {
	display: block;
	transition: transform 0.1s ease-out;
}

.userItem.userItemOpend {
	.chevron {
		transform: rotateX(180deg);
	}
}

.userSelectButton {
	width: 100%;
	height: 100%;
	padding: 12px;
	border: 2px dashed color(from var(--MI_THEME-fg) srgb r g b / 0.5);
}

.userSelectButtonInner {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;
	min-height: 38px;
}

.userSelectedButtons {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
}

.userSelectedRemoveButton {
	width: 32px;
	height: 32px;
	color: #ff2a2a;
}
</style>

<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
    <MkInfo>{{ i18n.ts._settings.oauthAppsInfo }}</MkInfo>

    <!-- Action bar -->
    <div :class="$style.actions" class="_gaps_s">
        <MkInput v-model="searchQuery" placeholder="Search apps or client id" clearable>
            <template #label>Search</template>
        </MkInput>
        <div>
            <MkButton @click="createApp" primary>
                <i class="ti ti-plus" /> {{ i18n.ts._settings.createOAuthApp }}
            </MkButton>
        </div>
    </div>

    <div v-if="filteredApps.length === 0" class="_gaps_m">
        <MkResult type="empty"/>
    </div>

    <div v-else class="_gaps_m" :class="$style.appsGrid">
        <MkFolder v-for="app in filteredApps" :key="app.id" :defaultOpen="true" :class="$style.appCard">
            <template #icon>
                <img v-if="app.iconUrl" :class="$style.appIcon" :src="app.iconUrl" alt=""/>
                <i v-else class="ti ti-plug"/>
            </template>

            <template #label>
                <div class="_gaps_xs" style="display:flex; align-items:center; justify-content:space-between;">
                    <span>{{ app.name }}</span>
                </div>
            </template>

            <template #caption>{{ app.description }}</template>

            <div class="_gaps_s" style="padding-top: 6px;">
                <div v-if="app.description">{{ app.description }}</div>

                <div class="_gaps_s">
                    <MkKeyValue oneline>
                        <template #key>{{ i18n.ts.id }}</template>
                        <template #value>
                            <code :class="$style.code">{{ app.id }}</code>
                        </template>
                    </MkKeyValue>

                    <MkKeyValue oneline>
                        <template #key>Client ID</template>
                        <template #value>
                            <code :class="$style.code">{{ app.clientId }}</code>
                            <span v-if="decodedClientIds[app.id]" :class="$style.decoded">({{ decodedClientIds[app.id] }})</span>
                            <MkButton small inline @click="copySecret(app.id, app.clientId ?? '')">
                                <i class="ti ti-copy"/>
                            </MkButton>
                        </template>
                    </MkKeyValue>

                    <MkKeyValue oneline>
                        <template #key>Client Secret</template>
                        <template #value>
                            <span style="display: flex; align-items: center; gap: 0.5em; min-width: 0;">
                                <code v-if="!shownSecrets[app.id]" :class="$style.code" style="flex:1 1 0; min-width:0;">••••••••</code>
                                <code v-else :class="$style.code" style="user-select: all; flex:1 1 0; min-width:0;">{{ app.secret }}</code>
                                <div style="display: flex; align-items: center; gap: 0.25em;">
                                    <MkButton small @click="toggleSecret(app.id)">
                                        <i :class="shownSecrets[app.id] ? 'ti ti-eye-off' : 'ti ti-eye'"/>
                                    </MkButton>
                                    <MkButton small @click="copySecret(app.id, app.secret ?? '')">
                                        <i class="ti ti-copy"/>
                                    </MkButton>
                                </div>
                            </span>
                        </template>
                    </MkKeyValue>
                </div>
            
                <MkKeyValue oneline>
                    <template #key>Scopes</template>
                    <template #value>
                        <div v-if="!editingScopes[app.id]" style="display: flex; align-items: center; gap: 0.5em; flex-wrap: wrap;">
                            <span v-if="Array.isArray(app.permission) && app.permission.length > 0" style="flex: 1 1 auto;">
                                {{ app.permission.join(', ') }}
                            </span>
                            <span v-else style="color: #888; flex: 1 1 auto;">None</span>
                            <MkButton small @click="startEditScopes(app.id, app.permission)" style="flex-shrink: 0;">
                                <i class="ti ti-pencil"></i> Edit
                            </MkButton>
                        </div>
                        <div v-else>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5em;">
                                <label v-for="scope in allScopes" :key="scope" style="display: flex; align-items: center; gap: 0.25em;">
                                    <input type="checkbox"
                                        :value="scope"
                                        :checked="(tempScopes[app.id] ?? []).includes(scope)"
                                        @change="e => {
                                            const target = e.target as HTMLInputElement | null;
                                            if (!target) return;
                                            let arr = Array.isArray(tempScopes[app.id]) ? [...tempScopes[app.id]] : [];
                                            if (target.checked) {
                                                if (!arr.includes(scope)) arr.push(scope);
                                            } else {
                                                arr = arr.filter(s => s !== scope);
                                            }
                                            tempScopes[app.id] = arr;
                                            console.log(JSON.stringify(tempScopes[app.id]));
                                        }"
                                    />
                                    {{ scope }}
                                </label>
                            </div>
                            <div class="_gaps_xs" style="display:flex; flex-direction: row; gap:8px; margin-top:6px;">
                                <MkButton small primary @click="saveScopes(app.id)">
                                    <i class="ti ti-check"></i> Save
                                </MkButton>
                                <MkButton small @click="cancelEditScopes(app.id)">
                                    <i class="ti ti-x"></i> Cancel
                                </MkButton>
                            </div>
                        </div>
                    </template>
                </MkKeyValue>

                <MkFoldableSection>
                    <template #header>{{ i18n.ts._settings.redirectUri }}</template>
                    <div class="_gaps_s">
                        <div v-if="editingRedirectUris[app.id]" class="_gaps_s" style="display:flex; flex-direction: row; gap:8px; margin-top:6px;">
                            <MkInput v-model="tempRedirectUris[app.id]" type="url" placeholder="https://example.com/callback" />
                            <div class="_gaps_xs" style="display:flex; flex-direction: row; gap:8px;">
                                <MkButton @click="saveRedirectUri(app.id)" primary>
                                    <i class="ti ti-check"></i> {{ i18n.ts.save }}
                                </MkButton>
                                <MkButton @click="cancelEditRedirectUri(app.id)">
                                    <i class="ti ti-x"></i> {{ i18n.ts.cancel }}
                                </MkButton>
                            </div>
                        </div>
                        <div v-else-if="app.callbackUrl" class="_gaps_xs">
                            <code :class="$style.code" style="user-select: all; display: block;">{{ app.callbackUrl }}</code>
                            <div class="_gaps_xs" style="display:flex; flex-direction: row; gap:8px; margin-top:6px;">
                                <MkButton small @click="copyRedirectUri(app.callbackUrl)">
                                    <i class="ti ti-copy"></i> {{ i18n.ts.copy }}
                                </MkButton>
                                <MkButton small @click="startEditRedirectUri(app.id, app.callbackUrl)">
                                    <i class="ti ti-pencil"></i> {{ i18n.ts.edit }}
                                </MkButton>
                            </div>
                        </div>
                        <div v-else class="_gaps_xs">
                            <p>{{ i18n.ts._settings.redirectUri }} ({{ i18n.ts.none }})</p>
                            <MkButton small @click="startEditRedirectUri(app.id, '')">
                                <i class="ti ti-plus"></i> {{ i18n.ts.add }}
                            </MkButton>
                        </div>
                    </div>
                </MkFoldableSection>

                <div class="_gaps_s" style="display:flex; flex-direction: row; gap:8px; margin-top:6px;">
                    <MkButton @click="rotateSecret(app.id)">
                        <i class="ti ti-refresh"></i> {{ i18n.ts._settings.rotateSecret }}
                    </MkButton>
                    <MkButton danger @click="deleteApp(app.id)">
                        <i class="ti ti-trash"></i> {{ i18n.ts.delete }}
                    </MkButton>
                </div>
            </div>
        </MkFolder>
    </div>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkKeyValue from '@/components/MkKeyValue.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
const allScopes = [
    "read:account", "write:account", "read:blocks", "write:blocks", "read:drive", "write:drive",
    "read:favorites", "write:favorites", "read:following", "write:following", "read:messaging", "write:messaging",
    "read:mutes", "write:mutes", "write:notes", "read:notifications", "write:notifications", "read:reactions",
    "write:reactions", "write:votes", "read:pages", "write:pages", "write:page-likes", "read:page-likes",
    "read:user-groups", "write:user-groups", "read:channels", "write:channels", "read:gallery", "write:gallery",
    "read:gallery-likes", "write:gallery-likes"
];
const editingScopes = ref<Record<string, boolean>>({});
const tempScopes = ref<Record<string, string[]>>({});

function startEditScopes(appId: string, currentScopes: string[] = []) {
    tempScopes.value[appId] = Array.isArray(currentScopes) ? [...currentScopes] : [];
    editingScopes.value[appId] = true;
}

async function saveScopes(appId: string) {
    const idx = apps.value.findIndex(a => a.id === appId);
    if (idx === -1) return;
    const newScopes = Array.isArray(tempScopes.value[appId]) ? [...tempScopes.value[appId]] : [];
    try {
        const updated = await misskeyApi('app/update', { appId, permission: newScopes });
        // Replace the whole app object to ensure reactivity
        apps.value[idx] = updated as OAuthApp;
        editingScopes.value[appId] = false;
        os.alert({
            type: 'success',
            text: i18n.ts.saved,
        });
    } catch (error) {
        os.alert({
            type: 'error',
            title: i18n.ts.error,
            text: i18n.ts._settings.failedToDeleteOAuthApp,
        });
    }
}

function cancelEditScopes(appId: string) {
    editingScopes.value[appId] = false;
    delete tempScopes.value[appId];
}

const decodedClientIds = computed(() => {
    const map: Record<string, string> = {};
    for (const app of apps.value) {
        try {
            map[app.id] = app.clientId ? window.atob(app.clientId) : '';
        } catch {
            map[app.id] = '';
        }
    }
    return map;
});
defineExpose({ decodedClientIds });

interface OAuthApp {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    callbackUrl?: string | null;
    clientId?: string;
    appUrl?: string;
    secret?: string;
    permission?: string[];
}

const apps = ref<OAuthApp[]>([]);
const shownSecrets = ref<Record<string, boolean>>({});
const editingRedirectUris = ref<Record<string, boolean>>({});
const tempRedirectUris = ref<Record<string, string>>({});
const loading = ref(false);

const searchQuery = ref('');

const filteredApps = computed(() => {
    const q = (searchQuery.value || '').trim().toLowerCase();
    if (!q) return apps.value;
    return apps.value.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.clientId || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
    );
});

async function loadApps() {
    loading.value = true;
    try {
        const response = await misskeyApi('i/my-apps');
        apps.value = Array.isArray(response) ? response : [];
    } catch (error) {
        os.alert({
            type: 'error',
            title: i18n.ts.error,
            text: i18n.ts._settings.failedToLoadOAuthApps,
        });
        console.error('Failed to load OAuth apps:', error);
    } finally {
        loading.value = false;
    }
}
async function createApp() {
    const { canceled, result } = await os.inputText({
        title: i18n.ts._settings.createOAuthApp,
        text: i18n.ts._settings.oauthAppName,
        minLength: 1,
    });

    if (canceled || !result) return;

    try {
        const app = await misskeyApi('app/create', {
            name: result,
            description: '',
            permission: [],
            callbackUrl: null,
        });

        apps.value.unshift(app as unknown as OAuthApp);

        os.alert({
            type: 'success',
            text: i18n.ts._settings.oauthAppCreated,
        });
    } catch (error: any) {
        const message = error?.info?.message || i18n.ts._settings.failedToCreateOAuthApp;
        os.alert({
            type: 'error',
            title: i18n.ts.error,
            text: message,
        });
        console.error('Failed to create OAuth app:', error);
    }
}

async function deleteApp(appId: string) {
    const { canceled } = await os.confirm({
        type: 'warning',
        text: i18n.ts._settings.confirmDeleteOAuthApp,
    });

    if (canceled) return;

    try {
        await misskeyApi('app/delete', { appId });
        apps.value = apps.value.filter(app => app.id !== appId);

        os.alert({
            type: 'success',
            text: i18n.ts._settings.oauthAppDeleted,
        });
    } catch (error) {
        os.alert({
            type: 'error',
            title: i18n.ts.error,
            text: i18n.ts._settings.failedToDeleteOAuthApp,
        });
        console.error('Failed to delete OAuth app:', error);
    }
}

async function rotateSecret(appId: string) {
    const { canceled } = await os.confirm({
        type: 'warning',
        text: i18n.ts._settings.confirmRotateSecret,
    });

    if (canceled) return;

    try {
        const updated = await misskeyApi('app/rotate-secret', { appId });
        
        const index = apps.value.findIndex(app => app.id === appId);
        if (index >= 0) {
            apps.value[index] = updated as OAuthApp;
            // Auto-show the new secret
            shownSecrets.value[appId] = true;
        }

        os.alert({
            type: 'success',
            text: i18n.ts._settings.secretRotated,
        });
    } catch (error) {
        os.alert({
            type: 'error',
            title: i18n.ts.error,
            text: i18n.ts._settings.failedToRotateSecret,
        });
        console.error('Failed to rotate secret:', error);
    }
}

function toggleSecret(appId: string) {
    shownSecrets.value[appId] = !shownSecrets.value[appId];
}

function copySecret(appId: string, secret: string) {
    copyToClipboard(secret);
    os.alert({
        type: 'success',
        text: i18n.ts.copiedToClipboard,
    });
}

function startEditRedirectUri(appId: string, currentUri: string) {
    tempRedirectUris.value[appId] = currentUri || '';
    editingRedirectUris.value[appId] = true;
}

async function saveRedirectUri(appId: string) {
    const app = apps.value.find(a => a.id === appId);
    if (!app) return;
    const newUri = tempRedirectUris.value[appId] || null;

    try {
        const updated = await misskeyApi('app/update', { appId, callbackUrl: newUri });
        app.callbackUrl = (updated as any).callbackUrl;
        editingRedirectUris.value[appId] = false;
        os.alert({
            type: 'success',
            text: i18n.ts.saved,
        });
    } catch (error) {
        os.alert({
            type: 'error',
            title: i18n.ts.error,
            text: i18n.ts._settings.failedToDeleteOAuthApp,
        });
    }
}

function cancelEditRedirectUri(appId: string) {
    editingRedirectUris.value[appId] = false;
    delete tempRedirectUris.value[appId];
}

function copyRedirectUri(uri: string) {
    copyToClipboard(uri);
    os.alert({
        type: 'success',
        text: i18n.ts.copiedToClipboard,
    });
}

onMounted(() => {
    loadApps();
});

definePage(() => ({
    title: i18n.ts._settings.oauthApps,
    icon: 'ti ti-code-plus',
}));
</script>

<style lang="scss" module>
.actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.appsGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
}

.appCard {
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04);
    background: var(--panel-bg, #fff);
}

.appIcon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    margin-right: 8px;
}

.code {
    background-color: var(--bg);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    display: inline-block;
    /* Removed word-break: break-all to prevent truncation */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.decoded {
    font-size: 0.85em;
    color: #888;
    margin-left: 0.5em;
}
</style>

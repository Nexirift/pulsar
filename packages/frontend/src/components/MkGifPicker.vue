<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.drawer]: asDrawer }]">
	<div :class="$style.search">
		<input
			ref="searchEl"
			v-model="q"
			:class="$style.searchInput"
			:placeholder="i18n.ts.search"
			type="search"
			autocapitalize="off"
			@keydown.stop="onSearchKeydown"
		>
	</div>
	<div ref="gifsEl" :class="$style.gifs" :style="{ height: maxHeight ? `${maxHeight}px` : 'auto' }" @scroll="onScroll">
		<div v-if="q && searchResults.length > 0" :class="$style.grid">
			<button
				v-for="gif in searchResults"
				:key="gif.id"
				:class="$style.gifButton"
				@click="chosen(gif.url)"
			>
				<img :src="gif.preview" :alt="gif.title" :class="$style.gifImg"/>
			</button>
		</div>
		<div v-else-if="q && searchResults.length === 0" :class="$style.empty">
			<div :class="$style.emptyIcon"><i class="ti ti-search"></i></div>
			<div>{{ i18n.ts.notFound }}</div>
		</div>
		<div v-else :class="$style.grid">
			<button
				v-for="gif in trendingGifs"
				:key="gif.id"
				:class="$style.gifButton"
				@click="chosen(gif.url)"
			>
				<img :src="gif.preview" :alt="gif.title" :class="$style.gifImg"/>
			</button>
		</div>
	</div>
	<div :class="$style.footer">
		<span :class="$style.powered">Powered by Tenor</span>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, useTemplateRef } from 'vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type GifItem = {
	id: string;
	url: string;
	preview: string;
	title: string;
};

const props = withDefaults(defineProps<{
	asDrawer?: boolean;
	maxHeight?: number;
}>(), {
	asDrawer: false,
	maxHeight: undefined,
});

const emit = defineEmits<{
	(ev: 'chosen', v: string): void;
	(ev: 'esc'): void;
}>();

const searchEl = useTemplateRef('searchEl');
const gifsEl = useTemplateRef('gifsEl');
const q = ref('');
const searchResults = ref<GifItem[]>([]);
const trendingGifs = ref<GifItem[]>([]);
const searchTimeout = ref<number | null>(null);
const searchNextPos = ref<string | null>(null);
const trendingNextPos = ref<string | null>(null);
const loading = ref(false);

async function searchGifs(query: string, append = false) {
	if (!query) {
		searchResults.value = [];
		searchNextPos.value = null;
		return;
	}

	if (loading.value) return;
	loading.value = true;

	try {
		const data = await misskeyApi('tenor/search', {
			q: query,
			limit: 30,
			pos: append ? searchNextPos.value : null,
		});
		
		if (append) {
			searchResults.value = [...searchResults.value, ...(data.results || [])];
		} else {
			searchResults.value = data.results || [];
		}
		searchNextPos.value = data.next || null;
	} catch (error) {
		console.error('Failed to search GIFs:', error);
		if (!append) searchResults.value = [];
	} finally {
		loading.value = false;
	}
}

async function loadTrending(append = false) {
	if (loading.value) return;
	loading.value = true;

	try {
		const data = await misskeyApi('tenor/featured', {
			limit: 30,
			pos: append ? trendingNextPos.value : null,
		});
		
		if (append) {
			trendingGifs.value = [...trendingGifs.value, ...(data.results || [])];
		} else {
			trendingGifs.value = data.results || [];
		}
		trendingNextPos.value = data.next || null;
	} catch (error) {
		console.error('Failed to load trending GIFs:', error);
		if (!append) trendingGifs.value = [];
	} finally {
		loading.value = false;
	}
}

function onScroll() {
	if (!gifsEl.value || loading.value) return;
	
	const el = gifsEl.value;
	const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
	
	// Load more when 100px from bottom
	if (scrollBottom < 100) {
		if (q.value && searchNextPos.value) {
			searchGifs(q.value, true);
		} else if (!q.value && trendingNextPos.value) {
			loadTrending(true);
		}
	}
}

watch(q, (newQ) => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
	
	searchNextPos.value = null;
	searchTimeout.value = window.setTimeout(() => {
		searchGifs(newQ);
	}, 300);
});

function chosen(gifUrl: string) {
	emit('chosen', gifUrl);
}

function onSearchKeydown(ev: KeyboardEvent) {
	if (ev.key === 'Escape') {
		ev.preventDefault();
		ev.stopPropagation();
		emit('esc');
	}
}

function focus() {
	searchEl.value?.focus();
}

function reset() {
	q.value = '';
}

onMounted(() => {
	loadTrending();
	focus();
});

defineExpose({
	focus,
	reset,
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	contain: content;
	background: var(--MI_THEME-panel);

	&.drawer {
		border-radius: var(--MI-radius-lg) var(--MI-radius-lg) 0 0;
	}

	@media (max-width: 768px) {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10000;
		border-radius: 0;
	}
}

.search {
	padding: 12px;
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}

.searchInput {
	width: 100%;
	padding: 10px;
	font-size: 1em;
	border: solid 1px var(--MI_THEME-divider);
	border-radius: var(--MI-radius-sm);
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	outline: none;

	&:focus {
		border-color: var(--MI_THEME-accent);
	}
}

.gifs {
	overflow-y: auto;
	overflow-x: hidden;
	max-height: 400px;

	@media (max-width: 768px) {
		max-height: none;
		flex: 1;
	}
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 8px;
	padding: 12px;
	@media (max-width: 768px) {
		grid-template-columns: repeat(3, 1fr);
	}}

.gifButton {
	all: unset;
	cursor: pointer;
	position: relative;
	aspect-ratio: 1;
	border-radius: var(--MI-radius-sm);
	overflow: hidden;
	background: var(--MI_THEME-buttonBg);
	transition: opacity 0.2s;

	&:hover {
		opacity: 0.8;
	}

	&:active {
		opacity: 0.6;
	}
}

.gifImg {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 48px 12px;
	color: var(--MI_THEME-fg);
	opacity: 0.7;
}

.emptyIcon {
	font-size: 48px;
	margin-bottom: 12px;
}

.footer {
	padding: 8px 12px;
	border-top: solid 0.5px var(--MI_THEME-divider);
	text-align: right;
}

.powered {
	font-size: 0.85em;
	opacity: 0.7;
}
</style>

<!--
SPDX-FileCopyrightText: bunnybeam and other Sharkey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div v-if="type === 'and' || type === 'or'" class="_gaps">
		<RolesTester v-for="formula in v.values" :key="formula.id" :modelValue="formula" :user="user"/>
	</div>
	<div v-else-if="type === 'not'" :class="$style.item">
		<RolesTester v-model="v.value"/>
	</div>
	<div v-else>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import type * as Misskey from 'misskey-js';
import { deepClone } from '@/utility/clone.js';

const props = defineProps<{
	modelValue: any;
	user: Misskey.entities.UserDetailed;
}>();

const v = ref(deepClone(props.modelValue));

const type = v.value.type;

console.log(type);
</script>

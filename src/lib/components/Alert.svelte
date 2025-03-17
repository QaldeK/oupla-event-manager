<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { alert } from '$lib/shared/states.svelte';

	const typeClasses = $derived({
		error: 'bg-red-600',
		info: 'bg-blue-600',
		success: 'bg-green-600'
	});
</script>

{#if alert.visible}
	<div
		in:slide={{ duration: 300, axis: 'y' }}
		out:fade={{ duration: 900 }}
		class="fixed left-1/2 -translate-x-1/2 top-4 px-6 py-3 font-medium text-white rounded-md shadow-lg {typeClasses[
			alert.type
		]} z-top"
	>
		{alert.message}
	</div>
{/if}

<style>
	.z-top {
		z-index: 99999;
	}
</style>

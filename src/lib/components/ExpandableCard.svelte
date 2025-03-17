<script>
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	let { title, text } = $props();

	let isExpanded = $state(false);
	let textOverflows = $state(false);
	let textContainer; // Référence à l'élément div du texte

	$effect(() => {
		if (textContainer) {
			textOverflows = untrack(() => textContainer.scrollHeight > textContainer.clientHeight);
		}
	});
	function toggleExpand() {
		isExpanded = !isExpanded;
	}
</script>

<div
	class="overflow-hidden bg-gray-100 rounded-lg shadow-md"
	onclick={textOverflows ? toggleExpand : null}
	onkeydown={(event) => {
		if (event.key === 'Enter' && textOverflows) {
			toggleExpand();
		}
	}}
	role="button"
	tabindex="0"
>
	<div class="flex justify-between p-2 {textOverflows ? 'cursor-pointer' : 'cursor-default'} ">
		<div class="font-semibold text-gray-800">{title}</div>
		{#if textOverflows}
			<svg
				class="w-5 h-5 text-gray-500 transition-transform duration-200 {isExpanded
					? 'rotate-180'
					: ''}"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		{/if}
	</div>

	<div
		bind:this={textContainer}
		class="px-4 pb-4 text-left {isExpanded ? '' : 'max-h-24 overflow-hidden'} {textOverflows
			? 'cursor-pointer'
			: 'cursor-default'}"
	>
		<!-- <p>{text}</p> -->
		{#if isExpanded}
			<p class="text-gray-700 whitespace-pre-line" in:fade>
				{text}
			</p>
		{:else}
			<p class="text-gray-700" in:fade>
				{text}
			</p>
		{/if}
	</div>
</div>

<style>
</style>

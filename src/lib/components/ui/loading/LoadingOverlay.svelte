<script lang="ts">
	import { fade } from "svelte/transition";

	interface Props {
		isLoading: boolean;
	}

	let { isLoading }: Props = $props();
</script>

{#if isLoading}
	<div
		transition:fade={{ duration: 500 }}
		class="bg-base-100/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
	>
		<span class="loading loading-dots loading-lg">Chargement</span>
	</div>
{/if}

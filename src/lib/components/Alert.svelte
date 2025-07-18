<script lang="ts">
	import { alert } from "$lib/shared/states.svelte";

	import { fade, slide } from "svelte/transition";

	const alertClasses = $derived({
		error: "alert alert-error",
		info: "alert alert-info",
		success: "alert alert-success",
		warning: "alert alert-warning"
	});
</script>

{#if alert.visible}
	<div
		in:slide={{ duration: 300, axis: "y" }}
		out:fade={{ duration: 900 }}
		class="fixed top-4 left-1/2 z-[99999] w-auto max-w-[90%] -translate-x-1/2 shadow-lg {alertClasses[
			alert.type
		]}"
	>
		<div class="flex items-center gap-2">
			{#if alert.type === "error"}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{:else if alert.type === "success"}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{/if}
			<span>{alert.message}</span>
		</div>
	</div>
{/if}

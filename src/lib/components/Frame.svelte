<script>
	import { cn } from "$lib/utils";

	import { fade } from "svelte/transition";

	const { title = "", class_frame = "", class_title = "", children } = $props();
</script>

<fieldset
	transition:fade={{ duration: 200 }}
	class="bg-base-100 mx-auto mb-8 w-[calc(100%-2rem)] border-t-2 border-gray-300 py-8 transition-all duration-200 ease-in-out md:relative md:mb-12 md:rounded-xl md:border md:p-8 md:shadow-sm
		{class_frame ? class_frame : ''}"
>
	{#if title}
		<legend
			class={cn(
				"bg-base-100 text-fluid-base   mx-auto px-2 font-semibold md:absolute md:-top-3.5 md:left-2.5",
				class_title ? class_title : ""
			)}
		>
			{title}
		</legend>
	{/if}
	{@render children()}
</fieldset>

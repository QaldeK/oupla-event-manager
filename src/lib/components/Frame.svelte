<script>
	import { cn } from '$lib/utils';

	import { fade } from 'svelte/transition';

	const { title = '', class_frame = '', class_title = '', children } = $props();
</script>

<div
	transition:fade={{ duration: 200 }}
	id="info"
	class={cn(
		'bg-base-100 relative mb-8 border-b border-gray-300 p-4 md:p-8 py-8 transition-all duration-200 ease-in-out not-sm:w-full  md:mb-12 md:rounded-xl md:border md:shadow-sm ',
		class_frame ? class_frame : ''
	)}
>
	{#if title}
		<p
			class={cn(
				'bg-base-100 absolute -top-3.5  left-2.5 px-2 font-semibold',
				class_title ? class_title : ''
			)}
		>
			{title}
		</p>
	{/if}
	{@render children()}
</div>

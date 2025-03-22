<script lang="ts">
	import { fade } from 'svelte/transition';

	let { children } = $props();
	// État pour stocker la position du scroll
	let scrollPosition = $state<number>(0);

	// Effet pour gérer le scroll lors du montage/démontage
	$effect(() => {
		// Sauvegarder la position actuelle du scroll
		scrollPosition = window.scrollY;

		// Simplement bloquer le scroll sans fixer la position
		document.body.style.overflow = 'hidden';

		// Cleanup function
		return () => {
			document.body.style.overflow = '';
			window.scrollTo(0, scrollPosition);
		};
	});
</script>

<div
	class="bg-neutral/50 fixed inset-0 z-50 flex h-full w-full items-center justify-center backdrop-blur-xs"
	transition:fade={{ duration: 150 }}
>
	<div
		class="bg-base-100 relative mx-auto max-h-dvh w-full max-w-6xl overflow-y-auto rounded-xl p-2 shadow-lg md:max-h-[calc(100dvh-2rem)] md:p-6"
	>
		{@render children?.()}
	</div>
</div>

<style>
</style>

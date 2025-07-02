<script lang="ts">
	import { X } from "lucide-svelte";
	import type { Snippet } from "svelte";
	import { fade } from "svelte/transition";

	// État pour stocker la position du scroll
	let scrollPosition = $state<number>(0);

	// Effet pour gérer le scroll lors du montage/démontage
	$effect(() => {
		// Sauvegarder la position actuelle du scroll
		scrollPosition = window.scrollY;

		// Simplement bloquer le scroll sans fixer la position
		document.body.style.overflow = "hidden";

		// Cleanup function
		return () => {
			document.body.style.overflow = "";
			window.scrollTo(0, scrollPosition);
		};
	});

	interface Props {
		children: Snippet;
		title?: string;
		onClose: () => void;
		onSave: () => void;
		showCancel?: boolean;
	}

	let { children, title, onClose, onSave, showCancel = true }: Props = $props();
</script>

<div
	class="bg-neutral/50 fixed inset-0 z-50 flex h-full w-full items-center justify-center backdrop-blur-xs"
	transition:fade={{ duration: 150 }}
>
	<div
		class="bg-base-100 relative max-h-dvh w-full max-w-6xl overflow-y-auto rounded-xl p-2 pb-0 shadow-lg sm:mx-auto md:mx-4 md:max-h-[calc(100dvh-2rem)] md:p-6 md:pb-0"
	>
		<!-- Header avec titre et bouton fermer -->
		<div class="flex items-center justify-between border-b pb-2 md:mb-4">
			{#if title}
				<div class="text-fluid-lg p-2 font-bold">{title}</div>
			{/if}
			{#if onClose}
				<button class="btn btn-ghost btn-circle btn-sm ms-auto" onclick={onClose}>
					<X size={20} />
				</button>
			{/if}
		</div>

		<!-- Contenu du modal -->
		<div class="max-h-svh overflow-y-auto pb-4">
			{@render children()}
		</div>

		<!-- Footer avec boutons d'action -->
		<div class="border-t-base-content/20 bg-base-100 sticky bottom-0 border-t">
			<div class="flex justify-end">
				{#if showCancel}
					<button class="btn btn-ghost m-2 md:mb-4" onclick={onClose}>Annuler</button>
				{/if}
				<button class="btn btn-primary m-2 md:mb-4" onclick={onSave}>Appliquer</button>
			</div>
		</div>
	</div>
</div>

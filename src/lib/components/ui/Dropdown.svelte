<script lang="ts">
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";
	import { X } from "lucide-svelte";

	interface Props {
		/** Classes CSS pour le conteneur principal */
		class?: string;
		/** Classes CSS pour le bouton déclencheur */
		triggerClass?: string;
		/** Classes CSS pour le contenu du dropdown */
		contentClass?: string;
		/** Position du dropdown */
		position?: "top" | "bottom";
		/** Alignement horizontal */
		align?: "left" | "right" | "center";
		/** Largeur du dropdown */
		width?: string;
		/** Hauteur maximale du contenu avec scroll */
		maxHeight?: string;
		/** Titre du header (optionnel) */
		headerTitle?: string;
		/** Afficher le bouton de fermeture dans le header */
		showCloseButton?: boolean;
		/** Callback lors de l'ouverture */
		onOpen?: () => void;
		/** Callback lors de la fermeture */
		onClose?: () => void;
		/** État ouvert/fermé */
		isOpen?: boolean;
		/** Permettre la fermeture au clic extérieur */
		closeOnOutsideClick?: boolean;
		/** Slot pour le bouton déclencheur */
		trigger: import("svelte").Snippet;
		/** Slot pour le contenu principal */
		content: import("svelte").Snippet;
		/** Slot pour le header personnalisé (optionnel) */
		header?: import("svelte").Snippet;
		/** Slot pour le footer (optionnel) */
		footer?: import("svelte").Snippet;
	}

	let {
		class: className = "",
		triggerClass = "btn btn-ghost",
		contentClass = "bg-base-100 border-base-300",
		position = "bottom",
		align = "right",
		width = "w-80",
		maxHeight = "max-h-96",
		headerTitle,
		showCloseButton = true,
		onOpen,
		onClose,
		isOpen = $bindable(false),
		closeOnOutsideClick = true,
		trigger,
		content,
		header,
		footer
	}: Props = $props();

	let containerElement: HTMLDivElement;

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			onOpen?.();
		} else {
			onClose?.();
		}
	}

	function closeDropdown() {
		if (isOpen) {
			isOpen = false;
			onClose?.();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (!closeOnOutsideClick) return;

		const target = event.target as HTMLElement;
		if (containerElement && !containerElement.contains(target)) {
			closeDropdown();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && isOpen) {
			closeDropdown();
		}
	}

	onMount(() => {
		if (closeOnOutsideClick) {
			document.addEventListener("click", handleClickOutside);
		}
		document.addEventListener("keydown", handleKeydown);

		return () => {
			document.removeEventListener("click", handleClickOutside);
			document.removeEventListener("keydown", handleKeydown);
		};
	});

	// Classes de position
	const positionClasses = $derived.by(() => {
		const baseClasses = "absolute z-50";
		const positionClass = position === "top" ? "bottom-full mb-2" : "top-full mt-2";

		let alignClass = "";
		switch (align) {
			case "left":
				alignClass = "left-0";
				break;
			case "right":
				alignClass = "right-0";
				break;
			case "center":
				alignClass = "left-1/2 -translate-x-1/2";
				break;
		}

		return `${baseClasses} ${positionClass} ${alignClass}`;
	});
</script>

<div bind:this={containerElement} class="dropdown-container relative {className}">
	<!-- Bouton déclencheur -->
	<button class={triggerClass} onclick={toggleDropdown} aria-expanded={isOpen} aria-haspopup="true">
		{@render trigger()}
	</button>

	<!-- Contenu du dropdown -->
	{#if isOpen}
		<div
			class="{positionClasses} {width} rounded-lg border shadow-xl {contentClass}"
			transition:fly={{ y: position === "top" ? 10 : -10, duration: 200 }}
			role="menu"
			aria-orientation="vertical"
		>
			<!-- Header -->
			{#if header}
				<div class="border-base-300 border-b">
					{@render header()}
				</div>
			{:else if headerTitle}
				<div class="border-base-300 flex items-center justify-between border-b p-4">
					<h3 class="text-lg font-semibold">{headerTitle}</h3>
					{#if showCloseButton}
						<button
							class="btn btn-ghost btn-sm btn-circle"
							onclick={closeDropdown}
							aria-label="Fermer"
						>
							<X size={16} />
						</button>
					{/if}
				</div>
			{/if}

			<!-- Contenu principal -->
			<div class="overflow-y-auto {maxHeight}">
				{@render content()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="border-base-300 border-t">
					{@render footer()}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dropdown-container {
		contain: layout;
	}
</style>

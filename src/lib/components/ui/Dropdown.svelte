<script lang="ts">
	import { onMount } from "svelte";
	import { fade, fly } from "svelte/transition";
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
		/** Forcer l'état ouvert/fermé */
		isOpen?: boolean;
		/** Permettre la fermeture au clic extérieur */
		closeOnOutsideClick?: boolean;
		/** Animation d'entrée */
		animation?: "fly" | "fade" | "scale";
		/** Utiliser position fixed pour sortir du conteneur parent (utile pour header) */
		portal?: boolean;
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
		animation = "fly",
		portal = false,
		trigger,
		content,
		header,
		footer
	}: Props = $props();

	let dropdownElement: HTMLDivElement;
	let triggerElement: HTMLButtonElement;
	let dropdownPosition = $state({ top: 0, left: 0 });

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			if (portal && triggerElement) {
				updateDropdownPosition();
			}
			onOpen?.();
		} else {
			onClose?.();
		}
	}

	function updateDropdownPosition() {
		if (!triggerElement) return;

		const rect = triggerElement.getBoundingClientRect();
		const scrollX = window.scrollX || document.documentElement.scrollLeft;
		const scrollY = window.scrollY || document.documentElement.scrollTop;

		let top = rect.bottom + scrollY;
		let left = rect.left + scrollX;

		// Ajustement pour position top
		if (position === "top") {
			top = rect.top + scrollY - 8; // -8 pour le margin
		} else {
			top = rect.bottom + scrollY + 8; // +8 pour le margin
		}

		// Ajustement pour alignement
		if (align === "right") {
			left = rect.right + scrollX;
		} else if (align === "center") {
			left = rect.left + scrollX + rect.width / 2;
		}

		dropdownPosition = { top, left };
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
		if (dropdownElement && !dropdownElement.contains(target)) {
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

	// Calcul des classes de position
	const positionClasses = $derived(() => {
		const baseClasses = portal ? "fixed z-[9999]" : "absolute z-50";

		if (portal) {
			return baseClasses;
		}

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

	// Style pour position fixed
	const portalStyle = $derived(() => {
		if (!portal) return "";

		let style = `top: ${dropdownPosition.top}px; `;

		if (align === "right") {
			style += `right: ${window.innerWidth - dropdownPosition.left}px; `;
		} else if (align === "center") {
			style += `left: ${dropdownPosition.left}px; transform: translateX(-50%); `;
		} else {
			style += `left: ${dropdownPosition.left}px; `;
		}

		if (position === "top") {
			style += `transform: translateY(-100%); `;
		}

		return style;
	});

	// Animation selon le type choisi
	function getTransition(node: Element) {
		const direction = position === "top" ? 10 : -10;

		switch (animation) {
			case "fade":
				return fade(node, { duration: 200 });
			case "scale":
				return fly(node, { y: 0, scale: 0.95, duration: 200 });
			case "fly":
			default:
				return fly(node, { y: direction, duration: 200 });
		}
	}
</script>

<div bind:this={dropdownElement} class="dropdown-container relative {className}">
	<!-- Bouton déclencheur -->
	<button
		bind:this={triggerElement}
		class={triggerClass}
		onclick={toggleDropdown}
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		{@render trigger()}
	</button>

	<!-- Contenu du dropdown -->
	{#if isOpen}
		<div
			class="{positionClasses} {width} rounded-lg border shadow-xl {contentClass}"
			style={portal ? portalStyle : ""}
			transition:getTransition
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
		/* Assure que le dropdown ne sort pas de l'écran */
		contain: layout;
	}
</style>

<script lang="ts">
	import { modalState } from "$lib/shared/states.svelte";
	import { AlertOctagon, AlertTriangle, Info } from "lucide-svelte";
	import Modal from "./Modal.svelte";

	// --- États dérivés des données du modal ---
	let title = $derived(modalState.confirm.data.title);
	let message = $derived(modalState.confirm.data.message);
	let variant = $derived(modalState.confirm.data.variant || "warning");
	let confirmLabel = $derived(modalState.confirm.data.confirmLabel || "Continuer");
	let additionnalButton = $derived(modalState.confirm.data.additionalButton || null);
	let checkboxConfig = $derived(modalState.confirm.data.showCheckbox);
	let cancelEventConfig = $derived(modalState.confirm.data.showCancelEventButton);
	let onConfirmCallback = $derived(modalState.confirm.data.onConfirm);
	let onCancelEventCallback = $derived(cancelEventConfig?.onCancelEvent);

	// --- État local pour la checkbox ---
	let notifyOthers = $state(checkboxConfig?.checked ?? false); // Initialiser avec la valeur par défaut

	// 👉 Mettre à jour l'état local si la configuration change (par exemple, si le modal est réutilisé rapidement)
	$effect(() => {
		notifyOthers = checkboxConfig?.checked ?? false;
	});

	const getIconColor = () => {
		switch (variant) {
			case "warning":
				return "text-warning";
			case "info":
				return "text-info";
			case "danger":
				return "text-error";
			default:
				return "text-warning";
		}
	};

	function handleConfirm() {
		// 👉 Passer l'état de la checkbox au callback
		if (onConfirmCallback) {
			onConfirmCallback(notifyOthers);
		}
		closeModal();
	}

	function handleCancel() {
		closeModal();
	}

	function handleAdditionnalButton() {
		additionnalButton?.onClick();
		closeModal();
	}

	// 👉 Gérer le clic sur le bouton d'annulation d'événement
	function handleCancelEvent() {
		if (onCancelEventCallback) {
			onCancelEventCallback();
		} else {
			closeModal(); // Sécurité si le callback n'est pas fourni
		}
	}

	function closeModal() {
		modalState.confirm.isOpen = false;
		// Réinitialiser les données pour éviter les fuites d'état si nécessaire
		// modalState.confirm.data = { title: '', message: '', onConfirm: () => {} };
	}
</script>

<Modal>
	<div class="">
		<h3 class="text-fluid-lg font-bold not-sm:text-center">{title}</h3>
		<div class="p-4">
			<div class="flex items-start gap-4">
				<div class={`flex-shrink-0 self-center ${getIconColor()}`}>
					{#if variant === "warning"}
						<AlertTriangle size={36} />
					{:else if variant === "info"}
						<Info size={36} />
					{:else if variant === "danger"}
						<AlertOctagon size={36} />
					{:else}
						<AlertTriangle size={36} />
					{/if}
				</div>
				<span class="text-fluid-base flex-grow">
					{message}
				</span>
			</div>

			<!-- 👉 Affichage conditionnel de la checkbox -->
			{#if checkboxConfig}
				<div class="mt-4">
					<label class="flex cursor-pointer items-center justify-end">
						<input type="checkbox" bind:checked={notifyOthers} class="checkbox checkbox-sm" />
						<span class="label-text ml-2">{checkboxConfig.label}</span>
					</label>
				</div>
			{/if}
		</div>
		<div class="modal-action justify-between">
			<!-- 👉 Affichage conditionnel du bouton d'annulation -->
			<div>
				{#if cancelEventConfig}
					<button class="btn btn-error" onclick={handleCancelEvent}>
						{cancelEventConfig.label}
					</button>
				{/if}
			</div>
			<div class="flex gap-2">
				<button class="btn btn-ghost" onclick={handleCancel}>Annuler</button>
				{#if additionnalButton}
					<button class="btn btn-{additionnalButton.variant}" onclick={handleAdditionnalButton}
						>{additionnalButton.label}</button
					>
				{/if}
				<button class="btn btn-primary" onclick={handleConfirm}>{confirmLabel}</button>
			</div>
		</div>
	</div>
</Modal>

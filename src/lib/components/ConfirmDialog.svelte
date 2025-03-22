<script lang="ts">
	import { modalState } from '$lib/shared/states.svelte';
	import { AlertOctagon, AlertTriangle, Info } from 'lucide-svelte';
	import Modal from './Modal.svelte';

	let title = $derived(modalState.confirm.data.title);
	let message = $derived(modalState.confirm.data.message);
	let variant = $derived(modalState.confirm.data.variant || 'warning');

	const getIconColor = () => {
		switch (variant) {
			case 'warning':
				return 'text-warning';
			case 'info':
				return 'text-info';
			case 'danger':
				return 'text-error';
			default:
				return 'text-warning';
		}
	};

	function handleConfirm() {
		if (modalState.confirm.data.onConfirm) {
			modalState.confirm.data.onConfirm();
		}
		modalState.confirm.isOpen = false;
	}

	function handleCancel() {
		modalState.confirm.isOpen = false;
	}
</script>

<Modal>
	<div class="">
		<h3 class="text-fluid-lg font-bold">{title}</h3>
		<div class="py-4">
			<div class="flex items-start gap-4">
				<div class={`flex-shrink-0 self-center ${getIconColor()}`}>
					{#if variant === 'warning'}
						<AlertTriangle size={36} />
					{:else if variant === 'info'}
						<Info size={36} />
					{:else if variant === 'danger'}
						<AlertOctagon size={36} />
					{:else}
						<AlertTriangle size={36} />
					{/if}
				</div>
				<div class="flex-grow">
					{message}
				</div>
			</div>
		</div>
		<div class="modal-action">
			<button class="btn btn-ghost" onclick={handleCancel}>Annuler</button>
			<button class="btn btn-primary" onclick={handleConfirm}>Continuer</button>
		</div>
	</div>
</Modal>

<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { modalState } from '$lib/shared/states.svelte';

	import { AlertOctagon, AlertTriangle, Info } from 'lucide-svelte';

	let open = $state(modalState.confirm.isOpen);
	let title = $derived(modalState.confirm.data.title);
	let message = $derived(modalState.confirm.data.message);
	let variant = $derived(modalState.confirm.data.variant || 'warning');

	const getIconColor = () => {
		switch (variant) {
			case 'warning':
				return 'text-amber-500';
			case 'info':
				return 'text-blue-500';
			case 'danger':
				return 'text-red-500';
			default:
				return 'text-amber-500';
		}
	};

	function handleConfirm() {
		if (modalState.confirm.data.onConfirm) {
			modalState.confirm.data.onConfirm();
		}
		open = false;
		modalState.confirm.isOpen = false;
	}

	function handleCancel() {
		modalState.confirm.isOpen = false;
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>

			<AlertDialog.Description>
				<div class="flex items-start gap-4 pt-2">
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
					<div class="flex-grow pt-1">
						{message}
					</div>
				</div>
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancel}>Annuler</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleConfirm}>Continuer</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

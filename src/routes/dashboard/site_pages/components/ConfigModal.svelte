<script lang="ts">
	import { X } from 'lucide-svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		title: string;
		onClose: () => void;
	}

	let { title, onClose }: Props = $props();
</script>

<Modal>
	<div class="relative h-full">
		<!-- Header avec titre et bouton fermer -->
		<div class="mb-4 flex items-center justify-between border-b pb-4">
			<h2 class="text-xl font-bold">{title}</h2>
			<button class="btn btn-ghost btn-square btn-sm" onclick={onClose}>
				<X size={20} />
			</button>
		</div>

		<!-- Contenu du modal -->
		<div class="max-h-[calc(80vh-8rem)] overflow-y-auto pb-4">
			<slot />
		</div>

		<!-- Footer avec boutons d'action -->
		<div class="border-t-base-content/20 sticky bottom-0 mt-4 border-t bg-inherit pt-4">
			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost" onclick={onClose}>Annuler</button>
				<slot name="actions">
					<button class="btn btn-primary" onclick={onClose}>Fermer</button>
				</slot>
			</div>
		</div>
	</div>
</Modal>

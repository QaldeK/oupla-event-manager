<script lang="ts">
	import { X } from 'lucide-svelte';
	import Modal from '$lib/components/Modal.svelte';
	import type { Snippet } from 'svelte';

	import { fade } from 'svelte/transition';

	interface Props {
		children: Snippet;
		title: string;
		onClose: () => void;
	}

	let { children, title, onClose }: Props = $props();
</script>

<Modal>
	<div class="relative h-full">
		<!-- Header avec titre et bouton fermer -->
		<div class="mb-2 flex items-center justify-between border-b pb-2">
			<h2 class="text-fluid-lg font-bold">{title}</h2>
			<button class="btn btn-ghost btn-square btn-sm" onclick={onClose}>
				<X size={20} />
			</button>
		</div>

		<!-- Contenu du modal -->
		<div class="overflow-y-auto pb-4 md:max-h-[calc(90vh-8rem)]">
			{@render children()}
		</div>

		<!-- Footer avec boutons d'action -->
		<div class="border-t-base-content/20 bg-base-100 sticky bottom-0 mt-2 border-t pt-4">
			<div class="flex justify-end gap-2">
				<button class="btn btn-primary" onclick={onClose}>Appliquer</button>
			</div>
		</div>
	</div>
</Modal>

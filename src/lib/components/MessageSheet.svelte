<script lang="ts">
	import MessageThread from '$lib/components/MessageThread.svelte';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { messageSheet } from '$lib/shared/states.svelte';
</script>

<Sheet.Root open={messageSheet.isOpen} onOpenChange={(open) => (messageSheet.isOpen = open)}>
	<Sheet.Portal>
		<Sheet.Overlay class="fixed inset-0 bg-black/10" />
		<Sheet.Content side="right" class="w-full sm:min-w-[600px]">
			{#if messageSheet.currentEventId}
				<MessageThread eventId={messageSheet.currentEventId} />
			{/if}

			<Sheet.Close class="absolute top-4 right-4">
				<span class="sr-only">Fermer</span>
			</Sheet.Close>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>

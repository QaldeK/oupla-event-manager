<script lang="ts">
	import MessageThread from "$lib/components/MessageThread.svelte";
	import * as Sheet from "$lib/components/ui/sheet/index.js";

	import { messageSheet } from "$lib/shared/states.svelte";
</script>

<Sheet.Root open={messageSheet.isOpen} onOpenChange={(open) => (messageSheet.isOpen = open)}>
	<Sheet.Portal>
		<Sheet.Content side="right" class="w-full p-1 sm:min-w-[600px]" data-theme="my-corporate">
			{#if messageSheet.currentEventId}
				<MessageThread
					eventId={messageSheet.currentEventId}
					eventName={messageSheet.currentEventName}
				/>
			{/if}
			<Sheet.Close class="absolute top-4 right-4">
				<span class="sr-only">Fermer</span>
			</Sheet.Close>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>

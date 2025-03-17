<script lang="ts">
	import MessageCard from '$lib/components/MessageCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { sendMessage } from '$lib/pocketbase.svelte';
	import { messageStore } from '$lib/shared/messageStore.svelte';
	import type { MessagesRecord } from '$lib/types/pocketbase';

	import { MessageCircle, Reply } from 'lucide-svelte';

	interface Props {
		eventId: string;
	}

	let { eventId }: Props = $props();

	let newMessage = $state('');
	let replyingTo = $state<string | null>(null);
	let messages = $derived<MessagesRecord[]>(messageStore.getMessageOfEvent(eventId));
	let isLoading = $state(false);

	const handleSend = () => {
		const result = sendMessage(eventId, newMessage, replyingTo);
		if (result) {
			newMessage = '';
			replyingTo = null;
		}
	};

	// TODO put in actions
	const scrollToBottom = (node) => {
		const scroll = () =>
			node.scroll({
				top: node.scrollHeight,
				behavior: 'smooth'
			});
		scroll();

		return { update: scroll };
	};
</script>

<div class="flex h-full max-h-dvh flex-col rounded-lg bg-white shadow-sm dark:bg-gray-800">
	<!-- En-tête -->
	<div class="flex items-center gap-2 border-b p-4 dark:border-gray-700">
		<MessageCircle class="h-5 w-5" />
		<h2 class="text-lg font-semibold">Discussion</h2>
	</div>

	<!-- Zone de messages avec défilement -->
	<div use:scrollToBottom={messages} class="flex-1 overflow-auto p-2">
		{#if isLoading}
			<div class="flex justify-center p-4">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else}
			<div class="space-y-4" use:scrollToBottom={messages}>
				{#each messages as message}
					<MessageCard {message} onReply={(id) => (replyingTo = id)} />
				{/each}
			</div>
		{/if}
	</div>

	<!-- Zone de saisie -->
	<div class="border-t p-4 ps-1 dark:border-gray-700">
		{#if replyingTo}
			<div class="text-fluid-sm mb-2 flex items-center gap-2 text-gray-500">
				<Reply class="h-4 w-4" />
				<span>Réponse à un message</span>
				<Button variant="ghost" size="sm" onclick={() => (replyingTo = null)} class="ml-auto">
					Annuler
				</Button>
			</div>
		{/if}

		<div class="flex-col">
			<Textarea
				placeholder="Écrivez votre message..."
				bind:value={newMessage}
				class="mb-2 min-h-[80px]"
			/>
			<Button class="float-end " onclick={handleSend} disabled={!newMessage.trim()}>Envoyer</Button>
		</div>
	</div>
</div>

<script lang="ts">
	import MessageCard from "$lib/components/MessageCard.svelte";
	import { Textarea } from "$lib/components/ui/textarea";
	import { sendMessage } from "$lib/pocketbase.svelte";
	import { messageManager } from "$lib/shared/messageStore.svelte";
	import type { MessagesResponse } from "$lib/types/pocketbase";
	import type { ExpandedMessage } from "$lib/types/types";
	import { getSpace } from "$lib/shared";

	import { MessageCircle, Reply, X } from "lucide-svelte";

	interface Props {
		eventId: string;
		eventName: string | null;
	}

	let { eventId, eventName }: Props = $props();

	let newMessage = $state("");
	let replyingTo = $state<string | null>(null);
	let replyingToMessage = $state<MessagesResponse<ExpandedMessage> | null>(null);
	let messages = $derived<MessagesResponse<ExpandedMessage>[]>(
		messageManager.getMessageOfEvent(eventId)
	);
	let isLoading = $state(false);
	let messageRefs = $state<Record<string, HTMLElement>>({});
	let messageResponseOf = $state<string | null>(null);

	// Fonction pour obtenir un message par son ID pour envoyé le content de replyTo
	const getMessageFromThread = (
		messageId: string
	): MessagesResponse<ExpandedMessage> | undefined => {
		return messages.find((m) => m.id === messageId);
	};

	const getReplyUsername = (userId: string, expandedUser?: { username: string }) => {
		// D'abord vérifier l'expand
		if (expandedUser?.username) {
			return expandedUser.username;
		}

		// Fallback sur le spacesStore
		const member = getSpace.members.find((m) => m.id === userId);
		return member?.username || "Utilisateur";
	};

	// Pour la zone de réponse dans MessageThread
	let replyingToUsername = $derived(
		replyingToMessage
			? getReplyUsername(replyingToMessage.user, replyingToMessage.expand?.user)
			: null
	);

	const handleSend = async () => {
		const result = await sendMessage(eventId, newMessage, replyingTo);
		if (result) {
			newMessage = "";
			replyingTo = null;
			replyingToMessage = null;
		}
	};

	const handleReply = (id: string) => {
		replyingTo = id;
		replyingToMessage = messages.find((msg) => msg.id === id) || null;
	};

	const scrollToMessage = (id: string) => {
		const element = messageRefs[id];
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			// Ajouter une classe temporaire pour mettre en évidence le message
			messageResponseOf = id;
		}
	};

	let scrollRef: HTMLElement;
	let list = $derived(messages.length);
	const scrollToBottom = (node: HTMLElement) =>
		node.scroll({
			top: node.scrollHeight,
			behavior: "smooth"
		});

	// Précharger la conversation au montage du composant pour de meilleures performances
	$effect(() => {
		if (eventId && messageManager.isInitialized) {
			messageManager.preloadConversation(eventId).catch((error) => {
				console.warn("Échec du préchargement de la conversation:", error);
			});
		}
	});

	$effect(() => {
		if (list) {
			if (!replyingTo) {
				scrollToBottom(scrollRef);
			}
		}
	});
</script>

<div class="flex h-full max-h-dvh flex-col">
	<!-- En-tête -->
	<div class="flex items-center gap-2 border-b p-4">
		<MessageCircle class="h-5 w-5" />
		<div class="text-lg font-semibold">Discussion - {eventName}</div>
	</div>

	<!-- Zone de messages avec défilement -->
	<div bind:this={scrollRef} class="flex-1 overflow-auto p-2">
		{#if isLoading || !messageManager.isInitialized}
			<div class="flex justify-center p-4">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else if messageManager.error}
			<div class="flex justify-center p-4">
				<div class="alert alert-error">
					<span>Erreur lors du chargement des messages</span>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				{#each messages as message, index (message.id + index)}
					<div
						bind:this={messageRefs[message.id]}
						class="rounded-lg {message.id === messageResponseOf ? ' highlight-message' : ''}"
					>
						<MessageCard
							{message}
							onReply={handleReply}
							scrollToReply={scrollToMessage}
							getReplyMessage={getMessageFromThread}
							{getReplyUsername}
						/>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Zone de saisie -->
	<div class="border-t p-4 ps-1">
		{#if replyingTo && replyingToMessage}
			<div class="bg-base-300 mb-2 rounded-md p-2">
				<div class="text-fluid-sm flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Reply class="h-4 w-4" />
						<span class="font-semibold">
							Réponse à {replyingToUsername}
						</span>
					</div>
					<button
						class="btn btn-ghost btn-xs"
						onclick={() => {
							replyingTo = null;
							replyingToMessage = null;
						}}
					>
						<X class="h-4 w-4" />
					</button>
				</div>
				<p class="text-fluid-sm text-base-content/80 mt-1 line-clamp-2">
					{replyingToMessage.content}
				</p>
			</div>
		{/if}

		<div class="flex-col">
			<Textarea
				placeholder="Écrivez votre message..."
				bind:value={newMessage}
				class="mb-2 min-h-[80px]"
			/>
			<button
				class="btn btn-primary btn-sm float-end"
				onclick={handleSend}
				disabled={!newMessage.trim()}>Envoyer</button
			>
		</div>
	</div>
</div>

<style>
	.highlight-message {
		animation: highlight 2s ease-in-out;
	}

	@keyframes highlight {
		100% {
			background-color: rgba(var(--p), 0.1);
		}
		0% {
			background-color: slategray;
		}
	}
</style>

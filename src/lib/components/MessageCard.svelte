<script lang="ts">
	import { Textarea } from "$lib/components/ui/textarea";
	import { pb } from "$lib/pocketbase.svelte";
	import { deleteMessage, updateMessage } from "$lib/pocketbase.svelte";
	import type { MessagesResponse } from "$lib/types/pocketbase";
	import type { ExpandedMessage } from "$lib/types/types";

	import { ArrowUpRight, PencilLine, Reply, Trash2 } from "lucide-svelte";

	interface Props {
		message: MessagesResponse<ExpandedMessage>;
		onReply: (id: string) => void;
		scrollToReply?: (id: string) => void;
		getReplyMessage: (messageId: string) => MessagesResponse<ExpandedMessage> | undefined;
		getReplyUsername: (userId: string, expandedUser?: { username: string }) => str;
	}

	let { message, onReply, scrollToReply, getReplyMessage, getReplyUsername }: Props = $props();
	let isEditing = $state(false);
	let editContent = $state(message.content);
	let isCurrentUser = $derived(message.user === pb.authStore.record?.id);
	let hasReply = $derived(!!message.replyingTo);

	// Utilise d'abord l'expand, puis fallback sur le message du thread
	const replyContent = $derived.by(() => {
		if (message.expand?.replyingTo?.content) {
			return message.expand.replyingTo.content;
		}

		if (message.replyingTo) {
			const replyMessage = getReplyMessage(message.replyingTo);
			return replyMessage?.content;
		}

		return "Message indisponible";
	});

	// Username de l'auteur du message
	const authorUsername = $derived(getReplyUsername(message.user, message.expand?.user));

	const handleUpdateMessage = async () => {
		await updateMessage(editContent, message);
		isEditing = false;
	};

	const handleDeleteMessage = async () => {
		await deleteMessage(message);
	};

	const handleScrollToReply = () => {
		if (message.replyingTo && scrollToReply) {
			scrollToReply(message.replyingTo);
		}
	};

	// Format de la date et heure pour le chat header
	const formatDateTime = (dateString: string) => {
		return new Intl.DateTimeFormat("fr-FR", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(new Date(dateString));
	};
</script>

<div
	class="chat {isCurrentUser ? 'chat-end' : 'chat-start'} group rounded-lg p-1 transition-colors"
>
	<!-- Header avec nom d'utilisateur et date/heure -->
	<div class="chat-header">
		<time class="text-xs opacity-50">{formatDateTime(message.created)}</time>
		{#if message.isEdited}
			<span class="text-xs opacity-50">(modifié)</span>
		{/if}
	</div>

	<!-- Avatar (optionnel) -->
	<!-- {#if message.expand?.user?.avatar}
		<div class="chat-image avatar">
			<div class="w-10 rounded-full">
				<img
					src={pb.files.getUrl(message.expand.user, message.expand.user.avatar)}
					alt={message.expand.user.username}
					class="h-full w-full object-cover"
				/>
			</div>
		</div>
	{/if} -->

	<!-- Contenu du message -->
	<div class="chat-bubble {isCurrentUser ? 'chat-bubble-primary' : ''}">
		<div class="text-sm font-semibold">{!isCurrentUser ? authorUsername : ""}</div>

		{#if hasReply}
			<div
				class="bg-base-200/80 text-fluid-sm mb-2 cursor-pointer rounded-md p-2 text-left transition-colors"
				onclick={handleScrollToReply}
				onkeydown={(e) => e.key === "Enter" && handleScrollToReply()}
				role="button"
				tabindex="0"
			>
				<div class="text-base-content/60 flex items-center gap-1 text-xs">
					<ArrowUpRight class="h-3 w-3" />
					<span>Réponse à ...</span>
				</div>
				<p class="text-base-content/90 line-clamp-2 text-sm">
					{replyContent || "Message indisponible"}
				</p>
			</div>
		{/if}

		{#if isEditing}
			<div class="space-y-2">
				<Textarea bind:value={editContent} class="min-h-[80px]" />
				<div class="float-end flex gap-2">
					<button class="btn btn-sm" onclick={handleUpdateMessage} disabled={!editContent.trim()}>
						Enregistrer
					</button>
					<button class="btn btn-sm btn-error" onclick={() => (isEditing = false)}>Annuler</button>
				</div>
			</div>
		{:else}
			{message.content}
		{/if}
	</div>

	<!-- Footer avec les actions -->
	<div class="chat-footer pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
		<div class="flex gap-2">
			<button class="btn btn-ghost btn-xs" onclick={() => onReply(message.id)}>
				<Reply class="mr-1 h-4 w-4" />
				Répondre
			</button>

			{#if isCurrentUser}
				<button class="btn btn-ghost btn-xs" onclick={() => (isEditing = true)}>
					<PencilLine class="mr-1 h-4 w-4" />
				</button>
				<button class="btn btn-ghost btn-xs" onclick={handleDeleteMessage}>
					<Trash2 class="mr-1 h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>
</div>

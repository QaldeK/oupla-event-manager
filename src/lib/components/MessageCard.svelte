<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { pb } from '$lib/pocketbase.svelte';
	import { deleteMessage, updateMessage } from '$lib/pocketbase.svelte';
	import type { MessagesResponse } from '$lib/types/pocketbase';

	import { Edit2, Reply, Trash2 } from 'lucide-svelte';

	interface Props {
		message: MessagesResponse;
		onReply: (id: string) => void;
	}

	let { message, onReply }: Props = $props();
	let isEditing = $state(false);
	let editContent = $state(message.content);

	const handleUpdateMessage = async () => {
		await updateMessage(editContent, message, isEditing);
		isEditing = false;
	};

	const handleDeleteMessage = async () => {
		await deleteMessage(message);
	};
</script>

<div class="group relative flex gap-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
	<!-- Avatar -->
	<div class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
		{#if message.expand?.user?.avatar}
			<img
				src={pb.files.getUrl(message.expand.user, message.expand.user.avatar)}
				alt={message.expand.user.username}
				class="h-full w-full object-cover"
			/>
		{/if}
	</div>
	<!-- Contenu -->
	<div class="flex-1">
		<div class="mb-1 flex items-center gap-2">
			<span class="font-semibold">
				{message.expand?.user?.username || 'Utilisateur'}
			</span>
			<span class="text-fluid-sm text-gray-500">
				{new Intl.DateTimeFormat('fr-FR', {
					dateStyle: 'medium',
					timeStyle: 'short'
				}).format(new Date(message.created))}
			</span>
			{#if message.isEdited}
				<span class="text-fluid-sm text-gray-400">(modifié)</span>
			{/if}
		</div>

		<div>
			{#if isEditing}
				<div class="space-y-2">
					<Textarea bind:value={editContent} class="min-h-[80px]" />
					<div class="flex gap-2">
						<button class="btn btn-sm" onclick={handleUpdateMessage} disabled={!editContent.trim()}>
							Enregistrer
						</button>
						<button class="btn btn-sm btn-sort btn-error" onclick={() => (isEditing = false)}
							>Annuler</button
						>
					</div>
				</div>
			{:else}
				<p class="text-gray-700 dark:text-gray-300">
					{message.content}
				</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="mt-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
			<button variant="ghost" size="sm" onclick={() => onReply(message.id)}>
				<Reply class="mr-1 h-4 w-4" />
				Répondre
			</button>

			{#if message.user === pb.authStore.record.id}
				<button variant="ghost" size="sm" onclick={() => (isEditing = true)}>
					<Edit2 class="mr-1 h-4 w-4" />
					Modifier
				</button>
				<button class="btn btn-ghost btn-sm" onclick={handleDeleteMessage}>
					<Trash2 class="mr-1 h-4 w-4" />
					Supprimer
				</button>
			{/if}
		</div>
	</div>
</div>

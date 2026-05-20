<script lang="ts">
	import { conversationDirectoryStore } from "$lib/shared/conversationDirectoryStore.svelte";
	import { messageManager } from "$lib/shared/messageStore.svelte";
	import { getSpace } from "$lib/shared/spaceOptions.svelte";
	import { messageSheet } from "$lib/shared/states.svelte";
	import { MessageCircle, Search } from "lucide-svelte";
	import { Input } from "$lib/components/ui/input";
	import ConversationListItem from "$lib/components/ConversationListItem.svelte";
	import type { ConversationSummariesResponse } from "$lib/types/pocketbase";

	// État local pour la recherche et les filtres
	let searchQuery = $state("");
	let selectedFilter = $state<"all" | "event" | "group" | "dm">("all");
	let sortBy = $state<"recent" | "activity" | "title">("recent");
	let isLoading = $derived(conversationDirectoryStore.isLoading);
	// Conversations pour l'espace actuel
	let spaceConversations = $derived.by(() => {
		if (!getSpace?.id) return [];
		return conversationDirectoryStore.getConversationsForSpace(getSpace.id);
	});

	// Conversations filtrées et triées
	let filteredConversations = $derived.by(() => {
		let conversations = spaceConversations;

		// Filtrage par recherche
		if (searchQuery.trim()) {
			const lowerQuery = searchQuery.toLowerCase();
			conversations = conversations.filter((conv) => {
				const titleMatch = conv.topic_title?.toLowerCase().includes(lowerQuery);
				const snippetMatch = conv.last_message_snippet?.toLowerCase().includes(lowerQuery);
				return titleMatch || snippetMatch;
			});
		}

		// Filtrage par type
		if (selectedFilter !== "all") {
			conversations = conversations.filter((conv) => conv.topic_type === selectedFilter);
		}

		// Tri
		const sortedConversations = [...conversations];
		switch (sortBy) {
			case "recent":
				return sortedConversations.sort((a, b) => {
					const dateA = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0;
					const dateB = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0;
					return dateB - dateA;
				});
			case "activity":
				return sortedConversations.sort((a, b) => (b.message_count || 0) - (a.message_count || 0));
			case "title":
				return sortedConversations.sort((a, b) =>
					(a.topic_title || "").localeCompare(b.topic_title || "")
				);
			default:
				return sortedConversations;
		}
	});

	// Statistiques des conversations pour l'espace actuel
	let stats = $derived.by(() => {
		if (!getSpace?.id) {
			return { total: 0, byType: { events: 0, groups: 0, directMessages: 0 } };
		}
		return conversationDirectoryStore.getStatsForSpace(getSpace.id);
	});

	// Fonction pour ouvrir une conversation
	const openConversation = (conversation: ConversationSummariesResponse) => {
		// Précharger la conversation pour de meilleures performances
		messageManager.preloadConversation(conversation.topic_id);

		// Ouvrir le panneau de message avec l'ID de l'événement
		messageSheet.openMessages(conversation.topic_id, conversation.topic_title);
	};
</script>

<svelte:head>
	<title>Discussions - {getSpace?.name || "..."}</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-6">
	<!-- En-tête -->
	<div class="mb-8">
		<div class="mb-4 flex items-center gap-3">
			<MessageCircle class="text-primary h-8 w-8" />
			<h1 class="text-3xl font-bold">Discussions</h1>
		</div>
		<p class="text-base-content/70">
			Découvrez et participez aux conversations dans {getSpace?.name || "..."}
		</p>
	</div>

	<!-- Barre de recherche et filtres -->
	<div class="bg-base-100 mb-6 rounded-lg border p-4">
		<div class="flex flex-col gap-4 md:flex-row">
			<!-- Recherche -->
			<div class="relative flex-1">
				<Search
					class="text-base-content/50 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
				/>
				<Input
					type="text"
					placeholder="Rechercher des conversations..."
					bind:value={searchQuery}
					class="pl-10"
				/>
			</div>

			<!-- Filtres -->
			<div class="flex flex-wrap gap-2">
				<select bind:value={selectedFilter} class="select select-bordered select-sm">
					<option value="all">Tous types</option>
					<option value="event">Événements</option>
					<option value="group">Groupes</option>
					<option value="dm">Messages privés</option>
				</select>

				<select bind:value={sortBy} class="select select-bordered select-sm">
					<option value="recent">Plus récent</option>
					<option value="activity">Plus actif</option>
					<option value="title">Alphabétique</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Liste des conversations -->
	<div class="bg-base-100 rounded-lg border">
		{#if isLoading}
			<div class="flex items-center justify-center p-12">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if conversationDirectoryStore.error}
			<div class="p-6">
				<div class="alert alert-error">
					<span>Erreur lors du chargement des conversations</span>
				</div>
			</div>
		{:else if filteredConversations.length === 0}
			<div class="p-12 text-center">
				<MessageCircle class="text-base-content/30 mx-auto mb-4 h-16 w-16" />
				<h3 class="mb-2 text-lg font-semibold">Aucune conversation trouvée</h3>
				<p class="text-base-content/60">
					{searchQuery.trim()
						? "Essayez de modifier votre recherche ou vos filtres."
						: "Il n'y a pas encore de conversations dans cet espace."}
				</p>
			</div>
		{:else}
			<div class="divide-y">
				{#each filteredConversations as conversation (conversation.id)}
					<ConversationListItem {conversation} onclick={() => openConversation(conversation)} />
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer informatif -->
	<div class="text-base-content/60 mt-6 text-center text-sm">
		{#if filteredConversations.length > 0}
			Affichage de {filteredConversations.length} conversation{filteredConversations.length > 1
				? "s"
				: ""}
			{#if searchQuery.trim() || selectedFilter !== "all"}
				sur {stats.total} au total dans cet espace
			{/if}
		{/if}
	</div>
</div>

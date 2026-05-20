<script lang="ts">
	import { MessageCircle, Users, Calendar, Clock } from "lucide-svelte";
	import type { ConversationSummariesResponse } from "$lib/types/pocketbase";

	interface Props {
		conversation: ConversationSummariesResponse;
		onclick?: () => void;
	}

	let { conversation, onclick }: Props = $props();

	// Fonction pour formater la date
	const formatDate = (dateString: string | null): string => {
		if (!dateString) return "Jamais";

		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffHours / 24);

		if (diffHours < 1) return "À l'instant";
		if (diffHours < 24) return `Il y a ${diffHours}h`;
		if (diffDays < 7) return `Il y a ${diffDays}j`;

		return date.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short"
		});
	};

	// Fonction pour obtenir l'icône selon le type
	const getTypeIcon = (type: string) => {
		switch (type) {
			case "event":
				return Calendar;
			case "group":
				return Users;
			case "dm":
				return MessageCircle;
			default:
				return MessageCircle;
		}
	};

	// Fonction pour obtenir la couleur selon le type
	const getTypeColor = (type: string) => {
		switch (type) {
			case "event":
				return "text-secondary";
			case "group":
				return "text-accent";
			case "dm":
				return "text-info";
			default:
				return "text-primary";
		}
	};

	// Fonction pour obtenir le nom du type
	const getTypeName = (type: string) => {
		switch (type) {
			case "event":
				return "Événement";
			case "group":
				return "Groupe";
			case "dm":
				return "Message privé";
			default:
				return "Conversation";
		}
	};

	// Fonction pour obtenir la couleur du badge selon le type
	const getBadgeClass = (type: string) => {
		switch (type) {
			case "event":
				return "badge-secondary";
			case "group":
				return "badge-accent";
			case "dm":
				return "badge-info";
			default:
				return "badge-primary";
		}
	};

	// Détermine si la conversation est récente (moins de 24h)
	const isRecent = $derived.by(() => {
		if (!conversation.last_message_timestamp) return false;
		const date = new Date(conversation.last_message_timestamp);
		const now = new Date();
		const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
		return diffHours < 24;
	});

	// Détermine si la conversation est active (plus de 5 messages)
	const isActive = $derived(conversation.message_count >= 5);
</script>

<button
	class="hover:bg-base-200 group flex w-full items-center gap-4 p-4 text-left transition-all duration-200"
	{onclick}
>
	<!-- Icône du type avec indicateur d'activité -->
	<div class="relative flex-shrink-0">
		<div
			class="bg-primary/10 group-hover:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full transition-colors"
		>
			<svelte:component
				this={getTypeIcon(conversation.topic_type)}
				class="h-6 w-6 {getTypeColor(conversation.topic_type)}"
			/>
		</div>

		<!-- Indicateur de conversation récente -->
		{#if isRecent}
			<div
				class="bg-success absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full"
			>
				<div class="h-2 w-2 rounded-full bg-white"></div>
			</div>
		{/if}
	</div>

	<!-- Contenu principal -->
	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-start justify-between">
			<h3 class="group-hover:text-primary truncate pr-2 text-base font-semibold transition-colors">
				{conversation.topic_title}
			</h3>
			<span class="text-base-content/60 flex-shrink-0 text-xs">
				{formatDate(conversation.last_message_timestamp)}
			</span>
		</div>

		<!-- Badges et métadonnées -->
		<div class="mb-2 flex items-center gap-2">
			<span class="badge badge-outline badge-xs {getBadgeClass(conversation.topic_type)}">
				{getTypeName(conversation.topic_type)}
			</span>

			<span class="text-base-content/60 flex items-center gap-1 text-xs">
				<MessageCircle class="h-3 w-3" />
				{conversation.message_count}
			</span>

			{#if isActive}
				<span class="badge badge-xs badge-warning"> Actif </span>
			{/if}
		</div>

		<!-- Aperçu du dernier message -->
		{#if conversation.last_message_snippet}
			<p class="text-base-content/70 line-clamp-2 text-sm">
				{conversation.last_message_snippet}
			</p>
		{:else}
			<p class="text-base-content/50 text-sm italic">Aucun message récent</p>
		{/if}
	</div>

	<!-- Indicateur d'activité visuel -->
	<div class="flex flex-shrink-0 flex-col items-center gap-1">
		{#if conversation.message_count > 0}
			<div
				class="bg-primary h-2 w-2 rounded-full opacity-60 transition-opacity group-hover:opacity-100"
			></div>
		{/if}

		<!-- Flèche pour indiquer l'action possible -->
		<div class="opacity-0 transition-opacity group-hover:opacity-60">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
				></path>
			</svg>
		</div>
	</div>
</button>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

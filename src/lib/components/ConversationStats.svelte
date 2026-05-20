<script lang="ts">
	// USELESS component
	import { MessageCircle, Users, Calendar, Clock, TrendingUp, Activity } from "lucide-svelte";
	import type { ConversationStats } from "$lib/types/types";

	interface Props {
		stats: ConversationStats;
		showDetailed?: boolean;
	}

	let { stats, showDetailed = false }: Props = $props();

	// Calcul des pourcentages pour les barres de progression
	const eventPercentage = $derived.by(() => {
		return stats.totalConversations > 0
			? Math.round((stats.eventConversations / stats.totalConversations) * 100)
			: 0;
	});

	const groupPercentage = $derived(() => {
		return stats.totalConversations > 0
			? Math.round((stats.groupConversations / stats.totalConversations) * 100)
			: 0;
	});

	const recentPercentage = $derived.by(() => {
		return stats.totalConversations > 0
			? Math.round((stats.recentConversations / stats.totalConversations) * 100)
			: 0;
	});

	// Calcul du taux d'activité
	const activityRate = $derived.by(() => {
		return stats.totalConversations > 0
			? Math.round((stats.recentConversations / stats.totalConversations) * 100)
			: 0;
	});

	// Fonction pour obtenir la couleur du taux d'activité
	const getActivityColor = (rate: number) => {
		if (rate >= 70) return "text-success";
		if (rate >= 40) return "text-warning";
		return "text-error";
	};

	// Fonction pour obtenir le texte du taux d'activité
	const getActivityText = (rate: number) => {
		if (rate >= 70) return "Très actif";
		if (rate >= 40) return "Modéré";
		return "Faible";
	};
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
	<!-- Total conversations -->
	<div class="stat bg-base-200 rounded-lg p-4">
		<div class="stat-figure text-primary">
			<MessageCircle class="h-8 w-8" />
		</div>
		<div class="stat-title text-sm">Total conversations</div>
		<div class="stat-value text-primary text-2xl font-bold">{stats.totalConversations}</div>
		{#if showDetailed}
			<div class="stat-desc mt-2 text-xs">Base de toutes les discussions</div>
		{/if}
	</div>

	<!-- Événements -->
	<div class="stat bg-base-200 rounded-lg p-4">
		<div class="stat-figure text-secondary">
			<Calendar class="h-8 w-8" />
		</div>
		<div class="stat-title text-sm">Événements</div>
		<div class="stat-value text-secondary text-2xl font-bold">{stats.eventConversations}</div>
		{#if showDetailed}
			<div class="stat-desc mt-2 text-xs">
				{eventPercentage}% du total
				<div class="bg-base-300 mt-1 h-1.5 w-full rounded-full">
					<div
						class="bg-secondary h-1.5 rounded-full transition-all duration-300"
						style="width: {eventPercentage}%"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Groupes -->
	<div class="stat bg-base-200 rounded-lg p-4">
		<div class="stat-figure text-accent">
			<Users class="h-8 w-8" />
		</div>
		<div class="stat-title text-sm">Groupes</div>
		<div class="stat-value text-accent text-2xl font-bold">{stats.groupConversations}</div>
		{#if showDetailed}
			<div class="stat-desc mt-2 text-xs">
				{groupPercentage}% du total
				<div class="bg-base-300 mt-1 h-1.5 w-full rounded-full">
					<div
						class="bg-accent h-1.5 rounded-full transition-all duration-300"
						style="width: {groupPercentage}%"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Activité récente -->
	<div class="stat bg-base-200 rounded-lg p-4">
		<div class="stat-figure text-info">
			<Clock class="h-8 w-8" />
		</div>
		<div class="stat-title text-sm">Actives aujourd'hui</div>
		<div class="stat-value text-info text-2xl font-bold">{stats.recentConversations}</div>
		{#if showDetailed}
			<div class="stat-desc mt-2 text-xs">
				{recentPercentage}% du total
				<div class="bg-base-300 mt-1 h-1.5 w-full rounded-full">
					<div
						class="bg-info h-1.5 rounded-full transition-all duration-300"
						style="width: {recentPercentage}%"
					></div>
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showDetailed}
	<!-- Statistiques détaillées supplémentaires -->
	<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Taux d'activité global -->
		<div class="bg-base-100 rounded-lg border p-4">
			<div class="mb-3 flex items-center gap-3">
				<Activity class="text-primary h-6 w-6" />
				<h3 class="font-semibold">Taux d'activité</h3>
			</div>

			<div class="mb-2 flex items-center justify-between">
				<span class="text-base-content/70 text-sm">Conversations actives</span>
				<span class="text-lg font-bold {getActivityColor(activityRate)}">{activityRate}%</span>
			</div>

			<div class="bg-base-300 h-2.5 w-full rounded-full">
				<div
					class="h-2.5 rounded-full transition-all duration-500 {activityRate >= 70
						? 'bg-success'
						: activityRate >= 40
							? 'bg-warning'
							: 'bg-error'}"
					style="width: {activityRate}%"
				></div>
			</div>

			<div class="text-base-content/60 mt-2 text-xs">
				<span class={getActivityColor(activityRate)}>{getActivityText(activityRate)}</span>
				- {stats.recentConversations} sur {stats.totalConversations} conversations
			</div>
		</div>

		<!-- Répartition par type -->
		<div class="bg-base-100 rounded-lg border p-4">
			<div class="mb-3 flex items-center gap-3">
				<TrendingUp class="text-primary h-6 w-6" />
				<h3 class="font-semibold">Répartition</h3>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Calendar class="text-secondary h-4 w-4" />
						<span class="text-sm">Événements</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">{stats.eventConversations}</span>
						<span class="text-base-content/60 text-xs">({eventPercentage}%)</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Users class="text-accent h-4 w-4" />
						<span class="text-sm">Groupes</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">{stats.groupConversations}</span>
						<span class="text-base-content/60 text-xs">({groupPercentage}%)</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<MessageCircle class="text-info h-4 w-4" />
						<span class="text-sm">Messages privés</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium"
							>{stats.totalConversations -
								stats.eventConversations -
								stats.groupConversations}</span
						>
						<span class="text-base-content/60 text-xs"
							>({100 - eventPercentage - groupPercentage}%)</span
						>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

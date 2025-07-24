<script lang="ts">
	import { userDb } from "$lib/shared/userDb.svelte";
	import { globalLogsStore } from "$lib/shared/globalLogsStore.svelte";
	import { globalMessagesStore } from "$lib/shared/globalMessagesStore.svelte";
	import { Calendar, Users, MessageSquare, Activity } from "lucide-svelte";
	import type { LogsResponse } from "$lib/types/pocketbase";

	// États réactifs locaux avec Svelte 5 runes
	let spaces = $derived(userDb.memberOf || []);

	// Données dérivées des nouveaux stores

	// Fonction pour formater les dates
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	// Fonction pour obtenir le message formaté d'un log
	function getLogMessage(log: LogsResponse): string {
		if (log.details && typeof log.details === "object" && "message" in log.details) {
			return log.details.message as string;
		}

		// Fallback basé sur l'action
		switch (log.action) {
			case "create_event":
				return `Nouvel événement créé`;
			case "event_confirmed":
				return `Événement confirmé`;
			case "sondage_proposed":
				return `Nouvelles dates proposées`;
			case "organizers_changed":
				return `Organisateurs modifiés`;
			default:
				return `Action: ${log.action}`;
		}
	}
</script>

<div class="container mx-auto max-w-7xl p-4 sm:p-8">
	{#if spaces.length > 0}
		<!-- En-tête avec titre principal -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold">Tableau de Bord</h1>
			<p class="text-base-content/70">Vue d'ensemble de votre activité dans tous vos espaces</p>
		</div>

		<!-- Section des invitations/sollicitations si il y en a -->
		<!-- {#if myInvitations.length > 0}
			<div class="alert alert-info mb-6">
				<Activity class="h-5 w-5" />
				<div>
					<h3 class="font-bold">
						Vous avez {myInvitations.length} sollicitation{myInvitations.length > 1 ? "s" : ""}
					</h3>
					<div class="text-sm">Vérifiez les événements qui nécessitent votre attention.</div>
				</div>
			</div>
		{/if} -->

		<div class="flex">
			<!-- Cartes des espaces -->
			{#each spaces as space (space.id)}
				{@const spaceMessages = globalMessagesStore.getMessagesForSpace(space.id)}
				{@const mySpaceLogs = globalLogsStore.getMyLogsBySpace(space.id)}
				{@const spaceGeneralActivity = globalLogsStore.getSpaceGeneralActivity(space.id)}

				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-6">
						<!-- En-tête de l'espace -->
						<div class="mb-4">
							<h2 class="card-title mb-1 text-lg">
								<a href="/dashboard/{space.name}" class="hover:text-primary transition-colors">
									{space.public_name}
								</a>
							</h2>
						</div>

						<div class="grid grid-cols-3 gap-8">
							<!-- Section "Pour vous" -->
							{#if mySpaceLogs.length > 0}
								<div class="mb-4">
									<h3 class="text-primary mb-2 flex items-center gap-2 font-semibold">
										<Users class="h-4 w-4" />
										Pour vous
									</h3>
									<div class="space-y-2">
										<!-- Logs personnels -->
										{#each mySpaceLogs.slice(0, 10) as log (log.id)}
											<div class="bg-base-200 rounded p-2 text-sm">
												<div class="mb-1 flex items-center gap-2">
													<Activity class="h-3 w-3" />
													<span class="text-xs opacity-60">{formatDate(log.created)}</span>
												</div>
												<p class="text-xs leading-relaxed">{getLogMessage(log)}</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Section "Activité de l'espace" -->
							{#if spaceGeneralActivity.length > 0}
								<div class="mb-4">
									<h3 class="text-secondary mb-2 flex items-center gap-2 font-semibold">
										<Calendar class="h-4 w-4" />
										Activité de l'espace
									</h3>
									<div class="space-y-2">
										{#each spaceGeneralActivity.slice(0, 10) as log (log.id)}
											<div class="bg-base-200 rounded p-2 text-sm">
												<div class="mb-1 flex items-center gap-2">
													<Activity class="h-3 w-3" />
													<span class="text-xs opacity-60">{formatDate(log.created)}</span>
												</div>
												<p class="text-xs leading-relaxed">{getLogMessage(log)}</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Section "Derniers Messages" -->
							<div class="mb-4">
								<h3 class="text-accent mb-2 flex items-center gap-2 font-semibold">
									<MessageSquare class="h-4 w-4" />
									Derniers Messages
								</h3>
								{#if spaceMessages.length > 0}
									<div class="space-y-2">
										{#each spaceMessages.slice(0, 5) as message (message.id)}
											<div class="bg-base-200 rounded p-2 text-sm">
												<div class="mb-1 flex items-center gap-2">
													<MessageSquare class="h-3 w-3" />
													<span class="text-xs font-medium">Message</span>
													<span class="text-xs opacity-60">{formatDate(message.created)}</span>
												</div>
												<p class="text-xs leading-relaxed">{message.content.slice(0, 80)}...</p>
											</div>
										{/each}
									</div>
								{:else}
									<div class="bg-base-200 rounded p-2 text-sm">
										<div class="mb-1 flex items-center gap-2">
											<MessageSquare class="h-3 w-3" />
											<span class="text-xs opacity-60"
												>Aucun message dans les discussions/événement auxquels vous participez
											</span>
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						<div class="card-actions mt-4 justify-end">
							<a href="/dashboard/{space.name}" class="btn btn-primary btn-sm"> Voir l'espace </a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Message d'alerte si aucun espace n'est trouvé -->
		<div class="flex min-h-[50vh] items-center justify-center">
			<div role="alert" class="alert alert-info max-w-md">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="h-6 w-6 shrink-0 stroke-current"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path></svg
				>
				<span>Vous n'êtes membre d'aucun espace pour le moment.</span>
			</div>
		</div>
	{/if}
</div>

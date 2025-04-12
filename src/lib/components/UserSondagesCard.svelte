<script lang="ts">
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import type { EventType } from '$lib/types/event';
	import { lisibleDate } from '$lib/utils';
	import { getContext } from 'svelte';
	import { PencilLine, BadgeHelp, ThumbsUp, ThumbsDown } from 'lucide-svelte';
	import type { UserType } from '$lib/types/types';
	import { updateEvent } from '$lib/pocketbase.svelte';

	let { events } = $props<{
		events: EventType[];
	}>();

	let currentUser: UserType = getContext('currentUser');

	// Trouve la réponse de l'utilisateur pour un événement spécifique
	const getUserResponse = (event: EventType) => {
		if (!event.dates_proposed?.length) return null;

		for (const date of event.dates_proposed) {
			const userResponse = date.organizers?.find((org) => org.id === currentUser.id);
			if (userResponse) {
				return {
					date: date.dateStart,
					response: userResponse.maybehere
				};
			}
		}
		return null;
	};

	// Retourne les classes et l'icône pour le badge de réponse
	const getResponseBadge = (response: string | undefined) => {
		if (!response) return null;
		switch (response) {
			case 'oui':
				return { class: 'badge-success', icon: ThumbsUp, text: 'Dispo' };
			case 'peut-être':
				return { class: 'badge-warning', icon: BadgeHelp, text: 'Peut-être' };
			case 'non':
				return { class: 'badge-error', icon: ThumbsDown, text: 'Indispo' };
			default:
				return null;
		}
	};

	// Retire la réponse de l'utilisateur pour un événement spécifique
	const removeResponse = (event: EventType) => {
		if (!event.dates_proposed?.length) return;

		// Crée une nouvelle version de dates_proposed sans la réponse de l'utilisateur
		const updatedDatesProposed = event.dates_proposed.map((date) => ({
			...date,
			// Filtre l'organisateur correspondant à l'utilisateur courant
			organizers: date.organizers?.filter((org) => org.id !== currentUser.id) ?? []
		}));

		// Ouvre une modale de confirmation
		modalState.confirm = {
			isOpen: true,
			data: {
				title: 'Retirer votre réponse',
				message: `Voulez-vous vraiment retirer votre réponse pour l'événement "${event.event_title}" ?`,
				onConfirm: () => updateEvent(event.id, { dates_proposed: updatedDatesProposed }),
				variant: 'warning'
			}
		};
	};
</script>

<div class="bg-base-100 overflow-hidden rounded-lg border shadow-md">
	<div class="space-y-2 p-4">
		<!-- En-tête de la carte -->
		<div class="border-b pb-2">
			<h2 class=" text-xl font-bold">Sondages auxquels vous avez répondu</h2>
		</div>

		<!-- Liste des événements de type sondage -->
		{#if events.length > 0}
			<div class="space-y-3 pt-2">
				{#each events as event (event.id)}
					{@const userResponseDetails = getUserResponse(event)}
					{@const badge = getResponseBadge(userResponseDetails?.response)}
					{@const Icon = badge?.icon}
					<div class="flex items-start justify-between border-b pb-2 last:border-b-0 last:pb-0">
						<div class="flex-1 pr-2">
							<div class="text-fluid-lg font-semibold">{event.event_title}</div>
							{#if userResponseDetails}
								<div class="text-sm">
									<span>Votre réponse pour le: </span>
									<span class="font-medium">
										{lisibleDate(new Date(userResponseDetails.date))}
									</span>
									{#if badge}
										<div class="badge badge-sm badge-outline ml-2 {badge.class}">
											<Icon size={14} />
											{badge.text}
										</div>
									{/if}
								</div>
							{:else}
								<!-- Fallback si la réponse n'est pas trouvée (ne devrait pas arriver avec le filtre actuel) -->
								<span class="text-warning text-sm">Réponse non trouvée</span>
							{/if}
							<button
								onclick={() => removeResponse(event)}
								class="btn btn-link btn-xs text-error p-0"
							>
								Retirer ma réponse
							</button>
						</div>

						<!-- Bouton Modifier -->
						<div class="flex-none">
							<button
								onclick={() => {
									eventState.is = event;
									modalState.event = true;
								}}
								class="btn btn-square btn-ghost btn-sm"
								aria-label="Modifier l'événement {event.event_title}"
							>
								<PencilLine class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-gray-500">Vous n'avez répondu à aucun sondage pour le moment.</p>
		{/if}
	</div>
</div>

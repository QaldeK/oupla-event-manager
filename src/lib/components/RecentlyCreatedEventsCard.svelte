<script lang="ts">
	import type { EventType } from "$lib/types/event.types";
	import { formatDistance } from "date-fns";
	import { fr } from "date-fns/locale";
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { lisibleDateShort } from "$lib/utils";
	import {
		Pencil,
		Calendar,
		Clock,
		CalendarCheck2,
		CalendarSync,
		CalendarSearch,
		CalendarX
	} from "lucide-svelte";

	interface Props {
		events: EventType[];
	}

	let { events }: Props = $props();

	let hasMoreEvents = $derived(eventsStore.hasMoreRecentEvents);

	const formatCreatedDate = (created: string) => {
		return formatDistance(new Date(created), new Date(), {
			addSuffix: true,
			locale: fr
		});
	};

	const getEventDate = (event: EventType) => {
		const eventDate = event.dateStart || event.date_event;
		if (event.isSondage) {
			return "Sondage en cours";
		} else if (event.isMasterRecurrent) {
			return "récurrent";
		} else if (!eventDate) {
			return "à définir";
		}

		return lisibleDateShort(new Date(eventDate));
	};

	const getCalendarIcon = (event: EventType) => {
		if (event.isConfirmed) return CalendarCheck2;
		if (event.isMasterRecurrent) return CalendarSync;
		if (event.isSondage) return CalendarSearch;
		if (event.date_event) return Calendar;
		return CalendarX;
	};

	const getCalendarIconClass = (event: EventType) => {
		if (event.isConfirmed) return "bg-success/10 p-3 rounded-lg text-content-success";
		if (!event.isConfirmed && event.date_event)
			return "bg-warning/10 rounded-lg text-content-warning p-3";
		return "";
	};

	const getTimeRange = (event: EventType) => {
		if (event.start_public && event.time_end) {
			return `${event.start_public} - ${event.time_end}`;
		} else if (event.time_start && event.time_end) {
			return `${event.time_start} - ${event.time_end}`;
		}
		return "";
	};

	const editEvent = (event: EventType) => {
		eventState.is = event;
		modalState.event = true;
	};
</script>

<div class="card bg-base-100 @container shadow-xl">
	<div class="@lg:card-body px-2 py-4">
		<div class="card-title text-fluid-xl">
			<Clock />
			Derniers événements créés
		</div>

		{#if events.length === 0}
			<div class="py-8 text-center">
				<p class="text-base-content/70">Aucun événement récent trouvé</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each events as event (event.id)}
					{@const timeRange = getTimeRange(event)}
					{@const CalendarIconComponent = getCalendarIcon(event)}
					{@const colorClass = getCalendarIconClass(event)}
					<div class="hover:bg-base-200 flex gap-4 rounded-lg p-2 transition-colors">
						<!-- Info principale de l'événement -->
						<div class="flex flex-1 basis-2/3 flex-col gap-1">
							<div class="text-base font-medium">{event.event_title}</div>

							<!-- Catégories -->
							{#if event.categories && event.categories.length > 0}
								<div class="text-sm">
									{#each event.categories as category, index (category)}
										<span class="text-primary font-medium uppercase">
											{category}{index < event.categories.length - 1 ? ", " : ""}
										</span>
									{/each}
								</div>
							{/if}
							<!-- Date de création -->
							{#if event.created}
								<div class="text-base-content/60 text-sm">
									Créé {formatCreatedDate(event.created)}
								</div>
							{/if}
						</div>

						<!-- Date et horaires + Bouton -->
						<div class="flex gap-x-4 gap-y-2 @max-lg:flex-col @max-lg:justify-between">
							<!-- Date et horaires -->
							<div
								class="text-base-content/70 text-fluid-xs flex flex-col flex-wrap gap-y-1 place-self-start {colorClass} "
							>
								<div class="items-top flex gap-1">
									<CalendarIconComponent size={18} />
									<span class="">{getEventDate(event)}</span>
								</div>

								<div>
									{#if timeRange}
										<div class="items-top flex gap-1">
											<Clock size={16} />
											<span class="">{timeRange}</span>
										</div>
									{/if}
								</div>
							</div>

							<!-- Bouton d'édition -->
							<button
								onclick={() => editEvent(event)}
								class="btn btn-square btn-sm @max-lg:self-end"
								title="Éditer l'événement"
							>
								<Pencil size={16} />
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if hasMoreEvents}
				<div class="card-actions mt-4 justify-center">
					<button class="btn btn-outline btn-sm" onclick={eventsStore.loadMoreRecentEvents}>
						Voir plus d'événements
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

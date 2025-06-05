<script lang="ts">
	import {
		calculateConflicts,
		type ConflictResult,
		ConflictCalculator
	} from "$lib/services/conflictService.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { format } from "date-fns";
	import { fr } from "date-fns/locale";
	import { isValidDate } from "$lib/utils";
	import type { EventType } from "$lib/types/event.types";

	// 👉 Props pour les deux modes
	let {
		// Mode "realtime" (EventModal)
		eventId,
		startDate,
		endDate,
		rooms,
		conflictCalculator,

		// Mode "cached" (EventCard, Dashboard)
		currentEvent,
		mode = "realtime"
	} = $props<{
		// Mode realtime
		eventId?: string;
		startDate?: Date | null;
		endDate?: Date | null;
		rooms?: string[];
		conflictCalculator?: ConflictCalculator;

		// Mode cached
		currentEvent?: EventType;
		mode?: "realtime" | "cached";
	}>();

	let isExpanded = $state(false);

	$effect(() => {
		if (mode === "realtime" && conflictCalculator) {
			conflictCalculator.updateOptions({
				eventId,
				startDate,
				endDate,
				rooms: rooms || [],
				includeCloseEvents: true
			});
		}
	});

	// 👉 Logique selon le mode
	const conflictResult = $derived.by(() => {
		if (mode === "cached" && currentEvent?.inConflictWith?.length) {
			// Mode cached : utiliser inConflictWith
			return getCachedConflicts(currentEvent);
		} else if (mode === "realtime" && conflictCalculator) {
			return conflictCalculator.result;
		}
		// Pas de conflits
		return {
			conflicts: [],
			hasConfirmedConflicts: false,
			confirmedConflicts: [],
			realConflicts: [],
			conflictIds: []
		};
	});

	// 👉 Fonction pour récupérer les conflits cachés
	function getCachedConflicts(event: EventType): ConflictResult {
		if (!event.inConflictWith?.length || !eventsStore.isInitialized) {
			return {
				conflicts: [],
				hasConfirmedConflicts: false,
				confirmedConflicts: [],
				realConflicts: [],
				conflictIds: []
			};
		}

		// Récupérer les événements en conflit depuis le store
		const conflictEvents = event.inConflictWith
			.map((id) => eventsStore.getEventById(id))
			.filter((e) => e != null);

		// Convertir en format Conflict pour l'affichage
		const conflicts = conflictEvents.map((conflictEvent) => ({
			id: conflictEvent.id,
			event_title: conflictEvent.event_title,
			time_start: conflictEvent.time_start || "??:??",
			time_end: conflictEvent.time_end || "??:??",
			rooms: conflictEvent.rooms || [],
			conflictType: conflictEvent.isConfirmed ? "confirmed" : "unconfirmed",
			hasSameRoom: hasSharedRoom(event.rooms || [], conflictEvent.rooms || []),
			date_event: conflictEvent.date_event || "",
			isConfirmed: conflictEvent.isConfirmed || false,
			organizers: conflictEvent.organizers || [],
			sourceEventId: event.id
		}));

		const confirmedConflicts = conflicts.filter((c) => c.conflictType === "confirmed");
		const realConflicts = conflicts.filter((c) => c.conflictType === "confirmed" && c.hasSameRoom);

		return {
			conflicts,
			hasConfirmedConflicts: confirmedConflicts.length > 0,
			confirmedConflicts,
			realConflicts,
			conflictIds: conflicts.map((c) => c.id)
		};
	}

	function hasSharedRoom(rooms1: string[], rooms2: string[]): boolean {
		return rooms1.some((room) => rooms2.includes(room));
	}

	// Dérivations pour l'affichage
	const conflicts = $derived(conflictResult.conflicts);
	const realConflicts = $derived(conflictResult.realConflicts);
	const hasRealConflict = $derived({
		value: realConflicts.length > 0,
		type: realConflicts[0]?.conflictType
	});

	const formatDateForDisplay = (dateObj: Date | string | null) => {
		let date: Date | null = null;

		if (typeof dateObj === "string") {
			date = new Date(dateObj);
		} else if (dateObj instanceof Date) {
			date = dateObj;
		}

		if (date && isValidDate(date)) {
			try {
				return format(date, "EEE d MMMM", { locale: fr });
			} catch {
				return "date invalide";
			}
		}
		return "date inconnue";
	};

	const dateOfConflict = $derived.by(() => {
		if (mode === "cached" && currentEvent?.date_event) {
			return formatDateForDisplay(currentEvent.date_event);
		}
		return formatDateForDisplay(startDate);
	});

	const getConflictColor = (conflictType: string) => {
		switch (conflictType) {
			case "confirmed":
				return "text-error";
			case "unconfirmed":
				return "text-orange-500";
			case "sondage":
				return "text-gray-500";
			case "close-confirmed":
			case "close-unconfirmed":
				return "text-gray-500";
			default:
				return "text-gray-500";
		}
	};

	const getConflictTypeMsg = (conflictType: string) => {
		switch (conflictType) {
			case "confirmed":
				return "événement confirmé";
			case "unconfirmed":
				return "événement non confirmé";
			case "sondage":
				return "date proposé dans un sondage";
			case "close-confirmed":
				return "événement proche confirmé";
			case "close-unconfirmed":
				return "événement proche non confirmé";
			default:
				return "";
		}
	};
	const getRoomMsg = (hasSameRoom: boolean, rooms: string[] | undefined) => {
		// Si les salles sont undefined ou vides
		if (!rooms || rooms.length === 0 || (rooms.length === 1 && rooms[0] === "")) {
			return { msg: "- salle non précisée", style: "" };
		}

		// Si les événements partagent une salle
		if (hasSameRoom) {
			return { msg: `au même endroit : ${rooms.join(", ")}`, style: "font-semibold" };
		}

		// Si l'événement a des salles
		return { msg: `- salle: ${rooms.join(", ")}`, style: "" };
	};
</script>

{#if conflicts.length > 0}
	<div
		class="bg-warning/20 border-warning text-fluid-sm cursor-pointer items-center gap-1 rounded-xl border-2 p-2 px-4 text-gray-500 hover:text-gray-700"
		onclick={() => (isExpanded = !isExpanded)}
		onkeydown={(e) => e.key === "Enter" && (isExpanded = !isExpanded)}
		role="button"
		tabindex="0"
	>
		<div class="space-y-1">
			<div class="flex flex-wrap justify-between">
				<div class="text-fluid-sm text-gray-600 italic">
					D'autres événements sont prévus le {dateOfConflict}...
				</div>
				{#if conflicts.length > realConflicts.length}
					<div class="flex items-center text-orange-600 hover:text-orange-800">
						{#if !isExpanded}
							+ {conflicts.length - realConflicts.length} conflits potentiels...
						{:else}
							réduire
						{/if}
						<svg
							class={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</div>
				{/if}
			</div>

			{#if !isExpanded && hasRealConflict.value}
				<ul class="ms-2">
					{#each realConflicts as conflict, index (conflict.id + index)}
						<li
							class={`text-fluid-sm flex flex-wrap items-baseline gap-1 ${getConflictColor(
								conflict.conflictType
							)}`}
						>
							<div class="font-bold">{conflict.event_title} :</div>
							<div class="italic">{getConflictTypeMsg(conflict.conflictType)}</div>
							<div class="">
								de {conflict.time_start} à {conflict.time_end}
								<span class={getRoomMsg(conflict.hasSameRoom, conflict.rooms).style}
									>{getRoomMsg(conflict.hasSameRoom, conflict.rooms).msg}</span
								>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if isExpanded}
			<ul class="ms-2">
				{#each conflicts as conflict, index (conflict.id + index)}
					<li
						class={`text-fluid-sm flex flex-wrap items-baseline gap-1 ${getConflictColor(conflict.conflictType)}`}
					>
						<div class="font-bold">{conflict.event_title} :</div>
						<div class="italic">{getConflictTypeMsg(conflict.conflictType)}</div>
						<div class="">
							de {conflict.time_start} à {conflict.time_end}
							<span class={getRoomMsg(conflict.hasSameRoom, conflict.rooms).style}
								>{getRoomMsg(conflict.hasSameRoom, conflict.rooms).msg}</span
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

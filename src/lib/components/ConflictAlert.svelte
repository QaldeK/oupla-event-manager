<script lang="ts">
	import { type ConflictResult, ConflictCalculator } from "$lib/services/conflictService.svelte";
	import type { ConflictType } from "$lib/services/eventConflicts";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import type { EventType } from "$lib/types/event.types";
	import { isValidDate } from "$lib/utils";
	import { format } from "date-fns";
	import { fr } from "date-fns/locale";
	import { TriangleAlert } from "lucide-svelte";

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
		mode = "realtime",
		showOnlyLevel = "all"
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
		showOnlyLevel?: "all" | "confirmed" | "real";
	}>();

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
			conflictType: (conflictEvent.isConfirmed ? "confirmed" : "unconfirmed") as ConflictType,
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

	const getConflictColor = (conflictType: ConflictType, hasSameRoom: boolean) => {
		// 👉 Orange uniquement si l'événement est confirmé ET a des salles communes/identiques
		if (conflictType === "confirmed" && hasSameRoom) {
			return "text-orange-500";
		}
		return "text-gray-700";
	};

	const getConflictTypeMsg = (conflictType: ConflictType) => {
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

	// 👉 Détermine si l'alerte doit être affichée selon le niveau demandé
	const shouldShowAlert = $derived.by(() => {
		switch (showOnlyLevel) {
			case "real":
				return realConflicts.length > 0;
			case "confirmed":
				return conflictResult.confirmedConflicts.length > 0;
			case "all":
			default:
				return conflicts.length > 0;
		}
	});
</script>

{#if shouldShowAlert}
	<div
		class="text-fluid-sm items-center gap-1 p-2 px-4 text-gray-500 {hasRealConflict.value
			? 'bg-warning/10 border-warning border-1'
			: 'bg-base-200'} @md:rounded-xl"
	>
		<div class="space-y-2">
			<div class="text-fluid-sm flex items-center gap-2 text-gray-600 italic">
				<TriangleAlert size={16} /> D'autres événements sont prévus le {dateOfConflict}...
			</div>

			<ul class="ms-2">
				{#each conflicts as conflict, index (conflict.id + index)}
					<li
						class={`text-fluid-sm  items-baseline gap-1 ${getConflictColor(conflict.conflictType, conflict.hasSameRoom)}`}
					>
						<span class="font-bold">• {conflict.event_title} :</span>
						<span class="italic">{getConflictTypeMsg(conflict.conflictType)}</span>
						<span class="">
							de {conflict.time_start} à {conflict.time_end}
							<span class={getRoomMsg(conflict.hasSameRoom, conflict.rooms).style}
								>{getRoomMsg(conflict.hasSameRoom, conflict.rooms).msg}</span
							>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

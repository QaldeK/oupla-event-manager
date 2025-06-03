<script lang="ts">
	import { findConflictsForEvent, type Conflict } from "$lib/services/eventConflicts";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { isValidDate } from "$lib/utils";
	import { format } from "date-fns";
	import { fr } from "date-fns/locale";

	let { eventId, startDate, endDate, rooms } = $props<{
		eventId?: string;
		startDate: Date | null;
		endDate: Date | null;
		rooms: string[];
	}>();

	let isExpanded = $state(false);

	const conflicts = $derived.by<Conflict[]>(() => {
		// 1. Vérifier que les dates d'entrée sont des objets Date valides
		if (
			!startDate ||
			!endDate ||
			!isValidDate(startDate) ||
			!isValidDate(endDate) ||
			!eventsStore.isInitialized
		) {
			return [];
		}

		// 3. Obtenir la clé de date (YYYY-MM-DD) pour la map (utilise l'objet Date reçu)
		let dateKey: string;
		try {
			dateKey = format(startDate, "yyyy-MM-dd");
		} catch {
			console.error("ConflictAlert: Error formatting dateKey from startDate", { startDate });
			return [];
		}

		// 4. Récupérer les EventTimeInfo pour cette date depuis le store
		const eventsOnDate = eventsStore.eventTimeInfoMap.get(dateKey) || [];

		// 5. Appeler le service de détection de conflits (utilise les objets Date directement)
		try {
			return findConflictsForEvent(
				startDate, // Objet Date direct
				endDate, // Objet Date direct
				rooms,
				eventsOnDate,
				{
					excludeEventId: eventId,
					includeCloseEvents: true
				}
			);
		} catch (error) {
			console.error("ConflictAlert: Error calling findConflictsForEvent", error);
			return [];
		}
	});

	// Filtrer les conflits réels (directs ou avec même salle)
	const realConflicts = $derived(
		conflicts.filter(
			(conflict) =>
				// Conflits directs
				conflict.conflictType === "confirmed" && conflict.hasSameRoom
		)
	);

	const hasRealConflict = $derived({
		value: realConflicts.length > 0,
		type: realConflicts[0]?.conflictType
	});

	const formatDateForDisplay = (dateObj: Date | null) => {
		if (dateObj && isValidDate(dateObj)) {
			try {
				return format(dateObj, "EEE d MMMM", { locale: fr });
			} catch {
				return "date invalide";
			}
		}
		return "date inconnue"; // Fallback
	};

	const dateOfConflict = formatDateForDisplay(startDate);

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
		class="bg-warning/20 text-fluid-sm cursor-pointer items-center gap-1 rounded-xl p-2 px-4 text-gray-500 hover:text-gray-700"
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

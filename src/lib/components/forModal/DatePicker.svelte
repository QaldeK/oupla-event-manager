<script lang="ts">
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import flatpickr from "flatpickr";
	import "flatpickr/dist/flatpickr.css";
	import { French } from "flatpickr/dist/l10n/fr.js";
	import type { Instance } from "flatpickr/dist/types/instance";
	import confirmDatePlugin from "flatpickr/dist/plugins/confirmDate/confirmDate";
	import "flatpickr/dist/plugins/confirmDate/confirmDate.css";

	import tippy, { type Instance as TippyInstance } from "tippy.js"; // Importer le type Instance
	import "tippy.js/dist/tippy.css";

	import { type EventConflictInfo } from "$lib/types/types";

	import { CalendarX2 } from "lucide-svelte";

	interface Props {
		initialValue?: string | string[]; // Type pour single et multiple modes
		onChange?: (newValue: string | string[]) => void;
		onResetDate?: () => void;
		mode?: "single" | "multiple";
		validation?: boolean; // pour le bouton "ok", en plus du mode multiple
		position?: string;
		resetButton?: boolean;
		placeholder?: string;
		label?: string;
		eventId?: string;
		enableTime?: boolean;
		time_24hr?: boolean;
		defaultHour?: number;
		activeSelectionDates?: string[];
		inline?: boolean; // toujours déplié
	}

	let {
		initialValue = $bindable(),
		onChange = (newValue: string | string[]) => {},
		onResetDate = () => {},
		mode = "single", // 'single' or 'multiple'
		validation = true, // pour le bouton "ok" dans le mode multiple
		position = "auto",
		resetButton = false,
		placeholder = "Selectionnez une date",
		label = "Ajoutez des dates",
		eventId = undefined,
		enableTime = false,
		time_24hr = true,
		defaultHour = 18,
		activeSelectionDates = [],
		inline = false
	}: Props = $props();

	let fp: Instance | null = null;
	let dpId = $derived(eventId ?? crypto.randomUUID().substring(0, 8));
	let dateInput: HTMLInputElement | undefined;
	const eventsByDateTime = $derived(eventsStore.getEventsByDateTime);
	// $inspect("eventsByDateTime", eventsByDateTime);

	let tippyInstances: TippyInstance[] = [];

	// $effect(() => {
	// 	const currentValue = initialValue; // Utiliser la prop
	// 	if (!fp || currentValue === undefined) return;

	// 	// Obtenir les dates actuellement sélectionnées DANS flatpickr (format Y-m-d)
	// 	const fpSelectedDatesStr = fp.selectedDates
	// 		.map((d) => fp!.formatDate(d, "Y-m-d"))
	// 		.sort()
	// 		.join(",");

	// 	// Formatter la valeur de la prop en chaîne comparable (format Y-m-d)
	// 	let propValueStr = "";
	// 	if (mode === "single" && typeof currentValue === "string") {
	// 		propValueStr = currentValue;
	// 	} else if (mode === "multiple" && Array.isArray(currentValue)) {
	// 		propValueStr = [...currentValue].sort().join(",");
	// 	}

	// 	// Comparer et mettre à jour SEULEMENT si différent pour éviter les boucles
	// 	if (fpSelectedDatesStr !== propValueStr) {
	// 		console.log("Syncing prop value to flatpickr:", currentValue);
	// 		fp.setDate(currentValue ?? (mode === "multiple" ? [] : ""), false); // Mettre à jour sans déclencher onChange
	// 		fp.redraw();
	// 	}
	// });

	$effect(() => {
		if (!dateInput) return;

		fp = flatpickr(dateInput as HTMLInputElement, {
			defaultDate: initialValue ? initialValue : mode === "multiple" ? [] : null,
			dateFormat: "Y-m-d",
			altInput: true,
			altFormat: "l j F Y",
			locale: French,
			minDate: "today",
			static: true,
			allowInvalidPreload: true,
			mode,
			enableTime,
			time_24hr,
			defaultHour,
			position: position,
			inline,
			closeOnSelect: mode === "single",
			plugins:
				mode === "multiple" && validation
					? [
							confirmDatePlugin({
								confirmText: "OK",
								showAlways: true
							})
						]
					: [],
			onDayCreate: (dObj, dStr, fp, dayElem) => {
				const dateStr = fp.formatDate(dayElem.dateObj, "Y-m-d");
				const eventsForDate = eventsByDateTime.get(dateStr);
				if (eventsForDate?.length) {
					const classes = determineEventClass(
						eventsForDate,
						dateStr,
						activeSelectionDates,
						eventId
					);
					dayElem.classList.add(...classes.split(" "));

					dayElem.setAttribute("data-tippy-content", createTooltipContent(eventsForDate));

					const markersContainer = document.createElement("div");
					markersContainer.classList.add("event-markers-container");

					const eventTypes = new Set(eventsForDate.map((event) => event.conflictType));
					eventTypes.forEach((type) => {
						// Option: Ne pas créer de marqueur 'sondage' si la classe 'proposed-by-current-event' est déjà appliquée?
						const isCurrentEventSondage =
							classes.includes("proposed-by-current-event") && type === "sondage";
						if (!isCurrentEventSondage) {
							// N'ajoute le marqueur que s'il ne s'agit pas du sondage de l'événement actuel
							const marker = document.createElement("span");
							marker.classList.add("event-marker", type);
							markersContainer.appendChild(marker);
						}
					});
					dayElem.appendChild(markersContainer);
				}
			},
			onChange: (selectedDates, dateStr, instance) => {
				if (mode === "single") {
					if (enableTime) {
						onChange(selectedDates[0]?.toISOString() ?? "");
					} else {
						onChange(dateStr);
					}
				} else {
					// Pour 'multiple', selectedDates contient les objets Date
					if (enableTime) {
						const values = selectedDates.map((date) => date.toISOString());
						onChange(values);
					} else {
						const values = selectedDates.map((date) => instance.formatDate(date, "Y-m-d"));
						onChange(values);
					}
				}
			},
			onMonthChange: (selectedDates, dateStr, instance) => {
				setTimeout(() => {
					setupTooltips(instance.calendarContainer);
				}, 0); // setTimeout 0 pour s'assurer que le DOM est mis à jour
			},
			onReady: (selectedDates, dateStr, instance) => {
				setupTooltips(instance.calendarContainer); // Appliquer Tippy initialement
			}
		});

		return () => {
			tippyInstances.forEach((instance) => instance.destroy());
			tippyInstances = [];
			fp?.destroy();
			fp = null;
		};
	});

	function resetDate() {
		onResetDate();
		onChange(mode === "single" ? "" : []);
		fp?.clear();
	}

	function setupTooltips(container: HTMLElement | undefined) {
		if (!container) return;
		// Détruire les anciennes instances
		tippyInstances.forEach((instance) => instance.destroy());
		// Cibler les éléments avec l'attribut dans le conteneur du calendrier
		tippyInstances = tippy(container.querySelectorAll("[data-tippy-content]"), {
			zIndex: 1000000,
			allowHTML: true,
			// Autres options Tippy si nécessaire (placement, theme, etc.)
			placement: "bottom",
			appendTo: () => document.body // Force l'ajout au body pour éviter le clipping
		});
		if (!Array.isArray(tippyInstances)) {
			// tippy peut retourner une seule instance ou un tableau
			tippyInstances = tippyInstances ? [tippyInstances] : [];
		}
	}

	function createTooltipContent(events: EventConflictInfo[]): string {
		return events
			.map((event) => {
				const organizers = event.organizers.map((org) => org.username).join(", ") || "N/A";
				// Utiliser <br> pour les sauts de ligne dans Tippy avec allowHTML: true
				return `• ${event.event_title} (${organizers})<br>&nbsp;&nbsp;${event.time_start}-${event.time_end} (${event.conflictType})<br>&nbsp;&nbsp;Salles: ${event.rooms.join(", ") || "N/A"}`;
			})
			.join("<br><br>"); // Double saut de ligne HTML
	}

	function determineEventClass(
		events: EventConflictInfo[],
		dayDateStr: string,
		currentSelection: string[],
		currentEventId: string | undefined // Recevoir l'ID de l'événement courant
	) {
		const classes = [];
		const isOnSelectedDate = currentSelection.includes(dayDateStr);
		let hasConflictFromOtherEvent = false;
		let isProposedByCurrent = false;

		// Identifier si une proposition de l'événement actuel existe pour ce jour
		const currentEventProposal = events.find(
			(event) => event.id === currentEventId && event.conflictType === "sondage"
		);
		if (currentEventProposal) {
			isProposedByCurrent = true;
			classes.push("proposed-by-current-event"); // Classe pour la bordure bleue
		}

		// Identifier les conflits d'autres événements ou d'autres types pour les marqueurs/styles restants
		const otherConflicts = events.filter(
			(event) => event.id !== currentEventId || event.conflictType !== "sondage"
		);
		const otherConflictTypes = new Set(otherConflicts.map((event) => event.conflictType));

		if (otherConflicts.length > 0) {
			hasConflictFromOtherEvent = true;
			otherConflictTypes.forEach((type) => classes.push(`has-${type}`));
			if (otherConflicts.length === 1 && !isProposedByCurrent) {
				// Si SEUL conflit est d'un autre event
				classes.push(`single-${otherConflicts[0].conflictType}-event`);
			}
		}

		// Gérer le style si le jour est sélectionné par l'utilisateur
		if (isOnSelectedDate) {
			if (hasConflictFromOtherEvent || isProposedByCurrent) {
				// S'il y a un conflit (autre ou proposition actuelle) ET que c'est sélectionné
				classes.push("conflict-on-selected");
			}
		}

		// Ajouter une classe générique si un conflit *autre* que la proposition actuelle existe
		if (hasConflictFromOtherEvent) {
			classes.push("has-conflict");
		}

		return classes.join(" ");
	}
</script>

<div class="flex flex-1 items-end gap-x-4">
	<div class="flex flex-1 flex-col gap-y-1">
		<label for={dpId} class="text-fluid-sm block">
			{label}
		</label>
		<input
			bind:this={dateInput}
			id={dpId}
			type="text"
			class="input input-bordered {inline && 'hidden'} min-w-60 sm:min-w-92"
			{placeholder}
			readonly
		/>
	</div>
	{#if mode === "single" && initialValue !== "" && resetButton}
		<button type="button" class="btn btn-error btn-outline" onclick={resetDate}>
			<CalendarX2 />
		</button>
	{/if}
</div>

<style>
	:global(.flatpickr-day) {
		position: relative;
	}

	:global(.event-markers-container) {
		position: absolute;
		bottom: 2px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 2px;
		pointer-events: none;
	}

	:global(.event-marker) {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 1px;
		opacity: 1;
		transition: opacity 0.2s ease;
	}

	:global(.flatpickr-day.proposed-by-current-event) {
		border: 2px solid var(--color-accent);
	}

	/* Couleurs des marqueurs */
	:global(.has-confirmed .event-marker.confirmed) {
		background-color: var(--color-success);
	}

	:global(.has-unconfirmed .event-marker.unconfirmed) {
		background-color: var(--color-warning);
	}

	:global(.has-sondage .event-marker.sondage) {
		background-color: var(--color-neutral);
	}

	/* Cas simples */
	:global(.single-confirmed-event .event-marker) {
		background-color: var(--color-success);
	}

	:global(.single-unconfirmed-event .event-marker) {
		background-color: var(--color-warning);
	}

	:global(.single-sondage-event .event-marker) {
		background-color: var(--color-neutral);
	}

	/* Interactions */
	:global(.flatpickr-day:hover .event-marker) {
		opacity: 0.8;
	}
</style>

<script lang="ts">
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import flatpickr from "flatpickr";
	import "flatpickr/dist/flatpickr.css";
	import { French } from "flatpickr/dist/l10n/fr.js";
	import tippy from "tippy.js";
	import "tippy.js/dist/tippy.css";
	import { type EventConflictInfo } from "$lib/types/types";

	let { value = $bindable(), label = "", placeholder = "Selectionnez une date" } = $props();

	// Génération automatique d'un ID unique
	const uniqueId = `datepicker-${Math.random().toString(36).substring(2, 9)}`;

	let fp: any;
	let dateInput: HTMLInputElement;
	const eventsByDateTime = $derived(eventsStore.getEventsByDateTime);

	$effect(() => {
		fp = flatpickr(dateInput, {
			dateFormat: "l j F Y",
			locale: French,
			minDate: "today",
			mode: "single",
			onDayCreate: (dObj, dStr, fp, dayElem) => {
				const dateStr = fp.formatDate(dayElem.dateObj, "Y-m-d");
				const eventsForDate = eventsByDateTime.get(dateStr);

				// Filtrer uniquement les événements confirmés
				const confirmedEvents =
					eventsForDate?.filter((event) => event.conflictType === "confirmed") || [];

				if (confirmedEvents.length) {
					dayElem.setAttribute("data-tippy-content", createTooltipContent(confirmedEvents));
					dayElem.classList.add("has-confirmed");

					const markersContainer = document.createElement("div");
					markersContainer.classList.add("event-markers-container");

					const marker = document.createElement("span");
					marker.classList.add("event-marker", "confirmed");
					markersContainer.appendChild(marker);

					dayElem.appendChild(markersContainer);
				}
			},
			onChange: (selectedDates) => {
				if (selectedDates.length > 0) {
					value = flatpickr.formatDate(selectedDates[0], "Y-m-d");
				}
			},
			onMonthChange: () => {
				setupTooltips();
			},
			onOpen: () => {
				setupTooltips();
			}
		});

		if (value) {
			fp.setDate(new Date(value));
		}

		return () => {
			fp?.destroy();
		};
	});

	function setupTooltips() {
		tippy("[data-tippy-content]", {
			zIndex: 1000000,
			allowHTML: true
		});
	}

	function createTooltipContent(events: EventConflictInfo[]) {
		return events
			.map((event) => {
				const organizers = event.organizers.map((org) => org.username).join(", ");
				return `• ${event.event_title} (${organizers})
                    ${event.time_start}-${event.time_end}
                    ${event.rooms.join(", ")}`;
			})
			.join("<br>");
	}
</script>

<div class="space-y-1">
	{#if label}
		<label for={uniqueId} class="text-fluid-sm font-medium text-gray-700">{label}</label>
	{/if}
	<input
		bind:this={dateInput}
		id={uniqueId}
		type="text"
		class="w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-gray-700 shadow-xs focus:outline-hidden"
		{placeholder}
	/>
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

	:global(.has-confirmed .event-marker.confirmed) {
		background-color: rgb(34 197 94); /* green-500 */
	}

	:global(.flatpickr-day.has-confirmed:hover .event-marker) {
		opacity: 0.5;
	}
</style>

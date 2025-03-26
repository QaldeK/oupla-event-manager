<script lang="ts">
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import flatpickr from 'flatpickr';
	// import 'flatpickr/dist/flatpickr.css';
	import { French } from 'flatpickr/dist/l10n/fr.js';
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';

	import { CalendarX2 } from 'lucide-svelte';

	let {
		value = $bindable(),
		onResetDate = () => {},
		mode = 'single', // 'single' or 'multiple'
		resetButton = false,
		placeholder = 'Selectionnez une date',
		label = 'Ajoutez des dates'
	} = $props();

	let fp: any = null;
	let dpId = crypto.randomUUID().substring(0, 8);
	let dateInput: HTMLInputElement;
	const eventsByDateTime = $derived(eventsStore.getEventsByDateTime);
	$inspect('eventsByDateTime', eventsByDateTime);

	$effect(() => {
		fp = flatpickr(dateInput, {
			dateFormat: 'l j F Y',
			locale: French,
			minDate: 'today',
			static: true,
			mode,
			onDayCreate: (dObj, dStr, fp, dayElem) => {
				const dateStr = fp.formatDate(dayElem.dateObj, 'Y-m-d');
				const eventsForDate = eventsByDateTime.get(dateStr);
				if (eventsForDate?.length) {
					dayElem.setAttribute('data-tippy-content', createTooltipContent(eventsForDate));

					const classes = determineEventClass(eventsForDate);
					dayElem.classList.add(...classes.split(' '));

					const markersContainer = document.createElement('div');
					markersContainer.classList.add('event-markers-container');

					const eventTypes = new Set(eventsForDate.map((event) => event.conflictType));
					eventTypes.forEach((type) => {
						const marker = document.createElement('span');
						marker.classList.add('event-marker', type);
						markersContainer.appendChild(marker);
					});

					dayElem.appendChild(markersContainer);
				}
			},
			onChange: (selectedDates) => {
				if (selectedDates.length > 0) {
					value =
						mode === 'single'
							? flatpickr.formatDate(selectedDates[0], 'Y-m-d')
							: selectedDates.map((date) => flatpickr.formatDate(date, 'Y-m-d'));
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
			fp.setDate(mode === 'single' ? new Date(value) : value.map((v) => new Date(v)));
		}

		return () => {
			fp?.destroy();
		};
	});

	function setupTooltips() {
		tippy('[data-tippy-content]', {
			zIndex: 1000000,
			allowHTML: true
		});
	}

	function resetDate() {
		onResetDate();
		value = mode === 'single' ? '' : [];
		fp.clear();
	}

	function createTooltipContent(events: EventConflictInfo[]) {
		return events
			.map((event) => {
				const organizers = event.organizers.map((org) => org.username).join(', ');
				return `• ${event.event_title} (${organizers})
					${event.time_start}-${event.time_end}
					${event.conflictType}
					${event.rooms.join(', ')}`;
			})
			.join('<br>');
	}

	function determineEventClass(events: EventConflictInfo[]) {
		const eventTypes = new Set(events.map((event) => event.conflictType));
		const classes = [];

		if (events.length === 1) {
			classes.push(`single-${events[0].conflictType}-event`);
		} else {
			eventTypes.forEach((type) => classes.push(`has-${type}`));
		}

		return classes.join(' ');
	}
</script>

<div class="flex items-end gap-x-4">
	<div class="flex flex-col gap-y-1">
		<label for={dpId} class="text-fluid-sm block">
			{label}
		</label>
		<input
			bind:this={dateInput}
			id={dpId}
			type="text"
			class="border-base-300 w-full rounded-lg border bg-white py-2 pr-10 pl-3 shadow-xs focus:outline-hidden"
			{placeholder}
		/>
	</div>
	{#if mode === 'single' && value !== '' && resetButton}
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

	/* Couleurs des marqueurs */
	:global(.has-confirmed .event-marker.confirmed) {
		background-color: #4caf50;
	}

	:global(.has-unconfirmed .event-marker.unconfirmed) {
		background-color: #ff9800;
	}

	:global(.has-sondage .event-marker.sondage) {
		background-color: #9e9e9e;
	}

	/* Cas simples */
	:global(.single-confirmed-event .event-marker) {
		background-color: #4caf50;
	}

	:global(.single-unconfirmed-event .event-marker) {
		background-color: #ff9800;
	}

	:global(.single-sondage-event .event-marker) {
		background-color: #9e9e9e;
	}

	/* Interactions */
	:global(.flatpickr-day:hover .event-marker) {
		opacity: 0.8;
	}
</style>

<script lang="ts">
	/* TODO :
		- basculer a réccurant lorsque qu'explicitement demander (pas par les tabs mais boutons)
	*/
	import DatePicker from '$lib/components/forModal/DatePicker.svelte';

	import { getNewEvent } from '$lib/schemas/event.schema';
	import { type EventType } from '$lib/types/event';
	import {
		addDays,
		addMonths,
		addWeeks,
		endOfMonth,
		format,
		getDay,
		isAfter,
		isBefore,
		parse,
		startOfMonth
	} from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { v4 as uuidv4 } from 'uuid';

	import MultiSelect from './MultiSelect.svelte';
	import TimeReservation from './TimeReservation.svelte';

	// FIXIT : possibly undefined resolve by getNewEvent fallback ?
	let {
		eventData = $bindable<EventType>({ ...getNewEvent() } as EventType),
		localErrors,
		recurrentErrors
	} = $props();

	interface RecurrenceChoice {
		WEEKLY: string;
		BIWEEKLY: string;
		MONTHLY_BY_DATE: string;
		MONTHLY_BY_DAY: string;
	}

	const recurrenceChoice: RecurrenceChoice = {
		WEEKLY: 'WEEKLY',
		BIWEEKLY: 'BIWEEKLY',
		MONTHLY_BY_DATE: 'MONTHLY_BY_DATE',
		MONTHLY_BY_DAY: 'MONTHLY_BY_DAY'
	};

	// let recurrenceType = $state<typeof RecurrenceType>(RecurrenceType.NONE);
	// let eventData.lastDate = $state('');
	// let allDates: string[] = $state([]);monthlyByDayOccurrencess
	let selectedOccurrences = $state([] as number[]);

	$effect(() => {
		if (eventData.recurrence?.recurrenceType !== (recurrenceChoice.MONTHLY_BY_DAY || '')) {
			// Reset both values when not in MONTHLY_BY_DAY mode
			selectedOccurrences = [];
			eventData.recurrence.monthlyByDayOccurrences = [];
			return;
		}

		// Initialisation ou synchronisation
		if (selectedOccurrences.length === 0) {
			// Si monthlyByDayOccurrences existe déjà, on l'utilise
			if (eventData.recurrence.monthlyByDayOccurrences.length > 0) {
				selectedOccurrences = [...eventData.recurrence.monthlyByDayOccurrences];
			}
			// Sinon, on initialise avec la première date
			else if (eventData.recurrence.firstDate) {
				const firstDay = parse(eventData.recurrence.firstDate, 'yyyy-MM-dd', new Date());
				const initialOccurrence = [getOccurrenceInMonth(firstDay)];
				selectedOccurrences = initialOccurrence;
				eventData.recurrence.monthlyByDayOccurrences = initialOccurrence;
			}
		} else {
			// Mise à jour de monthlyByDayOccurrences uniquement si différent
			if (
				JSON.stringify(eventData.recurrence.monthlyByDayOccurrences) !==
				JSON.stringify(selectedOccurrences)
			) {
				eventData.recurrence.monthlyByDayOccurrences = [...selectedOccurrences];
			}
		}
	});

	const id = uuidv4();

	function getNthDayOfMonth(date, dayOfWeek, occurrence) {
		let currentDay = startOfMonth(date);
		let count = 0;
		while (currentDay <= endOfMonth(date)) {
			if (getDay(currentDay) === dayOfWeek) {
				count++;
				if (count === occurrence) {
					return currentDay;
				}
			}
			currentDay = addDays(currentDay, 1);
		}
		return count;
	}

	function getLastDayOfWeekInMonth(date, dayOfWeek) {
		let currentDay = endOfMonth(date);
		while (getDay(currentDay) !== dayOfWeek) {
			currentDay = addDays(currentDay, -1);
		}
		return currentDay;
	}

	function getOccurrenceInMonth(date) {
		let currentDay = startOfMonth(date);
		let count = 0;
		while (currentDay <= date) {
			if (getDay(currentDay) === getDay(date)) {
				count++;
			}
			currentDay = addDays(currentDay, 1);
		}
		return count;
	}

	/**
	 * Génère les dates récurrentes en fonction des paramètres
	 * @param startDate Date de début au format 'yyyy-MM-dd'
	 * @param lastDate Date de fin au format 'yyyy-MM-dd'
	 * @param recurrenceType Type de récurrence
	 * @param options Options supplémentaires (jour de la semaine, occurrences)
	 * @returns Tableau de dates au format 'yyyy-MM-dd'
	 */
	function generateRecurringDates(
		startDate: string,
		lastDate: string,
		recurrenceType: string,
		options: { dayOfWeek?: number; occurrences?: number[] } = {}
	): string[] {
		if (!startDate || !lastDate || !recurrenceType) {
			console.error('Missing required parameters for generateRecurringDates');
			return [];
		}
		const start = parse(startDate, 'yyyy-MM-dd', new Date());
		const end = parse(lastDate, 'yyyy-MM-dd', new Date());
		const dates = [];
		let current = start;

		while (!isAfter(current, end)) {
			dates.push(format(current, 'yyyy-MM-dd'));
			switch (recurrenceType) {
				case 'WEEKLY':
					current = addWeeks(current, 1);
					break;

				case 'BIWEEKLY':
					current = addWeeks(current, 2);
					break;

				case 'MONTHLY_BY_DATE':
					current = addMonths(current, 1);
					break;

				case 'MONTHLY_BY_DAY':
					const dayOfWeek = options.dayOfWeek ?? getDay(start);
					const defaultOccurrence = [getOccurrenceInMonth(start)];
					const occurrences = options.occurrences ?? defaultOccurrence;
					let currentMonth = start;

					// On parcourt tous les mois jusqu'à ce qu'on dépasse la lastDate
					while (!isAfter(currentMonth, end)) {
						for (const occurrence of occurrences) {
							let dateForOccurrence;
							if (occurrence === 5) {
								dateForOccurrence = getLastDayOfWeekInMonth(currentMonth, dayOfWeek);
							} else {
								dateForOccurrence = getNthDayOfMonth(currentMonth, dayOfWeek, occurrence);
							}

							// On vérifie si la date est dans l'intervalle [startDate, lastDate]
							if (!isAfter(dateForOccurrence, end) && !isBefore(dateForOccurrence, start)) {
								const formattedDate = format(dateForOccurrence, 'yyyy-MM-dd');
								if (!dates.includes(formattedDate)) {
									dates.push(formattedDate);
								}
							}
						}
						currentMonth = startOfMonth(addMonths(currentMonth, 1));
					}
					return dates;
				default:
					throw new Error('Type de récurrence non supporté');
			}
		}

		return dates;
	}

	function getOccurrenceLabel(value) {
		switch (value) {
			case 1:
				return '1er';
			case 2:
				return '2eme';
			case 3:
				return '3eme';
			case 4:
				return '4eme';
			case 5:
				return 'Dernier';
			default:
				return '';
		}
	}

	// :::  label of occurrences
	let labelOfOcurrence = $state('');
	$effect(() => {
		try {
			if (selectedOccurrences?.length > 0 && eventData?.recurrence?.firstDate) {
				if (selectedOccurrences.length === 1) {
					// Cas avec une seule occurrence
					labelOfOcurrence = getFormattedLabel(
						selectedOccurrences[0],
						eventData.recurrence.firstDate
					);
				} else {
					// Cas avec plusieurs occurrences
					const ordinals = selectedOccurrences.map((occurrence) => getOccurrenceLabel(occurrence));

					// Récupère le jour de la semaine (qui est le même pour toutes les occurrences)
					const weekday = format(
						parse(eventData.recurrence.firstDate, 'yyyy-MM-dd', new Date()),
						'EEEE',
						{ locale: fr }
					);

					// Formate la chaîne avec tous les ordinaux
					const ordinalsString =
						ordinals.length > 1
							? ordinals.slice(0, -1).join(', ') + ` et ${ordinals[ordinals.length - 1]}`
							: ordinals[0];

					labelOfOcurrence = `${ordinalsString} ${weekday}`;
				}
			}
		} catch (error) {
			console.error('Error formatting label:', error);
			labelOfOcurrence = '';
		}
	});

	function getFormattedLabel(occurrence, date) {
		if (!occurrence || !date) return '';
		return `${getOccurrenceLabel(occurrence)} ${format(
			parse(date, 'yyyy-MM-dd', new Date()),
			'EEEE',
			{ locale: fr }
		)}`;
	}

	// Condition dérivée pour la génération des dates
	let shouldGenerateDates = $derived<boolean>(
		Boolean(
			eventData.recurrence?.firstDate &&
				eventData.recurrence?.lastDate &&
				eventData.recurrence?.recurrenceType
		)
	);

	// Gestion unifiée de la mise à jour des dates récurrentes
	$effect(() => {
		// Reset si les conditions ne sont pas remplies
		if (!shouldGenerateDates) {
			if (eventData.recurrence?.recurrenceDates?.length > 0) {
				eventData.recurrence.recurrenceDates = [];
			}
			return;
		}

		// Pour MONTHLY_BY_DAY, on s'assure d'avoir selectedOccurrences correct
		if (
			eventData.recurrence.recurrenceType === recurrenceChoice.MONTHLY_BY_DAY &&
			selectedOccurrences?.length === 0
		) {
			const firstDay = parse(eventData.recurrence.firstDate, 'yyyy-MM-dd', new Date());
			selectedOccurrences = [getOccurrenceInMonth(firstDay)];
		}

		// Préparation des options pour la génération
		const options =
			eventData.recurrence.recurrenceType === recurrenceChoice.MONTHLY_BY_DAY
				? { occurrences: selectedOccurrences }
				: {};

		// Génération des nouvelles dates
		const newDates = generateRecurringDates(
			eventData.recurrence.firstDate,
			eventData.recurrence.lastDate,
			eventData.recurrence.recurrenceType,
			options
		);

		// Mise à jour uniquement si les dates ont changé
		if (JSON.stringify(eventData.recurrence.recurrenceDates) !== JSON.stringify(newDates)) {
			eventData.recurrence.recurrenceDates = newDates;
		}
	});

	// Determine une eventData.lastDate par default (4 mois plus tard)
	$effect(() => {
		let firstDate = eventData.recurrence.firstDate;
		if (firstDate) {
			let defaultLastDate = addMonths(parse(firstDate, 'yyyy-MM-dd', new Date()), 4);
			let defaultLastDateFormated = format(defaultLastDate, 'yyyy-MM-dd');
			eventData.recurrence.lastDate = defaultLastDateFormated;
		}
	});

	// Reset eventData.date_event quand eventData.isRecurrent est changé
	$effect(() => {
		if (eventData.isRecurrent) {
			eventData.date_event = '';
		}
	});
</script>

<!-- {$inspect('allDates', allDates)} -->
<!-- {$inspect('first', eventData.recurrence.firstDate)} -->
<!-- {$inspect('last', eventData.recurrence.lastDate)} -->
<!-- {$inspect('recurrenceType', eventData.recurrence.recurrenceType)} -->
<!-- {$inspect('recurrence', eventData.recurrence)} -->
<!-- {$inspect('seclectedOccurrences', selectedOccurrences)} -->
<!-- {$inspect('localErrors', localErrors)} -->

<div class="mt-4 space-y-10">
	<!-- Date de début -->
	<div class="flex flex-wrap gap-x-6 gap-y-4">
		<div class="min-w-fit">
			<div class="min-w-54">
				<DatePicker bind:value={eventData.recurrence.firstDate} label="	Première date" />
			</div>
			<!-- {#if recurrentErrors.firstDate}
				<p class="error">{recurrentErrors.firstDate}</p>
			{/if} -->
		</div>
		<!-- Date de fin -->
		<div class="min-w-fit">
			<div class="min-w-54">
				<DatePicker bind:value={eventData.recurrence.lastDate} label="Jusqu'au..." />
			</div>
			{#if recurrentErrors.lastDate}
				<p class="text-fluid-sm text-red-500 italic">{recurrentErrors.lastDate}</p>
			{/if}
		</div>
	</div>

	<!-- Type de récurrence -->
	<div class="items-top flex flex-wrap gap-x-10 gap-y-4">
		<div class="">
			<select
				id="recurrence-type"
				name="recurrence-type"
				bind:value={eventData.recurrence.recurrenceType}
				aria-describedby="recurrence-type-description"
				class="select"
			>
				<option value="" disabled selected> Choisissez un type de récurrence </option>
				<option value={recurrenceChoice.WEEKLY}>Hebdomadaire</option>
				<option value={recurrenceChoice.BIWEEKLY}>Bi-hebdomadaire</option>
				<option value={recurrenceChoice.MONTHLY_BY_DATE}>Mensuel (même date)</option>
				<option value={recurrenceChoice.MONTHLY_BY_DAY}>Mensuel (même jour de la semaine)</option>
			</select>
			<div>
				{#if recurrentErrors}
					<p class="text-fluid-sm pt-1 text-red-500 italic">{recurrentErrors.recurrenceType}</p>
				{/if}
			</div>
		</div>

		{#if eventData.recurrence?.recurrenceType === recurrenceChoice.MONTHLY_BY_DAY}
			<MultiSelect
				bind:selectedValues={selectedOccurrences}
				options={[
					{ value: 1, label: '1er' },
					{ value: 2, label: '2eme' },
					{ value: 3, label: '3eme' },
					{ value: 4, label: '4eme' },
					{ value: 5, label: 'Dernier' }
				]}
				placeholder="Tous les {labelOfOcurrence} du mois"
			/>
			{#if recurrentErrors.recurrenceType}
				<p class="text-fluid-sm text-red-500 italic">
					{recurrentErrors.recurrence.monthlyByDayOccurrences}
				</p>
			{/if}
		{/if}
	</div>
	<!-- Horaires -->
	<TimeReservation {localErrors} bind:eventData />

	<!-- Aperçu des dates -->
	{#if eventData.recurrence && eventData.recurrence?.recurrenceDates?.length > 0}
		<div class="mt-6">
			<h3 class="mb-3 text-lg font-medium text-gray-900">Aperçu des dates</h3>
			<div class="rounded-md bg-gray-50 p-4">
				<ul class="space-y-1">
					{#each eventData.recurrence.recurrenceDates as date}
						<li class="text-fluid-sm text-gray-600">
							{format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE d MMMM yyyy', { locale: fr })}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
</style>

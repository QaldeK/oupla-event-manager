<script lang="ts">
	import DatePicker from "$lib/components/forModal/DatePicker.svelte";
	import ErrorMessage from "$lib/components/ErrorMessage.svelte";
	import MultiSelect from "./MultiSelect.svelte";
	import {
		getRecurrenceLabel,
		getOccurrenceInMonth,
		getLastDayOfWeekInMonth,
		getNthDayOfMonth
	} from "$lib/utils/recurrence";

	import { type RecurrenceConfigType, RecurrenceTypeEnum } from "$lib/types/event.types";
	import {
		addMonths,
		addWeeks,
		endOfMonth,
		format,
		getDay,
		isAfter,
		isBefore,
		parse,
		startOfMonth,
		compareAsc
	} from "date-fns";
	import { fr } from "date-fns/locale";
	import { lisibleDate } from "$lib/utils";

	interface RecurrentTabProps {
		recurrence: RecurrenceConfigType;
		isExistingMaster: boolean;
		errors?: Partial<Record<string, string>>;
	}

	let {
		recurrence = $bindable<RecurrenceConfigType>(),
		isExistingMaster = false,
		errors = {}
	}: RecurrentTabProps = $props();

	// Utilisation des valeurs importées directement depuis le schéma
	const recurrenceChoice = RecurrenceTypeEnum;

	let isMounted = $state(false);

	/**
	 * Génère TOUTES les dates récurrentes potentielles en fonction des paramètres
	 * @returns Tableau de dates au format 'yyyy-MM-dd'
	 */
	const allGeneratedDates = $derived.by<string[]>(() => {
		const { firstDate, lastDate, recurrenceType, monthlyByDayOccurrences } = recurrence;

		// Conditions de garde pour avoir des paramètres valides
		if (!firstDate || !lastDate || !recurrenceType) return [];
		if (
			recurrenceType === recurrenceChoice.MONTHLY_BY_DAY &&
			(!monthlyByDayOccurrences || monthlyByDayOccurrences.length === 0)
		)
			return [];

		try {
			const start = parse(firstDate, "yyyy-MM-dd", new Date());
			const end = parse(lastDate, "yyyy-MM-dd", new Date());
			const dayOfWeek = getDay(start);
			const occurrences = monthlyByDayOccurrences;
			let currentMonthStart = startOfMonth(start);
			const dates: string[] = [];
			let current = start;

			if (isAfter(start, end)) {
				console.warn("Start date is after end date");
				return []; // Avoid infinite loops or unexpected behavior
			}

			switch (recurrenceType) {
				case recurrenceChoice.WEEKLY:
					while (!isAfter(current, end)) {
						dates.push(format(current, "yyyy-MM-dd"));
						current = addWeeks(current, 1);
					}
					break;

				case recurrenceChoice.BIWEEKLY:
					while (!isAfter(current, end)) {
						dates.push(format(current, "yyyy-MM-dd"));
						current = addWeeks(current, 2);
					}
					break;

				case recurrenceChoice.MONTHLY_BY_DATE:
					while (!isAfter(current, end)) {
						// Only add if the generated date is not before the start date
						// (handles cases where addMonths skips over the start date initially)
						if (!isBefore(current, start)) {
							dates.push(format(current, "yyyy-MM-dd"));
						}
						current = addMonths(current, 1);
						// Ensure the day doesn't change if the next month doesn't have the date (e.g., Jan 31 -> Feb 28)
						if (current.getDate() !== start.getDate()) {
							// Try to set to the original day, capped by the end of the new month
							const potentialDate = new Date(
								current.getFullYear(),
								current.getMonth(),
								start.getDate()
							);
							current = potentialDate > endOfMonth(current) ? endOfMonth(current) : potentialDate;
						}
					}
					break;

				case recurrenceChoice.MONTHLY_BY_DAY:
					// Iterate through months
					while (!isAfter(currentMonthStart, end)) {
						for (const occurrence of occurrences) {
							let dateForOccurrence: Date | null;
							if (occurrence === 5) {
								// 'Dernier'
								dateForOccurrence = getLastDayOfWeekInMonth(currentMonthStart, dayOfWeek);
							} else {
								dateForOccurrence = getNthDayOfMonth(currentMonthStart, dayOfWeek, occurrence);
							}

							// Check if valid date and within the [start, end] range
							if (
								dateForOccurrence &&
								!isAfter(dateForOccurrence, end) &&
								!isBefore(dateForOccurrence, start)
							) {
								const formattedDate = format(dateForOccurrence, "yyyy-MM-dd");
								if (!dates.includes(formattedDate)) {
									dates.push(formattedDate);
								}
							}
						}
						// Move to the start of the next month
						currentMonthStart = addMonths(currentMonthStart, 1);
					}
					break; // End of MONTHLY_BY_DAY case

				default:
					console.error("Type de récurrence non supporté:", recurrenceType);
					return [];
			}

			// Ensure dates are sorted
			dates.sort((a, b) =>
				compareAsc(parse(a, "yyyy-MM-dd", new Date()), parse(b, "yyyy-MM-dd", new Date()))
			);
			return dates;
		} catch (error) {
			console.error("Error generating recurring dates:", error);
			return [];
		}
	});

	// Montage du composant
	$effect(() => {
		isMounted = true;
	});

	// --- Effect ---

	// 👉 Effet unique pour gérer l'initialisation et le nettoyage de recurrence.monthlyByDayOccurrences
	$effect(() => {
		const currentType = recurrence.recurrenceType;
		const firstDate = recurrence.firstDate;

		if (currentType !== recurrenceChoice.MONTHLY_BY_DAY) {
			// Si le type n'est pas MONTHLY_BY_DAY, s'assurer que la prop est vide.
			if (recurrence.monthlyByDayOccurrences && recurrence.monthlyByDayOccurrences.length > 0) {
				recurrence.monthlyByDayOccurrences = [];
			}
		} else {
			// Le type EST MONTHLY_BY_DAY.
			// Initialise la prop si elle est undefined/null ou vide ET que firstDate existe.
			// Ceci est utile pour définir une valeur par défaut lors du premier passage à ce type.
			// Si l'utilisateur a déjà fait une sélection (via MultiSelect), elle ne sera pas écrasée.
			if (
				(!recurrence.monthlyByDayOccurrences || recurrence.monthlyByDayOccurrences.length === 0) &&
				firstDate
			) {
				try {
					const firstDay = parse(firstDate, "yyyy-MM-dd", new Date());
					if (!isNaN(firstDay.getTime())) {
						const initialOccurrence = getOccurrenceInMonth(firstDay);
						// Définit la valeur initiale directement sur la prop
						recurrence.monthlyByDayOccurrences = [initialOccurrence];
					}
				} catch (e) {
					console.error("Error parsing firstDate for initial occurrence in effect:", e);
					// Assure que la prop est au moins un tableau vide en cas d'erreur
					if (
						recurrence.monthlyByDayOccurrences === undefined ||
						recurrence.monthlyByDayOccurrences === null
					) {
						recurrence.monthlyByDayOccurrences = [];
					}
				}
			} else if (
				recurrence.monthlyByDayOccurrences === undefined ||
				recurrence.monthlyByDayOccurrences === null
			) {
				// Assure que la prop est toujours un tableau si le type est correct mais qu'elle est undefined/null
				recurrence.monthlyByDayOccurrences = [];
			}
		}
	});

	// --- Effet pour la date de fin par défaut ---
	$effect(() => {
		const firstDate = recurrence.firstDate;
		// 👉 Définit la date de fin par défaut SEULEMENT si elle n'existe pas ET que firstDate est valide
		if (firstDate && !recurrence.lastDate) {
			try {
				let parsedFirstDate = parse(firstDate, "yyyy-MM-dd", new Date());
				// Vérifier si la date parsée est valide
				if (!isNaN(parsedFirstDate.getTime())) {
					let defaultLastDate = addMonths(parsedFirstDate, 4);
					recurrence.lastDate = format(defaultLastDate, "yyyy-MM-dd");
				}
			} catch (error) {
				console.error("Error setting default last date:", error);
			}
		}
	});

	$effect(() => {
		const generated = allGeneratedDates; // Dépendance sur la valeur dérivée

		// N'écraser les dates que si on crée un nouvel événement (pas lors de l'édition)
		// ou si aucune date n'est encore sélectionnée
		if (
			(!isExistingMaster ||
				!recurrence.recurrenceDates ||
				recurrence.recurrenceDates.length === 0) &&
			isMounted
		) {
			recurrence.recurrenceDates = [...generated];
		}
	});

	// --- Functions ---

	// --- Helper function for toggling date selection ---
	function toggleDateSelection(dateToToggle: string) {
		const currentlySelected = new Set(recurrence.recurrenceDates);
		if (currentlySelected.has(dateToToggle)) {
			// Deselect: Remove the date
			recurrence.recurrenceDates = recurrence.recurrenceDates.filter((d) => d !== dateToToggle);
		} else {
			// Select: Add the date and re-sort
			// TODO Re-sort later ?
			const newDates = [...recurrence.recurrenceDates, dateToToggle];
			newDates.sort((a, b) =>
				compareAsc(parse(a, "yyyy-MM-dd", new Date()), parse(b, "yyyy-MM-dd", new Date()))
			);
			recurrence.recurrenceDates = newDates;
		}
	}

	let labelOfOcurrence = $derived.by(() => {
		return getRecurrenceLabel(recurrence);
	});
</script>

<!-- {$inspect('allDates', allDates)} -->
<!-- {$inspect('first', recurrence.firstDate)} -->
<!-- {$inspect('last', recurrence.lastDate)} -->
<!-- {$inspect('recurrenceType', recurrence.recurrenceType)} -->
<!-- {$inspect('recurrence', recurrence)} -->
<!-- {$inspect('seclectedOccurrences', selectedOccurrences)} -->
<!-- {$inspect('localErrors', localErrors)} -->

<div class="mt-4 space-y-10">
	<!-- Date de début -->
	<div class="flex flex-wrap gap-x-8 gap-y-4">
		<div class="min-w-fit">
			{#if !isExistingMaster && (!recurrence.firstDate || isAfter(parse(recurrence.firstDate, "yyyy-MM-dd", new Date()), new Date()))}
				<div class="min-w-54">
					<DatePicker
						initialValue={recurrence.firstDate as string}
						onChange={(value) => (recurrence.firstDate = value as string)}
						label="Première date"
					/>
				</div>
				<ErrorMessage error={errors.recurrenceFirstDate} />
			{:else}
				<div class="flex flex-col gap-2">
					<p class="text-fluid-sm">Première date</p>

					<div class="badge badge-xl badge-soft font-medium">
						{lisibleDate(recurrence.firstDate || "")}
					</div>
				</div>
			{/if}
		</div>
		<!-- Date de fin -->
		<div class="min-w-fit">
			<div class="min-w-54">
				<DatePicker
					initialValue={recurrence.lastDate as string}
					onChange={(value) => (recurrence.lastDate = value as string)}
					label="Jusqu'au..."
				/>
			</div>
			<ErrorMessage error={errors.recurrenceLastDate} />
		</div>
	</div>

	<!-- Type de récurrence -->
	<div class="items-top flex flex-wrap gap-x-10 gap-y-4">
		<div class="">
			<select
				id="recurrence-type"
				name="recurrence-type"
				bind:value={recurrence.recurrenceType}
				aria-describedby="recurrence-type-description"
				class="select"
			>
				<option value={undefined} disabled selected> Choisissez un type de récurrence </option>
				<option value={recurrenceChoice.WEEKLY}>Hebdomadaire</option>
				<option value={recurrenceChoice.BIWEEKLY}>Bi-hebdomadaire</option>
				<option value={recurrenceChoice.MONTHLY_BY_DATE}>Mensuel (même date)</option>
				<option value={recurrenceChoice.MONTHLY_BY_DAY}>Mensuel (même jour de la semaine)</option>
			</select>
			<ErrorMessage error={errors.recurrenceOccurrences} />
		</div>

		{#if recurrence?.recurrenceType === recurrenceChoice.MONTHLY_BY_DAY}
			<MultiSelect
				bind:selectedValues={recurrence.monthlyByDayOccurrences}
				options={[
					{ value: 1, label: "1er" },
					{ value: 2, label: "2eme" },
					{ value: 3, label: "3eme" },
					{ value: 4, label: "4eme" },
					{ value: 5, label: "Dernier" }
				]}
				placeholder={`Tous les ${labelOfOcurrence} du mois`}
			/>
			<ErrorMessage error={errors.recurrenceOccurrences} />
		{/if}
	</div>

	<!-- Aperçu interactif des dates -->
	{#if allGeneratedDates.length > 0}
		<div class="mt-6">
			<div class="text-fluid-lg font-medium">
				Dates de l'événement ({recurrence.recurrenceDates?.length} / {allGeneratedDates.length} sélectionnées)
			</div>
			<div class="text-fluid-sm text-base-content/80 mb-2">
				Vous pouvez déselectionner les dates que vous souhaitez exclure.
			</div>
			{#if allGeneratedDates.length > 54}
				<p class="text-warning pb-2 text-sm italic">
					Note: Seules les 54 premières dates sont affichées ici pour la sélection. La génération
					complète ({allGeneratedDates.length} dates) sera utilisée.
				</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<!-- 👉 Itération sur TOUTES les dates générées -->
				{#each allGeneratedDates.slice(0, 54) as date (date)}
					{@const isSelected = recurrence.recurrenceDates?.includes(date)}
					<!-- 👉 Bouton agissant comme une checkbox -->
					<button
						type="button"
						class="btn btn-compact {isSelected ? 'btn-accent' : 'btn-dash line-through opacity-70'}"
						onclick={() => toggleDateSelection(date)}
						aria-pressed={isSelected}
					>
						{format(parse(date, "yyyy-MM-dd", new Date()), "EEE d MMM", { locale: fr })}
					</button>
				{/each}
				{#if allGeneratedDates.length > 54}
					<span class="self-center p-1 text-sm">... et {allGeneratedDates.length - 54} autres</span>
				{/if}
			</div>
		</div>
	{:else if recurrence.firstDate && recurrence.lastDate && recurrence.recurrenceType}
		<p class="text-info mt-4">
			Aucune date ne correspond aux critères de récurrence dans l'intervalle sélectionné.
		</p>
	{/if}
</div>

<style>
</style>

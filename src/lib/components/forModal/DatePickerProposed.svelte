<script lang="ts">
	import DatePicker from "$lib/components/forModal/DatePicker.svelte";
	import ErrorMessage from "$lib/components/ErrorMessage.svelte";
	import GroupRadioButton from "$lib/components/GroupRadioButton.svelte";
	import Info from "$lib/components/Info.svelte";
	import TimePickRange from "$lib/components/TimePickRange.svelte";

	import { eventState, getSpace, showAlert } from "$lib/shared";
	import type { DateProposedType, EventType } from "$lib/types/event";
	import { addTime, isValidDate, lisibleDate, lisibleTime } from "$lib/utils";
	import { fade } from "svelte/transition";

	import { CalendarCheck, PlusCircle, Trash2, UserPlus } from "lucide-svelte";

	interface Props {
		eventData: EventType;
		onUpdateDatesProposed: (dates: DateProposedType[]) => void;
		onValidateDate: (date: DateProposedType) => void;
		onUpdateIsSondage: () => void;
		errors?: Partial<Record<string, string>>;
	}

	let {
		eventData,
		onUpdateDatesProposed,
		onValidateDate,
		onUpdateIsSondage,
		errors = {}
	}: Props = $props();

	// States
	let selectedDate = $state<string[]>([]);
	let startTime = $state("");
	let endTime = $state("");

	// Derived values
	let eventId = $derived(eventState.is?.id);
	let editingDateIndex = $state<number | null>(null);
	let spaceMembers = $derived(getSpace.members);

	let rooms = $derived(eventState.is?.rooms); // for conflicts

	let datesFutureProposed = $derived.by(() => {
		const now = new Date();
		if (!eventData?.dates_proposed) return [];
		return eventData.dates_proposed.filter((date) => new Date(date.dateStart) >= now);
	});

	let oldDatesProposed = $derived.by(() => {
		const now = new Date();
		if (!eventData?.dates_proposed) return [];
		return eventData.dates_proposed.filter((date) => new Date(date.dateStart) < now);
	});

	// 👉 Organizers pour le modal (calculé quand le modal s'ouvre)
	let organizersForModal = $derived.by(() => {
		if (editingDateIndex === null) return [];
		const currentOrgList = eventData.dates_proposed?.[editingDateIndex]?.organizers ?? [];
		// const currentOrgIds = new Set(currentOrgList.map(org => org.id));

		return spaceMembers.map((member) => {
			const existingOrg = currentOrgList.find((org) => org.id === member.id);
			return {
				id: member.id,
				username: member.username,
				maybehere: existingOrg?.maybehere ?? "" // Valeur existante ou vide
			};
		});
	});

	// Computed best date
	// const bestDate = $derived.by(() => {
	// 	if (!eventData.dates_proposed?.length) return null;

	// 	return eventData.dates_proposed.reduce(
	// 		(acc, curr) => {
	// 			const organizersCount = curr.organizers.length;
	// 			if (organizersCount > acc.maxOrganizers) {
	// 				return { maxOrganizers: organizersCount, best: curr.dateStart };
	// 			}
	// 			return acc;
	// 		},
	// 		{ maxOrganizers: -1, best: null as string | null }
	// 	).best;
	// });

	// Functions
	function validateDate(dateProposed: DateProposedType) {
		// On utilise la fonction passée en props
		onValidateDate(dateProposed);
	}

	function addDateProposedType() {
		if (!selectedDate.length || !startTime || !endTime) return;

		const newProposals: DateProposedType[] = [];
		let invalidDateFound = false;

		selectedDate.forEach((dateStr: string) => {
			try {
				const startDateTime = new Date(`${dateStr}T${startTime}`);
				const endDateTime = new Date(`${dateStr}T${endTime}`);

				if (!isValidDate(startDateTime) || !isValidDate(endDateTime)) {
					throw new Error("Invalid date/time created");
				}

				// Vérifier si une proposition identique existe déjà
				const exists = (eventData.dates_proposed ?? []).some(
					(d) =>
						new Date(d.dateStart).getTime() === startDateTime.getTime() &&
						new Date(d.dateEnd).getTime() === endDateTime.getTime()
				);

				if (!exists) {
					newProposals.push({
						dateStart: startDateTime.toISOString(),
						dateEnd: endDateTime.toISOString(),
						organizers: [] // Nouvelle proposition, pas d'organisateurs au début
					});
				}
			} catch (e) {
				console.error("Error creating date proposal for:", dateStr, startTime, endTime, e);
				invalidDateFound = true;
				showAlert("une erreur est survenue");
			}
		});
		if (invalidDateFound) {
			showAlert("Certaines dates n'ont pas pu être ajoutées car elles sont invalides.");
		}

		if (newProposals.length > 0) {
			const updatedDates = [...(eventData.dates_proposed || []), ...newProposals];
			onUpdateDatesProposed(
				updatedDates.sort(
					(a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
				)
			);
		}

		// Reset form
		selectedDate = [];
		startTime = "";
		endTime = "";
	}

	function removeDateProposedType(indexToRemove: number) {
		const dateToRemove = datesFutureProposed[indexToRemove];
		if (!dateToRemove) return;
		const globalIndex = (eventData.dates_proposed ?? []).findIndex(
			(d) => d.dateStart === dateToRemove.dateStart && d.dateEnd === dateToRemove.dateEnd
		);

		if (globalIndex !== -1) {
			const updatedDates = (eventData.dates_proposed ?? []).filter((_, i) => i !== globalIndex);
			onUpdateDatesProposed(updatedDates);
		}
	}

	function handleMaybehereChange(
		benevoleId: string,
		username: string,
		newValue: "oui" | "peut-être" | "non" | ""
	) {
		if (editingDateIndex === null) return;

		const currentProposedDate = eventData.dates_proposed?.[editingDateIndex];
		if (!currentProposedDate) return;

		let updatedOrganizers = [...(currentProposedDate.organizers ?? [])];
		const existingIndex = updatedOrganizers.findIndex((org) => org.id === benevoleId);

		if (newValue === "") {
			// Si "aucun" est sélectionné, on retire l'organisateur
			if (existingIndex !== -1) {
				updatedOrganizers.splice(existingIndex, 1);
			}
		} else {
			// Sinon, on ajoute ou met à jour
			if (existingIndex !== -1) {
				// Mettre à jour 'maybehere'
				updatedOrganizers[existingIndex] = {
					...updatedOrganizers[existingIndex],
					maybehere: newValue
				};
			} else {
				// Ajouter le nouvel organisateur
				updatedOrganizers.push({
					id: benevoleId,
					username: username,
					maybehere: newValue,
					tasks: [] // Les tâches ne sont pas gérées ici pour les dates proposées
				});
			}
		}

		// Mettre à jour la date spécifique dans le tableau global
		const allDatesProposed = [...(eventData.dates_proposed ?? [])];
		allDatesProposed[editingDateIndex] = {
			...currentProposedDate,
			organizers: updatedOrganizers
		};

		// Notifier le parent avec le tableau complet mis à jour
		onUpdateDatesProposed(allDatesProposed);
	}

	// État du modal
	let isOrganizerModalOpen = $state(false);

	function openOrganizerModal(index: number) {
		// 👉 Trouver l'index réel dans le tableau eventData.dates_proposed
		const dateToEdit = datesFutureProposed[index];
		if (!dateToEdit) return;
		const globalIndex = (eventData.dates_proposed ?? []).findIndex(
			(d) => d.dateStart === dateToEdit.dateStart && d.dateEnd === dateToEdit.dateEnd
		);

		if (globalIndex !== -1) {
			editingDateIndex = globalIndex;
			isOrganizerModalOpen = true;
		} else {
			console.error("Date to edit not found in global list");
		}
	}

	function closeOrganizerModal() {
		isOrganizerModalOpen = false;
		editingDateIndex = null; // Réinitialiser l'index
	}

	function isExternalProposal(date: DateProposedType): boolean {
		return (
			eventData?.external_proposal?.proposals?.some((proposal) => {
				// Comparaison plus robuste en cas de fuseaux horaires ou millisecondes
				const proposalDate = new Date(`${proposal.date_event}T${proposal.time_start}`);
				const proposedDate = new Date(date.dateStart);
				return Math.abs(proposalDate.getTime() - proposedDate.getTime()) < 1000; // Tolérance 1 seconde
			}) ?? false
		);
	}

	function hasUnproposedDates(): boolean {
		if (!eventData?.dates_proposed?.length || !eventData?.external_proposal?.proposals?.length) {
			return false;
		}

		return eventData.dates_proposed.some((dateProposed) => {
			const dateProposedTime = new Date(dateProposed.dateStart).getTime();
			return !eventData.external_proposal!.proposals!.some((proposal) => {
				const proposalDateTime = new Date(
					`${proposal.date_event}T${proposal.time_start}`
				).getTime();
				return Math.abs(proposalDateTime - dateProposedTime) < 1000;
			});
		});
	}

	function handleDatePickerChange(newValue: string | string[]) {
		if (Array.isArray(newValue)) {
			selectedDate = newValue;
		}
	}
</script>

{#snippet ProposedDateCard(date: DateProposedType, displayIndex: number)}
	<div class="mt-4 rounded-xl bg-white shadow" transition:fade|global>
		<div
			class="py-.5 bg-base-300 grid items-center justify-center rounded-t-xl px-4 font-semibold sm:flex sm:justify-between"
		>
			<div class="text-fluid-base p-0.5">
				<span class="text-nowrap">{lisibleDate(date.dateStart)},</span>
				<span class="ms-1 text-nowrap">
					de {lisibleTime(date.dateStart)} à {lisibleTime(date.dateEnd)}
					{#if isExternalProposal(date)}
						<span class="badge badge-outline badge-info badge-xs ms-2">Proposé (externe)</span>
					{/if}
				</span>
			</div>

			<div class="flex justify-center gap-x-6 p-1">
				<button
					type="button"
					class="btn btn-soft btn-sm btn-primary not-sm:w-1/4"
					onclick={() => openOrganizerModal(displayIndex)}
				>
					<UserPlus />
					<span class="not-sm:hidden">Modifier</span>
				</button>

				<button
					type="button"
					class="btn btn-soft btn-error btn-sm not-sm:w-1/4"
					onclick={() => removeDateProposedType(displayIndex)}
				>
					<Trash2 />
					<span class="not-sm:hidden">Supprimer</span>
				</button>

				<button
					type="button"
					class="btn btn-sm btn-soft not-sm:w-1/4 {!date.organizers?.some(
						(org) => org.maybehere === 'oui'
					)
						? 'btn-warning'
						: 'btn-success'}"
					onclick={() => validateDate(date)}
				>
					<CalendarCheck />
					<span class="not-sm:hidden">Valider</span>
				</button>
			</div>
		</div>

		<div class="min-h-8 p-4">
			<div class="flex flex-wrap gap-2">
				{#each date.organizers?.filter((org) => org.maybehere === "oui") ?? [] as organizer (organizer.id)}
					<span class="badge badge-success badge-outline">{organizer.username}</span>
				{/each}
				{#each date.organizers?.filter((org) => org.maybehere === "peut-être") ?? [] as organizer (organizer.id)}
					<span class="badge badge-warning badge-outline">{organizer.username}</span>
				{/each}
				{#each date.organizers?.filter((org) => org.maybehere === "non") ?? [] as organizer (organizer.id)}
					<span class="badge badge-error badge-outline">{organizer.username}</span>
				{/each}
			</div>
			{#if !date.organizers || date.organizers.length === 0}
				<p class="text-fluid-sm text-base-content/60 italic">
					Personne n'a répondu pour cette date.
				</p>
			{/if}
		</div>
	</div>
{/snippet}

<div id="datesProposedTab" class="space-y-2">
	<Info>
		<p>
			Ajoutez des propositions de dates et horaires. Les membres pourront indiquer leur
			disponibilité (<span class="badge badge-success badge-outline">oui</span>,
			<span class="badge badge-warning badge-outline">peut-être</span>,
			<span class="badge badge-error badge-outline">non</span>).
			{#if datesFutureProposed.length > 0}
				Vous pouvez ensuite valider la date choisie (<CalendarCheck class="inline" size={20} />) ,
				ou
				<button class="link link-error" onclick={() => onUpdateIsSondage(false)}
					>annuler ce sondage</button
				>
				pour revenir à une date unique.
			{/if}
		</p>
	</Info>
	{#if (eventData?.external_proposal?.proposals?.length ?? 0) > 0 && hasUnproposedDates()}
		<div>
			<Info variant="warning">
				<p class="text-fluid-sm">
					Certaines dates du sondage n'ont pas été soumise à l'intervenant·e ayant proposé·e
					l'événement.
					<button
						class="btn btn-outline btn-xs btn-warning mt-2 ml-auto flex"
						onclick={() => {
							/* TODO! : Implement proposeAllDates */
							console.warn("TODO: Implement proposeAllDates");
						}}
					>
						Proposer toutes les nouvelles dates
					</button>
				</p>
			</Info>
		</div>
	{/if}

	<div class="mb-6 flex flex-wrap items-center gap-x-10 gap-y-2">
		<DatePicker
			initialValue={selectedDate}
			onChange={handleDatePickerChange}
			{eventId}
			mode="multiple"
			placeholder="Selectionnez une ou plusieurs dates"
			label="Ajoutez des propositions de dates"
		/>
		<div class="flex grow flex-col gap-y-1">
			<span class="text-fluid-sm"> Heures de réservation du lieu </span>
			<div class="flex grow items-center gap-x-4 gap-y-2 not-md:flex-wrap">
				<div>
					<TimePickRange bind:value={startTime} placeholder="début" classAdd="md:w-32 w-full" />
				</div>
				<div>
					<TimePickRange
						bind:value={endTime}
						initial={addTime(startTime, 180)}
						placeholder="fin"
						classAdd="md:w-32 w-full"
					/>
				</div>
				<button
					type="button"
					onclick={addDateProposedType}
					disabled={!selectedDate || selectedDate.length === 0 || !startTime || !endTime}
					class="btn btn-primary disabled:pointer-events-none disabled:text-gray-400"
					title={!selectedDate || selectedDate.length === 0 || !startTime || !endTime
						? "Veuillez sélectionner date(s), heure de début et heure de fin"
						: "Ajouter la/les proposition(s)"}
				>
					<PlusCircle /> Ajouter
				</button>
			</div>
		</div>
	</div>

	<!-- Liste des dates proposées futures -->
	{#if datesFutureProposed.length > 0}
		<!-- <div class="text-fluid-base font-semibold">Dates proposées :</div> -->
		<div out:fade|global>
			{#each datesFutureProposed as date, index (date.dateStart + date.dateEnd)}
				{@render ProposedDateCard(date, index)}
			{/each}
		</div>
	{:else}
		<p class="text-fluid-sm text-base-content/60 italic">
			Aucune date n'est actuellement proposée pour le sondage.
		</p>
	{/if}

	{#if oldDatesProposed.length > 0}
		<div class="text-fluid-sm mt-4 border-t pt-2 text-gray-500 italic">
			Note : Les dates passées suivantes ont été automatiquement retirées du sondage actif :
			{oldDatesProposed.map((date) => lisibleDate(date.dateStart)).join(", ")}
		</div>
	{/if}
</div>
<ErrorMessage error={errors.datesProposed} />

<!-- Modal Dialog pour la sélection des organisateurs (intégré) -->
<dialog class="modal" class:modal-open={isOrganizerModalOpen}>
	<div class="modal-box w-11/12 max-w-5xl">
		{#if editingDateIndex !== null && eventData.dates_proposed?.[editingDateIndex]}
			<h3 class="text-lg font-bold">
				Disponibilité pour le {lisibleDate(eventData.dates_proposed[editingDateIndex].dateStart)}
				({lisibleTime(eventData.dates_proposed[editingDateIndex].dateStart)} - {lisibleTime(
					eventData.dates_proposed[editingDateIndex].dateEnd
				)})
			</h3>

			<div class="p-4">
				<div class="flex flex-wrap gap-4">
					<!-- 👉 Utiliser organizersForModal qui inclut tous les membres -->
					{#each organizersForModal as benevole (benevole.id)}
						<div
							class="flex flex-wrap items-center justify-between rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
						>
							<span class="me-auto p-2 font-medium">{benevole.username}</span>
							<div class="">
								<GroupRadioButton
									value={benevole.maybehere}
									onChange={(newValue: "oui" | "peut-être" | "non" | "") =>
										handleMaybehereChange(benevole.id, benevole.username, newValue)}
									size="btn-sm"
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<p>Erreur : Impossible de charger les informations pour cette date.</p>
		{/if}

		<div class="modal-action">
			<button type="button" class="btn" onclick={closeOrganizerModal}> Ok </button>
		</div>
	</div>

	<!-- Fond du modal -->
	<div class="modal-backdrop"></div>
</dialog>

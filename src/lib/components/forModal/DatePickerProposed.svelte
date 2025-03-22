<script lang="ts">
	import ConflictAlert from '$lib/components/ConflictAlert.svelte';
	import Info from '$lib/components/Info.svelte';
	import TimePickRange from '$lib/components/TimePickRange.svelte';
	import DatePicker from '$lib/components/forModal/DatePicker.svelte';
	import OrganizersSelect from '$lib/components/forModal/OrganizersSelect.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import type { EventFormType, OrganizerType } from '$lib/types/event';
	import { addTime, formatDatePb, formatTimePb, lisibleDate, lisibleTime } from '$lib/utils';
	import { eventState } from '$lib/shared/states.svelte';

	import { fade } from 'svelte/transition';

	import { CalendarCheck, PlusCircle, Trash2 } from 'lucide-svelte';

	type DateProposal = {
		dateStart: string;
		dateEnd: string;
		organizers: OrganizerType[];
	};

	// ::: props
	let { localErrors = {}, eventData = $bindable<EventFormType | null>(null) } = $props<{
		localErrors: Record<string, string[] | undefined>;
		eventData: EventFormType | null;
	}>();

	// ::: states & derived
	let selectedDate = $state<string[]>([]);
	let startTime = $state('');
	let endTime = $state('');

	let oldDatesProposed = $state<DateProposal[]>([]);
	let datesFutureProposed = $state<DateProposal[]>([]);

	let eventId = $derived(eventState.is?.id);
	let rooms = $derived(eventState.is?.rooms);
	let dateAccepted = $state<DateProposal | null>(null);

	const bestDate = $derived(
		eventData.dates_proposed?.reduce(
			({ maxOrganizers, best }, data) =>
				data.organizers.length >= maxOrganizers
					? { maxOrganizers: data.organizers.length, best: data.dateStart }
					: { maxOrganizers, best },
			{ maxOrganizers: 1, best: null }
		).best
	);

	// ::: $effects

	$effect(() => {
		const today = new Date();
		oldDatesProposed = eventData.dates_proposed.filter((date) => new Date(date.dateStart) < today);
		datesFutureProposed = eventData.dates_proposed
			.filter((date) => new Date(date.dateStart) >= today)
			.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
	});

	$effect(() => {
		if (!dateAccepted) return;

		const dateStart = new Date(dateAccepted.dateStart);
		const dateEnd = new Date(dateAccepted.dateEnd);

		eventData = {
			...eventData,
			isSondage: false, // Désactive le mode sondage
			date_event: dateStart.toISOString().split('T')[0], // Format YYYY-MM-DD
			time_start: dateStart.toTimeString().slice(0, 5), // Format HH:mm
			time_end: dateEnd.toTimeString().slice(0, 5), // Format HH:mm
			organizers: dateAccepted.organizers
		};
	});

	function validateDate(date: DateProposal) {
		dateAccepted = date;
	}

	// ::: functions

	const cancelSondage = () => {
		eventData.isSondage = false;
	};

	const addDateProposal = () => {
		if (selectedDate && startTime && endTime && selectedDate) {
			const newProposals = selectedDate.map((date: string) => {
				const dateStart = new Date(`${date}T${startTime}`);
				const dateEnd = new Date(`${date}T${endTime}`);
				return {
					dateStart,
					dateEnd,
					organizers: []
				};
			});

			eventData.dates_proposed = [...eventData.dates_proposed, ...newProposals].sort(
				(a, b) => a.dateStart - b.dateStart
			);

			// Reset inputs
			selectedDate = [];
			startTime = '';
			endTime = '';
		}
	};

	const removeDateProposal = (index: number) => {
		eventData.dates_proposed = eventData.dates_proposed.filter((_, i) => i !== index);
	};

	// Fonction de conversion pour obtenir le format YYYYMMDDHHmm
	const formatDateTimeString = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		return `${year}${month}${day}${hours}${minutes}`;
	};

	function isExternalProposal(date: DateProposal): boolean {
		if (!eventData?.external_proposal?.proposals) return false;

		return eventData.external_proposal.proposals.some((proposal) => {
			const proposalDateTime = `${proposal.date_event}T${proposal.time_start}`;
			return new Date(proposalDateTime).getTime() === new Date(date.dateStart).getTime();
		});
	}

	function hasUnproposedDates(): boolean {
		if (!eventData?.dates_proposed || !eventData?.external_proposal?.proposals) return false;

		return eventData.dates_proposed.some((dateProposed) => {
			const dateProposedTime = new Date(dateProposed.dateStart).getTime();
			return !eventData.external_proposal.proposals.some((proposal) => {
				const proposalDateTime = new Date(
					`${proposal.date_event}T${proposal.time_start}`
				).getTime();
				return proposalDateTime === dateProposedTime;
			});
		});
	}

	// $inspect('dateAccepted', dateAccepted);
	// $inspect('eventsListSum', eventsListSum);
	// $inspect('datesFutureProposed', datesFutureProposed);
	// $inspect('oldDatesProposed', oldDatesProposed);
</script>

<div id="datesProposedTab" class="space-y-2">
	<Info>
		<p>
			Si il n'y a plus qu'une date envisagée, vous pouvez valider la date choisie <CalendarCheck
				class="badge badge-outline"
				size={16}
			/>, ou
			<button class="link link-error" onclick={cancelSondage}>annuler ce sondage</button>
		</p>
	</Info>
	{#if eventData?.external_proposal?.proposals?.length > 0 && hasUnproposedDates()}
		<div transition:slide>
			<Info variant="warning">
				<p class="text-fluid-sm">
					Certaines dates du sondage n'ont pas été soumise à l'intervenant·e ayant proposé·e
					l'événement.
					<button
						class="btn btn-outline btn-xs btn-warning mt-2 ml-auto flex"
						onclick={() => {
							/* TODO: Implement proposeAllDates */
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
			bind:value={selectedDate}
			{eventId}
			mode="multiple"
			placeholder="Selectionnez des dates"
		/>
		<div class="flex flex-col gap-y-1">
			<span class="text-fluid-sm"> heure de réservation du lieu </span>
			<div class="flex items-center gap-x-4 gap-y-2 not-md:flex-wrap">
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
					onclick={addDateProposal}
					disabled={!selectedDate || selectedDate.length === 0 || !startTime || !endTime}
					class="btn btn-primary disabled:pointer-events-none disabled:text-gray-400"
				>
					<PlusCircle />
				</button>
			</div>
		</div>
	</div>

	<div out:fade>
		{#each datesFutureProposed as date, index (index)}
			<div>
				<div
					class="mt-4 rounded-xl shadow {bestDate === date.dateStart
						? 'border-l-4 border-l-green-300'
						: ''}  {dateAccepted?.dateStart === date.dateStart ? 'bg-green-50' : 'bg-white'}"
				>
					<div
						class="py-.5 bg-base-300 -top-0 left-2.5 items-center justify-between rounded-t-xl px-4 font-semibold text-gray-700 sm:flex"
					>
						<div class="flex flex-wrap items-center gap-x-2">
							<div>
								<span class="text-nowrap">{lisibleDate(date.dateStart)}, </span>
								<span class="ms-1 text-nowrap">
									de {lisibleTime(date.dateStart)} à {lisibleTime(date.dateEnd)}
								</span>
							</div>
							<div>
								{#if isExternalProposal(date)}
									<Badge variant="outline" class="border-info font-normal text-gray-700 md:ms-2">
										<span class="">
											Proposé par l'intervenant•e - {eventData.expand?.created_by?.email}</span
										>
									</Badge>
								{:else if eventData?.external_proposal?.proposals?.length > 0}
									<Badge
										variant="outline"
										class="ms-2 cursor-pointer border-orange-500 text-orange-700 hover:bg-orange-100"
										onclick={() => {
											/* TODO: Implement proposeDate */
										}}
									>
										Soumettre cette proposition de date à {eventData.expand?.created_by?.email}'
									</Badge>
								{/if}
							</div>
						</div>

						<div class="gap-x-4 p-1 sm:flex">
							<div data-tip="Supprimer cette proposition de date" class="tooltip">
								<button
									class="btn btn-square btn-soft btn-error"
									onclick={() => removeDateProposal(index)}
								>
									<Trash2 />
								</button>
							</div>
							<div
								data-tip={date.organizers.length === 0
									? 'Au moins un·e organisateur·ice est requis pour accepter la date'
									: 'Accepter la date'}
								class="tootip"
							>
								<button
									class="btn btn-success btn-square btn-soft {dateAccepted?.dateStart ===
									date.dateStart
										? 'bg-green-500 text-white'
										: ''}"
									onclick={() => validateDate(date)}
									disabled={date.organizers.length === 0}
								>
									<CalendarCheck />
								</button>
							</div>
						</div>
					</div>
					<button class="btn btn-soft btn-sm btn-primary" onclick={organizer_select.showModal()}
						>Inscrire</button
					>
					<dialog id="organizer_select" class="modal">
						<div class="modal-box w-11/12 max-w-5xl">
							<h3 class="text-lg font-bold">Hello!</h3>
							<OrganizersSelect bind:organizers={date.organizers} />

							<div class="modal-action">
								<form method="dialog">
									<!-- if there is a button in form, it will close the modal -->
									<button class="btn">Close</button>
								</form>
							</div>
						</div>
					</dialog>

					<div class="px-5 py-2">
						<ConflictAlert
							{eventId}
							dateTimeStart={formatDateTimeString(new Date(date.dateStart))}
							dateTimeEnd={formatDateTimeString(new Date(date.dateEnd))}
							{rooms}
						/>
					</div>
				</div>
			</div>
		{/each}
		{#if oldDatesProposed.length > 0}
			<div class="text-fluid-sm p-2 text-gray-500 italic">
				Des dates déjà passées ont été proposées précédemment, et ont été automatiquement supprimées
				( {#each oldDatesProposed as date (date)}
					{lisibleDate(date.dateStart)},
				{/each} )
			</div>
		{/if}
	</div>
	{#if localErrors?.dates_proposed}
		<p class="text-fluid-sm p-2 text-red-500 italic">{localErrors.dates_proposed[0]}</p>
	{/if}
</div>

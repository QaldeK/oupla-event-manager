<script lang="ts">
	import ConflictAlert from '$lib/components/ConflictAlert.svelte';
	import Info from '$lib/components/Info.svelte';
	import TimePickRange from '$lib/components/TimePickRange.svelte';
	import DatePicker from '$lib/components/forModal/DatePicker.svelte';
	import OrganizersSelect from '$lib/components/forModal/OrganizersSelect.svelte';
	import ProposedDateCard from './ProposedDateCard.svelte';
	import type { EventType, OrganizerType } from '$lib/types/event';
	import { addTime, formatDatePb, formatTimePb, lisibleDate, lisibleTime } from '$lib/utils';
	import { eventState } from '$lib/shared/states.svelte';
	import type { DateProposedType } from '$lib/schemas/event.schema';

	import { fade } from 'svelte/transition';

	import { CalendarCheck, PlusCircle, Trash2 } from 'lucide-svelte';



	// ::: props
	let { localErrors = {}, eventData = $bindable<EventType | null>(null) } = $props<{
		localErrors: Record<string, string[] | undefined>;
		eventData: EventType | null;
	}>();

	// ::: states & derived
	let selectedDate = $state<string[]>([]);
	let startTime = $state('');
	let endTime = $state('');

	let oldDatesProposed = $state<DateProposedType[]>([]);
	let datesFutureProposed = $state<DateProposedType[]>([]);

	let eventId = $derived(eventState.is?.id);
	let rooms = $derived(eventState.is?.rooms);
	let dateAccepted = $state<DateProposedType | null>(null);

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

	function validateDate(date: DateProposedType) {
		dateAccepted = date;
	}

	// ::: functions

	const cancelSondage = () => {
		eventData.isSondage = false;
	};

	const addDateProposedType = () => {
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

	const removeDateProposedType = (index: number) => {
		eventData.dates_proposed = eventData.dates_proposed.filter((_, i) => i !== index);
	};



	function isExternalProposal(date: DateProposedType): boolean {
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
		<div>
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
					onclick={addDateProposedType}
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
			<ProposedDateCard
				{date}
				{index}
				{bestDate}
				{dateAccepted}
				{eventId}
				{rooms}
				{eventData}
				onRemove={removeDateProposedType}
				onValidate={validateDate}
			/>
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

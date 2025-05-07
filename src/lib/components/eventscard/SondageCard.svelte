<script lang="ts">
	// USELESS ???
	import { Badge } from "$lib/components/ui/badge";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { lisibleDate, lisibleTime } from "$lib/utils";
	import { eventState, modalState } from "$lib/shared/states.svelte";

	import { CalendarPlus } from "lucide-svelte";

	let { thisEvent, sondageMultiple } = $props();

	let oldDatesProposed: Date[] = $state([]);
	let datesFutureProposed: Date[] = $state([]);

	$effect(() => {
		const today = new Date();
		oldDatesProposed = thisEvent.dates_proposed?.filter((date) => new Date(date.dateStart) < today);
		datesFutureProposed = thisEvent.dates_proposed
			?.filter((date) => new Date(date.dateStart) >= today)
			.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
	});

	function missingTasks(date) {
		thisEvent.tasks ??= [];
		return thisEvent.tasks.filter(
			(task) =>
				!date.organizers
					.map((o) => o.tasks)
					.flat()
					.includes(task)
		);
	}

	const bestDate = $derived(
		thisEvent.dates_proposed?.reduce(
			({ maxOrganizers, best }, data) =>
				data.organizers.length >= maxOrganizers
					? { maxOrganizers: data.organizers.length, best: data.dateStart }
					: { maxOrganizers, best },
			{ maxOrganizers: 1, best: null }
		).best
	);

	function openSondageModal(event) {
		eventState.is = { ...event };
		modalState.dateSondage = true;
	}

	// $inspect('spaceConfig.tasks', $spaceConfig.tasks);
	// $inspect('thisEvent', thisEvent.dates_proposed);
	// $inspect('missingTasks', missingTasks);
</script>

{#snippet org(data)}
	<div class="ms-3 flex flex-wrap gap-2 pb-1">
		<!-- FIXIT -->
		{#if data.organizer?.tasks && data.organizers.length > 0}
			{#each data.organizers as organizer}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger
							class="rounded border  border-gray-300 bg-white px-3 py-0.5 {organizer.tasks.length <
							1
								? 'opacity-70'
								: ''}"
							>{organizer.username}
							<Badge
								class="ml-1 px-1.5 {organizer.tasks && organizer.tasks.length < 1
									? 'bg-slate-500'
									: ''}"
							>
								{organizer.tasks.length}
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							{#if organizer.tasks.length < 1}
								<span class="italic">Pas de mandat...</span>
							{:else}
								{#each organizer.tasks as task, index}
									{task}
									{#if index < organizer.tasks.length - 1},
									{/if}
								{/each}
							{/if}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/each}
		{:else}
			<span class="italic">Personnes pour le moment...</span>
		{/if}
	</div>
	{#if data.organizers.length >= 1 && missingTasks(data).length > 0}
		<div class="text-fluid-sm flex px-2 text-red-700">
			Personne pour : {missingTasks(data).join(", ")}
		</div>
	{/if}
{/snippet}

{#if sondageMultiple}
	<div class="divide-y rounded border border-gray-300">
		<div
			class="text-md flex w-full items-center justify-between border-gray-300 bg-gray-100 p-1 font-bold"
		>
			<div class="px-2 text-gray-700">Sondage: disponibilité</div>
			<button onclick={() => openSondageModal(thisEvent)} class="btn btn-xs">
				<CalendarPlus />
				Participez au sondage
			</button>
		</div>
		<div class="text-md text-gray-700">
			<div class="flex flex-col divide-y">
				{#each datesFutureProposed as data (data.dateStart)}
					<div
						class="transition:fade rounded-e bg-gray-100 py-2 shadow-md {bestDate === data.dateStart
							? 'border-l-4 border-l-green-300'
							: ''}"
					>
						<div class="flex flex-wrap items-center">
							<div class="h-max w-fit rounded-br-xl px-3 py-1 align-middle font-semibold">
								{lisibleDate(data.dateStart)} •
								{lisibleTime(data.dateStart)} - {lisibleTime(data.dateEnd)}
							</div>
							{@render org(data)}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{:else}
	<div
		class="text-md flex w-full flex-wrap rounded-lg rounded-t-lg border border-gray-300 p-1 px-2 text-gray-700"
	>
		<div class="flex w-full justify-between font-semibold">
			<div>Organisateur•ices</div>
			<div class="">
				<button onclick={() => openSondageModal(thisEvent)} class="btn btn-xs">
					<CalendarPlus />
					Participez
				</button>
			</div>
		</div>
		{@render org(thisEvent)}
	</div>
{/if}

{#if sondageMultiple && oldDatesProposed.length > 0}
	<div class="text-fluid-sm p-2 text-gray-500 italic">
		Des dates déjà passées ont été proposées précédemment, et ont été automatiquement supprimées ( {#each oldDatesProposed as date}
			{lisibleDate(date.dateStart)},
		{/each} )
	</div>
{/if}

<script lang="ts">
	import ExpandableCard from "$lib/components/ExpandableCard.svelte";
	import UserSondagesCard from "$lib/components/UserSondagesCard.svelte";
	import { eventsStore, userDb } from "$lib/shared";
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import type { DateProposedType, EventType, UserType } from "$lib/types/types";
	import { lisibleDate } from "$lib/utils";
	import { fade } from "svelte/transition";
	import ConflictAlert from "$lib/components/ConflictAlert.svelte";
	import TasksDisplay from "./TasksDisplay.svelte";
	import OrganizersHeader from "./OrganizersHeader.svelte";

	import ButtonAction from "./ButtonAction.svelte";
	import {
		formatRecurrence,
		getRecurrenceLabel,
		hasAuthorizations,
		isInTeam
	} from "$lib/utils/recurrence";

	// ::: context & props
	interface Props {
		currentEvent: EventType;
	}

	const { currentEvent }: Props = $props();

	let currentUser: UserType | null = userDb.current;

	// ::: reactive variables

	const hasNoPropositions = $derived(
		!currentEvent.date_event && (currentEvent.dates_proposed?.length ?? 0) === 0
	);

	const hasDate = $derived(!!currentEvent.date_event);
	const hasTime = $derived(!!currentEvent.time_start && !!currentEvent.time_end);
	const hasRooms = $derived((currentEvent.rooms ?? []).some((room) => room && room.trim() !== ""));
	const timeDisplay = $derived(
		hasTime ? `${currentEvent.time_start} - ${currentEvent.time_end}` : ""
	);

	const statusMessage = $derived.by(() => {
		if (!currentEvent.date_event && !hasTime) return "Date et horaires à définir";
		if (!currentEvent.date_event) return "Date à définir";
		if (!hasTime) return "Horaires à définir";
		return "";
	});

	const hasAuth = $derived.by(
		() =>
			hasAuthorizations({
				isRecurrent: currentEvent.isRecurrent,
				recurrenceTeam: currentEvent.recurrence?.recurrenceTeam,
				createdBy: currentEvent.created_by
			}) as boolean
	);

	const isUserInRecurrenceTeam = $derived(
		Boolean(isInTeam(currentUser, currentEvent.recurrence?.recurrenceTeam))
	);

	const notRecurrentOrUserInTeam = $derived.by(() =>
		Boolean(!currentEvent.isRecurrent || (currentEvent.isRecurrent && isUserInRecurrenceTeam))
	);

	// organizersLabel moved to OrganizersHeader.svelte

	let oldDatesProposed: DateProposedType[] = $state([]);
	let datesFutureProposed: DateProposedType[] = $state([]);

	let bgDateTime = $derived.by(() => {
		if (currentEvent.canceled) return "bg-error/20";
		else if (currentEvent.isConfirmed) return "bg-success/20";
		else return "bg-warning/20";
	});

	// --- effect ---

	$effect(() => {
		if (currentEvent.dates_proposed?.length) {
			const today = new Date();
			oldDatesProposed = (currentEvent.dates_proposed || []).filter(
				(date) => new Date(date.dateStart) < today
			);
			datesFutureProposed = (currentEvent.dates_proposed || [])
				.filter((date) => new Date(date.dateStart) >= today)
				.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());
			// $inspect('datesFutureProposed', event.event_title, datesFutureProposed);
		}
	});

	// --- functions ---
	const handleTaskSubscription = (taskName?: string) => {
		if (!currentUser || currentEvent.canceled) return;

		eventsStore.requestTaskUpdate({
			event: currentEvent,
			user: currentUser,
			taskName
		});
	};

	// Calcule l'état du bouton général d'inscription/gestion
	const generalTaskButtonState = $derived.by(() => {
		if (!currentUser || currentEvent.canceled || !(currentEvent.tasks ?? []).length) {
			return {
				text: "Inscription Indisponible",
				disabled: true,
				isSubscribed: false,
				variant: "disabled" as const
			};
		}

		const isSubscribed = (currentEvent.organizers ?? []).some((org) => org.id === currentUser.id);

		const btnText = isSubscribed ? "Se désinscrire" : "S'inscrire";
		return {
			text: btnText,
			disabled: false,
			isSubscribed,
			variant: (isSubscribed ? "error" : "primary") as "error" | "primary"
		};
	});

	const openSondageModal = () => {
		// if (!hasAuth) return; // Sécurité
		eventState.is = { ...currentEvent }; // Passer une copie pour éviter modif directe
		modalState.dateSondage = true;
	};

	// isUserSubscribedToTask moved to TasksDisplay.svelte

	// USELESS ? bestDate Keep It ?
	// const bestDate = $derived.by(() => {
	// 	if (!currentEvent.dates_proposed?.length) return null;

	// 	const bestProposal = currentEvent.dates_proposed.reduce<DatesProposed | null>((acc, curr) => {
	// 		const currOuiCount = curr.organizers.filter((org) => org.maybehere === 'oui').length;
	// 		const accOuiCount = acc ? acc.organizers.filter((org) => org.maybehere === 'oui').length : 0;

	// 		if (currOuiCount === 0) return acc;
	// 		if (!acc || currOuiCount > accOuiCount) {
	// 			return curr;
	// 		}
	// 		return acc;
	// 	}, null);
	// 	return bestProposal?.dateStart || null;
	// });
	//
</script>

<div transition:fade class="@container" id={currentEvent.id}>
	<div
		class="transition:fade mb-8 rounded-lg border bg-white shadow-md @md:mb-4 {currentEvent.isConfirmed
			? ''
			: 'border-l-warning/80 border-l-4'}"
	>
		<!-- <TopAlert thisEvent={currentEvent} /> -->
		<!-- <span>auth : {hasAuth}</span> -->
		<div class="pb-4">
			<div id="Header-event" class="mb-4 justify-between gap-2 @md:flex @md:px-4 @md:py-2">
				<!-- ::: date time rooms :::-->
				<div
					id="Top_event_date"
					class="px-6 py-2 shadow-sm @md:mt-2 @md:place-self-start @md:rounded-xl @md:align-top {bgDateTime}"
				>
					<div
						class="flex flex-wrap items-baseline justify-center gap-x-4 @md:flex-col @md:items-end @md:text-end"
					>
						<!-- Ligne 1 : Date + Time en mobile -->
						{#if currentEvent.date_event}
							<span class="text-fluid-base font-bold">
								{lisibleDate(currentEvent.date_event)}
							</span>
						{/if}
						{#if timeDisplay}
							<span class="text-fluid-base font-medium">
								{timeDisplay}
							</span>
						{/if}

						<!-- Ligne 2 : Message de statut -->
						{#if statusMessage}
							<span class="text-base-content/70 text-fluid-sm text-center italic">
								{statusMessage}
							</span>
						{/if}

						<!-- Ligne 3 : Salles -->
						{#if hasRooms}
							<div class="text-base-content/70 text-fluid-sm font-medium">
								<span>salle·s :</span>
								{#each currentEvent.rooms ?? [] as room, index (room)}
									{#if room && room.trim() !== ""}
										<span class="text-md text-base-content">
											{room}{index <
											(currentEvent.rooms ?? []).filter((r) => r && r.trim() !== "").length - 1
												? ", "
												: ""}
										</span>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>
				<!-- ::: title -->

				<div id="titleAndCat" class="w-full p-3 @max-md:text-center @md:order-first @md:w-3/5">
					<p class="text-fluid-xl font-bold">{currentEvent.event_title}</p>
					{#each currentEvent.categories ?? [] as category, index (category)}
						<p class="font-semibold uppercase">
							{category}{index < (currentEvent.categories ?? []).length - 1 ? ", " : ""}
						</p>
					{/each}
					{#if currentEvent.reportedFrom}
						<div class="text-fluid-sm text-base-content/70 p-1">
							Initialement prévu le {lisibleDate(currentEvent.reportedFrom)}
						</div>
					{/if}
					{#if currentEvent.isRecurrent && currentEvent.recurrence}
						<div class="text-fluid-sm text-base-content/80 mt-1">
							{formatRecurrence(currentEvent.recurrence)}
							<span>• {getRecurrenceLabel(currentEvent.recurrence)}</span>

							<!-- <span>
								• Programmés jusqu'au {lisibleDate(new Date(currentEvent.recurrence.lastDate))}
							</span> -->
						</div>
					{/if}
				</div>
			</div>

			<!-- Contenu principal de la carte (description, orga, sondage etc) -->
			<!-- TODO enhance condition with props  -->
			{#if !currentEvent.canceled}
				<div id="event_content" class="flex flex-col gap-y-6 @md:p-4">
					<!-- ::: description -->
					{#if currentEvent.description}
						<ExpandableCard title="à propos..." text={currentEvent.description} />
					{/if}

					<!-- ::: external_proposal -->
					{#if !hasDate && currentEvent.external_proposal?.period_preference && currentEvent.external_proposal.period_preference.length > 0}
						<ExpandableCard
							title="Période proposée par les intervenant·es :"
							text={currentEvent.external_proposal.period_preference}
						/>
					{/if}

					<!-- ::: Organizers Card / sondage -->

					<div id="organizers_card" class="bg-base-200 p-1 shadow-sm @md:rounded-lg">
						<OrganizersHeader
							event={currentEvent}
							{hasAuth}
							isSondage={currentEvent.isSondage}
							{hasNoPropositions}
							{hasDate}
							{notRecurrentOrUserInTeam}
							{generalTaskButtonState}
							onSondageClick={openSondageModal}
							onTaskSubscription={() => handleTaskSubscription()}
						/>
						<div class="@container">
							<div class=" flex flex-col rounded-b-lg {currentEvent.isSondage ? 'mb-4 p-2' : ''} ">
								<!--::: SI:  sondage est en cours -->
								{#if currentEvent.isSondage}
									<UserSondagesCard {currentEvent} {currentUser} dates={datesFutureProposed} />
									{#if currentEvent.isSondage && oldDatesProposed.length > 0}
										<div class="text-fluid-xs text-base-content/70 p-2 italic">
											({oldDatesProposed.length} date{oldDatesProposed.length > 1 ? "s" : ""} passée{oldDatesProposed.length >
											1
												? "s"
												: ""} non affichée{oldDatesProposed.length > 1 ? "s" : ""})
										</div>
									{/if}

									<!--::: SI: une date est déjà proposée -->
								{:else if hasDate}
									<TasksDisplay
										tasks={currentEvent.tasks ?? []}
										organizers={currentEvent.organizers ?? []}
										{currentUser}
										onTaskSubscription={handleTaskSubscription}
										isRecurrent={Boolean(currentEvent.isRecurrent)}
										{isUserInRecurrenceTeam}
										recurrenceTeam={currentEvent.recurrence?.recurrenceTeam ?? []}
									/>
								{/if}
							</div>
							<!-- ::: __ mandats a se répartir> -->
							{#if notRecurrentOrUserInTeam}
								{#if !hasDate && currentEvent.isSondage && (currentEvent.tasks ?? []).length > 1}
									<div class=" text-base-content/70 p-2">
										<p class="text-fluid-xs">
											Mandats à se répartir pour la gestion de l'événement : <span class="italic">
												{#each currentEvent.tasks ?? [] as task, index (currentEvent.id + "mandat" + task.name)}
													{task.name}{index < (currentEvent.tasks ?? []).length - 1 ? ", " : ""}
												{/each}
											</span>
										</p>
										{#if currentEvent.isSondage}
											<p class="text-fluid-xs">
												Le sondage de disponibilité ne concerne que la présence
											</p>
										{/if}
									</div>
								{:else if hasDate && (currentEvent.tasks ?? []).length === 1}
									<div class="text-fluid-xs text-base-content/70 p-2">
										L'inscription concerne le mandat "{(currentEvent.tasks ?? [])[0]?.name}".
										<!-- {#if currentEvent.tasks[0].description}
											<br />{currentEvent.tasks[0].description}
										{/if} -->
										Il n'y a pas d'autre mandat à se répartir.
									</div>
								{/if}
							{/if}
						</div>
					</div>
					{#if currentEvent.inConflictWith?.length}
						<ConflictAlert {currentEvent} mode="cached" />
					{/if}
				</div>
			{/if}
		</div>
		<ButtonAction thisEvent={currentEvent} />
	</div>
</div>

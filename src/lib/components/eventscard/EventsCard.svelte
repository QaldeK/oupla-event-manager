<script lang="ts">
	import ExpandableCard from "$lib/components/ExpandableCard.svelte";
	import GroupRadioButton from "$lib/components/GroupRadioButton.svelte";
	import { updateEvent } from "$lib/pocketbase.svelte";
	import { filterAndConvertOrganizers, lisibleDate, lisibleTime } from "$lib/utils";
	import { eventState, hasAuthorizations, modalState } from "$lib/shared/states.svelte";
	import type { EventType, OrganizerType, SyncEventRecord } from "$lib/types/event";
	import type { UserType } from "$lib/types/types";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { getContext } from "svelte";
	import { fade } from "svelte/transition";

	import {
		BadgeHelp,
		CalendarCheck,
		Info,
		ChevronDown,
		ChevronUp,
		ThumbsDown,
		ThumbsUp,
		UserCheck
	} from "lucide-svelte";
	import { CalendarPlus, UserPlus } from "lucide-svelte";

	import ButtonAction from "./ButtonAction.svelte";
	import TopAlert from "./TopAlert.svelte";

	interface Props {
		currentEvent: EventType;
	}

	interface DatesProposed {
		dateStart: string;
		dateEnd: string;
		organizers: OrganizerType[];
	}

	// ::: context & props
	const { currentEvent }: Props = $props();

	// FIXIT : don't use getContext
	let currentUser: UserType = getContext("currentUser");

	// ::: reactive variables
	let showSondageDetails = $state(false);

	const hasSondage = $derived(!currentEvent.date_event && currentEvent.dates_proposed?.length);

	const hasNoPropositions = $derived(
		!currentEvent.date_event && currentEvent.dates_proposed?.length === 0
	);

	const hasDate = $derived(currentEvent.date_event);
	const hasTime = $derived(!!currentEvent.time_start && !!currentEvent.time_end);
	const hasRooms = $derived(
		currentEvent.rooms?.some((room) => room && room.trim() !== "") ?? false
	);
	const timeDisplay = $derived(
		hasTime ? `${currentEvent.time_start} - ${currentEvent.time_end}` : ""
	);

	const statusMessage = $derived.by(() => {
		if (!currentEvent.date_event && !hasTime) return "Date et horaires à définir";
		if (!currentEvent.date_event) return "Date à définir";
		if (!hasTime) return "Horaires à définir";
		return "";
	});

	const hasAuth = $derived.by(() =>
		hasAuthorizations({
			isRecurrent: currentEvent.isRecurrent,
			recurrenceTeam: currentEvent.recurrence?.recurrenceTeam,
			createdBy: currentEvent.created_by
		})
	);

	let organizersLabel = $derived.by(() => {
		if (hasSondage) return "Organisateur•ices - Sondage disponibilité";
		else if (hasNoPropositions) return "Pas de dates proposées";
		return "Organisateur•ices";
	});

	let oldDatesProposed: DatesProposed[] = $state([]);
	let datesFutureProposed: DatesProposed[] = $state([]);

	let bgDateTime = $derived.by(() => {
		if (currentEvent.canceled) return "bg-error/20";
		else if (currentEvent.isConfirmed) return "bg-success/20";
		else return "bg-warning/20";
	});

	// effect

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

	// functions

	const handleTaskSubscription = () => {
		if (!currentUser) return;
		eventsStore.manageTaskSubscription(currentEvent, currentUser);
	};

	const taskButtonState = $derived.by(() => {
		if (
			// ne devrait pas arriver ormis canceled,
			!currentUser ||
			currentEvent.canceled ||
			!Array.isArray(currentEvent.tasks) ||
			currentEvent.tasks.length === 0
		) {
			return { text: "Inscription Indisponible", disabled: true, isSubscribed: false };
		}

		const isSubscribed = currentEvent.organizers?.some((org) => org.id === currentUser.id);

		if (currentEvent.tasks.length > 1) {
			return { text: isSubscribed ? "mes tâches" : "S'inscrire", disabled: false, isSubscribed };
		} else {
			// Cas avec 1 seule tâche
			return {
				text: isSubscribed ? "Se désinscrire" : "S'inscrire",
				disabled: false,
				isSubscribed
			};
		}
	});

	const toggleAllDetails = () => {
		showSondageDetails = !showSondageDetails;
	};

	const openModal = (type: "sondage" | "organizers" | "tasks", event: SyncEventRecord) => {
		if (type === "sondage") {
			eventState.is = event;
			modalState.dateSondage = true;
		} else if (type === "tasks") {
			modalState.tasks = true;
		} else {
			modalState.organizers = true;
		}
	};

	const isUserSubscribedToTask = (task: string) => {
		return currentEvent.organizers.some(
			(org) => org.id === currentUser.id && org.tasks.includes(task)
		);
	};

	const handleSondageSubscription = (date: string, maybehereValue: string) => {
		const updatedDatesProposed = currentEvent.dates_proposed?.map((dateProposed) => {
			if (dateProposed.dateStart === date) {
				const isUserSubscribed = dateProposed.organizers.some((org) => org.id === currentUser.id);
				let updatedOrganizers = [...dateProposed.organizers];

				if (isUserSubscribed) {
					updatedOrganizers = updatedOrganizers.map((org) => {
						if (org.id === currentUser.id) {
							return { ...org, maybehere: maybehereValue };
						}
						return org;
					});
				} else {
					updatedOrganizers.push({
						id: currentUser.id,
						username: currentUser.username,
						tasks: [], // FIXIT: Les tâches n'ont que la tache par defaut pendant le sondage
						maybehere: maybehereValue
					});
				}

				return {
					...dateProposed,
					organizers: updatedOrganizers
				};
			}
			return dateProposed;
		});

		updateEvent(currentEvent.id, { dates_proposed: updatedDatesProposed });
	};

	const validateDate = (selectedDate: DatesProposed) => {
		const hasConfirmedOrganizers = selectedDate.organizers.some((org) => org.maybehere === "oui");

		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Confirmation de la date",
				message: hasConfirmedOrganizers
					? "En validant cette date, les organisateur·ices inscrit·es seront notifié·es par email, et le sondage sera cloturé. Voulez-vous continuer ?"
					: "Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date. Êtes-vous sûr·e de vouloir la valider ?",
				variant: hasConfirmedOrganizers ? "warning" : "danger",
				onConfirm: () => {
					const dateEvent = new Date(selectedDate.dateStart).toISOString().split("T")[0];
					const timeStart = new Date(selectedDate.dateStart).toTimeString().slice(0, 5);
					const timeEnd = new Date(selectedDate.dateEnd).toTimeString().slice(0, 5);
					// USELESS ?
					// const confirmedOrganizers = selectedDate.organizers
					// 	.filter((org) => org.maybehere === 'oui')
					// 	.map((org) => {
					// 		const existingOrganizer = currentEvent.organizers.find(
					// 			(existing) => existing.id === org.id
					// 		);

					// 		const tasks = existingOrganizer
					// 			? [...new Set([...existingOrganizer.tasks, getTasks.defaultTask])]
					// 			: [getTasks.defaultTask];

					// 		return {
					// 			id: org.id,
					// 			username: org.username,
					// 			email: org.email,
					// 			tasks: tasks,
					// 			role: org.role
					// 		};
					// 	});

					updateEvent(currentEvent.id, {
						date_event: dateEvent,
						time_start: timeStart,
						time_end: timeEnd,
						organizers: filterAndConvertOrganizers(selectedDate.organizers)
						// dates_proposed: []
					});
				}
			}
		};
	};

	// USELESS ? Keep It ?
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
</script>

<div transition:fade>
	<div
		id={currentEvent.id}
		class="transition:fade mb-8 rounded-lg border bg-white shadow-md md:mb-4 {currentEvent.isConfirmed
			? ''
			: 'border-l-4 border-l-amber-500'}"
	>
		<TopAlert thisEvent={currentEvent} />
		<!-- <span>auth : {hasAuth}</span> -->
		<div class="pb-4">
			<div class="justify-between gap-2 md:flex">
				<!-- ::: date -->
				<div id="Top_event_date" class="px-6 py-2 shadow md:mt-2 md:rounded-l-xl {bgDateTime}">
					<!-- Container principal -->
					<div
						class="align-end flex flex-wrap items-baseline justify-center gap-x-4 md:flex-col md:items-end"
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
							<span class="text-base-content/70 text-center italic">
								{statusMessage}
							</span>
						{/if}

						<!-- Ligne 3 : Salles -->
						{#if hasRooms}
							<div class="text-base-content/70 font-medium">
								<span class="text-fluid-sm">salle·s :</span>
								{#each currentEvent.rooms as room, index (room)}
									{#if room && room.trim() !== ""}
										<span class="text-md text-base-content">
											{room}{index <
											currentEvent.rooms.filter((r) => r && r.trim() !== "").length - 1
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

				<div class="w-full px-4 py-2 md:order-first md:w-3/5">
					<h2 class="mb-1">{currentEvent.event_title}</h2>
					{#each currentEvent.categories as category, index (category)}
						<span class="text-fluid-sm text-base-content font-bold uppercase">
							{category}{index < currentEvent.categories.length - 1 ? ", " : ""}
						</span>
					{/each}
					{#if currentEvent.reportedFrom}
						<div class="text-fluid-sm text-base-content/70 p-1">
							Initialement prévu le {lisibleDate(currentEvent.reportedFrom)}
						</div>
					{/if}
				</div>
			</div>

			<!-- TODO enhance condition with props  -->
			{#if !currentEvent.canceled}
				<div id="event_content" class="flex flex-col gap-y-4 md:p-4">
					<!-- ::: description -->
					{#if currentEvent.description}
						<ExpandableCard title="à propos..." text={currentEvent.description} />
					{/if}

					<!-- ::: external_proposal -->
					{#if !currentEvent.date_event && currentEvent.external_proposal?.period_preference && currentEvent.external_proposal.period_preference.length > 0}
						<ExpandableCard
							title="Période proposée par les intervenant·es :"
							text={currentEvent.external_proposal.period_preference}
						/>
					{/if}

					<!-- ::: Organizers Card -->

					<div id="organizers_card" class="bg-base-200 border md:rounded-lg">
						<div
							class="text-fluid-sm flex w-full items-center justify-between p-1 font-semibold md:rounded-t-lg"
						>
							<div class="text-base-content px-2">
								{organizersLabel}
							</div>
							<!--::: Top - Cas 1: aucune date de proposé, ni sondage -->
							<div class="me-1">
								{#if hasSondage && hasAuth}
									<button
										onclick={() => openModal("sondage", currentEvent)}
										class="btn btn-link btn-compact"
									>
										<CalendarPlus />
										<span class="not-md:hidden">Modifier le sondage</span>
									</button>
								{:else if hasDate && currentEvent.tasks?.length > 0}
									<button
										class="btn btn-link btn-compact {taskButtonState.isSubscribed
											? 'text-error'
											: 'text-primary'}"
										onclick={handleTaskSubscription}
										disabled={taskButtonState.disabled}
									>
										{#if taskButtonState.isSubscribed}
											<UserCheck class="mr-1 h-4 w-4" />
										{:else}
											<UserPlus class="mr-1 h-4 w-4" />
										{/if}
										{taskButtonState.text}
									</button>
								{:else if hasNoPropositions && hasAuth}
									<button
										onclick={() => openModal("sondage", currentEvent)}
										class="btn btn-compact btn-link"
									>
										<CalendarPlus />
										<span class="not-md:hidden">Créer un sondage</span>
									</button>
								{/if}
							</div>
						</div>
						<div>
							<div class=" flex flex-col rounded-b-lg {hasSondage ? 'mb-4 p-2' : ''} ">
								<!--::: Cas 2:  sondage est en cours -->
								{#if hasSondage}
									<div class=" text-base-content items-baseline gap-2 p-2">
										<!-- <p class="ml-auto text-fluid-sm">Serez vous disponibles à ces dates ?</p> -->

										<!-- __ Bouton afficher/masquer tous les détails -->
										<button
											class="btn btn-link btn-compact ml-auto flex"
											onclick={toggleAllDetails}
										>
											{showSondageDetails ? "Masquer les détails" : "Afficher les détails"}
											{#if showSondageDetails}
												<ChevronUp class="ml-1 h-3 w-3" />
											{:else}
												<ChevronDown class="ml-1 h-3 w-3" />
											{/if}
										</button>
									</div>
									<div class="flex flex-col divide-y sm:space-y-2">
										{#each datesFutureProposed as data (currentEvent.id + "-date-" + data.dateStart)}
											{@const oui = data.organizers.filter((org) => org.maybehere === "oui").length}
											{@const peutetre = data.organizers.filter(
												(org) => org.maybehere === "peut-être"
											).length}
											{@const non = data.organizers.filter((org) => org.maybehere === "non").length}

											<!-- USE spectial class for bestDate ? -->
											<!-- {bestDate ===
											data.dateStart
												? 'ring-success/30 ring-2'
												: ''}
												{showSondageDetails ? 'mb-4 ' : 'border'}
												-->
											<div
												class="transition:fade border bg-white p-2 sm:rounded-lg sm:shadow-sm
													"
											>
												<div class=" flex items-center justify-between gap-y-2 not-sm:flex-wrap">
													<div
														id="sondage-date-top"
														class="flex flex-grow items-center justify-between not-sm:flex-wrap not-sm:gap-y-2 sm:max-w-2/3"
													>
														<div class="flex items-center">
															{#if hasAuth}
																<div class="tooltip px-1" data-tip="Valider cette date">
																	<button
																		onclick={() => validateDate(data)}
																		class="btn btn-outline btn-square {data.organizers.some(
																			(org) => org.maybehere === 'oui'
																		)
																			? 'btn-success'
																			: 'text-neutral/50'}"
																	>
																		<CalendarCheck />
																	</button>
																</div>
															{/if}
															<div
																class="text-fluid-base flex flex-wrap gap-x-4 px-3 font-semibold not-sm:order-2"
															>
																<div>{lisibleDate(data.dateStart)}</div>

																<div>
																	{lisibleTime(data.dateStart)} - {lisibleTime(data.dateEnd)}
																</div>
															</div>
														</div>
														<!--:::___ Résumé des votes -->
														<div class="ml-2 flex items-center space-x-1 not-sm:order-3">
															<span
																class="text-fluid-sm flex items-center rounded-full px-1.5 py-0.5 font-medium {oui >
																0
																	? 'bg-success/20'
																	: ''}"
															>
																<ThumbsUp class="mr-0.5 h-4 w-4" />
																{oui}
															</span>

															<span
																class="text-fluid-sm flex items-center rounded-full px-1.5 py-0.5 font-medium {peutetre >
																0
																	? 'text-warning-content bg-warning/20'
																	: ''}"
															>
																<BadgeHelp class="mr-0.5 h-4 w-4" />
																{peutetre}
															</span>

															<span
																class="text-fluid-sm flex items-center rounded-full px-1.5 py-0.5 font-medium {non >
																0
																	? 'bg-error/20 text-error-content'
																	: ''}"
															>
																<ThumbsDown class="mr-0.5 h-4 w-4" />
																{non}
															</span>
														</div>
													</div>

													<div class="mr-2 ml-auto">
														<GroupRadioButton
															value={data.organizers.find((org) => org.id === currentUser.id)
																?.maybehere}
															onChange={(newValue) =>
																handleSondageSubscription(data.dateStart, newValue)}
														/>
													</div>
												</div>
												<!--:::__ Section expandable pour les détails des votes -->
												{#if showSondageDetails}
													<div transition:fade={{ duration: 150 }} class="mt-2 px-1">
														<div class="bg-base-100 rounded-md p-2">
															{#if data.organizers.length === 0}
																<p class="text-fluid-sm text-base-content/70">
																	Aucune réponse pour le moment
																</p>
															{:else}
																<div class="text-fluid-sm grid gap-1">
																	<div
																		class=" text-base-content/70 grid grid-cols-3 gap-1 font-medium"
																	>
																		<div class="flex items-center">
																			<ThumbsUp class="text-success mr-1 h-4" /> Disponible
																		</div>
																		<div class="flex items-center">
																			<BadgeHelp class="text-warning mr-1 h-4" /> Peut-être
																		</div>
																		<div class="flex items-center">
																			<ThumbsDown class="text-error mr-1 h-4" /> Indisponible
																		</div>
																	</div>

																	<hr class="my-1" />

																	<div class="grid grid-cols-3 gap-1">
																		<div class="flex flex-wrap gap-2">
																			{#each data.organizers.filter((org) => org.maybehere === "oui") as org (org.id)}
																				<div class="badge bg-success/20">
																					{org.username}
																				</div>
																			{/each}
																		</div>
																		<div class="flex flex-wrap gap-2">
																			{#each data.organizers.filter((org) => org.maybehere === "peut-être") as org (org.id)}
																				<div class="badge bg-warning/20">
																					{org.username}
																				</div>
																			{/each}
																		</div>
																		<div class="flex flex-wrap gap-2">
																			{#each data.organizers.filter((org) => org.maybehere === "non") as org (org.id)}
																				<div class="badge bg-error/20">
																					{org.username}
																				</div>
																			{/each}
																		</div>
																	</div>
																</div>
															{/if}
														</div>
													</div>
												{/if}
											</div>
										{/each}
									</div>
									{#if hasSondage && oldDatesProposed.length > 0}
										<div class="text-fluid-xs text-base-content/70 p-2 italic">
											Des dates déjà passées ont été proposées précédemment, et ont été
											automatiquement supprimées ( {#each oldDatesProposed as date (currentEvent.id + "-old-" + date.dateStart)}
												{lisibleDate(date.dateStart)},
											{/each} )
										</div>
									{/if}
								{/if}

								<!--::: Cas 3: une date est déjà proposée -->
								{#if hasDate}
									<!-- tasks card -->
									{#if currentEvent.tasks && currentEvent.tasks.length > 1}
										<div class="sm:grid sm:grid-cols-3 sm:justify-around sm:gap-4 sm:p-4">
											{#each currentEvent.tasks as task, index (currentEvent.id + "-task-" + task.name)}
												{@const organizersForTask = currentEvent.organizers.filter((org) =>
													org.tasks.includes(task.name)
												)}
												<div
													class="text-fluid-sm border bg-white font-semibold shadow-xs sm:rounded-lg"
												>
													<div
														class="text-base-content mb-2 flex justify-items-center rounded-t-lg px-4 py-1 text-center {currentEvent.organizers.some(
															(org) => org.tasks.includes(task.name)
														)
															? 'text-base-content'
															: 'text-error '}"
													>
														{task.name}
														{#if task.description}
															<div
																class="tooltip tooltip-info ml-auto text-sm"
																data-tip={task.description}
															>
																<Info size={18} />
															</div>
														{/if}
													</div>
													<div class="mb-2 flex flex-wrap gap-2 px-2">
														{#each organizersForTask as organizer (currentEvent.id + "-org-" + organizer.id)}
															<span
																transition:fade|local
																class="badge"
																class:border-2={organizer.id === currentUser.id}
																class:border-slate-700={organizer.id === currentUser.id}
																class:border={organizer.id !== currentUser.id}
																class:border-slate-400={organizer.id !== currentUser.id}
															>
																{organizer.username}
															</span>
														{/each}
														<button
															class="btn btn-sm btn-compact ml-auto"
															onclick={() =>
																eventsStore.manageTaskSubscription(
																	currentEvent,
																	currentUser,
																	task.name
																)}
														>
															{isUserSubscribedToTask(task.name) ? "Se désinscrire" : "S'inscrire"}
														</button>
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<div class="flex flex-wrap gap-2">
											{#if !currentEvent.organizers.length}
												<span class=" text-fluid-sm text-base-content/70 p-2 italic">
													personne pour le moment...
												</span>
											{:else}
												<div class=" flex flex-wrap gap-2 p-3">
													{#each currentEvent.organizers.filter( (org) => org.tasks.includes(currentEvent.tasks[0].name) ) as organizer (currentEvent.id + "-org-name-" + organizer.id)}
														<span
															class="badge badge-soft badge-neutral
																{organizer.id === currentUser.id ? 'font-semibold' : ''}"
														>
															{organizer.username}
														</span>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								{/if}
							</div>
							<!-- ::: __ mandats a se répartir> -->
							{#if !hasDate && currentEvent.tasks && currentEvent.tasks.length > 1}
								<div class=" text-base-content/70 p-2">
									<p class="text-fluid-xs">
										Mandats à se répartir pour la gestion de l'événement : <span class="italic">
											{#each currentEvent.tasks as task, index (currentEvent.id + "mandat" + task.name)}
												{task.name}{index < currentEvent.tasks.length - 1 ? ", " : ""}
											{/each}
										</span>
									</p>
									{#if hasSondage}
										<p class="text-fluid-xs">
											Le sondage de disponibilité ne concerne que la présence
										</p>
									{/if}
								</div>
							{:else if currentEvent.tasks && currentEvent.tasks.length === 1}
								<div class="text-fluid-xs text-base-content/70 p-2">
									L'inscription concerne le mandat "{currentEvent.tasks[0].name}".
									{#if currentEvent.tasks[0].description}
										<br />{currentEvent.tasks[0].description}
									{/if}
									Il n'y a pas d'autre mandat à se répartir.
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
		<ButtonAction thisEvent={currentEvent} />
	</div>
</div>

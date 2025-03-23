<script lang="ts">
	import ExpandableCard from '$lib/components/ExpandableCard.svelte';
	import GroupRadioButton from '$lib/components/GroupRadioButton.svelte';
	import { updateEvent } from '$lib/pocketbase.svelte';
	import {
		filterAndConvertOrganizers,
		handleTaskSubscription,
		lisibleDate,
		lisibleTime,
		tooltip
	} from '$lib/utils';
	import { eventState, hasAuthorizations, modalState, openTaskModal } from '$lib/shared/states.svelte';
	import type { EventType, OrganizerType, SyncEventRecord } from '$lib/types/event';
	import type { EventsRecord } from '$lib/types/pocketbase';
	import type { UserType } from '$lib/types/types';

	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';

	import {
		BadgeHelp,
		CalendarCheck,
		CalendarX2,
		ChevronDown,
		ChevronUp,
		ThumbsDown,
		ThumbsUp
	} from 'lucide-svelte';
	import { CalendarPlus, UserMinus, UserPlus } from 'lucide-svelte';

	import ButtonAction from './ButtonAction.svelte';
	import TopAlert from './TopAlert.svelte';

	interface Props {
		currentEvent: EventType;
	}

	interface DatesProposed {
		dateStart: string;
		dateEnd: string;
		organizers: OrganizerType[];
	}

	interface Tasks {
		defaultTask: string;
		list: string[];
	}

	// ::: context & props
	const { currentEvent }: Props = $props();

	let currentUser: UserType = getContext('currentUser');
	let getTasks: Tasks = getContext('tasks');

	// ::: reactive variables
	let showSondageDetails = $state(false);

	const hasSondage = $derived(!currentEvent.date_event && currentEvent.dates_proposed?.length);

	const hasNoPropositions = $derived(
		!currentEvent.date_event && currentEvent.dates_proposed?.length === 0
	);

	const hasDate = $derived(currentEvent.date_event);
	const hasTime = $derived(!!currentEvent.time_start && !!currentEvent.time_end);
	const hasRooms = $derived(
		currentEvent.rooms?.some((room) => room && room.trim() !== '') ?? false
	);
	const timeDisplay = $derived(
		hasTime ? `${currentEvent.time_start} - ${currentEvent.time_end}` : ''
	);

	const statusMessage = $derived.by(() => {
		if (!currentEvent.date_event && !hasTime) return 'Date et horaires à définir';
		if (!currentEvent.date_event) return 'Date à définir';
		if (!hasTime) return 'Horaires à définir';
		return '';
	});


	const hasAuth = $derived.by(() => hasAuthorizations({
  isRecurrent: currentEvent.isRecurrent,
  recurrenceTeam: currentEvent.recurrenceTeam,
  createdBy: currentEvent.created_by
}));

	let organizersLabel = $derived.by(() => {
		if (hasSondage) return 'Organisateur•ices - Sondage disponibilité';
		else if (hasNoPropositions) return 'Pas de dates proposées';
		return 'Organisateur•ices';
	});

	let isOrganizer = $derived(
		currentEvent.organizers &&
			currentEvent.organizers.some((organizer) => organizer.id === currentUser.id)
	);

	let oldDatesProposed: DatesProposed[] = $state([]);
	let datesFutureProposed: DatesProposed[] = $state([]);

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

	const handleOrganizersBtn = () => {
		if (hasNoPropositions) {
			openModal('sondage', currentEvent);
		} else if (hasDate && currentEvent.tasks.length >= 2) {
			handleOpenTaskModal();
		} else if (isOrganizer) {
			unsubscribeUser(currentEvent);
		} else {
			subscribeUser(currentEvent);
		}
	};

	const toggleAllDetails = () => {
		showSondageDetails = !showSondageDetails;
	};

	const handleOpenTaskModal = () => {
		openTaskModal({
			username: currentUser.username,
			tasks: currentEvent.tasks,
			selectedTasks: [],
			onSubmit: (selectedTasks) => {
				const currentOrganizers = Array.isArray(currentEvent.organizers)
					? currentEvent.organizers
					: [];

				// 2. Mettre à jour la liste des organisateurs
				const updatedOrganizers = currentOrganizers.map((organizer) => {
					if (organizer.id === currentUser.id) {
						// Si c'est l'organisateur courant, on met à jour ses tâches
						return { ...organizer, tasks: selectedTasks };
					}
					return organizer; // Sinon, on garde l'organisateur inchangé
				});
				updateEvent(currentEvent.id, { organizers: updatedOrganizers });
			}
		});
	};

	const openModal = (type: 'sondage' | 'organizers' | 'tasks', event: SyncEventRecord) => {
		if (type === 'sondage') {
			eventState.is = event;
			modalState.dateSondage = true;
		} else if (type === 'tasks') {
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

	const handleTask = (task: string) => {
		handleTaskSubscription({
			task,
			currentUser,
			event: currentEvent,
			onShowConfirmModal: (options) => {
				modalState.confirm = {
					isOpen: true,
					data: {
						title: options.title,
						message: options.message,
						onConfirm: options.onConfirm,
						variant: 'warning'
					}
				};
			}
		});
	};

	const handleSondageSubscription = (date, maybehereValue) => {
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
						email: currentUser.email,
						tasks: [{ name: getTasks.defaultTask, description: '' }], // Les tâches n'ont que la tache par defaut pendant le sondage
						role: currentUser.role,
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
		const hasConfirmedOrganizers = selectedDate.organizers.some((org) => org.maybehere === 'oui');

		modalState.confirm = {
			isOpen: true,
			data: {
				title: 'Confirmation de la date',
				message: hasConfirmedOrganizers
					? 'En validant cette date, les organisateur·ices inscrit·es seront notifié·es par email, et le sondage sera cloturé. Voulez-vous continuer ?'
					: "Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date. Êtes-vous sûr·e de vouloir la valider ?",
				variant: hasConfirmedOrganizers ? 'warning' : 'danger',
				onConfirm: () => {
					const dateEvent = new Date(selectedDate.dateStart).toISOString().split('T')[0];
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
						organizers: filterAndConvertOrganizers(selectedDate.organizers),
						// dates_proposed: []
					});
				}
			}
		};
	};

	// const removeDate = (data: DateProposal): void => {
	// 	modalState.confirm = {
	// 		isOpen: true,
	// 		data: {
	// 			title: 'Supprimer cette date',
	// 			message: `Êtes-vous sûr de vouloir supprimer la date du ${lisibleDate(data.dateStart)} (${lisibleTime(data.dateStart)} - ${lisibleTime(data.dateEnd)}) ?`,
	// 			onConfirm: async () => {
	// 				try {
	// 					const updatedEvent = {
	// 						...currentEvent,
	// 						dates_proposed: currentEvent.dates_proposed.filter(
	// 							(date) => date.dateStart !== data.dateStart
	// 						)
	// 					};
	// 					await updateEvent(currentEvent.id, updatedEvent);
	// 				} catch (error) {
	// 					console.error('Error removing date:', error);
	// 				}
	// 			}
	// 		}
	// 	};
	// };

	const subscribeUser = async (event: EventsRecord) => {
		const userObject = {
			username: currentUser.username,
			id: currentUser.id,
			email: currentUser.email,
			tasks: [getTasks.defaultTask],
			role: '',
			maybehere: ''
		};

		// Ensure event.organizers is initialized
		const currentOrganizers = Array.isArray(event.organizers) ? event.organizers : [];
		// Créer un nouveau tableau d'organisateurs
		const updatedOrganizers = [...currentOrganizers, userObject];
		await updateOrganizers(event.id!, updatedOrganizers);
	};

	const unsubscribeUser = async (event: EventsRecord) => {
		// Filtrer les organisateurs pour exclure l'utilisateur actuel
		const updatedOrganizers =
			event.organizers?.filter((organizer) => organizer.id !== currentUser.id) || [];

		// Mettre à jour dans PocketBase
		await updateOrganizers(event.id!, updatedOrganizers);
	};

	const updateOrganizers = async (eventId: string, organizers: OrganizerType[]) => {
		await updateEvent(eventId, { organizers: organizers });
	};

	const bestDate = $derived.by(() => {
		if (!currentEvent.dates_proposed?.length) return null;

		const bestProposal = currentEvent.dates_proposed.reduce<DatesProposed | null>((acc, curr) => {
			const currOuiCount = curr.organizers.filter((org) => org.maybehere === 'oui').length;
			const accOuiCount = acc ? acc.organizers.filter((org) => org.maybehere === 'oui').length : 0;

			if (currOuiCount === 0) return acc;
			if (!acc || currOuiCount > accOuiCount) {
				return curr;
			}
			return acc;
		}, null);
		return bestProposal?.dateStart || null;
	});
</script>

<div transition:fade>
	<div
		id={currentEvent.id}
		class="transition:fade mb-8 rounded-lg border bg-white shadow-lg md:mb-4 {currentEvent.isConfirmed
			? 'border-gray-200'
			: 'border-l-4 border-l-amber-500'}"
	>
		<TopAlert thisEvent={currentEvent} />
		<!-- <span>auth : {hasAuth}</span> -->
		<div class="pb-4">
			<div class="justify-between gap-2 md:flex">
				<!-- ::: date -->
				<div
					id="Top_event_date"
					class="px-6 py-2 shadow md:mt-2 md:rounded-l-xl {currentEvent.isConfirmed
						? 'bg-success/20'
						: 'bg-warning/20'} {currentEvent.canceled ? 'bg-error/20' : ''}"
				>
					<!-- Container principal -->
					<div
						class="align-end flex flex-wrap items-baseline justify-center gap-x-4 md:flex-col md:items-end"
					>
						<!-- Ligne 1 : Date + Time en mobile -->
						{#if currentEvent.date_event}
							<span class="text-fluid-base font-bold {currentEvent.canceled ? 'line-through' : ''}">
								{lisibleDate(currentEvent.date_event)}
							</span>
						{/if}
						{#if timeDisplay}
							<span class=" font-medium {currentEvent.canceled ? 'line-through' : ''}">
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
								{#each currentEvent.rooms as room, index (index)}
									{#if room && room.trim() !== ''}
										<span class="text-md text-base-content">
											{room}{index <
											currentEvent.rooms.filter((r) => r && r.trim() !== '').length - 1
												? ', '
												: ''}
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
							{category}{index < currentEvent.categories.length - 1 ? ', ' : ''}
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

					<div
						id="organizers_card"
						class="divide-y border-y border-gray-300 md:rounded-lg md:border"
					>
						<div
							class="text-fluid-sm flex w-full items-center justify-between rounded-t-lg border-gray-300 bg-slate-100 p-1 font-semibold"
						>
							<div class="text-base-content px-2">
								{organizersLabel}
							</div>
							<!--::: Top - Cas 1: aucune date de proposé, ni sondage -->
							<div class="me-1">
								{#if hasNoPropositions}
									<button onclick={handleOrganizersBtn} class="btn">
										<CalendarPlus />
										<span class="not-md:hidden">Créer un sondage</span>
									</button>
								{:else if hasSondage}
									{#if hasAuth}
										<button onclick={() => openModal('sondage', currentEvent)} class="btn">
											<CalendarPlus />
											<span class="not-md:hidden">Modifier le sondage</span>
										</button>
									{/if}
									<!-- ::: top: Cas 3 : une date proposé et Une seule tache -->
								{:else if hasDate && currentEvent.tasks.length === 1}
									<button class="btn" onclick={() => handleTask(currentEvent.tasks[0])}>
										{isUserSubscribedToTask(currentEvent.tasks[0])
											? 'Se désinscrire'
											: "S'inscrire"}
									</button>
								{/if}
							</div>
						</div>
						<div>
							<div class="flex flex-col rounded-b-lg bg-white {hasSondage ? 'mb-4 p-2' : ''} ">
								<!--::: Cas 2:  sondage est en cours -->
								{#if hasSondage}
									<div class=" text-base-content items-baseline gap-2 p-2">
										<!-- <p class="ml-auto text-fluid-sm">Serez vous disponibles à ces dates ?</p> -->

										<!-- __ Bouton afficher/masquer tous les détails -->
										<button
											class="text-fluid-sm ml-auto flex items-center text-blue-600 hover:underline"
											onclick={toggleAllDetails}
										>
											{showSondageDetails ? 'Masquer les détails' : 'Afficher les détails'}
											{#if showSondageDetails}
												<ChevronUp class="ml-1 h-3 w-3" />
											{:else}
												<ChevronDown class="ml-1 h-3 w-3" />
											{/if}
										</button>
									</div>
									<div class="flex flex-col divide-y">
										{#each datesFutureProposed as data (data.dateStart)}
											{@const oui = data.organizers.filter((org) => org.maybehere === 'oui').length}
											{@const peutetre = data.organizers.filter(
												(org) => org.maybehere === 'peut-être'
											).length}
											{@const non = data.organizers.filter((org) => org.maybehere === 'non').length}

											<div
												class="transition:fade rounded-e bg-white py-2 shadow-md {bestDate ===
												data.dateStart
													? 'border-l-4 border-l-green-300'
													: ''}
													{showSondageDetails ? 'mb-4 ' : 'border'}

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
																		class="btn btn-success btn-outline btn-square {data.organizers.some(
																			(org) => org.maybehere === 'oui'
																		)
																			? ''
																			: 'text-gray-300'}"
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
													<div transition:fade={{ duration: 150 }} class="mt-2 px-3 pb-2">
														<div class="rounded-md bg-gray-50 p-2">
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
																			<ThumbsUp class="text-success-content mr-1 h-4" /> Disponible
																		</div>
																		<div class="flex items-center">
																			<BadgeHelp class="text-warning-content mr-1 h-4" /> Peut-être
																		</div>
																		<div class="flex items-center">
																			<ThumbsDown class="text-error-content mr-1 h-4" /> Indisponible
																		</div>
																	</div>

																	<hr class="my-1" />

																	<div class="grid grid-cols-3 gap-1">
																		<div class="flex flex-wrap gap-2">
																			{#each data.organizers.filter((org) => org.maybehere === 'oui') as org (org.id)}
																				<div
																					class="py-.5 bg-success/20 text-fluid-sm ring-success/30 w-max-fit h-fit rounded-xl px-2 shadow-xs ring {org.id ===
																					currentUser.id
																						? 'font-bold'
																						: ''}"
																				>
																					{org.username}
																				</div>
																			{/each}
																		</div>
																		<div class="flex flex-wrap gap-2">
																			{#each data.organizers.filter((org) => org.maybehere === 'peut-être') as org (org.id)}
																				<div
																					class="py-.5 bg-warning/20 text-fluid-sm ring-warning/30 h-fit rounded-xl px-2 shadow-xs ring {org.id ===
																					currentUser.id
																						? 'font-bold'
																						: ''}"
																				>
																					{org.username}
																				</div>
																			{/each}
																		</div>
																		<div class="flex flex-wrap gap-2">
																			{#each data.organizers.filter((org) => org.maybehere === 'non') as org (org.id)}
																				<div
																					class="py-.5 text-fluid-sm ring-error/30 bg-error/20 h-fit rounded-xl px-2 shadow-xs ring {org.id ===
																					currentUser.id
																						? 'font-bold'
																						: ''}"
																				>
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
										<div class="text-fluid-sm text-base-content/70 p-2 italic">
											Des dates déjà passées ont été proposées précédemment, et ont été
											automatiquement supprimées ( {#each oldDatesProposed as date (date.dateStart)}
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
											{#each currentEvent.tasks as task (task)}
												{@const organizersForTask = currentEvent.organizers.filter((org) =>
													org.tasks.includes(task)
												)}
												<div
													class="text-fluid-sm rounded-lg border font-semibold {!currentEvent.organizers.some(
														(org) => org.tasks.includes(task)
													)
														? 'border-red-300'
														: 'border-gray-300'}"
												>
													<div
														class="text-base-content mb-2 rounded-t-lg bg-gray-100 px-4 py-1 text-center"
													>
														{task}
													</div>
													<div class="mb-2 flex flex-wrap gap-2 px-2">
														{#each organizersForTask as organizer (organizer.id)}
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
														<button class="btn btn-sm ml-auto" onclick={() => handleTask(task)}>
															{isUserSubscribedToTask(task) ? 'Se désinscrire' : "S'inscrire"}
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
													{#each currentEvent.organizers.filter( (org) => org.tasks.includes(currentEvent.tasks[0]) ) as organizer (organizer.id)}
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
											{#each currentEvent.tasks as task, index (index)}
												{task}{index < currentEvent.tasks.length - 1 ? ', ' : ''}
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
									L'inscription concerne le mandat "{currentEvent.tasks[0]}". Il n'y a pas d'autre
									mandat à se répartir.
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

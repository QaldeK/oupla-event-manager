<script lang="ts">
	import { debounce } from "$lib/actions/debounce";
	import Checkbox from "$lib/components/Checkbox.svelte";
	import ErrorMessage from "$lib/components/ErrorMessage.svelte";
	import Frame from "$lib/components/Frame.svelte";
	import GroupCheckBox from "$lib/components/GroupCheckBox.svelte";
	import Info from "$lib/components/Info.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import Quill from "$lib/components/Quill.svelte";
	import AddTaskForm from "$lib/components/forModal/AddTaskForm.svelte";
	import ButtonGroupSelect from "$lib/components/forModal/ButtonGroupSelect.svelte";
	import DatePickerProposed from "$lib/components/forModal/DatePickerProposed.svelte";
	import DateUniq from "$lib/components/forModal/DateUniq.svelte";
	import OrganizersAndTasksSelect from "$lib/components/forModal/OrganizersAndTasksSelect.svelte";
	import RecurrentTab from "$lib/components/forModal/RecurrentTab.svelte";
	import Textarea from "$lib/components/ui-custom/textarea/textarea.svelte";
	import { pb } from "$lib/pocketbase.svelte";
	import { ConflictCalculator } from "$lib/services/conflictService.svelte";
	import { getDefaultRecurrence, getNewEvent } from "$lib/services/eventActions";
	import { getSpace, userDb } from "$lib/shared";
	import { createEventActionPlan, handleEventAction } from "$lib/shared/eventActionHandler.svelte";
	import {
		eventState,
		getOrganizersPossibles,
		modalState,
		showAlert
	} from "$lib/shared/states.svelte";
	import type { EventMode, EventType } from "$lib/types/event.types";
	import {
		type DateProposedType,
		type RecurrenceConfigType,
		type TaskType
	} from "$lib/types/event.types";
	import {
		createEventDates,
		filterAndConvertOrganizers,
		formatDatePb,
		formatTimePb,
		isValidDate,
		lisibleDate
	} from "$lib/utils";

	import { UserPlus } from "lucide-svelte";
	import { slide } from "svelte/transition";
	// import EventValidationStatus from "./EventValidationStatus.svelte";
	import OtherSetting from "./forModal/OtherSetting.svelte";
	import TimeReservation from "./forModal/TimeReservation.svelte";

	import {
		createEventValidator,
		type ValidationProfile
	} from "$lib/validation/event-validator.svelte";
	import type { ValidationResult } from "$lib/types/validation.types";

	let eventMode: EventMode = $derived.by(() => {
		if (!eventData.id) {
			return eventData.isRecurrent ? "NEW_RECURRENT" : "NEW_SINGLE";
		}

		if (eventData.id && eventData.isRecurrent) {
			return eventData.isMasterRecurrent ? "EDIT_RECURRENT_ALL" : "EDIT_RECURRENT_ONE";
		}

		return "EDIT_SINGLE";
	});

	// ::: Data et Etat réactif
	let eventData = $state<EventType>({
		...eventState.is,

		recurrence: eventState.is.recurrence ?? null
	} as EventType);

	const defaultTask = getSpace.defaultTask as TaskType;

	// 👉 Erreurs calculées seulement si validateur existe
	let errorsMap = $derived.by(() => {
		if (!validator || !validator.hasActiveProfile) return {};
		return validator.errors;
	});

	// :::_ Event Mode & dynamics props
	type DisplayMode = "DATE" | "SONDAGE" | "RECURRENT";

	let displayMode = $derived.by((): DisplayMode => {
		if (eventMode === "NEW_RECURRENT" || eventMode === "EDIT_RECURRENT_ALL") {
			return "RECURRENT";
		}
		if (eventData.isSondage) {
			return "SONDAGE";
		}
		return "DATE";
	});
	let rooms: string[] = getSpace.rooms;
	let categories: string[] = getSpace.categories;
	let spaceMembers = $derived(getOrganizersPossibles());
	let showAddTaskForm = $state(false);

	let organizersPossibles = $derived.by(() => {
		// Commencez avec les membres de l'espace par défaut
		let possible = [...spaceMembers];

		if (eventMode === "EDIT_RECURRENT_ONE") {
			const combined = [
				...(eventData.recurrence?.recurrenceTeam ?? []),
				...(eventData?.organizers ?? [])
			];

			const uniqueMap = new Map();
			combined.filter(Boolean).forEach((org) => {
				if (org && org.id) {
					uniqueMap.set(org.id, org);
				}
			});
			return Array.from(uniqueMap.values());
		} else if (eventMode === "EDIT_RECURRENT_ALL") {
			// Ajoutez les organisateurs déjà sur le master event

			possible = [
				...possible,
				...(eventData.organizers || []).map((org) => ({
					id: org.id,
					username: org.username,
					tasks: []
				})),
				...(eventData.recurrence?.recurrenceTeam || []).map((member) => ({
					id: member.id,
					username: member.username,
					tasks: []
				}))
			];

			// Éliminer les doublons basés sur l'ID
			const uniqueOrganizers = new Map();
			possible.forEach((user) => {
				if (user?.id && !uniqueOrganizers.has(user.id)) {
					uniqueOrganizers.set(user.id, user);
				}
			});
			return Array.from(uniqueOrganizers.values());
		}

		// Pour NEW_SINGLE, NEW_RECURRENT, EDIT_SINGLE, ce sont juste les spaceMembers
		return spaceMembers;
	});

	const modalTitle = $derived.by(() => {
		switch (eventMode) {
			case "NEW_SINGLE":
				return "Créer un nouvel événement";
			case "NEW_RECURRENT":
				return "Créer un événement récurrent";
			case "EDIT_SINGLE":
				return "Modifier l'événement";
			case "EDIT_RECURRENT_ONE":
				return "Modifier l'occurrence de l'événement";
			case "EDIT_RECURRENT_ALL":
				return "Modifier l'ensemble des occurences";
		}
	});

	let dateAndHoursTitle = $derived.by(() => {
		if (displayMode === "RECURRENT") {
			return "Dates et horaires - Configuration de la récurrence";
		} else if (displayMode === "DATE") {
			return "Date et horaire de l'événement";
		} else if (displayMode === "SONDAGE") return "Dates proposées - Sondage";
	});

	let hasExternalPreference = $derived.by(() => !!eventData.external_proposal?.period_preference);

	let startDateObject = $state<Date | null>(null);
	let endDateObject = $state<Date | null>(null);

	// ::: tasks & organizers

	let tasksPossibles = $derived.by(() => {
		let potentialTasks: TaskType[] = [];

		potentialTasks = [...(getSpace.tasks || [])];

		potentialTasks = [...potentialTasks, ...(eventData.tasks || [])];

		// 3. Pour l'édition d'une occurrence, ajouter aussi les tâches de la récurrence parente
		if (eventMode === "EDIT_RECURRENT_ONE" && eventData.recurrence?.tasks) {
			potentialTasks = [...potentialTasks, ...(eventData.recurrence.tasks || [])];
		}

		// 4. Éliminer les doublons en se basant sur le nom
		const uniqueTasksMap = new Map<string, TaskType>();
		potentialTasks.forEach((task) => {
			// Vérifier si la tâche et son nom existent avant d'ajouter à la map
			if (task?.name && !uniqueTasksMap.has(task.name)) {
				uniqueTasksMap.set(task.name, task);
			}
		});

		return Array.from(uniqueTasksMap.values());
	});

	type GroupedTasks = {
		before: TaskType[];
		on: TaskType[];
		after: TaskType[];
		other: TaskType[]; // Pour les tâches sans type ou avec un type inconnu
	};

	let groupedTasks = $derived.by(() => {
		const groups: GroupedTasks = { before: [], on: [], after: [], other: [] };

		tasksPossibles.forEach((task) => {
			switch (task.type) {
				case "beforeEvent":
					groups.before.push(task);
					break;
				case "onEvent":
					groups.on.push(task);
					break;
				case "afterEvent":
					groups.after.push(task);
					break;
				default:
					groups.other.push(task);
					break;
			}
		});
		return groups;
	});

	let tasksLabel = $derived.by(() => {
		switch (eventMode) {
			case "NEW_SINGLE":
			case "EDIT_SINGLE":
				return "Définisser les mandats à réaliser pour cet événement";
			case "NEW_RECURRENT":
			case "EDIT_RECURRENT_ALL":
				return "Définir les mandats à réaliser pour chaque occurrence de cet événement";
			case "EDIT_RECURRENT_ONE":
				return "Modifier les mandats à realiser pour cette occurrence spécifique";
		}
	});

	let hasSondageValidation = $state(eventState.pendingSondageValidation || false);
	// $inspect("hasSondageValidation", hasSondageValidation);
	// instance unique de calcul des conflit pour ce modal
	const conflictCalculator = new ConflictCalculator();

	// ::: $effect

	// // 👉 Réinitialiser le flag pendingSondageValidation après utilisation
	// $effect(() => {
	// 	if (eventState.pendingSondageValidation) {
	// 		hasSondageValidation = true;
	// 		eventState.pendingSondageValidation = false;
	// 	}
	// });

	$effect.pre(() => {
		if (eventData.isRecurrent && !eventData.id && !eventData.recurrence) {
			eventData.recurrence = getDefaultRecurrence();
		} else if (!eventData.isRecurrent && !eventData.id) {
			eventData.recurrence = null;
		}
	});

	// Définir comme MasterRecurrent
	$effect(() => {
		if (eventMode === "NEW_RECURRENT") {
			eventData.isMasterRecurrent = true;
		}
	});

	/*
	 * Mise à jour des dates de début et de fin de l'événement
	 * en fonction de la date et des heures saisies.
	 * Utilise createEventDates pour gérer les événements multi-jours.
	 */
	$effect(() => {
		if (eventData.date_event && eventData.time_start && eventData.time_end) {
			try {
				// 👉 Utilisation de createEventDates qui gère les événements multi-jours
				const { dateStart, dateEnd } = createEventDates(
					eventData.date_event,
					eventData.time_start,
					eventData.time_end
				);

				const startDate = new Date(dateStart);
				const endDate = new Date(dateEnd);

				if (isValidDate(startDate) && isValidDate(endDate)) {
					eventData.dateStart = dateStart;
					eventData.dateEnd = dateEnd;
					startDateObject = startDate;
					endDateObject = endDate;
				} else {
					eventData.dateStart = "";
					eventData.dateEnd = "";
					startDateObject = null;
					endDateObject = null;
				}
			} catch (e) {
				console.error("Error creating date strings:", e);
				eventData.dateStart = "";
				eventData.dateEnd = "";
				startDateObject = null;
				endDateObject = null;
			}
		} else {
			eventData.dateStart = "";
			eventData.dateEnd = "";
			startDateObject = null;
			endDateObject = null;
		}
	});

	// Si defaultTask existe et tasks est vide ou undefined, initialiser avec defaultTask
	$effect(() => {
		if (defaultTask && (!eventData.tasks || eventData.tasks.length === 0)) {
			eventData.tasks = [defaultTask];
		}
	});

	// 👉 Synchroniser tasks avec recurrence.tasks pour les événements récurrents
	$effect(() => {
		if (eventData.isMasterRecurrent && eventData.recurrence && eventData.tasks) {
			// Copier les tâches de l'événement vers la récurrence
			eventData.recurrence.tasks = [...eventData.tasks];
		}
	});

	// ::: functions utilities :::

	function handleFormDateValidation(dateProposal: DateProposedType) {
		const confirmedOrganizersList = filterAndConvertOrganizers(dateProposal.organizers || []);
		const updateEventData = () =>
			(eventData = {
				...eventData,
				date_event: formatDatePb(dateProposal.dateStart),
				time_start: formatTimePb(dateProposal.dateStart),
				time_end: formatTimePb(dateProposal.dateEnd),
				dateStart: dateProposal.dateStart,
				dateEnd: dateProposal.dateEnd,
				isSondage: false,
				organizers: filterAndConvertOrganizers(dateProposal.organizers)
			});
		const hasConfirmedOrganizers = confirmedOrganizersList.length > 0;
		if (!hasConfirmedOrganizers) {
			modalState.confirm = {
				isOpen: true,
				data: {
					title: "Valider cette date",
					message: `Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date (${lisibleDate(dateProposal.dateStart)}). Êtes-vous sûr·e de vouloir la valider ?`,
					variant: hasConfirmedOrganizers ? "warning" : "danger",
					onConfirm: () => {
						updateEventData();
						hasSondageValidation = true;
					}
				}
			};
		} else {
			updateEventData();
			hasSondageValidation = true;
		}
	}

	//  gérer l'ajout depuis AddTaskForm
	function handleAddTask(newTask: TaskType) {
		if (!eventData.tasks) {
			eventData.tasks = []; // Initialise si undefined
		}

		// Vérifier si une tâche avec le même nom existe déjà
		const taskExists = eventData.tasks.some((task) => task.name === newTask.name);

		if (!taskExists) {
			// Ajouter la nouvelle tâche construite par AddTaskForm
			eventData.tasks = [...eventData.tasks, newTask];
			showAddTaskForm = false; // Masquer le formulaire après l'ajout
			showAlert(`Tâche "${newTask.name}" ajoutée.`, "success");
		} else {
			// Afficher une alerte si la tâche existe déjà (géré dans AddTaskForm mais double sécurité)
			showAlert(`Une tâche nommée "${newTask.name}" existe déjà.`, "error");
		}
	}

	// Fonction pour convertir les propositions sélectionnées en dates de sondage
	function convertSelectedToProposed() {
		const selectedProposals =
			eventData.external_proposal?.proposals?.filter((p) => p.selected) || [];

		// Conversion des propositions en format DateProposed
		const newDatesProposed = selectedProposals.map((proposal) => {
			// 👉 Utilisation de createEventDates pour gérer les événements multi-jours
			const { dateStart, dateEnd } = createEventDates(
				proposal.date_event,
				proposal.time_start,
				proposal.time_end
			);

			return {
				dateStart,
				dateEnd,
				organizers: []
			};
		});

		// Ajout des nouvelles dates proposées
		eventData.dates_proposed = [...(eventData.dates_proposed || []), ...newDatesProposed].sort(
			(a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
		);

		// Activation de l'onglet sondage
		eventData.isSondage = true;
	}

	// ::: Form Validation and Submission :::

	const determineValidationProfile = (shouldConfirm?: boolean) => {
		if (eventMode === "NEW_RECURRENT" || eventMode === "EDIT_RECURRENT_ALL") {
			return "RECURRENT_MASTER";
		} else if (eventData.isConfirmed || shouldConfirm) {
			return "STANDARD_EVENT";
		} else {
			return "DRAFT";
		}
	};
	// ::: Gestion de la validation :::

	let hasTriggeredValidation = $state(false);
	let validator = $state<ReturnType<typeof createEventValidator> | null>(null);

	const getInitialProfile = (): ValidationProfile | null => {
		if (eventData.id) {
			console.log("validation profile: STANDARD_EVENT");
			return "STANDARD_EVENT";
		}
		console.log("validation profile: DRAFT");

		return "DRAFT";
	};
	$effect(() => {
		if (eventData.id || hasTriggeredValidation) {
			if (!validator) {
				const initialProfile = getInitialProfile();
				validator = createEventValidator(eventData, {
					profile: initialProfile
				});
			} else {
				validator.updateEvent(eventData);
			}
		}
	});

	/**
	 * Génère un message détaillé pour les conflits détectés
	 */
	const submitForm = async (shouldConfirm: boolean = false) => {
		hasTriggeredValidation = true;
		try {
			// Validation initiale
			if (!validator) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			validator?.setProfile(determineValidationProfile(shouldConfirm));

			// pour le moment encore necessaire au moins pour empecher l'enregistrement d'un MasterRecurrent incomplet
			// if (!validator?.isValid(determineValidationProfile(shouldConfirm))) {
			// 	showAlert("Veuillez compléter les champs obligatoires.", "error");
			// 	return;
			// }

			// 👉 Détection unifiée des conflits selon le type d'événement
			let excludeEventIds: string[] = [];
			if (eventMode === "EDIT_RECURRENT_ALL" && eventData.id) {
				// Pour EDIT_RECURRENT_ALL, exclure tous les événements de la série
				try {
					// FIXIT : utilisé l'indexDb
					const existingOccurrences = await pb.collection("events").getFullList({
						filter: `masterRecurrentId = '${eventData.id}'`
					});
					excludeEventIds = [eventData.id, ...existingOccurrences.map((occ) => occ.id)];
				} catch (error) {
					console.warn("Erreur lors de la récupération des occurrences existantes:", error);
					excludeEventIds = [eventData.id];
				}
			} else if (
				(eventMode === "EDIT_SINGLE" || eventMode === "EDIT_RECURRENT_ONE") &&
				eventData.id
			) {
				// Pour les autres modes d'édition, exclure seulement l'événement actuel
				excludeEventIds = [eventData.id];
			}

			// Préparer les données de validation pour eventActionHandler
			const validationData: ValidationResult = {
				isValid: validator?.isValid(determineValidationProfile(shouldConfirm)) ?? false,
				errors: validator?.errors || {},
				hasUnassignedTasks: validator?.hasUnassignedTasks ?? false,
				unassignedTasks: validator?.unassignedTasks || [],
				getErrors: () => validator?.getErrors(determineValidationProfile(shouldConfirm)) || []
			};

			// Gestion spéciale pour les récurrences globales
			if (eventMode === "EDIT_RECURRENT_ALL") {
				modalState.confirm = {
					isOpen: true,
					data: {
						title: "Modifier toutes les occurrences ?",
						message:
							"Vous êtes sur le point de modifier toutes les occurrences de cet événement récurrent. Êtes-vous sûr de vouloir continuer ?",
						variant: "warning",
						onConfirm: async () => {
							const plan = await createEventActionPlan(eventData, {
								context: "form",
								mode: eventMode,
								wantsToConfirmEvent: shouldConfirm,
								checkConflicts: shouldConfirm,
								excludeEventIds,
								currentUser: userDb.current || undefined,
								notify: shouldConfirm,
								validationData,
								hasSondageValidation
							});
							await handleEventAction(plan);
						}
					}
				};
				return;
			}

			const plan = await createEventActionPlan(eventData, {
				context: "form",
				mode: eventMode,
				wantsToConfirmEvent: shouldConfirm,
				checkConflicts: shouldConfirm,
				excludeEventIds,
				currentUser: userDb.current || undefined,
				notify: shouldConfirm,
				validationData,
				hasSondageValidation
			});
			await handleEventAction(plan);
		} catch (error) {
			console.error(error);
			showAlert("Erreur lors de l'enregistrement de l'événement.", "error");
		}
	};

	// 👉 Fonction séparée pour la logique de sauvegarde
	// Cette fonction a été déplacée vers eventActions.ts sous le nom submitEvent

	const closeModal = () => {
		eventState.is = getNewEvent();
		eventState.pendingSondageValidation = false;
		modalState.event = false;
	};
</script>

<!-- {$inspect("eventData", eventData)} -->
<!-- {$inspect('rteam', eventData.recurrence.recurrenceTeam)} -->
<!-- {$inspect('eOrg', eventData.organizers)} -->
<!-- {$inspect('activeTabDate', activeTabDate)} -->
<!-- {$inspect('activeSondageTab', activeSondageTab)} -->

<Modal padding={false}>
	<!-- {$inspect('recurrenceDates', recurrenceDates)} -->
	<div class="p-2 pb-0 md:p-6">
		<h1 class="text-fluid-2xl p-2">{modalTitle}</h1>

		<!-- <div class="fixed top-6 right-4 z-50 flex flex-col gap-4">
			<button onclick={closeModal} class=" rounded-full"
				><X
					strokeWidth={2.75}
					class="rounded-full border-4 border-gray-700 bg-gray-100 text-gray-700 hover:border-red-900 hover:text-red-900 md:h-8 md:w-8"
				/></button
			>

			<button onclick={handleSave} class="btn btn-sm">
				<Save />
			</button>
		</div> -->
		<form class="space-y-10">
			<div class="flex flex-wrap items-center">
				<div class="mx-4 w-full items-center space-y-1 md:w-1/2">
					<label for="event_title" class="text-fluid-sm">Nom de l'événement</label>
					<input
						use:debounce={{
							onChange: (v) => (eventData.event_title = v)
						}}
						value={eventData.event_title}
						type="text"
						id="event_title"
						name="event_title"
						class="input block w-full"
					/>
					<ErrorMessage error={errorsMap?.title} />
				</div>
				<div class="w-min-fit mt-2 flex flex-wrap gap-4 self-start p-4">
					<div class="">
						<Checkbox
							label="Evénement public"
							id="public_event"
							bind:checked={eventData.isPublic}
							help="Les événements non-public ne seront pas visible sur le site ni ajouté à la newsletter"
						/>
					</div>
					<div class="">
						{#if eventMode === "NEW_SINGLE" || eventMode === "NEW_RECURRENT"}
							<Checkbox
								bind:checked={eventData.isRecurrent}
								id="recurrent"
								label="événement récurrent"
							/>
						{/if}
					</div>
				</div>
			</div>

			<!-- ::: date event -->

			{#snippet ExternalProposalPref()}
				{#if hasExternalPreference}
					<Info variant="warning">
						<p class="italic">
							Cet événement à été proposé par un utilisateur depuis le site publique
						</p>
						<div class=" text-fluid-sm p-2">
							Période indiquée comme possible pour l'intervenant·e:
							<p class="border-l-4 ps-2 italic">
								"{eventData.external_proposal?.period_preference}"
							</p>
						</div>
					</Info>
				{/if}
			{/snippet}

			<div id="dateOrg" transition:slide>
				<Frame title={dateAndHoursTitle}>
					<div class="space-y-4">
						{#if displayMode === "RECURRENT"}
							<div class="mb-8">
								<RecurrentTab
									bind:recurrence={eventData.recurrence as RecurrenceConfigType}
									isExistingMaster={eventMode === "EDIT_RECURRENT_ALL"}
									errors={errorsMap}
								/>
							</div>
							<div>
								<TimeReservation errors={errorsMap} bind:eventData />
							</div>
						{:else if displayMode === "SONDAGE"}
							<div>
								{@render ExternalProposalPref()}

								<DatePickerProposed
									{eventData}
									onUpdateDatesProposed={(dates) => {
										eventData.dates_proposed = dates;
									}}
									onValidateDate={handleFormDateValidation}
									onUpdateIsSondage={() => (eventData.isSondage = false)}
									errors={errorsMap}
								/>
							</div>
						{:else}
							<div>
								{@render ExternalProposalPref()}

								{#if eventData.external_proposal?.proposals}
									<Info>
										<div class="mb-2">
											<p class="mb-2">Dates proposées :</p>
											<div class="flex flex-wrap gap-2">
												{#each eventData.external_proposal?.proposals as proposal, index (index)}
													<div class="flex items-center gap-2">
														<Checkbox
															bind:checked={proposal.selected}
															label={`${lisibleDate(proposal.date_event)} - ${proposal.time_start}`}
															id={index}
														/>
													</div>
												{/each}
											</div>
											<div class="flex justify-end">
												<button class="btn btn-xs" onclick={convertSelectedToProposed}>
													Convertir les dates sélectionnées en sondage
												</button>
											</div>
										</div>
									</Info>
								{/if}

								<DateUniq
									{startDateObject}
									{endDateObject}
									bind:eventData
									errors={errorsMap}
									{conflictCalculator}
								/>
							</div>
						{/if}
					</div>
				</Frame>
			</div>

			<!-- ::: ROle & Oragnizers -->
			<!-- FIXIT : checker ce qui doit apparaitre, et utiliser des props $derived en fonction d'eventMode plutot que des #if -->

			{#snippet groupedTasksSnippet(label: string, tasks: TaskType[], isDisabled?: boolean)}
				<div class=" space-y-2 rounded-xl p-3 shadow-sm">
					<div class="text-base-content/70 text-fluid-sm italic">{label}</div>
					<ButtonGroupSelect
						options={tasks}
						{isDisabled}
						bind:selectedItems={eventData.tasks!}
						optionsLabel="name"
					/>
				</div>
			{/snippet}

			<Frame title="Rôles">
				<div class="mb-2 block font-medium">
					{tasksLabel}
				</div>

				<div class="flex flex-wrap gap-x-6 gap-y-4">
					{#if groupedTasks.before.length > 0}
						{@render groupedTasksSnippet("Avant l'événement", groupedTasks.before)}
					{/if}

					{#if groupedTasks.on.length > 0}
						{@const isDisabled = eventData.isSondage}
						{@render groupedTasksSnippet("Pendant l'événement", groupedTasks.on, isDisabled)}
					{/if}

					{#if groupedTasks.after.length > 0}
						{@const isDisabled = eventData.isSondage}

						{@render groupedTasksSnippet("Après l'événement", groupedTasks.after, isDisabled)}
					{/if}

					{#if groupedTasks.other.length > 0}
						{@render groupedTasksSnippet("Autres tâches", groupedTasks.other)}
					{/if}
				</div>
				<div class="mt-8 flex flex-wrap gap-4">
					{#if !showAddTaskForm}
						<button
							class="btn btn-outline btn-primary btn-compact"
							onclick={() => (showAddTaskForm = true)}
						>
							+ Ajouter une tâche personnalisée
						</button>
					{:else}
						<!-- 👉 Affiche le formulaire d'ajout de tâche -->
						<AddTaskForm onAddTask={handleAddTask} onCancel={() => (showAddTaskForm = false)} />
					{/if}

					<button
						class="btn btn-outline btn-primary btn-compact"
						onclick={() => {
							// Ajouter toutes les tâches de l'espace
							const allTasks = [...(eventData.tasks || []), ...getSpace.tasks];

							// Éliminer les doublons par nom
							eventData.tasks = allTasks.filter(
								(task, index, self) => index === self.findIndex((t) => t.name === task.name)
							);
						}}
					>
						ajoutez tous les rôles
					</button>
					{#if eventData.isPublic && (eventMode === "NEW_RECURRENT" || eventMode === "EDIT_RECURRENT_ALL")}
						<div class="form-control">
							<label class="label flex cursor-pointer">
								<span class="label-text"
									>Empécher la confirmation de l'événement même si toutes les tâches ne sont pas
									assignées</span
								>
								<input
									type="checkbox"
									class="toggle toggle-warning"
									bind:checked={eventData.recurrence!.allTasksRequired}
								/>
							</label>
						</div>
					{/if}
				</div>
			</Frame>

			{#if eventMode !== "NEW_RECURRENT" && eventMode !== "EDIT_RECURRENT_ALL"}
				<Frame title="Organisateur·ices">
					<OrganizersAndTasksSelect
						{organizersPossibles}
						tasks={eventData.tasks ?? []}
						bind:organizers={eventData.organizers!}
						hasMultipleTasks={(eventData.tasks ?? []).length > 1}
					/>

					<ErrorMessage error={errorsMap?.organizers} />
					<ErrorMessage error={errorsMap?.unassignedTasksCheck} />
				</Frame>
				<!-- Cas 2 : Si MasterEvent d'un événement récurrent -->
			{:else}
				<Frame title="Organisateur·ices">
					<p class="text-fluid-sm mb-4">
						Ajoutez les personnes qui participent à organiser ces événements récurrents (celles et
						ceux qui pourront s'inscrire sur l'organisation des occurrences de chaque événement)
					</p>
					{#if eventData.recurrence}
						<ButtonGroupSelect
							options={organizersPossibles}
							bind:selectedItems={eventData.recurrence!.recurrenceTeam}
							optionsLabel="username"
							Icon={UserPlus}
						/>
						<button
							class="btn btn-outline btn-primary btn-compact mt-4"
							onclick={() => {
								if (eventData.recurrence) {
									eventData.recurrence.recurrenceTeam = [...organizersPossibles]; // Destructurer ?
								}
							}}
						>
							ajouter tous les organisateur·ices possibles
						</button>
					{/if}
					<ErrorMessage error={errorsMap?.recurrenceTeam} />
				</Frame>

				<OtherSetting bind:data={eventData.recurrence} />
			{/if}

			<Frame>
				<div class="flex flex-col gap-4 md:flex-row">
					<div class="flex flex-1 flex-col gap-1">
						<Checkbox label="Prix libre" id="prix_libre" bind:checked={eventData.is_prix_libre} />
						{#if !eventData.is_prix_libre}
							<label for="prix" class="flex" transition:slide>
								<input
									type="text"
									class="input flex flex-1"
									id="prix"
									placeholder="Prix ?"
									bind:value={eventData.prix}
								/>
							</label>
							<ErrorMessage error={errorsMap?.price} />
						{/if}
					</div>
					<div class="flex flex-1 flex-col gap-1">
						<Checkbox label="Mixité" id="ismixite" bind:checked={eventData.isMixiteChoisie} />
						{#if eventData.isMixiteChoisie}
							<label for="mixite" class="flex" transition:slide>
								<input
									type="text"
									class="input flex flex-1"
									id="mixite"
									bind:value={eventData.mixite}
									placeholder="Décrivez le type de mixité"
								/>
							</label>
							<ErrorMessage error={errorsMap?.mixite} />
						{/if}
					</div>
					<div class="flex flex-1 flex-col gap-1">
						<Checkbox
							label="Tout public"
							id="all_public"
							bind:checked={eventData.is_age_no_restriction}
						/>
						{#if !eventData.is_age_no_restriction}
							<label for="age" class="flex" transition:slide>
								<input
									type="number"
									class="input flex flex-1"
									id="age"
									placeholder="Age minimum ?"
									bind:value={eventData.age_advice}
									min="0"
								/>
							</label>
							<ErrorMessage error={errorsMap?.age} />
						{/if}
					</div>
				</div>
			</Frame>
			<div class="mb-0 flex flex-col md:mx-4 md:flex-row md:justify-between md:gap-4">
				<!-- ::: rooms -->
				<Frame title="Salles réservées" class_frame="md:w-auto">
					<div id="rooms" class="">
						<GroupCheckBox
							groupItems={rooms}
							bind:eventDataGroup={eventData.rooms!}
							classLabel="w-full"
						/>
					</div>
					<ErrorMessage error={errorsMap?.rooms} />
				</Frame>

				<!-- ::: catégories -->

				<Frame title="Type d'événement" class_frame="md:flex-1 content-center">
					<div id="categories" class="">
						<GroupCheckBox
							groupItems={categories}
							bind:eventDataGroup={eventData.categories!}
							classLabel="w-full md:w-fit"
						/>
					</div>
					<ErrorMessage error={errorsMap?.categories} />
				</Frame>
			</div>
			<!-- ::: description -->
			<div class="space-y-1 md:mx-4">
				<label for="description" class="ms-2 block font-semibold text-gray-700"
					>Description de l'événement</label
				>
				<Textarea
					id="description"
					name="description"
					rows={8}
					placeholder="Description de l'événement destiné aux bénévoles/organisateur·ices"
					value={eventData.description}
					debounce={{
						enabled: true,
						wait: 500,
						onChange: (v) => (eventData.description = v)
					}}
				/>
			</div>

			<!-- ::: Description publique -->
			<Frame title="Description publique">
				<Info>
					<p>
						Description destinée au public (Newsletter, site). Inutile de renseigner le titre, la
						date, les horaires, prix, mixité, etc. <span class="text-fluid-sm">
							(ils seront automatiquement ajoutés et mis en forme lors de la génération de la
							newsletter et du site)
						</span>
					</p>
				</Info>
				<div>
					<Quill bind:html={eventData.desc_public} />
				</div>
				<ErrorMessage error={errorsMap?.publicDescription} />
			</Frame>

			<!-- <div>
				<EventValidationStatus event={eventData} {missingForConfirmation} />
			</div> -->
		</form>
		<div
			class="bottom-0 left-0 mt-2 flex w-full flex-wrap justify-end gap-x-4 gap-y-2 border-t bg-white p-2 md:sticky"
		>
			<button type="button" class="btn block w-full font-bold sm:w-fit" onclick={closeModal}
				>Fermer sans enregistrer</button
			>
			{#if (eventMode === "EDIT_SINGLE" || eventMode === "EDIT_RECURRENT_ONE" || eventMode === "NEW_SINGLE") && !eventData.isSondage && !eventData.isConfirmed}
				<button
					type="button"
					class="btn btn-accent block w-full font-bold sm:w-fit {validator?.isValid
						? ''
						: 'opacity-50'}"
					onclick={() => submitForm(true)}>Enregistrer et Confirmer l'événement</button
				>
			{/if}
			<button
				class="btn btn-primary block w-full font-bold sm:w-fit"
				type="button"
				onclick={() => submitForm(false)}>Enregistrer</button
			>
		</div>
	</div>

	<!-- 👉 Modal de confirmation des récurrences maintenant gérée par modalState.confirm -->
</Modal>

<style>
</style>

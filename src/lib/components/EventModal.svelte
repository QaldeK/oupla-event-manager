<script lang="ts">
	import { debounce } from "$lib/actions/debounce";
	import Checkbox from "$lib/components/Checkbox.svelte";
	import Frame from "$lib/components/Frame.svelte";
	import GroupCheckBox from "$lib/components/GroupCheckBox.svelte";
	import Info from "$lib/components/Info.svelte";
	import AutoConfirmSettings from "$lib/components/forModal/AutoConfirmSettings.svelte";
	import AddTaskForm from "$lib/components/forModal/AddTaskForm.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import Quill from "$lib/components/Quill.svelte";
	import ButtonGroupSelect from "$lib/components/forModal/ButtonGroupSelect.svelte";
	import DatePickerProposed from "$lib/components/forModal/DatePickerProposed.svelte";
	import DateUniq from "$lib/components/forModal/DateUniq.svelte";
	import OrganizersAndTasksSelect from "$lib/components/forModal/OrganizersAndTasksSelect.svelte";
	import RecurrentTab from "$lib/components/forModal/RecurrentTab.svelte";
	import Textarea from "$lib/components/ui-custom/textarea/textarea.svelte";
	import {
		createEvent,
		createRecurrentEvent,
		updateAllOccurrences,
		updateEvent
	} from "$lib/pocketbase.svelte";
	import {
		ValidationSchemaType,
		getNewEvent,
		getDefaultRecurrence,
		validateEvent,
		type TaskType,
		type RequiredRecurrenceType,
		type EventType
	} from "$lib/schemas/event.schema";
	import { getSpace } from "$lib/shared/spaceOptions.svelte";
	import {
		eventState,
		getOrganizersPossibles,
		modalState,
		showAlert
	} from "$lib/shared/states.svelte";
	import { createDateFromString, lisibleDate, isValidDate } from "$lib/utils";

	import { slide } from "svelte/transition";

	import { Save, UserPlus, X } from "lucide-svelte";
	import TimeReservation from "./forModal/TimeReservation.svelte";

	type EventMode =
		| "NEW_SINGLE" // Création événement unique
		| "NEW_RECURRENT" // Création événement récurrent
		| "EDIT_SINGLE" // Modification événement unique
		| "EDIT_RECURRENT_ONE" // Modification occurrence unique
		| "EDIT_RECURRENT_ALL"; // Modification toutes occurrences

	let isAlertDialogOpen = $state<boolean>(false);
	let eventMode: EventMode = $derived.by(() => {
		if (!eventData.id) {
			return eventData.isRecurrent ? "NEW_RECURRENT" : "NEW_SINGLE";
		}

		if (eventData.id && eventData.isRecurrent) {
			return eventData.isMasterRecurrent ? "EDIT_RECURRENT_ALL" : "EDIT_RECURRENT_ONE";
		}

		return "EDIT_SINGLE";
	});

	let errors = $state<Record<string, string[] | undefined>>({});
	let formattedErrors = $state<any>({});

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

	// ::: Data et Etat réactif
	let eventData = $state<EventType>({ ...eventState.is });
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
				...(eventData.organizers || []),
				...(eventData.recurrence?.recurrenceTeam || [])
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
		let potentialTasks: any[] = [];

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

	// ::: $effect

	$effect.pre(() => {
		if (eventData.isRecurrent && !eventData.id && !eventData.recurrence) {
			eventData.recurrence = getDefaultRecurrence();
		} else if (!eventData.isRecurrent && !eventData.id) {
			eventData.recurrence = null;
		}
	});

	$effect(() => {
		if (eventData.date_event && eventData.time_start && eventData.time_end) {
			try {
				const startDate = createDateFromString(eventData.date_event, eventData.time_start);
				const endDate = createDateFromString(eventData.date_event, eventData.time_end);
				if (isValidDate(startDate) && isValidDate(endDate)) {
					eventData.dateStart = startDate.toISOString();
					eventData.dateEnd = endDate.toISOString();
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

	// defaultTask est ajouté dès qu'il n'y a plus de tache
	$effect(() => {
		const defaultTask = getSpace.defaultTask as TaskType;

		// Si defaultTask existe et tasks est vide ou undefined, initialiser avec defaultTask
		if (defaultTask && (!eventData.tasks || eventData.tasks.length === 0)) {
			eventData.tasks = [defaultTask];
		}
	});

	// ::: functions utilities

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

	// let hasMultipleTasks = $derived(eventData.tasks && eventData.tasks.length > 1);

	// Fonction pour appliquer une proposition unique
	// function applyProposal(proposal: {
	// 	date_event: string;
	// 	time_start: string;
	// 	time_end: string;
	// 	start_event?: string;
	// }) {
	// 	eventData = {
	// 		...eventData,
	// 		date_event: proposal.date_event,
	// 		time_start: proposal.time_start,
	// 		time_end: proposal.time_end,
	// 		start_event: proposal.start_event || proposal.time_start // fallback sur time_start si start_event n'est pas défini
	// 	};
	// }

	// Fonction pour convertir les propositions sélectionnées en dates de sondage
	function convertSelectedToProposed() {
		const selectedProposals =
			eventData.external_proposal?.proposals?.filter((p) => p.selected) || [];

		// Conversion des propositions en format DateProposed
		const newDatesProposed = selectedProposals.map((proposal) => {
			const [year, month, day] = proposal.date_event.split("-");
			const [hourStart, minuteStart] = proposal.time_start.split(":");
			const [hourEnd, minuteEnd] = proposal.time_end.split(":");

			const dateStart = new Date(`${year}-${month}-${day}T${hourStart}:${minuteStart}`);
			const dateEnd = new Date(`${year}-${month}-${day}T${hourEnd}:${minuteEnd}`);

			return {
				dateStart: dateStart.toISOString(),
				dateEnd: dateEnd.toISOString(),
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

	// ::: Form Validation and Submission

	function validateCurrentEvent(schemaType: ValidationSchemaType): boolean {
		// Préparation des données pour la validation (ex: tâches de récurrence)
		if (
			(eventMode === "EDIT_RECURRENT_ALL" || eventMode === "NEW_RECURRENT") &&
			eventData.recurrence
		) {
			eventData.recurrence.tasks = eventData.tasks || [];
		}

		const validationResult = validateEvent(eventData, schemaType);

		if (!validationResult.success && validationResult.errors) {
			errors = validationResult.errors.flatten().fieldErrors;
			formattedErrors = validationResult.errors.format(); // Utiliser format() pour une structure plus riche si nécessaire
			showAlert("Erreur dans les données. Veuillez vérifier les champs.", "error");
			return false;
		}

		// Réinitialiser les erreurs si la validation réussit
		errors = {};
		formattedErrors = {};
		return true;
	}

	const confirmSubmit = async () => {
		isAlertDialogOpen = false;
		await submitForm();
	};

	const handleConfirm = async () => {
		if (!validateCurrentEvent(ValidationSchemaType.PUBLISH)) {
			showAlert("L'événement ne peut être confirmé : vérifiez les champs mal renseignés.", "error");
			return;
		}

		eventData.isConfirmed = true;
		await submitForm();
	};

	const handleSave = async () => {
		const schemaType = (() => {
			if (eventData.isConfirmed) return ValidationSchemaType.PUBLISH;
			switch (eventMode) {
				case "NEW_SINGLE":
				case "EDIT_SINGLE":
				case "EDIT_RECURRENT_ONE":
					return ValidationSchemaType.SAVE;
				case "EDIT_RECURRENT_ALL":
				case "NEW_RECURRENT":
					return ValidationSchemaType.SAVE_RECURRENT_MASTER;
				default:
					return ValidationSchemaType.DEFAULT; // Fallback
			}
		})();

		if (!validateCurrentEvent(schemaType)) {
			return; // La validation a échoué, message déjà affiché
		}

		// Si c'est une modification globale, ouvrir la modale de confirmation
		if (eventMode === "EDIT_RECURRENT_ALL") {
			isAlertDialogOpen = true;
			// Le submitForm sera appelé via confirmSubmit après confirmation dans la modale
		} else {
			// Sinon, soumettre directement
			await submitForm();
		}
	};

	const submitForm = async () => {
		try {
			if (eventData.date_event && eventData.time_start && eventData.time_end) {
				const startDate = createDateFromString(eventData.date_event, eventData.time_start);
				const endDate = createDateFromString(eventData.date_event, eventData.time_end);

				eventData.dateStart = startDate.toISOString();
				eventData.dateEnd = endDate.toISOString();
			}

			switch (eventMode) {
				case "NEW_SINGLE":
					await createEvent(eventData);
					break;

				case "NEW_RECURRENT": {
					await createRecurrentEvent(eventData);
					break;
				}
				case "EDIT_SINGLE":
				case "EDIT_RECURRENT_ONE":
					await updateEvent(eventData.id, eventData);
					break;

				case "EDIT_RECURRENT_ALL":
					await updateAllOccurrences(eventData);
					break;
			}
			closeModal();
		} catch (error) {
			console.error(error);
			showAlert("Erreur lors de l'enregistrement de l'événement.", "error");
		}
	};

	const closeModal = () => {
		modalState.event = false;
		eventState.is = { ...getNewEvent() };
		errors = {};
		formattedErrors = {};
		isAlertDialogOpen = false;
	};
</script>

<!-- {$inspect('eventData', eventData)} -->
{$inspect("eventMode", eventMode)}
{$inspect("eventData", eventData)}
<!-- {$inspect('organizersPossibles', organizersPossibles)} -->
<!-- {$inspect('rteam', eventData.recurrence.recurrenceTeam)} -->
<!-- {$inspect('eOrg', eventData.organizers)} -->
<!-- {$inspect('activeTabDate', activeTabDate)} -->
<!-- {$inspect('activeSondageTab', activeSondageTab)} -->

<Modal>
	<!-- {$inspect('recurrenceDates', recurrenceDates)} -->

	<h1 class="mb-4 text-2xl">{modalTitle}</h1>

	<div class="fixed top-6 right-4 z-50 flex flex-col gap-4">
		<button onclick={closeModal} class=" rounded-full"
			><X
				strokeWidth={2.75}
				class="rounded-full border-4 border-gray-700 bg-gray-100 text-gray-700 hover:border-red-900 hover:text-red-900 md:h-8 md:w-8"
			/></button
		>

		<button onclick={handleSave} class="btn btn-sm">
			<Save />
		</button>
	</div>
	<form class="space-y-10">
		<div class="flex flex-wrap items-center">
			<div class="w-full items-center space-y-2 md:w-1/2">
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
				{#if errors.event_title}
					<p class="text-fluid-sm text-red-500 italic">{errors.event_title[0]}</p>
				{/if}
			</div>
			<div class="w-min-fit flex flex-wrap items-center pt-2 md:ms-2">
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

		<!-- FIXIT condition chelou -->
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
			<Frame
				title={dateAndHoursTitle}
				class_title="text-fluid-md md:text-fluid-lg "
				class_frame="md:p-8"
			>
				<div class="space-y-4">
					{#if displayMode === "RECURRENT"}
						<div>
							<RecurrentTab
								bind:recurrence={eventData.recurrence as RequiredRecurrenceType}
								localErrors={formattedErrors?.recurrence}
							/>
						</div>
						<div>
							<TimeReservation localErrors={errors} bind:eventData />
						</div>
					{:else if displayMode === "SONDAGE"}
						<div>
							{@render ExternalProposalPref()}

							<DatePickerProposed
								{eventData}
								onUpdateDatesProposed={(dates) => {
									eventData.dates_proposed = dates;
								}}
								onUpdateIsSondage={(isSondage) => {
									eventData.isSondage = isSondage;
								}}
								localErrors={formattedErrors?.dates_proposed?._errors
									? { dates_proposed: formattedErrors.dates_proposed._errors }
									: null}
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

							<DateUniq bind:eventData {startDateObject} {endDateObject} localErrors={errors} />
						</div>
					{/if}
				</div>
			</Frame>
		</div>

		<!-- ::: ROle & Oragnizers -->
		<!-- FIXIT : checker ce qui doit apparaitre, et utiliser des props $derived en fonction d'eventMode plutot que des #if -->

		{#snippet groupedTasksSnippet(label: string, tasks: TaskType[])}
			<div class=" space-y-2 rounded-xl p-3 shadow-sm">
				<div class="text-base-content/70 text-fluid-sm italic">{label}</div>
				<ButtonGroupSelect
					options={tasks}
					bind:selectedItems={eventData.tasks}
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
					{@render groupedTasksSnippet("Pendant l'événement", groupedTasks.on)}
				{/if}

				{#if groupedTasks.after.length > 0}
					{@render groupedTasksSnippet("Après l'événement", groupedTasks.after)}
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
			</div>
		</Frame>

		{#if eventMode !== "NEW_RECURRENT" && eventMode !== "EDIT_RECURRENT_ALL"}
			<Frame title="Organisateur·ices">
				<OrganizersAndTasksSelect
					{organizersPossibles}
					tasks={eventData.tasks}
					bind:organizers={eventData.organizers}
					hasMultipleTasks={!!eventData.tasks && eventData.tasks.length > 1}
				/>

				{#if errors.organizers}
					<p class="text-fluid-sm p-2 text-red-500 italic">{errors.organizers[0]}</p>
				{/if}
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
						bind:selectedItems={eventData.recurrence.recurrenceTeam}
						optionsLabel="username"
						Icon={UserPlus}
					/>
					<button
						class="btn btn-outline btn-primary btn-compact mt-4"
						onclick={() => {
							if (eventData.recurrence) {
								eventData.recurrence.recurrenceTeam = organizersPossibles;
							}
						}}
					>
						→ ajoutez tout le monde
					</button>
				{/if}
				{#if errors.organizers}
					<p class="text-fluid-sm p-2 text-red-500 italic">{errors.organizers[0]}</p>
				{/if}
			</Frame>

			<AutoConfirmSettings bind:eventData />
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
						{#if errors.prix}
							<p class="text-fluid-sm p-2 text-red-500 italic">{errors.prix[0]}</p>
						{/if}
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
						{#if errors.mixite}
							<p class="text-fluid-sm p-2 text-red-500 italic">{errors.mixite[0]}</p>
						{/if}
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
							/>
						</label>
						{#if errors.age_advice}
							<p class="text-fluid-sm p-2 text-red-500 italic">{errors.age_advice[0]}</p>
						{/if}
					{/if}
				</div>
			</div>
		</Frame>
		<div class="mb-0 flex flex-wrap justify-between">
			<!-- ::: rooms -->
			<Frame title="Salles réservées" class_frame="sm:me-6">
				<div id="rooms" class="flex flex-wrap items-center gap-2">
					<GroupCheckBox
						groupItems={rooms}
						bind:eventDataGroup={eventData.rooms}
						classLabel="w-full"
					/>
				</div>
				{#if errors.rooms}
					<p class="text-fluid-sm p-2 text-red-500 italic">{errors.rooms[0]}</p>
				{/if}
			</Frame>

			<!-- ::: catégories -->

			<Frame title="Type d'événement" class_frame="flex-1 items-center content-center">
				<div id="categories" class="align-">
					<GroupCheckBox groupItems={categories} bind:eventDataGroup={eventData.categories} />
				</div>
				{#if errors.categories}
					<p class="text-fluid-sm p-2 text-red-500 italic">{errors.categories[0]}</p>
				{/if}
			</Frame>
		</div>

		<!-- ::: description -->
		<div class="space-y-1">
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
			{#if errors.desc_public}<p class="text-fluid-sm p-2 text-red-500 italic">
					{errors.desc_public[0]}
				</p>{/if}
		</Frame>

		<div class="mb-4 flex flex-wrap justify-end gap-x-4 gap-y-2">
			<button
				type="button"
				class="btn btn-error block w-full font-bold sm:w-fit"
				onclick={closeModal}>Fermer sans enregistrer</button
			>
			<button
				type="button"
				class="btn btn-accent block w-full font-bold sm:w-fit"
				onclick={handleConfirm}>Enregistrer et Confirmer l'événement</button
			>
			<button
				class="btn btn-primary block w-full font-bold sm:w-fit"
				type="button"
				onclick={handleSave}>Enregistrer</button
			>
		</div>
	</form>

	<!-- AlertDialog pour la confirmation de modification de toutes les occurrences -->
	<dialog id="confirm_recurrence_modal" class="modal" open={isAlertDialogOpen}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Modifier toutes les occurrences ?</h3>
			<p class="py-4">
				<!-- TODO : préciser les implications→ donnée écrasées/préserver des occurrences + suppréssions des occurrences hors dates -->
				Vous êtes sur le point de modifier toutes les occurrences de cet événement récurrent. Êtes-vous
				sûr de vouloir continuer ?
			</p>
			<div class="modal-action">
				<form method="dialog">
					<button class="btn btn-ghost" onclick={() => (isAlertDialogOpen = false)}>Annuler</button>
					<button class="btn btn-primary" onclick={confirmSubmit}
						>Confirmer la modification globale</button
					>
				</form>
			</div>
		</div>
	</dialog>
</Modal>

<style>
</style>

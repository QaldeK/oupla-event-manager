<script lang="ts">
	import ExpandableCard from "$lib/components/ExpandableCard.svelte";
	import { updateEvent } from "$lib/pocketbase.svelte";
	import { lisibleDate } from "$lib/utils";
	import { eventState, hasAuthorizations, modalState, showAlert } from "$lib/shared/states.svelte";
	import UserSondagesCard from "$lib/components/UserSondagesCard.svelte";
	import type { EventType, UserType, DatesProposedType } from "$lib/types/types";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { getContext } from "svelte";
	import { getMonthlyRecurrenceLabel } from "$lib/utils/monthlyRecurrence";

	import { fade } from "svelte/transition";

	import { Info, UserCheck } from "lucide-svelte";
	import { CalendarPlus, UserPlus } from "lucide-svelte";

	import ButtonAction from "./ButtonAction.svelte";
	import TopAlert from "./TopAlert.svelte";

	// ::: context & props
	interface Props {
		currentEvent: EventType;
	}

	const { currentEvent }: Props = $props();

	// FIXIT : don't use getContext
	let currentUser: UserType = getContext("currentUser");

	// ::: reactive variables
	let showSondageDetails = $state(false);

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
		if (currentEvent.isSondage) return "Organisateur•ices - Sondage disponibilité";
		else if (hasNoPropositions) return "Pas de dates proposées";
		return "Organisateur•ices";
	});

	let oldDatesProposed: DatesProposedType[] = $state([]);
	let datesFutureProposed: DatesProposedType[] = $state([]);

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
	// Appelle requestTaskUpdate sans argument taskName pour ouvrir TaskDialog si plusieurs tâches
	const handleGeneralTaskSubscription = () => {
		if (!currentUser || currentEvent.canceled) return;
		eventsStore.requestTaskUpdate({ event: currentEvent, user: currentUser });
	};

	// Appelle requestTaskUpdate AVEC taskName pour gérer l'inscription/désinscription spécifique
	const handleSpecificTaskSubscription = (taskName: string) => {
		if (!currentUser || currentEvent.canceled) return;
		eventsStore.requestTaskUpdate({ event: currentEvent, user: currentUser, taskName: taskName });
	};

	// Calcule l'état du bouton général d'inscription/gestion
	const generalTaskButtonState = $derived.by(() => {
		if (
			!currentUser ||
			currentEvent.canceled ||
			!Array.isArray(currentEvent.tasks) ||
			currentEvent.tasks.length === 0
		) {
			return {
				text: "Inscription Indisponible",
				disabled: true,
				isSubscribed: false,
				variant: "disabled" as const
			};
		}

		const isSubscribed = currentEvent.organizers?.some((org) => org.id === currentUser.id);

		const btnText = isSubscribed ? "Se désinscrire" : "S'inscrire";
		return {
			text: btnText,
			disabled: false,
			isSubscribed,
			variant: (isSubscribed ? "error" : "primary") as "error" | "primary"
		};
	});

	const toggleAllDetails = () => {
		showSondageDetails = !showSondageDetails;
	};

	const openSondageModal = () => {
		// if (!hasAuth) return; // Sécurité
		eventState.is = { ...currentEvent }; // Passer une copie pour éviter modif directe
		modalState.dateSondage = true;
	};

	const isUserSubscribedToTask = (task: string) => {
		return currentEvent.organizers.some(
			(org) => org.id === currentUser.id && org.tasks?.includes(task)
		);
	};

	const handleSondageSubscription = (
		dateStart: string,
		maybehereValue: "oui" | "non" | "peut-être"
	) => {
		if (!currentUser) return;

		const updatedDatesProposed = (currentEvent.dates_proposed || []).map((dateProposed) => {
			if (dateProposed.dateStart === dateStart) {
				let updatedOrganizers = [...dateProposed.organizers];
				const userIndex = updatedOrganizers.findIndex((org) => org.id === currentUser.id);

				if (userIndex !== -1) {
					// Mise à jour si l'utilisateur existe
					updatedOrganizers[userIndex] = {
						...updatedOrganizers[userIndex],
						maybehere: maybehereValue
					};
					// Optionnel: retirer si vote 'non' ? Ou garder pour historique? Ici on garde.
				} else {
					// Ajout si l'utilisateur n'existe pas
					updatedOrganizers.push({
						id: currentUser.id,
						username: currentUser.username, // S'assurer que username est dispo
						tasks: [], // Pas de tâches spécifiques dans le sondage
						maybehere: maybehereValue
					});
				}
				return { ...dateProposed, organizers: updatedOrganizers };
			}
			return dateProposed;
		});

		updateEvent(currentEvent.id, { dates_proposed: updatedDatesProposed }).catch((err) => {
			console.error("Erreur MàJ sondage:", err);
			showAlert("Erreur lors de l'enregistrement de votre réponse.", "error");
		});
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
	//
</script>

<div transition:fade class="@container">
	<div
		id={currentEvent.id}
		class="transition:fade mb-8 rounded-lg border bg-white shadow-md md:mb-4 {currentEvent.isConfirmed
			? ''
			: 'border-l-warning/80 border-l-4'}"
	>
		<TopAlert thisEvent={currentEvent} />
		<!-- <span>auth : {hasAuth}</span> -->
		<div class="pb-4">
			<div class="justify-between gap-2 md:flex">
				<!-- ::: date -->
				<div id="Top_event_date" class="px-6 py-2 shadow-sm md:mt-2 md:rounded-l-xl {bgDateTime}">
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
							<span class="text-base-content/70 text-fluid-sm text-center italic">
								{statusMessage}
							</span>
						{/if}

						<!-- Ligne 3 : Salles -->
						{#if hasRooms}
							<div class="text-base-content/70 text-fluid-sm font-medium">
								<span>salle·s :</span>
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

			<!-- Contenu principal de la carte (description, orga, sondage etc) -->
			<!-- TODO enhance condition with props  -->
			{#if !currentEvent.canceled}
				<div id="event_content" class="flex flex-col gap-y-4 md:p-4">
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

					<div id="organizers_card" class="bg-base-100 shadow-sm md:rounded-lg">
						<div
							class="text-fluid-sm flex w-full items-center justify-between p-1 font-semibold md:rounded-t-lg"
						>
							<div class="p-2">
								{organizersLabel}
							</div>
							<div class="me-1">
								{#if currentEvent.isSondage && hasAuth}
									<button
										onclick={openSondageModal}
										class="btn btn-primary btn-outline btn-compact"
									>
										<CalendarPlus />
										<span class="not-md:hidden">Modifier le sondage</span>
									</button>
								{:else if hasDate && currentEvent.tasks?.length === 1}
									<button
										class="btn btn-outline btn-compact {generalTaskButtonState.isSubscribed
											? 'btn-error'
											: 'btn-primary'}"
										onclick={handleGeneralTaskSubscription}
										disabled={generalTaskButtonState.disabled}
									>
										{#if generalTaskButtonState.isSubscribed}
											<UserCheck />
										{:else}
											<UserPlus />
										{/if}
										{generalTaskButtonState.text}
									</button>
								{:else if hasNoPropositions && hasAuth}
									<button
										onclick={openSondageModal}
										class="btn btn-compact btn-primary btn-outline"
									>
										<CalendarPlus />
										<span class="not-md:hidden">Créer un sondage</span>
									</button>
								{/if}
							</div>
						</div>
						<div>
							<div class=" flex flex-col rounded-b-lg {currentEvent.isSondage ? 'mb-4 p-2' : ''} ">
								<!--::: Cas 2:  sondage est en cours -->
								{#if currentEvent.isSondage}
									<UserSondagesCard {currentEvent} {currentUser} />
									{#if currentEvent.isSondage && oldDatesProposed.length > 0}
										<div class="text-fluid-xs text-base-content/70 p-2 italic">
											({oldDatesProposed.length} date{oldDatesProposed.length > 1 ? "s" : ""} passée{oldDatesProposed.length >
											1
												? "s"
												: ""} non affichée{oldDatesProposed.length > 1 ? "s" : ""})
										</div>
									{/if}

									<!--::: Cas 3: une date est déjà proposée -->
								{:else if hasDate}
									<!-- tasks card -->
									{#if currentEvent.tasks && currentEvent.tasks.length > 1}
										<div class="sm:grid sm:grid-cols-3 sm:justify-around sm:gap-4 sm:p-4">
											{#each currentEvent.tasks as task (currentEvent.id + "-task-" + task.name)}
												{@const organizersForTask = currentEvent.organizers.filter(
													(org) => org.tasks?.includes(task.name) ?? []
												)}
												{@const isUserInTask = isUserSubscribedToTask(task.name)}
												<div
													class="text-fluid-sm border bg-white font-semibold shadow-xs sm:rounded-lg"
												>
													<div
														class="text-base-content mb-2 flex justify-items-center rounded-t-lg px-4 py-1 text-center {organizersForTask.length >
														0
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

													<!-- Organisateurs inscrits -->
													<div class="mb-2 flex flex-wrap items-center gap-2 px-2">
														{#if organizersForTask.length > 0}
															{#each organizersForTask as organizer (currentEvent.id + "-org-" + organizer.id)}
																<span
																	transition:fade|local
																	class="badge badge-accent badge-outline"
																>
																	{organizer.username}
																</span>
															{/each}
														{/if}

														<!-- Bouton d'action spécifique -->
														<button
															class="btn btn-compact ml-auto"
															onclick={() => handleSpecificTaskSubscription(task.name)}
														>
															{isUserInTask ? "Se désinscrire" : "S'inscrire"}
														</button>
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<!-- Affichage tâche unique -->
										<div class="flex flex-wrap gap-2">
											{#if !currentEvent.organizers.length}
												<span class=" text-fluid-sm text-base-content/70 p-2 italic">
													personne pour le moment...
												</span>
											{:else}
												<div class=" flex flex-wrap gap-2 p-3">
													{#each currentEvent.organizers as organizer (currentEvent.id + "-org-name-" + organizer.id)}
														<span
															class="badge badge-outline badge-accent font-semibold
																"
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
							{#if !hasDate && currentEvent.isSondage && currentEvent.tasks && currentEvent.tasks.length > 1}
								<div class=" text-base-content/70 p-2">
									<p class="text-fluid-xs">
										Mandats à se répartir pour la gestion de l'événement : <span class="italic">
											{#each currentEvent.tasks as task, index (currentEvent.id + "mandat" + task.name)}
												{task.name}{index < currentEvent.tasks.length - 1 ? ", " : ""}
											{/each}
										</span>
									</p>
									{#if currentEvent.isSondage}
										<p class="text-fluid-xs">
											Le sondage de disponibilité ne concerne que la présence
										</p>
									{/if}
								</div>
							{:else if hasDate && currentEvent.tasks && currentEvent.tasks.length === 1}
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

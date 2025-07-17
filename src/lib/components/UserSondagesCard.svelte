<script lang="ts">
	import { eventState, modalState, showAlert } from "$lib/shared/states.svelte";
	import type { DateProposedType, EventType, OrganizerType } from "$lib/types/types";

	import { updateEvent } from "$lib/pocketbase.svelte";
	import { createEventActionPlan, handleEventAction } from "$lib/shared/eventActionHandler.svelte";

	import type { UserType } from "$lib/types/types";
	import { lisibleDate, lisibleTime } from "$lib/utils";
	import {
		BadgeHelp,
		CalendarCheck,
		ChevronDown,
		ChevronUp,
		Pencil,
		ThumbsDown,
		ThumbsUp
	} from "lucide-svelte";
	import { fade } from "svelte/transition";
	import GroupRadioButton from "./GroupRadioButton.svelte";

	let {
		currentEvent,
		currentUser,
		dates,
		bg = "bg-white",
		showHeader = false
	} = $props<{
		currentEvent: EventType;
		currentUser: UserType | null;
		dates: DateProposedType[];
		bg?: string;
		showHeader?: boolean;
	}>();

	let showSondageDetails = $state(false);

	async function handleSondageSubscription(
		eventId: string,
		dateStart: string,
		maybehereValue: "oui" | "non" | "peut-être" | ""
	) {
		if (!currentUser) return;

		const eventDatesProposed = currentEvent.dates_proposed ?? [];

		const updatedDatesProposed = eventDatesProposed.map((dateProposed: DateProposedType) => {
			if (dateProposed.dateStart === dateStart) {
				let updatedOrganizers = [...(dateProposed.organizers ?? [])];
				const userIndex = updatedOrganizers.findIndex((org) => org.id === currentUser.id);

				if (maybehereValue === "") {
					// Si "aucun" est sélectionné, on retire l'organisateur
					if (userIndex !== -1) {
						updatedOrganizers.splice(userIndex, 1);
					}
				} else {
					// Sinon, on ajoute ou met à jour
					if (userIndex !== -1) {
						updatedOrganizers[userIndex] = {
							...updatedOrganizers[userIndex],
							maybehere: maybehereValue
						};
					} else {
						updatedOrganizers.push({
							id: currentUser.id,
							username: currentUser.username,
							tasks: [],
							maybehere: maybehereValue
						});
					}
				}
				return { ...dateProposed, organizers: updatedOrganizers };
			}
			return dateProposed;
		});

		try {
			await updateEvent(eventId, { dates_proposed: updatedDatesProposed });
		} catch (err) {
			console.error("Erreur MàJ sondage:", err);
			showAlert("Erreur lors de l'enregistrement de votre réponse.", "error");
		}
	}

	const handleValidateDate = async (
		currentEvent: EventType,
		dateProposal: DateProposedType,
		currentUser: UserType
	) => {
		if (!currentUser) {
			showAlert("Vous devez être connecté pour valider une date.", "error");
			return;
		}

		// Créer le plan d'action avec la nouvelle interface améliorée
		const plan = await createEventActionPlan(currentEvent, {
			context: "external_action",
			isValidatingSondage: true,
			wantsToConfirmEvent: false,
			checkConflicts: true,
			currentUser,
			notify: true,
			dateSondageToValidate: dateProposal
		});
		await handleEventAction(plan);
	};
</script>

<div class={{ "bg-base-200 rounded-lg  p-4 shadow-lg": showHeader }}>
	{#if showHeader}
		<!-- En-tête de l'événement -->
		<div class="mb-2 flex items-center justify-between gap-2">
			<div>
				<span class="text-fluid-lg font-semibold">{currentEvent.event_title}</span>
				{#if currentEvent.categories?.length}
					<span class="text-base-content/70 text-fluid-base ms-4">
						{currentEvent.categories.join(", ")}
					</span>
				{/if}
			</div>

			<button
				onclick={() => {
					eventState.is = currentEvent;
					modalState.event = true;
				}}
				class="btn btn-square btn-soft btn-sm"
			>
				<Pencil size={18} />
			</button>
		</div>
	{/if}
	<!-- Dates proposées -->
	<div class="@container">
		<button
			onclick={() => {
				showSondageDetails = !showSondageDetails;
			}}
			class="btn btn-link ml-auto flex font-semibold"
		>
			{showSondageDetails ? "Masquer les détails" : "Afficher les détails"}
			{#if showSondageDetails}
				<ChevronUp class="ml-1 h-4 w-4" />
			{:else}
				<ChevronDown class="ml-1 h-4 w-4" />
			{/if}
		</button>
		<div class="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
			{#each dates as dateProposal (dateProposal.dateStart)}
				{@const oui =
					dateProposal.organizers?.filter((org: OrganizerType) => org.maybehere === "oui").length ??
					0}
				{@const peutetre =
					dateProposal.organizers?.filter((org: OrganizerType) => org.maybehere === "peut-être")
						.length ?? 0}
				{@const non =
					dateProposal.organizers?.filter((org: OrganizerType) => org.maybehere === "non").length ??
					0}
				{@const userResponse = dateProposal.organizers?.find(
					(org: OrganizerType) => org.id === currentUser.id
				)?.maybehere}

				<div class="{bg} flex flex-col gap-2 rounded-lg px-3 py-2 shadow-sm">
					<div class="flex-1">
						<span class="text-fluid-base font-medium">
							{lisibleDate(dateProposal.dateStart)}
						</span>
						<span class="text-fluid-sm ms-2">
							{lisibleTime(dateProposal.dateStart)} - {lisibleTime(dateProposal.dateEnd)}
						</span>
						<div class="tooltip float-end ms-2" data-tip="Valider cette date">
							<button
								onclick={() => handleValidateDate(currentEvent, dateProposal, currentUser!)}
								class="btn btn-outline btn-compact {oui > 0 ? 'btn-success' : 'text-neutral/50'}"
								title="Valider cette date"
								disabled={!currentUser}
							>
								<CalendarCheck />
							</button>
						</div>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex items-center space-x-1">
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
									? 'bg-warning/20'
									: ''}"
							>
								<BadgeHelp class="mr-0.5 h-4 w-4" />
								{peutetre}
							</span>

							<span
								class="text-fluid-sm flex items-center rounded-full px-1.5 py-0.5 font-medium {non >
								0
									? 'bg-error/20'
									: ''}"
							>
								<ThumbsDown class="mr-0.5 h-4 w-4" />
								{non}
							</span>
						</div>

						<!-- Boutons de vote -->
						<GroupRadioButton
							value={userResponse}
							onChange={(newValue: "oui" | "peut-être" | "non" | "") =>
								handleSondageSubscription(currentEvent.id, dateProposal.dateStart, newValue)}
						/>
					</div>
					{#if showSondageDetails}
						<div transition:fade={{ duration: 150 }} class="mt-2 px-1">
							<div class="bg-base-100 rounded-md p-2">
								{#if !dateProposal.organizers || dateProposal.organizers.length === 0}
									<p class="text-fluid-sm text-base-content/70">Aucune réponse pour le moment</p>
								{:else}
									<div class="text-fluid-sm grid gap-1">
										<div class=" text-base-content/70 grid grid-cols-3 gap-1 font-medium">
											<div class="flex flex-wrap items-center justify-center">
												<ThumbsUp class="text-success mr-1 h-4" /> Disponible
											</div>
											<div class="flex flex-wrap items-center justify-center">
												<BadgeHelp class="text-warning mr-1 h-4" /> Peut-être
											</div>
											<div class="flex flex-wrap items-center justify-center">
												<ThumbsDown class="text-error mr-1 h-4" /> Indisponible
											</div>
										</div>

										<hr class="my-1" />

										<div class="grid grid-cols-3 gap-1">
											<div class="flex flex-wrap gap-2">
												{#each dateProposal.organizers.filter((org: OrganizerType) => org.maybehere === "oui") as org (org.id)}
													<div class="badge bg-success/20">
														{org.username}
													</div>
												{/each}
											</div>
											<div class="flex flex-wrap gap-2">
												{#each dateProposal.organizers.filter((org: OrganizerType) => org.maybehere === "peut-être") as org (org.id)}
													<div class="badge bg-warning/20">
														{org.username}
													</div>
												{/each}
											</div>
											<div class="flex flex-wrap gap-2">
												{#each dateProposal.organizers.filter((org: OrganizerType) => org.maybehere === "non") as org (org.id)}
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
	</div>
</div>

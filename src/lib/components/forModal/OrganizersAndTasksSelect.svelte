<script lang="ts">
	import { getSpace } from "$lib/shared/spaceOptions.svelte";
	import type { UserType, OrganizerType, TaskType } from "$lib/types/types";
	import { cn } from "$lib/utils";
	import { UserMinus, UserPlus, ListTodo } from "lucide-svelte";
	import { fade, slide } from "svelte/transition";
	import ButtonGroupSelect from "./ButtonGroupSelect.svelte";
	import { openTaskModal, showAlert } from "$lib/shared/states.svelte";

	let {
		organizersPossibles = [],
		tasks = [],
		organizers = $bindable([])
	} = $props<{
		organizersPossibles: UserType[];
		hasMultipleTasks: boolean;
		tasks: TaskType[];
		organizers: OrganizerType[];
	}>();

	let defaultTaskName = $derived.by(() => {
		const defaultTaskConfig = tasks.find((task: TaskType) => task.isDefault === true);
		return defaultTaskConfig?.name || (tasks.length > 0 ? tasks[0].name : "");
	});

	// Liste des utilisateurs disponibles (non sélectionnés)
	let availableUsers = $derived.by(() =>
		organizersPossibles.filter((user: UserType) => !organizers.some((org: OrganizerType) => org.id === user.id))
	);

	// liste des utilisateur de l'espace non présent dans organizers
	let usersOfSpace = $derived.by(() => {
		const usersToInvite = getSpace.members.filter(
			(member) => !organizers.some((org: OrganizerType) => org.id === member.id)
		);
		return usersToInvite;
	});

	// FIXIT: créer un type Member, cohérent avec spaceOptions.members ?
	function handleOrganizer(user: OrganizerType | UserType) {
		const isExistingOrganizer = organizers.some((org: OrganizerType) => org.id === user.id);
		const organizerData = isExistingOrganizer
			? organizers.find((org: OrganizerType) => org.id === user.id)
			: null;
		const hasMultipleTasksDefined = tasks.length > 1;

		if (!hasMultipleTasksDefined) {
			// Si l'utilisateur existe déjà, on le supprime
			if (isExistingOrganizer) {
				organizers = organizers.filter((org: OrganizerType) => org.id !== user.id);
			} else {
				// Sinon on l'ajoute avec la tâche unique
				organizers = [
					...organizers,
					{
						id: user.id,
						username: user.username,
						tasks: defaultTaskName ? [defaultTaskName] : []
					}
				];
			}
		} else {
			// Cas avec plusieurs tâches : utiliser TaskDialog via openTaskModal
			const currentSelectedTaskNames = organizerData?.tasks || [];

			openTaskModal({
				username: user.username,
				tasksAvailable: tasks, // Passer toutes les tâches définies pour l'événement
				selectedTaskNames: currentSelectedTaskNames,
				eventIsConfirmed: false, // On est dans l'éditeur, l'état de confirmation importe peu ici
				// eventId: eventData.id, // On n'a pas l'ID de l'event ici, pas grave pour ce callback
				onSubmit: (resultTaskNames: string[]) => {
					// 👉 Mettre à jour la prop `organizers` (état local de EventModal)
					const index = organizers.findIndex((org: OrganizerType) => org.id === user.id);
					const updatedOrganizerData = {
						id: user.id,
						username: user.username,
						tasks: resultTaskNames,
						role: "",
						maybehere: null
					};

					let newOrganizers = [...organizers];
					if (index !== -1) {
						// Organisateur existant
						if (resultTaskNames.length === 0) {
							// Plus de tâches sélectionnées -> le supprimer
							newOrganizers.splice(index, 1);
						} else {
							// Mettre à jour ses tâches
							newOrganizers[index] = updatedOrganizerData;
						}
					} else if (resultTaskNames.length > 0) {
						// Nouvel organisateur ajouté (seulement s'il a des tâches)
						newOrganizers.push(updatedOrganizerData);
					}
					// Réaffecter pour déclencher la mise à jour dans EventModal
					organizers = newOrganizers;
				}
			});
		}
	}

	// invite users
	let selectedUsersToInvite = $state<UserType[]>([]);
	let showInviteModal = $state(false);

	// 👉 Implémenter inviteUsers
	const inviteUsers = () => {
		if (selectedUsersToInvite.length === 0) return;

		const newOrganizersToAdd: OrganizerType[] = selectedUsersToInvite.map((user: UserType) => ({
			id: user.id,
			username: user.username,
			tasks: defaultTaskName ? [defaultTaskName] : [], // Ajouter la tâche par défaut si elle existe
			role: "",
			maybehere: null
		}));

		// Ajouter les nouveaux sans dupliquer
		const currentIds = new Set(organizers.map((org: OrganizerType) => org.id));
		const filteredNewOrganizers = newOrganizersToAdd.filter(
			(newUser) => !currentIds.has(newUser.id)
		);

		organizers = [...organizers, ...filteredNewOrganizers];

		showAlert(
			`${filteredNewOrganizers.length} organisateur·ice(s) ajouté·e(s) avec la tâche par défaut.`,
			"success"
		);

		selectedUsersToInvite = []; // Réinitialiser la sélection
		showInviteModal = false; // Fermer le modal d'invitation
	};
</script>

<div transition:fade class="flex flex-col space-y-3">
	<!-- Section des organisateurs inscrits -->
	<div class="">
		{#if organizers?.length}
			Organisateur·ices inscrit·es :
		{:else}
			<span class="text-base-content/60 italic"
				>Aucun·e organisateur·ice inscrit·e pour le moment...</span
			>
		{/if}
	</div>

	<div class="flex flex-wrap gap-3">
		{#each organizers as organizer (organizer.id)}
			{@const hasMultipleTasksDefined = tasks.length > 1}

			<div
				class={{ tooltip: hasMultipleTasksDefined }}
				data-tip={hasMultipleTasksDefined ? organizer.tasks.join(", ") : ""}
			>
				<button
					type="button"
					transition:slide
					class="btn flex justify-between gap-2"
					onclick={() => handleOrganizer(organizer)}
				>
					<span class="font-semibold">{organizer.username}</span>
					<div class="ps-1">
						{#if hasMultipleTasksDefined}
							<ListTodo class="text-success w-5" />
						{:else}
							<UserMinus class="text-error w-5" />
						{/if}
					</div>
				</button>
			</div>
		{/each}
	</div>

	<!-- Section des utilisateurs disponibles -->
	{#if availableUsers.length}
		<div class="p-2">Ajoutez les personnes participants à l'organisation de cet événement :</div>
		<div class="flex w-full flex-wrap items-center gap-2">
			{#each availableUsers as user (user.id)}
				<div transition:slide>
					<button
						class={cn(
							"btn  btn-compact btn-dash",
							organizers?.some((org: OrganizerType) => org.id === user.id) && "border-4 border-green-500 font-bold"
						)}
						onclick={() => handleOrganizer(user)}
					>
						<UserPlus size={16} />
						<span>{user.username}</span>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<button
		onclick={() => (showInviteModal = true)}
		class="text-fluid-sm float-right text-end text-blue-500 hover:underline"
	>
		<span>Ajoutez/invitez un·e organisateur·ices à l'équipe</span>
	</button>
</div>

{#if usersOfSpace.length}
	<dialog id="invite_modal" class="modal" class:modal-open={showInviteModal}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Ajouter ou inviter des bénévoles</h3>
			<div class="my-4">
				<ButtonGroupSelect
					options={usersOfSpace}
					optionsLabel="username"
					bind:selectedItems={selectedUsersToInvite}
				/>
			</div>
			<div class="modal-action">
				<form method="dialog">
					<button class="btn btn-ghost" onclick={() => (showInviteModal = false)}>Annuler</button>
					<button class="btn btn-primary" onclick={inviteUsers}>Enregistrer</button>
				</form>
			</div>
		</div>
	</dialog>
{/if}

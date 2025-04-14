<script lang="ts">
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import type { UserType, OrganizerType, TaskType } from '$lib/types/types';
	import { cn } from '$lib/utils';
	import { UserMinus, UserPlus, ListTodo } from 'lucide-svelte';
	import { fade, slide } from 'svelte/transition';
	import ButtonGroupSelect from './ButtonGroupSelect.svelte';

	let {
		organizersPossibles = [],
		hasMultipleTasks = false,
		tasks = [],
		organizers = $bindable([])
	} = $props<{
		organizersPossibles: UserType[];
		hasMultipleTasks: boolean;
		tasks: TaskType[];
		organizers: OrganizerType[];
	}>();

	let selectedOrganizer = $state<OrganizerType | UserType | null>(null);
	let selectedTasks = $state<TaskType[]>([]);
	let modalId = 'tasks_select_modal';

	let defaultTask = $derived.by(() => {
		const defaultTaskConfig = tasks.find((task) => task.type === 'default');
		return defaultTaskConfig?.name || (tasks.length > 0 ? tasks[0].name : '');
	});

	// TODO $derived instead of $effect + $state ?
	let uniqTask = $state('');

	$effect(() => {
		if (!hasMultipleTasks && tasks.length > 0) {
			uniqTask = defaultTask;
		}
	});

	// Liste des utilisateurs disponibles (non sélectionnés)
	let availableUsers = $derived.by(() =>
		organizersPossibles.filter((user) => !organizers.some((org) => org.id === user.id))
	);

	// liste des utilisateur de l'espace non présent dans organizers
	let usersOfSpace = $derived.by(() => {
		const usersToInvite = getSpace.members.filter(
			(member) => !organizers.some((org) => org.id === member.id)
		);
		return usersToInvite;
	});

	// FIXIT: créer un type Member, cohérent avec spaceOptions.members ?
	function handleOrganizer(user: OrganizerType | UserType) {
		const isExistingOrganizer = organizers.some((org) => org.id === user.id);
		const organizerData = isExistingOrganizer ? organizers.find((org) => org.id === user.id) : null;

		if (!hasMultipleTasks) {
			// Cas simple : une seule tâche possible
			// S'assurer que uniqTask est bien défini
			if (!uniqTask && tasks.length > 0) {
				uniqTask = tasks.find((t) => t.type === 'default')?.name || tasks[0].name;
			}
			// Si l'utilisateur existe déjà, on le supprime
			if (isExistingOrganizer) {
				organizers = organizers.filter((org) => org.id !== user.id);
			} else {
				// Sinon on l'ajoute avec la tâche unique
				organizers = [
					...organizers,
					{
						id: user.id,
						username: user.username,
						tasks: [uniqTask]
					}
				];
			}
		} else {
			// Cas avec plusieurs tâches : ouvrir le modal
			selectedOrganizer = {
				id: user.id,
				username: user.username
			};
			// Si l'utilisateur existe déjà, charger ses tâches
			selectedTasks = tasks.filter((task) => organizerData?.tasks?.includes(task.name));

			const modal = document.getElementById(modalId) as HTMLDialogElement;
			modal?.showModal();
		}
	}

	function saveOrganizer() {
		if (!selectedOrganizer) return;

		const index = organizers.findIndex((org) => org.id === selectedOrganizer.id);
		const taskNamesToSave = selectedTasks.map((task) => task.name);

		const updatedOrganizer = {
			id: selectedOrganizer.id,
			username: selectedOrganizer.username,
			tasks: taskNamesToSave
		};

		let newOrganizers = [...organizers];
		if (index !== -1) {
			if (taskNamesToSave.length === 0) {
				// Si plus de tâches, supprimer l'organisateur
				newOrganizers.splice(index, 1);
			} else {
				// Mise à jour
				newOrganizers[index] = updatedOrganizer;
			}
		} else if (taskNamesToSave.length > 0) {
			// Ajout (seulement s'il y a des tâches)
			newOrganizers.push(updatedOrganizer);
		}
		organizers = newOrganizers; // Réaffectation pour déclencher la réactivité

		closeTaskModal();
	}

	function closeModalAndRemoveOrganizer() {
		if (!selectedOrganizer) return;
		removeOrganizer(selectedOrganizer); // Appeler la fonction de suppression existante
		closeTaskModal();
	}

	function removeOrganizer(organizer: OrganizerType | UserType) {
		organizers = organizers.filter((org) => org.id !== organizer.id);
	}

	// invite users
	let selectedUsersToInvite = $state<UserType[]>([]);
	let showInviteModal = $state(false);
	const inviteUsers = () => {};

	function closeTaskModal() {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		modal?.close();
		selectedOrganizer = null;
		selectedTasks = [];
	}
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
			<div
				class={{ tooltip: hasMultipleTasks }}
				data-tip={hasMultipleTasks ? organizer.tasks.join(', ') : ''}
			>
				<button
					type="button"
					transition:slide
					class="btn flex justify-between gap-2"
					onclick={() => handleOrganizer(organizer)}
				>
					<span class="font-semibold">{organizer.username}</span>
					<div class="ps-1">
						{#if hasMultipleTasks}
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
			{#each availableUsers as user (user)}
				<div transition:slide>
					<button
						class={cn(
							'btn  btn-compact btn-dash',
							organizers?.some((org) => org.id === user.id) && 'border-4 border-green-500 font-bold'
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

<!-- Modal de sélection des rôles -->
<dialog id={modalId} class="modal">
	<div class="modal-box">
		<h3 class="mb-4 text-lg font-bold">
			Gestion des mandats pour {selectedOrganizer?.username}
		</h3>

		<ButtonGroupSelect options={tasks} bind:selectedItems={selectedTasks} optionsLabel="name" />

		<div class="modal-action">
			<button
				type="button"
				class="btn btn-error {selectedTasks.length === 0 && 'hidden'}"
				onclick={closeModalAndRemoveOrganizer}
			>
				<UserMinus />
				Désinscrire
			</button>
			<button onclick={closeTaskModal} class="btn">Annuler</button>
			<button type="button" class="btn btn-primary" onclick={saveOrganizer}> Enregistrer </button>
		</div>
	</div>
</dialog>
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
<!-- {$inspect('usersOfSpace', usersOfSpace)} -->

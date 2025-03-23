<script lang="ts">
	import PopoverMultiSelect from '$lib/components/PopoverMultiSelect.svelte';
	import TaskSelect from '$lib/components/forModal/TaskSelect.svelte';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import type { TaskConfig } from '$lib/types/spaceOptions';
	import { cn } from '$lib/utils';
	import { UserMinus, UserPlus } from 'lucide-svelte';
	import { fade, slide } from 'svelte/transition';
	import ButtonGroupSelect from './ButtonGroupSelect.svelte';

	interface Organizer {
		email: string;
		id: string;
		username: string;
		tasks: string[];
	}
	interface User {
		id: string;
		username: string;
		email?: string;
		role?: string;
	}

	let {
		organizersPossibles = [],
		hasMultipleTasks = false,
		tasks = [],
		organizers = $bindable([])
	} = $props<{
		organizersPossibles: User[];
		hasMultipleTasks: boolean;
		tasks: TaskConfig[];
		organizers: Organizer[];
	}>();

	let selectedOrganizer = $state<User | null>(null);
	let selectedTasks = $state<TaskConfig[]>([]);
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

	function addOrganizer(user: User) {
		if (!hasMultipleTasks) {
			organizers = [
				...organizers,
				{
					email: user.email || '',
					id: user.id,
					username: user.username,
					tasks: [uniqTask]
				}
			];
		} else {
			selectedOrganizer = user;
			selectedTasks = [];
			const modal = document.getElementById(modalId) as HTMLDialogElement;
			modal?.showModal();
		}
	}

	function saveTasks() {
		if (!selectedOrganizer || !selectedTasks) return;

		organizers = [
			...organizers,
			{
				email: selectedOrganizer.email || '',
				id: selectedOrganizer.id,
				username: selectedOrganizer.username,
				tasks: selectedTasks
			}
		];

		const modal = document.getElementById(modalId) as HTMLDialogElement;
		modal?.close();
		selectedOrganizer = null;
		selectedTasks = [];
	}

	function removeOrganizer(organizer: Organizer) {
		organizers = organizers.filter((org) => org.id !== organizer.id);
	}

	function toggleTasks(organizer: Organizer, taskName: string) {
		const index = organizers.findIndex((org) => org.id === organizer.id);
		if (index === -1) return;

		const updatedOrganizer = { ...organizers[index] };
		if (updatedOrganizer.tasks.includes(taskName)) {
			updatedOrganizer.tasks = updatedOrganizer.tasks.filter((r) => r !== taskName);
		} else {
			updatedOrganizer.tasks = [...updatedOrganizer.tasks, taskName];
		}
		organizers[index] = updatedOrganizer;
		organizers = [...organizers];
	}

	// invite users
	let selectedUsersToInvite = $state<User[]>([]);
	let showInviteModal = $state(false);
	const inviteUsers = () => {};
</script>

<div transition:fade>
	<!-- Section des organisateurs inscrits -->
	<div transition:fade class="text-fluid-sm mb-2 font-medium text-gray-700">
		{#if organizers && organizers.length}
			Inscrit pour l'organisation de cet événement :
		{:else}
			Aucun organisateur inscrit pour le moment...
		{/if}
	</div>
	<div class="mb-4 flex flex-wrap gap-2">
		{#each organizers as organizer (organizer)}
			<div transition:slide class="flex items-center gap-4 rounded-lg bg-gray-200 py-0.5 pl-3">
				<span class="font-medium">{organizer.username}</span>
				<PopoverMultiSelect
					items={tasks.map((t) => t.name)}
					bind:selectedItems={organizer.tasks}
					toggleItem={(taskName) => toggleTasks(organizer, taskName)}
					size="sm"
					label=""
					labelEmpty="mandats ?"
				/>
				<button class="btn btn-ghost btn-xs text-error" onclick={() => removeOrganizer(organizer)}>
					<UserMinus />
				</button>
			</div>
		{/each}
	</div>

	<!-- Section des utilisateurs disponibles -->
	{#if availableUsers.length}
		<div class="mb-2 font-medium text-gray-700">
			Ajoutez les personnes participants à l'organisation de cet événement :
		</div>
	{/if}
	<div class="flex w-full flex-wrap items-center gap-2">
		{#each availableUsers as user (user)}
			<div transition:slide>
				<button
					class={cn(
						'btn btn-outline btn-sm text-base font-medium',
						organizers?.some((org) => org.id === user.id) && 'border-4 border-green-500 font-bold'
					)}
					onclick={() => addOrganizer(user)}
				>
					<UserPlus size={16} />
					<span>{user.username}</span>
				</button>
			</div>
		{/each}
	</div>
</div>

<!-- Modal de sélection des rôles -->
<dialog id={modalId} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Définir les roles pour {selectedOrganizer?.username}</h3>
		<TaskSelect taskOptions={tasks} bind:selectedTasks />
		<div class="modal-action">
			<form method="dialog">
				<button class="btn btn-ghost">Annuler</button>
				<button class="btn btn-primary" onclick={saveTasks}>Enregistrer</button>
			</form>
		</div>
	</div>
</dialog>

<button
	onclick={() => (showInviteModal = true)}
	class="text-fluid-sm float-right text-end text-blue-500 hover:underline"
>
	<span>Ajoutez/invitez un·e organisateur·ices à l'équipe</span>
</button>

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

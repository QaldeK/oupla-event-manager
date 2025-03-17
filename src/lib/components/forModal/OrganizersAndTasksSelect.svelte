<script lang="ts">
	import PopoverMultiSelect from '$lib/components/PopoverMultiSelect.svelte';
	import ButtonGroupSelect from '$lib/components/forModal/ButtonGroupSelect.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import { cn } from '$lib/utils';

	import { fade, slide } from 'svelte/transition';

	import { UserMinus } from 'lucide-svelte';

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
		hasMultipleTasks: hasMultipleTasks = false,
		tasks: tasks = [],
		organizers = $bindable([])
	} = $props<{
		organizersPossibles: User[];
		hasMultipleTasks: boolean;
		tasks: string[];
		organizers: Organizer[];
	}>();

	let selectedOrganizer = $state<User | null>(null);
	let showTasksDialog = $state(false);
	let showInviteModal = $state(false);
	let selectedTasks = $state<string[]>([]);

	// TODO $derived instead of $effect + $state ?
	let uniqTask = $state('');

	$effect(() => {
		if (!hasMultipleTasks) {
			uniqTask = tasks[0];
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
			showTasksDialog = true;
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

		showTasksDialog = false;
		selectedOrganizer = null;
		selectedTasks = [];
	}

	function removeOrganizer(organizer: Organizer) {
		organizers = organizers.filter((org) => org.id !== organizer.id);
	}

	function toggleTasks(organizer: Organizer, task: string) {
		const index = organizers.findIndex((org) => org.id === organizer.id);
		if (index === -1) return;

		const updatedOrganizer = { ...organizers[index] };
		if (updatedOrganizer.tasks.includes(task)) {
			updatedOrganizer.tasks = updatedOrganizer.tasks.filter((r) => r !== task);
		} else {
			updatedOrganizer.tasks = [...updatedOrganizer.tasks, task];
		}
		organizers[index] = updatedOrganizer;
		organizers = [...organizers];
	}

	// invite users
	let selectedUsersToInvite = $state<User[]>([]);
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
		{#each organizers as organizer}
			<div transition:slide class="flex items-center gap-4 rounded-lg bg-gray-200 py-0.5 pl-3">
				<span class="font-medium">{organizer.username}</span>
				<PopoverMultiSelect
					items={tasks}
					bind:selectedItems={organizer.tasks}
					toggleItem={(task) => toggleTasks(organizer, task)}
					size="sm"
					label=""
					labelEmpty="mandats ?"
				/>
				<Button
					variant="icon"
					size="xs"
					class="bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive"
					onclick={() => removeOrganizer(organizer)}
				>
					<UserMinus />
				</Button>
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
		{#each availableUsers as user}
			<div transition:slide>
				<Button
					variant="outline"
					size="xs"
					class={cn(
						'flex items-center gap-2 hover:border-green-500',
						organizers?.some((org) => org.id === user.id) && 'border-4 border-green-500 font-bold'
					)}
					onclick={() => addOrganizer(user)}
				>
					<span>{user.username}</span>
				</Button>
			</div>
		{/each}
	</div>
</div>

<!-- Popup de sélection des rôles -->
<AlertDialog.Root bind:open={showTasksDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Définir les roles pour {selectedOrganizer?.username}</AlertDialog.Title>
		</AlertDialog.Header>

		<div class="my-4">
			<ButtonGroupSelect options={tasks} bind:selectedItems={selectedTasks} />
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
			<AlertDialog.Action onclick={saveTasks}>Enregistrer</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<button
	onclick={() => (showInviteModal = true)}
	class="text-fluid-sm float-right text-end text-blue-500 hover:underline"
>
	<span>Ajoutez/invitez un·e organisateur·ices à l'équipe</span>
</button>

{#if usersOfSpace.length}
	<AlertDialog.Root bind:open={showInviteModal}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Ajouter ou inviter des bénévoles</AlertDialog.Title>
			</AlertDialog.Header>

			<div class="my-4">
				<ButtonGroupSelect
					options={usersOfSpace}
					optionsLabel="username"
					bind:selectedItems={selectedUsersToInvite}
				/>
			</div>

			<AlertDialog.Footer>
				<AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
				<AlertDialog.Action onclick={inviteUsers}>Enregistrer</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
<!-- {$inspect('usersOfSpace', usersOfSpace)} -->

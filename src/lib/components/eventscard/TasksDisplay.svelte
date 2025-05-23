<script lang="ts">
	import { fade } from "svelte/transition";
	import { Info } from "lucide-svelte";
	import type { TaskType, OrganizerType, UserType } from "$lib/types/types";

	interface Props {
		tasks: TaskType[];
		organizers: OrganizerType[];
		currentUser: UserType;
		isUserInRecurrenceTeam: boolean;
		onTaskSubscription: (taskName?: string) => void;
		isRecurrent?: boolean;
		recurrenceTeam?: string[];
	}

	const {
		tasks,
		organizers,
		currentUser,
		onTaskSubscription,
		isUserInRecurrenceTeam,
		isRecurrent = false,
		recurrenceTeam = []
	} = $props<Props>();

	const isUserSubscribedToTask = (task: string) => {
		return organizers.some((org) => org.id === currentUser.id && org.tasks?.includes(task));
	};

	const shouldShowTaskDetails = $derived(isUserInRecurrenceTeam && tasks.length > 1);
</script>

{#if isRecurrent}
	<div class="flex flex-wrap gap-2 p-2">
		<span class="text-base-content/80">Equipe:</span>
		{#each recurrenceTeam as memberOfTeam (memberOfTeam.id)}
			<span class="badge font-medium">
				{memberOfTeam.username}
			</span>
		{/each}
	</div>
{/if}
{#if shouldShowTaskDetails}
	<!-- Affichage détaillé des tâches pour les membres de recurrenceTeam -->
	<div class="@xl:grid @xl:grid-cols-2 @xl:justify-around @xl:gap-4 @xl:p-4 @3xl:grid-cols-3">
		{#each tasks as task (task.name)}
			{@const organizersForTask = organizers.filter((org) => org.tasks?.includes(task.name) ?? [])}
			{@const isUserInTask = isUserSubscribedToTask(task.name)}
			<div class="text-fluid-sm border bg-white font-semibold shadow-xs sm:rounded-lg">
				<div
					class="text-base-content mb-2 flex justify-items-center rounded-t-lg px-4 py-1 text-center {organizersForTask.length >
					0
						? 'text-base-content'
						: 'text-error '}"
				>
					{task.name}
					{#if task.description}
						<div class="tooltip tooltip-info ml-2 text-sm" data-tip={task.description}>
							<Info size={18} />
						</div>
					{/if}
				</div>

				<!-- Organisateurs inscrits pour cette tâche -->
				<div class="mb-2 flex flex-wrap items-center gap-2 px-2">
					{#if organizersForTask.length > 0}
						{#each organizersForTask as organizer (organizer.id)}
							<span transition:fade|local class="badge badge-accent badge-soft">
								{organizer.username}
							</span>
						{/each}
					{/if}
					<button
						class="btn btn-outline btn-xs ml-auto {isUserInTask ? 'btn-error' : 'btn-primary'}"
						onclick={() => onTaskSubscription(task.name)}
					>
						{isUserInTask ? "Se désinscrire" : "S'inscrire"}
					</button>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<!-- Affichage simple des organisateurs pour les non-membres -->

	<div class="flex flex-wrap gap-2">
		{#if !organizers.length}
			<span class="text-fluid-sm text-base-content/70 p-2 italic">personne pour le moment...</span>
		{:else}
			<div class="flex flex-wrap gap-2 p-2">
				<span class="text-base-content/80">Inscrit:</span>
				{#each organizers as organizer (organizer.id)}
					<span class="badge badge-outline badge-accent font-semibold">
						{organizer.username}
					</span>
				{/each}
			</div>
		{/if}
	</div>
{/if}

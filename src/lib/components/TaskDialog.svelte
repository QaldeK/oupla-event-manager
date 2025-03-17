<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { modalState } from '$lib/shared/states.svelte';
	import { cn } from '$lib/utils';

	// pseudo props
	let username: string = $state(modalState.tasks.data.username);
	let tasks: string[] = $state.snapshot(modalState.tasks.data.tasks);
	let selectedTasks = $state<string[]>(modalState.tasks.data.selectedTasks);

	const isSelected = (option: any) => {
		if (!selectedTasks) return false;

		return selectedTasks.some((item) => item === option);
	};

	function toggleItem(option: any) {
		if (isSelected(option)) {
			selectedTasks = selectedTasks.filter((item) => item !== option);
		} else {
			selectedTasks = [...selectedTasks, option];
		}
	}

	const handleSubmit = () => {
		if (modalState.tasks.data.onSubmit) {
			modalState.tasks.data.onSubmit(selectedTasks);
		}
		modalState.tasks.isOpen = false;
	};
</script>

<AlertDialog.Root bind:open={modalState.tasks.isOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Définir les roles pour {username}</AlertDialog.Title>
		</AlertDialog.Header>
		<div class="my-4">
			<div class="flex w-full flex-wrap items-center gap-2">
				{#each tasks as task}
					<Button
						variant="outline"
						size="xs"
						class={cn(
							'flex items-center gap-2 hover:border-green-500',
							isSelected(task) && 'border-4 border-green-500 font-bold'
						)}
						onclick={() => toggleItem(task)}
					>
						<span>{task}</span>
					</Button>
				{/each}
			</div>
		</div>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleSubmit}>Enregistrer</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	let {
		selectedItems = $bindable([q]),
		options = $bindable([]),
		optionsLabel = '',
		hasAddInput = false,
		defaultOption = '',
		onadd = () => {}
	} = $props();

	const isSelected = (option: any) => {
		if (!selectedItems) return false;
		if (optionsLabel) {
			return selectedItems.some((item) => item[optionsLabel] === option[optionsLabel]);
		}
		return selectedItems.some((item) => item === option);
	};

	function toggleItem(option: any) {
		if (isSelected(option)) {
			selectedItems = selectedItems.filter((item) =>
				optionsLabel ? item[optionsLabel] !== option[optionsLabel] : item !== option
			);
		} else {
			selectedItems = [...selectedItems, option];
		}
	}

	$effect(() => {
		if (defaultOption && (!selectedItems || selectedItems.length === 0)) {
			selectedItems = [defaultOption];
		}
	});
</script>

<div class="flex w-full flex-wrap items-center gap-2">
	{#each options as option}
		<Button
			variant="outline"
			size="xs"
			class={cn(
				'flex items-center gap-2 rounded-none hover:border-green-500',
				isSelected(option) && 'border-4 border-green-500 font-bold'
			)}
			onclick={() => toggleItem(option)}
		>
			{#if optionsLabel}
				<span>{option[optionsLabel]}</span>
			{:else}
				<span>{option}</span>
			{/if}
		</Button>
	{/each}
</div>

{#if hasAddInput}
	<div class="mt-4 flex items-center">
		<input
			id="inputId"
			type="text"
			placeholder="Ajouter un rôle"
			class="peer w-full rounded-l-md border border-r-0 border-gray-300 bg-white px-4 py-1 shadow-xs first-letter:text-gray-700 focus:border-indigo-300 focus:ring-3 focus:ring-indigo-200 focus:outline-hidden md:w-fit"
		/>
		<button
			onclick={() => {
				onadd(inputId.value);
				inputId.value = '';
			}}
			class="rounded-r-md border border-l-0 border-gray-300 bg-blue-500 px-4 py-1 font-semibold text-white peer-focus:border-indigo-300 peer-focus:ring-3 peer-focus:ring-indigo-200 peer-focus:outline-hidden hover:bg-blue-700"
		>
			Ajouter
		</button>
	</div>
{/if}

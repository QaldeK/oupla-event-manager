<script lang="ts">
	let {
		selectedItems = $bindable(),
		options = $bindable(),
		optionsLabel = '',
		defaultOption = ''
	} = $props();

	const isSelected = (option) => {
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
	{#each options as option, index (index)}
		<button
			class="btn btn-compact {isSelected(option) ? 'btn-accent' : ' btn-dash '}"
			onclick={() => toggleItem(option)}
		>
			{#if optionsLabel}
				<span>{option[optionsLabel]}</span>
			{:else}
				<span>{option}</span>
			{/if}
		</button>
	{/each}
</div>

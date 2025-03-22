<script lang="ts">
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
	{#each options as option (option)}
		<button
			class="btn btn-sm btn-outline text-base font-medium {isSelected(option) &&
				'border-primary bg-primary/10 border-4 font-bold'}"
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

{#if hasAddInput}
	<div class="join mt-4">
		<input id="inputId" type="text" placeholder="Ajouter un rôle" class="input join-item w-64" />
		<button
			onclick={() => {
				onadd(inputId.value);
				inputId.value = '';
			}}
			class="join-item btn btn-primary"
		>
			Ajouter
		</button>
	</div>
{/if}

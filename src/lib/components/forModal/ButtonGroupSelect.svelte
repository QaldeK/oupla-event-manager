<script lang="ts">
	// import { Icon } from 'lucide-svelte';
	import type { Component } from 'svelte';

	interface Props {
		selectedItems?: any[];
		options?: any[];
		optionsLabel?: string;
		defaultOption?: any;
		Icon?: Component;
	}

	let {
		selectedItems = $bindable(),
		options = $bindable(),
		optionsLabel = '',
		defaultOption = '',
		Icon
	} = $props();

	const isSelected = (option) => {
		if (!selectedItems) return false;
		if (optionsLabel) {
			return selectedItems.some(
				(item) =>
					typeof item === 'object' &&
					item !== null &&
					typeof option === 'object' &&
					option !== null &&
					item[optionsLabel] === option[optionsLabel]
			);
		}
		return selectedItems.some((item) => item === option);
	};

	function toggleItem(option: any) {
		const currentSelectedItems = selectedItems ?? [];
		if (isSelected(option)) {
			selectedItems = currentSelectedItems.filter((item) =>
				optionsLabel &&
				typeof item === 'object' &&
				item !== null &&
				typeof option === 'object' &&
				option !== null
					? item[optionsLabel] !== option[optionsLabel]
					: item !== option
			);
		} else {
			selectedItems = [...currentSelectedItems, option];
		}
	}

	$effect(() => {
		if (defaultOption !== undefined && (!selectedItems || selectedItems.length === 0)) {
			const defaultExistsInOptions = options.some((opt) => {
				if (
					optionsLabel &&
					typeof opt === 'object' &&
					opt !== null &&
					typeof defaultOption === 'object' &&
					defaultOption !== null
				) {
					return opt[optionsLabel] === defaultOption[optionsLabel];
				}
				return opt === defaultOption;
			});
			if (defaultExistsInOptions) {
				selectedItems = [defaultOption];
			}
		}
	});
</script>

<div class="flex w-full flex-wrap items-center gap-2">
	{#each options as option, index (index)}
		<button
			class="btn btn-compact {isSelected(option) ? 'btn-accent' : ' btn-dash '}"
			onclick={() => toggleItem(option)}
		>
			{#if Icon}
				<Icon size={16} />
			{/if}
			{#if optionsLabel}
				<span>{option[optionsLabel]}</span>
			{:else}
				<span>{option}</span>
			{/if}
		</button>
	{/each}
</div>

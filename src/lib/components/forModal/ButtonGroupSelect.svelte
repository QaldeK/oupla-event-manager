<script lang="ts">
	// import { Icon } from 'lucide-svelte';

	type OptionType = Record<string, any> | string;

	let {
		selectedItems = $bindable<OptionType[] | undefined>(),
		options,
		optionsLabel = "",
		defaultOption = "",
		Icon = null,
		isDisabled = false
	} = $props<{
		selectedItems?: OptionType[];
		options: OptionType[];
		optionsLabel?: string;
		defaultOption?: OptionType;
		Icon?: unknown;
		isDisabled?: boolean;
	}>();

	const getOptionValue = (option: OptionType): any => {
		return optionsLabel && typeof option === "object" && option !== null
			? option[optionsLabel]
			: option;
	};

	const getOptionDescription = (option: OptionType): string | undefined => {
		// Fonction helper pour récupérer la description
		return typeof option === "object" && option !== null && option.description
			? String(option.description)
			: undefined;
	};

	const isSelected = (option: OptionType) => {
		if (!selectedItems) return false;
		const optionValue = getOptionValue(option);
		return selectedItems.some((item: OptionType) => getOptionValue(item) === optionValue);
	};

	function toggleItem(option: OptionType) {
		const currentSelectedItems = selectedItems ?? [];
		const optionValue = getOptionValue(option);
		if (isSelected(option)) {
			selectedItems = currentSelectedItems.filter(
				(item: OptionType) => getOptionValue(item) !== optionValue
			);
		} else {
			selectedItems = [...currentSelectedItems, option];
		}
	}

	$effect(() => {
		if (
			defaultOption !== undefined &&
			defaultOption !== "" &&
			(!selectedItems || selectedItems.length === 0)
		) {
			const defaultOptionValue = getOptionValue(defaultOption);
			const defaultExistsInOptions = options.some(
				(opt: OptionType) => getOptionValue(opt) === defaultOptionValue
			);

			if (defaultExistsInOptions) {
				// Trouver l'objet option complet correspondant à defaultOption si optionsLabel est utilisé
				const fullDefaultOption =
					options.find((opt: any) => getOptionValue(opt) === defaultOptionValue) ?? defaultOption;
				selectedItems = [fullDefaultOption];
			}
		}
	});
</script>

<div class="flex w-full flex-wrap items-center gap-2">
	{#each options as option, index (index)}
		{@const description = getOptionDescription(option)}

		<button
			type="button"
			class="btn btn-compact"
			class:btn-accent={isSelected(option)}
			class:btn-dash={!isSelected(option)}
			title={description}
			onclick={() => toggleItem(option)}
			disabled={isDisabled}
		>
			{#if Icon}
				<Icon size={16} />
			{/if}
			<span>{getOptionValue(option)}</span>
		</button>
	{/each}
</div>

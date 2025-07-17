<script lang="ts">
	import { clickOutside } from "$lib/actions/clickOutside";

	import { slide } from "svelte/transition";

	let {
		selectedValues = $bindable([]),
		options = $bindable([]),
		placeholder = "Sélectionner des options"
	} = $props<{
		selectedValues?: (number | string)[];
		options?: Option[];
		placeholder?: string;
	}>();

	let isOpen = $state(false);
	// let selectedValues = $state<number[]>([]);
	let optionRefs: HTMLDivElement[] = $state([]);
	let selectedIndex = $state(-1);
	let containerRef: HTMLDivElement;

	type Option = {
		value: number | string;
		label: string;
	};

	function toggleDropdown() {
		isOpen = !isOpen;
		selectedIndex = -1;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
				optionRefs[selectedIndex]?.focus();
				break;
			case "ArrowUp":
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				optionRefs[selectedIndex]?.focus();
				break;

			case "Escape":
				e.preventDefault();
				isOpen = false;
				break;
		}
	}

	function toggleOption(value: number) {
		if (selectedValues.includes(value)) {
			selectedValues = selectedValues.filter((v: number) => v !== value);
		} else {
			selectedValues = [...selectedValues, value].sort();
		}
	}

	function removeOption(value: number) {
		selectedValues = selectedValues.filter((v: number) => v !== value);
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener("keydown", handleKeydown);
		} else {
			document.removeEventListener("keydown", handleKeydown);
		}

		return () => {
			document.removeEventListener("keydown", handleKeydown);
		};
	});

	// Fonction pour obtenir le label à partir de la valeur
	function getLabelForValue(value: number | string): string {
		const option = options.find(
			(opt: { value: number | string; label: string }) => opt.value === value
		);
		return option ? option.label : "";
	}
</script>

<div use:clickOutside={() => (isOpen = false)} class="relative flex-auto" bind:this={containerRef}>
	<!-- Input avec les tags sélectionnés -->
	<div
		role="combobox"
		aria-expanded={isOpen}
		aria-controls="multiselect-listbox"
		aria-haspopup="listbox"
		tabindex="0"
		class="input flex h-full w-full flex-wrap gap-2 rounded-md sm:w-96"
		onclick={toggleDropdown}
		onkeydown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				toggleDropdown();
			}
		}}
	>
		{#each selectedValues as value (value)}
			<div class="bg-primary/20 text-primary relative flex items-center rounded px-3 py-1">
				<span class="mr-8">{getLabelForValue(value)}</span>
				<button
					onclick={() => removeOption(value)}
					class="center absolute right-1 flex h-6 w-6 items-center justify-center rounded bg-red-50 font-bold text-red-900 hover:cursor-pointer hover:text-red-700"
					aria-label="Supprimer {getLabelForValue(value)}"
				>
					×
				</button>
			</div>
		{/each}
	</div>
	<span class="text-fluid-sm text-gray-500">{placeholder}</span>

	<!-- Menu déroulant -->
	{#if isOpen}
		<div
			role="listbox"
			aria-multiselectable="true"
			class="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg"
			transition:slide
		>
			{#each options as option, index (index)}
				<div
					role="option"
					tabindex="0"
					aria-selected={selectedValues.includes(option.value)}
					bind:this={optionRefs[index]}
					class="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-100"
					class:bg-blue-50={selectedValues.includes(option.value)}
					onclick={() => toggleOption(option.value)}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggleOption(option.value);
						}
					}}
				>
					<input
						type="checkbox"
						checked={selectedValues.includes(option.value)}
						class="mr-2"
						aria-hidden="true"
					/>
					<span>{option.label}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

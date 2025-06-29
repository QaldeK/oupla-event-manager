<script lang="ts">
	import { clickOutside } from "$lib/actions/clickOutside";
	import { Check } from "lucide-svelte";

	// Props
	interface Props {
		options?: Array<{ value: string; label: string; textClass?: string; previewColor?: string }>;
		value: string;
		label?: string;
		helperText?: string;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		mode?: "background" | "text";
		complementaryColor?: string;
		daisyTheme?: string;
	}

	let {
		options = [],
		value = $bindable(),
		label = "",
		helperText = "",
		disabled = false,
		required = false,
		id = crypto.randomUUID(),
		mode = "background", // Par défaut, on affiche des couleurs de fond
		complementaryColor = mode === "background" ? "text-base-content" : "bg-base-100",
		daisyTheme = "light"
	}: Props = $props();

	// État local
	let isOpen = $state(false);
	let inputRef: HTMLButtonElement;

	// Gestionnaires d'événements
	function toggleDropdown() {
		if (!disabled) {
			isOpen = !isOpen;
		}
	}

	function selectOption(optionValue: string) {
		value = optionValue;
		isOpen = false;
	}

	function handleClickOutside() {
		isOpen = false;
	}

	// Générer les classes pour l'aperçu combiné
	function getPreviewClasses(option: { value: string; textClass?: string }): string {
		if (mode === "background") {
			// Pour les fonds, on utilise la classe bg- et on ajoute la couleur de texte adaptée si dispo, sinon complémentaire
			return `${option.value} ${option.textClass ?? complementaryColor}`;
		} else {
			// Pour les textes, on utilise la classe text- et on ajoute la couleur de fond complémentaire
			return `${complementaryColor} ${option.value}`;
		}
	}

	// Trouver l'option sélectionnée pour l'aperçu du bouton
	let selectedOption = $derived(options.find((option) => option.value === value));
</script>

<div class="form-control w-full">
	{#if label}
		<label for={id} class="">
			<span class="label-text mb-1 font-medium">{label}</span>
			{#if required}<span class="text-error">*</span>{/if}
		</label>
	{/if}

	<div class="relative">
		<!-- Bouton servant d'élément déclencheur -->
		<button
			type="button"
			{id}
			class="select select-bordered w-full px-4 py-2 text-left {disabled ? 'select-disabled' : ''}"
			onclick={toggleDropdown}
			{disabled}
			bind:this={inputRef}
			use:clickOutside={handleClickOutside}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
		>
			<div class="flex items-center gap-2" data-theme={daisyTheme}>
				{#if value}
					{#if mode === "background"}
						<!-- Aperçu pour couleur de fond -->
						{#if selectedOption}
							<div
								class="flex h-5 w-5 items-center justify-center rounded-full {getPreviewClasses(
									selectedOption
								)}"
								aria-hidden="true"
							></div>
						{/if}
					{:else}
						<!-- Aperçu pour couleur de texte -->
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full {getPreviewClasses({
								value
							})}"
							aria-hidden="true"
						>
							<span class="text-[8px] font-bold">A</span>
						</div>
					{/if}
				{/if}
				<span
					>{options.find((option) => option.value === value)?.label ||
						"Sélectionnez une couleur"}</span
				>
			</div>
		</button>

		<!-- Dropdown -->
		{#if isOpen}
			<div
				class="bg-base-100 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md shadow-lg"
				role="listbox"
				data-theme={daisyTheme}
			>
				<ul class="py-1">
					{#each options as option (option.value)}
						<li
							class="hover:bg-base-200 cursor-pointer px-4 py-2 {value === option.value
								? 'bg-base-200'
								: ''}"
							role="option"
							aria-selected={value === option.value}
							onclick={() => selectOption(option.value)}
							onkeydown={(e) => e.key === "Enter" && selectOption(option.value)}
							tabindex="0"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<!-- Aperçu avec la couleur de texte adaptée -->
									<div
										class="flex h-5 w-5 items-center justify-center rounded-full {getPreviewClasses(
											option
										)}"
										aria-hidden="true"
									>
										<span class="text-[8px] font-bold">A</span>
									</div>
									<span>{option.label}</span>
								</div>
								{#if value === option.value}
									<Check size={16} />
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	{#if helperText}
		<label class="label" for={`${id}-helper`}>
			<span class="label-text-alt">{helperText}</span>
		</label>
	{/if}
</div>

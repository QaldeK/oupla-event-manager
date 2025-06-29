<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		id: string;
		label: string;
		options: Option[];
		value: string;
		class?: string;
	}

	let { id, label, options, value = $bindable(), class: className = "" }: Props = $props();

	// Index actuel basé sur la valeur
	let currentIndex = $state(0);

	// Mise à jour de l'index quand la valeur change
	$effect(() => {
		const index = options.findIndex((option) => option.value === value);
		if (index !== -1) {
			currentIndex = index;
		}
	});

	// Mise à jour de la valeur quand l'index change
	function handleIndexChange() {
		if (currentIndex >= 0 && currentIndex < options.length) {
			value = options[currentIndex].value;
		}
	}
</script>

<div class="form-control w-full {className}">
	<label class="label" for={id}>
		<span class="label-text font-medium">{label}</span>
	</label>

	<input
		{id}
		type="range"
		min="0"
		max={options.length - 1}
		bind:value={currentIndex}
		onchange={handleIndexChange}
		oninput={handleIndexChange}
		class="range range-primary flex w-5/6"
		step="1"
	/>

	<label class="label" for={id}>
		<span class="text-sm">
			{options[currentIndex]?.label || ""}
		</span>
	</label>
</div>

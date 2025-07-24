<script lang="ts">
	import { LayoutGrid, List } from "lucide-svelte";
	import { persistedState } from "$lib/utils/local-state.svelte.js";

	interface Props {
		currentMode?: "cards" | "list";
		onModeChange?: (mode: "cards" | "list") => void;
		storageKey?: string;
		autoSave?: boolean;
	}

	let {
		currentMode = "cards",
		onModeChange,
		storageKey = "view-mode",
		autoSave = false
	}: Props = $props();

	// Si autoSave est activé, utiliser la persistance automatique
	const persistedMode = autoSave ? persistedState<"cards" | "list">(storageKey, currentMode) : null;

	// Mode effectif : persisté si autoSave est activé, sinon la prop
	let effectiveMode = $derived(autoSave ? persistedMode!.value : currentMode);

	function handleModeChange(mode: "cards" | "list") {
		if (autoSave && persistedMode) {
			persistedMode.value = mode;
		}

		if (onModeChange) {
			onModeChange(mode);
		}
	}
</script>

<div class="join">
	<button
		class="btn join-item btn-sm"
		class:btn-active={effectiveMode === "cards"}
		onclick={() => handleModeChange("cards")}
		title="Affichage en cartes"
	>
		<LayoutGrid size={16} />
		Cartes
	</button>
	<button
		class="btn join-item btn-sm"
		class:btn-active={effectiveMode === "list"}
		onclick={() => handleModeChange("list")}
		title="Affichage en liste"
	>
		<List size={16} />
		Liste
	</button>
</div>

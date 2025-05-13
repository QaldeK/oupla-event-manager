<script lang="ts">
	import { eventState, modalState } from "$lib/shared";
	import type { EventType } from "$lib/types/types";
	import { OctagonAlert } from "lucide-svelte";

	let {
		event,
		missingForConfirmation,
		showButton = false
	} = $props<{
		event: EventType;
		missingForConfirmation: boolean;
		showButton?: boolean;
	}>();

	// Structure simple décrivant les champs requis et leurs labels
	const requiredFields = {
		start_public: "Horaire d'ouverture au public",
		desc_public: "Description publique",
		categories: "Type d'événement",
		rooms: "Salles"
	} as const;

	// Vérification simple et rapide des champs manquants
	let missingFields = $derived.by(() => {
		if (!missingForConfirmation) return [];

		return Object.entries(requiredFields).filter(([field]) => {
			const value = event[field as keyof EventType];
			return (
				!value ||
				(Array.isArray(value) && value.length === 0) ||
				(typeof value === "string" && value.trim() === "") ||
				value === "<p></p>" // desc_public
			);
		});
	});

	function handleEditClick() {
		modalState.event = true;
		eventState.is = event;
	}
</script>

{#if missingFields.length > 0}
	<div class="alert rounded-none">
		<OctagonAlert />
		<div>
			<div class="font-bold">
				Information{missingFields.length > 1 ? "s" : ""} manquante{missingFields.length > 1
					? "s"
					: ""} pour confirmer l'événement :
				<span class="font-normal">
					{missingFields.map(([, label]) => label).join(", ")}
				</span>
			</div>
		</div>
		{#if showButton}
			<div class="flex-none">
				<button onclick={handleEditClick} class="btn btn-sm"> Compléter </button>
			</div>
		{/if}
	</div>
{/if}

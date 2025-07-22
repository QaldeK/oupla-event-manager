<script lang="ts">
	// Version simplifiée pour affichage des événements archivés
	import { lisibleDate } from "$lib/utils";
	import type { ArchivedEventType } from "$lib/types/archived.types";
	import { fade } from "svelte/transition";
	import ExpandableCard from "../ExpandableCard.svelte";
	import { safeHtml } from "$lib/actions/safeHtml";

	// Props attendus : currentEvent
	interface Props {
		currentEvent: ArchivedEventType;
	}
	const { currentEvent }: Props = $props();

	// Variables d'affichage
	const hasTime = $derived(!!currentEvent.start_public);
	const timeDisplay = $derived(currentEvent.start_public ?? "");

	const statusMessage = $derived.by(() => {
		if (!currentEvent.date_event) return "Date à définir";
		if (!hasTime) return "Horaires à définir";
		return "";
	});

	const bgDateTime = $derived.by(() => {
		if (currentEvent.isConfirmed) return "bg-success/20";
		else return "bg-warning/20";
	});
</script>

<div transition:fade class="@container" id={currentEvent.id}>
	<div
		class="transition:fade bg-base-100 mb-8 rounded-lg border shadow-md @md:mb-4 {currentEvent.isConfirmed
			? ''
			: 'border-l-warning/80 border-l-4'}"
	>
		<div class="pb-4">
			<div id="Header-event" class="mb-4 justify-between gap-2 @md:flex @md:px-4 @md:py-2">
				<!-- Date, heure, salles -->
				<div
					id="Top_event_date"
					class="px-6 py-2 shadow-sm @md:mt-2 @md:place-self-start @md:rounded-xl @md:align-top {bgDateTime}"
				>
					<div
						class="flex flex-wrap items-baseline justify-center gap-x-4 @md:flex-col @md:items-end @md:text-end"
					>
						{#if currentEvent.date_event}
							<span class="text-fluid-base font-bold">
								{lisibleDate(currentEvent.date_event)}
							</span>
						{/if}
						{#if timeDisplay}
							<span class="text-fluid-base font-medium">
								{timeDisplay}
							</span>
						{/if}
						{#if statusMessage}
							<span class="text-base-content/70 text-fluid-sm text-center italic">
								{statusMessage}
							</span>
						{/if}
					</div>
				</div>
				<!-- Titre et catégories -->
				<div id="titleAndCat" class="w-full p-3 @max-md:text-center @md:order-first @md:w-3/5">
					<p class="text-fluid-xl font-bold">{currentEvent.event_title}</p>
					<div class="flex flex-wrap items-center justify-center gap-2 @md:justify-between">
						{#each currentEvent.categories ?? [] as category, index (category)}
							<span class="font-semibold uppercase"
								>{category}{index < (currentEvent.categories ?? []).length - 1 ? ", " : ""}
							</span>
						{/each}
					</div>
					<div
						id="info-event"
						class="my-2 flex flex-wrap gap-x-2 gap-y-2 font-semibold @max-md:justify-center"
					>
						<div
							class="badge badge-sm {currentEvent.isPublic
								? 'badge-accent badge-soft'
								: 'bg-neutral/10 '}"
						>
							{currentEvent.isPublic ? "Public" : "non-public"}
						</div>
					</div>
					{#if currentEvent.isRecurrent}
						<div class="text-fluid-sm text-base-content/80 me-2 mt-1">Événement récurrent</div>
					{/if}
				</div>
			</div>

			<!-- Description et infos complémentaires -->
			<div id="event_content" class="flex flex-col gap-y-6 @md:p-4">
				{#if currentEvent.desc_public}
					<ExpandableCard title="à propos...">
						<span use:safeHtml={{ html: currentEvent.desc_public }}></span>
					</ExpandableCard>
				{/if}
			</div>
		</div>
	</div>
</div>

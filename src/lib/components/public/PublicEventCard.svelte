<script lang="ts">
	import { Clock, Calendar, Euro, Users, AlertTriangle, ChevronRight } from 'lucide-svelte';
	import type { PublicEventInfo } from '$lib/shared/publicStore.svelte';

	let { event, spaceName } = $props<{
		event: PublicEventInfo;
		spaceName: string;
	}>();

	// Configuration pour la troncature du texte
	let isExpanded = $state(false);
	let descriptionEl: HTMLElement;
	let shouldTruncate = $state(false);
	let maxHeight = 120; // Hauteur maximale en pixels avant troncature

	// Vérifier si la description doit être tronquée après le rendu
	$effect(() => {
		if (descriptionEl && descriptionEl.scrollHeight > maxHeight) {
			shouldTruncate = true;
		} else {
			shouldTruncate = false;
		}
	});

	// Formater la date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(date);
	}
</script>

<div class="card bg-base-200 shadow-xl transition-all duration-300 hover:shadow-2xl">
	{#if event.image && event.image.length > 0}
		<figure class="relative h-48">
			<img src={event.image[0]} alt={event.event_title} class="h-full w-full object-cover" />
			{#if event.canceled}
				<div class="bg-error bg-opacity-70 absolute inset-0 flex items-center justify-center">
					<span class="text-error-content text-xl font-bold">ANNULÉ</span>
				</div>
			{/if}
		</figure>
	{:else}
		<div class="bg-primary bg-opacity-20 flex h-24 items-center justify-center">
			<Calendar size={32} class="text-primary opacity-50" />
		</div>
	{/if}

	<div class="card-body">
		<h2 class="card-title text-lg font-bold sm:text-xl">{event.event_title}</h2>

		<div class="my-2 flex flex-col gap-2">
			<!-- Date -->
			<div class="flex items-center gap-2">
				<Calendar size={18} class="text-primary" />
				<span>{formatDate(event.date_event)}</span>
			</div>

			<!-- Horaires -->
			<div class="flex items-center gap-2">
				<Clock size={18} class="text-primary" />
				<div class="flex flex-col sm:flex-row sm:gap-4">
					<span>
						<span class="opacity-70">Ouverture :</span>
						{event.start_public}
					</span>
					<span>
						<span class="opacity-70">Début :</span>
						{event.start_event}
					</span>
				</div>
			</div>

			<!-- Prix -->
			{#if event.is_prix_libre || event.prix}
				<div class="flex items-center gap-2">
					<Euro size={18} class="text-primary" />
					<span>{event.is_prix_libre ? 'Prix libre' : `${event.prix} €`}</span>
				</div>
			{/if}

			<!-- Mixité -->
			{#if event.isMixiteChoisie && event.mixite}
				<div class="flex items-center gap-2">
					<Users size={18} class="text-primary" />
					<span>{event.mixite}</span>
				</div>
			{/if}

			<!-- Âge -->
			{#if !event.is_age_no_restriction && event.age_advice}
				<div class="flex items-center gap-2">
					<AlertTriangle size={18} class="text-warning" />
					<span>{event.age_advice}</span>
				</div>
			{/if}
		</div>

		<!-- Description -->
		{#if event.desc_public}
			<div class="relative mt-2">
				<div
					bind:this={descriptionEl}
					class="prose prose-sm max-w-none"
					class:line-clamp-4={shouldTruncate && !isExpanded}
				>
					{@html event.desc_public}
				</div>

				{#if shouldTruncate}
					<div
						class:hidden={isExpanded}
						class="from-base-200 absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t to-transparent"
					></div>
					<button
						class="text-primary mt-2 flex items-center text-sm"
						onclick={() => (isExpanded = !isExpanded)}
					>
						{isExpanded ? 'Voir moins' : 'Lire la suite'}
						<div class:rotate-90={isExpanded}>
							<ChevronRight size={16} class="inline" />
						</div>
					</button>
				{/if}
			</div>
		{/if}

		<div class="card-actions mt-4 justify-end">
			<a href={`/${spaceName}/event/${event.id}`} class="btn btn-primary"> Voir les détails </a>
		</div>
	</div>
</div>

<style lang="postcss">
	.line-clamp-4 {
		display: -webkit-box;
		-webkit-line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

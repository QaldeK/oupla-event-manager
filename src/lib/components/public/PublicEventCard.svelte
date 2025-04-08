<script lang="ts">
	import { Clock, Calendar, Euro, Users, AlertTriangle, ChevronRight } from 'lucide-svelte';
	import type { PublicEventInfo, PublicSiteThemeOptions } from '$lib/shared/publicStore.svelte'; // Assurez-vous que ce chemin est correct

	interface Props {
		event: PublicEventInfo;
		spaceName: string;
		cardOptions: PublicSiteThemeOptions['eventCard'];
		eventImageUrl: string | null;
	}
	let { event, spaceName, cardOptions, eventImageUrl }: Props = $props();

	let imagePosition = $derived(cardOptions.imagePosition);
	let cardWidthClass = $derived(cardOptions.widthClass);
	let truncateLines = $derived(cardOptions.truncateLines);

	let fromColor = $derived(`from-${cardOptions.bgColor} `);

	// --- États pour la troncature de la description ---
	let isExpanded = $state(false);
	let descriptionEl: HTMLElement | undefined = $state(undefined);
	let shouldTruncate = $state(false);

	let maxHeight = $derived(truncateLines * 16); // Approximation: 16px par ligne (ajustez si nécessaire)

	// --- Effets ---
	// 👉 $effect pour recalculer la troncature quand descriptionEl ou truncateLines change
	$effect(() => {
		if (descriptionEl && descriptionEl.isConnected && descriptionEl.scrollHeight > maxHeight) {
			shouldTruncate = true;
		} else {
			shouldTruncate = false;
		}
		// Recalcul quand descriptionEl ou le nombre de lignes changent
		// $inspect(descriptionEl);
		// $inspect(truncateLines);
	});

	// --- Fonctions Utilitaires ---
	// Formater la date complète
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return new Intl.DateTimeFormat('fr-FR', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			}).format(date);
		} catch (e) {
			console.error('Erreur de formatage de date:', dateString, e);
			return 'Date invalide';
		}
	}

	// Formater l'heure
	function formatTime(timeString: string | null | undefined): string {
		if (!timeString) return '';
		// Crée une date bidon juste pour extraire l'heure avec Intl
		try {
			const [hours, minutes] = timeString.split(':');
			const date = new Date();
			date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
			return new Intl.DateTimeFormat('fr-FR', {
				hour: 'numeric',
				minute: 'numeric',
				hour12: false // Utilise le format 24h
			}).format(date);
		} catch (e) {
			console.error("Erreur de formatage d'heure:", timeString, e);
			return 'Heure invalide';
		}
	}
</script>

<!-- Base de la carte avec largeur réactive et classes flex conditionnelles -->
<div
	class="card round transition-all duration-300 {cardOptions.bgClass} {cardOptions.shadowClass} {cardOptions.roundedClass} {cardWidthClass}"
	class:lg:flex-row={imagePosition === 'left'}
	class:flex-col={imagePosition === 'top'}
>
	<!-- Section Image (position réactive) -->
	{#if eventImageUrl}
		<figure
			class="relative {imagePosition === 'left' ? 'lg:w-1/3' : ''}"
			class:w-full={imagePosition === 'left'}
			class:h-48={imagePosition === 'top'}
			class:lg:h-auto={imagePosition === 'left'}
			class:shrink-0={imagePosition === 'left'}
		>
			<img
				src={eventImageUrl}
				alt={event.event_title}
				class="h-full w-full object-cover"
				class:lg:rounded-l-2xl={imagePosition === 'left' &&
					cardOptions.roundedClass !== 'rounded-none'}
				class:lg:rounded-tr-none={imagePosition === 'left'}
				class:rounded-t-2xl={imagePosition === 'top' && cardOptions.roundedClass !== 'rounded-none'}
			/>
			{#if event.canceled}
				<div class="bg-error bg-opacity-70 absolute inset-0 flex items-center justify-center">
					<span class="text-error-content text-fluid-lg font-bold">ANNULÉ</span>
				</div>
			{/if}
		</figure>
	{/if}
	<!-- /Section Image -->

	<!-- Contenu de la carte (largeur réactive) -->
	<div class="card-body {imagePosition === 'left' ? 'grow lg:w-2/3' : ''} flex flex-col">
		<!-- 👉 Titre -->
		<div class="mb-2 flex flex-wrap justify-between">
			<div class="flex flex-col gap-2">
				<div class="{cardOptions.titleSizeClass || 'text-fluid-2xl'} font-semibold">
					{event.event_title}
				</div>
				<div class="flex flex-wrap gap-x-4 gap-y-2">
					{#each event.categories as category (category)}
						<div
							class="text-base-content/90 {cardOptions.categorySizeClass ||
								'text-fluid-lg'} font-bold"
						>
							{category}
						</div>
					{/each}
				</div>
			</div>
			<!-- 👉 Section Date et Heure d'ouverture  -->
			<div class="text-base-content/80 flex flex-col text-right font-semibold">
				<span class={cardOptions.dateSizeClass || 'text-fluid-lg'}
					>{formatDate(event.date_event)}</span
				>
				{#if event.start_public}
					<span class={cardOptions.timeSizeClass || 'text-fluid-base'}
						>à partir de {formatTime(event.start_public)}</span
					>
				{/if}
			</div>
		</div>

		<!-- Section Informations détaillées -->
		<div class="  my-3 flex flex-wrap gap-x-4 gap-y-2">
			<!-- Horaires Début Événement -->
			{#if event.start_event}
				<div
					class="badge {cardOptions.badgeSize ||
						'badge-lg'} badge-info badge-outline flex items-center gap-2"
				>
					<Clock size={18} />
					<span><span>Début :</span> {formatTime(event.start_event)}</span>
				</div>
			{/if}

			<!-- Prix -->
			{#if event.is_prix_libre || event.prix}
				<div
					class="badge {cardOptions.badgeSize ||
						'badge-lg'} badge-info badge-outline flex items-center gap-2"
				>
					<Euro size={18} />
					<span>{event.is_prix_libre ? 'Prix libre' : `${event.prix}`}</span>
				</div>
			{/if}

			<!-- Mixité -->
			{#if event.isMixiteChoisie && event.mixite}
				<div
					class="badge {cardOptions.badgeSize ||
						'badge-lg'} badge-error badge-outline flex items-center gap-2"
				>
					<Users size={18} />
					<span>{event.mixite}</span>
				</div>
			{/if}

			<!-- Âge -->
			{#if !event.is_age_no_restriction && event.age_advice}
				<div
					class="badge {cardOptions.badgeSize ||
						'badge-lg'} badge-error badge-outline flex items-center gap-2"
				>
					<AlertTriangle size={18} />
					<span>à partir de {event.age_advice} ans</span>
				</div>
			{/if}
		</div>
		<!-- /Section Informations détaillées -->

		<!-- Description avec troncature réactive -->
		{#if event.desc_public}
			<div class="relative mt-2 flex-grow">
				<div
					bind:this={descriptionEl}
					class="prose prose-sm text-fluid-base max-w-none"
					class:overflow-hidden={shouldTruncate && !isExpanded}
					class:relative={shouldTruncate && !isExpanded}
					style:max-height={isExpanded ? 'none' : `${maxHeight}px`}
					style:-webkit-line-clamp={isExpanded ? 'unset' : truncateLines}
					class:line-clamp-dynamic={shouldTruncate && !isExpanded}
				>
					{@html event.desc_public}

					{#if shouldTruncate && !isExpanded}
						<!-- FIXIT : fromColor undefined -->
						<div
							class="from-base-200 pointer-events-none absolute right-0 bottom-0 left-0 h-24 bg-gradient-to-t to-transparent"
							style="--tw-gradient-from: var(--{cardOptions.bgClass?.replace('bg-', '') ||
								'base-200'})"
						></div>
					{/if}
				</div>

				{#if shouldTruncate}
					<!-- Bouton Lire la suite / Voir moins (maintenant après le div texte) -->
					<div class="text-right">
						<button
							class="btn btn-ghost btn-sm text-primary mt-1 py-0 hover:bg-transparent"
							onclick={() => (isExpanded = !isExpanded)}
						>
							{isExpanded ? 'Voir moins' : 'Lire la suite'}
							<ChevronRight
								size={14}
								class="transform transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}"
							/>
						</button>
					</div>
				{:else}
					<!-- {/* Pour pousser les actions en bas si pas de description */} -->
					<div class="flex-grow"></div>
				{/if}
			</div>
		{/if}
		<!-- /Description -->

		<!-- Actions de la carte -->
		<!-- <div class="card-actions mt-4 justify-end">
			<a href={`/${spaceName}/event/${event.id}`} class="btn btn-primary btn-sm text-fluid-sm">
				Voir les détails
			</a>
		</div> -->
		<!-- /Actions -->
	</div>
	<!-- /Contenu de la carte -->
</div>

<style lang="postcss">
	/* Styles pour appliquer la troncature dynamiquement via -webkit-line-clamp */
	.line-clamp-dynamic {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		overflow: hidden;
		/* -webkit-line-clamp est défini via l'attribut style */
	}

	/* Assurer que l'image couvre bien dans la disposition 'left' */
	.card.lg\:flex-row figure.lg\:w-1\/3 img {
		height: 100%;
		object-position: center;
	}
</style>

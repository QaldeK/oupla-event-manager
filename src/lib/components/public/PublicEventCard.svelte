<script lang="ts">
	import { Clock, Calendar, Euro, Users, AlertTriangle, ChevronRight } from 'lucide-svelte';
	import type { PublicEventInfo } from '$lib/shared/publicStore.svelte'; // Assurez-vous que ce chemin est correct

	// 👉 Définition des Props avec $props
	interface Props {
		event: PublicEventInfo;
		spaceName: string;
		// Props optionnelles pour contrôler le layout depuis le parent si nécessaire un jour
		initialImagePosition?: 'left' | 'top';
		initialCardWidthClass?: string;
		initialTruncateLines?: number;
	}
	let {
		event,
		spaceName,
		initialImagePosition = 'left', // Valeur par défaut 'left'
		initialCardWidthClass = 'w-full', // Valeur par défaut 'w-full'
		initialTruncateLines = 4 // Valeur par défaut 4 lignes
	} = $props<Props>();

	// --- États Réactifs pour le Layout ---
	// 👉 $state pour la position de l'image ('left' ou 'top')
	let imagePosition = $state<'left' | 'top'>(initialImagePosition);
	// 👉 $state pour les classes de largeur de la carte
	let cardWidthClass = $state<string>(initialCardWidthClass);
	// 👉 $state pour le nombre de lignes avant troncature
	let truncateLines = $state<number>(initialTruncateLines);

	// --- États pour la troncature de la description ---
	let isExpanded = $state(false);
	let descriptionEl: HTMLElement | undefined = $state(undefined); // Initialiser à undefined
	let shouldTruncate = $state(false);
	let maxHeight = $derived(truncateLines * 24); // Approximation: 24px par ligne (ajustez si nécessaire)

	// --- Effets ---
	// 👉 $effect pour recalculer la troncature quand descriptionEl ou truncateLines change
	$effect(() => {
		if (descriptionEl && descriptionEl.scrollHeight > maxHeight) {
			shouldTruncate = true;
		} else {
			shouldTruncate = false;
		}
		// Recalcul quand descriptionEl ou le nombre de lignes changent
		$inspect(descriptionEl);
		$inspect(truncateLines);
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

	// 👉 Classe CSS calculée pour la troncature dynamique
	let truncateClass = $derived(`line-clamp-${truncateLines}`);
</script>

<!-- Base de la carte avec largeur réactive et classes flex conditionnelles -->
<div
	class="card bg-base-200 shadow-xl transition-all duration-300 hover:shadow-2xl {cardWidthClass}"
	class:lg:flex-row={imagePosition === 'left'}
	class:flex-col={imagePosition === 'top'}
>
	<!-- Section Image (position réactive) -->
	{#if event.image && event.image.length > 0}
		<figure
			class="relative {imagePosition === 'left' ? 'lg:w-1/3' : ''}"
			class:w-full={imagePosition === 'left'}
			class:h-48={imagePosition === 'top'}
			class:lg:h-auto={imagePosition === 'left'}
			class:shrink-0={imagePosition === 'left'}
		>
			<img
				src={event.image[0]}
				alt={event.event_title}
				class="h-full w-full object-cover"
				class:lg:rounded-l-2xl={imagePosition === 'left'}
				class:lg:rounded-tr-none={imagePosition === 'left'}
				class:rounded-t-2xl={imagePosition === 'top'}
			/>
			{#if event.canceled}
				<div class="bg-error bg-opacity-70 absolute inset-0 flex items-center justify-center">
					<span class="text-error-content text-fluid-lg font-bold">ANNULÉ</span>
				</div>
			{/if}
		</figure>
	{:else if imagePosition === 'top'}
		<!-- Placeholder pour image en haut -->
		<div class="bg-primary bg-opacity-10 flex h-24 items-center justify-center rounded-t-2xl">
			<Calendar size={32} class="text-primary opacity-30" />
		</div>
	{/if}
	<!-- /Section Image -->

	<!-- Contenu de la carte (largeur réactive) -->
	<div class="card-body {imagePosition === 'left' ? 'grow lg:w-2/3' : ''} ">
		<!-- 👉 Section Date et Heure d'ouverture (déplacée et stylisée) -->
		<div class="text-fluid-sm text-base-content/80 mb-2 text-right">
			<span>{formatDate(event.date_event)}</span>
			{#if event.start_public}
				<span class="ml-2"> | Ouverture: {formatTime(event.start_public)}</span>
			{/if}
		</div>

		<!-- 👉 Titre avec taille fluide -->
		<h2 class="card-title text-fluid-lg font-bold">{event.event_title}</h2>

		<!-- Section Informations détaillées -->
		<div class="text-fluid-base my-3 flex flex-col gap-2">
			<!-- Horaires Début Événement -->
			{#if event.start_event}
				<div class="flex items-center gap-2">
					<Clock size={18} class="text-primary" />
					<span><span class="opacity-70">Début :</span> {formatTime(event.start_event)}</span>
				</div>
			{/if}

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
				</div>

				{#if shouldTruncate}
					<!-- Gradient pour indiquer la troncature -->
					<div
						class:hidden={isExpanded}
						class="from-base-200 pointer-events-none absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t to-transparent"
					></div>
					<!-- Bouton Lire la suite / Voir moins -->
					<button
						class="text-primary hover:text-primary-focus text-fluid-sm mt-2 flex items-center font-medium"
						onclick={() => (isExpanded = !isExpanded)}
					>
						{isExpanded ? 'Voir moins' : 'Lire la suite'}
						<div class:rotate-180={isExpanded} class="transition-transform duration-200">
							<ChevronRight size={16} class="ml-1 inline" />
						</div>
					</button>
				{/if}
			</div>
		{/if}
		<!-- /Description -->

		<!-- Actions de la carte -->
		<div class="card-actions mt-4 justify-end">
			<a href={`/${spaceName}/event/${event.id}`} class="btn btn-primary btn-sm text-fluid-sm">
				Voir les détails
			</a>
		</div>
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

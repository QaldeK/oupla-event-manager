<script lang="ts">
	//  FIXIT : clean wrap text description

	import { Clock, Euro, Users, AlertTriangle, ChevronRight } from "lucide-svelte";
	import type { PublicEventInfo } from "$lib/shared/publicStore.svelte";
	import type { PublicSiteThemeOptions } from "$lib/types/theme.d";

	interface Props {
		event: PublicEventInfo;
		cardOptions: PublicSiteThemeOptions["eventCard"];
		eventImageUrl: string | null;
	}
	let { event, cardOptions, eventImageUrl }: Props = $props();

	let imagePosition = $derived(cardOptions.imagePosition);
	let cardWidthClass = $derived(cardOptions.widthClass);
	let truncateSize = $derived(cardOptions.truncateSize);

	// --- États pour la troncature de la description ---
	let isExpanded = $state(false);
	let descriptionEl: HTMLElement | undefined = $state(undefined);

	let hasOverflow = $derived(
		descriptionEl && descriptionEl.scrollHeight > descriptionEl.clientHeight
	);

	// --- Effets ---

	// --- Fonctions Utilitaires ---
	// Formater la date complète
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return new Intl.DateTimeFormat("fr-FR", {
				weekday: "long",
				day: "numeric",
				month: "long"
			}).format(date);
		} catch (e) {
			console.error("Erreur de formatage de date:", dateString, e);
			return "Date invalide";
		}
	}

	// Formater l'heure
	function formatTime(timeString: string | null | undefined): string {
		if (!timeString) return "";
		// Crée une date bidon juste pour extraire l'heure avec Intl
		try {
			const [hours, minutes] = timeString.split(":");
			const date = new Date();
			date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
			return new Intl.DateTimeFormat("fr-FR", {
				hour: "numeric",
				minute: "numeric",
				hour12: false // Utilise le format 24h
			}).format(date);
		} catch (e) {
			console.error("Erreur de formatage d'heure:", timeString, e);
			return "Heure invalide";
		}
	}
</script>

<!-- Base de la carte avec largeur réactive et classes flex conditionnelles -->
<div
	class={[
		"card",
		"round",
		"transition-all",
		"duration-300",
		"flex",
		cardOptions.bgClass,
		cardOptions.shadowClass,
		cardOptions.roundedClass,
		cardWidthClass,
		imagePosition === "left" && ["lg:flex-row", "w-full", "lg:h-auto", "shrink-0"],
		imagePosition === "top" && ["flex-col", "h-48"]
	]}
>
	<!-- Section Image (position réactive) -->
	{#if eventImageUrl}
		<figure
			class={[
				"relative",
				imagePosition === "left" && ["lg:w-1/3", "w-full", "lg:h-auto", "shrink-0"],
				imagePosition === "top" && "h-48"
			]}
		>
			<img
				src={eventImageUrl}
				alt={event.event_title}
				class={[
					"h-full",
					"w-full",
					"object-cover",
					imagePosition === "left" &&
						cardOptions.roundedClass !== "rounded-none" && [
							"lg:rounded-l-2xl",
							"lg:rounded-tr-none"
						],
					imagePosition === "top" && cardOptions.roundedClass !== "rounded-none" && "rounded-t-2xl"
				]}
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
	<div
		class={[
			"card-body @container flex flex-col @md:px-12 @md:py-10",
			imagePosition === "left" && ["grow", "lg:w-2/3"],
			hasOverflow && "pb-4"
		]}
	>
		<!-- Titre et date -->
		<div class="mb-2 gap-6 space-y-6 @max-md:text-center @md:flex @md:justify-between">
			<!-- 👉 Titre et catégorie -->
			<div class="flex flex-col gap-2">
				<div class={[cardOptions.titleSizeClass || "text-fluid-2xl", "font-semibold"]}>
					{event.event_title}
				</div>
				<div class="flex flex-wrap gap-x-4 gap-y-2 @max-md:justify-center">
					{#each event.categories as category (category)}
						<div
							class={[
								"text-base-content/90 ",
								cardOptions.categorySizeClass || "text-fluid-lg",
								"font-bold"
							]}
						>
							{category}
						</div>
					{/each}
				</div>
			</div>
			<!-- 👉 Section Date et Heure d'ouverture  -->
			<div class="text-base-content/80 flex flex-col font-semibold @md:text-right">
				<span class={cardOptions.dateSizeClass || "text-fluid-lg"}
					>{formatDate(event.date_event)}</span
				>
				{#if event.start_public}
					<span class={cardOptions.dateSizeClass || "text-fluid-base"}
						>à partir de {formatTime(event.start_public)}</span
					>
				{/if}
			</div>
		</div>

		<!-- Section Informations détaillées -->
		<div class="my-3 flex flex-wrap gap-x-4 gap-y-2">
			<!-- Horaires Début Événement -->
			{#if event.start_event}
				<div
					class={[
						"badge",
						"badge-lg",
						"badge-info",
						"badge-outline",
						"flex",
						"items-center",
						"gap-2"
					]}
				>
					<Clock size={18} />
					<span><span>Début :</span> {formatTime(event.start_event)}</span>
				</div>
			{/if}

			<!-- Prix -->
			{#if event.is_prix_libre || event.prix}
				<div
					class={[
						"badge",
						"badge-lg",
						"badge-info",
						"badge-outline",
						"flex",
						"items-center",
						"gap-2"
					]}
				>
					<Euro size={18} />
					<span>{event.is_prix_libre ? "Prix libre" : `${event.prix}`}</span>
				</div>
			{/if}

			<!-- Mixité -->
			{#if event.isMixiteChoisie && event.mixite}
				<div
					class={[
						"badge",
						"badge-lg",
						"badge-error",
						"badge-outline",
						"flex",
						"items-center",
						"gap-2"
					]}
				>
					<Users size={18} />
					<span>{event.mixite}</span>
				</div>
			{/if}

			<!-- Âge -->
			{#if !event.is_age_no_restriction && event.age_advice}
				<div
					class={[
						"badge",
						"badge-lg",
						"badge-error",
						"badge-outline",
						"flex",
						"items-center",
						"gap-2"
					]}
				>
					<AlertTriangle size={18} />
					<span>à partir de {event.age_advice} ans</span>
				</div>
			{/if}
		</div>
		<!-- /Section Informations détaillées -->

		<!-- Description avec troncature réactive -->
		{#if event.desc_public}
			<div class="relative mt-2">
				<div
					bind:this={descriptionEl}
					class={[
						"prose",
						"prose-sm",
						"text-fluid-base",
						`max-w-none`,

						!isExpanded && [truncateSize, "relative overflow-hidden"]
					]}
					style:overflow-wrap="break-word"
					style:hyphens="auto"
				>
					<div>{@html event.desc_public}</div>
					{#if !isExpanded && hasOverflow}
						<div
							class="{cardOptions.bgClass} pointer-events-none absolute -right-4 bottom-0 -left-4 h-8 blur-lg"
						></div>
					{/if}
				</div>
			</div>
			<!-- Bouton Lire la suite / Voir moins -->
			{#if hasOverflow}
				<div class="bg-transparent text-right">
					<button
						class="btn btn-ghost btn-sm text-primary mt-1 py-0 hover:bg-transparent"
						onclick={() => (isExpanded = !isExpanded)}
					>
						{isExpanded ? "Voir moins" : "Lire la suite"}
						<ChevronRight
							size={14}
							class="transform transition-transform duration-200 {isExpanded && '-rotate-90'}"
						/>
					</button>
				</div>
			{/if}
		{:else}
			<!-- Pour pousser les actions en bas si pas de description -->
			<div class="flex-grow"></div>
		{/if}
		<!-- /Description -->
	</div>
</div>

<style lang="postcss">
	/* Assurer que l'image couvre bien dans la disposition 'left' */
	.card.lg\:flex-row figure.lg\:w-1\/3 img {
		height: 100%;
		object-position: center;
	}

	/* Contraindre naturellement les éléments prose sans débordement */
	.prose * {
		width: 100% !important;
		word-wrap: break-word;
		overflow-wrap: break-word;
		box-sizing: border-box;
	}
</style>

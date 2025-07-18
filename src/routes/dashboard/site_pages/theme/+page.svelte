<script lang="ts">
	import { goto } from "$app/navigation";
	import { pb } from "$lib/pocketbase.svelte";
	import { showAlert } from "$lib/shared/states.svelte";
	import { ArrowLeft, Eye, Moon, Palette, Sun } from "lucide-svelte";
	import { fade, slide } from "svelte/transition";
	import ColorSelect from "$lib/components/ColorSelect.svelte";
	import ModalX from "$lib/components/ModalX.svelte";
	import OptionSlider from "$lib/components/OptionSlider.svelte";
	import PublicEventCard from "$lib/components/public/PublicEventCard.svelte";

	import type { PublicEventInfo } from "$lib/shared/publicStore.svelte";
	import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";

	import Frame from "$lib/components/Frame.svelte";
	import { isMobile } from "$lib/utils";
	import "/src/daisy.css";

	import type { PageProps } from "./$types";
	let { data }: PageProps = $props();

	let is_mobile = $derived(isMobile.current);
	let isLoading = $state(false);

	// On clone le thème pour permettre l'édition sans affecter la source layout
	let theme = $state<PublicSiteThemeOptions>(JSON.parse(JSON.stringify(data.theme)));
	let initialTheme = $state<PublicSiteThemeOptions | null>(JSON.parse(JSON.stringify(data.theme)));
	let themeModalOpen = $state(false);
	let previewMode = $state<"light" | "dark">("light");

	let haveUnsavedChanges = $derived(
		initialTheme ? JSON.stringify(theme) !== JSON.stringify(initialTheme) : false
	);

	let optionsRecordId = $state<string | null>(data.optionsRecordId ?? null);
	let spaceId = $state<string | null>(data.spaceId ?? null);

	const daisyThemes = {
		light: [
			"light",
			"cupcake",
			"bumblebee",
			"emerald",
			"corporate",
			"fantasy",
			"wireframe",
			"cmyk",
			"autumn",
			"acid",
			"lemonade",
			"winter",
			"garden",
			"lofi",
			"pastel",
			"retro",
			"cyberpunk",
			"valentine",
			"nord"
		],
		dark: [
			"dark",
			"synthwave",
			"business",
			"halloween",
			"forest",
			"aqua",
			"black",
			"luxury",
			"dracula",
			"night",
			"coffee",
			"dim",
			"sunset"
		]
	};

	// Structure fusionnée : chaque fond a sa couleur de texte adaptée (pour accessibilité)
	const backgroundOptions = [
		// DaisyUI
		{
			value: "bg-base-100",
			label: "Fond principal",
			previewColor: "#f3f4f6",
			textClass: "text-base-content"
		},
		{
			value: "bg-base-200",
			label: "Fond secondaire",
			previewColor: "#e5e7eb",
			textClass: "text-base-content"
		},
		{
			value: "bg-base-300",
			label: "Fond tertiaire",
			previewColor: "#d1d5db",
			textClass: "text-base-content"
		},
		{ value: "bg-neutral", label: "Neutre", previewColor: "#3d4451", textClass: "text-white" },
		{
			value: "bg-primary",
			label: "Primaire",
			previewColor: "#570df8",
			textClass: "text-primary-content"
		},
		{
			value: "bg-secondary",
			label: "Secondaire",
			previewColor: "#f000b8",
			textClass: "text-secondary-content"
		},
		{
			value: "bg-primary/5",
			label: "Primaire (5%)",
			previewColor: "#570df80d",
			textClass: "text-base-content"
		},
		{
			value: "bg-primary/10",
			label: "Primaire (10%)",
			previewColor: "#570df81a",
			textClass: "text-base-content"
		},
		{
			value: "bg-secondary/10",
			label: "Secondaire (10%)",
			previewColor: "#f000b81a",
			textClass: "text-base-content"
		},
		{
			value: "bg-transparent",
			label: "Transparent",
			previewColor: "transparent",
			textClass: "text-base-content"
		},
		{ value: "bg-white", label: "Blanc", previewColor: "#fff", textClass: "text-black" },
		{
			value: "bg-base-300/50",
			label: "Fond léger",
			previewColor: "#d1d5db80",
			textClass: "text-base-content"
		},
		// Sélection harmonieuse Tailwind
		{ value: "bg-sky-500", label: "Bleu ciel", previewColor: "#0ea5e9", textClass: "text-white" },
		{
			value: "bg-emerald-500",
			label: "Vert émeraude",
			previewColor: "#10b981",
			textClass: "text-white"
		},
		{ value: "bg-rose-500", label: "Rose", previewColor: "#f43f5e", textClass: "text-white" },
		{
			value: "bg-amber-400",
			label: "Jaune ambré",
			previewColor: "#fbbf24",
			textClass: "text-black"
		},
		{
			value: "bg-slate-700",
			label: "Gris ardoise",
			previewColor: "#334155",
			textClass: "text-white"
		},
		{ value: "bg-indigo-600", label: "Indigo", previewColor: "#4f46e5", textClass: "text-white" },
		{
			value: "bg-lime-400",
			label: "Vert citron",
			previewColor: "#a3e635",
			textClass: "text-black"
		},
		{ value: "bg-orange-500", label: "Orange", previewColor: "#f97316", textClass: "text-white" }
	];

	const fluidTextSizes = [
		{ value: "text-fluid-xs", label: "Très petit (XS)" },
		{ value: "text-fluid-sm", label: "Petit (SM)" },
		{ value: "text-fluid-base", label: "Base" },
		{ value: "text-fluid-lg", label: "Grand (LG)" },
		{ value: "text-fluid-xl", label: "Très grand (XL)" },
		{ value: "text-fluid-2xl", label: "Énorme (2XL)" },
		{ value: "text-fluid-3xl", label: "Gigantesque (3XL)" }
	];

	const truncateOptions = [
		{ value: "h-full", label: "Pas de troncature" },
		{ value: "h-full max-h-20", label: "Très petit" },
		{ value: "h-full max-h-32", label: "Petit" },
		{ value: "h-full max-h-48", label: "Moyen" },
		{ value: "h-full max-h-64", label: "Grand" },
		{ value: "h-full max-h-92", label: "XXL" },
		{ value: "h-full max-h-128", label: "XXXL" }
	];

	const widthOptions = [
		{ value: "w-full max-w-sm", label: "Petite" },
		{ value: "w-full max-w-md", label: "Moyenne" },
		{ value: "w-full max-w-lg", label: "Moyenne + " },
		{ value: "w-full max-w-xl", label: "Grande" },
		{ value: "w-full max-w-2xl", label: "XL" },
		{ value: "w-full max-w-4xl", label: "2XL" },
		{ value: "w-full max-w-5xl", label: "4XL" },
		{ value: "w-full", label: "Pleine largeur" }
	];

	const roundedOptions = [
		{ value: "rounded-none", label: "Aucun" },
		{ value: "rounded-sm", label: "Petit" },
		{ value: "rounded-md", label: "Moyen" },
		{ value: "rounded-lg", label: "Grand" },
		{ value: "rounded-xl", label: "Très grand" },
		{ value: "rounded-2xl", label: "Énorme" }
	];

	const shadowOptions = [
		{ value: "shadow-none", label: "Aucune" },
		{ value: "shadow-sm", label: "Légère" },
		{ value: "shadow", label: "Normale" },
		{ value: "shadow-md", label: "Moyenne" },
		{ value: "shadow-lg", label: "Grande" },
		{ value: "shadow-xl", label: "Très grande" },
		{ value: "shadow-2xl", label: "Énorme" }
	];

	// Exemple de donnée pour la carte événement
	const sampleEvent: PublicEventInfo = {
		id: "example-id",
		event_title: "Soirée découverte - Exemple de carte",
		desc_public: `<p>Ceci est un exemple de description d'événement qui peut être formaté en HTML.
		              C'est une prévisualisation pour montrer comment votre thème s'appliquera aux cartes d'événements.</p>
		              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin euismod,
		              nunc eget ultricies tincidunt, nunc nunc tincidunt metus, vitae faucibus velit nunc ac risus.</p>
									<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin euismod,
		              nunc eget ultricies tincidunt, nunc nunc tincidunt metus, vitae faucibus velit nunc ac risus.</p>
									<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin euismod,
		              nunc eget ultricies tincidunt, nunc nunc tincidunt metus, vitae faucibus velit nunc ac risus.</p>
									<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin euismod,
		              nunc eget ultricies tincidunt, nunc nunc tincidunt metus, vitae faucibus velit nunc ac risus.</p>
									<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin euismod,
		              nunc eget ultricies tincidunt, nunc nunc tincidunt metus, vitae faucibus velit nunc ac risus.</p>`,
		date_event: new Date().toISOString(),
		time_start: "18:30",
		time_end: "22:00",
		start_event: "19:30",
		start_public: "19:00",
		prix: "5€",
		is_prix_libre: false,
		isMixiteChoisie: false,
		mixite: null,
		is_age_no_restriction: true,
		age_advice: null,
		canceled: false,
		categories: ["Atelier", "Culture"],
		isRecurrent: false,
		isMasterRecurrent: false,
		masterRecurrentId: null,
		image: null,
		duree: null,
		dateEnd: null,
		dateStart: null
	};

	// Suppression de la logique de chargement redondante (tout est dans le layout)

	async function saveTheme() {
		if (!spaceId) return;

		try {
			const dataToSave = {
				publicSiteTheme: theme,
				space: spaceId
			};

			let savedRecord;
			if (optionsRecordId) {
				savedRecord = await pb.collection("spaces_options").update(optionsRecordId, dataToSave);
			} else {
				savedRecord = await pb.collection("spaces_options").create(dataToSave);
				optionsRecordId = savedRecord.id;
			}
			initialTheme = JSON.parse(JSON.stringify(theme));
			showAlert("Thème sauvegardé avec succès !", "success");
		} catch (e: unknown) {
			console.error("Erreur lors de la sauvegarde du thème:", e);
			showAlert(
				`Erreur sauvegarde: ${typeof e === "object" && e !== null && "message" in e && e.message}`,
				"error"
			);
		}
	}

	function getCurrentTheme() {
		return previewMode === "light" ? theme.daisyThemeLight : theme.daisyThemeDark;
	}

	function navigateBack() {
		goto("/dashboard/site_pages");
	}
</script>

{#if !isLoading}
	{#snippet daisy_theme(daisy_theme: string, themeCategory: "light" | "dark")}
		{@const isCurrentThemeForCategory =
			themeCategory === "light"
				? theme.daisyThemeLight === daisy_theme
				: theme.daisyThemeDark === daisy_theme}
		{@const isSelectedCategory = theme.defaultMode === themeCategory}
		{@const isActiveTheme = isCurrentThemeForCategory && isSelectedCategory}

		<div
			class="border-base-content/20 hover:border-base-content/40 overflow-hidden rounded-lg border outline-2 outline-offset-2 outline-transparent
            {isCurrentThemeForCategory ? 'ring-4 ring-sky-500 ring-offset-2' : ''}
            {isActiveTheme ? 'ring-4 ring-sky-500 ring-offset-2' : ''}"
			data-act-class="outline-base-content!"
			data-set-theme={daisy_theme}
		>
			<button
				class="bg-base-100 text-base-content w-full cursor-pointer font-sans"
				data-theme={daisy_theme}
				onclick={() => {
					if (themeCategory === "light") {
						theme.daisyThemeLight = daisy_theme;
						if (theme.defaultMode === "light") {
							theme.daisyTheme = daisy_theme;
						}
					} else {
						theme.daisyThemeDark = daisy_theme;
						if (theme.defaultMode === "dark") {
							theme.daisyTheme = daisy_theme;
						}
					}
				}}
				type="button"
			>
				<div class="grid grid-cols-5 grid-rows-3">
					<div class="bg-base-200 col-start-1 row-span-2 row-start-1"></div>
					<div class="bg-base-300 col-start-1 row-start-3"></div>
					<div
						class="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2"
					>
						<div class="flex items-center gap-1 font-bold">
							{#if themeCategory === "light"}
								<Sun class="h-3 w-3" />
							{:else}
								<Moon class="h-3 w-3" />
							{/if}
							{daisy_theme}
						</div>
						<div class="flex flex-wrap gap-1">
							<div
								class="bg-primary flex aspect-square w-5 items-center justify-center rounded lg:w-6"
							>
								<div class="text-primary-content text-sm font-bold">A</div>
							</div>
							<div
								class="bg-secondary flex aspect-square w-5 items-center justify-center rounded lg:w-6"
							>
								<div class="text-secondary-content text-sm font-bold">A</div>
							</div>
							<div
								class="bg-accent flex aspect-square w-5 items-center justify-center rounded lg:w-6"
							>
								<div class="text-accent-content text-sm font-bold">A</div>
							</div>
							<div
								class="bg-neutral flex aspect-square w-5 items-center justify-center rounded lg:w-6"
							>
								<div class="text-neutral-content text-sm font-bold">A</div>
							</div>
						</div>
					</div>
				</div>
			</button>
		</div>
	{/snippet}

	<div transition:fade>
		<!-- Header avec navigation -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<button class="btn btn-ghost btn-sm" onclick={navigateBack}>
				<ArrowLeft size={16} />
			</button>
			<div class="flex items-center gap-3">
				<div class="bg-secondary/10 rounded-lg p-2">
					<Palette class="text-secondary h-5 w-5" />
				</div>
				<h1 class="text-2xl font-bold">Configuration du thème</h1>
			</div>
		</div>

		<div class="mb-8">
			<p class="text-base-content/70 text-lg">
				Personnalisez l'apparence de votre site public en choisissant les thèmes, couleurs et styles
				qui correspondent à votre identité visuelle.
			</p>
		</div>

		<!-- Section de configuration du thème général -->
		<Frame title="Thème général du site">
			<div class="mb-6 flex flex-wrap items-center justify-between">
				<!-- Bouton pour basculer entre aperçu light/dark -->
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">Aperçu:</span>
					<div class="join rounded-md border">
						<button
							class="join-item btn btn-sm {previewMode === 'light' ? 'btn-active' : ''}"
							onclick={() => (previewMode = "light")}
						>
							<Sun size={16} />
							Clair
						</button>
						<button
							class="join-item btn btn-sm {previewMode === 'dark' ? 'btn-active' : ''}"
							onclick={() => (previewMode = "dark")}
						>
							<Moon size={16} />
							Sombre
						</button>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<!-- Sélection des thèmes -->
				<div class="card bg-base-100 shadow-md">
					<div class="card-body">
						<h3 class="card-title mb-4 text-lg">Thèmes disponibles</h3>

						<!-- Thème clair actuel -->
						<div class="mb-4">
							<div class="mb-2 flex items-center text-sm font-medium">
								<Sun size={16} class="mr-2" />
								Thème clair: {theme.daisyThemeLight}
							</div>
							{@render daisy_theme(theme.daisyThemeLight, "light")}
						</div>

						<!-- Thème sombre actuel -->
						<div class="mb-4">
							<div class="mb-2 flex items-center text-sm font-medium">
								<Moon size={16} class="mr-2" />
								Thème sombre: {theme.daisyThemeDark}
							</div>
							{@render daisy_theme(theme.daisyThemeDark, "dark")}
						</div>

						<div class="card-actions justify-end">
							<button class="btn btn-primary" onclick={() => (themeModalOpen = true)}>
								<Palette size={16} />
								Changer les thèmes
							</button>
						</div>
					</div>
				</div>

				<!-- Configuration -->
				<div class="card bg-base-100 shadow-md">
					<div class="card-body">
						<h3 class="card-title mb-4 text-lg">Configuration</h3>

						<!-- Mode par défaut -->
						<div class="form-control mb-6">
							<label class="">
								<div class="label-text mb-1 font-medium">Mode par défaut</div>
								<div class="flex gap-4">
									<label class="label cursor-pointer gap-2">
										<input
											type="radio"
											name="defaultMode"
											class="radio radio-primary"
											value="light"
											checked={theme.defaultMode === "light"}
											onclick={() => (theme.defaultMode = "light")}
										/>
										<span class="label-text flex items-center gap-1">
											<Sun size={16} /> Clair
										</span>
									</label>
									<label class="label cursor-pointer gap-2">
										<input
											type="radio"
											name="defaultMode"
											class="radio radio-primary"
											value="dark"
											checked={theme.defaultMode === "dark"}
											onclick={() => (theme.defaultMode = "dark")}
										/>
										<span class="label-text flex items-center gap-1">
											<Moon size={16} /> Sombre
										</span>
									</label>
								</div>
							</label>
						</div>

						<!-- Fond principal -->
						<div class="form-control">
							<ColorSelect
								id="main-bg-class"
								options={backgroundOptions}
								label="Couleur de fond générale"
								bind:value={theme.layoutSections.mainBackgroundClass}
								daisyTheme={getCurrentTheme()}
							/>
						</div>
					</div>
				</div>
			</div>
		</Frame>

		<!-- Section Configuration de carte d'événement -->
		<Frame title="Style des cartes événement">
			<div class="mb-8 grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
				<!-- Position Image -->
				<div class="form-control w-full">
					<label class="" for="image-pos">
						<span class="label-text mb-1 font-medium">Position de l'image</span>
					</label>
					<div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
						<label class="label cursor-pointer gap-2">
							<input
								id="image-pos"
								type="radio"
								name="imagePosition"
								class="radio radio-primary"
								value="left"
								bind:group={theme.eventCard.imagePosition}
							/>
							<span class="label-text">Image à Gauche</span>
						</label>
						<label class="label cursor-pointer gap-2">
							<input
								type="radio"
								name="imagePosition"
								class="radio radio-primary"
								value="top"
								bind:group={theme.eventCard.imagePosition}
							/>
							<span class="label-text">Image en Haut</span>
						</label>
					</div>
					<span class="label text-sm text-wrap"
						>Sera toujours en haut pour les cartes peu large ou petits écrans</span
					>
				</div>

				<!-- Couleur de fond -->
				<div>
					<ColorSelect
						id="bg-color"
						bind:value={theme.eventCard.bgClass}
						options={backgroundOptions}
						label="Couleur de fond"
						daisyTheme={getCurrentTheme()}
					/>
				</div>

				<!-- Ombre -->
				<!-- Ombre de la carte -->
				<OptionSlider
					id="shadow"
					label="Ombre de la carte"
					options={shadowOptions}
					bind:value={theme.eventCard.shadowClass}
				/>

				<!-- Arrondi -->
				<!-- Coins arrondis -->
				<OptionSlider
					id="rounded"
					label="Coins arrondis"
					options={roundedOptions}
					bind:value={theme.eventCard.roundedClass}
				/>

				<!-- Largeur de la carte -->
				<OptionSlider
					id="card-width"
					label="Largeur de la carte"
					options={widthOptions}
					bind:value={theme.eventCard.widthClass}
				/>

				<!-- Taille de troncature -->
				<!-- Troncature de la description -->
				<OptionSlider
					id="truncate-size"
					label="Troncature de la description"
					options={truncateOptions}
					bind:value={theme.eventCard.truncateSize}
				/>

				<!-- Taille du titre -->
				<OptionSlider
					id="title-size"
					label="Taille du titre"
					options={fluidTextSizes}
					bind:value={theme.eventCard.titleSizeClass}
				/>

				<!-- Taille de la date -->
				<OptionSlider
					id="date-size"
					label="Taille de la date"
					options={fluidTextSizes}
					bind:value={theme.eventCard.dateSizeClass}
				/>
				<!-- Taille de l'heure -->
				<OptionSlider
					id="hour-size"
					label="Taille de l'heure"
					options={fluidTextSizes}
					bind:value={theme.eventCard.hourSizeClass}
				/>

				<!-- Taille de la catégorie -->
				<OptionSlider
					id="category-size"
					label="Taille de la catégorie"
					options={fluidTextSizes}
					bind:value={theme.eventCard.categorySizeClass}
				/>

				<!-- Ordre date / titre -->
				<div class="flex flex-col gap-2">
					<label class="label-text font-medium" for="date-order">Position de la date</label>
					<label
						for="date-order"
						class="label label-text {!theme.eventCard.dateAtTop && 'opacity-65'}"
					>
						<input
							type="checkbox"
							class="toggle"
							id="date-order"
							bind:checked={theme.eventCard.dateAtTop}
						/>
						Date au-dessus du titre
					</label>
					<label for="date-order" class="label label-text text-xs text-wrap"
						>Ne s'applique que pour les cartes peu large ou petits écrans</label
					>
				</div>
			</div>

			<!-- Aperçu -->
			<div class="divider mt-12">
				<div class="text-fluid-lg flex items-center gap-2 font-semibold">
					<Eye size={20} />
					Aperçu d'une carte événement
				</div>
			</div>

			<div class="{theme.layoutSections.mainBackgroundClass} mb-12 rounded-lg @lg:p-8">
				<div class="overflow-y-auto">
					<PublicEventCard
						event={sampleEvent}
						cardOptions={theme.eventCard}
						eventImageUrl="/exemple_img.svg"
					/>
				</div>
			</div>
			{#if !is_mobile}
				<div class="mockup-phone">
					<div class="mockup-phone-display place-content-center overflow-auto">
						<div class="{theme.layoutSections.mainBackgroundClass}  rounded-lg p-8">
							<PublicEventCard
								event={sampleEvent}
								cardOptions={theme.eventCard}
								eventImageUrl="/exemple_img.svg"
							/>
						</div>
					</div>
				</div>
			{/if}
		</Frame>

		<!-- Bouton Sauvegarder -->
		{#if haveUnsavedChanges}
			<div
				transition:slide={{ duration: 300, axis: "y" }}
				class="bg-neutral/70 fixed left-0 flex w-full justify-end gap-4 px-4 py-2 not-md:top-0 md:bottom-0"
			>
				<button
					type="button"
					onclick={() => {
						if (initialTheme) {
							theme = JSON.parse(JSON.stringify(initialTheme));
						} else {
							theme = getDefaultThemeOptions();
						}
					}}
					class="btn"
				>
					Annuler
				</button>
				<button type="button" onclick={saveTheme} class="btn btn-primary">
					Enregistrer <span class="not-md:hidden">les modifications</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Modal de sélection des thèmes -->
	{#if themeModalOpen}
		<ModalX
			title="Sélection des thèmes"
			onSave={() => (themeModalOpen = false)}
			onClose={() => (themeModalOpen = false)}
		>
			<!-- Thèmes clairs -->
			<h3 class="mb-2 flex items-center gap-2 font-medium">
				<Sun size={18} />
				Thèmes clairs
			</h3>
			<div class="rounded-box mb-6 grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
				{#each daisyThemes.light as themeItem (themeItem)}
					{@render daisy_theme(themeItem, "light")}
				{/each}
			</div>

			<!-- Thèmes sombres -->
			<h3 class="mb-2 flex items-center gap-2 font-medium">
				<Moon size={18} />
				Thèmes sombres
			</h3>
			<div class="rounded-box grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
				{#each daisyThemes.dark as themeItem (themeItem)}
					{@render daisy_theme(themeItem, "dark")}
				{/each}
			</div>
		</ModalX>
	{/if}
{:else}
	<div class="flex justify-center py-12">
		<span class="loading loading-dots loading-lg">Chargement...</span>
	</div>
{/if}

<script lang="ts">
	import { pb } from '$lib/pocketbase.svelte';
	import { showAlert } from '$lib/shared/states.svelte';
	import { getDefaultThemeOptions, type PublicSiteThemeOptions } from '$lib/types/theme.d';
	import type { SpacesOptionsResponse } from '$lib/types/pocketbase';
	import { onMount } from 'svelte';
	import { AlertCircle, CheckCircle, Save, Eye, Moon, Sun, SunMoon } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import '/src/daisy.css';
	import ColorSelect from '$lib/components/ColorSelect.svelte';
	// États locaux pour le formulaire et le chargement/sauvegarde
	let theme = $state(getDefaultThemeOptions());
	let optionsRecordId = $state<string | null>(null);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let spaceId: string | null = null;
	// États pour la prévisualisation du thème sur la page
	let previewMode = $state<'light' | 'dark'>('light'); // Pour le switcher de prévisualisation

	// Options prédéfinies pour les selects/radios
	// Thèmes Daisy catégorisés en light et dark
	const daisyThemes = {
		light: [
			'light',
			'cupcake',
			'bumblebee',
			'emerald',
			'corporate',
			'fantasy',
			'wireframe',
			'cmyk',
			'autumn',
			'acid',
			'lemonade',
			'winter',
			'garden',
			'lofi',
			'pastel',
			'retro',
			'cyberpunk',
			'valentine',
			'nord'
		],
		dark: [
			'dark',
			'synthwave',
			'business',
			'halloween',
			'forest',
			'aqua',
			'black',
			'luxury',
			'dracula',
			'night',
			'coffee',
			'dim',
			'sunset'
		]
	};

	const allBackgroundColors = [
		{
			value: 'bg-base-100',
			label: 'Fond principal',
			color: 'base-100',
			sections: ['header', 'leftSidebar', 'rightSidebar', 'main', 'footer']
		},
		{
			value: 'bg-base-200',
			label: 'Fond secondaire',
			color: 'base-200',
			sections: ['header', 'leftSidebar', 'rightSidebar', 'footer', 'main', 'eventCard']
		},
		{
			value: 'bg-base-300',
			label: 'Fond tertiaire',
			color: 'base-300',
			sections: ['leftSidebar', 'rightSidebar', 'footer', 'eventCard']
		},
		{
			value: 'bg-neutral',
			label: 'Neutre',
			color: 'neutral',
			sections: ['leftSidebar', 'rightSidebar', 'footer', 'eventCard', 'header']
		},
		{
			value: 'bg-primary',
			label: 'Primaire',
			color: 'primary',
			sections: ['header', 'footer', 'eventCard']
		},
		{
			value: 'bg-secondary',
			label: 'Secondaire',
			color: 'secondary',
			sections: ['footer', 'eventCard']
		},
		{
			value: 'bg-primary/5',
			label: 'Primaire (5%)',
			color: 'primary',
			sections: ['leftSidebar', 'rightSidebar', 'eventCard']
		},
		{
			value: 'bg-primary/10',
			label: 'Primaire (10%)',
			color: 'primary',
			sections: ['header', 'eventCard']
		},
		{
			value: 'bg-secondary/10',
			label: 'Secondaire (10%)',
			color: 'secondary',
			sections: ['eventCard']
		},
		{
			value: 'bg-transparent',
			label: 'Transparent',
			color: 'transparent',
			sections: ['header', 'main']
		},
		{ value: 'bg-white', label: 'Blanc', color: 'white', sections: ['eventCard'] },
		{ value: 'bg-base-300/50', label: 'Fond léger', color: 'base-300', sections: ['main'] }
	];

	// Liste principale des couleurs de texte
	const allTextColors = [
		{
			value: 'text-base-content',
			label: 'Texte principal',
			color: 'base-content',
			sections: ['all']
		},
		{
			value: 'text-base-content/70',
			label: 'Texte secondaire',
			color: 'base-content',
			sections: ['all']
		},
		{
			value: 'text-base-content/50',
			label: 'Texte tertiaire',
			color: 'base-content',
			sections: ['all']
		},
		{
			value: 'text-primary-content',
			label: 'Sur primaire',
			color: 'primary-content',
			sections: ['header', 'footer', 'eventCard']
		},
		{
			value: 'text-secondary-content',
			label: 'Sur secondaire',
			color: 'secondary-content',
			sections: ['footer', 'eventCard']
		},
		{
			value: 'text-neutral-content',
			label: 'Sur neutre',
			color: 'neutral-content',
			sections: ['leftSidebar', 'rightSidebar', 'footer']
		},
		{ value: 'text-primary', label: 'Primaire', color: 'primary', sections: ['all'] },
		{ value: 'text-secondary', label: 'Secondaire', color: 'secondary', sections: ['all'] }
	];

	// Options pour les tailles de texte fluide
	const fluidTextSizes = [
		{ value: 'text-fluid-xs', label: 'Très petit (XS)' },
		{ value: 'text-fluid-sm', label: 'Petit (SM)' },
		{ value: 'text-fluid-base', label: 'Base' },
		{ value: 'text-fluid-lg', label: 'Grand (LG)' },
		{ value: 'text-fluid-xl', label: 'Très grand (XL)' },
		{ value: 'text-fluid-2xl', label: 'Énorme (2XL)' },
		{ value: 'text-fluid-3xl', label: 'Gigantesque (3XL)' }
	];

	// Options pour les arrondis
	const roundedOptions = [
		{ value: 'rounded-none', label: 'Aucun' },
		{ value: 'rounded-sm', label: 'Petit' },
		{ value: 'rounded-md', label: 'Moyen' },
		{ value: 'rounded-lg', label: 'Grand' },
		{ value: 'rounded-xl', label: 'Très grand' },
		{ value: 'rounded-2xl', label: 'Énorme' },
		{ value: 'rounded-full', label: 'Complet' }
	];

	// Options pour les ombres
	const shadowOptions = [
		{ value: 'shadow-none', label: 'Aucune' },
		{ value: 'shadow-sm', label: 'Légère' },
		{ value: 'shadow', label: 'Normale' },
		{ value: 'shadow-md', label: 'Moyenne' },
		{ value: 'shadow-lg', label: 'Grande' },
		{ value: 'shadow-xl', label: 'Très grande' },
		{ value: 'shadow-2xl', label: 'Énorme' }
	];

	const imagePositions = [
		{ label: 'Image à Gauche', value: 'left' },
		{ label: 'Image en Haut', value: 'top' }
	];

	const layoutSectionNames = [
		{ key: 'header', label: 'Header' },
		{ key: 'leftSidebar', label: 'Sidebar Gauche' },
		{ key: 'rightSidebar', label: 'Sidebar Droite' },
		{ key: 'footer', label: 'Footer' },
		{ key: 'mainBackgroundClass', label: 'Fond Principal' }
	];

	// Assurons-nous que ces propriétés existent
	$effect(() => {
		if (!theme.daisyThemeLight) {
			theme.daisyThemeLight = theme.daisyTheme || 'light';
		}
		if (!theme.daisyThemeDark) {
			theme.daisyThemeDark = theme.daisyTheme || 'dark';
		}

		// Si daisyTheme est défini dans les données existantes mais pas daisyThemeLight/Dark,
		// initialisons-les avec la valeur de daisyTheme
		if (theme.daisyTheme) {
			if (daisyThemes.light.includes(theme.daisyTheme)) {
				theme.daisyThemeLight = theme.daisyTheme;
			} else if (daisyThemes.dark.includes(theme.daisyTheme)) {
				theme.daisyThemeDark = theme.daisyTheme;
			}
		}
	});

	// Calculer le daisyTheme actuel basé sur le mode par défaut
	// let currentDaisyTheme = $derived(
	//     theme.defaultMode === 'light' ? theme.daisyThemeLight : theme.daisyThemeDark
	// );

	// Mettre à jour theme.daisyTheme quand currentDaisyTheme change
	$effect(() => {
		const currentDaisyTheme = () => {
			if (theme.defaultMode === 'light') {
				return theme.daisyThemeLight;
			} else {
				return theme.daisyThemeDark;
			}
		};
		theme.daisyTheme = currentDaisyTheme();
	});

	// Fonction pour obtenir les options de couleur de fond selon la section
	function getBackgroundOptionsForSection(section: string) {
		return allBackgroundColors.filter(
			(option) => option.sections.includes(section) || option.sections.includes('all')
		);
	}

	// Fonction pour obtenir les options de couleur de texte selon la section
	function getTextOptionsForSection(section: string) {
		return allTextColors.filter(
			(option) => option.sections.includes(section) || option.sections.includes('all')
		);
	}

	// Fonction pour récupérer l'ID de l'espace de l'admin actuel
	async function getCurrentAdminSpaceId(): Promise<string | null> {
		const user = pb.authStore.model;
		if (!user) return null;
		try {
			const memberRecord = await pb
				.collection('spaceMembers')
				.getFirstListItem(`user = "${user.id}" && role = "admin"`);
			return memberRecord?.space || null;
		} catch (e) {
			if ((e as any)?.status === 404) {
				console.warn("L'utilisateur admin n'est associé à aucun espace via spaceMembers.");
				return null;
			}
			console.error("Erreur lors de la récupération de l'espace de l'admin:", e);
			return null;
		}
	}

	// Initialiser l'état des options de carte d'événement si nécessaires
	function initEventCardOptions() {
		// S'assurer que toutes les propriétés sont initialisées
		if (!theme.eventCard) {
			theme.eventCard = getDefaultThemeOptions().eventCard;
		}

		// Ajouter les nouvelles propriétés si elles n'existent pas
		theme.eventCard = {
			...theme.eventCard,
			bgClass: theme.eventCard.bgClass || 'bg-base-200',
			textClass: theme.eventCard.textClass || 'text-base-content',
			shadowClass: theme.eventCard.shadowClass || 'shadow',
			roundedClass: theme.eventCard.roundedClass || 'rounded-lg',
			titleSizeClass: theme.eventCard.titleSizeClass || 'text-fluid-2xl',
			dateSizeClass: theme.eventCard.dateSizeClass || 'text-fluid-lg',
			categorySizeClass: theme.eventCard.categorySizeClass || 'text-fluid-lg'
		};

		// Ajouter la propriété defaultMode si elle n'existe pas
		if (!theme.defaultMode) {
			theme.defaultMode = 'light';
		}
	}

	// Charger les options existantes au montage
	onMount(async () => {
		isLoading = true;
		error = null;
		spaceId = await getCurrentAdminSpaceId();

		if (!spaceId) {
			error = 'Impossible de déterminer votre espace. Vérifiez vos permissions.';
			isLoading = false;
			showAlert(error, 'error');
			return;
		}

		try {
			// Essayer de récupérer l'enregistrement d'options pour cet espace
			const optionsRecord = await pb
				.collection('spaces_options')
				.getFirstListItem<SpacesOptionsResponse>(`space = "${spaceId}"`);
			optionsRecordId = optionsRecord.id;

			// Fusionner les options chargées avec les défauts pour l'affichage initial
			const loadedTheme = optionsRecord?.publicSiteTheme as
				| Partial<PublicSiteThemeOptions>
				| undefined;
			// Logique de fusion profonde (importante pour les objets imbriqués)
			theme = {
				...getDefaultThemeOptions(),
				...(loadedTheme ?? {}),
				eventCard: {
					...getDefaultThemeOptions().eventCard,
					...(loadedTheme?.eventCard ?? {})
				},
				layoutSections: {
					...getDefaultThemeOptions().layoutSections,
					...(loadedTheme?.layoutSections ?? {})
				}
			};

			// Initialiser les nouvelles propriétés de cartes d'événement
			initEventCardOptions();

			console.log("Options d'apparence chargées pour l'édition:", theme);
		} catch (e: any) {
			if (e.status === 404) {
				// Pas d'options existantes, ce n'est pas une erreur. On utilisera les défauts.
				console.log(
					`Aucune option d'apparence existante trouvée pour l'espace ${spaceId}. Un nouvel enregistrement sera créé à la sauvegarde.`
				);
				theme = getDefaultThemeOptions(); // S'assurer qu'on part des défauts

				// Initialiser les nouvelles propriétés de cartes d'événement
				initEventCardOptions();

				optionsRecordId = null; // Indiquer qu'il faudra créer
			} else {
				// Une autre erreur s'est produite
				console.error("Erreur lors du chargement des options d'apparence:", e);
				error = `Erreur chargement: ${e.message}`;
				showAlert(error, 'error');
				theme = getDefaultThemeOptions(); // Revenir aux défauts en cas d'erreur

				// Initialiser les nouvelles propriétés de cartes d'événement
				initEventCardOptions();
			}
		} finally {
			isLoading = false;
		}
	});

	// Fonction pour sauvegarder les modifications
	async function handleSaveTheme() {
		if (!spaceId || isSaving) return;

		isSaving = true;
		error = null;

		try {
			// Préparer les données à envoyer
			const dataToSave = {
				publicSiteTheme: theme,
				space: spaceId
			};

			let savedRecord;
			if (optionsRecordId) {
				savedRecord = await pb
					.collection('spaces_options')
					.update<SpacesOptionsResponse>(optionsRecordId, dataToSave);
			} else {
				savedRecord = await pb
					.collection('spaces_options')
					.create<SpacesOptionsResponse>(dataToSave);
				optionsRecordId = savedRecord.id;
			}

			theme = savedRecord.publicSiteTheme as PublicSiteThemeOptions;
			console.log("Options d'apparence sauvegardées:", savedRecord);
			showAlert('Apparence sauvegardée avec succès !', 'success');
		} catch (e: any) {
			console.error("Erreur lors de la sauvegarde de l'apparence:", e);
			error = `Erreur sauvegarde: ${e.message}`;
			showAlert(error, 'error');
		} finally {
			isSaving = false;
		}
	}
</script>

{#snippet daisy_theme(daisy_theme: string, themeCategory: 'light' | 'dark')}
	{@const isCurrentThemeForCategory =
		themeCategory === 'light'
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
				theme.daisyTheme = daisy_theme;
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
						{#if themeCategory === 'light'}
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

<div
	class="container mx-auto p-6"
	data-theme={previewMode === 'dark'
		? daisyThemes.dark.includes(theme.daisyTheme)
			? theme.daisyTheme
			: daisyThemes.dark[0]
		: daisyThemes.light.includes(theme.daisyTheme)
			? theme.daisyTheme
			: daisyThemes.light[0]}
>
	<div class="relative mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Apparence du Site Public</h1>
		<div class="flex items-center gap-3">
			<!-- Bouton Switcher Light/Dark -->
			<div class="bg-base-100 fixed top-20 right-10 z-10 rounded-xl">
				<label class="toggle text-base-content">
					<input
						type="checkbox"
						checked={previewMode === 'dark'}
						onclick={() => (previewMode = previewMode === 'light' ? 'dark' : 'light')}
					/>
					<Sun size="16" />
					<Moon size="16" />
				</label>
			</div>

			<!-- Bouton Prévisualiser -->
			<!-- <a
				href="/{spaceId}"
				target="_blank"
				class="btn btn-outline btn-sm gap-2"
				title="Voir le site public"
			>
				<Eye size={16} /> Prévisualiser
			</a> -->
		</div>
	</div>

	{#if isLoading}
		<div class="flex min-h-[200px] items-center justify-center">
			<span class="loading loading-lg loading-dots"></span>
		</div>
	{:else if error && !isLoading}
		<div role="alert" class="alert alert-error mb-4">
			<AlertCircle />
			<span>{error}</span>
			{#if !spaceId}
				<button class="btn btn-sm btn-ghost" onclick={() => goto('/dashboard')}
					>Retour Dashboard</button
				>
			{/if}
		</div>
	{:else}
		<!-- Formulaire principal -->
		<div class="space-y-8">
			<!-- Section Thème Général -->
			<div class="card bg-base-200 shadow-md">
				<div class="card-body">
					<h2 class="card-title mb-4 flex items-center justify-between">
						<span>Thème Général</span>

						<!-- Switcher pour prévisualiser light/dark sur cette page -->
						<div class="flex items-center gap-2">
							<span class="text-sm font-normal">Prévisualiser:</span>
							<div class="join rounded-md border">
								<button
									class="join-item btn btn-sm ${previewMode === 'light' ? 'btn-active' : ''}"
									onclick={() => (previewMode = 'light')}
								>
									<Sun size={16} />
								</button>
								<button
									class="join-item btn btn-sm ${previewMode === 'dark' ? 'btn-active' : ''}"
									onclick={() => (previewMode = 'dark')}
								>
									<Moon size={16} />
								</button>
							</div>
						</div>
					</h2>

					<!-- Sélection du mode par défaut (light/dark) -->
					<div class="mb-6">
						<h3 class="mb-2 flex items-center gap-2 font-medium">
							<SunMoon size={18} />
							Mode par défaut du site public
						</h3>
						<div class="flex gap-4">
							<label class="label cursor-pointer gap-2">
								<input
									type="radio"
									name="defaultMode"
									class="radio radio-primary"
									value="light"
									checked={theme.defaultMode === 'light'}
									onclick={() => (theme.defaultMode = 'light')}
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
									checked={theme.defaultMode === 'dark'}
									onclick={() => (theme.defaultMode = 'dark')}
								/>
								<span class="label-text flex items-center gap-1">
									<Moon size={16} /> Sombre
								</span>
							</label>
						</div>
					</div>

					<!-- Thèmes clairs -->
					<h3 class="mb-2 flex items-center gap-2 font-medium">
						<Sun size={18} />
						Thèmes clairs
					</h3>
					<div
						class="rounded-box mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
					>
						{#each daisyThemes.light as themeItem (themeItem)}
							{@render daisy_theme(themeItem, 'light')}
						{/each}
					</div>

					<!-- Thèmes sombres -->
					<h3 class="mb-2 flex items-center gap-2 font-medium">
						<Moon size={18} />
						Thèmes sombres
					</h3>
					<div
						class="rounded-box grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
					>
						{#each daisyThemes.dark as themeItem (themeItem)}
							{@render daisy_theme(themeItem, 'dark')}
						{/each}
					</div>
				</div>
			</div>

			<!-- --- Section Carte Événement --- -->

			<div class="card bg-base-200 shadow-md">
				<div class="card-body">
					<h2 class="card-title mb-4">Apparence des Cartes Événement</h2>

					<div class="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
						<!-- Position Image -->
						<div class="form-control w-full">
							<label class="label" for="image-pos">
								<span class="label-text font-medium">Position de l'image</span>
							</label>
							<div class="flex gap-4">
								{#each imagePositions as pos (pos.value)}
									<label class="label cursor-pointer gap-2">
										<input
											id="image-pos"
											type="radio"
											name="imagePosition"
											class="radio radio-primary"
											value={pos.value}
											bind:group={theme.eventCard.imagePosition}
										/>
										<span class="label-text">{pos.label}</span>
									</label>
								{/each}
							</div>
						</div>

						<!-- Couleur de fond -->
						<ColorSelect
							id="bg-color"
							bind:value={theme.eventCard.bgClass}
							options={getBackgroundOptionsForSection('eventCard')}
							label="Couleur de fond"
						/>
						<!-- Ombre -->
						<div class="form-control w-full">
							<label class="label" for="shadow">
								<span class="label-text font-medium">Ombre</span>
							</label>
							<select
								id="shadow"
								class="select select-bordered w-full"
								bind:value={theme.eventCard.shadowClass}
							>
								{#each shadowOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Arrondi -->
						<div class="form-control w-full">
							<label class="label" for="rounded">
								<span class="label-text font-medium">Arrondi</span>
							</label>
							<select
								id="rounded"
								class="select select-bordered w-full"
								bind:value={theme.eventCard.roundedClass}
							>
								{#each roundedOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Largeur Carte -->
						<div class="form-control w-full">
							<label class="label" for="card-width">
								<span class="label-text font-medium">Largeur (Classe Tailwind)</span>
							</label>
							<input
								type="text"
								id="card-width"
								class="input input-bordered w-full"
								placeholder="w-full"
								bind:value={theme.eventCard.widthClass}
							/>
							<label class="label">
								<span class="label-text-alt">Ex: w-full, max-w-4xl mx-auto</span>
							</label>
						</div>

						<!-- Lignes Troncature -->
						<div class="form-control w-full">
							<label class="label" for="truncate-lines">
								<span class="label-text font-medium">Lignes avant troncature (description)</span>
							</label>
							<input
								type="number"
								id="truncate-lines"
								min="1"
								max="20"
								class="input input-bordered w-full"
								bind:value={theme.eventCard.truncateLines}
							/>
						</div>

						<!-- Taille du titre -->
						<div class="form-control w-full">
							<label class="label" for="title-size">
								<span class="label-text font-medium">Taille du titre</span>
							</label>
							<select
								id="title-size"
								class="select select-bordered w-full"
								bind:value={theme.eventCard.titleSizeClass}
							>
								{#each fluidTextSizes as size (size.value)}
									<option value={size.value}>{size.label}</option>
								{/each}
							</select>
						</div>

						<!-- Taille de la date -->
						<div class="form-control w-full">
							<label class="label" for="date-size">
								<span class="label-text font-medium">Taille de la date</span>
							</label>
							<select
								id="date-size"
								class="select select-bordered w-full"
								bind:value={theme.eventCard.dateSizeClass}
							>
								{#each fluidTextSizes as size (size.value)}
									<option value={size.value}>{size.label}</option>
								{/each}
							</select>
						</div>

						<!-- Taille des catégories -->
						<div class="form-control w-full">
							<label class="label" for="category-size">
								<span class="label-text font-medium">Taille des catégories</span>
							</label>
							<select
								id="category-size"
								class="select select-bordered w-full"
								bind:value={theme.eventCard.categorySizeClass}
							>
								{#each fluidTextSizes as size (size.value)}
									<option value={size.value}>{size.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<!-- Aperçu de la carte (à implémenter plus tard) -->
					<div class="rounded-box bg-base-300 mt-6 p-4">
						<p class="font-medium">
							Aperçu (note: la prévisualisation complète sera disponible dans une prochaine mise à
							jour)
						</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<div class={`badge ${theme.eventCard.bgClass}`}>Fond</div>
							<div class={`badge ${theme.eventCard.shadowClass}`}>Ombre</div>
							<div class={`badge ${theme.eventCard.roundedClass}`}>Arrondi</div>
							<div class={`badge ${theme.eventCard.titleSizeClass}`}>Titre</div>
							<div class={`badge ${theme.eventCard.dateSizeClass}`}>Date</div>
							<div class={`badge ${theme.eventCard.categorySizeClass}`}>Catégorie</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Section Mise en Page (Layout) -->
			<div class="card bg-base-200 shadow-md">
				<div class="card-body">
					<h2 class="card-title mb-4">Styles des Sections du Layout</h2>
					<p class="text-base-content/70 mb-4 text-sm">
						Configurez l'apparence des sections principales du site.
					</p>

					<div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
						{#each layoutSectionNames as section (section.key)}
							{#if section.key === 'mainBackgroundClass'}
								<!-- Fond général -->
								<ColorSelect
									id="main-bg-class"
									options={getBackgroundOptionsForSection('main')}
									label="{section.label} (Fond général)"
									bind:value={theme.layoutSections.mainBackgroundClass}
								/>
							{:else}
								{@const typedKey = section.key as Exclude<
									keyof PublicSiteThemeOptions['layoutSections'],
									'mainBackgroundClass'
								>}
								<!-- Autres sections -->
								<fieldset class="border-base-content/20 rounded border p-4">
									<legend class="px-2 font-medium">{section.label}</legend>

									<!-- Classe Fond (bg) -->
									<ColorSelect
										id="{typedKey}-bg-class"
										options={getBackgroundOptionsForSection(typedKey)}
										label="Couleur de fond"
										mode="background"
										bind:value={theme.layoutSections[typedKey].bgClass}
										complementaryColor={theme.layoutSections[typedKey].textClass}
									/>

									<!-- Classe Texte (text) -->
									<ColorSelect
										id="{typedKey}-text-class"
										options={getTextOptionsForSection(typedKey)}
										label="Couleur de texte"
										bind:value={theme.layoutSections[typedKey].textClass}
										mode="text"
										complementaryColor={theme.layoutSections[typedKey].bgClass}
									/>
								</fieldset>
							{/if}
						{/each}
					</div>
				</div>
			</div>

			<!-- Bouton Sauvegarder -->
			<div class="mt-8 flex justify-end">
				<button
					type="button"
					class="btn btn-primary"
					disabled={isLoading || isSaving}
					onclick={handleSaveTheme}
				>
					{#if isSaving}
						<span class="loading loading-spinner loading-xs"></span> Sauvegarde...
					{:else}
						<Save class="mr-2 h-4 w-4" /> Enregistrer les Modifications
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

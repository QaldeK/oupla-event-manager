<script lang="ts">
	// Imports des stores et des utilitaires Pocketbase
	import { createPad, deletePad, getPages, subscribeToPagesUpdates } from "../sitePageStore.svelte";
	import { pb, modifyRecord } from "$lib/pocketbase.svelte";
	import { modalState, showAlert } from "$lib/shared/states.svelte";

	// Imports des types
	import { SitePagesSectionOptions, type SitePagesResponse } from "$lib/types/pocketbase";
	import { ComponentType, type SitePagesNavigationMenuRecord } from "$lib/types/publicSiteType";
	import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";

	// Imports Svelte
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { flip } from "svelte/animate";
	import { fade, slide } from "svelte/transition";

	// Imports des composants UI et icônes
	import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";
	import {
		AlertCircle,
		ArrowLeft,
		GripVertical,
		Layout,
		Moon,
		Palette,
		Pencil,
		Plus,
		Sun,
		Trash2
	} from "lucide-svelte";
	import NavigationMenuEditor from "../components/NavigationMenuEditor.svelte";
	import ModalX from "$lib/components/ModalX.svelte";
	import PageBlockEditor from "../components/PageBlockEditor.svelte";
	import NavBarHeaderConfig from "../components/NavBarHeaderConfig.svelte";
	import Frame from "$lib/components/Frame.svelte";

	// Import du CSS global
	import "/src/daisy.css";

	type BlocRecord = SitePagesNavigationMenuRecord | SitePagesResponse;

	// --- Déclarations des variables d'état ($state) ---
	let isLoading = $state(true);
	let isUpdatingOrder = $state(false);
	let error = $state<string | null>(null);

	// Variables pour la gestion des modales et des éditeurs
	let currentConfigSection = $state<SitePagesSectionOptions | null>(null);
	let navbarConfigModalOpen = $state(false);

	let currentMenu = $state<BlocRecord | null>(null);

	let currentBlockId = $state<string | null>(null);

	// Variable reactive globale pour les modal de configuration
	let modalConfig = $state({
		blockEditorOpen: false,
		navBarEditorOpen: false,
		menuEditorOpen: false
	});

	// Variables pour la gestion du thème
	let theme = $state<PublicSiteThemeOptions>(getDefaultThemeOptions());
	let initialTheme = $state<PublicSiteThemeOptions | null>(null);

	// Variables liées à Pocketbase
	let optionsRecordId = $state<string | null>(null);
	let spaceId = $state<string | null>(null);

	// Variable pour le mode de prévisualisation du thème
	let previewMode = $state<"light" | "dark">("light");

	// --- Déclarations des variables dérivées ($derived) ---
	let haveUnsavedChanges = $derived(
		initialTheme ? JSON.stringify(theme) !== JSON.stringify(initialTheme) : false
	);

	let pages = $derived.by(() => getPages());

	// Structure pour stocker les pages groupées par type
	type GroupedPages = {
		[SitePagesSectionOptions.header]: BlocRecord[];
		[SitePagesSectionOptions.top]: BlocRecord[];
		[SitePagesSectionOptions.leftSide]: BlocRecord[];
		[SitePagesSectionOptions.rightSide]: BlocRecord[];
		[SitePagesSectionOptions.footer]: BlocRecord[];
		[SitePagesSectionOptions.page]: BlocRecord[];
	};

	// Groupement des pages par type et tri par position
	let groupedPages = $derived.by<GroupedPages>(() => {
		const groups: GroupedPages = {
			[SitePagesSectionOptions.header]: [],
			[SitePagesSectionOptions.top]: [],
			[SitePagesSectionOptions.leftSide]: [],
			[SitePagesSectionOptions.rightSide]: [],
			[SitePagesSectionOptions.footer]: [],
			[SitePagesSectionOptions.page]: []
		};

		pages.forEach((page: BlocRecord) => {
			const pageSection = page.section;
			if (pageSection && Object.values(SitePagesSectionOptions).includes(pageSection)) {
				groups[pageSection as Exclude<keyof GroupedPages, "page">].push(page);
			} else if (pageSection === SitePagesSectionOptions.page) {
				groups[SitePagesSectionOptions.page].push(page);
			}
		});

		for (const key in groups) {
			if (Object.values(SitePagesSectionOptions).includes(key as SitePagesSectionOptions)) {
				const groupKey = key as Exclude<keyof GroupedPages, "other">;
				groups[groupKey].sort((a, b) => {
					const posA = typeof a.pos === "number" ? a.pos : Infinity;
					const posB = typeof b.pos === "number" ? b.pos : Infinity;
					if (posA === posB) {
						return new Date(a.created).getTime() - new Date(b.created).getTime();
					}
					return posA - posB;
				});
			}
		}
		return groups;
	});

	// --- Constantes de configuration UI ---
	const allBackgroundColors = [
		{ value: "bg-base-100", label: "Fond principal", color: "base-100" },
		{ value: "bg-base-200", label: "Fond secondaire", color: "base-200" },
		{ value: "bg-base-300", label: "Fond tertiaire", color: "base-300" },
		{ value: "bg-neutral", label: "Neutre", color: "neutral" },
		{ value: "bg-primary", label: "Primaire", color: "primary" },
		{ value: "bg-secondary", label: "Secondaire", color: "secondary" },
		{ value: "bg-primary/5", label: "Primaire (5%)", color: "primary" },
		{ value: "bg-primary/10", label: "Primaire (10%)", color: "primary" },
		{ value: "bg-secondary/10", label: "Secondaire (10%)", color: "secondary" },
		{ value: "bg-transparent", label: "Transparent", color: "transparent" },
		{ value: "bg-white", label: "Blanc", color: "white" },
		{ value: "bg-base-300/50", label: "Fond léger", color: "base-300" }
	];

	const allTextColors = [
		{ value: "text-base-content", label: "Texte principal", color: "base-content" },
		{ value: "text-base-content/70", label: "Texte secondaire", color: "base-content" },
		{ value: "text-base-content/50", label: "Texte tertiaire", color: "base-content" },
		{ value: "text-primary-content", label: "Sur primaire", color: "primary-content" },
		{ value: "text-secondary-content", label: "Sur secondaire", color: "secondary-content" },
		{ value: "text-neutral-content", label: "Sur neutre", color: "neutral-content" },
		{ value: "text-primary", label: "Primaire", color: "primary" },
		{ value: "text-secondary", label: "Secondaire", color: "secondary" }
	];

	// --- Hooks de cycle de vie (onMount, $effect) ---
	onMount(async () => {
		spaceId = await getCurrentAdminSpaceId();

		if (!spaceId) {
			showAlert("Impossible de déterminer votre espace. Vérifiez vos permissions.", "error");
			return;
		}

		try {
			const optionsRecord = await pb
				.collection("spaces_options")
				.getFirstListItem(`space = "${spaceId}"`);
			optionsRecordId = optionsRecord.id;

			const loadedTheme = optionsRecord?.publicSiteTheme as
				| Partial<PublicSiteThemeOptions>
				| undefined;
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
				},
				components: {
					...getDefaultThemeOptions().components,
					...(loadedTheme?.components ?? {})
				}
			};

			if (!theme.daisyThemeLight) {
				theme.daisyThemeLight = theme.daisyTheme || "light";
			}
			if (!theme.daisyThemeDark) {
				theme.daisyThemeDark = theme.daisyTheme || "dark";
			}
			initialTheme = JSON.parse(JSON.stringify(theme));
		} catch (e: unknown) {
			if (typeof e === "object" && e !== null && "status" in e && e.status === 404) {
				console.log(`Aucune option d'apparence existante trouvée pour l'espace ${spaceId}.`);
				theme = getDefaultThemeOptions();
				optionsRecordId = null;
				initialTheme = JSON.parse(JSON.stringify(theme));
			} else {
				console.error("Erreur lors du chargement des options d'apparence:", e);
				showAlert(
					`Erreur chargement: ${typeof e === "object" && e !== null && "message" in e && e.message}`,
					"error"
				);
				theme = getDefaultThemeOptions();
				initialTheme = JSON.parse(JSON.stringify(theme));
			}
		} finally {
			isLoading = false;
		}
	});

	$effect(() => {
		const unsubscribe = subscribeToPagesUpdates(() => {});
		return unsubscribe;
	});

	// --- Fonctions utilitaires et de lecture de données ---

	/**
	 * Récupère l'ID de l'espace admin courant.
	 * @returns L'ID de l'espace admin ou null si non trouvé.
	 */
	async function getCurrentAdminSpaceId(): Promise<string | null> {
		const user = pb.authStore.record;
		if (!user) return null;
		try {
			const memberRecord = await pb
				.collection("spaceMembers")
				.getFirstListItem(`user = "${user.id}" && role = "admin"`);
			return memberRecord?.space || null;
		} catch {
			console.warn("L'utilisateur admin n'est associé à aucun espace via spaceMembers.");
			return null;
		}
	}

	/**
	 * Retourne le thème actuel (light/dark) pour la prévisualisation.
	 * @returns Le nom du thème DaisyUI.
	 */
	function getCurrentTheme() {
		return previewMode === "light" ? theme.daisyThemeLight : theme.daisyThemeDark;
	}

	/**
	 * Retourne la clé de configuration du thème pour une section donnée.
	 * @param section Le type de section.
	 * @returns La clé correspondante dans l'objet `theme.layoutSections`.
	 */
	function getSectionConfigKey(section: SitePagesSectionOptions) {
		switch (section) {
			case SitePagesSectionOptions.header:
				return "header";
			case SitePagesSectionOptions.leftSide:
				return "leftSidebar";
			case SitePagesSectionOptions.rightSide:
				return "rightSidebar";
			case SitePagesSectionOptions.footer:
				return "footer";
			case SitePagesSectionOptions.top:
				return "top";
		}
	}

	// --- Fonctions de manipulation des pages / blocs / menus ---

	/**
	 * Sauvegarde les options de thème du site.
	 */
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
			showAlert("Configuration sauvegardée avec succès !", "success");
		} catch (e: unknown) {
			console.error("Erreur lors de la sauvegarde:", e);
			showAlert(
				`Erreur sauvegarde: ${typeof e === "object" && e !== null && "message" in e && e.message}`,
				"error"
			);
		}
	}

	/**
	 * Gère la création d'un nouveau bloc dans une section spécifiée.
	 * Ouvre l'éditeur de bloc après la création.
	 * @param blockSection La section où créer le bloc.
	 */
	async function handleCreateBlock(blockSection: Partial<SitePagesSectionOptions>) {
		try {
			const title = `Text`;
			const itemsInSection = groupedPages[blockSection] || [];
			const maxPos = itemsInSection.reduce((max: number, item: BlocRecord) => {
				const currentPos = typeof item.pos === "number" ? item.pos : -1;
				return Math.max(max, currentPos);
			}, -1);
			const nextPos = maxPos + 1;

			const newPage = await createPad(title, blockSection, {
				pos: nextPos,
				componentType: ComponentType.bloc
			});

			currentBlockId = newPage.id;
			modalConfig.blockEditorOpen = true;
		} catch (e) {
			showAlert(
				`Erreur lors de la création du bloc: ${e instanceof Error ? e.message : e}`,
				"error"
			);
			console.error(e);
		}
	}

	/**
	 * Fonction pour supprimer une page/un bloc après confirmation.
	 * @param id L'ID de la page/du bloc à supprimer.
	 */
	const deleteBlock = (id: string) => {
		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Supprimer le bloc",
				message: "Êtes vous sûr de vouloir supprimer ce bloc ? Cette action est définitive",
				variant: "warning",
				onConfirm: async () => {
					try {
						await deletePad(id);
						modalState.confirm.isOpen = false;
						showAlert("Bloc supprimé", "success");
					} catch (e) {
						showAlert(`Erreur lors de la suppression (${e})`, "error");
						modalState.confirm.isOpen = false;
					}
				}
			}
		};
	};

	/**
	 * Gère la création d'un nouveau menu dans une section spécifiée.
	 * Ouvre l'éditeur de menu après la création.
	 * @param menuSection La section où créer le menu.
	 */
	async function handleCreateMenu(menuSection: SitePagesSectionOptions) {
		try {
			const title = `Menu`;
			const itemsInSection = groupedPages[menuSection] || [];
			const maxPos = itemsInSection.reduce((max: number, item: BlocRecord) => {
				const currentPos = typeof item.pos === "number" ? item.pos : -1;
				return Math.max(max, currentPos);
			}, -1);
			const nextPos = maxPos + 1;

			const newMenu = await createPad(title, menuSection, {
				pos: nextPos,
				componentType: ComponentType.navigationMenu,
				componentConfig: {
					links: []
				}
			});

			currentMenu = newMenu as SitePagesNavigationMenuRecord;
			modalConfig.menuEditorOpen = true;
		} catch (e) {
			showAlert(
				`Erreur lors de la création du menu: ${e instanceof Error ? e.message : e}`,
				"error"
			);
			console.error(e);
		}
	}

	/**
	 * Ferme l'éditeur de menu.
	 */
	function closeMenuEditor() {
		modalConfig.menuEditorOpen = false;
		currentMenu = null;
	}

	function closeBlockEditor() {
		modalConfig.blockEditorOpen = false;
		currentBlockId = null;
	}

	let pageBlockEditorComponent: { save: () => Promise<void> } | undefined;

	/**
	 * Appelle la méthode de sauvegarde exposée par le `PageBlockEditor`.
	 * Le composant enfant est responsable de la sauvegarde et de la fermeture de la modale
	 * en appelant sa prop `onClose` (qui est `closeBlockEditor`).
	 */
	async function saveBlockAndCloseEditor() {
		if (pageBlockEditorComponent) {
			await pageBlockEditorComponent.save();
			closeBlockEditor();
		} else {
			// Si le composant n'est pas lié pour une raison quelconque, fermez simplement la modale.
			showAlert("Erreur lors de la sauvegarde", "error");
			closeBlockEditor();
		}
	}

	/**
	 * Sauvegarde un menu de navigation.
	 * @param title Le titre du menu.
	 * @param links Les liens de navigation du menu.
	 */
	async function saveMenu() {
		if (!currentMenu) return;

		try {
			const updatedMenu = {
				...currentMenu
			};

			await modifyRecord("site_pages", currentMenu.id, updatedMenu);
			showAlert("Menu sauvegardé avec succès !", "success");
			closeMenuEditor();
		} catch (e) {
			showAlert(
				`Erreur lors de la sauvegarde du menu: ${e instanceof Error ? e.message : e}`,
				"error"
			);
			console.error(e);
		}
	}

	/**
	 * Gère le dépôt d'un élément dans une nouvelle section (changement de section).
	 * Met à jour la section et la position de l'élément déplacé.
	 * @param state L'état du glisser-déposer.
	 */
	async function handleSectionDrop(state: DragDropState<SitePagesResponse>) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		if (!targetContainer || sourceContainer === targetContainer) return;

		const newSectionKey = targetContainer as SitePagesSectionOptions;
		isUpdatingOrder = true;

		const itemsInNewSection = groupedPages[newSectionKey] || [];
		const maxPos = itemsInNewSection.reduce((max: number, item: BlocRecord) => {
			const currentPos = typeof item.pos === "number" ? item.pos : -1;
			return Math.max(max, currentPos);
		}, -1);
		const nextPos = maxPos + 1;

		try {
			await modifyRecord("site_pages", draggedItem.id, {
				section: targetContainer,
				pos: nextPos
			});
		} catch (error) {
			console.error("Erreur lors du déplacement du bloc:", error);
			showAlert("Erreur lors du déplacement du bloc", "error");
		} finally {
			isUpdatingOrder = false;
		}
	}

	/**
	 * Gère le dépôt d'un élément pour réordonner des blocs au sein de la même section.
	 * Met à jour les positions de tous les éléments affectés dans la section.
	 * @param state L'état du glisser-déposer.
	 * @param targetItem L'élément cible sur lequel l'élément a été déposé.
	 */
	async function handleItemDrop(state: DragDropState<BlocRecord>, targetItem: SitePagesResponse) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		if (!targetContainer || !sourceContainer || sourceContainer !== targetContainer) {
			return;
		}
		if (draggedItem.id === targetItem.id) {
			return;
		}

		const sectionType = targetContainer as SitePagesSectionOptions;
		if (
			!sectionType ||
			sectionType === SitePagesSectionOptions.page ||
			!Object.values(SitePagesSectionOptions).includes(sectionType)
		) {
			console.error("Tentative de réordonnancement dans une section invalide:", sectionType);
			showAlert("Le réordonnancement n'est pas autorisé dans cette section.", "error");
			return;
		}

		isUpdatingOrder = true;

		const itemsInSection = [...(groupedPages[sectionType] || [])];
		const draggedIndex = itemsInSection.findIndex((item) => item.id === draggedItem.id);
		const targetIndex = itemsInSection.findIndex((item) => item.id === targetItem.id);

		if (draggedIndex === -1 || targetIndex === -1) {
			console.error(
				"Erreur interne: Impossible de trouver l'élément déplacé ou cible dans la section."
			);
			showAlert("Erreur lors de la préparation du réordonnancement.", "error");
			isUpdatingOrder = false;
			return;
		}

		const [movedItem] = itemsInSection.splice(draggedIndex, 1);
		const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
		itemsInSection.splice(insertIndex, 0, movedItem);

		const updates: { id: string; data: { pos: number } }[] = itemsInSection.map((item, index) => ({
			id: item.id,
			data: { pos: index }
		}));

		try {
			await Promise.all(
				updates.map((update) => modifyRecord("site_pages", update.id, update.data))
			);
		} catch (error) {
			console.error("Erreur lors de la mise à jour de l'ordre des blocs:", error);
			showAlert("Erreur lors de la mise à jour de l'ordre", "error");
		} finally {
			isUpdatingOrder = false;
		}
	}

	// $inspect("modalConfig", modalConfig);
</script>

{#if !isLoading}
	{#snippet blockSection(sectionType: SitePagesSectionOptions, sectionLabel: string)}
		{@const sectionConfigKey = getSectionConfigKey(sectionType)}
		{@const sectionStyle = sectionConfigKey && theme.layoutSections[sectionConfigKey]}
		{@const isHeader = sectionType === SitePagesSectionOptions.header}

		<div
			class="card border shadow-md transition-all duration-200 {sectionStyle?.bgClass ||
				'bg-base-200'}"
			use:droppable={{
				container: sectionType,
				callbacks: { onDrop: handleSectionDrop },
				disabled: isHeader,
				attributes: {
					dragOverClass: "ring-2 ring-primary/50 bg-primary/5"
				}
			}}
		>
			<div class="card-body p-4">
				<div class="mb-2 flex items-center justify-between">
					<div class="font-medium {sectionStyle?.textClass || 'text-base-content'}">
						{sectionLabel}
					</div>

					<button
						class="btn btn-primary btn-square btn-sm"
						onclick={() => (currentConfigSection = sectionType)}
						title="Configurer l'apparence"
					>
						<Palette size={16} />
					</button>
				</div>
				<div class="flex flex-col gap-y-1">
					{#if isHeader}
						<div
							class="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 shadow-sm {sectionStyle?.textClass ||
								'text-base-content'}"
						>
							<div>Barre de navigation</div>
							<div>
								<button
									class="btn btn-outline btn-sm"
									onclick={() => (navbarConfigModalOpen = true)}
									title="Configurer la barre de navigation"
								>
									Configurer
								</button>
							</div>
							<div class="">
								<label class="label cursor-pointer gap-4">
									<span class="label-text text-xs">Activer</span>
									<input
										type="checkbox"
										class="toggle toggle-sm toggle-primary"
										bind:checked={theme.components.navbarHeader.enabled}
									/>
								</label>
							</div>
						</div>
					{/if}
				</div>
				{#if !isHeader}
					{#if isLoading}
						<div class="flex justify-center py-4">
							<span class="loading loading-spinner loading-sm"></span>
						</div>
					{:else}
						{#if groupedPages[sectionType]?.length > 0}
							<div class="mb-4 flex flex-col gap-y-1">
								{#each groupedPages[sectionType] as bloc (bloc.id)}
									<div
										class="bg-base-100 svelte-dnd-touch-feedback hover:ring-secondary/30 mb-2 flex flex-wrap items-center justify-between rounded-lg border p-2 shadow-sm transition-all duration-200 hover:shadow-md hover:ring-2"
										use:droppable={{
											container: sectionType,
											callbacks: {
												onDrop: (state) =>
													handleItemDrop(
														state as DragDropState<BlocRecord | SitePagesNavigationMenuRecord>,
														bloc
													)
												// FIXIT : ne pas actualiser pocketbase directement. + subscribe/unsubscribe a chaque drop !
											},
											attributes: {
												dragOverClass: "outline bg-warnig outline-2 outline-offset-2 outline-accent"
											}
										}}
										animate:flip={{ duration: 200 }}
										in:fade={{ duration: 150 }}
										out:fade={{ duration: 150 }}
									>
										<div class="flex flex-grow flex-wrap items-center gap-x-2 gap-y-1 pr-1">
											<span
												class="flex flex-grow gap-2"
												use:draggable={{
													container: sectionType,
													dragData: bloc,
													disabled: isUpdatingOrder,
													attributes: {
														draggingClass: "opacity-50 ring-2 ring-primary shadow-lg"
													}
												}}
											>
												<GripVertical
													class="text-base-content/30 group-hover:text-base-content/70 cursor-grab transition-colors"
													size={24}
												/>
												<span class="flex-1 truncate">
													{bloc.title}
													{#if bloc.componentType === ComponentType.navigationMenu}
														<span class="badge badge-secondary badge-xs ml-2">Menu</span>
													{/if}
												</span>
											</span>
											<div class="ms-auto flex items-center">
												<button
													class="btn btn-ghost text-error btn-square btn-sm"
													onclick={() => deleteBlock(bloc.id)}
												>
													<Trash2 size={16} />
												</button>
												{#if bloc.componentType === ComponentType.navigationMenu}
													<button
														class="btn btn-ghost btn-square btn-sm"
														onclick={() => {
															currentMenu = bloc;
															modalConfig.menuEditorOpen = true;
														}}
													>
														<Pencil size={16} />
													</button>
												{:else}
													<button
														class="btn btn-ghost btn-square btn-sm"
														onclick={() => {
															currentBlockId = bloc.id;
															modalConfig.blockEditorOpen = true;
														}}
													>
														<Pencil size={16} />
													</button>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<button
							class="btn btn-primary btn-sm flex-1"
							onclick={() => handleCreateBlock(sectionType)}
						>
							<Plus size={16} />
							Ajouter du contenu
						</button>
						<button
							class="btn btn-secondary btn-sm flex-1"
							onclick={() => handleCreateMenu(sectionType)}
						>
							<Plus size={16} />
							Ajouter un menu
						</button>
					{/if}
				{/if}
			</div>
		</div>
	{/snippet}

	<div transition:fade>
		<!-- Header avec navigation -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<button class="btn btn-ghost btn-sm" onclick={() => goto("/dashboard/site_pages")}>
				<ArrowLeft size={16} />
			</button>
			<div class="flex items-center gap-3">
				<div class="bg-accent/10 rounded-lg p-2">
					<Layout class="text-accent h-5 w-5" />
				</div>
				<div class="text-fluid-2xl font-bold">Organisation & Navigation</div>
			</div>
		</div>

		<div class="mb-8">
			<p class="text-base-content/70 text-lg">
				Organisez la structure de votre site public en configurant les sections et les liens de
				navigation. Glissez-déposez les blocs pour réorganiser votre contenu.
			</p>
		</div>

		{#if error}
			<div role="alert" class="alert alert-error mb-6">
				<AlertCircle class="h-6 w-6" />
				<span>{error}</span>
			</div>
		{/if}

		<!-- Section d'organisation des sections -->
		<Frame title="Organisation des sections">
			<div class="mb-4 flex items-center gap-2">
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

			<div
				data-theme={getCurrentTheme()}
				class="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_280px] lg:grid-rows-[auto_1fr_auto]"
			>
				<!-- Header -->
				<div class="lg:col-span-3">
					{@render blockSection(SitePagesSectionOptions.header, "Header")}
				</div>

				<!-- Left Sidebar -->
				<div class="lg:row-start-2">
					{@render blockSection(SitePagesSectionOptions.leftSide, "Sidebar Gauche")}
				</div>

				<!-- Zone centrale -->
				<div
					class="border-base-content/30 rounded border border-dashed p-4 text-center lg:col-start-2 lg:row-start-2"
				>
					<p class="text-base-content/60">Zone de contenu principal</p>
					<p class="text-base-content/50 text-sm">
						Cette zone affiche automatiquement vos événements et pages.
					</p>
				</div>

				<!-- Right Sidebar -->
				<div class="lg:col-start-3 lg:row-start-2">
					{@render blockSection(SitePagesSectionOptions.rightSide, "Sidebar Droite")}
				</div>

				<!-- Footer -->
				<div class="lg:col-span-3 lg:row-start-3">
					{@render blockSection(SitePagesSectionOptions.footer, "Footer")}
				</div>
			</div>
		</Frame>

		<!-- Bouton Sauvegarder -->
		{#if haveUnsavedChanges}
			<div
				transition:slide={{ duration: 300, axis: "y" }}
				class="bg-base-300/70 fixed bottom-0 left-0 flex w-full justify-end gap-4 px-4 py-2 shadow-lg"
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
					class="btn btn-ghost"
				>
					Annuler
				</button>
				<button type="button" onclick={saveTheme} class="btn btn-primary">
					Enregistrer les modifications
				</button>
			</div>
		{/if}
	</div>

	<!-- Modals -->

	<!-- Modal couleur des sections -->
	{#if currentConfigSection}
		{@const configSectionKey = getSectionConfigKey(currentConfigSection)}
		{@const sectionStyle = configSectionKey && theme.layoutSections[configSectionKey]}

		<ModalX
			title={`Configuration de la section ${
				currentConfigSection === SitePagesSectionOptions.header
					? "Entête"
					: currentConfigSection === SitePagesSectionOptions.leftSide
						? "Sidebar Gauche"
						: currentConfigSection === SitePagesSectionOptions.rightSide
							? "Sidebar Droite"
							: "Pied de page"
			}`}
			onClose={() => (currentConfigSection = null)}
			onSave={() => (currentConfigSection = null)}
			showCancel={false}
		>
			<div data-theme={getCurrentTheme()}>
				<!-- Classe Fond (bg) -->
				<div class="mb-8">
					<div class="text-base-content mb-2 font-medium">Couleur de fond</div>
					<div
						class="bg-base-200/50 grid grid-cols-3 gap-2 rounded-lg p-2 sm:grid-cols-5 md:grid-cols-6"
					>
						{#each allBackgroundColors as option (option.value)}
							{@const isActive = sectionStyle?.bgClass === option.value}
							{@const textClass = sectionStyle?.textClass || "text-base-content"}

							<button
								type="button"
								class="flex flex-col items-center rounded-lg border p-2 transition-all duration-200 {isActive
									? 'ring-primary border-primary ring-2'
									: 'border-base-300'}"
								onclick={() => {
									if (configSectionKey) {
										theme.layoutSections[configSectionKey].bgClass = option.value;
									}
								}}
							>
								<div
									class="flex h-10 w-full items-center justify-center rounded {option.value} {textClass}"
									title={option.label}
								>
									<span class="text-xs font-bold">Abc</span>
								</div>
								<span class="mt-1 w-full truncate text-center text-xs">{option.label}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Classe Texte (text) -->
				<div>
					<div class="text-base-content mb-2 font-medium">Couleur de texte</div>
					<div
						class="bg-base-200/50 grid grid-cols-3 gap-2 rounded-lg p-2 sm:grid-cols-5 md:grid-cols-6"
					>
						{#each allTextColors as option (option)}
							{@const isActive = sectionStyle?.textClass === option.value}
							{@const bgClass = sectionStyle?.bgClass || "bg-base-100"}

							<button
								type="button"
								class="flex flex-col items-center rounded-lg border p-2 transition-all duration-200 {isActive
									? 'ring-primary border-primary ring-2'
									: 'border-base-300'}"
								onclick={() => {
									if (configSectionKey) {
										theme.layoutSections[configSectionKey].textClass = option.value;
									}
								}}
							>
								<div
									class="flex h-10 w-full items-center justify-center rounded {bgClass} {option.value}"
									title={option.label}
								>
									<span class="text-xs font-bold">Abc</span>
								</div>
								<span class="mt-1 w-full truncate text-center text-xs">{option.label}</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</ModalX>
	{/if}

	{#if currentBlockId && modalConfig.blockEditorOpen}
		<ModalX onClose={closeBlockEditor} onSave={saveBlockAndCloseEditor}>
			<PageBlockEditor bind:this={pageBlockEditorComponent} docId={currentBlockId} />
		</ModalX>
	{/if}

	{#if navbarConfigModalOpen}
		<ModalX
			title="Configuration de la barre de navigation"
			onSave={() => {
				saveTheme();
				navbarConfigModalOpen = false;
			}}
			onClose={() => {
				navbarConfigModalOpen = false;
			}}
		>
			<NavBarHeaderConfig bind:navbarHeaderConfig={theme.components.navbarHeader} />
		</ModalX>
	{/if}

	{#if currentMenu && modalConfig.menuEditorOpen}
		<ModalX onSave={() => saveMenu} onClose={closeMenuEditor} title="Édition du menu">
			<NavigationMenuEditor bind:currentMenu />
		</ModalX>
	{/if}
{:else}
	<div class="flex justify-center py-12">
		<span class="loading loading-dots loading-lg">Chargement...</span>
	</div>
{/if}

<style>
	/* Styles pour le drag and drop */
	:global(.svelte-dnd-dragging) {
		z-index: 50;
		cursor: grabbing;
	}

	:global(.svelte-dnd-drop-target) {
		transition: all 0.2s ease;
	}

	:global(.drag-over) {
		border-color: slategray;
		outline: 2px solid slategray;
	}
</style>

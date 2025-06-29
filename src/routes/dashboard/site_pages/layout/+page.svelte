<script lang="ts">
	import {
		subscribeToPagesUpdates,
		getPages,
		createPad,
		deletePad
	} from "$lib/shared/sitePageStore.svelte";

	import { pb } from "$lib/pocketbase.svelte";
	import { showAlert, modalState } from "$lib/shared/states.svelte";
	import { SitePagesSectionOptions, type SitePagesResponse } from "$lib/types/pocketbase";
	import { modifyRecord } from "$lib/pocketbase.svelte";
	import { goto } from "$app/navigation";
	import { fade, slide } from "svelte/transition";
	import { flip } from "svelte/animate";

	import {
		ArrowLeft,
		Layout,
		GripVertical,
		Trash2,
		Pencil,
		Palette,
		Plus,
		X,
		Sun,
		Moon,
		AlertCircle
	} from "lucide-svelte";
	import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";

	import ConfigModal from "../components/ConfigModal.svelte";
	import NavBarHeaderConfig from "../components/NavBarHeaderConfig.svelte";
	import PageBlockEditor from "$lib/components/public/PageBlockEditor.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import ColorSelect from "$lib/components/ColorSelect.svelte";

	import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";
	import { onMount } from "svelte";

	import "/src/daisy.css";
	import Frame from "$lib/components/Frame.svelte";

	let isLoading = $state(true);
	let isCreating = $state(false);
	let isUpdatingOrder = $state(false);
	let error = $state<string | null>(null);

	let currentConfigSection = $state<SitePagesSectionOptions | null>(null);
	let currentConfigBlock = $state<string | null>(null);
	let navbarConfigModalOpen = $state(false);

	let theme = $state<PublicSiteThemeOptions>(getDefaultThemeOptions());
	let initialTheme = $state<PublicSiteThemeOptions | null>(null);

	let haveUnsavedChanges = $derived(
		initialTheme ? JSON.stringify(theme) !== JSON.stringify(initialTheme) : false
	);

	let optionsRecordId = $state<string | null>(null);
	let spaceId = $state<string | null>(null);
	let previewMode = $state<"light" | "dark">("light");

	let pages = $derived.by(() => getPages());
	let navLinks = $derived(theme.components.primaryNavLinks);

	let navLinkTitle = $state("");
	let navLinkUrl = $state("");
	let navSelectedPage = $state<"selectPage" | "" | string>("selectPage");

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

	// Structure pour stocker les pages groupées par type
	type GroupedPages = {
		[SitePagesSectionOptions.header]: SitePagesResponse[];
		[SitePagesSectionOptions.top]: SitePagesResponse[];
		[SitePagesSectionOptions.leftSide]: SitePagesResponse[];
		[SitePagesSectionOptions.rightSide]: SitePagesResponse[];
		[SitePagesSectionOptions.footer]: SitePagesResponse[];
		[SitePagesSectionOptions.page]: SitePagesResponse[];
	};

	// Groupement des pages par type
	let groupedPages = $derived.by<GroupedPages>(() => {
		const groups: GroupedPages = {
			[SitePagesSectionOptions.header]: [],
			[SitePagesSectionOptions.top]: [],
			[SitePagesSectionOptions.leftSide]: [],
			[SitePagesSectionOptions.rightSide]: [],
			[SitePagesSectionOptions.footer]: [],
			[SitePagesSectionOptions.page]: []
		};

		pages.forEach((page: SitePagesResponse) => {
			const pageSection = page.section;

			if (pageSection && Object.values(SitePagesSectionOptions).includes(pageSection)) {
				groups[pageSection as Exclude<keyof GroupedPages, "page">].push(page);
			} else if (pageSection === SitePagesSectionOptions.page) {
				groups[SitePagesSectionOptions.page].push(page);
			}
		});

		// Trier chaque groupe par la position (pos)
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

	// S'abonner aux mises à jour des pages
	$effect(() => {
		const unsubscribe = subscribeToPagesUpdates(() => {});
		return unsubscribe;
	});

	async function getCurrentAdminSpaceId(): Promise<string | null> {
		const user = pb.authStore.model;
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

	async function handleCreateBlock(blockSection: Partial<SitePagesSectionOptions>) {
		isCreating = true;

		try {
			const title = `bloc_${Date.now()}`;
			const itemsInSection = groupedPages[blockSection] || [];
			const maxPos = itemsInSection.reduce((max: number, item: SitePagesResponse) => {
				const currentPos = typeof item.pos === "number" ? item.pos : -1;
				return Math.max(max, currentPos);
			}, -1);
			const nextPos = maxPos + 1;

			const newPage = await createPad(title, blockSection, {
				pos: nextPos
			});

			currentConfigBlock = newPage.id;
		} catch (e) {
			showAlert(
				`Erreur lors de la création du bloc: ${e instanceof Error ? e.message : e}`,
				"error"
			);
			console.error(e);
		} finally {
			isCreating = false;
		}
	}

	const deletePage = (id: string) => {
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

	async function handleSectionDrop(state: DragDropState<SitePagesResponse>) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		if (!targetContainer || sourceContainer === targetContainer) return;

		const newSectionKey = targetContainer as SitePagesSectionOptions;
		isUpdatingOrder = true;

		const itemsInNewSection = groupedPages[newSectionKey] || [];
		const maxPos = itemsInNewSection.reduce((max: number, item: SitePagesResponse) => {
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

	async function handleItemDrop(
		state: DragDropState<SitePagesResponse>,
		targetItem: SitePagesResponse
	) {
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

	function closeConfigModal() {
		currentConfigSection = null;
		currentConfigBlock = null;
	}

	function getCurrentTheme() {
		return previewMode === "light" ? theme.daisyThemeLight : theme.daisyThemeDark;
	}

	function getBackgroundOptionsForSection() {
		return allBackgroundColors;
	}

	function getTextOptionsForSection() {
		return allTextColors;
	}

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

	function addNavLink() {
		const navLinks = theme.components.primaryNavLinks || [];

		if (navSelectedPage && navSelectedPage !== "selectPage") {
			const page = groupedPages.page.find((p) => p.id === navSelectedPage);
			if (page) {
				theme.components.primaryNavLinks = [
					...navLinks,
					{
						title: page.title || `Page ${page.id.substring(0, 5)}...`,
						url: `/${page.id}`
					}
				];
				navSelectedPage = "selectPage";
			} else {
				showAlert("Page sélectionnée introuvable.", "error");
			}
		} else if (navLinkTitle.trim()) {
			theme.components.primaryNavLinks = [
				...navLinks,
				{
					title: navLinkTitle,
					url: navLinkUrl || "#"
				}
			];
			navLinkTitle = "";
			navLinkUrl = "";
		} else {
			showAlert("Veuillez sélectionner une page ou entrer un titre de lien personnalisé.", "error");
		}
	}

	function removeNavLink(index: number) {
		if (theme.components.primaryNavLinks) {
			theme.components.primaryNavLinks = theme.components.primaryNavLinks.filter(
				(_, i) => i !== index
			);
		}
	}

	function navigateBack() {
		goto("/dashboard/site_pages");
	}
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
								{#each groupedPages[sectionType] as block (block.id)}
									<div
										class="bg-base-100 svelte-dnd-touch-feedback hover:ring-secondary/30 mb-2 flex flex-wrap items-center justify-between rounded-lg border p-2 shadow-sm transition-all duration-200 hover:shadow-md hover:ring-2"
										use:draggable={{
											container: sectionType,
											dragData: block,
											disabled: isUpdatingOrder,
											attributes: {
												draggingClass: "opacity-50 ring-2 ring-primary shadow-lg"
											}
										}}
										use:droppable={{
											container: sectionType,
											callbacks: {
												onDrop: (state) =>
													handleItemDrop(state as DragDropState<SitePagesResponse>, block)
											},
											attributes: {
												dragOverClass: "outline bg-warnig outline-2 outline-offset-2 outline-accent"
											}
										}}
										animate:flip={{ duration: 200 }}
										in:fade={{ duration: 150 }}
										out:fade={{ duration: 150 }}
									>
										<span class="flex flex-grow items-center gap-2 pr-2">
											<GripVertical
												class="text-base-content/30 group-hover:text-base-content/70 cursor-grab transition-colors"
												size={24}
											/>
											<span class="flex-1 truncate" title={block.title}>{block.title}</span>
										</span>
										<div class="flex items-center">
											<button
												class="btn btn-ghost text-error btn-square btn-sm"
												onclick={() => deletePage(block.id)}
											>
												<Trash2 size={16} />
											</button>
											<button
												class="btn btn-ghost btn-square btn-sm"
												onclick={() => (currentConfigBlock = block.id)}
											>
												<Pencil size={16} />
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<button
							class="btn btn-primary btn-sm w-full"
							onclick={() => handleCreateBlock(sectionType)}
							disabled={isCreating}
						>
							{#if isCreating}
								<span class="loading loading-spinner loading-xs"></span> Création...
							{:else}
								<Plus size={16} />
								Ajouter du contenu
							{/if}
						</button>
					{/if}
				{/if}
			</div>
		</div>
	{/snippet}

	<div transition:fade>
		<!-- Header avec navigation -->
		<div class="mb-6 flex flex-wrap items-center gap-4">
			<button class="btn btn-ghost btn-sm" onclick={navigateBack}>
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

		<!-- Configuration du menu de navigation -->
		<Frame title="Menu de navigation">
			<p class="text-base-content/60 mb-4 px-2 text-sm">
				Ces liens apparaissent dans la barre de navigation sur grand écran et dans le menu latéral
				sur petit écran.
			</p>

			<!-- Liste des liens existants -->
			<div class="mb-6">
				<h3 class="mb-4 text-lg font-medium">Liens configurés</h3>
				{#if navLinks.length === 0}
					<div class="py-8 text-center">
						<p class="text-base-content/60">Aucun lien configuré</p>
						<p class="text-base-content/50 text-sm">
							Ajoutez des liens pour créer votre menu de navigation.
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each navLinks as link, index ("navLink" + index)}
							<div class="bg-base-100 flex items-center justify-between rounded-lg border p-3">
								<div class="flex-1">
									<span class="font-medium">{link.title}</span>
									<span class="text-base-content/50 ml-2 text-sm">({link.url})</span>
								</div>
								<button
									class="btn btn-ghost btn-sm text-error"
									onclick={() => removeNavLink(index)}
								>
									<X size={16} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Ajouter un lien -->
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body p-4">
					<div class="mb-4 flex flex-wrap items-center justify-between">
						<div class="text-lg font-medium">Ajouter un lien</div>
						<div class="tabs tabs-boxed">
							<button
								class="tab {navSelectedPage === '' ? 'tab-active' : ''}"
								onclick={() => (navSelectedPage = "")}>Personnalisé</button
							>
							<button
								class="tab {navSelectedPage !== '' ? 'tab-active' : ''}"
								onclick={() => {
									navLinkTitle = "";
									navLinkUrl = "";
									if (navSelectedPage === "") navSelectedPage = "selectPage";
								}}>Page existante</button
							>
						</div>
					</div>

					<div class="flex flex-wrap items-end gap-4">
						{#if navSelectedPage !== ""}
							<!-- Sélection d'une page existante -->
							<div class="form-control flex-1">
								<label class="label" for="pagesSelect">
									<span class="label-text">Sélectionner une page générale</span>
								</label>
								<select
									id="pagesSelect"
									class="select select-bordered w-full"
									bind:value={navSelectedPage}
								>
									<option value="selectPage" disabled>Choisir une page...</option>
									{#each groupedPages.page as page (page.id)}
										<option value={page.id}
											>{page.title || `Page sans titre (${page.id.substring(0, 5)})`}</option
										>
									{/each}
								</select>
							</div>
						{:else}
							<!-- Lien personnalisé -->
							<div class="form-control min-w-56 flex-1">
								<label class="label" for="customNavLinkTitle">
									<span class="label-text">Titre du lien</span>
								</label>
								<input
									id="customNavLinkTitle"
									type="text"
									class="input input-bordered"
									bind:value={navLinkTitle}
									placeholder="Titre du lien"
								/>
							</div>
							<div class="form-control min-w-56 flex-1">
								<label class="label" for="customNavLinkUrl">
									<span class="label-text">URL</span>
								</label>
								<input
									id="customNavLinkUrl"
									type="text"
									class="input input-bordered"
									bind:value={navLinkUrl}
									placeholder="/contact ou https://..."
								/>
							</div>
						{/if}
						<button class="btn btn-primary btn-sm ms-auto" onclick={addNavLink}>
							<Plus size={16} />
							Ajouter
						</button>
					</div>
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
	{#if currentConfigSection}
		{@const configSectionKey = getSectionConfigKey(currentConfigSection)}
		{@const sectionStyle = configSectionKey && theme.layoutSections[configSectionKey]}

		<ConfigModal
			title={`Configuration de la section ${
				currentConfigSection === SitePagesSectionOptions.header
					? "Entête"
					: currentConfigSection === SitePagesSectionOptions.leftSide
						? "Sidebar Gauche"
						: currentConfigSection === SitePagesSectionOptions.rightSide
							? "Sidebar Droite"
							: "Pied de page"
			}`}
			onClose={closeConfigModal}
		>
			<div data-theme={getCurrentTheme()}>
				<fieldset class="border-base-content/20 mb-4 rounded border p-4">
					<legend class="px-2 font-medium">Apparence</legend>

					<!-- Classe Fond (bg) -->
					<div class="mb-8">
						<div class="text-base-content mb-2 font-medium">Couleur de fond</div>
						<div
							class="bg-base-200/50 grid grid-cols-3 gap-2 rounded-lg p-2 sm:grid-cols-5 md:grid-cols-6"
						>
							{#each getBackgroundOptionsForSection() as option (option.value)}
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
							{#each getTextOptionsForSection() as option (option)}
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
				</fieldset>
			</div>

			<div slot="actions">
				<button
					class="btn btn-primary"
					onclick={() => {
						saveTheme();
						closeConfigModal();
					}}
				>
					Enregistrer
				</button>
			</div>
		</ConfigModal>
	{/if}

	{#if currentConfigBlock}
		<Modal>
			<PageBlockEditor
				docId={currentConfigBlock}
				onClose={() => {
					closeConfigModal();
				}}
			/>
		</Modal>
	{/if}

	{#if navbarConfigModalOpen}
		<ConfigModal
			title="Configuration de la barre de navigation"
			onClose={() => {
				saveTheme();
				navbarConfigModalOpen = false;
			}}
		>
			<NavBarHeaderConfig bind:navbarHeaderConfig={theme.components.navbarHeader} />
		</ConfigModal>
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

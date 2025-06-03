<script lang="ts">
	import {
		subscribeToPagesUpdates,
		getPages,
		createPad,
		deletePad
	} from "$lib/shared/sitePageStore.svelte";

	import type { PublicEventInfo } from "$lib/shared/publicStore.svelte";

	import { showAlert, modalState } from "$lib/shared/states.svelte";

	import { pb } from "$lib/pocketbase.svelte";
	import { SitePagesSectionOptions, type SitePagesResponse } from "$lib/types/pocketbase";

	import { modifyRecord } from "$lib/pocketbase.svelte";

	import { format } from "date-fns";
	import { fr } from "date-fns/locale";
	import { goto } from "$app/navigation";

	import { AlertCircle, GripVertical, Pencil, Trash2, Palette, Sun, Moon, X } from "lucide-svelte";
	import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";
	import { fade, slide } from "svelte/transition";
	import { flip } from "svelte/animate";

	import ConfigModal from "./components/ConfigModal.svelte";
	import NavBarHeaderConfig from "./components/NavBarHeaderConfig.svelte";

	import ColorSelect from "$lib/components/ColorSelect.svelte";
	import PublicEventCard from "$lib/components/public/PublicEventCard.svelte";
	import PageBlockEditor from "$lib/components/public/PageBlockEditor.svelte";
	import Modal from "$lib/components/Modal.svelte";

	import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";
	import { onMount } from "svelte";
	import "/src/daisy.css";

	let isLoading = $state(true);
	let newPageTitle = $state("");
	let isCreating = $state(false);
	let isUpdatingOrder = $state(false);
	let error = $state<string | null>(null);

	let currentConfigSection = $state<SitePagesSectionOptions | null>(null);
	let currentConfigBlock = $state<string | null>(null);
	let themeModalOpen = $state(false);
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

	const allBackgroundColors = [
		{ value: "bg-base-100", label: "Fond principal", color: "base-100" },
		{ value: "bg-base-200", label: "Fond secondaire", color: "base-200" },
		{ value: "bg-base-300", label: "Fond tertiaire", color: "base-300" },
		{ value: "bg-neutral", label: "Neutre", color: "neutral" },
		// { value: 'bg-gray-800', label: 'Gray-dark', color: 'gray-800' },
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

	// Options pour les tailles de texte fluide
	const fluidTextSizes = [
		{ value: "text-fluid-xs", label: "Très petit (XS)" },
		{ value: "text-fluid-sm", label: "Petit (SM)" },
		{ value: "text-fluid-base", label: "Base" },
		{ value: "text-fluid-lg", label: "Grand (LG)" },
		{ value: "text-fluid-xl", label: "Très grand (XL)" },
		{ value: "text-fluid-2xl", label: "Énorme (2XL)" },
		{ value: "text-fluid-3xl", label: "Gigantesque (3XL)" }
	];

	// Options pour les arrondis
	const roundedOptions = [
		{ value: "rounded-none", label: "Aucun" },
		{ value: "rounded-sm", label: "Petit" },
		{ value: "rounded-md", label: "Moyen" },
		{ value: "rounded-lg", label: "Grand" },
		{ value: "rounded-xl", label: "Très grand" },
		{ value: "rounded-2xl", label: "Énorme" }
	];

	// Options pour les ombres
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
	const sampleEvent: Partial<PublicEventInfo> = {
		id: "example-id",
		event_title: "Soirée découverte - Exemple de carte",
		desc_public: `<p>Ceci est un exemple de description d'événement qui peut être formaté en HTML.
		              C'est une prévisualisation pour montrer comment votre thème s'appliquera aux cartes d'événements.</p>
		              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin euismod,
		              nunc eget ultricies tincidunt, nunc nunc tincidunt metus, vitae faucibus velit nunc ac risus.</p>`,
		date_event: new Date().toISOString(),
		start_event: "19:30",
		start_public: "19:00",
		prix: "5€",
		is_prix_libre: false,
		isMixiteChoisie: false,
		mixite: "",
		is_age_no_restriction: true,
		age_advice: "",
		canceled: false,
		categories: ["Atelier", "Culture"]
	};

	// Charger les options existantes au montage
	onMount(async () => {
		spaceId = await getCurrentAdminSpaceId();

		if (!spaceId) {
			showAlert("Impossible de déterminer votre espace. Vérifiez vos permissions.", "error");
			return;
		}

		try {
			// Essayer de récupérer l'enregistrement d'options pour cet espace
			const optionsRecord = await pb
				.collection("spaces_options")
				.getFirstListItem(`space = "${spaceId}"`);
			optionsRecordId = optionsRecord.id;

			// Fusionner les options chargées avec les défauts
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

			// S'assurer que daisyThemeLight et daisyThemeDark existent
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
				theme = getDefaultThemeOptions(); // Utiliser les valeurs par défaut
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
		// Nettoyage à la destruction du composant
		return unsubscribe;
	});

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
			} else {
				// Note: Les pages de section 'page' sont déjà gérées séparément en bas,
				// if (pageSection !== SitePagesSectionOptions.page) {
				// 	groups.other.push(page);
				// }
			}
		});

		// Trier chaque groupe par la position (pos)
		for (const key in groups) {
			// Vérification que la clé appartient bien aux types attendus
			if (Object.values(SitePagesSectionOptions).includes(key as SitePagesSectionOptions)) {
				const groupKey = key as Exclude<keyof GroupedPages, "other">;
				groups[groupKey].sort((a, b) => {
					const posA = typeof a.pos === "number" ? a.pos : Infinity;
					const posB = typeof b.pos === "number" ? b.pos : Infinity;
					// Si les positions sont égales (ou toutes deux Infinity), trier par date de création comme fallback
					if (posA === posB) {
						return new Date(a.created).getTime() - new Date(b.created).getTime();
					}
					return posA - posB;
				});
			}
		}
		console.log("Grouped pages:", groups);
		return groups;
	});

	// --- Fonctions ---

	async function handleCreatePage() {
		if (!newPageTitle.trim()) {
			showAlert("Le titre de la page ne peut pas être vide", "error");
			return;
		}

		isCreating = true;

		try {
			console.log(newPageTitle);

			const newPage = await createPad(newPageTitle, SitePagesSectionOptions.page);
			newPageTitle = "";
			// Rediriger vers la page nouvellement créée
			goto(`/dashboard/site_pages/${newPage.id}`);
		} catch (e) {
			showAlert("Erreur lors de la création de la page", "error");
			console.error(e);
		} finally {
			isCreating = false;
		}
	}

	async function handleCreateBlock(blockSection: Partial<SitePagesSectionOptions>) {
		isCreating = true;

		try {
			const title = `bloc_${Date.now()}`;
			// --- Calcul de la prochaine position ---

			const itemsInSection = groupedPages[blockSection] || [];
			const maxPos = itemsInSection.reduce((max: number, item: SitePagesResponse) => {
				const currentPos = typeof item.pos === "number" ? item.pos : -1;
				return Math.max(max, currentPos);
			}, -1); // Base -1 pour que la première position soit 0
			const nextPos = maxPos + 1;
			// --- Fin du Calcul ---

			console.log(title, blockSection);
			const newPage = await createPad(title, blockSection, {
				pos: nextPos
			});

			// FIX: on utilise plutot un modal
			// Rediriger vers la page nouvellement créée
			// goto(`/dashboard/site_pages/${newPage.id}`);
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
				title: "Supprimer la page",
				message: "Êtes vous sure de vouloir supprimer cette page ? Cette action est définitive",
				variant: "warning",
				onConfirm: async () => {
					console.log("try to delete", id);
					try {
						await deletePad(id);
						modalState.confirm.isOpen = false;
						showAlert("Page supprimée", "success");
					} catch (e) {
						showAlert(`Erreur lors de la suppression (${e})`, "error");
						modalState.confirm.isOpen = false;
					}
				}
			}
		};
	};

	// Fonction pour gérer le drop d'une section
	async function handleSectionDrop(state: DragDropState<SitePagesResponse>) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		// Vérifie si la cible est valide et différente de la source
		if (!targetContainer || sourceContainer === targetContainer) return;

		const newSectionKey = targetContainer as SitePagesSectionOptions;

		isUpdatingOrder = true; // Indiquer une opération en cours

		// --- Calcul de la prochaine position dans la *nouvelle* section ---
		const itemsInNewSection = groupedPages[newSectionKey] || [];
		const maxPos = itemsInNewSection.reduce((max: number, item: SitePagesResponse) => {
			const currentPos = typeof item.pos === "number" ? item.pos : -1;
			return Math.max(max, currentPos);
		}, -1);
		const nextPos = maxPos + 1;
		// --- Fin du Calcul ---

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

	// Gestion le drop sur un item (réordonnancement *intra*-section)
	// XXX → simplifiable ? Trop de verif inutile ?
	async function handleItemDrop(
		state: DragDropState<SitePagesResponse>,
		targetItem: SitePagesResponse
	) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		// 1. Vérifications initiales
		if (!targetContainer || !sourceContainer || sourceContainer !== targetContainer) {
			// Ne devrait pas arriver si 'disabled' est bien configuré sur le droppable de l'item,
			// mais sécurité supplémentaire. Géré par handleSectionDrop si containers différents.
			console.log("Item drop ignored: different containers or no target container.");
			return;
		}
		if (draggedItem.id === targetItem.id) {
			console.log("Item drop ignored: dropped on itself.");
			return; // On ne peut pas se déposer sur soi-même
		}
		// Vérifie que le type de container est valide pour le réordonnancement
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

		isUpdatingOrder = true; // Indiquer une opération en cours

		// 2. Préparer la nouvelle liste ordonnée
		const itemsInSection = [...(groupedPages[sectionType] || [])]; // Copie mutable
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

		// Retirer l'élément déplacé
		const [movedItem] = itemsInSection.splice(draggedIndex, 1);
		// Réinsérer l'élément avant l'élément cible
		// Ajuster l'index d'insertion si l'élément a été retiré d'avant la cible
		const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
		itemsInSection.splice(insertIndex, 0, movedItem);

		// 3. Préparer les mises à jour pour PocketBase
		const updates: { id: string; data: { pos: number } }[] = itemsInSection.map((item, index) => ({
			id: item.id,
			data: { pos: index } // Nouvelle position = index dans la liste réordonnée
		}));

		console.log(
			`Réordonnancement dans ${sectionType}. Nouvel ordre (IDs):`,
			updates.map((u) => u.id)
		);
		console.log(`Mises à jour 'pos' à envoyer:`, updates);

		// 4. Envoyer les mises à jour à PocketBase
		try {
			// Utiliser Promise.all pour envoyer toutes les mises à jour en parallèle
			await Promise.all(
				updates.map((update) => modifyRecord("site_pages", update.id, update.data))
			);
			// showAlert('Ordre des blocs mis à jour', 'success');
			// L'UI se mettra à jour via l'abonnement au store `pages` qui déclenchera le recalcul de `groupedPages`
		} catch (error) {
			console.error("Erreur lors de la mise à jour de l'ordre des blocs:", error);
			showAlert("Erreur lors de la mise à jour de l'ordre", "error");
			// L'abonnement resynchronisera avec l'état potentiellement incohérent de la DB.
			// Une gestion d'erreur plus poussée pourrait être nécessaire pour la robustesse.
		} finally {
			isUpdatingOrder = false;
		}
	}

	// Fonction pour récupérer l'ID de l'espace actuel et charger les options existantes
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

	// Sauvegarder les modifications de thème
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
			// Mettre à jour initialTheme après une sauvegarde réussie
			initialTheme = theme;
			// theme = savedRecord.publicSiteTheme as PublicSiteThemeOptions;
			showAlert("Apparence sauvegardée avec succès !", "success");
		} catch (e: unknown) {
			console.error("Erreur lors de la sauvegarde de l'apparence:", e);
			showAlert(
				`Erreur sauvegarde: ${typeof e === "object" && e !== null && "message" in e && e.message}`,
				"error"
			);
		}
	}

	// Fonction pour fermer le modal de configuration
	function closeConfigModal() {
		currentConfigSection = null;
		currentConfigBlock = null;
	}

	// Calculer le thème actif en fonction du mode
	function getCurrentTheme() {
		return previewMode === "light" ? theme.daisyThemeLight : theme.daisyThemeDark;
	}

	// --- fonctions utilitaires ---

	// Fonction pour obtenir les options de couleur pour une section
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
				return "top"; // Ex: 'top' n'a pas de config dédiée dans layoutSections
		}
	}

	function addNavLink() {
		// Référence directe à theme.components.primaryNavLinks
		const navLinks = theme.components.primaryNavLinks || [];

		// Si une page est sélectionnée
		if (navSelectedPage && navSelectedPage !== "selectPage") {
			const page = groupedPages.page.find((p) => p.id === navSelectedPage); // Utiliser groupedPages.page
			if (page) {
				// Utilisation de l'assignation directe car 'theme' est $state
				theme.components.primaryNavLinks = [
					...navLinks,
					{
						title: page.title || `Page ${page.id.substring(0, 5)}...`, // Titre par défaut plus clair
						url: `/${page.id}` // URL relative à la racine du site public (supposant que c'est le slug)
						// TODO: Confirmer la structure de l'URL publique des pages
					}
				];
				navSelectedPage = "selectPage"; // Réinitialiser la sélection
			} else {
				showAlert("Page sélectionnée introuvable.", "error");
			}
		}
		// Sinon utiliser le titre et l'URL personnalisés
		else if (navLinkTitle.trim()) {
			theme.components.primaryNavLinks = [
				...navLinks,
				{
					title: navLinkTitle,
					url: navLinkUrl || "#" // URL par défaut si vide
				}
			];
			navLinkTitle = "";
			navLinkUrl = "";
		} else {
			showAlert("Veuillez sélectionner une page ou entrer un titre de lien personnalisé.", "error");
		}
	}

	// Supprimer un lien de la barre de navigation
	function removeNavLink(index: number) {
		if (theme.components.primaryNavLinks) {
			theme.components.primaryNavLinks = theme.components.primaryNavLinks.filter(
				(_, i) => i !== index
			);
		}
	}

	function formatDate(dateString: string) {
		return format(new Date(dateString), "dd MMMM yyyy à HH:mm", { locale: fr });
	}
</script>

{$inspect("themeLoaded", { theme })}
{$inspect("initialTheme", { initialTheme })}

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

	{#snippet blockSection(sectionType: SitePagesSectionOptions, sectionLabel: string)}
		{@const sectionConfigKey = getSectionConfigKey(sectionType)}

		{@const sectionStyle = sectionConfigKey && theme.layoutSections[sectionConfigKey]}
		{@const isHeader = sectionType === SitePagesSectionOptions.header}

		<div
			style:background-color={undefined}
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
						class="btn btn-primary btn-square"
						onclick={() => (currentConfigSection = sectionType)}
						title="Configurer l'apparence"
					>
						<Palette size={16} />
					</button>
				</div>
				<div class="flex flex-col gap-y-1">
					<!-- Ajouter un bouton pour configurer le NavBarHeader si c'est la section header -->
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
											<!-- Icône de drag handle -->
											<GripVertical
												class="text-base-content/30 group-hover:text-base-content/70 cursor-grab transition-colors"
												size={24}
											/>
											<span class="flex-1 truncate" title={block.title}>{block.title}</span>
										</span>
										<div class="flex items-center">
											<button
												class="btn btn-ghost text-error btn-square"
												onclick={() => deletePage(block.id)}
												><Trash2 size={16} />
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
							class="btn btn-primary w-full"
							onclick={() => handleCreateBlock(sectionType)}
							disabled={isCreating}
						>
							{#if isCreating}
								<span class="loading loading-spinner loading-xs"></span> Création...
							{:else}
								Ajouter du contenu
							{/if}
						</button>
					{/if}
				{/if}
			</div>
		</div>
	{/snippet}
	<div transition:fade>
		<div class="container mx-auto px-4 py-8">
			<h1 class="mb-6 text-3xl font-bold">Configuration du site public</h1>

			<!-- --- Section de configuration du thème général --- -->
			<fieldset class="border-base-content/20 mb-12 rounded-lg border px-4 py-8">
				<legend class="text-fluid-lg px-2 font-medium">Thème du site</legend>
				<div class="flex flex-wrap items-center justify-between">
					<!-- Bouton pour basculer entre aperçu light/dark -->
					<div class="mb-4 flex items-center gap-2">
						<span class="text-sm">Aperçu:</span>
						<div class="join rounded-md border">
							<button
								class="join-item btn btn-sm ${previewMode === 'light' ? 'btn-active' : ''}"
								onclick={() => (previewMode = "light")}
							>
								<Sun size={16} />
							</button>
							<button
								class="join-item btn btn-sm ${previewMode === 'dark' ? 'btn-active' : ''}"
								onclick={() => (previewMode = "dark")}
							>
								<Moon size={16} />
							</button>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 justify-items-center md:grid-cols-2">
					<div class="  bg-base-100 relative grid-cols-3 gap-6 rounded-lg border">
						<!-- Thème clair actuel -->
						<div class="p-4">
							<div class="mb-2 flex items-center text-sm font-medium">
								<Sun size={16} class="mr-2" />
								Thème clair: {theme.daisyThemeLight}
							</div>
							{@render daisy_theme(theme.daisyThemeLight, "light")}
						</div>

						<!-- Thème sombre actuel -->
						<div class="p-4">
							<div class="mb-2 flex items-center text-sm font-medium">
								<Moon size={16} class="mr-2" />
								Thème sombre: {theme.daisyThemeDark}
							</div>
							{@render daisy_theme(theme.daisyThemeDark, "dark")}
						</div>
						<div class="bg-base-100/50 inset-0 flex items-end justify-end p-4">
							<button class="btn btn-primary" onclick={() => (themeModalOpen = true)}>
								Changer de thème
							</button>
						</div>
					</div>

					<!-- Mode par défaut -->
					<div class="flex flex-col gap-6">
						<div>
							<div class="mb-2 font-medium">Mode par défaut</div>
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
						</div>
						<!-- Fond principal -->
						<div class="">
							<ColorSelect
								id="main-bg-class"
								options={getBackgroundOptionsForSection()}
								label="Fond général"
								bind:value={theme.layoutSections.mainBackgroundClass}
							/>
						</div>
					</div>
				</div>
			</fieldset>

			<!-- --- Section de création de blocs --- -->
			<section class="mb-12">
				<fieldset class="border-base-content/20 mb-4 rounded-lg border px-4 py-8">
					<legend class="text-fluid-lg px-2 font-medium">Organisation des sections</legend>

					<!--
                Layout Grid pour les écrans larges (lg et plus)
                - Header et Footer prennent toute la largeur (col-span-3)
                - Left et Right Sidebars dans leurs colonnes respectives
                Layout Colonne simple pour les écrans petits (par défaut)
            -->
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

						<!-- Zone centrale (peut contenir d'autres éléments ou rester vide) -->
						<div
							class="border-base-content/30 rounded border border-dashed p-4 text-center lg:col-start-2 lg:row-start-2"
						>
							<p class="text-base-content/60">Zone de contenu principal (non gérée ici)</p>
							<p class="text-base-content/50 text-sm">
								Utilisez cette zone pour prévisualiser la structure ou ajouter d'autres contrôles.
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
				</fieldset>
			</section>

			<!-- --- Configuration du menu Navlink -->
			<fieldset
				class="rounded-box border-base-300 mt-2 mb-4 rounded border p-4 shadow-sm"
				transition:slide
			>
				<legend class="text-fluid-lg n px-2 font-medium"> Liens du menu principal </legend>
				<p class="text-base-content/60 mb-4 px-2 text-xs">
					Ces liens apparaissent dans la barre sur grand écran et dans le menu latéral sur petit
					écran.
				</p>
				<!-- Liste des liens existants -->
				<div class="mb-4 overflow-x-auto">
					{#if navLinks.length === 0}
						<p class="text-base-content/60 py-2 text-center">Aucun lien configuré</p>
					{:else}
						<div class="space-y-2">
							{#each navLinks as link, index ("navLink" + index)}
								<div class="bg-base-100 flex items-center justify-between rounded p-2">
									<span class="flex-1 pr-2 italic">{link.title}</span>
									<span class="text-base-content/50 mr-2 text-xs">({link.url})</span>
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
				<div class="card bg-base-200 mb-4 p-4">
					<div class="mb-4 flex flex-wrap items-center justify-between">
						<div class="font-medium">Ajouter un lien</div>
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

					<div class="flex items-end gap-4">
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
									<!-- 👉 Utiliser groupedPages.page ici -->
									{#each groupedPages.page as page (page.id)}
										<option value={page.id}
											>{page.title || `Page sans titre (${page.id.substring(0, 5)})`}</option
										>
									{/each}
								</select>
							</div>
						{:else}
							<!-- Lien personnalisé -->
							<div class="form-control flex-1">
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
							<div class="form-control flex-1">
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
						<button class="btn btn-primary btn-sm" onclick={addNavLink}>Ajouter</button>
						<!-- btn-sm -->
					</div>
				</div>
			</fieldset>

			<!-- --- Section Configuration de carte d'événement --- -->
			<fieldset class="border-base-content/20 mb-12 rounded-lg border px-4 py-8">
				<legend class="text-fluid-lg px-2 font-medium">Configuration d'une carte événement</legend>
				<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Position Image -->
					<div class="form-control w-full">
						<label class="label" for="image-pos">
							<span class="label-text font-medium">Position de l'image</span>
						</label>
						<div class="flex gap-4">
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
					</div>

					<!-- Couleur de fond -->
					<ColorSelect
						id="bg-color"
						bind:value={theme.eventCard.bgClass}
						options={getBackgroundOptionsForSection()}
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
						<label class="label" for="card-width">
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
				<div class="divider mt-12">
					<div class="text-fluid-lg font-semibold">Aperçu d'une carte événement</div>
				</div>

				<div class="mb-4 flex items-center justify-between"></div>
				<div
					class="{theme.layoutSections.mainBackgroundClass}  rounded-lg p-8"
					data-theme={getCurrentTheme()}
				>
					<!-- FIXIT image exemple -->
					<PublicEventCard
						event={sampleEvent}
						spaceName="example-space"
						cardOptions={theme.eventCard}
						eventImageUrl="https://placehold.co/600x400?text=Exemple+Image"
					/>
				</div>
			</fieldset>

			{#if error}
				<div role="alert" class="alert alert-error mb-6">
					<AlertCircle class="h-6 w-6" />
					<span>{error}</span>
				</div>
			{/if}

			<div class="divider my-12"></div>

			<!-- --- Liste des pages générales --- -->
			<section>
				<h2 class="mb-6 text-2xl font-semibold">Pages</h2>
				{#if isLoading}
					<div class="flex justify-center py-12">
						<span class="loading loading-dots loading-lg"></span>
					</div>
				{:else if groupedPages["page"].length === 0}
					<p class="text-base-content/70 text-center">Aucune page générale trouvée.</p>
				{:else}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each groupedPages["page"] as page (page.id)}
							{#key page.updated}
								<!-- Re-render l'élément si 'updated' change -->
								<a
									href={`/dashboard/site_pages/${page.id}`}
									class="card bg-base-100 shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
								>
									<div class="card-body">
										<h3 class="card-title text-fluid-xl truncate" title={page.title}>
											{page.title}
										</h3>
										{#if page.section}
											<div class="mt-1">
												<!-- Ajout d'index pour la clé dans chaque -->
												<span class="badge badge-outline badge-sm mr-1">{page.section}</span>
											</div>
										{/if}
										<p class="text-base-content/60 mt-2 text-xs">
											Créé le {formatDate(page.created as string)}
										</p>
										<p class="text-base-content/60 text-xs">
											Dernière modification: {formatDate(page.updated as string)}
										</p>
										<div class="card-actions mt-4 justify-end">
											<button class="btn btn-sm btn-outline">Ouvrir</button>
										</div>
									</div>
								</a>
							{/key}
						{/each}
					</div>
				{/if}
			</section>

			<!-- Ajouter un nouveau bouton de création sous la liste existante -->
			<div class="card bg-base-200 mx-auto mt-8 mb-8 max-w-lg p-4 shadow-md">
				<div class="card-body p-4">
					<h2 class="card-title text-fluid-xl mb-2">Créer une nouvelle page générale</h2>
					<div class="flex flex-col gap-2 sm:flex-row">
						<input
							type="text"
							class="input input-bordered w-full"
							placeholder="Titre de la nouvelle page"
							bind:value={newPageTitle}
							onkeydown={(e) => e.key === "Enter" && handleCreatePage()}
							disabled={isCreating}
						/>
						<button
							class="btn btn-primary sm:w-auto"
							onclick={() => handleCreatePage()}
							disabled={isCreating || !newPageTitle.trim()}
						>
							{#if isCreating}
								<span class="loading loading-spinner loading-xs"></span> Création...
							{:else}
								Créer
							{/if}
						</button>
					</div>
				</div>
			</div>
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
								theme = initialTheme; // Utiliser deep clone pour restaurer ? JSON.parse(JSON.stringify(initialTheme)
							} else {
								theme = getDefaultThemeOptions();
							}
						}}
						class="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
					>
						Annuler
					</button>
					<button
						type="button"
						onclick={saveTheme}
						class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Enregistrer
					</button>
				</div>
			{/if}
		</div>
		<!-- Modals -->
		{#if themeModalOpen}
			<ConfigModal title="Sélection des thèmes" onClose={() => (themeModalOpen = false)}>
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

				<div slot="actions">
					<button
						class="btn btn-primary"
						onclick={() => {
							saveTheme();
							themeModalOpen = false;
						}}
					>
						Enregistrer
					</button>
				</div>
			</ConfigModal>
		{/if}

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
									{@const bgClass = sectionStyle?.textClass || "bg-base-100"}

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
				title="Configuration de la headerBar"
				onClose={() => {
					saveTheme();
					navbarConfigModalOpen = false;
				}}
			>
				<NavBarHeaderConfig bind:navbarHeaderConfig={theme.components.navbarHeader} />
			</ConfigModal>
		{/if}
	</div>
{:else}
	<div class="flex justify-center py-12">
		<span class="loading loading-dots loading-lg">chargement</span>
	</div>
{/if}

<style>
	/* Styles pour le drag and drop → Non utilisé ?*/
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

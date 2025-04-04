<script lang="ts">
	import { subscribeToPagesUpdates, getPages, createPad, deletePad } from './sitePageStore.svelte';
	import type { SitePagesResponse } from '$lib/types/pocketbase.ts';
	import { SitePagesSectionOptions } from '$lib/types/pocketbase.js';
	import { showAlert } from '$lib/shared/states.svelte';
	import { modalState } from '$lib/shared/states.svelte';
	import { modifyRecord } from '$lib/pocketbase.svelte';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { goto } from '$app/navigation';
	import { AlertCircle, GripVertical, Pencil, Trash2 } from 'lucide-svelte';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	let isLoading = $state(true);
	let newPageTitle = $state('');
	let isCreating = $state(false);
	let isUpdatingOrder = $state(false);
	let error = $state<string | null>(null);

	let pages = $derived.by(() => getPages());

	// S'abonner aux mises à jour des pages
	$effect(() => {
		const unsubscribe = subscribeToPagesUpdates(() => {});
		// Nettoyage à la destruction du composant
		return unsubscribe;
	});

	$effect(() => {
		// Ce $effect s'exécute lorsque `pages` change.
		// Si isLoading est true ET que pages est devenu un tableau (même vide),
		// cela signifie que le chargement initial depuis le store est terminé.
		if (isLoading && Array.isArray(pages)) {
			isLoading = false;
		}
	});

	// Structure pour stocker les pages groupées par type
	type GroupedPages = {
		[SitePagesSectionOptions.header]: SitePagesResponse[];
		[SitePagesSectionOptions.left_side]: SitePagesResponse[];
		[SitePagesSectionOptions.right_side]: SitePagesResponse[];
		[SitePagesSectionOptions.footer]: SitePagesResponse[];
		[SitePagesSectionOptions.page]: SitePagesResponse[];
		other: SitePagesResponse[];
	};

	// Groupement des pages par type
	let groupedPages = $derived.by<GroupedPages>(() => {
		const groups: GroupedPages = {
			[SitePagesSectionOptions.header]: [],
			[SitePagesSectionOptions.left_side]: [],
			[SitePagesSectionOptions.right_side]: [],
			[SitePagesSectionOptions.footer]: [],
			[SitePagesSectionOptions.page]: [],
			other: []
		};

		pages.forEach((page: SitePagesResponse) => {
			const pageSection = page.section;

			// 👉 Utilisation de SitePagesSectionOptions pour vérifier si la section est valide
			if (pageSection && Object.values(SitePagesSectionOptions).includes(pageSection)) {
				// 👉 Vérification plus stricte de la section
				groups[pageSection as Exclude<keyof GroupedPages, 'other'>].push(page);
			} else if (pageSection === SitePagesSectionOptions.page) {
				groups[SitePagesSectionOptions.page].push(page);
			} else {
				// Note: Les pages de section 'page' sont déjà gérées séparément en bas,
				if (pageSection !== SitePagesSectionOptions.page) {
					groups.other.push(page);
				}
			}
		});

		// Trier chaque groupe par la position (pos)
		for (const key in groups) {
			// 👉 Vérification que la clé appartient bien aux types attendus
			if (
				key !== 'other' &&
				Object.values(SitePagesSectionOptions).includes(key as SitePagesSectionOptions)
			) {
				const groupKey = key as Exclude<keyof GroupedPages, 'other'>;
				// 👉 Tri plus robuste, gérant les pos undefined/null
				groups[groupKey].sort((a, b) => {
					const posA = typeof a.pos === 'number' ? a.pos : Infinity;
					const posB = typeof b.pos === 'number' ? b.pos : Infinity;
					// Si les positions sont égales (ou toutes deux Infinity), trier par date de création comme fallback
					if (posA === posB) {
						return new Date(a.created).getTime() - new Date(b.created).getTime();
					}
					return posA - posB;
				});
			}
		}
		console.log('Grouped pages:', groups);
		return groups;
	});

	async function handleCreatePage() {
		if (!newPageTitle.trim()) {
			showAlert('Le titre de la page ne peut pas être vide', 'error');
			return;
		}

		isCreating = true;

		try {
			console.log(newPageTitle);

			const newPage = await createPad(newPageTitle, 'site_pages', SitePagesSectionOptions.page);
			newPageTitle = '';
			// Rediriger vers la page nouvellement créée
			goto(`/dashboard/site_pages/${newPage.id}`);
		} catch (e) {
			showAlert('Erreur lors de la création de la page', 'error');
			console.error(e);
		} finally {
			isCreating = false;
		}
	}

	async function handleCreateBlock(blockSection: SitePagesSectionOptions) {
		isCreating = true;
		try {
			const title = `bloc_${Date.now()}`;
			// --- Calcul de la prochaine position ---
			const itemsInSection = groupedPages[blockSection] || [];
			const maxPos = itemsInSection.reduce((max, item) => {
				const currentPos = typeof item.pos === 'number' ? item.pos : -1;
				return Math.max(max, currentPos);
			}, -1); // Base -1 pour que la première position soit 0
			const nextPos = maxPos + 1;
			// --- Fin du Calcul ---

			console.log(title, blockSection);
			const newPage = await createPad(title, 'site_pages', blockSection, {
				pos: nextPos
			});

			// Rediriger vers la page nouvellement créée
			goto(`/dashboard/site_pages/${newPage.id}`);
		} catch (e) {
			showAlert(
				`Erreur lors de la création du bloc: ${e instanceof Error ? e.message : e}`,
				'error'
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
				title: 'Supprimer la page',
				message: 'Êtes vous sure de vouloir supprimer cette page ? Cette action est définitive',
				variant: 'warning',
				onConfirm: async () => {
					console.log('try to delete', id);
					try {
						await deletePad(id);
						modalState.confirm.isOpen = false;
						showAlert('Page supprimée', 'success');
					} catch (e) {
						showAlert(`Erreur lors de la suppression (${e})`, 'error');
						modalState.confirm.isOpen = false;
					}
				}
			}
		};
	};

	// 👉 Fonction pour gérer le drop d'une section
	async function handleSectionDrop(state: DragDropState<any>) {
		const { draggedItem, sourceContainer, targetContainer } = state;

		// Vérifie si la cible est valide et différente de la source
		if (!targetContainer || sourceContainer === targetContainer) return;

		const oldSection = sourceContainer as SitePagesSectionOptions;
		const newSection = targetContainer as SitePagesSectionOptions;

		isUpdatingOrder = true; // Indiquer une opération en cours

		// --- Calcul de la prochaine position dans la *nouvelle* section ---
		const itemsInNewSection = groupedPages[newSection] || [];
		const maxPos = itemsInNewSection.reduce((max, item) => {
			const currentPos = typeof item.pos === 'number' ? item.pos : -1;
			return Math.max(max, currentPos);
		}, -1);
		const nextPos = maxPos + 1;
		// --- Fin du Calcul ---

		try {
			await modifyRecord('site_pages', draggedItem.id, {
				section: targetContainer,
				pos: nextPos
			});
		} catch (error) {
			console.error('Erreur lors du déplacement du bloc:', error);
			showAlert('Erreur lors du déplacement du bloc', 'error');
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
			console.log('Item drop ignored: different containers or no target container.');
			return;
		}
		if (draggedItem.id === targetItem.id) {
			console.log('Item drop ignored: dropped on itself.');
			return; // On ne peut pas se déposer sur soi-même
		}
		// Vérifie que le type de container est valide pour le réordonnancement
		const sectionType = targetContainer as SitePagesSectionOptions;
		if (
			!sectionType ||
			sectionType === SitePagesSectionOptions.page ||
			!Object.values(SitePagesSectionOptions).includes(sectionType)
		) {
			console.error('Tentative de réordonnancement dans une section invalide:', sectionType);
			showAlert("Le réordonnancement n'est pas autorisé dans cette section.", 'error');
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
			showAlert('Erreur lors de la préparation du réordonnancement.', 'error');
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
				updates.map((update) => modifyRecord('site_pages', update.id, update.data))
			);
			// showAlert('Ordre des blocs mis à jour', 'success');
			// L'UI se mettra à jour via l'abonnement au store `pages` qui déclenchera le recalcul de `groupedPages`
		} catch (error) {
			console.error("Erreur lors de la mise à jour de l'ordre des blocs:", error);
			showAlert("Erreur lors de la mise à jour de l'ordre", 'error');
			// L'abonnement resynchronisera avec l'état potentiellement incohérent de la DB.
			// Une gestion d'erreur plus poussée pourrait être nécessaire pour la robustesse.
		} finally {
			isUpdatingOrder = false;
		}
	}

	// --- fonctions utilitaires ---

	function formatDate(dateString: string) {
		return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
	}
</script>

{$inspect(groupedPages)}

{#snippet blockSection(sectionType: SitePagesSectionOptions, sectionLabel: string)}
	<div
		class="card bg-base-200/50 border shadow-md transition-all duration-200"
		use:droppable={{
			container: sectionType,
			callbacks: { onDrop: handleSectionDrop },
			attributes: {
				dragOverClass: 'ring-2 ring-primary/50 bg-primary/5'
			}
		}}
	>
		<div class="card-body p-4">
			<div class="text-base-content/70 mb-2 font-medium">{sectionLabel}</div>

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
										draggingClass: 'opacity-50 ring-2 ring-primary shadow-lg'
									}
								}}
								use:droppable={{
									container: sectionType, // Doit être le même que le draggable pour comparer
									callbacks: {
										// 👉 Gère le drop *sur* cet item (pour le réordonnancement)
										onDrop: (state) => handleItemDrop(state, block)
									},
									attributes: {
										dragOverClass: 'outline bg-warnig outline-2 outline-offset-2 outline-accent'
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
										onclick={() => goto(`/dashboard/site_pages/${block.id}`)}
									>
										<Pencil size={16} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<button
					class="btn btn-secondary btn-dash w-full"
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
		</div>
	</div>
{/snippet}

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-6 text-3xl font-bold">Gestion des Blocs du Site</h1>

	{#if error}
		<div role="alert" class="alert alert-error mb-6">
			<AlertCircle class="h-6 w-6" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Section de création de blocs -->
	<section class="mb-12">
		<h2 class="mb-4 text-2xl font-semibold">Créer de nouveaux blocs</h2>

		<!--
            Layout Grid pour les écrans larges (lg et plus)
            - Header et Footer prennent toute la largeur (col-span-3)
            - Left et Right Sidebars dans leurs colonnes respectives
            Layout Colonne simple pour les écrans petits (par défaut)
        -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_280px] lg:grid-rows-[auto_1fr_auto]">
			<!-- Header -->
			<div class="lg:col-span-3">
				{@render blockSection(SitePagesSectionOptions.header, 'Header')}
			</div>

			<!-- Left Sidebar -->
			<div class="lg:row-start-2">
				{@render blockSection(SitePagesSectionOptions.left_side, 'Sidebar Gauche')}
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
				{@render blockSection(SitePagesSectionOptions.right_side, 'Sidebar Droite')}
			</div>

			<!-- Footer -->
			<div class="lg:col-span-3 lg:row-start-3">
				{@render blockSection(SitePagesSectionOptions.footer, 'Footer')}
			</div>
		</div>
	</section>

	<hr class="border-base-content/20 my-12" />

	<!--::: Liste des pages générales -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold">Pages</h2>
		{#if isLoading}
			<div class="flex justify-center py-12">
				<span class="loading loading-dots loading-lg"></span>
			</div>
		{:else if groupedPages['page'].length === 0}
			<p class="text-base-content/70 text-center">Aucune page générale trouvée.</p>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each groupedPages['page'] as page (page.id)}
					{#key page.updated}
						<!-- Re-render l'élément si 'updated' change -->
						<a
							href={`/dashboard/site_pages/${page.id}`}
							class="card bg-base-100 shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
						>
							<div class="card-body">
								<h3 class="card-title truncate text-xl" title={page.title}>{page.title}</h3>
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
			<h2 class="card-title mb-2 text-xl">Créer une nouvelle page générale</h2>
			<div class="flex flex-col gap-2 sm:flex-row">
				<input
					type="text"
					class="input input-bordered w-full"
					placeholder="Titre de la nouvelle page"
					bind:value={newPageTitle}
					onkeydown={(e) => e.key === 'Enter' && handleCreatePage()}
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
</div>

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

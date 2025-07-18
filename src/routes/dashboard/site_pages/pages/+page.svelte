<script lang="ts">
	import { createPad, deletePad, getPages, subscribeToPagesUpdates } from "../sitePageStore.svelte";

	import { goto } from "$app/navigation";
	import { modalState, showAlert } from "$lib/shared/states.svelte";
	import { SitePagesSectionOptions, type SitePagesResponse } from "$lib/types/pocketbase";
	import { persistedState } from "$lib/utils/local-state.svelte.js";

	import { isMobile } from "$lib/utils";
	import { AlertCircle, ArrowLeftSquare, FileText, Plus } from "lucide-svelte";
	import { fade } from "svelte/transition";
	import { PagesList, ViewModeToggle } from "../components/index.js";

	let isLoading = $state(true);
	let newPageTitle = $state("");
	let isCreating = $state(false);
	let error = $state<string | null>(null);

	// Mode d'affichage persisté dans le localStorage
	const viewModeStore = persistedState<"cards" | "list">("pages-view-mode", "cards");
	let viewMode = $derived(isMobile.current ? "cards" : viewModeStore.value);

	let pages = $derived.by(() => getPages());

	const deletePage = (id: string) => {
		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Supprimer la page",
				message: "Êtes vous sûr de vouloir supprimer cette page ? Cette action est définitive",
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

	function handleViewModeChange(mode: "cards" | "list") {
		viewModeStore.value = mode;
	}

	// Filtrer uniquement les pages générales
	let generalPages = $derived.by(() => {
		return pages.filter((page: SitePagesResponse) => page.section === SitePagesSectionOptions.page);
	});

	// S'abonner aux mises à jour des pages
	$effect(() => {
		const unsubscribe = subscribeToPagesUpdates(() => {
			isLoading = false;
		});
		// Nettoyage à la destruction du composant
		return unsubscribe;
	});

	// Charger les pages au montage
	$effect(() => {
		// Simuler un délai de chargement initial
		setTimeout(() => {
			isLoading = false;
		}, 500);
	});

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
			goto(`/dashboard/site_pages/pages/${newPage.id}?editMode=true`);
		} catch (e) {
			showAlert("Erreur lors de la création de la page", "error");
			console.error(e);
		} finally {
			isCreating = false;
		}
	}

	function navigateBack() {
		goto("/dashboard/site_pages");
	}
</script>

<div transition:fade>
	<!-- Header avec navigation -->
	<div class="mb-6 flex flex-wrap items-center gap-4">
		<button class="btn btn-square" onclick={navigateBack}>
			<ArrowLeftSquare />
		</button>
		<div class="flex items-center gap-3">
			<div class="bg-primary/10 rounded-lg p-2">
				<FileText class="text-primary h-5 w-5" />
			</div>
			<div class="text-2xl font-bold">Gestion des pages générales</div>
		</div>
	</div>

	<div class="mb-8">
		<p class="text-base-content/70 text-lg">
			Créez et gérez vos pages de contenu statique : À propos, Contact, etc. Ces pages apparaîtront
			sur votre site public.
		</p>
	</div>

	{#if error}
		<div role="alert" class="alert alert-error mb-6">
			<AlertCircle class="h-6 w-6" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Formulaire de création -->
	<div class="card bg-base-200 mb-8 shadow-md">
		<div class="card-body">
			<div class="card-title text-fluid-lg mb-4">
				<Plus size={20} />
				Créer une nouvelle page
			</div>
			<div class="flex flex-col gap-4 sm:flex-row">
				<div class="form-control flex-1">
					<label class="label" for="pageTitle">
						<span class="label-text font-medium">Titre de la page</span>
					</label>
					<input
						id="pageTitle"
						type="text"
						class="input input-bordered w-full"
						placeholder="Ex: À propos de nous, Contact, Mentions légales..."
						bind:value={newPageTitle}
						onkeydown={(e) => e.key === "Enter" && handleCreatePage()}
						disabled={isCreating}
					/>
				</div>
				<div class="form-control self-end">
					<label class="label" for="createBtn">
						<span class="label-text sr-only">Créer la page</span>
					</label>
					<button
						id="createBtn"
						class="btn btn-primary"
						onclick={() => handleCreatePage()}
						disabled={isCreating || !newPageTitle.trim()}
					>
						{#if isCreating}
							<span class="loading loading-spinner loading-xs"></span>
							Création...
						{:else}
							<Plus size={16} />
							Créer la page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Liste des pages -->
	<div class="card bg-base-100 shadow-md">
		<div class="card-body">
			<div class="mb-4 flex items-center justify-between">
				<div class="card-title text-xl">Pages existantes</div>
				<span class="not-sm:hidden">
					<ViewModeToggle currentMode={viewMode} onModeChange={handleViewModeChange} /></span
				>
			</div>

			<PagesList
				pages={generalPages}
				{isLoading}
				displayMode={viewMode}
				onDelete={deletePage}
				editBaseUrl="/dashboard/site_pages/pages"
				viewBaseUrl="/dashboard/site_pages/pages"
				emptyStateTitle="Aucune page générale trouvée"
				emptyStateDescription="Commencez par créer votre première page avec le formulaire ci-dessus."
			/>
		</div>
	</div>

	<!-- Informations d'aide -->
	<div class="mt-8">
		<div class="card bg-info/5 border-info/20 border">
			<div class="card-body p-4">
				<h3 class="text-info mb-2 font-semibold">💡 Conseils pour vos pages</h3>
				<ul class="text-base-content/70 space-y-1 text-sm">
					<li>• Créez des pages essentielles : À propos, Contact, Nous trouver</li>
					<li>• Utilisez des titres clairs et descriptifs</li>
					<li>• Les pages seront accessibles via l'URL de votre site public</li>
					<li>• Vous pourrez ajouter ces pages à des menus depuis la section "Template"</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { subscribeToPagesUpdates, getPages, createPad, deletePad } from "../sitePageStore.svelte";

	import { showAlert, modalState } from "$lib/shared/states.svelte";
	import { SitePagesSectionOptions, type SitePagesResponse } from "$lib/types/pocketbase";
	import { format } from "date-fns";
	import { fr } from "date-fns/locale";
	import { goto } from "$app/navigation";

	import { AlertCircle, Trash2, Pencil, Plus, ArrowLeft, FileText } from "lucide-svelte";
	import { fade } from "svelte/transition";

	let isLoading = $state(true);
	let newPageTitle = $state("");
	let isCreating = $state(false);
	let error = $state<string | null>(null);

	let pages = $derived.by(() => getPages());

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
			goto(`/dashboard/site_pages/${newPage.id}`);
		} catch (e) {
			showAlert("Erreur lors de la création de la page", "error");
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

	function formatDate(dateString: string) {
		return format(new Date(dateString), "dd MMMM yyyy à HH:mm", { locale: fr });
	}

	function navigateBack() {
		goto("/dashboard/site_pages");
	}
</script>

<div transition:fade>
	<!-- Header avec navigation -->
	<div class="mb-6 flex flex-wrap items-center gap-4">
		<button class="btn btn-ghost btn-sm" onclick={navigateBack}>
			<ArrowLeft size={16} />
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
			Créez et gérez vos pages de contenu statique : À propos, Contact, Conditions d'utilisation,
			etc. Ces pages apparaîtront sur votre site public.
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
			<h2 class="card-title mb-4 text-xl">
				<Plus size={20} />
				Créer une nouvelle page
			</h2>
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
				<div class="form-control">
					<label class="label" for="createBtn">
						<span class="label-text opacity-0">Action</span>
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
			<h2 class="card-title mb-4 text-xl">Pages existantes</h2>

			{#if isLoading}
				<div class="flex justify-center py-12">
					<span class="loading loading-dots loading-lg"></span>
				</div>
			{:else if generalPages.length === 0}
				<div class="py-12 text-center">
					<div class="mb-4">
						<FileText class="text-base-content/30 mx-auto h-16 w-16" />
					</div>
					<p class="text-base-content/70 text-lg">Aucune page générale trouvée</p>
					<p class="text-base-content/50 mt-2 text-sm">
						Commencez par créer votre première page avec le formulaire ci-dessus.
					</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each generalPages as page (page.id)}
						{#key page.updated}
							<div
								class="card bg-base-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md"
							>
								<div class="card-body p-4">
									<h3 class="card-title truncate text-lg" title={page.title}>
										{page.title}
									</h3>

									<div class="mt-2 space-y-1">
										<p class="text-base-content/60 text-xs">
											Créé le {formatDate(page.created as string)}
										</p>
										<p class="text-base-content/60 text-xs">
											Modifié le {formatDate(page.updated as string)}
										</p>
									</div>

									<div class="card-actions mt-4 justify-between">
										<div class="flex gap-2">
											<button
												class="btn btn-error btn-sm btn-outline"
												onclick={() => deletePage(page.id)}
												title="Supprimer la page"
											>
												<Trash2 size={14} />
											</button>
										</div>
										<a
											href={`/dashboard/site_pages/pages/${page.id}`}
											class="btn btn-primary btn-sm"
										>
											<Pencil size={14} />
											Modifier
										</a>
									</div>
								</div>
							</div>
						{/key}
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Informations d'aide -->
	<div class="mt-8">
		<div class="card bg-info/5 border-info/20 border">
			<div class="card-body p-4">
				<h3 class="text-info mb-2 font-semibold">💡 Conseils pour vos pages</h3>
				<ul class="text-base-content/70 space-y-1 text-sm">
					<li>• Créez des pages essentielles : À propos, Contact, Mentions légales</li>
					<li>• Utilisez des titres clairs et descriptifs</li>
					<li>• Les pages seront accessibles via l'URL de votre site public</li>
					<li>
						• Vous pourrez ajouter ces pages au menu principal depuis la section "Organisation"
					</li>
				</ul>
			</div>
		</div>
	</div>
</div>

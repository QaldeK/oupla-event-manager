<script lang="ts">
	import {
		subscribeToPadsUpdates,
		getPads,
		createPad,
		deletePad,
		loadDoc
	} from "./padStore.svelte";
	import { goto } from "$app/navigation";
	import { showAlert, modalState } from "$lib/shared/states.svelte";
	import { persistedState } from "$lib/utils/local-state.svelte.js";
	import { isMobile } from "$lib/utils";
	import { PagesList, ViewModeToggle } from "../site_pages/components/index.js";
	import { Plus, FileText, AlertCircle, ArrowLeftSquare } from "lucide-svelte";

	let isLoading = $state(true);
	let newPadTitle = $state("");
	let isCreating = $state(false);
	let error = $state<string | null>(null);

	let pads = $derived.by(() => getPads());

	// Mode d'affichage persisté dans le localStorage
	const viewModeStore = persistedState<"cards" | "list">("pads-view-mode", "cards");
	let viewMode = $derived(isMobile.current ? "cards" : viewModeStore.value);

	async function handleCreatePad() {
		if (!newPadTitle.trim()) {
			error = "Le titre du pad ne peut pas être vide";
			return;
		}

		isCreating = true;
		error = null;

		try {
			const newPad = await createPad(newPadTitle);
			newPadTitle = "";
			// On attend explicitement que le pad soit bien dispo côté backend avant de naviguer
			await loadDoc(newPad.id);
			goto(`/dashboard/pads/${newPad.id}`);
		} catch (e) {
			error = "Erreur lors de la création du pad";
			console.error(e);
		} finally {
			isCreating = false;
		}
	}

	const confirmDeletePad = (id: string) => {
		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Supprimer le document",
				message: "Êtes-vous sûr de vouloir supprimer ce document ? Cette action est définitive.",
				variant: "warning",
				onConfirm: async () => {
					console.log("try to delete pad", id);
					try {
						await deletePad(id); // Calls the deletePad function from padStore.svelte.ts
						modalState.confirm.isOpen = false;
						showAlert("Document supprimé", "success");
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

	// Charger les pads au chargement de la page et s'abonner aux mises à jour
	$effect(() => {
		const unsubscribe = subscribeToPadsUpdates(() => {
			isLoading = false; // Set isLoading to false once initial data is loaded or updated
		});
		// Nettoyage à la destruction du composant
		return unsubscribe;
	});

	function navigateBack() {
		goto("/dashboard"); // Assuming /dashboard is the parent, adjust if needed
	}
</script>

<div>
	<!-- Header avec navigation -->
	<div class="mb-6 flex flex-wrap items-center gap-4">
		<button class="btn btn-square" onclick={navigateBack}>
			<ArrowLeftSquare />
		</button>
		<div class="flex items-center gap-3">
			<div class="bg-primary/10 rounded-lg p-2">
				<FileText class="text-primary h-5 w-5" />
			</div>
			<div class="text-2xl font-bold">Mes documents collaboratifs</div>
		</div>
	</div>

	<div class="mb-8">
		<p class="text-base-content/70 text-lg">
			Créez et gérez vos documents collaboratifs (pads) pour vos notes de réunion, brouillons, etc.
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
				Créer un nouveau document
			</div>
			<div class="flex flex-col gap-4 sm:flex-row">
				<div class="form-control flex-1">
					<label class="label" for="padTitle">
						<span class="label-text font-medium">Titre du document</span>
					</label>
					<input
						id="padTitle"
						type="text"
						class="input input-bordered w-full"
						placeholder="Ex: Notes de réunion, Brouillon d'article..."
						bind:value={newPadTitle}
						onkeydown={(e) => e.key === "Enter" && handleCreatePad()}
						disabled={isCreating}
					/>
				</div>
				<div class="form-control self-end">
					<label class="label" for="createBtn">
						<span class="label-text sr-only">Créer le document</span>
					</label>
					<button
						id="createBtn"
						class="btn btn-primary"
						onclick={() => handleCreatePad()}
						disabled={isCreating || !newPadTitle.trim()}
					>
						{#if isCreating}
							<span class="loading loading-spinner loading-xs"></span>
							Création...
						{:else}
							<Plus size={16} />
							Créer le document
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Liste des pads -->
	<div class="card bg-base-100 shadow-md">
		<div class="card-body">
			<div class="mb-4 flex items-center justify-between">
				<div class="card-title text-xl">Documents existants</div>
				<span class="not-sm:hidden">
					<ViewModeToggle currentMode={viewMode} onModeChange={handleViewModeChange} />
				</span>
			</div>

			<PagesList
				pages={pads}
				{isLoading}
				displayMode={viewMode}
				onDelete={confirmDeletePad}
				editBaseUrl="/dashboard/pads"
				viewBaseUrl="/dashboard/pads"
				emptyStateTitle="Aucun document collaboratif trouvé"
				emptyStateDescription="Créez votre premier document avec le formulaire ci-dessus."
			/>
		</div>
	</div>

	<!-- Informations d'aide -->
	<div class="mt-8">
		<div class="card bg-info/5 border-info/20 border">
			<div class="card-body p-4">
				<h3 class="text-info mb-2 font-semibold">💡 Conseils pour vos documents</h3>
				<ul class="text-base-content/70 space-y-1 text-sm">
					<li>
						• Utilisez les pads pour les notes de réunion, les brouillons, ou des contenus rapides.
					</li>
					<li>
						• Le contenu des pads n'est pas public par défaut, il est accessible via le tableau de
						bord.
					</li>
					<li>• Chaque pad peut être édité collaborativement.</li>
				</ul>
			</div>
		</div>
	</div>
</div>

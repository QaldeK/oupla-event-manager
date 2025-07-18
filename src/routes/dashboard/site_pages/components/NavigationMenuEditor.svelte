<script lang="ts">
	import { Plus, X, ArrowDownIcon, ArrowUp } from "lucide-svelte";
	import type { SitePagesNavigationMenuRecord } from "$lib/types/publicSiteType";
	import { SitePagesSectionOptions } from "$lib/types/pocketbase";
	import { getPages } from "../sitePageStore.svelte";

	interface Props {
		currentMenu: SitePagesNavigationMenuRecord;
	}

	let { currentMenu = $bindable() }: Props = $props();
	let newLinkTitle = $state("");
	let newLinkUrl = $state("");
	let linkType = $state<"custom" | "page">("page");
	let selectedPageId = $state<string>("selectPage");

	// Pages spéciales préconstruite
	const specialLinks = [
		{
			title: "Proposer un événement",
			url: "/proposition"
		}
	];

	// Récupérer les pages existantes
	let pages = $derived.by(() => getPages());
	let availablePages = $derived(
		pages.filter((page) => page.section === SitePagesSectionOptions.page)
	);

	function addLink() {
		if (linkType === "custom") {
			if (newLinkTitle.trim() && newLinkUrl.trim()) {
				currentMenu.componentConfig.links.push({
					title: newLinkTitle.trim(),
					url: newLinkUrl.trim()
				});
				newLinkTitle = "";
				newLinkUrl = "";
			}
		} else if (linkType === "page" && selectedPageId !== "selectPage") {
			// D'abord, vérifier s'il s'agit d'un lien spécial
			const specialLink = specialLinks.find((link) => link.url === selectedPageId);
			if (specialLink) {
				currentMenu.componentConfig.links.push({
					title: specialLink.title,
					url: specialLink.url
				});
				selectedPageId = "selectPage";
				return;
			}

			// Sinon, rechercher dans les pages créées par l'utilisateur
			const selectedPage = availablePages.find((page) => page.id === selectedPageId);
			if (selectedPage) {
				currentMenu.componentConfig.links.push({
					title: selectedPage.title || `Page ${selectedPage.id.substring(0, 5)}...`,
					url: `/${selectedPage.id}`
				});
				selectedPageId = "selectPage";
			}
		}
	}

	function removeLink(index: number) {
		currentMenu.componentConfig.links.splice(index, 1);
	}

	function moveLink(from: number, to: number) {
		if (to < 0 || to >= currentMenu.componentConfig.links.length) return;

		const [movedLink] = currentMenu.componentConfig.links.splice(from, 1);
		currentMenu.componentConfig.links.splice(to, 0, movedLink);
	}

	// $inspect("links", currentMenu.componentConfig.links);
</script>

<div class="">
	<div class="mb-4 text-lg font-bold">Configuration du menu de navigation</div>

	<!-- Titre du menu -->
	<div class="form-control mb-6">
		<label class="label" for="menuTitle">
			<span class="label-text font-medium">Nom du menu</span>
		</label>
		<input
			id="menuTitle"
			type="text"
			bind:value={currentMenu.title}
			placeholder="Ex: Menu principal"
			class="input input-bordered w-full"
		/>
	</div>

	<!-- Liste des liens existants -->
	<div class="mb-6">
		<h4 class="mb-3 text-base font-medium">Liens de navigation</h4>

		{#if !currentMenu.componentConfig.links || currentMenu.componentConfig.links.length === 0}
			<div class="py-8 text-center">
				<p class="text-base-content/60">Aucun lien configuré</p>
				<p class="text-base-content/50 text-sm">Ajoutez des liens ci-dessous</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each currentMenu.componentConfig.links as link, index (index)}
					<div class="bg-base-100 flex items-center gap-3 rounded-lg border p-3">
						<div class="ms-2 flex-1 font-medium">{link.title}</div>

						<div class="flex items-center gap-1">
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => moveLink(index, index - 1)}
								disabled={index === 0}
								title="Monter"
							>
								<ArrowUp size={18} />
							</button>
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => moveLink(index, index + 1)}
								disabled={index === currentMenu.componentConfig.links.length - 1}
								title="Descendre"
							>
								<ArrowDownIcon size={18} />
							</button>
							<button
								class="btn btn-ghost btn-xs text-error"
								onclick={() => removeLink(index)}
								title="Supprimer"
							>
								<X size={18} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Ajouter un nouveau lien -->
	<div class="card bg-base-200 mb-6 shadow-sm">
		<div class="card-body p-4">
			<div class="mb-4 flex items-center justify-between">
				<h5 class="font-medium">Ajouter un lien</h5>
				<div class="tabs tabs-boxed">
					<button
						class="tab {linkType === 'custom' ? 'tab-active' : ''}"
						onclick={() => {
							linkType = "custom";
							selectedPageId = "selectPage";
						}}
					>
						Liens externes
					</button>
					<button
						class="tab {linkType === 'page' ? 'tab-active' : ''}"
						onclick={() => {
							linkType = "page";
							newLinkTitle = "";
							newLinkUrl = "";
						}}
					>
						Mes pages
					</button>
				</div>
			</div>

			<div class="flex flex-wrap items-end gap-4">
				{#if linkType === "custom"}
					<div class="form-control min-w-48 flex-1">
						<label class="label" for="newLinkTitle">
							<span class="label-text">Titre du lien</span>
						</label>
						<input
							id="newLinkTitle"
							type="text"
							bind:value={newLinkTitle}
							placeholder="Ex: À propos"
							class="input input-bordered input-sm"
							onkeydown={(e) => e.key === "Enter" && addLink()}
						/>
					</div>

					<div class="form-control min-w-48 flex-1">
						<label class="label" for="newLinkUrl">
							<span class="label-text">URL du lien</span>
						</label>
						<input
							id="newLinkUrl"
							type="text"
							bind:value={newLinkUrl}
							placeholder="Ex: about ou https://example.com"
							class="input input-bordered input-sm"
							onkeydown={(e) => e.key === "Enter" && addLink()}
						/>
					</div>

					<button
						class="btn btn-primary btn-sm"
						onclick={addLink}
						disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
					>
						<Plus size={16} />
						Ajouter
					</button>
				{:else}
					<div class="form-control flex-1">
						<label class="label" for="pageSelect">
							<span class="label-text">Sélectionner une page</span>
						</label>
						<select
							id="pageSelect"
							class="select select-bordered w-full"
							bind:value={selectedPageId}
						>
							<option value="selectPage" disabled>Choisir une page...</option>
							{#each specialLinks as page (page.url)}
								<option value={page.url}>{page.title}</option>
							{/each}
							{#each availablePages as page (page.id)}
								<option value={page.id}>
									{page.title || `Page sans titre (${page.id.substring(0, 5)}...)`}
								</option>
							{/each}
						</select>
					</div>

					<button
						class="btn btn-primary btn-sm"
						onclick={addLink}
						disabled={selectedPageId === "selectPage"}
					>
						<Plus size={16} />
						Ajouter
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<script
	lang="ts"
	generics="T extends { id: string; title: string; created: string; updated: string }"
>
	import { format } from "date-fns";
	import { fr } from "date-fns/locale";
	import { Trash2, Pencil, Eye, FileText } from "lucide-svelte";

	interface Props {
		pages: T[];
		isLoading?: boolean;
		displayMode?: "cards" | "list";
		onDelete?: (id: string) => void;
		editBaseUrl?: string;
		viewBaseUrl?: string;
		emptyStateTitle?: string;
		emptyStateDescription?: string;
	}

	let {
		pages = [],
		isLoading = false,
		displayMode = "cards",
		onDelete,
		editBaseUrl = "",
		viewBaseUrl = "",
		emptyStateTitle = "Aucune page trouvée",
		emptyStateDescription = "Commencez par créer votre première page."
	}: Props = $props();

	function formatDate(dateString: string) {
		return format(new Date(dateString), "dd MMMM yyyy à HH:mm", { locale: fr });
	}

	function handleDelete(id: string) {
		if (onDelete) {
			onDelete(id);
		}
	}
</script>

{#if isLoading}
	<div class="flex justify-center py-12">
		<span class="loading loading-dots loading-lg"></span>
	</div>
{:else if pages.length === 0}
	<div class="py-12 text-center">
		<div class="mb-4">
			<FileText class="text-base-content/30 mx-auto h-16 w-16" />
		</div>
		<p class="text-base-content/70 text-lg">{emptyStateTitle}</p>
		<p class="text-base-content/50 mt-2 text-sm">
			{emptyStateDescription}
		</p>
	</div>
{:else if displayMode === "cards"}
	<!-- Affichage en cartes -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each pages as page (page.id)}
			{#key page.updated}
				<div
					class="card bg-base-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md"
				>
					<div class="card-body p-4">
						<div class="card-title truncate text-lg" title={page.title}>
							{page.title}
						</div>

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
								{#if onDelete}
									<button
										class="btn btn-error btn-sm btn-outline"
										onclick={() => handleDelete(page.id)}
										title="Supprimer la page"
									>
										<Trash2 size={14} />
									</button>
								{/if}
							</div>
							<div class="flex gap-2">
								{#if viewBaseUrl}
									<a
										href={`${viewBaseUrl}/${page.id}?editMode=false`}
										class="btn btn-primary btn-sm btn-outline"
									>
										<Eye size={14} />
										<span class="not-sm:hidden">Lire</span>
									</a>
								{/if}
								{#if editBaseUrl}
									<a
										href={`${editBaseUrl}/${page.id}?editMode=true`}
										class="btn btn-primary btn-sm"
									>
										<Pencil size={14} />
										Modifier
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/key}
		{/each}
	</div>
{:else if displayMode === "list"}
	<!-- Affichage en liste -->
	<div class="overflow-x-auto">
		<table class="table-zebra table">
			<thead>
				<tr>
					<th>Titre</th>
					<th>Date de création</th>
					<th>Dernière modification</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each pages as page (page.id)}
					{#key page.updated}
						<tr class="hover">
							<td>
								<div class="flex items-center gap-2">
									<div class="text-primary w-8 rounded">
										<FileText />
									</div>
									<div>
										<div class="font-bold">{page.title}</div>
									</div>
								</div>
							</td>
							<td>
								<div class="text-sm opacity-70">
									{formatDate(page.created as string)}
								</div>
							</td>
							<td>
								<div class="text-sm opacity-70">
									{formatDate(page.updated as string)}
								</div>
							</td>
							<td>
								<div class="flex gap-2">
									{#if viewBaseUrl}
										<a
											href={`${viewBaseUrl}/${page.id}?editMode=false`}
											class="btn btn-ghost btn-xs"
											title="Voir la page"
										>
											<Eye size={14} />
										</a>
									{/if}
									{#if editBaseUrl}
										<a
											href={`${editBaseUrl}/${page.id}?editMode=true`}
											class="btn btn-ghost btn-xs"
											title="Modifier la page"
										>
											<Pencil size={14} />
										</a>
									{/if}
									{#if onDelete}
										<button
											class="btn btn-ghost btn-xs text-error"
											onclick={() => handleDelete(page.id)}
											title="Supprimer la page"
										>
											<Trash2 size={14} />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/key}
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<script lang="ts">
	import { X, Bold, CaseSensitive } from 'lucide-svelte'; // Pour les icônes
	import type { PublicSiteThemeOptions } from '$lib/types/theme.d';
	import type { SitePagesResponse } from '$lib/types/pocketbase';

	interface Props {
		theme: PublicSiteThemeOptions;
		onClose: () => void;
		pages: SitePagesResponse[];
	}

	let { theme, onClose, pages }: Props = $props();

	// État local pour les liens
	let linkTitle = $state('');
	let linkUrl = $state('');
	let selectedPage = $state('');
	let navbarConfig = $state(theme.components.navbarHeader);

	// Options de taille pour la NavBar
	const sizeOptions = [
		{ value: 'min-h-[3rem]', label: 'Petite' },
		{ value: 'min-h-[4rem]', label: 'Moyenne' },
		{ value: 'min-h-[5rem]', label: 'Grande' }
	];

	// Options de taille pour le texte du titre
	const textSizeOptions = [
		{ value: 'text-fluid-base', label: 'Normal' },
		{ value: 'text-fluid-lg', label: 'Grand' },
		{ value: 'text-fluid-xl', label: 'Très grand' },
		{ value: 'text-fluid-2xl', label: 'Énorme' }
	];

	// Fonctions d'aide pour gérer les classes
	function hasClass(classes: string[], className: string): boolean {
		return classes.includes(className);
	}

	function toggleClass(classes: string[], className: string): string[] {
		if (hasClass(classes, className)) {
			return classes.filter((c) => c !== className);
		} else {
			return [...classes, className];
		}
	}

	// Ajouter un lien
	function addLink() {
		// Si rien n'est spécifié, on ne fait rien
		if (!linkTitle.trim() && !selectedPage) return;

		// Si une page est sélectionnée, utiliser ses informations
		if (selectedPage) {
			const page = pages.find((p) => p.id === selectedPage);
			if (page) {
				navbarConfig.links = [
					...navbarConfig.links,
					{
						title: page.title || 'Page sans titre',
						url: `${page.id}` // URL sera relative à l'espace
					}
				];
				selectedPage = '';
			}
		}
		// Sinon utiliser le titre et l'URL personnalisés
		else if (linkTitle.trim()) {
			navbarConfig.links = [
				...navbarConfig.links,
				{
					title: linkTitle,
					url: linkUrl || '#' // URL par défaut si vide
				}
			];
			linkTitle = '';
			linkUrl = '';
		}
	}

	// Supprimer un lien
	function removeLink(index: number) {
		navbarConfig.links = navbarConfig.links.filter((_, i) => i !== index);
	}

	// Synchroniser les modifications avec l'objet theme parent
	function saveChanges() {
		theme.components.navbarHeader = { ...navbarConfig };
		onClose();
	}
</script>

<div class="modal-box max-w-2xl">
	<h3 class="text-lg font-bold">Configuration de la barre de navigation</h3>
	<button onclick={onClose} class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2">
		<X />
	</button>

	<div class="divider"></div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Taille de la barre de navigation -->
		<div class="form-control w-full">
			<label class="label" for="navbarSize">
				<span class="label-text font-medium">Taille de la barre</span>
			</label>
			<select id="navbarSize" class="select select-bordered" bind:value={navbarConfig.size}>
				{#each sizeOptions as option (option)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<!-- Fixed header -->
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text font-medium">Barre fixée en haut</span>
				<input type="checkbox" class="toggle toggle-primary" bind:checked={navbarConfig.isFixed} />
			</label>
		</div>

		<!-- Afficher le menu (hamburgeur) -->
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text font-medium">Afficher le bouton menu</span>
				<input type="checkbox" class="toggle toggle-primary" bind:checked={navbarConfig.hasMenu} />
			</label>
		</div>
	</div>

	<div class="divider my-4">Style du titre</div>

	<!-- Style du titre -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Taille du texte -->
		<div class="form-control w-full">
			<label class="label" for="textSize">
				<span class="label-text font-medium">Taille du texte</span>
			</label>
			<select
				id="textSize"
				class="select select-bordered"
				value={navbarConfig.titleClass.find((c) => c.startsWith('text-fluid-')) || 'text-fluid-xl'}
				onchange={(e) => {
					// Remplacer la classe de taille existante
					const oldSizeClass = navbarConfig.titleClass.find((c) => c.startsWith('text-fluid-'));
					if (oldSizeClass) {
						navbarConfig.titleClass = navbarConfig.titleClass.filter(
							(c) => !c.startsWith('text-fluid-')
						);
					}
					navbarConfig.titleClass = [...navbarConfig.titleClass, e.target.value];
				}}
			>
				{#each textSizeOptions as option (option)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<!-- Options de style -->
		<div class="mt-8 flex items-center space-x-2">
			<button
				class="btn btn-square {hasClass(navbarConfig.titleClass, 'font-bold')
					? 'btn-primary'
					: 'btn-outline'}"
				onclick={() => {
					navbarConfig.titleClass = toggleClass(navbarConfig.titleClass, 'font-bold');
				}}
				title="Gras"
			>
				<Bold size={16} />
			</button>

			<button
				class="btn btn-square {hasClass(navbarConfig.titleClass, 'uppercase')
					? 'btn-primary'
					: 'btn-outline'}"
				onclick={() => {
					navbarConfig.titleClass = toggleClass(navbarConfig.titleClass, 'uppercase');
				}}
				title="Majuscules"
			>
				<CaseSensitive size={16} />
			</button>
		</div>
	</div>

	<div class="divider my-4">Liens de navigation</div>

	<!-- Liste des liens existants -->
	<div class="mb-4 overflow-x-auto">
		{#if navbarConfig.links.length === 0}
			<p class="text-base-content/60 py-2 text-center">Aucun lien configuré</p>
		{:else}
			<table class="table-sm table">
				<thead>
					<tr>
						<th>Titre</th>
						<th>URL</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					{#each navbarConfig.links as link, index (link.url)}
						<tr>
							<td>{link.title}</td>
							<td class="max-w-[150px] truncate">{link.url}</td>
							<td>
								<button class="btn btn-ghost btn-sm text-error" onclick={() => removeLink(index)}>
									<X size={16} />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Ajouter un lien -->
	<div class="card bg-base-200 mb-4 p-4">
		<h4 class="mb-2 font-medium">Ajouter un lien</h4>

		<div class="tabs tabs-boxed mb-4">
			<button class="tab {!selectedPage ? 'tab-active' : ''}" onclick={() => (selectedPage = '')}
				>Lien personnalisé</button
			>
			<button
				class="tab {selectedPage ? 'tab-active' : ''}"
				onclick={() => {
					linkTitle = '';
					linkUrl = '';
				}}>Page existante</button
			>
		</div>

		{#if selectedPage}
			<!-- Sélection d'une page existante -->
			<div class="form-control">
				<label class="label" for="pagesSelect">
					<span class="label-text">Sélectionner une page</span>
				</label>
				<select id="pagesSelect" class="select select-bordered" bind:value={selectedPage}>
					<option value="">Sélectionner une page...</option>
					{#each pages as page (page.id)}
						<option value={page.id}>{page.title || `Page sans titre (${page.id})`}</option>
					{/each}
				</select>
			</div>
		{:else}
			<!-- Lien personnalisé -->
			<div class="flex flex-col gap-2">
				<div class="form-control">
					<label class="label" for="customLinkTitle">
						<span class="label-text">Titre du lien</span>
					</label>
					<input
						id="customLinkTitle"
						type="text"
						class="input input-bordered"
						bind:value={linkTitle}
						placeholder="Titre du lien"
					/>
				</div>

				<div class="form-control">
					<label class="label" for="customLinkUrl">
						<span class="label-text">URL</span>
					</label>
					<input
						id="customLinkUrl"
						type="text"
						class="input input-bordered"
						bind:value={linkUrl}
						placeholder="URL du lien (ex: /about)"
					/>
				</div>
			</div>
		{/if}

		<button class="btn btn-primary mt-4" onclick={addLink}>Ajouter</button>
	</div>

	<div class="modal-action">
		<button class="btn" onclick={onClose}>Annuler</button>
		<button class="btn btn-primary" onclick={saveChanges}>Enregistrer</button>
	</div>
</div>

<script lang="ts">
	import { fade } from "svelte/transition";
	import { Settings, Palette, Layout, FileText } from "lucide-svelte";
	import { goto } from "$app/navigation";

	// Navigation vers les sous-pages
	function navigateToPages() {
		goto("/dashboard/site_pages/pages");
	}

	function navigateToTheme() {
		goto("/dashboard/site_pages/theme");
	}

	function navigateToTemplate() {
		goto("/dashboard/site_pages/template");
	}
</script>

<div transition:fade>
	<h1 class="mb-6 text-3xl font-bold">Configuration du site public</h1>

	<div class="mb-8">
		<p class="text-base-content/70 text-lg">
			Configurez l'apparence et le contenu de votre site public. Gérez les thèmes, l'organisation
			des sections, les pages et les liens de navigation.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		<!-- Card Pages -->
		<div class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg">
			<div class="card-body">
				<div class="mb-4 flex items-center gap-3">
					<div class="bg-primary/10 rounded-lg p-3">
						<FileText class="text-primary h-6 w-6" />
					</div>
					<h2 class="card-title text-xl">Pages générales</h2>
				</div>
				<p class="text-base-content/70 mb-4">
					Gérez vos pages statiques : création, modification, suppression et organisation de toutes
					les pages de votre site public.
				</p>
				<div class="card-actions justify-end">
					<button class="btn btn-primary" onclick={navigateToPages}> Gérer les pages </button>
				</div>
			</div>
		</div>

		<!-- Card Thème -->
		<div class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg">
			<div class="card-body">
				<div class="mb-4 flex items-center gap-3">
					<div class="bg-secondary/10 rounded-lg p-3">
						<Palette class="text-secondary h-6 w-6" />
					</div>
					<h2 class="card-title text-xl">Thème et apparence</h2>
				</div>
				<p class="text-base-content/70 mb-4">
					Personnalisez l'apparence de votre site : choix des thèmes clair/sombre, couleurs et style
					des cartes événement.
				</p>
				<div class="card-actions justify-end">
					<button class="btn btn-secondary" onclick={navigateToTheme}> Configurer le thème </button>
				</div>
			</div>
		</div>

		<!-- Card Layout -->
		<div class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg">
			<div class="card-body">
				<div class="mb-4 flex items-center gap-3">
					<div class="bg-accent/10 rounded-lg p-3">
						<Layout class="text-accent h-6 w-6" />
					</div>
					<h2 class="card-title text-xl">Organisation & Navigation</h2>
				</div>
				<p class="text-base-content/70 mb-4">
					Organisez la structure de votre site : disposition des sections, configuration du menu
					principal et liens de navigation.
				</p>
				<div class="card-actions justify-end">
					<button class="btn btn-accent" onclick={navigateToTemplate}>
						Configurer la structure
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Section d'aide -->
	<div class="mt-12">
		<div class="card bg-base-200/50 shadow-sm">
			<div class="card-body">
				<div class="mb-4 flex items-center gap-3">
					<div class="bg-info/10 rounded-lg p-3">
						<Settings class="text-info h-6 w-6" />
					</div>
					<h3 class="text-xl font-semibold">Guide de configuration</h3>
				</div>
				<div class="grid grid-cols-1 gap-6 text-sm md:grid-cols-3">
					<div>
						<h4 class="text-primary mb-2 font-medium">1. Pages générales</h4>
						<p class="text-base-content/70">
							Commencez par créer vos pages de contenu statique (À propos, Contact, Conditions,
							etc.) pour structurer votre site.
						</p>
					</div>
					<div>
						<h4 class="text-secondary mb-2 font-medium">2. Thème et apparence</h4>
						<p class="text-base-content/70">
							Personnalisez l'identité visuelle de votre site en choisissant les couleurs et le
							style qui correspondent à votre image.
						</p>
					</div>
					<div>
						<h4 class="text-accent mb-2 font-medium">3. Organisation</h4>
						<p class="text-base-content/70">
							Finalisez en organisant la navigation et la disposition des sections pour optimiser
							l'expérience utilisateur.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

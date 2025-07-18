<script lang="ts">
	// Pour les icônes
	import type { NavbarHeaderType } from "$lib/types/theme.d";

	interface Props {
		navbarHeaderConfig: NavbarHeaderType;
	}

	let { navbarHeaderConfig = $bindable() }: Props = $props();

	// Options de taille pour la NavBar
	const sizeOptions = [
		{ value: "min-h-[3rem]", label: "Petite" },
		{ value: "min-h-[4rem]", label: "Moyenne" },
		{ value: "min-h-[5rem]", label: "Grande" }
	];

	// Options de taille pour le texte du titre
	const textSizeOptions = [
		{ value: "text-fluid-base", label: "Normal" },
		{ value: "text-fluid-lg", label: "Grand" },
		{ value: "text-fluid-xl", label: "Très grand" },
		{ value: "text-fluid-2xl", label: "Énorme" }
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
</script>

<!-- Taille de la barre de navigation -->
<fieldset class="fliedset border-base-300 mb-8 rounded border p-4">
	<legend class="px-2 font-medium">Apparence</legend>
	<div
		class="grid grid-cols-1 gap-x-4 gap-y-8 p-2 md:grid-cols-3 md:place-content-evenly md:place-items-center"
	>
		<label class="fieldset-label w-full cursor-pointer" for="navbarSize">
			Taille
			<select id="navbarSize" class="select" bind:value={navbarHeaderConfig.size}>
				{#each sizeOptions as option (option)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>

		<!-- Fixed header -->
		<label class="fieldset-label cursor-pointer">
			<input
				type="checkbox"
				class="toggle toggle-primary me-2"
				bind:checked={navbarHeaderConfig.isFixed}
			/>
			Barre fixée en haut
		</label>
		<!-- Afficher le menu (hamburgeur) -->
		<!-- <label class="fieldset-label cursor-pointer">
			<input
				type="checkbox"
				class="toggle toggle-primary me-2"
				bind:checked={navbarHeaderConfig.hasMenu}
			/>
			Afficher un menu
		</label> -->
	</div>
</fieldset>

<!-- Style du titre -->
<fieldset class="rounded-box border-base-300 mb-4 rounded border p-4">
	<legend class="px-2 font-medium">Nom du Site</legend>

	<div
		class="grid grid-cols-1 gap-x-4 gap-y-8 p-2 md:grid-cols-3 md:place-content-evenly md:place-items-center"
	>
		<!-- Taille du texte -->
		<label class="fieldset-label me-4 w-full cursor-pointer" for="textSize">
			Taille
			<select
				id="textSize"
				class="select"
				value={navbarHeaderConfig.titleClass.find((c) => c.startsWith("text-fluid-")) ||
					"text-fluid-xl"}
				onchange={(e) => {
					const target = e.target as HTMLSelectElement;
					// Remplacer la classe de taille existante
					const oldSizeClass = navbarHeaderConfig.titleClass.find((c) =>
						c.startsWith("text-fluid-")
					);
					if (oldSizeClass) {
						navbarHeaderConfig.titleClass = navbarHeaderConfig.titleClass.filter(
							(c) => !c.startsWith("text-fluid-")
						);
					}
					navbarHeaderConfig.titleClass = [...navbarHeaderConfig.titleClass, target.value];
				}}
			>
				{#each textSizeOptions as option, index ("option" + index)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>

		<!-- Gras -->
		<label class="fieldset-label cursor-pointer">
			<input
				type="checkbox"
				class="toggle toggle-primary me-2"
				checked={hasClass(navbarHeaderConfig.titleClass, "font-bold")}
				onchange={() => {
					navbarHeaderConfig.titleClass = toggleClass(navbarHeaderConfig.titleClass, "font-bold");
				}}
				title="Mettre le titre en gras"
			/>
			Gras
		</label>

		<!-- Majuscules -->
		<label class="fieldset-label cursor-pointer">
			<input
				type="checkbox"
				class="toggle toggle-primary me-2"
				checked={hasClass(navbarHeaderConfig.titleClass, "uppercase")}
				onchange={() => {
					navbarHeaderConfig.titleClass = toggleClass(navbarHeaderConfig.titleClass, "uppercase");
				}}
				title="Mettre le titre en majuscules"
			/>
			Majuscules
		</label>
	</div>
</fieldset>

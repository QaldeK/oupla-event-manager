<script lang="ts">
	import { pb } from "$lib/pocketbase.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { customAlphabet } from "nanoid";
	import type { UserCurrentSpace } from "$lib/types/types";

	// Alphabet restreint pour coller à la validation PB : uniquement minuscules + chiffres
	const nanoidSafe = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

	let isCheckingAuth = $state(true);
	let error = $state("");

	// Champs du formulaire d'inscription
	let regUsername = $state("");
	let regEmail = $state("");
	let regPassword = $state("");
	let regPasswordConfirm = $state("");
	let isRegistering = $state(false);

	// Slug auto-généré à partir du nom
	// Contrainte PB : pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$, max 35, min 3
	function generateSpaceSlug(name: string): string {
		const base = name
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 26) || "espace";
		return `${base}-${nanoidSafe()}`;
	}

	// Champs du formulaire de création d'espace
	let showCreateSpace = $state(false);
	let spacePublicName = $state("");
	let isCreating = $state(false);

	let isAuthenticated = $state(false);
	let username = $state("");
	let spaces = $state<UserCurrentSpace[]>([]);

	onMount(async () => {
		if (pb.authStore.isValid) {
			await userDb.initializeUserData();
			isAuthenticated = true;
			username = userDb.current?.username || "";
			spaces = [...(userDb.memberOf || [])];
		}
		isCheckingAuth = false;
	});

	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		error = "";
		if (regPassword !== regPasswordConfirm) {
			error = "Les mots de passe ne correspondent pas";
			return;
		}
		isRegistering = true;
		try {
			await userDb.register(regUsername, regEmail, regPassword);
			// L'utilisateur est connecté mais n'a pas d'espace
			// On bascule vers l'état authentifié sans espace
			isAuthenticated = true;
			username = userDb.current?.username || regUsername;
			spaces = [...(userDb.memberOf || [])];
			// Reset du formulaire d'inscription
			regUsername = "";
			regEmail = "";
			regPassword = "";
			regPasswordConfirm = "";
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isRegistering = false;
		}
	}

	function handleLogout() {
		pb.authStore.clear();
		userDb.logout();
		isAuthenticated = false;
		username = "";
		spaces = [];
		showCreateSpace = false;
		spacePublicName = "";
		error = "";
	}

	async function handleCreateSpace(e: SubmitEvent) {
		e.preventDefault();
		error = "";
		isCreating = true;
		const slug = generateSpaceSlug(spacePublicName);
		try {
			const space = await pb.collection("spaces").create({
				name: slug,
				public_name: spacePublicName || slug,
				created_by: pb.authStore.record?.id
			});
			await pb.collection("spaceMembers").create({
				space: space.id,
				user: pb.authStore.record?.id,
				role: "admin"
			});
			await pb.collection("spaces_options").create({
				space: space.id
			});
			await userDb.refresh();
			spaces = [...(userDb.memberOf || [])];
			showCreateSpace = false;
			spacePublicName = "";
			goto(`/dashboard/${slug}/config`);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	{#if isCheckingAuth}
		<div class="text-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if !isAuthenticated}
		<!-- Formulaire d'inscription -->
		<div class="card bg-base-100 w-full max-w-md shadow-xl">
			<div class="card-body">
				<h1 class="card-title text-2xl">Bienvenue</h1>
				<p class="text-base-content/70 mb-4">Créez votre compte pour commencer</p>

				{#if error}
					<div class="alert alert-error mb-4">
						<span>{error}</span>
					</div>
				{/if}

				<form onsubmit={handleRegister} class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Nom d'utilisateur</legend>
						<label class="validator input w-full">
							<input
								type="text"
								bind:value={regUsername}
								placeholder="utilisateur"
								class="grow"
								required
								pattern="[a-z0-9_]+"
							/>
						</label>
						<p class="label text-xs">Lettres minuscules, chiffres et tirets bas uniquement</p>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Email</legend>
						<label class="validator input w-full">
							<input
								type="email"
								bind:value={regEmail}
								placeholder="email@exemple.com"
								class="grow"
								required
							/>
						</label>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Mot de passe</legend>
						<label class="validator input w-full">
							<input
								type="password"
								bind:value={regPassword}
								placeholder="Au moins 8 caractères"
								class="grow"
								required
								minlength="8"
							/>
						</label>
						<p class="label">Minimum 8 caractères</p>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Confirmation</legend>
						<label class="validator input w-full">
							<input
								type="password"
								bind:value={regPasswordConfirm}
								placeholder="Confirmez le mot de passe"
								class="grow"
								required
							/>
						</label>
					</fieldset>

					<button type="submit" class="btn btn-block btn-primary" disabled={isRegistering}>
						{#if isRegistering}
							<span class="loading loading-spinner loading-xs"></span>
							Création...
						{:else}
							Créer mon compte
						{/if}
					</button>
				</form>

				<div class="divider"></div>
				<p class="text-center text-sm">
					Déjà un compte ?
					<a href="/login" class="link link-hover font-semibold">Se connecter</a>
				</p>
			</div>
		</div>
	{:else}
		<!-- Utilisateur authentifié -->
		<div class="w-full max-w-lg">
			<h1 class="mb-2 text-3xl font-bold">Bonjour, {username}</h1>
			{#if spaces.length === 0 && !showCreateSpace}
				<p class="text-base-content/70 mb-6">
					Créez votre premier espace pour commencer à organiser vos événements.
				</p>
			{:else if spaces.length > 0 && !showCreateSpace}
				<p class="text-base-content/70 mb-6">Voici vos espaces</p>
			{/if}

			{#if error}
				<div class="alert alert-error mb-4">
					<span>{error}</span>
				</div>
			{/if}

			{#if spaces.length > 0 && !showCreateSpace}
				<!-- Liste des espaces -->
				<div class="mb-6 space-y-3">
					{#each spaces as space (space.id)}
						<a
							href="/dashboard/{space.name}"
							class="card bg-base-100 hover:bg-base-200 flex items-center justify-between shadow-sm transition-colors"
						>
							<div class="card-body p-4">
								<h2 class="card-title text-lg">{space.public_name}</h2>
								<div class="flex items-center gap-2 text-sm opacity-70">
									<span>/dashboard/{space.name}</span>
									<span class="badge badge-ghost badge-sm">{space.role}</span>
								</div>
							</div>
							<div class="px-4">
								<span class="text-base-content/40 text-xl">›</span>
							</div>
						</a>
					{/each}
				</div>

				<button class="btn btn-outline btn-block" onclick={() => (showCreateSpace = true)}>
					Créer un nouvel espace
				</button>
			{/if}

			{#if showCreateSpace || spaces.length === 0}
				<!-- Formulaire de création d'espace -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<h2 class="card-title text-xl">
							{spaces.length === 0 ? "Créer votre premier espace" : "Nouvel espace"}
						</h2>

						<form onsubmit={handleCreateSpace} class="space-y-4">
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Nom de l'espace</legend>
								<label class="input w-full">
									<input
										type="text"
										bind:value={spacePublicName}
										placeholder="Mon Espace"
										class="grow"
										required
										minlength="4"
									/>
								</label>
								<p class="label">Le slug de l'URL sera généré automatiquement</p>
							</fieldset>

							<div class="flex gap-2">
								{#if spaces.length > 0}
									<button
										type="button"
										class="btn btn-ghost"
										onclick={() => {
											showCreateSpace = false;
											error = "";
										}}
									>
										Annuler
									</button>
								{/if}
								<button type="submit" class="btn btn-primary flex-1" disabled={isCreating}>
									{#if isCreating}
										<span class="loading loading-spinner loading-xs"></span>
										Création...
									{:else}
										Créer l'espace
									{/if}
								</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

			<!-- Déconnexion -->
			<div class="mt-6">
				<button class="btn btn-ghost btn-block" onclick={handleLogout}>Se déconnecter</button>
			</div>
		</div>
	{/if}
</div>

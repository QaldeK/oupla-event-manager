<script lang="ts">
	import { userDb } from "$lib/shared/userDb.svelte";
	import { pb } from "$lib/pocketbase.svelte";

	import { goto } from "$app/navigation";

	let email = $state("***REMOVED***");
	let password = $state("***REMOVED***");
	let message = $state("");

	$effect(() => {
		if (pb.authStore.isValid) {
			goto("/dashboard");
		} else {
			console.log("Utilisateur non connecté");
		}
	});

	const handleLogin = async () => {
		try {
			await userDb.login(email, password);
			goto("/dashboard");
		} catch (error) {
			message = "Erreur de connexion : " + (error instanceof Error ? error.message : String(error));
		}
	};
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="card bg-base-100 w-full max-w-sm shadow-xl">
		<div class="card-body">
			<h1 class="card-title">Connexion</h1>
			<form onsubmit={handleLogin} class="space-y-4">
				<div class="form-control">
					<label class="label" for="email">
						<span class="label-text">Email</span>
					</label>
					<input type="email" bind:value={email} class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="password">
						<span class="label-text">Mot de passe</span>
					</label>
					<input type="password" bind:value={password} class="input input-bordered w-full" />
				</div>
				<div class="form-control mt-6">
					<button type="submit" class="btn btn-primary">Se connecter</button>
				</div>
			</form>
			{#if message}
				<p class="text-error text-center">{message}</p>
			{/if}
		</div>
	</div>
</div>

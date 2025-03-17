<script lang="ts">
	import { userDb } from '$lib/shared/userDb.svelte';
	import { pb } from '$lib/pocketbase.svelte';

	import { goto } from '$app/navigation';

	let email = $state('***REMOVED***');
	let password = $state('***REMOVED***');
	let message = $state('');

	$effect(() => {
		if (pb.authStore.isValid) {
			goto('/dashboard');
		} else {
			console.log('Utilisateur non connecté');
		}
	});

	const handleLogin = async () => {
		try {
			await userDb.login(email, password);
			goto('/dashboard');
		} catch (error) {
			message = 'Erreur de connexion : ' + (error instanceof Error ? error.message : String(error));
		}
	};
</script>

<div class="flex items-center justify-center">
	<div class="max-w-md rounded-lg bg-white p-8 shadow-lg">
		<h1 class="mb-4 text-2xl font-bold">Connexion</h1>
		<form onsubmit={handleLogin} class="space-y-4">
			<label class="block">
				<span class="text-gray-700">Email</span>
				<input
					type="email"
					bind:value={email}
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-xs focus:border-indigo-300 focus:ring-3 focus:ring-indigo-200 focus:outline-hidden"
				/>
			</label>
			<label class="block">
				<span class="text-gray-700">Mot de passe</span>
				<input
					type="password"
					bind:value={password}
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-xs focus:border-indigo-300 focus:ring-3 focus:ring-indigo-200 focus:outline-hidden"
				/>
			</label>
			<button
				type="submit"
				class="rounded-full bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				>Se connecter</button
			>
		</form>
		<p class="text-center">{message}</p>
	</div>
</div>

<script lang="ts">
	import { userDb } from '$lib/shared/userDb.svelte';
	import { pb } from '$lib/pocketbase.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let password = $state('***REMOVED***');
	let passwordConfirm = $state('***REMOVED***');
	let isLoading = $state(false);
	let errors = $state({
		password: '',
		passwordConfirm: ''
	});

	// let token = $state('');
	// let mail = $state('');
	// let uname = $state('');

	let token = page.url.searchParams.get('token') || '';
	let mail = page.url.searchParams.get('mail') || '';
	let uname = page.url.searchParams.get('uname') || '';

	// Connexion automatique avec le token comme mot de passe
	$effect(() => {
		const authenticateUser = async () => {
			if (token && mail) {
				try {
					// Se connecter avec le token comme mot de passe
					await pb.collection('users').authWithPassword(mail, token);
				} catch (error) {
					console.error('Erreur de connexion:', error);
					errors.password = "Le lien d'invitation est invalide ou expiré";
				}
			}
		};

		authenticateUser();
	});

	let isValid = $derived(password.length >= 8 && password === passwordConfirm);

	async function handleSubmit() {
		errors = { password: '', passwordConfirm: '' };

		if (!isValid) {
			if (password !== passwordConfirm) {
				errors.passwordConfirm = 'Les mots de passe ne correspondent pas';
				return;
			}
			if (password.length < 8) {
				errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
				return;
			}
			return;
		}

		isLoading = true;

		try {
			// L'utilisateur est maintenant authentifié, on peut mettre à jour son mot de passe
			await pb.collection('users').update(pb.authStore.model.id, {
				password,
				passwordConfirm: password,
				oldPassword: token,
				invitationToken: 'used' // Effacer le token d'invitation
				// invitationExpires: null
			});
			await userDb.login(mail, password);

			goto('/dashboard');
		} catch (error) {
			console.error('Erreur:', error);
			errors.password = 'Impossible de mettre à jour le mot de passe';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
				Bienvenue {uname}
			</h2>
			<div class="my-4">
				Pour finaliser votre inscription sur Oupla, veuillez définir un mot de passe.
			</div>
		</div>

		<form class="mt-8 space-y-6" onsubmit={handleSubmit}>
			<div class="space-y-4 rounded-md shadow-sm">
				<div>
					<label for="password" class="sr-only">Mot de passe</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						class="sm:text-fluid-sm relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:leading-6"
						placeholder="Mot de passe"
						required
					/>
					{#if errors.password}
						<p class="text-fluid-sm mt-1 text-red-600">{errors.password}</p>
					{/if}
				</div>
				<div>
					<label for="passwordConfirm" class="sr-only">Confirmer le mot de passe</label>
					<input
						id="passwordConfirm"
						type="password"
						bind:value={passwordConfirm}
						class="sm:text-fluid-sm relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:leading-6"
						placeholder="Confirmer le mot de passe"
						required
					/>
					{#if errors.passwordConfirm}
						<p class="text-fluid-sm mt-1 text-red-600">{errors.passwordConfirm}</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={isLoading}
					class="group text-fluid-sm relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
				>
					{isLoading ? 'Configuration...' : 'Valider'}
				</button>
			</div>
		</form>
	</div>
</div>

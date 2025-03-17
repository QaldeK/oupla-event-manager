<script lang="ts">
	import { pb } from '$lib/pocketbase.svelte';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import { modalState } from '$lib/shared/states.svelte';
	import { showAlert } from '$lib/shared/states.svelte';

	// États réactifs avec $state
	let email = $state('qk-oupla@gmx.com');
	let username = $state('qko');
	let isLoading = $state(false);
	let invitationLink = $state('');

	// Valeur dérivée pour la validation du formulaire
	let isValid = $derived(!!email && !!username);

	async function handleSubmit() {
		if (!isValid) {
			showAlert("L'email et le nom d'utilisateur sont requis", 'error');
			return;
		}

		isLoading = true;
		const invitationToken = crypto.randomUUID();
		const now = new Date();
		const expires = new Date(now.setHours(now.getHours() + 360));

		try {
			// Créer l'utilisateur avec invitationToken comme mot de passe
			const user = await pb.collection('users').create({
				email,
				username,
				password: invitationToken,
				passwordConfirm: invitationToken,
				emailVisibility: true,
				invitationToken,
				invitationExpires: expires.toISOString(),
				verified: false
			});

			// Ajouter l'utilisateur à l'espace
			await pb.collection('spaceMembers').create({
				space: getSpace.id,
				user: user.id,
				role: 'invited'
			});

			// Générer et afficher le lien d'invitation
			invitationLink = `${window.location.origin}/auth/invitation-setpassword?token=${invitationToken}&mail=${encodeURIComponent(email)}&uname=${encodeURIComponent(username)}`;

			/* Commenté pour les tests
			await pb.send('/api/send-invitation', {
				method: 'POST',
				body: {
					email,
					username,
					invitationToken,
					space: getSpace.name
				}
			});
			*/

			showAlert('Invitation créée avec succès', 'success');
		} catch (error) {
			console.error("Erreur lors de l'invitation:", error);
			showAlert("Erreur lors de l'invitation de l'utilisateur", 'error');
		} finally {
			isLoading = false;
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(invitationLink);
			showAlert('Lien copié dans le presse-papier', 'success');
		} catch (error) {
			showAlert('Erreur lors de la copie du lien', 'error');
		}
	}
</script>

<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
	<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
		<h2 class="mb-4 text-xl font-bold">Inviter un utilisateur</h2>

		<form class="space-y-4" onsubmit={handleSubmit}>
			<div>
				<label for="email" class="text-fluid-sm block font-medium text-gray-700">Email</label>
				<input
					type="email"
					id="email"
					value={email}
					oninput={(e) => (email = e.currentTarget.value)}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
					required
				/>
			</div>

			<div>
				<label for="username" class="text-fluid-sm block font-medium text-gray-700"
					>Nom d'utilisateur</label
				>
				<input
					type="text"
					id="username"
					value={username}
					oninput={(e) => (username = e.currentTarget.value)}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
					required
				/>
			</div>

			{#if invitationLink}
				<div class="mt-4 space-y-2">
					<p class="font-medium text-gray-700">Lien d'invitation :</p>
					<div class="flex items-center gap-2">
						<input
							type="text"
							value={invitationLink}
							readonly
							class="text-fluid-sm w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2"
						/>
						<button
							type="button"
							onclick={copyLink}
							class="text-fluid-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
						>
							Copier
						</button>
					</div>
				</div>
			{/if}

			<div class="flex justify-end space-x-3 pt-4">
				<button
					type="button"
					class="text-fluid-sm rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
					onclick={() => (modalState.inviteUser = false)}
				>
					Fermer
				</button>
				{#if !invitationLink}
					<button
						type="submit"
						class="text-fluid-sm rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
						disabled={isLoading}
					>
						{isLoading ? 'Création...' : "Créer l'invitation"}
					</button>
				{/if}
			</div>
		</form>
	</div>
</div>

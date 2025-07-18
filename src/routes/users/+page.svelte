<script lang="ts">
	import { pb } from "$lib/pocketbase.svelte";
	import type { UsersResponse } from "$lib/types/pocketbase";
	import { ClientResponseError } from "pocketbase";

	let users = $state<UsersResponse[]>([]);
	let deleteError = $state<string | null>(null);
	let deleteSuccess = $state(false);
	let isLoading = $state(false);

	async function loadUsers() {
		isLoading = true;
		try {
			const response = await pb.collection<UsersResponse>("users").getList(1, 50, {
				sort: "-created"
			});
			users = response.items;
		} catch (error) {
			const err = error as ClientResponseError;
			deleteError = `Erreur lors du chargement: ${err.message}`;
		} finally {
			isLoading = false;
		}
	}

	async function deleteUser(userId: string) {
		try {
			await pb.collection("users").delete(userId);
			// Si delete() réussit, on met à jour directement l'interface
			users = users.filter((user) => user.id !== userId);
			deleteSuccess = true;
			setTimeout(() => (deleteSuccess = false), 3000);
		} catch (error) {
			const err = error as ClientResponseError;
			deleteError = `Erreur lors de la suppression: ${err.message}`;
			setTimeout(() => (deleteError = null), 3000);
		}
	}

	// Charger les utilisateurs au montage du composant
	$effect(() => {
		loadUsers();
	});
</script>

{#if isLoading}
	<div class="loading">Chargement des utilisateurs...</div>
{/if}

{#if deleteError}
	<div class="error-message">
		{deleteError}
	</div>
{/if}

{#if deleteSuccess}
	<div class="success-message">Utilisateur supprimé avec succès</div>
{/if}

{#each users as user (user.id)}
	<div class="user-card">
		<span>{user.username}</span>
		<button onclick={() => deleteUser(user.id)} class="delete-btn" disabled={isLoading}>
			Supprimer
		</button>
	</div>
{/each}

<style>
	.error-message {
		color: red;
		padding: 1rem;
		margin: 1rem 0;
		border: 1px solid red;
	}

	.success-message {
		color: green;
		padding: 1rem;
		margin: 1rem 0;
		border: 1px solid green;
	}
</style>

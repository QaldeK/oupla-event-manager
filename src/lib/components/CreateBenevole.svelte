<!-- TODO -->
<script>
	import Modal from "$lib/components/Modal.svelte";
	import { pb } from "$lib/pocketbase.svelte";
	import { isBenevoleModal } from "$lib/shared/states.svelte";

	let newUser = {
		name: "",
		mail: "",
		role: ""
	};
	let response = "";

	const submitForm = async () => {
		try {
			const record = await pb.collection("benevoles").create(newUser);
		} catch (error) {
			response = "Erreur lors de la création du bénévole :" + error;
			return;
		}
		newUser = {
			name: "",
			mail: "",
			role: ""
		};
		response = "";
	};
</script>

<Modal>
	<div class="flex h-screen items-center justify-center">
		<div class="modal-content">
			<h1 class="mb-4 text-2xl">Nouveau bénévole</h1>
			<form on:submit|preventDefault={submitForm} class="space-y-4">
				<div class="space-y-2">
					<label class="block text-lg font-bold text-gray-700" for="name">Nom </label>
					<input
						class="input w-full rounded border border-gray-300 p-2"
						type="text"
						name="name"
						id="name"
						bind:value={newUser.name}
					/>
				</div>
				<div class="space-y-2">
					<label class="block text-lg font-bold text-gray-700" for="mail">Email</label>
					<input
						class="input w-full rounded border border-gray-300 p-2"
						type="email"
						name="email"
						id="email"
						bind:value={newUser.mail}
					/>
				</div>
				<div class="space-y-2">
					<label class="block text-lg font-bold text-gray-700" for="role">Statut</label>
					<select
						class="w-full rounded border border-gray-300 p-2"
						name="role"
						id="role"
						bind:value={newUser.role}
					>
						<option value="1er">1er Cercle</option>
						<option value="2nd">Second Cercle</option>
						<option value="collectif">Collectif</option>
						<option value="autre">Autre</option>
					</select>
				</div>
				<div class="mt-8 flex justify-end gap-4 sm:px-6">
					<button
						type="button"
						class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-400 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
						on:click={() => (isBenevoleModal.open = false)}
					>
						Annuler
					</button>
					<button
						type="submit"
						class="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-400 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-hidden sm:ml-3 sm:w-auto"
					>
						Enregistrer
					</button>
				</div>

				<p class="mt-4 text-red-500"></p>
			</form>
		</div>
	</div>
</Modal>

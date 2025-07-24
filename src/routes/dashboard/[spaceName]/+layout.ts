import { userDb } from "$lib/shared/userDb.svelte";
import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ params }) => {
	const { spaceName } = params;

	// Attendre que les données de l'utilisateur, y compris les espaces dont il est membre, soient chargées.
	await userDb.initializeUserData();

	const space = userDb.memberOf.find((s) => s.name === spaceName);

	if (!space) {
		console.error(`Espace non trouvé pour le nom : "${spaceName}". Redirection vers /dashboard.`);
		// Si l'espace n'est pas trouvé ou si l'utilisateur n'y a pas accès,
		// le rediriger vers la page de sélection d'espace.
		throw redirect(303, "/dashboard");
	}

	const spaceId = space.id;
	const public_name = space.public_name;
	const role = space.role;

	console.log(`Contexte d'espace chargé : "${public_name}" (ID: ${spaceId})`);

	// Rendre les données essentielles de l'espace disponibles pour le layout et ses enfants.
	return {
		spaceId,
		public_name,
		spaceName,
		role
	};
};

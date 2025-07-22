import { userDb } from "$lib/shared/userDb.svelte";
import { getSpace } from "$lib/shared/spaceOptions.svelte";
import { redirect } from "@sveltejs/kit";
export async function load() {
	// On suppose que userDb et getSpace sont des stores ou fonctions asynchrones
	await userDb.initializeUserData();
	if (!userDb.isAuthenticated) {
		throw redirect(303, "/login");
	}
	const currentUser = userDb.current;
	const userRole = userDb.currentRole;
	const spaceName = getSpace.name;
	const space = userDb.currentSpace;
	const spaceId = space?.id ?? null;

	return {
		currentUser,
		spaceName,
		userRole,
		space,
		spaceId
	};
}

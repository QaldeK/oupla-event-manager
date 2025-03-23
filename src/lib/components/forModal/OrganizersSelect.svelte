<script lang="ts">
	import GroupRadioButton from '$lib/components/GroupRadioButton.svelte';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import type { CurrentUser } from '$lib/types/types';

	import { getContext } from 'svelte';

	let currentUser = getContext<CurrentUser>('currentUser');
	let isAdmin = () =>  currentUser.role === 'admin';

	let {
		organizers = $bindable(),
		team = getSpace.members,
		label = 'Gérer les organisateur·ices'
	} = $props();

	let benevolesList = $state(
		team.map((member) => ({
			...member,
			maybehere: organizers.find((org) => org.id === member.id)?.maybehere || ''
		}))
	);

	function handleMaybehereChange(
		benevole: OrganizerSchemaDatesProposed,
		newValue: 'oui' | 'peut-être' | 'non' | ''
	) {
		const updatedOrganizers = [...organizers];
		const existingIndex = updatedOrganizers.findIndex((org) => org.id === benevole.id);

		if (existingIndex !== -1) {
			updatedOrganizers[existingIndex] = {
				...updatedOrganizers[existingIndex],
				maybehere: newValue
			};
		} else {
			updatedOrganizers.push({
				...benevole,
				maybehere: newValue,
				tasks: []
			});
		}

		organizers = updatedOrganizers;
	}
</script>

<div class="p-4">
	<div class="flex flex-wrap gap-3">
		{#each benevolesList as benevole (benevole)}
			<div
				class="flex items-center justify-between rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<span class="px-2 font-medium">{benevole.username}</span>
				<div>
					<GroupRadioButton
						value={organizers.find((org) => org.id === benevole.id)?.maybehere || ''}
						onChange={(newValue) => handleMaybehereChange(benevole, newValue)}
						size="icon_sm"
					/>
				</div>
			</div>
		{/each}
	</div>
</div>

<script lang="ts">
    import { fade } from 'svelte/transition';
    import UserInvitationForm from './UserInvitationForm.svelte';
    import ButtonGroupSelect from './forModal/ButtonGroupSelect.svelte';
    import type { OrganizerType, UserType } from '$lib/types/types';
    import { getSpace } from '$lib/shared/spaceOptions.svelte'; // Adjust path if needed
    import { pb } from '$lib/pocketbase.svelte';
	import { showAlert } from '$lib/shared/states.svelte';
    import type { EventsResponse, SpaceMembersRoleOptions } from '$lib/types/pocketbase';
    import { SpaceMembersRoleOptions as Roles } from '$lib/types/pocketbase';

   export let isOpen = $state(false);
   export let event: EventsResponse; // Pass the current event data
   export let currentOrganizers: OrganizerType[] = []; // Pass the current organizers list
   export let onOrganizerAdded: (organizer: OrganizerType) => void; // Callback when an existing user is added
   export let onOrganizerInvited: (organizerData: { id: string; username: string }) => void; // Callback when a new user is successfully invited


	 let isLoadingInvite= $state(false);
	 let isLoadingAdd = $state(false);


    // Members of the space who are not already organizers for THIS event
    let potentialExistingOrganizers = $derived(() => {
        const organizerIds = new Set(currentOrganizers.map(o => o.id));
        // Filter members: must not be already an organizer AND should have a relevant role (e.g., invited, helper, admin)
        // We might want to allow adding existing helpers/admins too.
        return getSpace.members.filter(member =>
            !organizerIds.has(member.id) &&
            [Roles.invited, Roles.helpers, Roles.admin].includes(member.role as Roles) // Allow adding invited, helpers, admins
        );
    });

	 let selectedExistingMembers = $state<UserType[]>([]);


    function closeModal() {
        isOpen = false;
		selectedExistingMembers = []; // Reset selection
    }

    // --- Add Existing Members ---
    async function addSelectedMembers() {
		if (selectedExistingMembers.length === 0) return;

        isLoadingAdd = true;
        console.log('Adding existing members:', selectedExistingMembers);

		 // In Svelte 5, we directly modify the bound prop or call the callback
        try {
			 for (const member of selectedExistingMembers) {
				// TODO: Optional - If adding an existing member needs backend confirmation or updates (e.g., updating 'isOrganizerOf'),
				// call a backend hook here. For now, assume direct addition is allowed or handled by EventModal save.
				// Example API call (if needed):
                /*
				await pb.collection('spaceMembers').update(member.spaceMemberId, { // Assuming you have spaceMemberId
					'isOrganizerOf+': event.id
				});
                */

				// Notify parent to add visually
				 onOrganizerAdded({
					id: member.id,
					username: member.username,
					tasks: [] // Add with empty tasks initially, tasks assigned via OrganizersAndTasksSelect
				});
			 }
			 showAlert(`${selectedExistingMembers.length} membre(s) ajouté(s) à l'organisation.`, 'success');
             selectedExistingMembers = []; // Clear selection
        } catch (error) {
            console.error("Erreur lors de l'ajout de membres existants:", error);
            showAlert("Erreur lors de l'ajout de membres.", 'error');
        } finally {
             isLoadingAdd = false;
        }
		// Optionally close modal after adding:
		// closeModal();
    }


    // --- Invite New User ---
    async function handleInviteSubmit(data: { email: string; username: string }) {
		/* isLoadingInvite is handled by UserInvitationForm */
        console.log('Inviting to event:', data.email, data.username);

        try {
             // Call the specific backend hook for event invitation
             const result = await pb.send('/api/invite-to-event', { // Needs actual backend hook
                 method: 'POST',
                 body: {
                     email: data.email,
                     username: data.username,
                     spaceId: getSpace.id,
                     eventId: event.id,
                     isRecurrent: event.isRecurrent, // Pass recurrence info if needed by hook
                     role: Roles.invited, // Explicitly invite as 'invited' role for the event context
                     inviterName: pb.authStore.model?.username || 'Un membre'
                 }
             });

              // The hook should return the new/existing user ID and username upon success
             if (result && result.userId && result.username) {
                  showAlert(`Invitation envoyée avec succès à ${data.email}. Ajoutez maintenant ses mandats.`, 'success');
                  // Notify parent to add the newly invited user to the organizers list
                  onOrganizerInvited({id: result.userId, username: result.username});
                  // Maybe close modal or switch view? For now, stay open.
             } else {
                  // Handle cases where the hook might succeed but not return expected data
                  console.warn('Invitation hook succeeded but did not return expected user data:', result);
                  showAlert('Invitation envoyée, mais une information est manquante.', 'warning');
             }

        } catch (error: any) {
            console.error("Erreur lors de l'invitation à l'événement:", error);
             if (error?.data?.message) {
                 showAlert(`Erreur : ${error.data.message}`, 'error');
             } else {
                 showAlert("Erreur lors de l'envoi de l'invitation à l'événement.", 'error');
             }
        } finally {
             isLoadingInvite = false; // Reset loading specifically for invite form
        }
    }

</script>

{#if isOpen}
<div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="modal-box w-11/12 max-w-lg bg-base-100">
        <div class="flex justify-between items-center mb-4">
             <h3 class="text-lg font-bold">Ajouter/Inviter des organisateur·ices pour "{event.event_title}"</h3>
             <button class="btn btn-sm btn-circle btn-ghost" onclick={closeModal}>✕</button>
        </div>


        {#if potentialExistingOrganizers.length > 0}
         <div class="mb-6 border-b pb-4">
             <h4 class="font-semibold mb-3">Ajouter des membres existants de l'espace</h4>
              <ButtonGroupSelect
                    options={potentialExistingOrganizers}
                    optionsLabel="username"
					multiple={true}
					bind:selectedItems={selectedExistingMembers}
                />
              <div class="mt-3 text-right">
                  <button
                      class="btn btn-secondary btn-sm"
                      onclick={addSelectedMembers}
                      disabled={selectedExistingMembers.length === 0 || isLoadingAdd} >
                      {#if isLoadingAdd}<span class="loading loading-spinner loading-xs"></span>{/if}
                      Ajouter le(s) membre(s) sélectionné(s)
                  </button>
              </div>
         </div>
        {/if}

        <div class="mt-4">
            <h4 class="font-semibold mb-3">Inviter une nouvelle personne (par email)</h4>
             <UserInvitationForm
                    bind:isLoading={isLoadingInvite}
                    onsubmit={handleInviteSubmit}
                    oncancel={closeModal}
                    submitButtonText="Inviter cette personne"
                />
        </div>


        <div class="modal-action mt-6">
            <button class="btn" onclick={closeModal}>Fermer</button>
        </div>
    </div>
</div>
{/if}
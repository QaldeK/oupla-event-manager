<script lang="ts">
    import { showAlert } from '$lib/shared/states.svelte';
    import { fade } from 'svelte/transition';

    // Props
    type Props = {
        // Event emitted when the form is submitted with valid data
        onsubmit: (data: { email: string; username: string }) => void;
        // Function to call to close the modal/context containing the form
        oncancel: () => void;
        submitButtonText?: string;
        isLoading?: boolean;
    };
    let {
        onsubmit,
        oncancel,
        submitButtonText = 'Inviter',
        isLoading = $bindable(false)
    } = $props<Props>();

    // Local state
    let email = $state('');
    let username = $state('');

    // Derived state for validation
    let isValid = $derived(!!email.trim() && !!username.trim()); // Basic validation

    function handleSubmit(event: Event) {
        event.preventDefault(); // Prevent default form submission
        if (!isValid || isLoading) {
            if(!isValid) showAlert("L'email et le nom d'utilisateur sont requis", 'warning');
            return;
        }
        isLoading = true; // Set loading state locally if not bound
        onsubmit({ email: email.trim(), username: username.trim() });
         // `isLoading` should be reset by the parent component upon completion/error
    }

    function handleCancel() {
        oncancel();
    }

</script>

<form class="space-y-4" onsubmit={handleSubmit}>
    <div>
        <label for="invite-email" class="text-fluid-sm block font-medium text-gray-700">Email</label>
        <input
            type="email"
            id="invite-email"
            bind:value={email}
            class="input mt-1 block w-full"
            required
            disabled={isLoading}
        />
    </div>

    <div>
        <label for="invite-username" class="text-fluid-sm block font-medium text-gray-700"
            >Nom d'utilisateur</label
        >
        <input
            type="text"
            id="invite-username"
            bind:value={username}
            class="input mt-1 block w-full"
            required
            disabled={isLoading}
        />
        <!-- Basic validation message example -->
       {#if email && !email.includes('@')}
         <p class="text-xs text-error mt-1">Veuillez saisir une adresse email valide.</p>
       {/if}
    </div>


    <div class="flex justify-end space-x-3 pt-4">
        <button type="button" class="btn" onclick={handleCancel} disabled={isLoading}>
            Annuler
        </button>
        <button type="submit" class="btn btn-primary" disabled={!isValid || isLoading}>
            {#if isLoading}
                <span class="loading loading-spinner loading-sm"></span>
                Invitation...
            {:else}
                {submitButtonText}
            {/if}
        </button>
    </div>
</form>
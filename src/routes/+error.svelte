<script lang="ts">
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
</script>

<div data-theme="my-corporate" class="flex min-h-screen flex-col items-center justify-center bg-base-200">
	<div class="card w-full max-w-lg bg-base-100 text-base-content shadow-xl">
		<div class="card-body items-center text-center">
			<h1 class="text-6xl font-bold text-primary">{$page.status}</h1>
			<h2 class="card-title mt-4 text-2xl">Oups ! Une erreur est survenue.</h2>

			<p class="py-4">
                {#if $page.error?.message}
                    {$page.error.message}
                {:else if $page.status === 404}
                    Nous n'avons pas trouvé la page que vous cherchez.
                {:else}
                    Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support si le problème persiste.
                {/if}
            </p>

			<div class="card-actions mt-6 justify-center gap-4">
				<button class="btn btn-primary" onclick={() => goto('/dashboard', { replaceState: true })}>
					Retour au tableau de bord
				</button>
				<button class="btn btn-ghost" onclick={() => goto('/login', { replaceState: true })}>
					Se reconnecter
				</button>
			</div>
		</div>
	</div>
</div>

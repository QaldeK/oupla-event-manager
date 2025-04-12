<script lang="ts">
	import Info from '$lib/components/Info.svelte';
	import Frame from '$lib/components/Frame.svelte';
	import type { EventFormType } from '$lib/types/event';

	let { eventData = $bindable() } = $props();

	// Assurer que les propriétés nécessaires existent
	$effect.pre(() => {
		if (!eventData.recurrence) {
			eventData.recurrence = {
				autoConfirm: false,
				autoConfirmMin: 2,
				notifyNoOrganizer: false,
				notifyNoOrganizerDays: 5,
				notifyNotConfirmed: false,
				notifyNotConfirmedDays: 3
			};
		}
	});
</script>

<Frame title="Autres options">
	<div class="flex flex-col gap-6 lg:flex-row">
		<!-- Partie gauche: contrôles -->
		<div class="flex-1 space-y-6">
			<!-- Auto-confirmation -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-fluid-sm">Confirmer l'événement automatiquement</span>
					<input
						type="checkbox"
						class="toggle toggle-success"
						bind:checked={eventData.recurrence.autoConfirm}
						aria-label="Activer la confirmation automatique"
					/>
				</div>

				<div class="ml-2 items-center gap-3" class:opacity-50={!eventData.recurrence.autoConfirm}>
					<span class="text-fluid-sm">... lorsque</span>
					<input
						type="number"
						class="input input-sm w-16 text-center"
						min="1"
						max="10"
						bind:value={eventData.recurrence.autoConfirmMin}
						disabled={!eventData.recurrence.autoConfirm}
					/>
					<span class="text-fluid-sm">organisateur·ices se sont inscrit·es</span>
				</div>
			</div>

			<hr class="my-4" />

			<!-- Notification absence d'organisateurs -->
			<div class="space-y-3">
				<div class="text-fluid-sm font-semibold">Prévenir l'ensemble du groupe si :</div>

				<div
					class="ml-2 flex items-center gap-3"
					class:opacity-50={!eventData.recurrence.notifyNoOrganizer}
				>
					<div class="text-fluid-sm">
						<input
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={eventData.recurrence.notifyNoOrganizer}
							aria-label="Activer l'alerte d'absence d'organisateurs"
						/>
					</div>
					<span class="text-fluid-sm"> si personne n'est inscrit</span>
					<input
						type="number"
						class="input input-sm w-16 text-center"
						min="1"
						max="30"
						bind:value={eventData.recurrence.notifyNoOrganizerDays}
						disabled={!eventData.recurrence.notifyNoOrganizer}
					/>
					<span class="text-fluid-sm">jours avant</span>
				</div>
			</div>

			<!-- Notification événement non confirmé -->
			<div class="space-y-2">
				<div
					class="ml-2 flex items-center gap-3"
					class:opacity-50={!eventData.recurrence.notifyNotConfirmed}
				>
					<input
						type="checkbox"
						class="toggle toggle-primary"
						bind:checked={eventData.recurrence.notifyNotConfirmed}
						aria-label="Activer l'alerte d'événement non confirmé"
					/>
					<span class="text-fluid-sm"> si l'événement n'est pas confirmé</span>
					<input
						type="number"
						class="input input-sm w-16 text-center"
						min="1"
						max="30"
						bind:value={eventData.recurrence.notifyNotConfirmedDays}
						disabled={!eventData.recurrence.notifyNotConfirmed}
					/>
					<span class="text-fluid-sm">jours avant</span>
				</div>
			</div>
		</div>

		<!-- Partie droite: informations explicatives -->
		<div class="flex-1">
			{#if eventData.recurrence.autoConfirm}
				<Info variant="success">
					<h4 class="mb-1 font-medium">Confirmation automatique activée</h4>
					<p class="mb-2 text-sm">
						Les événements récurrents seront <strong>automatiquement confirmés</strong>
						lorsque toutes les conditions suivantes sont remplies :
					</p>
					<ul class="list-disc space-y-1 pl-5 text-sm">
						<li>Toutes les tâches sont assignées à des organisateur·ices</li>
						<li>
							Au moins <strong>{eventData.recurrence.autoConfirmMin} organisateur·ice(s)</strong> participent
							à l'événement
						</li>
					</ul>
				</Info>
			{/if}

			{#if eventData.recurrence.notifyNoOrganizer}
				<Info variant="warning">
					<h4 class="mb-1 font-medium">Alerte d'absence d'organisateur·ices</h4>
					<p class="text-sm">
						Un e-mail sera envoyé à l'équipe <strong
							>{eventData.recurrence.notifyNoOrganizerDays} jours</strong
						>
						avant l'événement si aucun·e organisateur·ice n'est inscrit·e.
					</p>
				</Info>
			{/if}

			{#if eventData.recurrence.notifyNotConfirmed}
				<Info variant="warning">
					<h4 class="mb-1 font-medium">Alerte d'événement non confirmé</h4>
					<p class="text-sm">
						Un e-mail sera envoyé à l'équipe <strong
							>{eventData.recurrence.notifyNotConfirmedDays} jours</strong
						>
						avant l'événement s'il n'est toujours pas confirmé.
					</p>
				</Info>
			{/if}

			{#if !eventData.recurrence.autoConfirm && !eventData.recurrence.notifyNoOrganizer && !eventData.recurrence.notifyNotConfirmed}
				<Info>
					<h4 class="mb-1 font-medium">Automatisations désactivées</h4>
					<p class="text-sm">
						Activez une ou plusieurs automatisations pour faciliter la gestion de vos événements
						récurrents. Ces options vous aideront à :
					</p>
					<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
						<li>
							Confirmer automatiquement les événements quand assez de bénévoles sont inscrit·es
						</li>
						<li>Recevoir des alertes quand des événements nécessitent votre attention</li>
					</ul>
				</Info>
			{/if}
		</div>
	</div>
</Frame>

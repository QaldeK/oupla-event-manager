<script lang="ts">
	import type { EventType } from "$lib/types/types";
	import { CalendarCogIcon, CalendarPlus, UserCheck, UserPlus } from "lucide-svelte";

	interface Props {
		event: EventType;
		hasAuth: boolean;
		isSondage: boolean;
		hasNoPropositions: boolean;
		hasDate: boolean;
		notRecurrentOrUserInTeam: boolean;
		generalTaskButtonState: {
			text: string;
			disabled: boolean;
			isSubscribed: boolean;
			// variant: "error" | "primary" | "disabled";
		};
		onSondageClick: () => void;
		onTaskSubscription: () => void;
	}

	const {
		event,
		hasAuth,
		isSondage,
		hasNoPropositions,
		hasDate,
		notRecurrentOrUserInTeam,
		generalTaskButtonState,
		onSondageClick,
		onTaskSubscription
	}: Props = $props();

	const organizersLabel = $derived.by(() => {
		if (isSondage) return "Organisateur•ices - Sondage disponibilité";
		else if (hasNoPropositions) return "Pas de dates proposées";
		return "Organisateur•ices";
	});
</script>

<div class="flex w-full items-center justify-between p-1">
	<div class="flex flex-col gap-2 p-2">
		<div class="text-fluid-sm font-semibold">
			{organizersLabel}
		</div>
		<!-- {#if event.isRecurrent}
			<div class="flex flex-wrap items-baseline gap-2">
				<span class="font-base text-base-content/80">Equipe:</span>
				{#each event.recurrence.recurrenceTeam as memberOfTeam, index (index + memberOfTeam.id)}
					<span class="badge">{memberOfTeam.username}</span>
				{/each}
			</div>
		{/if} -->
	</div>

	<div class="me-1 self-start">
		{#if isSondage && hasAuth}
			<button
				onclick={onSondageClick}
				class="btn btn-primary btn-outline btn-compact"
				aria-label="Modifier le sondage"
				data-tip="Modifier le sondage"
			>
				<CalendarCogIcon />
				<span class="@max-xl:hidden">Modifier le sondage</span>
			</button>
		{:else if hasDate && event.tasks?.length === 1 && notRecurrentOrUserInTeam}
			<button
				class="btn btn-outline btn-compact {generalTaskButtonState.isSubscribed
					? 'btn-error'
					: 'btn-primary'}"
				onclick={onTaskSubscription}
				disabled={generalTaskButtonState.disabled}
			>
				{#if generalTaskButtonState.isSubscribed}
					<UserCheck />
				{:else}
					<UserPlus />
				{/if}
				{generalTaskButtonState.text}
			</button>
		{:else if hasNoPropositions && hasAuth}
			<button
				onclick={onSondageClick}
				class="btn btn-compact btn-primary btn-outline"
				aria-label="Créer un sondage"
				data-tip="Créer un sondage"
			>
				<CalendarPlus />
				<span class="not-md:hidden">Créer un sondage</span>
			</button>
		{/if}
	</div>
</div>

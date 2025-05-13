<script lang="ts">
	import ConflictAlert from "$lib/components/ConflictAlert.svelte";
	import Info from "$lib/components/Info.svelte";
	import { type EventType } from "$lib/types/event";
	import { lisibleDate } from "$lib/utils";
	import { modifyRecord } from "$lib/pocketbase.svelte";
	import { modalState } from "$lib/shared/states.svelte";
	import "flatpickr/dist/flatpickr.min.css";
	import "tippy.js/dist/tippy.css";

	import DatePicker from "./DatePicker.svelte";
	import TimeReservation from "./TimeReservation.svelte";

	interface Props {
		localErrors: unknown;
		eventData: EventType;
		startDateObject: Date | null;
		endDateObject: Date | null;
	}
	let {
		localErrors,
		eventData = $bindable<EventType>({} as EventType),
		startDateObject,
		endDateObject
	}: Props = $props();

	// Fonction de transition vers le mode sondage
	function switchToSondage() {
		eventData.isSondage = true;
		resetDate();
	}

	const resetDate = (): void => {
		eventData.date_event = "";
		eventData.time_start = "";
		eventData.time_end = "";
		eventData.start_event = "";
		eventData.start_public = "";
		eventData.organizers = []; // FIXIT : les organizer inscrit a des tasks beforeEvent peuvent etre préserver pour ces taches
	};

	const cancelEvent = (): void => {
		modalState.confirm = {
			isOpen: true,
			data: {
				variant: "danger",
				title: "Annuler l'événement",
				message:
					"Êtes-vous sûr de vouloir annuler cet événement ? Les organisateur·ices en seront notifiées par email, et l'événement sera annoncé comme annulé sur le site s'il s'agissait d'un événement public.",
				onConfirm: () => {
					modifyRecord("events", eventData.id, { canceled: true });
					modalState.event = false;
				}
			}
		};
	};
	// $inspect('localErrors', localErrors);
</script>

<div class="space-y-6">
	{#if !eventData.isConfirmed}
		<Info>
			{#if !eventData.dates_proposed?.length}
				<p>
					Si plusieurs dates sont envisagées, vous pouvez
					<button class="link link-primary" onclick={switchToSondage}> créer un sondage </button>
				</p>
			{:else}
				<p>
					Un sondage pour determiner la date de cet événement à lieu. Si la date choisie ne convient
					plus, vous pouvez le
					<button class="link link-primary" onclick={switchToSondage}>rétablir</button>
				</p>
			{/if}
		</Info>
		<div class="lg:w-1/2">
			<DatePicker
				initialValue={eventData.date_event}
				eventId={eventData.id}
				onChange={(value) => {
					if (value) eventData.date_event = value as string;
				}}
				onResetDate={resetDate}
				resetButton={true}
				label="Date de l'événement"
			/>

			{#if localErrors && localErrors.date_event}
				<p class="text-fluid-sm text-error p-2 italic">{localErrors.date_event}</p>
			{/if}
		</div>
	{:else}
		<Info>
			<p>
				L'événement à été <span class="font-semibold">confirmé</span> pour la date du
				<span class="font-semibold">{lisibleDate(eventData.date_event)}</span>, de
				<span class="font-semibold">{eventData.time_start} à {eventData.time_end}</span>
				{#if eventData.start_public}(ouverture au public : {eventData.start_public})
				{/if}
				{#if eventData.start_event}
					(début de l'événement : {eventData.start_event}){/if}.
			</p>
			<ul>
				<li>
					La date n'est plus modifiable. Si l'événement n'a plus lieu à cette date, vous pouvez <button
						class="link link-error"
						onclick={cancelEvent}>annuler</button
					>
					ou
					<button class="link link-primary">reporter</button> l'événement.
				</li>
				<li>
					Si vous annulez, reportez ou modifiez les horaires de l'événement, les organisateur·ices
					inscrit·es seront notifié·es par email des changements.
				</li>
			</ul>
		</Info>
	{/if}

	<TimeReservation {localErrors} bind:eventData />
	{#if startDateObject && endDateObject}
		<ConflictAlert
			eventId={eventData.id}
			startDate={startDateObject}
			endDate={endDateObject}
			rooms={eventData.rooms || []}
		/>
	{/if}
</div>

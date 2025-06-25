<script lang="ts">
	import ErrorMessage from "$lib/components/ErrorMessage.svelte";
	import TimePickRange from "$lib/components/TimePickRange.svelte";
	import { showAlert } from "$lib/shared/states.svelte";
	import { addTime } from "$lib/utils";
	import "flatpickr/dist/flatpickr.min.css";
	import "tippy.js/dist/tippy.css";

	let {
		errors = {},
		eventData = $bindable({
			time_start: "",
			time_end: "",
			start_public: "",
			start_event: "",
			isPublic: Boolean
		})
	} = $props();

	let alertMsg = $state("");

	$effect(() => {
		if (alertMsg !== "") {
			showAlert(alertMsg, "error");
		}
	});

	$effect(() => {
		if (!eventData.time_start || !eventData.time_end) return;

		let timeStart = parseInt(eventData.time_start.replace(":", ""));
		let timeEnd = parseInt(eventData.time_end.replace(":", ""));
		let startPublic = eventData.start_public
			? parseInt(eventData.start_public.replace(":", ""))
			: null;
		let startEvent = eventData.start_event
			? parseInt(eventData.start_event.replace(":", ""))
			: null;

		// Vérifier la cohérence des heures pour ouverture au public
		if (startPublic) {
			// Si l'événement se termine le lendemain (timeEnd < timeStart)
			const isMultiDay = timeEnd < timeStart;

			if (!isMultiDay) {
				// Événement le même jour : logique classique
				if (startPublic < timeStart || startPublic > timeEnd) {
					if (startPublic < timeStart) {
						alertMsg =
							"L'ouverture au public ne peut pas être avant l'heure de début de réservation.";
						eventData.start_public = eventData.time_start;
					} else {
						alertMsg =
							"L'ouverture au public ne peut pas être après l'heure de fin de réservation.";
						eventData.start_public = eventData.time_end;
					}
				}
			} else {
				// Événement multi-jour : startPublic doit être >= timeStart OU <= timeEnd
				if (startPublic < timeStart && startPublic > timeEnd) {
					alertMsg = "L'ouverture au public doit être dans la plage horaire de réservation.";
					eventData.start_public = eventData.time_start;
				}
			}
		}

		// Vérifier la cohérence des heures pour début d'événement
		if (startEvent) {
			const effectiveStart = startPublic || timeStart;
			const isMultiDay = timeEnd < timeStart;

			if (!isMultiDay) {
				// Événement le même jour
				if (startEvent < effectiveStart || startEvent > timeEnd) {
					if (startEvent < effectiveStart) {
						alertMsg =
							"Le début de l'événement ne peut pas être avant l'heure de début de réservation.";
						eventData.start_event = startPublic ? eventData.start_public : eventData.time_start;
					} else {
						alertMsg =
							"Le début de l'événement ne peut pas être après l'heure de fin de réservation.";
						eventData.start_event = eventData.time_end;
					}
				}
			} else {
				// Événement multi-jour : startEvent doit être >= effectiveStart OU <= timeEnd
				if (startEvent < effectiveStart && startEvent > timeEnd) {
					alertMsg = "Le début de l'événement doit être dans la plage horaire de réservation.";
					eventData.start_event = startPublic ? eventData.start_public : eventData.time_start;
				}
			}
		}
	});
</script>

<!-- {#if alertMsg}
	<Alert message={alertMsg} type="error" />
{/if} -->
<div class="flex flex-wrap gap-x-10 gap-y-4">
	<div class="flex flex-col">
		<div class="flex items-end gap-x-6 gap-y-2">
			<TimePickRange
				bind:value={eventData.time_start}
				classAdd="md:w-48 w-full"
				initial="17:00"
				label="Réservation de :"
			/>
			<TimePickRange
				bind:value={eventData.time_end}
				classAdd="md:w-48 w-full"
				initial={addTime(eventData.time_start, 180)}
				label="à :"
			/>
		</div>
		<p class="text-fluid-sm pt-1 text-gray-500 italic">horaires de réservation du lieu</p>
		<ErrorMessage error={errors?.timeStart || errors?.timeEnd} />
	</div>

	{#if eventData.isPublic}
		<div class="flex flex-col">
			<div class="flex items-center gap-x-6 gap-y-2">
				<TimePickRange
					bind:value={eventData.start_public}
					classAdd="md:w-48 w-full"
					initial={addTime(eventData.time_start, 10)}
					label="ouverture au public :"
				/>
				<TimePickRange
					bind:value={eventData.start_event}
					classAdd="md:w-48 w-full"
					initial={addTime(eventData.start_public || eventData.time_start, 20)}
					label="début de l'événement :"
				/>
			</div>
			<p class="text-fluid-sm pt-1 text-gray-500 italic">horaires annoncées au public</p>
			<div class="max-w-96"><ErrorMessage error={errors?.publicStartTime} /></div>
		</div>
	{/if}
</div>

<style>
</style>

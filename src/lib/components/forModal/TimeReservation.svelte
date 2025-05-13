<script lang="ts">
	import TimePickRange from "$lib/components/TimePickRange.svelte";
	import { addTime } from "$lib/utils";
	import { showAlert } from "$lib/shared/states.svelte";
	import "flatpickr/dist/flatpickr.min.css";
	import "tippy.js/dist/tippy.css";

	let {
		localErrors,
		eventData = $bindable({
			time_start: "",
			time_end: "",
			start_public: "",
			start_event: ""
		})
	} = $props();

	let isLoading: boolean = true;
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

		const isTimeEndBeforeStart = timeEnd <= timeStart;
		const isTimeEndAfter00 = timeEnd >= 600 && timeEnd <= timeStart;
		const isStartPublicValid = startPublic && startPublic >= timeStart && startPublic <= timeEnd;
		const isStartEventValid =
			startEvent && startEvent >= (startPublic || timeStart) && startEvent <= timeEnd;

		if (isTimeEndAfter00) {
			alertMsg = "L'heure de fin ne peut pas être après 23:59";
			eventData.time_end = "23:59";
		} else if (isTimeEndBeforeStart) {
			alertMsg = "L'heure de fin doit être apres l'heure de debut...";
			eventData.time_end = addTime(eventData.time_start, 180);
		} else if (startPublic && !isStartPublicValid) {
			if (startPublic < timeStart) {
				alertMsg = "L'ouverture au public ne peut pas être avant l'heure de début de réservation.";
				eventData.start_public = eventData.time_start;
			} else if (startPublic > timeEnd) {
				alertMsg = "L'ouverture au public ne peut pas être après l'heure de fin de réservation.";
				eventData.start_public = eventData.time_end;
			}
		}

		if (startEvent && !isStartEventValid && !isTimeEndAfter00) {
			if (startEvent < (startPublic || timeStart)) {
				alertMsg =
					"Le début de l'événement ne peut pas être avant l'heure de début de réservation.";
				eventData.start_event = startPublic ? eventData.start_public : eventData.time_start;
			} else if (startEvent > timeEnd) {
				alertMsg = "Le début de l'événement ne peut pas être après l'heure de fin de réservation.";
				eventData.start_event = eventData.time_end;
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
		{#if localErrors.time_start || localErrors.time_end}
			<p class="text-fluid-xs text-error pt-1 italic">
				{localErrors.time_start || localErrors.time_end}
			</p>
		{/if}
	</div>

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
		{#if localErrors.start_public}
			<p class="text-fluid-sm text-error italic">{localErrors.start_public}</p>
		{/if}
	</div>
</div>

<style>
</style>

<script>
	const { thisEvent: currentEvent } = $props();

	const alerts = $derived.by(() => {
		const alertList = [];

		if (!currentEvent.date_event) {
			alertList.push({
				label: 'Quand ?',
				bgColor: 'bg-amber-500'
			});
		}

		if (currentEvent.canceled) {
			alertList.push({
				label: 'Annulé',
				bgColor: 'bg-red-700'
			});
			return alertList; // Si annulé, on affiche que annulé, et on stop.
		}

		if (!currentEvent.organizers?.length) {
			if (currentEvent.isConfirmed) {
				alertList.push({
					label: "Personne d'inscrit!",
					bgColor: 'bg-red-900'
				});
			} else {
				alertList.push({
					label: 'Qui ?',
					bgColor: 'bg-red-500'
				});
			}
		} else if (currentEvent.organizers?.length < 3 && currentEvent.isConfirmed) {
			alertList.push({
				label: `${currentEvent.organizers.length} inscrit·es..`,
				bgColor: 'bg-red-400'
			});
		}

		if (currentEvent.isConfirmed && currentEvent.organizers?.length > 0) {
			alertList.push({
				label: 'Confirmé',
				bgColor: 'bg-green-700'
			});
		} else if (!currentEvent.isConfirmed) {
			alertList.push({
				label: 'à confirmer',
				bgColor: 'bg-amber-500'
			});
		}

		return alertList;
	});
</script>

<div
	id="top-alert"
	class="text-fluid-sm flex justify-end rounded-tr-lg text-center font-semibold text-white"
>
	{#each alerts as alert (alert.label)}
		<div class="flex w-fit flex-wrap gap-x-4 p-0.5 px-4 {alert.bgColor}">
			<span>{alert.label}</span>
		</div>
	{/each}
</div>

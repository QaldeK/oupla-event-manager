<script>
	import flatpickr from 'flatpickr';

	import { Clock } from 'lucide-svelte';

	let {
		value = $bindable(),
		initial = '17:00',
		classAdd = '',
		label = '',
		placeholder = 'HH:MM',
		minTime = '06:00'
	} = $props();

	let fpid = `time-picker-${crypto.randomUUID()}`;
	let fpInstance;

	$effect(() => {
		// @ts-ignore
		fpInstance = flatpickr(document.getElementById(fpid), {
			enableTime: true,
			noCalendar: true,
			minuteIncrement: 10,
			defaultDate: value,
			time_24hr: true,
			minTime: minTime,
			maxTime: '23:59',
			dateFormat: 'H:i',
			static: true,
			onClose: (selectedDates, dateStr) => {
				value = dateStr;
			},
			onOpen: () => {
				if (!value) {
					fpInstance.setDate(initial);
				}
			}
		});

		return () => {
			if (fpInstance) {
				fpInstance.destroy();
			}
		};
	});

	// Mettre à jour l'instance Flatpickr lorsque la valeur change
	$effect(() => {
		if (fpInstance && value) {
			fpInstance.setDate(value, false);
		}
	});

	// Mettre à jour minTime lorsque la prop change
	$effect(() => {
		if (fpInstance) {
			fpInstance.set('minTime', minTime);
		}
	});
</script>

<div class="grid">
	<label for={fpid} class="text-fluid-sm">
		{label}
	</label>
	<input
		id={fpid}
		{value}
		type="text"
		class="{classAdd
			? classAdd
			: ''} border-base-300 flex w-full rounded-lg border bg-white py-2 pr-10 pl-3 shadow-xs focus:outline-hidden"
		{placeholder}
	/>
</div>

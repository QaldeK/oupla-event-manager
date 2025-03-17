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

	let fpid = `time-picker-${Math.random().toString(36).slice(2, 9)}`;
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

<div class="flex items-center gap-x-2">
	<label for={fpid} class="text-fluid-sm font-medium text-gray-700"
		>{label}
		<div class="flex items-center rounded-md border border-gray-300 bg-gray-200 shadow-xs">
			<Clock class="pointer-events-none mx-2 hidden items-center text-gray-700 md:block" />
			<input
				id={fpid}
				{value}
				type="text"
				class="px-2 py-2 {classAdd
					? classAdd
					: ''} rounded-md rounded-l-none bg-white text-base text-gray-700 focus:outline-hidden"
				{placeholder}
			/>
		</div>
	</label>
</div>

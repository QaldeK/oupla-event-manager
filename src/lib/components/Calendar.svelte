<script>
	import {
		addDays,
		addMonths,
		eachDayOfInterval,
		endOfMonth,
		endOfWeek,
		format,
		isSameDay,
		isSameMonth,
		startOfMonth,
		startOfWeek,
		subMonths
	} from 'date-fns';
	import { fr } from 'date-fns/locale';

	export let events = [];

	let currentMonth = new Date();
	let selectedDate = new Date();

	function onDateClick(day) {
		selectedDate = day;
		console.log(selectedDate);
	}

	function nextMonth() {
		currentMonth = addMonths(currentMonth, 1);
	}

	function prevMonth() {
		currentMonth = subMonths(currentMonth, 1);
	}

	$: monthStart = startOfMonth(currentMonth);
	$: monthEnd = endOfMonth(monthStart);
	$: startDate = startOfWeek(monthStart);
	$: endDate = endOfWeek(monthEnd);
	$: days = eachDayOfInterval({ start: startDate, end: endDate });

	// Réactivité : recalculer les événements pour chaque jour lorsque 'events' change
	$: daysWithEvents = days.map((day) => ({
		date: day,
		events: events.filter((event) => isSameDay(new Date(event.date_event), day))
	}));
</script>

<div class="mx-auto w-full max-w-4xl">
	<div class="flex items-center justify-between bg-blue-500 p-4 text-white">
		<button on:click={prevMonth} class="p-2">&lt;</button>
		<span class="text-xl font-bold">
			{format(currentMonth, 'MMMM yyyy', { locale: fr })}
		</span>
		<button on:click={nextMonth} class="p-2">&gt;</button>
	</div>

	<div class="grid grid-cols-7 bg-gray-200">
		{#each ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as day}
			<div class="p-2 text-center font-bold">{day}</div>
		{/each}
	</div>

	<div class="bg-white">
		<div class="grid grid-cols-7">
			{#each daysWithEvents as { date, events }}
				<div
					class="h-32 border p-2 {!isSameMonth(date, monthStart) ? 'text-gray-400' : ''} {isSameDay(
						date,
						selectedDate
					)
						? 'bg-blue-200'
						: ''}"
					on:click={() => onDateClick(date)}
				>
					<span class="float-right">{format(date, 'd')}</span>
					{#each events as event}
						<div class="text-fluid-sm mt-1 rounded bg-blue-100 p-1">
							{event.event_title} ({event.time_start}-{event.time_end})
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

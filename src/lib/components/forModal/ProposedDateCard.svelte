<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { CalendarCheck, Trash2 } from 'lucide-svelte';
	import OrganizersSelect from './OrganizersSelect.svelte';
	import ConflictAlert from '$lib/components/ConflictAlert.svelte';
	import { lisibleDate, lisibleTime } from '$lib/utils';
	import type { OrganizerType } from '$lib/types/event';

	type DateProposal = {
		dateStart: string;
		dateEnd: string;
		organizers: OrganizerType[];
	};

	let { date, index, bestDate, dateAccepted, eventId, rooms, eventData, onRemove, onValidate } =
		$props<{
			date: DateProposal;
			index: number;
			bestDate: string | null;
			dateAccepted: DateProposal | null;
			eventId: string;
			rooms: string[];
			eventData: any;
			onRemove: (index: number) => void;
			onValidate: (date: DateProposal) => void;
		}>();

	let organizer_select: HTMLDialogElement;

	const activeOrganizers = $derived(
		date.organizers.filter((org) => org.maybehere && org.maybehere !== '')
	);

	// Fonction de conversion pour obtenir le format YYYYMMDDHHmm
	const formatDateTimeString = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		return `${year}${month}${day}${hours}${minutes}`;
	};
</script>

<div
	class="mt-4 rounded-xl shadow {bestDate === date.dateStart ? 'border-l-4 border-l-green-300' : ''}
    {dateAccepted?.dateStart === date.dateStart ? 'bg-green-50' : 'bg-white'}"
>
	<!-- Header avec la date et les actions -->
	<div
		class="py-.5 bg-base-300 -top-0 left-2.5 items-center justify-between rounded-t-xl px-4 font-semibold text-gray-700 sm:flex"
	>
		<div>
			<span class="text-nowrap">{lisibleDate(date.dateStart)}, </span>
			<span class="ms-1 text-nowrap">
				de {lisibleTime(date.dateStart)} à {lisibleTime(date.dateEnd)}
			</span>
		</div>

		<!-- Action buttons -->
		<div class="gap-x-4 p-1 sm:flex">
			<div data-tip="Supprimer cette proposition de date" class="tooltip">
				<button class="btn btn-square btn-soft btn-error" onclick={() => onRemove(index)}>
					<Trash2 />
				</button>
			</div>
			<div
				data-tip={date.organizers.length === 0
					? 'Au moins un·e organisateur·ice est requis pour accepter la date'
					: 'Accepter la date'}
				class="tooltip"
			>
				<button
					class="btn btn-success btn-square btn-soft {dateAccepted?.dateStart === date.dateStart
						? 'bg-green-500 text-white'
						: ''}"
					onclick={() => onValidate(date)}
					disabled={date.organizers.length === 0}
				>
					<CalendarCheck />
				</button>
			</div>
		</div>
	</div>

	<!-- Organisateurs section -->
	<div class="p-4">
		<div class="mb-4 flex flex-wrap gap-2">
			{#each activeOrganizers as organizer}
				<div
					class="badge {organizer.maybehere === 'oui'
						? 'badge-success'
						: organizer.maybehere === 'peut-être'
							? 'badge-warning'
							: 'badge-error'}"
				>
					{organizer.username}
				</div>
			{/each}
		</div>

		<button class="btn btn-soft btn-sm btn-primary" onclick={() => organizer_select.showModal()}>
			Inscrire
		</button>
	</div>

	<!-- Modal -->
	<dialog bind:this={organizer_select} class="modal">
		<div class="modal-box w-11/12 max-w-5xl">
			<h3 class="text-lg font-bold">Sélectionner les organisateur·ices</h3>
			<OrganizersSelect bind:organizers={date.organizers} />
			<div class="modal-action">
				<form method="dialog">
					<button class="btn">Fermer</button>
				</form>
			</div>
		</div>
	</dialog>

	<!-- Conflict Alert -->
	<ConflictAlert
		{eventId}
		dateTimeStart={formatDateTimeString(new Date(date.dateStart))}
		dateTimeEnd={formatDateTimeString(new Date(date.dateEnd))}
		{rooms}
	/>
</div>

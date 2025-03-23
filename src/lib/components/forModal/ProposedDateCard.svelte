<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { CalendarCheck, Trash2, UserPlus } from 'lucide-svelte';
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
		class="py-.5 bg-base-300 -top-0 left-2.5 grid items-center justify-center rounded-t-xl px-4 font-semibold sm:flex sm:justify-between"
	>
		<div class="text-fluid-base">
			<span class="text-nowrap">{lisibleDate(date.dateStart)}, </span>
			<span class="ms-1 text-nowrap">
				de {lisibleTime(date.dateStart)} à {lisibleTime(date.dateEnd)}
			</span>
		</div>

		<!-- Action buttons -->
		<div class="flex justify-center gap-x-6 p-1">
			<button
				class="btn btn-soft btn-sm btn-primary not-sm:w-1/3"
				onclick={() => organizer_select.showModal()}
			>
				<UserPlus />
				<span class="not-sm:hidden">Modifier</span>
			</button>

			<button class="btn btn-soft btn-error btn-sm not-sm:w-1/3" onclick={() => onRemove(index)}>
				<Trash2 />
				<span class="not-sm:hidden">Supprimer</span>
			</button>

			<button
				class="btn btn-sm btn-success btn-soft not-sm:w-1/3 {dateAccepted?.dateStart ===
				date.dateStart
					? 'bg-green-500 text-white'
					: ''}"
				onclick={() => onValidate(date)}
				disabled={date.organizers.length === 0}
			>
				<CalendarCheck />
				<span class="not-sm:hidden">Valider</span>
			</button>
		</div>
	</div>

	<!-- Organisateurs section -->
	<div class="p-4">
		<div class=" flex flex-wrap gap-2">
			{#each activeOrganizers as organizer (organizer)}
				<div
					class="badge badge-soft font-semibold {organizer.maybehere === 'oui'
						? 'badge-success '
						: organizer.maybehere === 'peut-être'
							? 'badge-warning'
							: 'badge-error'}"
				>
					{organizer.username}
				</div>
			{/each}
		</div>
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

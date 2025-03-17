<script>
	import SeparatorSelect from '$lib/components/SeparatorSelect.svelte';
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import { lisibleDate } from '$lib/utils';
	import { sendEmail } from '$lib/pocketbase.svelte';
	import { Editor } from '@tadashi/svelte-editor-quill';
	import { addDays, format, isWithinInterval } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import 'quill/dist/quill.core.css';
	import 'quill/dist/quill.snow.css';

	import { onMount } from 'svelte';

	const confirmedEvents = eventsStore.confirmedEvents;
	// ::: génération automatique du contenu quilljs

	// Function to get future events within a specified number of days
	function getFutureEvents(events, daysAhead = 30) {
		const today = new Date();
		const futureDate = addDays(today, daysAhead);

		return events.filter((event) => {
			// Ensure the event has a valid date
			if (!event.date_event || event.canceled) return false;

			// Parse the event date
			const eventDate = new Date(event.date_event);

			// Check if the event is within the future interval
			return isWithinInterval(eventDate, { start: today, end: futureDate });
		});
	}

	// Mapping of radio button labels to days
	const periodOptions = [
		{ label: 'Semaine prochaine', days: 7 },
		{ label: '30 prochains jours', days: 30 },
		{ label: '45 prochains jours', days: 45 }
	];

	let selectedPeriod = $state(30); // Default to 30 days
	let eventsInPeriod = $state([]);

	let introMessage = $state('Et voici les prochains événements !');
	let outroMessage = $state('A bientot !');

	let includeCanceled = $state(true);
	let canceledMessage = $state(
		'Désolé, mais certains événement annoncé ont finalement du être annulés...'
	);
	let canceledToSend = $state([]);

	$effect(() => {
		canceledToSend = confirmedEvents.filter((event) => event.canceled);
	});

	// Get events based on selected period
	$effect(() => {
		eventsInPeriod = getFutureEvents(confirmedEvents, selectedPeriod);
	});

	let eventsToSend = $derived(eventsInPeriod.filter((event) => !event.isSendToNewsletter));

	// Fonction pour générer le contenu HTML de la newsletter
	function generateNewsletterHTML() {
		let html = '';

		// Ajouter le message d'introduction
		html += `<p>${introMessage}</p><br>`;

		// Ajouter le message d'annulation si inclus
		if (includeCanceled && canceledToSend.length > 0) {
			html += `<p> ${canceledMessage}</p><br>`;
			canceledToSend.forEach((event) => {
				html += generateEventHTML(event, true) + '<br><hr>';
			});
		}

		// Ajouter les événements à venir
		html += `<p>━━━━━━ ◦ ❖ ◦ ━━━━━━</p><h2>Événements à venir : </h2>  <br> `;
		eventsToSend.forEach((event) => {
			html += generateEventHTML(event, false);
		});

		// Ajouter le message de fin
		html += `<p>${outroMessage}</p>`;

		return html;
	}
	// ::: mail events format

	function generateEventHTML(event, isCanceled) {
		const eventDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });

		if (isCanceled) {
			if (event.reportedTo) {
				return `
<p>${preCanceled} ANNULÉ ${event.event_title}, initialement prévu le ${eventDate}, est REPORTÉ au <strong>${lisibleDate(event.reportedTo)}</strong> </p>
<p> ${separatorTitle}</p>
`;
			} else {
				return `
<p>${preCanceled} ANNULÉ: ${event.event_title}, initialement prévu le ${eventDate}</p>${separatorTitle}
				`;
			}
		} else {
			return `
<p> ${separatorEvent}</p>
<p><strong>${preDate} ${eventDate.toUpperCase()} ${event?.start_public}</strong></p>
<p><strong>${preEvent} ${event.event_title}</strong></p>${separatorTitle}
<p>${generateEventDetailsHTML(event)}</p>
${event?.start_event !== event?.start_public ? `<p><strong>ouverture: ${event?.start_public} - début prévu à ${event?.start_event} </strong></p>` : ''}
<p>${event?.desc_public}</p>
<br>
`;
		}
	}

	function generateEventDetailsHTML(event) {
		if (
			event.isMixiteChoisie ||
			!event.is_age_no_restriction ||
			event.duree ||
			!event.is_prix_libre
		) {
			return `
				<p>
						${event.is_prix_libre ? '' : `Prix: ${event.prix}`}
						${event.isMixiteChoisie ? ` - mixité : ${event.mixite}` : ''}
						${event.is_age_no_restriction ? '' : ` - Age : ${event.age_advice}`}
						${event.duree ? ` - Durée : ${event.duree}` : ''}
					</p>
			`;
		} else {
			return '';
		}
	}

	// ::: __ special chars
	let separatorEvent = $state('<p> ◦ ❖ ◦ </p>');
	let separatorTitle = $state('<p>· · · · · · · · ·<p>');
	let preDate = $state('▲');
	let preEvent = $state('▼');
	let preCanceled = $state('⚠');

	const preEventOptions = [
		{ label: '▼', value: '▼' },
		{ label: '▲', value: '▲' },
		{ label: '✱', value: '✱' },
		{ label: '✲', value: '✲' },
		{ label: '✳', value: '✳' },
		{ label: '✴', value: '✴' },
		{ label: '✵', value: '✵' },
		{ label: '✶', value: '✶' },
		{ label: '✷', value: '✷' },
		{ label: '✸', value: '✸' },
		{ label: '✹', value: '✹' },
		{ label: '✺', value: '✺' },
		{ label: '✻', value: '✻' },
		{ label: '✽', value: '✽' },
		{ label: '✾', value: '✾' },
		{ label: '✿', value: '✿' },
		{ label: '❀', value: '❀' },
		{ label: '❁', value: '❁' },
		{ label: '❂', value: '❂' },
		{ label: '❃', value: '❃' },
		{ label: '✪', value: '✪' },
		{ label: '✫', value: '✫' },
		{ label: '✬', value: '✬' },
		{ label: '✯', value: '✯' },
		{ label: '❖', value: '❖' },
		{ label: '♠', value: '♠' },
		{ label: '♣', value: '♣' },
		{ label: '♥', value: '♥' },
		{ label: '◆', value: '◆' },
		{ label: '◦', value: '◦' }
	];

	// ::: quilljs functions
	// Mettre à jour le contenu de la newsletter quand les événements changent
	let generationOk = $state(false);
	let data = $state('');
	let html = $state('');
	let text = $state('');
	let debounceTimer;
	$inspect('data', data);

	function btnGenerate() {
		generationOk = false;
		console.log('Generating newsletter...');
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			data = generateNewsletterHTML();
			// html = data;
			generationOk = true;
		}, 200);
	}
	let toolbarOptions = [
		[{ header: 1 }, { header: 2 }, { header: 3 }],
		['bold', 'italic', 'underline', 'strike'],
		[{ list: 'ordered' }, { list: 'bullet' }],
		[{ align: [] }],
		['clean']
	];

	const options = {
		modules: {
			toolbar: toolbarOptions
		},
		theme: 'snow'
	};

	const onTextChange = (event) => {
		clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			({ text, html } = event?.detail ?? {});
			data = html;
		}, 500);
	};

	let isSending = $state(false);

	function sendNewsletter() {
		if (isSending) return;
		isSending = true;
		sendEmail(html, text);
		isSending = false;
	}

	// TEST
	onMount(() => {
		selectedPeriod = 30;
		btnGenerate();
	});
</script>

<div class="period-selector">
	<fieldset>
		<legend>Evénements à inclure dans la newsletters</legend>
		<div>
			{#each periodOptions as option}
				<label>
					<input type="radio" name="period" value={option.days} bind:group={selectedPeriod} />
					{option.label}
				</label>
			{/each}
		</div>
		<label class="flex cursor-pointer items-center rounded-lg px-3 py-2 hover:bg-gray-200"
			><input
				type="checkbox"
				class="h-5 w-5 cursor-pointer rounded shadow-sm transition-all"
				bind:checked={includeCanceled}
			/>
			<span class="ml-1 cursor-pointer text-gray-600">Prévenir des annulations</span>
		</label>
	</fieldset>
</div>
<div>
	<div class="my-6">
		<label for="select" class="text-fluid-sm block font-medium text-gray-700"
			>Sélectionnez un template</label
		>
		<select
			id="select"
			class="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 text-base text-gray-900 focus:border-blue-500 focus:ring-blue-500"
			bind:value={preEvent}
		>
			{#each preEventOptions as template}
				<option value={template.value}>{template.label}</option>
			{/each}
		</select>
	</div>
</div>
<div>
	<button
		class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
		onclick={btnGenerate}>Générer</button
	>

	<button
		class="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700"
		onclick={() => navigator.clipboard.writeText(html)}>copier</button
	>

	{#if generationOk}
		<Editor {options} {data} on:text-change={onTextChange} />
	{/if}

	<button
		class="rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
		onclick={sendNewsletter}
		disabled={isSending}
	>
		{isSending ? 'Envoi en cours...' : 'Envoyer la newsletter'}
	</button>
</div>

<!-- {@html data} -->
<style>
	.period-selector {
		margin-bottom: 1rem;
	}
	fieldset {
		display: flex;
		gap: 1rem;
		border: none;
	}
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>

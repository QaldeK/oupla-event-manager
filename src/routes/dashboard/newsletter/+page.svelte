<script lang="ts">
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import { lisibleDate } from '$lib/utils';
	import { sendEmail } from '$lib/pocketbase.svelte';
	import { Editor } from '@tadashi/svelte-editor-quill';
	import { addDays, format, isWithinInterval } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import 'quill/dist/quill.core.css';
	import 'quill/dist/quill.snow.css';

	import { onMount } from 'svelte';
	import { Edit } from 'lucide-svelte';

	const confirmedEvents = eventsStore.confirmedEvents;
	// ::: génération automatique du contenu quilljs
	// ::: __ special chars
	let textSeparatorEvent = $state('◦ ❖ ◦');
	let textSeparatorTitle = $state('· · · · · · · · ·');
	let textPreDate = $state('▲');
	let textPreEvent = $state('▼');
	let textPreCanceled = $state('⚠');

	// const preEventOptions = [

	// 	{ label: '✱', value: '✱' },
	// 	{ label: '✲', value: '✲' },
	// 	{ label: '✳', value: '✳' },
	// 	{ label: '✴', value: '✴' },
	// 	{ label: '✵', value: '✵' },
	// ];

	// Mettre à jour le contenu de la newsletter quand les événements changent
	let generationOk = $state(false);
	let debounceTimer;

	let htmlContentForEditor = $state('');
	let textVersion = $state('');
	let editedHtml = $state('');

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

	let isSending = $state(false);

	// Mapping of radio button labels to days

	$effect(() => {
		canceledToSend = confirmedEvents.filter((event) => event.canceled);
	});

	// Get events based on selected period
	$effect(() => {
		eventsInPeriod = getFutureEvents(confirmedEvents, selectedPeriod);
	});

	let eventsToSend = $derived(eventsInPeriod.filter((event) => !event.isSendToNewsletter));

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

	// Fonction pour générer le contenu HTML de la newsletter
	function generateNewsletterHTML() {
		let html = '';
		html += `<p>${introMessage}</p><br>`;

		if (includeCanceled && canceledToSend.length > 0) {
			html += `<p>${canceledMessage}</p><br>`;
			canceledToSend.forEach((event) => {
				// 👉 Appel de la version HTML
				html += generateEventHTML(event, true) + '<br>';
			});
			// 👉 Séparateur HTML après les annulations
			html += `<hr>`;
		}

		html += `<h2>Événements à venir :</h2><br>`;
		eventsToSend.forEach((event) => {
			// 👉 Appel de la version HTML
			html += generateEventHTML(event, false);
			html += `<hr>`;
		});

		html += `<br><p>${outroMessage}</p>`;
		return html;
	}

	function generateEventHTML(event, isCanceled) {
		const eventDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });

		if (isCanceled) {
			const reportedDate = event.reportedTo ? lisibleDate(event.reportedTo) : null;
			return `
			<div>
				<p>ANNULÉ:</strong> ${event.event_title}, initialement prévu le ${eventDate}${reportedDate ? `, est REPORTÉ au <strong>${reportedDate}</strong>` : ''}</p>
				<br><hr/>

		</div>
						`;
		} else {
			return `
			<div>
						<hr>
					<p> ${eventDate.toUpperCase()} ${event?.start_public ? `- ${event.start_public}` : ''}</p>
						<p> ${event.event_title}</p>
						${generateEventDetailsHTML(event)}
						${event?.start_event && event.start_event !== event.start_public ? `<p>Ouverture: ${event.start_public} - Début prévu à ${event.start_event}</p>` : ''}
						${event?.desc_public ? `<div>${event.desc_public}</p>` : ''}
						<br>
				</div>
						`;
		}
	}

	function generateEventDetailsHTML(event) {
		const details = [];
		if (!event.is_prix_libre && event.prix) details.push(`Prix: ${event.prix}`);
		if (event.isMixiteChoisie && event.mixite) details.push(`Mixité: ${event.mixite}`);
		if (!event.is_age_no_restriction && event.age_advice) details.push(`Age: ${event.age_advice}`);
		if (event.duree) details.push(`Durée: ${event.duree}`);

		if (details.length > 0) {
			// Utiliser une liste ou simplement des spans séparés par exemple
			// return `<ul class="event-details"><li>${details.join('</li><li>')}</li></ul>`;
			return `<p>${details.join(' - ')}</p>`;
		} else {
			return '';
		}
	}
	// ::: mail events format

	function generateNewsletterText() {
		let text = '';
		text += `${introMessage}\n\n`; // Saut de ligne pour le texte

		if (includeCanceled && canceledToSend.length > 0) {
			text += `${canceledMessage}\n\n`;
			canceledToSend.forEach((event) => {
				text += generateEventText(event, true) + '\n'; // Saut de ligne
			});
			// 👉 Séparateur texte après les annulations
			text += `\n━━━━━━ ◦ ❖ ◦ ━━━━━━\n\n`;
		}

		text += `Événements à venir :\n\n`;
		eventsToSend.forEach((event) => {
			text += generateEventText(event, false);
		});

		text += `\n${outroMessage}\n`;
		return text;
	}

	// 👉 Nouvelle fonction pour générer le texte d'un événement
	function generateEventText(event, isCanceled) {
		const eventDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });

		if (isCanceled) {
			const reportedDate = event.reportedTo ? lisibleDate(event.reportedTo) : null;
			return `
${textPreCanceled} ANNULÉ: ${event.event_title}, initialement prévu le ${eventDate}${reportedDate ? `, est REPORTÉ au ${reportedDate}` : ''}
${textSeparatorTitle}
      `.trim(); // .trim() pour enlever les espaces/sauts de ligne superflus au début/fin
		} else {
			return (
				`
${textSeparatorEvent}
${textPreDate} ${eventDate.toUpperCase()} ${event?.start_public ? `- ${event.start_public}` : ''}
${textPreEvent} ${event.event_title}
${textSeparatorTitle}
${generateEventDetailsText(event)}
${event?.start_event && event.start_event !== event.start_public ? `Ouverture: ${event.start_public} - Début prévu à ${event.start_event}` : ''}
${event?.desc_public ? `\n${event.desc_public}` : ''}

`.trim() + '\n'
			); // Ajoute un saut de ligne final pour séparer les événements
		}
	}

	// 👉 Nouvelle fonction pour générer les détails en texte
	function generateEventDetailsText(event) {
		const details = [];
		if (!event.is_prix_libre && event.prix) details.push(`Prix: ${event.prix}`);
		if (event.isMixiteChoisie && event.mixite) details.push(`Mixité: ${event.mixite}`);
		if (!event.is_age_no_restriction && event.age_advice) details.push(`Age: ${event.age_advice}`);
		if (event.duree) details.push(`Durée: ${event.duree}`);

		if (details.length > 0) {
			return details.join(' - ') + '\n'; // Saut de ligne après les détails
		} else {
			return ''; // Pas de saut de ligne si pas de détails
		}
	}

	function btnGenerate() {
		generationOk = false;
		console.log('Generating newsletter HTML and Text...');
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const generatedHtml = generateNewsletterHTML();
			const generatedText = generateNewsletterText();

			htmlContentForEditor = generatedHtml; // Pour l'affichage initial de Quill
			textVersion = generatedText; // Stocke la version texte générée

			editedHtml = generatedHtml; // Initialise le HTML édité
			// editedText = generatedText; // On pourrait initialiser ici aussi

			generationOk = true;
			console.log('Generation complete.');
		}, 200);
	}
	let toolbarOptions = [
		[{ header: 1 }, { header: 2 }, { header: 3 }],
		['bold', 'italic', 'underline'],
		[{ list: 'ordered' }, { list: 'bullet' }]
	];

	const options = {
		modules: {
			toolbar: toolbarOptions
		},
		theme: 'snow'
	};

	const onTextChange = (newHtml: string | null /*, newText: string | null */) => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			editedHtml = newHtml ?? ''; // Met à jour le HTML édité depuis Quill
			// editedText = newText ?? ''; // Optionnel: mettre à jour le texte depuis Quill
			console.log('Editor content updated.');
		}, 500);
	};

	async function sendNewsletter() {
		// Utilise editedHtml (depuis Quill) et textVersion (générée initialement)
		if (isSending || !editedHtml || !textVersion) return;
		isSending = true;
		console.log('Sending newsletter...');
		console.log('HTML:', editedHtml); // Pour débogage
		console.log('---');
		console.log('Text:', textVersion); // Pour débogage
		try {
			// 👉 Assurez-vous que sendEmail accepte deux arguments
			await sendEmail(editedHtml, textVersion);
			console.log('Newsletter sent successfully.');
			// Potentiellement marquer les événements comme envoyés ici
		} catch (error) {
			console.error('Failed to send newsletter:', error);
			// Afficher une notification d'erreur à l'utilisateur
		} finally {
			isSending = false;
		}
	}

	// TEST
	onMount(() => {
		selectedPeriod = 30;
		btnGenerate();
	});
</script>

{$inspect('editedHtml', editedHtml)}
{$inspect('htmlContentForEditor', htmlContentForEditor)}

<div class="period-selector">
	<fieldset>
		<legend>Evénements à inclure dans la newsletters</legend>
		<div>
			{#each periodOptions as option (option.days)}
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
	</div>
</div>
<div>
	<button
		class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
		onclick={btnGenerate}>Générer</button
	>

	<button
		class="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700"
		onclick={() => navigator.clipboard.writeText(editedHtml)}>copier</button
	>
	<button class="btn btn-secondary" onclick={() => navigator.clipboard.writeText(textVersion)}>
		Copier Texte
	</button>
	{#if generationOk}
		<Editor {options} {onTextChange}>{@html $state.snapshot(htmlContentForEditor)}</Editor>
	{/if}

	<button
		class="btn btn-success"
		onclick={sendNewsletter}
		disabled={isSending || !editedHtml || !textVersion}
	>
		{#if isSending}
			<span class="loading loading-spinner"></span>
			Envoi en cours...
		{:else}
			Envoyer la newsletter
		{/if}
	</button>
</div>

<div class="grid-row my-8 grid gap-6">
	<div class="border p-4">
		{@html editedHtml}
	</div>
	<div class="border p-4">
		<h3>plaintext</h3>
		<pre>{textVersion}</pre>
	</div>
</div>

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

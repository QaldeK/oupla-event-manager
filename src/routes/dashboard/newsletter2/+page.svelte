<script lang="ts">
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import { lisibleDate } from '$lib/utils';
	import { sendEmail } from '$lib/pocketbase.svelte';
	import { defaultExtensions, Tipex } from '@friendofsvelte/tipex';
	import type { Editor } from '@tiptap/core';

	import TipexToolbar from '$lib/components/TipexToolbar.svelte';
	import { addDays, format, isWithinInterval } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import '@friendofsvelte/tipex/styles/Tipex.css';
	import '@friendofsvelte/tipex/styles/ProseMirror.css';
	// import '@friendofsvelte/tipex/styles/Controls.css';
	import '@friendofsvelte/tipex/styles/EditLink.css';

	const confirmedEvents = eventsStore.confirmedEvents;

	const periodOptions = [
		{ label: 'Semaine prochaine', days: 7 },
		{ label: '30 prochains jours', days: 30 },
		{ label: '45 prochains jours', days: 45 }
	];

	let selectedPeriod = $state(30);

	let introMessage = $state('Et voici les prochains événements !');
	let outroMessage = $state('A bientot !');

	let includeCanceled = $state(true);
	let canceledMessage = $state(
		'Désolé, mais certains événements annoncés ont finalement dû être annulés...'
	);
	let canceledToSend = $derived(confirmedEvents.filter((event) => event.canceled));

	let futureEventsInPeriod = $derived.by(() => {
		return getFutureEvents(confirmedEvents, selectedPeriod);
	});

	let eventsToSend = $derived(futureEventsInPeriod.filter((event) => !event.isSendToNewsletter));

	let preCanceled = $state('⚠'); // Gardé pour le visuel

	let generationOk = $state(false);
	let generatedHtml = $state('');
	let editor: Editor | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;

	let isSending = $state(false);

	let tipexExtensions = [...defaultExtensions];

	$effect(() => {
		// Lire la variable pour assurer la dépendance
		includeCanceled;
		selectedPeriod;
		confirmedEvents; // Dépendance implicite via les fonctions appelées

		generationOk = false;
		console.log('Generating newsletter...');
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			generatedHtml = generateNewsletterHTML(); // Recalcule l'HTML
			generationOk = true;
			// Met à jour le contenu de l'éditeur s'il existe déjà
			if (editor) {
				// Remplacer le contenu existant par le nouveau contenu généré
				// Le 'false' empêche de déclencher un événement 'update' inutile ici
				editor.commands.setContent(generatedHtml, false);
			}
			console.log('Newsletter HTML generated and maybe updated in editor.');
		}, 300); // Un délai raisonnable pour éviter les régénérations trop fréquentes
	});

	function getFutureEvents(events, daysAhead = 30) {
		const today = new Date();
		const futureDate = addDays(today, daysAhead);

		return events.filter((event) => {
			// Ensure the event has a valid date
			const isInPeriod = isWithinInterval(event.date_event, { start: today, end: futureDate });

			if (!event.canceled) {
				return isInPeriod;
			}
			return !event.canceled && isInPeriod;
		});
	}

	// Fonction pour générer le contenu HTML de la newsletter
	function generateNewsletterHTML() {
		let htmlContent = '';

		// Intro
		htmlContent += `<p>${introMessage}</p>`;

		// Annulations
		if (includeCanceled && canceledToSend.length > 0) {
			htmlContent += `<h2>Événements Annulés/Reportés</h2>`;
			htmlContent += `<p>${canceledMessage}</p>`;
			canceledToSend.forEach((event) => {
				htmlContent += generateEventHTML(event, true);
			});
			htmlContent += `<hr>`;
		}

		// Événements à venir
		if (eventsToSend.length > 0) {
			htmlContent += `<h2>Événements à venir</h2>`;
			eventsToSend.forEach((event, index) => {
				htmlContent += generateEventHTML(event, false);
				if (index < eventsToSend.length - 1) {
					htmlContent += `<hr>`;
				}
			});
		} else if (!includeCanceled || canceledToSend.length === 0) {
			htmlContent += `<p>Aucun nouvel événement à annoncer pour cette période.</p>`;
		}

		// Outro
		htmlContent += `<br><p>${outroMessage}</p>`;

		return htmlContent;
	}

	function generateEventHTML(event, isCanceled) {
		const eventDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });
		// Remove classes
		let eventHtml = '<div>';

		if (isCanceled) {
			eventHtml += `<p>`;
			eventHtml += `<strong>${preCanceled} ANNULÉ</strong>`;
			if (event.reportedTo) {
				eventHtml += `: ${event.event_title}, initialement prévu le ${eventDate}, est <strong>REPORTÉ au ${lisibleDate(event.reportedTo)}</strong>`;
			} else {
				eventHtml += `: ${event.event_title}, initialement prévu le ${eventDate}`;
			}
			eventHtml += `</p>`;
		} else {
			// Titre
			eventHtml += `<h3>${event.event_title}</h3>`;
			// Date et Heure
			eventHtml += `<h4>${eventDate.toUpperCase()}${event?.start_public ? ` - ${event.start_public}` : ''}</h4>`;
			// Détails
			const detailsHtml = generateEventDetailsHTML(event);
			if (detailsHtml) {
				eventHtml += `<p><em>${detailsHtml}</em></p>`;
			}
			// Heure d'ouverture vs début
			if (event?.start_event && event?.start_public && event.start_event !== event.start_public) {
				eventHtml += `<p><em>Ouverture : ${event.start_public} - Début prévu : ${event.start_event}</em></p>`;
			}
			// Description publique
			if (event.desc_public) {
				eventHtml += `<ul><li>${event.desc_public}</li></ul>`;
			}
		}

		eventHtml += '</div>';
		return eventHtml;
	}

	function generateEventDetailsHTML(event) {
		let details = [];
		// Remove classes from spans
		if (!event.is_prix_libre && event.prix) {
			details.push(`<span>Prix: ${event.prix}</span>`);
		} else if (event.is_prix_libre) {
			details.push(`<span>Prix Libre</span>`);
		}
		if (event.isMixiteChoisie && event.mixite) {
			details.push(`<span>Mixité: ${event.mixite}</span>`);
		}
		if (!event.is_age_no_restriction && event.age_advice) {
			details.push(`<span>Âge conseillé: ${event.age_advice}</span>`);
		}
		if (event.duree) {
			details.push(`<span>Durée: ${event.duree}</span>`);
		}
		// Separator remains
		return details.join(' ⋅ ');
	}

	async function sendNewsletter() {
		if (isSending || !editor) return;

		// Récupérer le contenu ACTUEL de l'éditeur
		const currentHtml = editor.getHTML();
		const currentText = editor.getText(); // Tipex fournit une version texte

		if (!currentHtml || !currentText) {
			console.warn("Contenu HTML ou texte vide, annulation de l'envoi.");
			alert('Le contenu de la newsletter est vide.');
			return;
		}

		isSending = true;
		console.log('Sending newsletter...');
		console.log('HTML:', currentHtml); // Pour débogage
		console.log('---');
		console.log('Text:', currentText); // Pour débogage

		try {
			await sendEmail(currentHtml, currentText); // Utilise les contenus de l'éditeur
			console.log('Newsletter envoyée avec succès.');
			alert('Newsletter envoyée avec succès !');
			// Potentiellement marquer les événements comme envoyés ici (nécessite une logique supplémentaire)
		} catch (error) {
			console.error("Erreur lors de l'envoi de la newsletter:", error);
			alert("Erreur lors de l'envoi: " + (error instanceof Error ? error.message : String(error)));
		} finally {
			isSending = false;
		}
	}

	// 👉 3. Rendre la prévisualisation réactive au contenu de l'éditeur
	let editorHtmlPreview = $derived(editor ? editor.getHTML() : generatedHtml);
	// 👉 4. (Optionnel) Prévisualisation du texte brut
	let editorTextPreview = $derived(editor ? editor.getText() : 'Chargement...');
</script>

<!-- {$inspect(generatedHtml)} -->
{$inspect('editor?.getHTML()', editor?.getHTML())}
<!-- Peut être utile pour débugger les modifs manuelles -->

<div class="period-selector">
	<!-- ... reste du fieldset inchangé ... -->
	<fieldset>
		<legend>Evénements à inclure dans la newsletters</legend>
		<div>
			{#each periodOptions as option (option.days)}
				<label>
					<input type="radio" name="period" value={option.days} bind:group={selectedPeriod} />
					<!-- 👉 Génère à nouveau si la période change -->
					{option.label}
				</label>
			{/each}
		</div>
		<label class="flex cursor-pointer items-center rounded-lg px-3 py-2 hover:bg-gray-200"
			><input type="checkbox" class="checkbox checkbox-sm" bind:checked={includeCanceled} />
			<span class="ml-2 cursor-pointer text-gray-600">Prévenir des annulations</span>
			<!-- ml-2 pour espacement -->
		</label>
	</fieldset>
</div>

<div class="flex gap-6">
	<div>
		{#if generationOk || editor}
			<Tipex
				body={generatedHtml}
				bind:tipex={editor}
				extensions={tipexExtensions}
				controls={false}
				class="overflow-y mt-4 mb-0 rounded-lg border border-neutral-300 shadow-sm"
				style="min-height: 400px; height: 70vh;"
				focal={false}
			>
				{#snippet head(tipexInstance)}
					<!-- Rend notre barre d'outils personnalisée -->
					<TipexToolbar editor={tipexInstance} />
				{/snippet}
				{#snippet foot()}
					<div
						class="border-base-300 bg-base-100/80 flex items-center justify-between rounded-b-lg border-t p-2 backdrop-blur-sm"
					>
						<span class="text-xs text-gray-500">Modifiez le contenu si nécessaire</span>
						<button
							class="btn btn-sm btn-primary"
							onclick={sendNewsletter}
							disabled={isSending || !editor || !editorHtmlPreview}
						>
							{#if isSending}
								<span class="loading loading-spinner loading-xs"></span>
								Envoi...
							{:else}
								Envoyer la Newsletter
							{/if}
						</button>
					</div>
				{/snippet}
			</Tipex>
		{:else}
			<div
				class="bg-base-200 mt-4 mb-0 flex h-[70vh] min-h-[400px] items-center justify-center rounded-lg border border-neutral-200"
			>
				<span class="loading loading-dots loading-lg"></span>
			</div>
		{/if}
	</div>

	<!-- Colonne Prévisualisation -->

	<div class="flex h-full flex-col">
		<!-- Wrapper pour contrôler la hauteur si nécessaire -->
		<div role="tablist" class="tabs tabs-lifted">
			<input type="radio" name="preview_tabs" role="tab" class="tab" aria-label="HTML" checked />
			<div
				role="tabpanel"
				class="tab-content bg-base-100 border-base-300 rounded-box flex-grow overflow-auto p-4"
				style="border-top-left-radius: 0;"
			>
				<!-- 👉 Contenu de la prévisualisation HTML -->
				<div class="prose prose-sm">
					{@html editorHtmlPreview}
				</div>
			</div>

			<input type="radio" name="preview_tabs" role="tab" class="tab" aria-label="Texte" />
			<div
				role="tabpanel"
				class="tab-content bg-base-100 border-base-300 rounded-box flex-grow overflow-auto p-4"
			>
				<!-- 👉 Contenu de la prévisualisation Texte -->
				<pre class="text-sm whitespace-pre-wrap">{editorTextPreview}</pre>
			</div>
		</div>
	</div>
</div>

<style>
	/* 👉 2. Ajouter les styles globaux pour l'éditeur Tipex */

	/* Assurer que les h2, h3, h4 ont des marges par défaut raisonnables dans Tiptap */
	/* :global(.tipex .ProseMirror h2) {
		margin-top: 1.5em;
		margin-bottom: 0.8em;
	}
	:global(.tipex .ProseMirror h3) {
		margin-top: 1.3em;
		margin-bottom: 0.6em;
	}
	:global(.tipex .ProseMirror h4) {
		margin-top: 1.1em;
		margin-bottom: 0.5em;
	}
	:global(.tipex .ProseMirror p) {
		margin-bottom: 1em;
	} */

	.period-selector fieldset {
		display: flex;
		flex-wrap: wrap; /* Permet le retour à la ligne sur petits écrans */
		gap: 1rem; /* Espace entre les groupes d'options */
		border: 1px solid #e5e7eb; /* Bordure légère */
		padding: 1rem; /* Espacement intérieur */
		border-radius: 0.5rem; /* Coins arrondis */
		align-items: center; /* Alignement vertical */
		background-color: white;
		margin-bottom: 1.5rem; /* Espace sous le fieldset */
	}
	.period-selector legend {
		font-weight: 600; /* Police un peu plus épaisse */
		padding: 0 0.5rem; /* Petit espace autour du texte */
		font-size: 0.9rem;
		color: #4b5563; /* Gris foncé */
	}
	.period-selector fieldset > div {
		display: flex;
		gap: 0.5rem; /* Espace réduit entre les boutons radio */
		flex-wrap: wrap;
	}

	:global(.tipex .ProseMirror) {
		padding: 0.75rem 1rem;
		/* Retirer le border-radius du haut car la toolbar l'a maintenant */
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		/* Assurer une hauteur minimale et le scroll */
		min-height: 350px; /* Ajuster si besoin */
		height: calc(
			100% - 46px - 40px
		); /* Hauteur totale moins toolbar (approx 46px) et footer (approx 40px) */
		outline: none;
		overflow-y: auto;
		background-color: white;
	}

	/* 👉 Ajustement pour que le wrapper Tipex n'ait pas de padding inutile */
	:global(.tipex-editor-wrap) {
		display: flex;
		flex-direction: column;
		height: 100%; /* Pour que le calcul de hauteur de ProseMirror fonctionne */
	}

	/* 👉 Ajustement pour que la section éditeur prenne la place restante */
	:global(.tipex-editor-section) {
		flex-grow: 1;
		border-bottom-left-radius: inherit; /* Hérite du radius du parent Tipex */
		border-bottom-right-radius: inherit;
		border-radius: inherit; /* Assure que le wrapper hérite du radius */
		overflow: hidden;
	}

	:global(.tipex-editor-section) {
		flex-grow: 1;
		/* Les radius bas sont maintenant gérés par le snippet foot ou le ProseMirror lui-même */
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	/* Style pour la prévisualisation */
	.prose {
		/* Styles de base pour le contenu HTML rendu */
		line-height: 1.6;
	}

	pre {
		font-family: monospace;
		font-size: 0.8rem;
		line-height: 1.4;
		color: #374151; /* Texte gris foncé */
	}
	:global(.tipex hr) {
		border: none;
		border-top: 1px solid #eee;
		margin: 1em 0;
	}
</style>

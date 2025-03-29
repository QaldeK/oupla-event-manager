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

	// Nouvelle fonction pour formater le texte brut à partir du HTML
	function formatPlainTextFromHtml(html: string): string {
		if (typeof document === 'undefined' || !html) return ''; // Garde-fou pour SSR ou HTML vide

		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			let text = '';

			function walk(node: Node) {
				if (node.nodeType === Node.TEXT_NODE) {
					// Ajouter le contenu texte, en normalisant les espaces multiples en un seul
					text += node.nodeValue?.replace(/\s+/g, ' ') || '';
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					const element = node as HTMLElement;
					const tagName = element.tagName.toLowerCase();
					let childrenText = ''; // Pour capturer le texte des enfants avant de l'ajouter

					// --- Préfixe et formatage avant les enfants ---
					switch (tagName) {
						case 'h2':
							text += '\n\n ✱ '; // Séparation et marqueur H2
							break;
						case 'h3':
							text += '\n\n ■ '; // Séparation et marqueur H3 début
							break;
						// case 'li':
						// 	text += '\n• '; // Marqueur de liste
						// 	break;
						case 'p':
							text += '\n\n'; // Assurer une séparation avant le paragraphe
							break;
						case 'hr':
							text += '\n\n··························\n\n'; // Remplacer <hr>
							return; // Pas d'enfants à traiter pour <hr>
						case 'br':
							text += '\n'; // Remplacer <br> par un saut de ligne
							return; // Pas d'enfants à traiter pour <br>
						case 'ul':
						case 'ol':
							text += '\n'; // Ajouter un saut de ligne avant la liste
							break;
						// Ignorer les div, span, strong, em, a pour le formatage structurel,
						// mais traiter leurs enfants
					}

					// --- Traiter les enfants ---
					element.childNodes.forEach(walk);

					// --- Suffixe et formatage après les enfants ---
					switch (tagName) {
						case 'h2':
							text += '\n\n'; // Séparation après H2
							break;
						case 'h3':
							text += ' ■\n\n'; // Marqueur H3 fin et séparation
							break;
						case 'p':
							text += '\n\n'; // Assurer une séparation après le paragraphe
							break;
						case 'ul':
						case 'ol':
							text += '\n'; // Ajouter un saut de ligne après la liste
							break;
					}
				}
			}

			walk(doc.body);

			// --- Nettoyage final ---
			// 1. Décoder les entités HTML (au cas où le parser ne l'aurait pas fait complètement)
			const textarea = document.createElement('textarea');
			textarea.innerHTML = text;
			text = textarea.value;

			// 2. Normaliser les espaces multiples (sauf les sauts de ligne)
			text = text.replace(/[ \t]+/g, ' ');

			// 3. Supprimer les espaces juste avant les sauts de ligne
			text = text.replace(/ +\n/g, '\n');

			// 4. Réduire les sauts de ligne multiples à un maximum de deux
			text = text.replace(/\n{3,}/g, '\n\n');

			// 5. Supprimer les espaces/sauts de ligne au début et à la fin
			text = text.trim();

			return text;
		} catch (error) {
			console.error('Erreur lors du formatage du texte depuis HTML:', error);
			// Retourner le HTML brut ou une chaîne d'erreur en cas d'échec du parsing
			// Alternative: essayer editor.getText() comme fallback ?
			return html; // Ou une version très basique: html.replace(/<[^>]+>/g, '');
		}
	}

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
			htmlContent += `<hr>`;
			htmlContent += `<h2>Événements Annulés/Reportés</h2>`;
			htmlContent += `<p>${canceledMessage}</p>`;
			canceledToSend.forEach((event) => {
				htmlContent += generateEventHTML(event, true);
			});
		}

		// Événements à venir
		if (eventsToSend.length > 0) {
			// --- START: Added Summary List ---
			htmlContent += `<hr><p><strong><em>Résumé des événements à venir</em></strong></p>`;
			htmlContent += `<ul>`;
			eventsToSend.forEach((event) => {
				const formattedDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });
				htmlContent += `<li>`;
				htmlContent += `<em>${formattedDate}</em>`;
				if (event.start_public) {
					htmlContent += ` - <em>${event.start_public}</em>`;
				}
				htmlContent += `: ${event.event_title}`;
				htmlContent += `</li>`;
			});
			htmlContent += `</ul>`;
			htmlContent += `<hr>`;
			// --- END: Added Summary List ---

			htmlContent += `<h2>Événements à venir</h2>`;
			eventsToSend.forEach((event, index) => {
				htmlContent += generateEventHTML(event, false);
				if (index < eventsToSend.length - 1) {
					// Utiliser une simple <hr> comme séparateur
					htmlContent += `<hr>`;
				}
			});
		} else if (!includeCanceled || canceledToSend.length === 0) {
			htmlContent += `<p>Aucun nouvel événement à annoncer pour cette période.</p>`;
		}

		// Outro
		htmlContent += `<hr>`;

		htmlContent += `<br><p>${outroMessage}</p>`;

		return htmlContent;
	}

	function generateEventHTML(event, isCanceled) {
		const eventDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });
		// Remove classes
		let eventHtml = '<div>';

		if (isCanceled) {
			eventHtml += `<p>`;
			eventHtml += `<em>${preCanceled} annulé</em>`;
			if (event.reportedTo) {
				eventHtml += `: <strong>${event.event_title}</strong>, initialement prévu le ${eventDate}, est REPORTÉ au <strong>${lisibleDate(event.reportedTo)}</strong>`;
			} else {
				eventHtml += `: <strong>${event.event_title}</strong>, initialement prévu le ${eventDate}`;
			}
			eventHtml += `</p>`;
		} else {
			// Titre
			eventHtml += `<h3>${event.event_title}</h3>`;
			// Date et Heure
			eventHtml += `<strong>${eventDate.toUpperCase()}${event?.start_public ? ` - ${event.start_public}` : ''}</strong>`;
			// Détails
			const detailsHtml = generateEventDetailsHTML(event);
			if (detailsHtml) {
				eventHtml += `<p><em>${detailsHtml}</em></p>`;
			}
			// Heure d'ouverture vs début
			if (event?.start_event && event?.start_public && event.start_event !== event.start_public) {
				eventHtml += `<em>Ouverture : ${event.start_public} - Début prévu : ${event.start_event}</em>`;
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
		const currentText = formatPlainTextFromHtml(currentHtml); // Utiliser la nouvelle fonction basée sur HTML

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
	let editorTextPreview = $derived(
		editor ? formatPlainTextFromHtml(editor.getHTML()) : 'Chargement...'
	);
</script>

<!-- {$inspect(generatedHtml)} -->
{$inspect('editor?.getText()', editor?.getText())}
<!-- Peut-être utile pour débugger les modifs manuelles -->

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

<div class="mt-4">
	<!-- Wrapper pour les onglets -->
	<div role="tablist" class="tabs tabs-lifted">
		<!-- Onglet Éditeur -->
		<input type="radio" name="content_tabs" role="tab" class="tab" aria-label="Éditeur" checked />
		<div
			role="tabpanel"
			class="tab-content bg-base-100 border-base-300 rounded-box flex flex-col overflow-hidden p-0"
			style="min-height: 400px; height: 70vh; border-top-left-radius: 0;"
		>
			{#if generationOk || editor}
				<Tipex
					body={generatedHtml}
					bind:tipex={editor}
					extensions={tipexExtensions}
					controls={false}
					class="h-full w-full flex-col"
					focal={false}
				>
					{#snippet head(tipexInstance)}
						<!-- Barre d'outils personnalisée -->
						<TipexToolbar editor={tipexInstance} />
					{/snippet}
					<!-- Le contenu de l'éditeur (ProseMirror) sera dans la section par défaut -->
					{#snippet foot()}
						<div
							class="border-base-300 bg-base-100/80 flex items-center justify-between border-t p-2 backdrop-blur-sm"
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
				<div class="bg-base-200 flex h-full items-center justify-center">
					<span class="loading loading-dots loading-lg"></span>
				</div>
			{/if}
		</div>

		<!-- Onglet Prévisualisation HTML -->
		<input type="radio" name="content_tabs" role="tab" class="tab" aria-label="Aperçu HTML" />
		<div
			role="tabpanel"
			class="tab-content bg-base-100 border-base-300 rounded-box flex-grow overflow-auto p-4"
			style="min-height: 400px; height: 70vh;"
		>
			<div class="prose prose-sm max-w-none">
				{@html editorHtmlPreview}
			</div>
		</div>

		<!-- Onglet Prévisualisation Texte -->
		<input type="radio" name="content_tabs" role="tab" class="tab" aria-label="Aperçu Texte" />
		<div
			role="tabpanel"
			class="tab-content bg-base-100 border-base-300 rounded-box flex-grow overflow-auto p-4"
			style="min-height: 400px; height: 70vh;"
		>
			<pre class="text-sm whitespace-pre-wrap">{editorTextPreview}</pre>
		</div>
	</div>
</div>

<style>
	/* 👉 2. Ajouter les styles globaux pour l'éditeur Tipex */

	/* Assurer que les h2, h3, h4 ont des marges par défaut raisonnables dans Tiptap */
	:global(.tipex .ProseMirror h2) {
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
	}

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
		/* Assurer une hauteur minimale */
		min-height: 100%; /* S'étend pour remplir le parent scrollable */
		/* La hauteur et l'overflow sont gérés par .tipex-editor-section */
		outline: none;
		background-color: white;
		/* Important: S'assurer qu'il n'y a pas d'overflow caché ici qui pourrait interférer */
		overflow: visible;
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
		overflow-y: auto; /* Gère le scroll ici */
		min-height: 0; /* Nécessaire pour que l'overflow fonctionne dans un conteneur flex */
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

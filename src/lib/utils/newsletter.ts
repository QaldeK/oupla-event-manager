import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { lisibleDate } from '$lib/utils';

export function generateEventHTML(event: any, isCanceled: boolean) {
	const eventDate = format(new Date(event.date_event), 'EEEE dd MMMM', { locale: fr });
	// Remove classes
	let eventHtml = '<div>';

	if (isCanceled) {
		eventHtml += `<p>`;
		eventHtml += `<strong>⚠ ANNULÉ</strong>`;
		if (event.reportedTo) {
			eventHtml += `: ${event.event_title}, initialement prévu le ${eventDate}, est <strong>REPORTÉ au ${lisibleDate(
				event.reportedTo
			)}</strong>`;
		} else {
			eventHtml += `: ${event.event_title}, initialement prévu le ${eventDate}`;
		}
		eventHtml += `</p>`;
	} else {
		// Titre
		eventHtml += `<h3>${event.event_title}</h3>`;
		// Date et Heure
		eventHtml += `<h4>${eventDate.toUpperCase()}${
			event?.start_public ? ` - ${event.start_public}` : ''
		}</h4>`;
		// Détails
		const detailsHtml = generateEventDetailsHTML(event);
		if (detailsHtml) {
			eventHtml += `<p>${detailsHtml}</p>`;
		}
		// Heure d'ouverture vs début
		if (event?.start_event && event?.start_public && event.start_event !== event.start_public) {
			eventHtml += `<p>Ouverture : ${event.start_public} - Début prévu : ${event.start_event}</p>`;
		}
		// Description publique
		if (event.desc_public) {
			// Keep the <br> replacement logic as it affects content, not just style
			const formattedDesc = event.desc_public; // .replace(/\n/g, '<br>'); // Decided against replacing \n, Tiptap handles paragraphs better
			eventHtml += `<div>${formattedDesc}</div>`;
		}
	}

	eventHtml += '</div>';
	return eventHtml;
}

export function generateEventDetailsHTML(event: any) {
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

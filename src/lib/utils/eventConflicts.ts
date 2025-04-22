import { format, parse } from 'date-fns';
import type { OrganizerType } from '$lib/schemas/event.schema';

// --- Types Definition ---

/**
 * Type interne utilisé pour les calculs de conflits.
 * Représente un événement ou une proposition de date avec ses informations temporelles clés.
 */
export interface EventTimeInfo {
	id: string;
	event_title: string;
	organizers: OrganizerType[];
	rooms: string[];
	/** Type de base de l'événement (confirmé, non confirmé, sondage) */
	baseType: 'confirmed' | 'unconfirmed' | 'sondage';
	/** Date de début précise (peut inclure l'heure) */
	dateTimeStart: Date;
	/** Date de fin précise (peut inclure l'heure) */
	dateTimeEnd: Date;
	/** Indique si l'événement original couvrait toute la journée (pas d'heure spécifiée) */
	isAllDay: boolean;
}

/**
 * Type représentant un conflit détecté, prêt à être affiché.
 */
export interface Conflict {
	id: string;
	event_title: string;
	/** Heure de début formatée HH:mm */
	time_start: string;
	/** Heure de fin formatée HH:mm */
	time_end: string;
	rooms: string[];
	/** Type de conflit (chevauchement direct, proche, sondage) */
	conflictType: 'confirmed' | 'unconfirmed' | 'sondage' | 'close-confirmed' | 'close-unconfirmed';
	/** Indique si le conflit partage au moins une salle avec l'événement cible */
	hasSameRoom: boolean;
	/** Événement source (celui pour lequel on cherche des conflits) */
	sourceEventId?: string;
	/** Date de l'événement/conflit (YYYY-MM-DD) */
	date_event: string;
}

// --- Internal Helper Functions ---

const TIME_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 heures pour les conflits "proches"

/**
 * Vérifie si deux plages horaires se chevauchent.
 * @param start1 Timestamp de début 1
 * @param end1 Timestamp de fin 1
 * @param start2 Timestamp de début 2
 * @param end2 Timestamp de fin 2
 * @returns Vrai si les plages se chevauchent
 */
function checkTimeOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
	// Vérification ajoutée pour gérer les cas où start > end (peut arriver avec des données invalides)
	const s1 = Math.min(start1, end1);
	const e1 = Math.max(start1, end1);
	const s2 = Math.min(start2, end2);
	const e2 = Math.max(start2, end2);
	// Un événement se termine au moment où l'autre commence n'est PAS un chevauchement.
	return s1 < e2 && e1 > s2;
}

/**
 * Vérifie si deux instants sont "proches" dans le temps (moins de THRESHOLD).
 * @param time1 Timestamp 1
 * @param time2 Timestamp 2
 * @param threshold Seuil en millisecondes
 * @returns Vrai si la différence absolue est inférieure au seuil
 */
function isTimeClose(time1: number, time2: number, threshold = TIME_THRESHOLD_MS): boolean {
	return Math.abs(time1 - time2) < threshold;
}

/**
 * Vérifie si deux listes de salles partagent au moins une salle.
 * @param rooms1 Liste de salles 1
 * @param rooms2 Liste de salles 2
 * @returns Vrai si une salle commune existe (et si les deux listes ne sont pas vides)
 */
function hasSameRoomCheck(
	rooms1: string[] | undefined | null,
	rooms2: string[] | undefined | null
): boolean {
	if (!rooms1 || rooms1.length === 0 || !rooms2 || rooms2.length === 0) {
		return false;
	}
	const roomSet1 = new Set(rooms1);
	return rooms2.some((room) => roomSet1.has(room));
}

/**
 * Formate un EventTimeInfo en objet Conflict basé sur une comparaison avec une plage horaire cible.
 * @param event L'événement potentiellement en conflit
 * @param targetStart Timestamp de début de la plage cible
 * @param targetEnd Timestamp de fin de la plage cible
 * @param targetRooms Salles de la plage cible
 * @param sourceEventId ID de l'événement cible (optionnel)
 * @returns L'objet Conflict formaté
 */
function formatConflict(
	event: EventTimeInfo,
	targetStart: number,
	targetEnd: number,
	targetRooms: string[],
	sourceEventId?: string
): Conflict {
	const eventStart = event.dateTimeStart.getTime();
	const eventEnd = event.dateTimeEnd.getTime();

	let calculatedConflictType: Conflict['conflictType'] = event.baseType;

	// Vérifier si c'est un conflit direct ou proche (uniquement si ce n'est pas un sondage)
	if (event.baseType !== 'sondage') {
		const isDirectOverlap = checkTimeOverlap(targetStart, targetEnd, eventStart, eventEnd);

		if (!isDirectOverlap) {
			// Si pas de chevauchement direct, vérifier la proximité
			const isClose = isTimeClose(targetEnd, eventStart) || isTimeClose(targetStart, eventEnd);

			if (isClose) {
				calculatedConflictType =
					event.baseType === 'confirmed' ? 'close-confirmed' : 'close-unconfirmed';
			} else {
				// Ce cas ne devrait pas arriver si findOverlappingEvents filtre correctement,
				// mais par sécurité, on retourne le type de base.
				// Ou on pourrait retourner `null` pour indiquer qu'il n'y a pas de conflit pertinent.
				console.warn(`formatConflict: Event ${event.id} was not overlapping or close to target.`);
			}
		}
		// Si c'est un chevauchement direct, on garde event.baseType ('confirmed' ou 'unconfirmed')
	}

	return {
		id: event.id,
		event_title: event.event_title,
		time_start: format(event.dateTimeStart, 'HH:mm'),
		time_end: format(event.dateTimeEnd, 'HH:mm'),
		rooms: event.rooms,
		conflictType: calculatedConflictType,
		hasSameRoom: hasSameRoomCheck(targetRooms, event.rooms),
		sourceEventId: sourceEventId,
		date_event: format(event.dateTimeStart, 'yyyy-MM-dd') // Utiliser dateTimeStart pour la date
	};
}

// --- Public API ---

/**
 * Trouve les événements en conflit (chevauchement ou proximité) avec une plage horaire donnée.
 *
 * @param targetDateTimeStart Date/heure de début de la plage à vérifier.
 * @param targetDateTimeEnd Date/heure de fin de la plage à vérifier.
 * @param targetRooms Salles associées à la plage à vérifier.
 * @param eventsToCheck Liste des événements (EventTimeInfo) sur la même journée où chercher des conflits.
 * @param options Options de recherche:
 *  - excludeEventId: ID de l'événement à exclure de la recherche (utile lors de la modification d'un événement existant).
 *  - includeCloseEvents: Inclure les événements qui ne se chevauchent pas directement mais sont proches dans le temps (par défaut: true).
 * @returns Un tableau d'objets Conflict décrivant les conflits trouvés.
 */
export function findConflictsForEvent(
	targetDateTimeStart: Date,
	targetDateTimeEnd: Date,
	targetRooms: string[],
	eventsToCheck: EventTimeInfo[],
	options: {
		excludeEventId?: string;
		includeCloseEvents?: boolean;
	} = {}
): Conflict[] {
	const { excludeEventId, includeCloseEvents = true } = options;
	const targetStart = targetDateTimeStart.getTime();
	const targetEnd = targetDateTimeEnd.getTime();

	if (isNaN(targetStart) || isNaN(targetEnd)) {
		console.error('Invalid target dates provided to findConflictsForEvent');
		return [];
	}

	const conflictingEvents: Conflict[] = [];

	for (const event of eventsToCheck) {
		if (excludeEventId && event.id === excludeEventId) {
			continue; // Exclure l'événement cible lui-même
		}

		const eventStart = event.dateTimeStart.getTime();
		const eventEnd = event.dateTimeEnd.getTime();

		if (isNaN(eventStart) || isNaN(eventEnd)) {
			console.warn(`Skipping event ${event.id} due to invalid dates during conflict check.`);
			continue;
		}

		const hasDirectOverlap = checkTimeOverlap(targetStart, targetEnd, eventStart, eventEnd);
		let isClose = false;

		if (!hasDirectOverlap && includeCloseEvents) {
			isClose = isTimeClose(targetEnd, eventStart) || isTimeClose(targetStart, eventEnd);
		}

		if (hasDirectOverlap || isClose) {
			// Formater le conflit détecté
			const conflict = formatConflict(event, targetStart, targetEnd, targetRooms, excludeEventId);
			conflictingEvents.push(conflict);
		}
	}

	return conflictingEvents;
}

/**
 * Identifie tous les groupes d'événements qui se chevauchent directement au sein d'une même journée.
 * Utile pour visualiser les blocs d'événements concurrents sur un calendrier.
 *
 * @param eventsOnDate Liste des événements (EventTimeInfo) pour une journée spécifique.
 * @returns Un tableau de groupes, où chaque groupe est un tableau d'EventTimeInfo qui se chevauchent.
 *          Retourne un tableau vide si moins de 2 événements sont fournis ou si aucun chevauchement n'est trouvé.
 */
export function findOverlappingGroupsOnDate(eventsOnDate: EventTimeInfo[]): EventTimeInfo[][] {
	if (eventsOnDate.length < 2) {
		return [];
	}

	const groups: EventTimeInfo[][] = [];
	const processed = new Set<string>(); // Pour éviter de traiter plusieurs fois le même événement

	// Trier par heure de début peut optimiser légèrement, mais pas crucial ici
	// eventsOnDate.sort((a, b) => a.dateTimeStart.getTime() - b.dateTimeStart.getTime());

	for (let i = 0; i < eventsOnDate.length; i++) {
		const eventA = eventsOnDate[i];
		if (processed.has(eventA.id)) continue;

		const currentGroup: EventTimeInfo[] = [eventA]; // Commence un nouveau groupe potentiel
		const startA = eventA.dateTimeStart.getTime();
		const endA = eventA.dateTimeEnd.getTime();

		if (isNaN(startA) || isNaN(endA)) continue; // Skip invalid event

		// Comparer avec les événements suivants
		for (let j = i + 1; j < eventsOnDate.length; j++) {
			const eventB = eventsOnDate[j];
			// Ne pas comparer avec un événement déjà dans un groupe trouvé lors d'une itération précédente
			// Note: On ne vérifie pas processed.has(eventB.id) ici, car eventB pourrait appartenir
			// à plusieurs groupes distincts si les chevauchements sont complexes.
			// La vérification `processed.has(eventA.id)` au début de la boucle externe suffit.

			const startB = eventB.dateTimeStart.getTime();
			const endB = eventB.dateTimeEnd.getTime();

			if (isNaN(startB) || isNaN(endB)) continue;

			// Vérifier si eventB chevauche *n'importe quel* événement déjà dans currentGroup
			let overlapsWithGroup = false;
			for (const member of currentGroup) {
				if (
					checkTimeOverlap(
						member.dateTimeStart.getTime(),
						member.dateTimeEnd.getTime(),
						startB,
						endB
					)
				) {
					overlapsWithGroup = true;
					break;
				}
			}

			if (overlapsWithGroup) {
				// Ajouter eventB au groupe courant s'il n'y est pas déjà
				if (!currentGroup.some((e) => e.id === eventB.id)) {
					currentGroup.push(eventB);
					// Marquer eventB comme traité pour la boucle *externe* (ne démarrera pas un nouveau groupe avec lui)
					processed.add(eventB.id);
				}
			}
		}

		// Si le groupe contient plus d'un événement, c'est un groupe de conflits
		if (currentGroup.length > 1) {
			groups.push(currentGroup);
			// Marquer le premier élément comme traité pour la boucle externe
			processed.add(eventA.id);
			// Les autres éléments ajoutés au groupe ont déjà été marqués `processed.add(eventB.id)`
		}
	}

	return groups;
}

/**
 * Fonction utilitaire pour convertir un objet événement brut (ex: PocketBase Record)
 * en un objet EventTimeInfo utilisable par les fonctions de conflit.
 * Gère les cas où les heures ne sont pas définies (journée entière).
 *
 * @param event L'objet événement brut. Doit avoir `id`, `event_title`, `organizers`, `rooms`.
 *        Peut avoir `dateStart`, `dateEnd` (formats ISO 8601) OU `date_event`, `time_start`, `time_end`.
 * @param baseType Le type de base de l'événement ('confirmed', 'unconfirmed', 'sondage').
 * @param defaultDate Optionnel, utilisé si l'événement n'a que `time_start`/`time_end` (rare, mais sécurité).
 * @returns Un objet EventTimeInfo, ou null si les dates/heures sont invalides.
 */
export function createEventTimeInfo(
	event: {
		id: string;
		event_title: string;
		organizers: OrganizerType[];
		rooms: string[];
		dateStart?: string | null;
		dateEnd?: string | null;
		date_event?: string | null; // Format YYYY-MM-DD
		time_start?: string | null; // Format HH:mm
		time_end?: string | null; // Format HH:mm
	},
	baseType: 'confirmed' | 'unconfirmed' | 'sondage',
	defaultDate: Date = new Date() // Utilisé seulement si aucune date fournie
): EventTimeInfo | null {
	let startDate: Date | null = null;
	let endDate: Date | null = null;
	let isAllDay = false;

	try {
		if (event.dateStart && event.dateEnd) {
			startDate = new Date(event.dateStart);
			endDate = new Date(event.dateEnd);
			// Vérifier si c'est toute la journée (ex: 2023-10-26T00:00:00.000Z à 2023-10-26T23:59:59.999Z)
			// Note: cette détection peut être imprécise selon les fuseaux horaires et la façon dont les dates sont stockées.
			// Une approche plus simple est de regarder si time_start/end étaient absents ou mis à 00:00/23:59.
			// Pour l'instant, on se base sur le flag isAllDay potentiel ou l'absence de time_start/end.
		} else if (event.date_event) {
			const baseDateStr = event.date_event; // "YYYY-MM-DD"
			if (event.time_start && event.time_end) {
				// Combiner date et heure
				startDate = parse(`${baseDateStr} ${event.time_start}`, 'yyyy-MM-dd HH:mm', new Date());
				endDate = parse(`${baseDateStr} ${event.time_end}`, 'yyyy-MM-dd HH:mm', new Date());
				// Gérer le cas où l'heure de fin est avant l'heure de début (événement sur 2 jours via HH:mm ?)
				// Pour l'instant, on suppose que c'est sur le même jour. date-fns gère ça correctement.
				if (endDate < startDate) {
					// Si l'heure de fin est avant le début (ex: 22:00 - 02:00), ajoute un jour à la fin.
					// ATTENTION: Cela suppose que l'événement ne dure jamais PLUS de 24h via ce format.
					endDate.setDate(endDate.getDate() + 1);
				}
			} else {
				// Journée entière
				isAllDay = true;
				startDate = parse(baseDateStr, 'yyyy-MM-dd', new Date());
				startDate.setHours(0, 0, 0, 0); // Début de journée
				endDate = new Date(startDate);
				endDate.setHours(23, 59, 59, 999); // Fin de journée
			}
		} else {
			// Ni dateStart/End, ni date_event -> Cas étrange, utiliser defaultDate ?
			// Ou retourner null car l'événement n'est pas planifiable/comparable.
			console.warn(`Event ${event.id} has no valid date information.`);
			return null;
		}

		// Vérifier la validité des dates
		if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) {
			console.warn(`Event ${event.id} resulted in invalid dates.`);
			return null;
		}

		// Assurer que start <= end
		if (endDate < startDate) {
			console.warn(`Event ${event.id} has end date before start date. Swapping.`);
			[startDate, endDate] = [endDate, startDate]; // Simple swap
		}

		return {
			id: event.id,
			event_title: event.event_title,
			organizers: event.organizers ?? [],
			rooms: event.rooms ?? [],
			baseType: baseType,
			dateTimeStart: startDate,
			dateTimeEnd: endDate,
			isAllDay: isAllDay
		};
	} catch (error) {
		console.error(`Error processing dates for event ${event.id}:`, error);
		return null;
	}
}

/**
 * Crée une map d'EventTimeInfo par date (YYYY-MM-DD) à partir d'une liste d'événements bruts.
 * Gère les événements principaux et les dates proposées (sondages).
 *
 * @param rawEvents Liste d'événements bruts (type attendu similaire à SyncEventRecord).
 * @returns Une Map où les clés sont des dates (YYYY-MM-DD) et les valeurs des tableaux d'EventTimeInfo pour ce jour.
 */
export function buildEventTimeInfoMap(
	rawEvents: Array<{
		id: string;
		event_title: string;
		organizers: OrganizerType[];
		rooms: string[];
		isConfirmed: boolean;
		dateStart?: string | null;
		dateEnd?: string | null;
		date_event?: string | null;
		time_start?: string | null;
		time_end?: string | null;
		dates_proposed?: Array<{ dateStart?: string; dateEnd?: string }> | null;
	}>
): Map<string, EventTimeInfo[]> {
	const eventsByDateMap = new Map<string, EventTimeInfo[]>();

	function addEventToMap(dateKey: string, eventInfo: EventTimeInfo) {
		if (!eventsByDateMap.has(dateKey)) {
			eventsByDateMap.set(dateKey, []);
		}
		// Éviter les doublons exacts (même ID, même type de base, même date de début) pour une date donnée
		// Utile si un événement est listé plusieurs fois ou si une date proposée est identique à la date principale
		const existing = eventsByDateMap.get(dateKey)!;
		if (
			!existing.some(
				(e) =>
					e.id === eventInfo.id &&
					e.baseType === eventInfo.baseType &&
					e.dateTimeStart.getTime() === eventInfo.dateTimeStart.getTime()
			)
		) {
			existing.push(eventInfo);
		}
	}

	for (const event of rawEvents) {
		// 1. Traiter la date principale de l'événement
		const baseType = event.isConfirmed ? 'confirmed' : 'unconfirmed';
		const mainEventInfo = createEventTimeInfo(event, baseType);

		if (mainEventInfo) {
			const dateKey = format(mainEventInfo.dateTimeStart, 'yyyy-MM-dd');
			addEventToMap(dateKey, mainEventInfo);
		}

		// 2. Traiter les dates proposées (sondages)
		if (Array.isArray(event.dates_proposed)) {
			for (const proposed of event.dates_proposed) {
				if (proposed.dateStart && proposed.dateEnd) {
					// Créer un objet temporaire pour createEventTimeInfo
					const proposedEventData = {
						...event, // Copie les infos de base (titre, salles, orgas...)
						dateStart: proposed.dateStart,
						dateEnd: proposed.dateEnd,
						date_event: null, // Ignorer date_event si dateStart/End sont là
						time_start: null,
						time_end: null
					};
					const sondageEventInfo = createEventTimeInfo(proposedEventData, 'sondage');

					if (sondageEventInfo) {
						const dateKey = format(sondageEventInfo.dateTimeStart, 'yyyy-MM-dd');
						addEventToMap(dateKey, sondageEventInfo);
					}
				}
			}
		}
	}

	return eventsByDateMap;
}

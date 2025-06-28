import { getSpace } from "$lib/shared/";
import { clsx, type ClassValue } from "clsx";
import { addMinutes, format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { cubicOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";
import { twMerge } from "tailwind-merge";
import "tippy.js/dist/tippy.css";

import type { OrganizerType } from "./types/event.types";
import type { UserType } from "./types/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === "none" ? "" : style.transform;

	const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style: Record<string, number | string | undefined>): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, "");
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};

// ::: dates

export const createDateFromString = (dateStr: string, timeStr: string): Date => {
	const [year, month, day] = dateStr.split("-");
	const [hours, minutes] = timeStr.split(":");
	return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
};

/**
 * Crée les dates de début et fin pour un événement en gérant les cas multi-jours
 * @param dateStr Date au format "YYYY-MM-DD"
 * @param timeStart Heure de début au format "HH:MM"
 * @param timeEnd Heure de fin au format "HH:MM"
 * @returns Objet avec dateStart et dateEnd en ISO strings
 */
export const createEventDates = (dateStr: string, timeStart: string, timeEnd: string) => {
	const startDate = createDateFromString(dateStr, timeStart);
	const endDate = createDateFromString(dateStr, timeEnd);

	// Si l'heure de fin est avant l'heure de début, l'événement se termine le lendemain
	if (endDate < startDate) {
		endDate.setDate(endDate.getDate() + 1);
	}

	return {
		dateStart: startDate.toISOString(),
		dateEnd: endDate.toISOString()
	};
};

export function isValidDate(d: unknown): d is Date {
	return d instanceof Date && !isNaN(d.getTime());
}

export const addTime = (initial: string, durationToAdd = 10) => {
	if (initial) {
		const calculated = format(
			addMinutes(parse(initial, "kk:mm", new Date()), durationToAdd),
			"kk:mm"
		);
		return calculated;
	} else {
		return "";
	}
};

export const lisibleDate = (date: Date | string | undefined) => {
	if (!date) return "";
	return format(new Date(date), "EEEE d MMMM", { locale: fr });
};

export const lisibleDateShort = (date: Date | string | undefined) => {
	if (!date) return "";
	try {
		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) return "";
		return format(dateObj, "EE d MMM", { locale: fr });
	} catch {
		return "";
	}
};
export const lisibleTime = (date: Date | string | undefined) => {
	if (!date) return "";
	try {
		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) return "";
		return format(dateObj, "kk:mm", { locale: fr });
	} catch {
		return "";
	}
};

export const lisibleDateTime = (date: Date | string | undefined) => {
	if (!date) return "";
	try {
		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) return "";
		return format(dateObj, "EEEE d MMMM à kk:mm", { locale: fr });
	} catch {
		return "";
	}
};

export const formatDatePb = (date: Date | string) => {
	return format(new Date(date), "yyyy-MM-dd");
};

export const formatTimePb = (date: Date | string) => {
	return format(new Date(date), "HH:mm");
};

export const userToOrganizerFmt = (user: UserType, tasks?: string[] | string) => ({
	id: user.id,
	username: user.username,
	tasks: tasks || []
});

// XXX FOr what ?
export const handleOrganizerMaybehere = (params: {
	organizers: OrganizerType[];
	currentUser: UserType;
	maybehere: "oui" | "";
	isDateAccepted?: boolean;
}) => {
	const { organizers, currentUser, maybehere, isDateAccepted } = params;

	const currentOrganizerIndex = organizers.findIndex((org) => org.id === currentUser.id);

	// Si la date est acceptée et maybehere est 'oui', on assigne la tâche par défaut
	const defaultTask = getSpace.defaultTask;
	const tasks = isDateAccepted && maybehere === "oui" && defaultTask ? [defaultTask.name] : [];

	if (currentOrganizerIndex !== -1) {
		// Mettre à jour maybehere pour l'organisateur existant
		const updatedOrganizer = {
			...organizers[currentOrganizerIndex],
			maybehere,
			...(isDateAccepted && { tasks })
		};
		const updatedOrganizers = [...organizers];
		updatedOrganizers[currentOrganizerIndex] = updatedOrganizer;
		return updatedOrganizers;
	} else {
		// Ajouter un nouvel organisateur avec maybehere
		return [
			...organizers,
			{
				id: currentUser.id,
				username: currentUser.username,
				tasks,
				maybehere
			}
		];
	}
};

export const convertMaybehereToOrganizer = (org: any) => ({
	id: org.id,
	username: org.username,
	tasks: [getSpace.defaultTask.name]
});

export const filterAndConvertOrganizers = (organizers: any[]) => {
	return organizers.filter((org: any) => org.maybehere === "oui").map(convertMaybehereToOrganizer);
};

/**
 * Formate une chaîne en slug URL-friendly
 * @param str - La chaîne à convertir
 * @returns La chaîne formatée en slug
 */
export const slugify = (str: string): string => {
	return str
		.normalize("NFD") // Décompose les caractères accentués
		.replace(/[\u0300-\u036f]/g, "") // Supprime les accents
		.toLowerCase() // Convertit en minuscules
		.trim() // Supprime les espaces début/fin
		.replace(/[^a-z0-9]+/g, "-") // Remplace les caractères non alphanumériques par des tirets
		.replace(/^-+|-+$/g, ""); // Supprime les tirets en début/fin
};

// Re-export

export { isMobile } from "./utils/screen.svelte";

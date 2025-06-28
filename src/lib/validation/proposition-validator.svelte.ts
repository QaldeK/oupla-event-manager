import type { EventType } from "$lib/types/event.types";

type PropositionValidationRule = "title" | "proposals" | "publicDescription" | "categories";

type ValidatorFunction = (event: Partial<EventType>) => string | undefined;

const VALIDATORS: Record<PropositionValidationRule, ValidatorFunction> = {
	title: (e) => {
		const title = e.event_title?.trim();
		if (!title) return "Le titre de l'événement est requis";
		if (title.length < 3) return "Le titre de l'événement doit avoir au moins 3 caractères";
		return undefined;
	},
	proposals: (e) => {
		if (
			!e.external_proposal ||
			!e.external_proposal.proposals ||
			e.external_proposal.proposals.length === 0
		) {
			return "Au moins une proposition de date est requise";
		}

		for (const proposal of e.external_proposal.proposals) {
			if (!proposal.date_event || !proposal.time_start || !proposal.start_event) {
				return "Chaque proposition de date doit avoir une date, une heure d'installation et une heure de début";
			}
		}
		return undefined;
	},
	categories: (e) => {
		if (!e.categories || e.categories.length === 0) {
			return "Au moins une catégorie est requise";
		}
		return undefined;
	},
	publicDescription: (e) => {
		if (!e.desc_public || e.desc_public.trim().length < 10) {
			return "Une description publique d'au moins 10 caractères est requise";
		}
		return undefined;
	}
};

export function validateProposition(event: Partial<EventType>): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	for (const rule in VALIDATORS) {
		const error = VALIDATORS[rule as PropositionValidationRule](event);
		if (error) {
			errors.push(error);
		}
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

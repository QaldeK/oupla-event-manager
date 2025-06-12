/**
 * Utilitaires pour la détection de la taille d'écran
 * Basé sur les breakpoints standard de Tailwind CSS et svelte/reactivity/window
 */

import { innerWidth } from 'svelte/reactivity/window';

// Breakpoints Tailwind CSS standard
const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536
} as const;

/**
 * Détecteur d'écran réactif utilisant svelte/reactivity/window
 * Tous les getters sont des dérivations réactives basées sur innerWidth.current
 */
export const screenDetector = {
	/**
	 * Largeur actuelle de la fenêtre (réactive)
	 */
	get width() {
		return innerWidth.current ?? 0;
	},

	/**
	 * Mode mobile (< md breakpoint, soit 768px)
	 */
	get isMobile() {
		return this.width < BREAKPOINTS.md;
	},

	/**
	 * Breakpoint small (< 640px)
	 */
	get isSmall() {
		return this.width < BREAKPOINTS.sm;
	},

	/**
	 * Breakpoint medium (768px - 1023px)
	 */
	get isMedium() {
		return this.width >= BREAKPOINTS.md && this.width < BREAKPOINTS.lg;
	},

	/**
	 * Breakpoint large (1024px - 1279px)
	 */
	get isLarge() {
		return this.width >= BREAKPOINTS.lg && this.width < BREAKPOINTS.xl;
	},

	/**
	 * Breakpoint extra large (1280px - 1535px)
	 */
	get isXLarge() {
		return this.width >= BREAKPOINTS.xl && this.width < BREAKPOINTS['2xl'];
	},

	/**
	 * Breakpoint 2x extra large (>= 1536px)
	 */
	get is2XLarge() {
		return this.width >= BREAKPOINTS['2xl'];
	},

	/**
	 * Mode desktop (>= md breakpoint, soit 768px+)
	 */
	get isDesktop() {
		return this.width >= BREAKPOINTS.md;
	},

	/**
	 * Mode tablet (entre sm et lg)
	 */
	get isTablet() {
		return this.width >= BREAKPOINTS.sm && this.width < BREAKPOINTS.lg;
	}
};

/**
 * Hook utilitaire pour une utilisation simple dans les composants
 * Retourne les états de breakpoint les plus utilisés
 */
export function useScreen() {
	return {
		get width() {
			return screenDetector.width;
		},
		get isMobile() {
			return screenDetector.isMobile;
		},
		get isDesktop() {
			return screenDetector.isDesktop;
		},
		get isTablet() {
			return screenDetector.isTablet;
		}
	};
}

/**
 * Fonction utilitaire pour créer des dérivations personnalisées
 * basées sur la largeur d'écran
 */
export function createBreakpointMatcher(breakpoint: keyof typeof BREAKPOINTS, operator: 'min' | 'max' = 'min') {
	return {
		get matches() {
			const width = screenDetector.width;
			const threshold = BREAKPOINTS[breakpoint];
			return operator === 'min' ? width >= threshold : width < threshold;
		}
	};
}

// Exports de convenience pour les breakpoints les plus utilisés
export const isMobile = {
	get current() {
		return screenDetector.isMobile;
	}
};

export const isDesktop = {
	get current() {
		return screenDetector.isDesktop;
	}
};
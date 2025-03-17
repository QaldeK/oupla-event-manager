// stores/breakpoints.js
import { browser } from '$app/environment';

import { writable } from 'svelte/store';

function createBreakpointStore() {
	const { subscribe, set } = writable('sm');

	if (browser) {
		// Utilisation des valeurs par défaut de Tailwind
		const mediaQueries = {
			sm: '(max-width: 639px)',
			md: '(min-width: 640px) and (max-width: 767px)',
			lg: '(min-width: 768px) and (max-width: 1023px)',
			xl: '(min-width: 1024px) and (max-width: 1279px)',
			'2xl': '(min-width: 1280px)'
		};

		const updateBreakpoint = () => {
			const currentBreakpoint = Object.keys(mediaQueries).find(
				(key) => window.matchMedia(mediaQueries[key as keyof typeof mediaQueries]).matches
			);
			set(currentBreakpoint || 'sm'); // Valeur par défaut si aucun breakpoint ne correspond
		};

		updateBreakpoint();
		window.addEventListener('resize', updateBreakpoint);
	}

	return { subscribe };
}

export const breakpoint = createBreakpointStore();

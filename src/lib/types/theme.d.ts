export interface PublicSiteThemeOptions {
	daisyTheme: string;
	defaultMode: string;
	daisyThemeLight;
	daisyThemeDark;
	eventCard: {
		imagePosition: 'left' | 'top';
		widthClass: string;
		truncateLines: number;
		bgClass: string;
		textClass: string;
		shadowClass: string;
		roundedClass: string;
		titleSizeClass: string;
		dateSizeClass: string;
		categorySizeClass: string;
	};
	layoutSections: {
		header: { bgClass: string; textClass: string };
		leftSidebar: { bgClass: string; textClass: string };
		rightSidebar: { bgClass: string; textClass: string };
		footer: { bgClass: string; textClass: string };
		mainBackgroundClass: string;
	};
	components: {
		navbarHeader: {
			enabled: boolean;
			pos: number;
			section: string;
			hasMenu: boolean;
			isFixed: boolean;
			size: string;
			titleClass: string[];
			links: { title: string; url: string }[];
			linkClass: string[];
		};
		sideMenu: {
			enabled: boolean;
			pos: number;
			section: string;
			links: { title: string; url: string }[];
			classAttr: string;
		};
		[key: string]: any;
	};
}

// Fonction pour fournir une valeur par défaut robuste (peut être partagée)
export function getDefaultThemeOptions(): PublicSiteThemeOptions {
	console.log('getDefaultThemeOptions');
	return {
		daisyTheme: 'light', // Thème par défaut si rien n'est trouvé
		defaultMode: 'light',
		daisyThemeLight: 'light',
		daisyThemeDark: 'dark',
		eventCard: {
			imagePosition: 'left',
			widthClass: 'w-full',
			truncateLines: 24,
			bgClass: 'bg-base-100',
			textClass: 'text-base-content',
			shadowClass: 'shadow-lg',
			roundedClass: 'rounded-lg',
			titleSizeClass: 'text-xl',
			dateSizeClass: 'text-sm',
			categorySizeClass: 'text-sm'
		},
		layoutSections: {
			header: { bgClass: 'bg-base-100', textClass: 'text-base-content' },

			leftSidebar: { bgClass: 'bg-base-100', textClass: 'text-base-content' },
			rightSidebar: { bgClass: 'bg-base-100', textClass: 'text-base-content' },
			footer: { bgClass: 'bg-base-300', textClass: 'text-base-content' },
			mainBackgroundClass: 'bg-base-200/50'
		},
		components: {
			navbarHeader: {
				enabled: true,
				pos: 2,
				section: 'header',
				hasMenu: true,
				isFixed: true,
				size: 'min-h-[4rem]',
				titleClass: ['text-fluid-2xl', 'text-base-content', 'font-bold'],
				linkClass: ['text-base-content', 'font-semibold'],
				links: [
					{
						title: 'À propos',
						url: `about`
					},

					{ title: 'Nous trouver', url: '/find-us' },
					{ title: 'Proposer un événement', url: `propose-event` }
				]
			}
		}
	};
}

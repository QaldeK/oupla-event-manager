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
		top: { bgClass: string; textClass: string };
	};
	components: {
		navbarHeader: NavbarHeaderType;
		// sideMenu: SideMenuType;
		primaryNavLinks: { title: string; url: string }[];

		[key: string]: unknown;
	};
}

export interface NavbarHeaderType {
	enabled: boolean;
	pos: number;
	isFixed: boolean;
	size: string;
	titleClass: string[];
	linkClass: string[];
}

export interface SideMenuType {
	enabled: boolean;
	pos: number;
	section: string;
	links: { title: string; url: string }[];
	classAttr: string;
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
			mainBackgroundClass: 'bg-base-200/50',
			top: { bgClass: 'bg-base-100', textClass: 'text-base-content' }
		},
		components: {
			navbarHeader: {
				enabled: true,
				pos: 2,
				// section: 'header',
				// hasMenu: true,
				isFixed: true,
				size: 'min-h-[4rem]',
				titleClass: ['text-fluid-2xl', 'font-bold'],
				linkClass: ['text-base-content', 'font-semibold']
			},
			primaryNavLinks: [
				{
					title: 'À propos',
					url: `about`
				},

				{ title: 'Nous trouver', url: 'find-us' },
				{ title: 'Proposer un événement', url: `proposition` }
			]
			// sideMenu: {
			// 	enabled: false,
			// 	pos: 0,
			// 	section: 'leftSide',
			// 	links: [],
			// 	classAttr: 'menu bg-base-100 p-4 rounded-lg shadow-md'
			// }
		}
	};
}

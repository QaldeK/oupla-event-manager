export interface SpaceConfig {
	id: string;
	configId: string;
	name: string;
	description: string;
	rooms: string[];
	categories: string[];
	members: string[];
	tasks: {
		list: string[];
		defaultTask: string;
	};
	space?: {
		id: string;
		name: string;
		description: string;
	};
}

export interface SpaceUser {
	id: string;
	username: string;
	email: string;
	role: string;
}

export interface SpaceDetails {
	space: {
		id: string;
		name: string;
		description: string;
	};
}

export interface SpaceOptionsType {
	tasks?: {
		list: string[];
		defaultTask: string;
	};
	rooms?: string[];
	categories?: string[];
}

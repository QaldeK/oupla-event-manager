import type { TasksListType, TaskType } from '$lib/schemas/event.schema';

export type { TaskType } from '$lib/schemas/event.schema';

export interface SpaceConfig {
	id: string;
	configId: string;
	name: string;
	description: string;
	rooms: string[];
	categories: string[];
	members: SpaceUser[];
	tasks: TaskType[];

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
	tasks?: TaskType[];
	rooms?: string[];
	categories?: string[];
}

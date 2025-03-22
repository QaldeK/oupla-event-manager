export * from './message';
export * from './pocketbase';

export interface UserType {
	id: string;
	username: string;
	email: string;
	currentRole: string;
	verified: boolean;
	memberOf: Array<{
		id: string;
		name: string;
		role: string;
		description?: string;
		since?: string;
	}>;
	currentSpace: {
		id: string;
		name: string;
		role: string;
		description?: string;
		since?: string;
	} | null;
}

export interface SpaceMember {
	user: string;
	space: string;
	role: string;
	created?: string;
	expand?: {
		space: {
			id: string;
			name: string;
			description?: string;
		};
	};
}

export interface CurrentUser {
	id: string;
	username: string;
	role: string;
}

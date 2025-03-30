export interface PadRecord {
	id: string;
	title: string;
	content?: string;
	created?: string;
	updated?: string;
	created_by: string;
	space: string;
	isEditing: boolean;
	editingUser: string;
	lastEditHeartbeat?: string;
}

export type PadResponse = PadRecord & {
	collectionId: string;
	collectionName: string;
	expand?: Record<string, any>;
};

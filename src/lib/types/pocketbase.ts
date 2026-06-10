/**
 * This file was @generated using pocketbase-typegen
 */

import type PocketBase from "pocketbase";
import type { RecordService } from "pocketbase";

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	Events: "events",
	EventsPast: "events_past",
	Logs: "logs",
	Messages: "messages",
	Pads: "pads",
	SitePages: "site_pages",
	SpaceMembers: "spaceMembers",
	Spaces: "spaces",
	SpacesOptions: "spaces_options",
	Users: "users"
} as const;
export type Collections = (typeof Collections)[keyof typeof Collections];

// Alias types for improved usability
export type IsoDateString = string;
export type IsoAutoDateString = string & { readonly autodate: unique symbol };
export type RecordIdString = string;
export type FileNameString = string & { readonly filename: unique symbol };
export type HTMLString = string;

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T };

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString;
	collectionId: string;
	collectionName: Collections;
} & ExpandType<T>;

export type AuthSystemFields<T = unknown> = {
	email: string;
	emailVisibility: boolean;
	username: string;
	verified: boolean;
} & BaseSystemFields<T>;

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string;
	created: IsoAutoDateString;
	fingerprint: string;
	id: string;
	recordRef: string;
	updated: IsoAutoDateString;
};

export type ExternalauthsRecord = {
	collectionRef: string;
	created: IsoAutoDateString;
	id: string;
	provider: string;
	providerId: string;
	recordRef: string;
	updated: IsoAutoDateString;
};

export type MfasRecord = {
	collectionRef: string;
	created: IsoAutoDateString;
	id: string;
	method: string;
	recordRef: string;
	updated: IsoAutoDateString;
};

export type OtpsRecord = {
	collectionRef: string;
	created: IsoAutoDateString;
	id: string;
	password: string;
	recordRef: string;
	sentTo?: string;
	updated: IsoAutoDateString;
};

export type SuperusersRecord = {
	created: IsoAutoDateString;
	email: string;
	emailVisibility?: boolean;
	id: string;
	password: string;
	tokenKey: string;
	updated: IsoAutoDateString;
	verified?: boolean;
};

export type EventsRecord<
	Tcategories = unknown,
	Tdates_proposed = unknown,
	Texternal_proposal = unknown,
	Torganizers = unknown,
	Tother_date_query = unknown,
	Trecurrence = unknown,
	Trooms = unknown,
	Ttasks = unknown
> = {
	age_advice?: number;
	canceled?: boolean;
	categories?: null | Tcategories;
	created: IsoAutoDateString;
	created_by: RecordIdString;
	dateEnd?: IsoDateString;
	dateStart?: IsoDateString;
	date_event?: string;
	dates_proposed?: null | Tdates_proposed;
	desc_public?: HTMLString;
	description?: string;
	duree?: string;
	event_title: string;
	external_proposal?: null | Texternal_proposal;
	id: string;
	image?: FileNameString[];
	inConflictWith?: RecordIdString[];
	isConfirmed?: boolean;
	isMasterRecurrent?: boolean;
	isMixiteChoisie?: boolean;
	isPublic?: boolean;
	isPublished?: boolean;
	isRecurrent?: boolean;
	isSendToNewsletter?: boolean;
	isSondage?: boolean;
	is_age_no_restriction?: boolean;
	is_prix_libre?: boolean;
	link?: string;
	masterRecurrentId?: RecordIdString;
	mixite?: string;
	noOrganizerNotificationSent?: boolean;
	notConfirmedNotificationSent?: boolean;
	organizers?: null | Torganizers;
	other_date_query?: null | Tother_date_query;
	prix?: string;
	recurrence?: null | Trecurrence;
	reportedFrom?: string;
	reportedTo?: string;
	rooms?: null | Trooms;
	space: RecordIdString;
	start_event?: string;
	start_public?: string;
	tasks?: null | Ttasks;
	time_end?: string;
	time_start?: string;
	updated: IsoAutoDateString;
};

export type EventsPastRecord<Tcategories = unknown, Torganizers = unknown> = {
	age_advice?: string;
	canceled?: boolean;
	categories?: null | Tcategories;
	created: IsoAutoDateString;
	created_by?: RecordIdString;
	date_event?: string;
	desc_public?: HTMLString;
	description?: string;
	duree?: string;
	event_title: string;
	id: string;
	isConfirmed?: boolean;
	isMixiteChoisie?: boolean;
	isPublic?: boolean;
	isPublished?: boolean;
	isRecurrent?: boolean;
	is_age_no_restriction?: boolean;
	is_prix_libre?: boolean;
	masterRecurrentId?: RecordIdString;
	mixite?: string;
	organizers?: null | Torganizers;
	prix?: string;
	reportedFrom?: string;
	reportedTo?: string;
	space?: RecordIdString;
	start_event?: string;
	start_public?: string;
	updated: IsoAutoDateString;
};

export type LogsRecord<Tdetails = unknown> = {
	action: string;
	collection_target: string;
	created: IsoAutoDateString;
	details?: null | Tdetails;
	id: string;
	record_target_id?: string;
	space: RecordIdString;
	updated: IsoAutoDateString;
	user_actor_id: RecordIdString;
	users_concerned?: RecordIdString[];
};

export type MessagesRecord = {
	content: string;
	created: IsoAutoDateString;
	event?: RecordIdString;
	id: string;
	isEdited?: boolean;
	replyingTo?: RecordIdString;
	space: RecordIdString;
	updated: IsoAutoDateString;
	user: RecordIdString;
	users_concerned?: RecordIdString[];
};

export type PadsRecord = {
	content?: HTMLString;
	created: IsoAutoDateString;
	created_by: RecordIdString;
	editingUser?: RecordIdString;
	id: string;
	isEditing?: boolean;
	lastEditHeartbeat?: IsoDateString;
	lastMod?: IsoDateString;
	space: RecordIdString;
	tags?: string;
	title: string;
	updated: IsoAutoDateString;
};

export const SitePagesSectionOptions = {
	page: "page",
	leftSide: "leftSide",
	header: "header",
	top: "top",
	rightSide: "rightSide",
	footer: "footer"
} as const;
export type SitePagesSectionOptions =
	(typeof SitePagesSectionOptions)[keyof typeof SitePagesSectionOptions];
export type SitePagesRecord<TcomponentConfig = unknown> = {
	componentConfig?: null | TcomponentConfig;
	componentType?: string;
	content?: HTMLString;
	created: IsoAutoDateString;
	created_by?: RecordIdString;
	editingUser?: RecordIdString;
	enabled?: boolean;
	id: string;
	isEditing?: boolean;
	lastEditHeartbeat?: IsoDateString;
	lastMod?: IsoDateString;
	pos?: number;
	section?: SitePagesSectionOptions;
	space: RecordIdString;
	tags?: string;
	title: string;
	updated: IsoAutoDateString;
};

export const SpaceMembersRoleOptions = {
	admin: "admin",
	helpers: "helpers",
	invited: "invited",
	external: "external"
} as const;
export type SpaceMembersRoleOptions =
	(typeof SpaceMembersRoleOptions)[keyof typeof SpaceMembersRoleOptions];
export type SpaceMembersRecord = {
	created: IsoAutoDateString;
	id: string;
	isMemberOfRecurrent?: RecordIdString[];
	isOrganizerOf?: RecordIdString[];
	role: SpaceMembersRoleOptions;
	space: RecordIdString;
	updated: IsoAutoDateString;
	user: RecordIdString;
};

export const SpacesInscriptionOptions = {
	open: "open",
	invitation: "invitation",
	close: "close"
} as const;
export type SpacesInscriptionOptions =
	(typeof SpacesInscriptionOptions)[keyof typeof SpacesInscriptionOptions];
export type SpacesRecord<Tdeleted_records = unknown> = {
	created: IsoAutoDateString;
	created_by: RecordIdString;
	deleted_records?: null | Tdeleted_records;
	description?: string;
	id: string;
	inscription?: SpacesInscriptionOptions;
	name: string;
	public_name: string;
	updated: IsoAutoDateString;
};

export type SpacesOptionsRecord<
	Tcategories = unknown,
	Toptions = unknown,
	TpublicSiteTheme = unknown,
	Trooms = unknown,
	Ttasks = unknown
> = {
	categories?: null | Tcategories;
	created: IsoAutoDateString;
	id: string;
	mailContactSpace?: string;
	mailSend?: HTMLString;
	newsletterMembers?: string;
	newsletterPublic?: string;
	options?: null | Toptions;
	publicSiteTheme?: null | TpublicSiteTheme;
	public_site?: boolean;
	rooms?: null | Trooms;
	space?: RecordIdString;
	tasks?: null | Ttasks;
	updated: IsoAutoDateString;
};

export type UsersRecord = {
	avatar?: FileNameString;
	created: IsoAutoDateString;
	email: string;
	emailVisibility?: boolean;
	id: string;
	invitationExpires?: IsoDateString;
	invitationToken?: string;
	isInvited?: boolean;
	password: string;
	tokenKey: string;
	updated: IsoAutoDateString;
	username?: string;
	verified?: boolean;
};

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> &
	BaseSystemFields<Texpand>;
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> &
	BaseSystemFields<Texpand>;
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>;
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>;
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> &
	AuthSystemFields<Texpand>;
export type EventsResponse<
	Tcategories = unknown,
	Tdates_proposed = unknown,
	Texternal_proposal = unknown,
	Torganizers = unknown,
	Tother_date_query = unknown,
	Trecurrence = unknown,
	Trooms = unknown,
	Ttasks = unknown,
	Texpand = unknown
> = Required<
	EventsRecord<
		Tcategories,
		Tdates_proposed,
		Texternal_proposal,
		Torganizers,
		Tother_date_query,
		Trecurrence,
		Trooms,
		Ttasks
	>
> &
	BaseSystemFields<Texpand>;
export type EventsPastResponse<
	Tcategories = unknown,
	Torganizers = unknown,
	Texpand = unknown
> = Required<EventsPastRecord<Tcategories, Torganizers>> & BaseSystemFields<Texpand>;
export type LogsResponse<Tdetails = unknown, Texpand = unknown> = Required<LogsRecord<Tdetails>> &
	BaseSystemFields<Texpand>;
export type MessagesResponse<Texpand = unknown> = Required<MessagesRecord> &
	BaseSystemFields<Texpand>;
export type PadsResponse<Texpand = unknown> = Required<PadsRecord> & BaseSystemFields<Texpand>;
export type SitePagesResponse<TcomponentConfig = unknown, Texpand = unknown> = Required<
	SitePagesRecord<TcomponentConfig>
> &
	BaseSystemFields<Texpand>;
export type SpaceMembersResponse<Texpand = unknown> = Required<SpaceMembersRecord> &
	BaseSystemFields<Texpand>;
export type SpacesResponse<Tdeleted_records = unknown, Texpand = unknown> = Required<
	SpacesRecord<Tdeleted_records>
> &
	BaseSystemFields<Texpand>;
export type SpacesOptionsResponse<
	Tcategories = unknown,
	Toptions = unknown,
	TpublicSiteTheme = unknown,
	Trooms = unknown,
	Ttasks = unknown,
	Texpand = unknown
> = Required<SpacesOptionsRecord<Tcategories, Toptions, TpublicSiteTheme, Trooms, Ttasks>> &
	BaseSystemFields<Texpand>;
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>;

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord;
	_externalAuths: ExternalauthsRecord;
	_mfas: MfasRecord;
	_otps: OtpsRecord;
	_superusers: SuperusersRecord;
	events: EventsRecord;
	events_past: EventsPastRecord;
	logs: LogsRecord;
	messages: MessagesRecord;
	pads: PadsRecord;
	site_pages: SitePagesRecord;
	spaceMembers: SpaceMembersRecord;
	spaces: SpacesRecord;
	spaces_options: SpacesOptionsRecord;
	users: UsersRecord;
};

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse;
	_externalAuths: ExternalauthsResponse;
	_mfas: MfasResponse;
	_otps: OtpsResponse;
	_superusers: SuperusersResponse;
	events: EventsResponse;
	events_past: EventsPastResponse;
	logs: LogsResponse;
	messages: MessagesResponse;
	pads: PadsResponse;
	site_pages: SitePagesResponse;
	spaceMembers: SpaceMembersResponse;
	spaces: SpacesResponse;
	spaces_options: SpacesOptionsResponse;
	users: UsersResponse;
};

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<
	{
		// Omit AutoDate fields
		[K in keyof T as Extract<T[K], IsoAutoDateString> extends never
			? K
			: never]: // Convert FileNameString to File
		T[K] extends infer U
			? U extends FileNameString | FileNameString[]
				? U extends any[]
					? File[]
					: File
				: U
			: never;
	},
	"id"
>;

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString;
	email: string;
	emailVisibility?: boolean;
	password: string;
	passwordConfirm: string;
	verified?: boolean;
} & ProcessCreateAndUpdateFields<T>;

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString;
} & ProcessCreateAndUpdateFields<T>;

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string;
	emailVisibility?: boolean;
	oldPassword?: string;
	password?: string;
	passwordConfirm?: string;
	verified?: boolean;
};

// Update type for Base collections
export type UpdateBase<T> = Partial<Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>>;

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>;

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>;

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>;
} & PocketBase;

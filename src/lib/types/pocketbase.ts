/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	ConversationSummaries = "conversation_summaries",
	Events = "events",
	EventsPast = "events_past",
	Logs = "logs",
	Messages = "messages",
	Pads = "pads",
	SitePages = "site_pages",
	SpaceMembers = "spaceMembers",
	Spaces = "spaces",
	SpacesOptions = "spaces_options",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export enum ConversationSummariesTopicTypeOptions {
	"event" = "event",
	"group" = "group",
	"dm" = "dm",
}
export type ConversationSummariesRecord = {
	created?: IsoDateString
	id: string
	last_message_snippet?: string
	last_message_timestamp?: IsoDateString
	last_message_user?: RecordIdString
	message_count?: number
	space?: RecordIdString
	topic_id?: string
	topic_title?: string
	topic_type?: ConversationSummariesTopicTypeOptions
	updated?: IsoDateString
}

export type EventsRecord<Tcategories = unknown, Tdates_proposed = unknown, Texternal_proposal = unknown, Torganizers = unknown, Tother_date_query = unknown, Trecurrence = unknown, Trooms = unknown, Ttasks = unknown> = {
	age_advice?: number
	canceled?: boolean
	categories?: null | Tcategories
	created?: IsoDateString
	created_by: RecordIdString
	dateEnd?: IsoDateString
	dateStart?: IsoDateString
	date_event?: string
	dates_proposed?: null | Tdates_proposed
	desc_public?: HTMLString
	description?: string
	duree?: string
	event_title: string
	external_proposal?: null | Texternal_proposal
	id: string
	image?: string[]
	inConflictWith?: RecordIdString[]
	isConfirmed?: boolean
	isMasterRecurrent?: boolean
	isMixiteChoisie?: boolean
	isPublic?: boolean
	isPublished?: boolean
	isRecurrent?: boolean
	isSendToNewsletter?: boolean
	isSondage?: boolean
	is_age_no_restriction?: boolean
	is_prix_libre?: boolean
	link?: string
	masterRecurrentId?: RecordIdString
	mixite?: string
	noOrganizerNotificationSent?: boolean
	notConfirmedNotificationSent?: boolean
	organizers?: null | Torganizers
	other_date_query?: null | Tother_date_query
	prix?: string
	recurrence?: null | Trecurrence
	reportedFrom?: string
	reportedTo?: string
	rooms?: null | Trooms
	space: RecordIdString
	start_event?: string
	start_public?: string
	tasks?: null | Ttasks
	time_end?: string
	time_start?: string
	updated?: IsoDateString
}

export type EventsPastRecord<Tcategories = unknown, Torganizers = unknown> = {
	age_advice?: string
	canceled?: boolean
	categories?: null | Tcategories
	created?: IsoDateString
	created_by?: RecordIdString
	date_event?: string
	desc_public?: HTMLString
	description?: string
	duree?: string
	event_title: string
	id: string
	isConfirmed?: boolean
	isMixiteChoisie?: boolean
	isPublic?: boolean
	isPublished?: boolean
	isRecurrent?: boolean
	is_age_no_restriction?: boolean
	is_prix_libre?: boolean
	masterRecurrentId?: RecordIdString
	mixite?: string
	organizers?: null | Torganizers
	prix?: string
	reportedFrom?: string
	reportedTo?: string
	space?: RecordIdString
	start_event?: string
	start_public?: string
	updated?: IsoDateString
}

export type LogsRecord<Tdetails = unknown> = {
	action: string
	collection_target: string
	created?: IsoDateString
	details?: null | Tdetails
	id: string
	record_target_id?: string
	space: RecordIdString
	updated?: IsoDateString
	user_actor_id: RecordIdString
	users_concerned?: RecordIdString[]
}

export type MessagesRecord = {
	content: string
	created?: IsoDateString
	event?: RecordIdString
	id: string
	isEdited?: boolean
	replyingTo?: RecordIdString
	space: RecordIdString
	updated?: IsoDateString
	user: RecordIdString
	users_concerned?: RecordIdString[]
}

export type PadsRecord = {
	content?: HTMLString
	created?: IsoDateString
	created_by: RecordIdString
	editingUser?: RecordIdString
	id: string
	isEditing?: boolean
	lastEditHeartbeat?: IsoDateString
	lastMod?: IsoDateString
	space: RecordIdString
	tags?: string
	title: string
	updated?: IsoDateString
}

export enum SitePagesSectionOptions {
	"page" = "page",
	"leftSide" = "leftSide",
	"header" = "header",
	"top" = "top",
	"rightSide" = "rightSide",
	"footer" = "footer",
}
export type SitePagesRecord<TcomponentConfig = unknown> = {
	componentConfig?: null | TcomponentConfig
	componentType?: string
	content?: HTMLString
	created?: IsoDateString
	created_by?: RecordIdString
	editingUser?: RecordIdString
	enabled?: boolean
	id: string
	isEditing?: boolean
	lastEditHeartbeat?: IsoDateString
	lastMod?: IsoDateString
	pos?: number
	section?: SitePagesSectionOptions
	space: RecordIdString
	tags?: string
	title: string
	updated?: IsoDateString
}

export enum SpaceMembersRoleOptions {
	"admin" = "admin",
	"helpers" = "helpers",
	"invited" = "invited",
	"external" = "external",
}
export type SpaceMembersRecord = {
	created?: IsoDateString
	id: string
	isMemberOfRecurrent?: RecordIdString[]
	isOrganizerOf?: RecordIdString[]
	role: SpaceMembersRoleOptions
	space: RecordIdString
	updated?: IsoDateString
	user: RecordIdString
}

export enum SpacesInscriptionOptions {
	"open" = "open",
	"invitation" = "invitation",
	"close" = "close",
}
export type SpacesRecord<Tdeleted_records = unknown> = {
	created?: IsoDateString
	created_by: RecordIdString
	deleted_records?: null | Tdeleted_records
	description?: string
	id: string
	inscription?: SpacesInscriptionOptions
	name: string
	public_name: string
	updated?: IsoDateString
}

export type SpacesOptionsRecord<Tcategories = unknown, Toptions = unknown, TpublicSiteTheme = unknown, Trooms = unknown, Ttasks = unknown> = {
	categories?: null | Tcategories
	created?: IsoDateString
	id: string
	mailContactSpace?: string
	mailSend?: HTMLString
	newsletterMembers?: string
	newsletterPublic?: string
	options?: null | Toptions
	publicSiteTheme?: null | TpublicSiteTheme
	public_site?: boolean
	rooms?: null | Trooms
	space?: RecordIdString
	tasks?: null | Ttasks
	updated?: IsoDateString
}

export type UsersRecord = {
	avatar?: string
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	invitationExpires?: IsoDateString
	invitationToken?: string
	isInvited?: boolean
	password: string
	tokenKey: string
	updated?: IsoDateString
	username?: string
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type ConversationSummariesResponse<Texpand = unknown> = Required<ConversationSummariesRecord> & BaseSystemFields<Texpand>
export type EventsResponse<Tcategories = unknown, Tdates_proposed = unknown, Texternal_proposal = unknown, Torganizers = unknown, Tother_date_query = unknown, Trecurrence = unknown, Trooms = unknown, Ttasks = unknown, Texpand = unknown> = Required<EventsRecord<Tcategories, Tdates_proposed, Texternal_proposal, Torganizers, Tother_date_query, Trecurrence, Trooms, Ttasks>> & BaseSystemFields<Texpand>
export type EventsPastResponse<Tcategories = unknown, Torganizers = unknown, Texpand = unknown> = Required<EventsPastRecord<Tcategories, Torganizers>> & BaseSystemFields<Texpand>
export type LogsResponse<Tdetails = unknown, Texpand = unknown> = Required<LogsRecord<Tdetails>> & BaseSystemFields<Texpand>
export type MessagesResponse<Texpand = unknown> = Required<MessagesRecord> & BaseSystemFields<Texpand>
export type PadsResponse<Texpand = unknown> = Required<PadsRecord> & BaseSystemFields<Texpand>
export type SitePagesResponse<TcomponentConfig = unknown, Texpand = unknown> = Required<SitePagesRecord<TcomponentConfig>> & BaseSystemFields<Texpand>
export type SpaceMembersResponse<Texpand = unknown> = Required<SpaceMembersRecord> & BaseSystemFields<Texpand>
export type SpacesResponse<Tdeleted_records = unknown, Texpand = unknown> = Required<SpacesRecord<Tdeleted_records>> & BaseSystemFields<Texpand>
export type SpacesOptionsResponse<Tcategories = unknown, Toptions = unknown, TpublicSiteTheme = unknown, Trooms = unknown, Ttasks = unknown, Texpand = unknown> = Required<SpacesOptionsRecord<Tcategories, Toptions, TpublicSiteTheme, Trooms, Ttasks>> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	conversation_summaries: ConversationSummariesRecord
	events: EventsRecord
	events_past: EventsPastRecord
	logs: LogsRecord
	messages: MessagesRecord
	pads: PadsRecord
	site_pages: SitePagesRecord
	spaceMembers: SpaceMembersRecord
	spaces: SpacesRecord
	spaces_options: SpacesOptionsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	conversation_summaries: ConversationSummariesResponse
	events: EventsResponse
	events_past: EventsPastResponse
	logs: LogsResponse
	messages: MessagesResponse
	pads: PadsResponse
	site_pages: SitePagesResponse
	spaceMembers: SpaceMembersResponse
	spaces: SpacesResponse
	spaces_options: SpacesOptionsResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'conversation_summaries'): RecordService<ConversationSummariesResponse>
	collection(idOrName: 'events'): RecordService<EventsResponse>
	collection(idOrName: 'events_past'): RecordService<EventsPastResponse>
	collection(idOrName: 'logs'): RecordService<LogsResponse>
	collection(idOrName: 'messages'): RecordService<MessagesResponse>
	collection(idOrName: 'pads'): RecordService<PadsResponse>
	collection(idOrName: 'site_pages'): RecordService<SitePagesResponse>
	collection(idOrName: 'spaceMembers'): RecordService<SpaceMembersResponse>
	collection(idOrName: 'spaces'): RecordService<SpacesResponse>
	collection(idOrName: 'spaces_options'): RecordService<SpacesOptionsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}

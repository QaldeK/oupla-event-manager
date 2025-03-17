import type { EventFormType } from '$lib/schemas/event.schema';
import type { SyncEventRecord } from '$lib/shared/eventsStore.svelte';

export type EventType = SyncEventRecord & EventFormType;

export type { SyncEventRecord } from '$lib/shared/eventsStore.svelte';

export type { EventFormType, EventDateAndOrgType, OrganizerType } from '$lib/schemas/event.schema';

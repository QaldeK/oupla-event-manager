<script lang="ts">
	import { notificationState } from "$lib/shared/states.svelte";
	import {
		markNotificationsAsRead,
		generateNotificationMessage
	} from "$lib/utils/notificationsAndLogs";
	import PortalDropdown from "$lib/components/ui/PortalDropdown.svelte";
	import { Bell } from "lucide-svelte";
	import { fade } from "svelte/transition";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	let isOpen = $state(false);

	function handleOpen() {
		if (notificationState.unreadCount > 0) {
			markNotificationsAsRead();
		}
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) {
			return "À l'instant";
		} else if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return `Il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
		} else if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
		} else {
			const days = Math.floor(diffInSeconds / 86400);
			return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
		}
	}
</script>

<PortalDropdown
	bind:isOpen
	onOpen={handleOpen}
	position="bottom"
	align="right"
	width="w-80"
	triggerClass="btn btn-ghost btn-circle relative"
	headerTitle="Notifications"
	class={className}
>
	{#snippet trigger()}
		<Bell size={20} />
		{#if notificationState.unreadCount > 0}
			<div
				class="bg-error absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
				transition:fade
			>
				{notificationState.unreadCount > 9 ? "9+" : notificationState.unreadCount}
			</div>
		{/if}
	{/snippet}

	{#snippet content()}
		{#if !notificationState.isInitialized}
			<div class="p-4 text-center">
				<div class="loading loading-spinner loading-sm"></div>
				<p class="text-base-content/70 mt-2 text-sm">Chargement...</p>
			</div>
		{:else if notificationState.logs.length === 0}
			<div class="p-8 text-center">
				<Bell size={32} class="text-base-content/50 mx-auto mb-2" />
				<p class="text-base-content/70 text-sm">Aucune notification</p>
			</div>
		{:else}
			{#each notificationState.logs as notification (notification.id)}
				<div
					class="border-base-300 hover:bg-base-200 cursor-pointer border-b p-4 transition-colors"
					transition:fade
				>
					<div class="flex items-start gap-3">
						<div class="flex-1">
							<p class="text-base-content text-sm">
								{generateNotificationMessage(notification)}
							</p>
							<p class="text-base-content/60 mt-1 text-xs">
								{formatRelativeTime(notification.created)}
							</p>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	{/snippet}

	{#snippet footer()}
		{#if notificationState.logs.length > 0}
			<div class="p-3">
				<button class="btn btn-ghost btn-sm w-full text-xs" onclick={() => (isOpen = false)}>
					Fermer
				</button>
			</div>
		{/if}
	{/snippet}
</PortalDropdown>

<script lang="ts">
	import { NotificationUtils } from "$lib/utils/notificationUtils";
	import PortalDropdown from "$lib/components/ui/PortalDropdown.svelte";
	import { Bell, FileText, MessageSquare } from "lucide-svelte";
	import { fade } from "svelte/transition";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	let isOpen = $state(false);

	// Utiliser l'utilitaire pour récupérer les notifications groupées
	let groupedNotifications = $derived(NotificationUtils.getGroupedActivity(20));

	function handleOpen() {
		NotificationUtils.handleNotificationOpen();
	}

	function formatRelativeTime(dateString: string): string {
		return NotificationUtils.formatRelativeTime(dateString);
	}

	function generateMessage(notification: any): string {
		return NotificationUtils.generateMessage(notification);
	}

	function getNotificationIcon(notification: any) {
		const type = NotificationUtils.getNotificationType(notification);
		if (type === "grouped") return MessageSquare;
		if (type === "log") return FileText;
		return MessageSquare;
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
		{#if NotificationUtils.getUnreadCount() > 0}
			<div
				class="bg-error absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
				transition:fade
			>
				{NotificationUtils.getUnreadCount() > 9 ? "9+" : NotificationUtils.getUnreadCount()}
			</div>
		{/if}
	{/snippet}

	{#snippet content()}
		{#if !NotificationUtils.isInitialized()}
			<div class="p-4 text-center">
				<div class="loading loading-spinner loading-sm"></div>
				<p class="text-base-content/70 mt-2 text-sm">Chargement...</p>
			</div>
		{:else if groupedNotifications.length === 0}
			<div class="p-8 text-center">
				<Bell size={32} class="text-base-content/50 mx-auto mb-2" />
				<p class="text-base-content/70 text-sm">Aucune notification</p>
			</div>
		{:else}
			{#each groupedNotifications as notification (notification.id)}
				{@const IconComponent = getNotificationIcon(notification)}
				<div
					class="border-base-300 hover:bg-base-200 cursor-pointer border-b p-4 transition-colors"
					transition:fade
				>
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0">
							<IconComponent size={16} />
						</div>
						<div class="flex-1">
							<p class="text-base-content text-sm">
								{generateMessage(notification)}
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
		{#if groupedNotifications.length > 0}
			<div class="p-3">
				<button class="btn btn-ghost btn-sm w-full text-xs" onclick={() => (isOpen = false)}>
					Fermer
				</button>
			</div>
		{/if}
	{/snippet}
</PortalDropdown>

<script lang="ts">
	import { NotificationUtils } from "$lib/utils/notificationUtils";
	import { Bell, FileText, MessageCircle, MessageSquare, X } from "lucide-svelte";
	import { fade } from "svelte/transition";
	import * as Drawer from "$lib/components/ui/drawer";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	let isOpen = $state(false);

	// Utiliser l'utilitaire pour récupérer les notifications groupées
	let groupedNotifications = $derived(NotificationUtils.getGroupedActivity(50));

	function toggleNotifications() {
		isOpen = !isOpen;
		if (isOpen && NotificationUtils.getUnreadCount() > 0) {
			NotificationUtils.handleNotificationOpen();
		}
	}

	function closeNotifications() {
		isOpen = false;
	}

	function formatRelativeTime(dateString: string): string {
		return NotificationUtils.formatRelativeTime(dateString);
	}

	function generateMessage(notification: any): string {
		return NotificationUtils.generateMessage(notification);
	}

	function getNotificationType(notification: any): "log" | "message" | "grouped" {
		return NotificationUtils.getNotificationType(notification);
	}
</script>

<div class="flex flex-col items-center {className}">
	<!-- Bouton de notification -->
	<button
		class="btn btn-ghost btn-circle relative"
		onclick={toggleNotifications}
		aria-label="Notifications"
	>
		<Bell size={20} />
		{#if NotificationUtils.getUnreadCount() > 0}
			<div
				class="bg-error absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
				transition:fade
			>
				{NotificationUtils.getUnreadCount() > 9 ? "9+" : NotificationUtils.getUnreadCount()}
			</div>
		{/if}
	</button>
</div>

<!-- Drawer pour les notifications -->
<Drawer.Root bind:open={isOpen} direction="bottom">
	<Drawer.Content
		class="bg-base-100 h-3/4  max-h-[calc(100vh-4rem)] flex-col"
		data-theme="my-corporate"
	>
		<Drawer.Header class="bg-base-100 border-base-300 border-b pb-2">
			<div class="flex items-center justify-between">
				<Drawer.Title class="text-base-content text-lg font-semibold">Notifications</Drawer.Title>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={closeNotifications}>
					<X size={16} />
				</button>
			</div>
		</Drawer.Header>

		<!-- Contenu des notifications -->
		<div class="flex-1 overflow-y-auto">
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
					<div
						class="border-base-300 hover:bg-base-200 cursor-pointer border-b p-4 transition-colors"
						transition:fade
					>
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0">
								{#if getNotificationType(notification) === "grouped"}
									<div class="bg-primary/10 text-primary rounded-full p-2">
										<MessageSquare size={16} />
									</div>
								{:else if getNotificationType(notification) === "log"}
									<div class="bg-info/10 text-info rounded-full p-2">
										<FileText size={16} />
									</div>
								{:else}
									<div class="bg-success/10 text-success rounded-full p-2">
										<MessageCircle size={16} />
									</div>
								{/if}
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
		</div>

		<!-- Footer -->
		{#if groupedNotifications.length > 0}
			<div class="border-base-300 border-t p-3">
				<button class="btn btn-ghost btn-sm w-full text-xs" onclick={closeNotifications}>
					Fermer
				</button>
			</div>
		{/if}
	</Drawer.Content>
</Drawer.Root>

<script lang="ts">
	import { notificationSystem } from "$lib/shared/notificationSystem.svelte";
	import { Bell, X } from "lucide-svelte";
	import { fade } from "svelte/transition";
	import * as Drawer from "$lib/components/ui/drawer";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	let isOpen = $state(false);

	function toggleNotifications() {
		isOpen = !isOpen;
		if (isOpen && notificationSystem.unreadCount > 0) {
			notificationSystem.markAsRead();
		}
	}

	function closeNotifications() {
		isOpen = false;
	}

	function formatRelativeTime(dateString: string): string {
		return notificationSystem.formatRelativeTime(dateString);
	}

	function generateMessage(notification: any): string {
		// Déterminer si c'est un log ou un message
		if ("action" in notification) {
			return notificationSystem.generateLogMessage(notification);
		} else {
			return notificationSystem.generateMessageNotification(notification);
		}
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
		{#if notificationSystem.unreadCount > 0}
			<div
				class="bg-error absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
				transition:fade
			>
				{notificationSystem.unreadCount > 9 ? "9+" : notificationSystem.unreadCount}
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
			{#if !notificationSystem.isInitialized}
				<div class="p-4 text-center">
					<div class="loading loading-spinner loading-sm"></div>
					<p class="text-base-content/70 mt-2 text-sm">Chargement...</p>
				</div>
			{:else if notificationSystem.recentActivity.length === 0}
				<div class="p-8 text-center">
					<Bell size={32} class="text-base-content/50 mx-auto mb-2" />
					<p class="text-base-content/70 text-sm">Aucune notification</p>
				</div>
			{:else}
				{#each notificationSystem.recentActivity as notification (notification.id)}
					<div
						class="border-base-300 hover:bg-base-200 cursor-pointer border-b p-4 transition-colors"
						transition:fade
					>
						<div class="flex items-start gap-3">
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
		{#if notificationSystem.recentActivity.length > 0}
			<div class="border-base-300 border-t p-3">
				<button class="btn btn-ghost btn-sm w-full text-xs" onclick={closeNotifications}>
					Fermer
				</button>
			</div>
		{/if}
	</Drawer.Content>
</Drawer.Root>

<script lang="ts">
	import { onMount } from "svelte";
	import { notificationState } from "$lib/shared/states.svelte";
	import {
		markNotificationsAsRead,
		generateNotificationMessage
	} from "$lib/utils/notificationsAndLogs";
	import { Bell, X } from "lucide-svelte";
	import { fade, fly } from "svelte/transition";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	let isOpen = $state(false);

	function toggleNotifications() {
		isOpen = !isOpen;
		if (isOpen && notificationState.unreadCount > 0) {
			markNotificationsAsRead();
		}
	}

	function closeNotifications() {
		isOpen = false;
	}

	// Fermer les notifications en cliquant à l'extérieur
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest(".notification-container")) {
			closeNotifications();
		}
	}

	onMount(() => {
		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});

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

<div class="notification-container relative {className}">
	<!-- Bouton de notification -->
	<button
		class="btn btn-ghost btn-circle relative"
		onclick={toggleNotifications}
		aria-label="Notifications"
	>
		<Bell size={20} />
		{#if notificationState.unreadCount > 0}
			<div
				class="bg-error absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
				transition:fade
			>
				{notificationState.unreadCount > 9 ? "9+" : notificationState.unreadCount}
			</div>
		{/if}
	</button>

	<!-- Dropdown des notifications -->
	{#if isOpen}
		<div
			class="bg-base-100 border-base-300 absolute top-12 right-0 z-50 w-80 rounded-lg border shadow-xl"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<!-- Header -->
			<div class="border-base-300 flex items-center justify-between border-b p-4">
				<h3 class="text-lg font-semibold">Notifications</h3>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={closeNotifications}>
					<X size={16} />
				</button>
			</div>

			<!-- Liste des notifications -->
			<div class="max-h-96 overflow-y-auto">
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
			</div>

			<!-- Footer -->
			{#if notificationState.logs.length > 0}
				<div class="border-base-300 border-t p-3">
					<button class="btn btn-ghost btn-sm w-full text-xs" onclick={closeNotifications}>
						Fermer
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

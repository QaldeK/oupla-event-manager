<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";

	import { goto } from "$app/navigation";
	import { Calendar, CalendarSearch, Clock, Users } from "lucide-svelte";

	const eventsItems = [
		{
			label: "Événements",
			icon: Calendar,
			url: "/dashboard/events",
			filter: { status: "all" }
		},
		{
			label: "Programmés",
			icon: Clock,
			url: "/dashboard/events",
			filter: { status: "confirmed" }
		},
		{
			label: "En attentes",
			icon: Clock,
			url: "/dashboard/events",
			filter: { status: "pending" }
		},
		{
			label: "Sans date",
			icon: Calendar,
			url: "/dashboard/events",
			filter: { status: "eventsWithoutDate" }
		},
		{
			label: "Sans organisateur·ice",
			url: "/dashboard/events",
			icon: Users,
			filter: { status: "eventsWithoutOrganizer" }
		},
		{
			label: "Sondages en cours",
			icon: CalendarSearch,
			url: "/dashboard/events",
			filter: { status: "eventsWithSondage" }
		}
	];
	function getFilterUrl(filters: { status?: string }): string {
		const url = new URL("/dashboard/events", window.location.origin);
		Object.entries(filters).forEach(([key, value]) => {
			if (value) url.searchParams.set(key, value);
		});
		return url.toString();
	}

	function handleNavigation(item: (typeof eventsItems)[number]) {
		goto(`${item.url}?${new URLSearchParams(item.filter)}`);
	}
	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header />
	<Sidebar.Content>
		<Sidebar.Group />
		<Sidebar.GroupLabel>Evenements</Sidebar.GroupLabel>
		<Sidebar.GroupContent>
			<Sidebar.Menu>
				{#each eventsItems as item, index (index)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props })}
								<a
									href={`${item.url}?${new URLSearchParams(item.filter)}`}
									{...props}
									onclick={(e) => {
										e.preventDefault();
										handleNavigation(item);
									}}
								>
									<item.icon />
									<span>{item.label}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
		<Sidebar.Group />
	</Sidebar.Content>
	<Sidebar.Footer />
</Sidebar.Root>

<script lang="ts">
	import MenuContent from "$lib/components/MenuContent.svelte";

	interface Props {
		sidebarState: {
			isCompact: boolean;
		};
	}

	let { sidebarState }: Props = $props();
</script>

<aside
	class="bg-base-200 fixed top-0 left-0 z-30 h-full pt-24 transition-all duration-300 ease-in-out {sidebarState.isCompact
		? 'w-20'
		: 'w-72'}"
>
	<div class="flex h-full flex-col overflow-y-auto p-1">
		<MenuContent isCompact={sidebarState.isCompact} />
	</div>
</aside>

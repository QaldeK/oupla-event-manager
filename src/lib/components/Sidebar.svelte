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
	class="bg-base-100 fixed top-0 left-0 z-30 m-1 h-full pt-20 transition-all duration-300 ease-in-out {sidebarState.isCompact
		? 'w-20'
		: 'w-64'}"
>
	<div class="flex h-full overflow-y-auto p-1">
		<MenuContent isCompact={sidebarState.isCompact} />
	</div>
</aside>

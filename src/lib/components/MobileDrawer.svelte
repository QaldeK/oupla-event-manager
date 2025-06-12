<script lang="ts">
	import * as Drawer from "$lib/components/ui/drawer";
	import MenuContent from "$lib/components/MenuContent.svelte";

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen = $bindable(), onClose }: Props = $props();
</script>

<!-- Drawer shadcn pour mobile -->
<Drawer.Root bind:open={isOpen} direction="left">
	<Drawer.Content
		class="bg-base-200 fixed bottom-0 left-0 flex h-full w-80 flex-col"
		data-theme="my-corporate"
	>
		<Drawer.Header class="bg-base-200 pb-4">
			<Drawer.Title class="text-base-content text-lg font-semibold">Menu</Drawer.Title>
		</Drawer.Header>

		<div class="bg-base-200 flex-1 overflow-y-auto px-2 py-4">
			<MenuContent onItemClick={onClose} />
		</div>
	</Drawer.Content>
</Drawer.Root>

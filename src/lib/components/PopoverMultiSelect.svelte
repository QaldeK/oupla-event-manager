<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Popover from "$lib/components/ui/popover";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { clickOutside } from "$lib/actions/clickOutside";
	import { tooltip } from "$lib/actions/tooltip";

	import { cn } from "$lib/utils";

	import { ChevronsUpDown } from "lucide-svelte";

	let {
		items,
		selectedItems = $bindable(),
		toggleItem,
		triggerIcon: TriggerIcon,
		disabled = false,
		size = "default",
		label = "élément",
		labelEmpty = "Séléctionnez"
	} = $props<{
		items: any[]; // Les items peuvent être des objets
		selectedItems: any[];
		toggleItem: (item: any) => void;
		triggerIcon?: any;
		disabled?: boolean;
		size?: "default" | "sm";
		label?: string;
		labelEmpty?: string;
	}>();

	let open = $state(false);
	let selectedCount = $derived(selectedItems?.length || 0);
	let focusedIndex = $state(-1);
	let selectAll = $state(false);

	let element = $state(label);
	let placeholder = $state(labelEmpty);

	$effect(() => {
		if (selectedCount > 1 && label !== "") {
			element = label + "s";
		}
	});

	function handleSelectAll() {
		selectAll = !selectAll;
		items.forEach((item) => {
			if (selectAll && !selectedItems.includes(item)) {
				toggleItem(item);
			} else if (!selectAll && selectedItems.includes(item)) {
				toggleItem(item);
			}
		});
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!open) return;
		event.stopPropagation();
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
				break;
			case "ArrowUp":
				event.preventDefault();
				focusedIndex = Math.max(focusedIndex - 1, 0);
				break;
			case "Enter":
				event.preventDefault();
				if (focusedIndex >= 0 && focusedIndex < items.length) {
					toggleItem(items[focusedIndex]);
				}
				break;
			case "Escape":
				event.preventDefault();
				open = false;
				break;
		}
	}

	$effect(() => {
		if (open) {
			// Attendre que le DOM soit mis à jour
			setTimeout(() => {
				const content = document.querySelector('[role="dialog"]') as HTMLElement;
				if (content) content.focus();
			}, 0);
		} else {
			focusedIndex = -1;
		}
	});
</script>

<div use:clickOutside={() => (open = false)} class="relative h-8">
	<Popover.Root bind:open>
		<Popover.Trigger
			class={cn(
				" border-input bg-background ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring text-fluid-sm flex items-center justify-between rounded-md border px-3 py-2 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
				open && "ring-ring ring-2 ring-offset-2",
				size === "sm" && "h-8"
			)}
		>
			<span class="flex items-center gap-1 truncate">
				{#if TriggerIcon}
					<TriggerIcon />
					<Badge variant="default" class="ms-1 px-1.5">{selectedCount}</Badge>
				{:else if selectedCount === 0}
					{placeholder}
				{:else}
					{String(selectedCount)} {element}
				{/if}
			</span>
			<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Popover.Trigger>
		<Popover.Content class="w-[200px] p-0" onkeydown={handleKeyDown}>
			<div class="click-inside grid gap-1 p-2">
				{#if !disabled}
					<button
						class="text-fluid-sm text-muted-foreground hover:text-accent-foreground"
						onclick={handleSelectAll}
					>
						{selectAll ? "tout déselectionner" : "tout sélectionner"}
					</button>
				{/if}
				<ScrollArea class="max-h-80">
					{#each items as item (item)}
						<button
							type="button"
							class={cn(
								"group hover:bg-accent hover:text-accent-foreground text-fluid-sm flex w-full cursor-pointer space-x-2 rounded-sm p-1.5 focus:outline-hidden disabled:pointer-events-none",
								focusedIndex === items.indexOf(item) ? "bg-accent text-accent-foreground" : "",
								disabled && "cursor-not-allowed opacity-80"
							)}
							onclick={() => toggleItem(item)}
						>
							<Checkbox
								checked={selectedItems?.includes(item)}
								id={item.id}
								class="ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2"
							/>
							<label
								for={item}
								class={cn(
									"group-hover:text-accent-foreground cursor-pointer font-normal peer-disabled:opacity-70",
									disabled && "cursor-not-allowed"
								)}
							>
								{item}
							</label>
						</button>
					{/each}
					{#if disabled}
						<span
							class="text-fluid-sm text-muted-foreground"
							use:tooltip={{
								content:
									"seul·e l'organisateur·ice ou les gérant·es sont autorisé·es à effectuer des modifications"
							}}
						>
							Modifications non autorisée
						</span>
					{/if}
				</ScrollArea>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

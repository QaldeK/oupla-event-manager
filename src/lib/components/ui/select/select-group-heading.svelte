<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Select as SelectPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SelectPrimitive.GroupHeadingProps = $props();
</script>

<SelectPrimitive.GroupHeading
	bind:ref
	class={cn("text-fluid-sm py-1.5 pr-2 pl-8 font-semibold", className)}
	{...restProps}
/>

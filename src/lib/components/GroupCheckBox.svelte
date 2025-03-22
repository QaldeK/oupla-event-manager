<script>
	let {
		groupItems,
		eventDataGroup = $bindable(),
		classSpanLabel = 'text-fluid-sm font-medium',
		classLabel = ''
	} = $props();
</script>

<div class="flex flex-wrap items-center gap-3">
	{#each groupItems as item (item)}
		<label
			class="flex cursor-pointer items-center rounded-lg bg-gray-200 px-3 py-2 md:bg-transparent md:hover:bg-gray-200 {classLabel}"
			><input
				type="checkbox"
				class="peer checkbox checkbox-primary shadow-sm"
				bind:group={eventDataGroup}
				value={item}
			/>
			<span class="ml-2 cursor-pointer text-gray-600 {classSpanLabel}">{item}</span>
		</label>
	{/each}
</div>

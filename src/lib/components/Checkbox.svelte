<!-- USAGE
  <script>
    	const handleCheckToggle = (formKey, id) => {
		if ($form[formKey].includes(id)) {
			$form[formKey] = $form[formKey].filter((item) => item !== id);
		} else {
			$form[formKey] = [...$form[formKey], id];
		}
	};

  </script>

  <Checkbox
    id={room.id}
    label={room.value}
    checked={$form.rooms.includes(room.id)}
    onToggle={() => {
      handleCheckToggle('rooms', room.id);
    }}
  />

  OR without onToggle

  <Checkbox label="Tout public" id="public" bind:checked={$form.age_no_restriction} />

-->

<script>
	import { breakpoint } from "$lib/shared/breakpoints";

	import { CircleHelp } from "lucide-svelte";

	let {
		label = "",
		id,
		checked = $bindable(false),
		onToggle = () => {},
		help = "",
		classLabel = "text-fluid-sm font-medium"
	} = $props();
	let helpContent = $state("");

	$effect(() => {
		if ($breakpoint === "sm") {
			helpContent = "";
		} else {
			helpContent = help;
		}
	});
</script>

<label
	for={id}
	class="flex w-full cursor-pointer items-center rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-200 md:bg-transparent"
>
	<!-- XXX : onchange → ontoggle -->
	<input
		type="checkbox"
		class="peer checkbox checkbox-primary"
		{id}
		bind:checked
		ontoggle={() => onToggle}
	/>
	<span class="ml-2 cursor-pointer text-gray-600 {classLabel}">{label}</span>
	{#if helpContent !== ""}
		<div class="tooltip" data-tip={helpContent}>
			<CircleHelp size="14" class="ms-2 mb-2 text-gray-700" />
		</div>
	{/if}
</label>

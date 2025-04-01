<script lang="ts">
	import PadEditor from '$lib/components/pad/PadEditor.svelte';
	import { goto } from '$app/navigation';

	export let data;
	const padId = data.pad.id;

	function goBackToPads() {
		goto('/dashboard/pads');
	}
</script>

<div class="container mx-auto px-4">
	<div class="mb-4">
		<button onclick={goBackToPads} class="btn btn-sm btn-ghost"> ← Retour aux pads </button>
	</div>

	<PadEditor {padId} />
</div>

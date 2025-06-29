<script lang="ts">
	// FIXIT : l'enregistrement + fermeture ne fait pas le goBackToPads. Enregistre t il de maniere sure ?
	import PageBlockEditor from "$lib/components/public/PageBlockEditor.svelte";
	import { goto } from "$app/navigation";
	import { SquareArrowLeft } from "lucide-svelte";
	export let data;
	const docId = data.pad.id as string;

	function goBackToPads() {
		goto("/dashboard/site_pages");
	}
</script>

<div class="mb-4">
	<button onclick={goBackToPads} class="btn btn-square btn-ghost"> <SquareArrowLeft /> </button>
</div>

<PageBlockEditor {docId} />

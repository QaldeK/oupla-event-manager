<script lang="ts">
	import PageBlockEditor from '$lib/components/public/PageBlockEditor.svelte';
	import { goto } from '$app/navigation';
	import { SquareArrowLeft } from 'lucide-svelte';
	export let data;
	const docId = data.pad.id as string;

	function goBackToPads() {
		goto('/dashboard/site_pages');
	}
</script>

<div class="container mx-auto px-4">
	<div class="mb-4">
		<button onclick={goBackToPads} class="btn btn-square btn-ghost"> <SquareArrowLeft /> </button>
	</div>

	<PageBlockEditor {docId} />
</div>

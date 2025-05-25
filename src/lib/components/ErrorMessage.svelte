<script lang="ts">
	import { TriangleAlert } from "lucide-svelte";
	interface Props {
		error?: string;
	}

	let { error }: Props = $props();
</script>

{#if error}
	<div class="text-error p-2">
		<TriangleAlert class="me-1 inline h-4 w-4 align-middle" />
		<span class="text-fluid-sm align-middle italic">{error}</span>
	</div>
{/if}

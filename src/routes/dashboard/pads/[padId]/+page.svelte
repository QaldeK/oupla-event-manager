<script lang="ts">
	import PadEditor from '../components/PadEditor.svelte';
	import { SquareArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';

	import { goto } from '$app/navigation';

	export let data: PageData;
</script>

<div class="container mx-auto px-4 py-4">
	<div class="mb-4">
		<button onclick={() => goto('/dashboard/pads')} class="btn btn-square btn-ghost">
			<SquareArrowLeft size={24} />
		</button>
	</div>

	{#key data.pad.id}
		<PadEditor docId={data.pad.id} initialEditMode={false} />
	{/key}
</div>

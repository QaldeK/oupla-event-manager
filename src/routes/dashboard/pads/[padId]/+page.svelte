<script lang="ts">
	import PadEditor from "../components/PadEditor.svelte";
	import type { PageData } from "./$types";

	export let data: PageData;
</script>

<div class="container mx-auto md:p-4" style="height: calc(100dvh - 100px);">
	{#key data.pad.id}
		<PadEditor docId={data.pad.id} initialEditMode={false} />
	{/key}
</div>

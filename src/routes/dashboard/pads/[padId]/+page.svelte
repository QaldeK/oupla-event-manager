<script lang="ts">
	import PadEditor from "../components/PadEditor.svelte";
	import { SquareArrowLeft } from "lucide-svelte";
	import type { PageData } from "./$types";

	import { goto } from "$app/navigation";

	export let data: PageData;
</script>

<div class="container mx-auto md:p-4" style="height: calc(100dvh - 100px);">
	{#key data.pad.id}
		<PadEditor docId={data.pad.id} initialEditMode={false} />
	{/key}
</div>

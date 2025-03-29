<script lang="ts">
  import PadEditor from '$lib/components/pad/PadEditor.svelte';
  import { goto } from '$app/navigation';
  import type { PadResponse } from '$lib/types/pad/pad.types';
  
  export let data;
  
  const pad: PadResponse = data.pad;
  const initialContentUrl = data.initialContentUrl;

  function goBackToPads() {
    goto('/dashboard/pads');
  }
</script>

<div class="container mx-auto px-4 py-6">
  <div class="mb-4">
    <button onclick={goBackToPads} class="btn btn-sm btn-ghost">
      ← Retour aux pads
    </button>
  </div>
  
  <PadEditor 
    padId={pad.id} 
    initialContentUrl={initialContentUrl} 
    padTitle={pad.title}
  />
</div>
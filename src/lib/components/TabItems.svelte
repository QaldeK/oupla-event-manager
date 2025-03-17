<script>
    import {getContext, onMount} from "svelte";

    export let title = "";
    export let icon = "";
    export let value = Symbol();

    const items = getContext("items");
    const activeTabValue = getContext("activeTabValue");

    onMount(() => {
        if(!$activeTabValue) {
            $activeTabValue = value;
        }

        const item = {title, value, icon};
        $items = [...$items, item];
        return () => {
            $items = $items.splice($items.indexOf(item), 1);
        };
    });

</script>


{#if $activeTabValue === value}
    <div class="tabitem">
      <slot />
    </div>
{/if}

<style>
   .tabitem {
    margin-top: 0px !important;
    padding: 1rem ;
    border: 1px solid #94a3b8;
    border-top: none;
    border-bottom-left-radius: 0.25rem;
    border-bottom-right-radius: 0.25rem;
  }
</style>
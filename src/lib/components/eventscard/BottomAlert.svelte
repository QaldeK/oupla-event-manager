<script>
	// TODO conflict in cards
	export let thisEvent;
</script>

{#if thisEvent.conflictingEvents.lenght > 0}
	<div class="relative py-3 px-4 text-red-700 bg-red-100" role="alert">
		<span class="block sm:inline">
			Cet événement a lieu en même temps que l·es événement·s suivant·s (mêmes salles) :
		</span>
		{#each thisEvent.conflictingEvents as conflictingEvent, index}
			<span class="font-bold">
				{index > 0 ? ', ' : null}{conflictingEvent}
			</span>
		{/each}
	</div>
{/if}

{#if thisEvent.possibleConflicts.lenght > 0}
	<div class="relative py-3 px-4 text-amber-900 bg-amber-100" role="alert">
		<span class="block sm:inline">
			Cet événement a lieu en même temps que l·es événement·s suivant·s (salles différentes) :
		</span>
		{#each thisEvent.possibleConflicts as possibleConflicts, index}
			<span key={index} class="font-bold">
				{index > 0 ? ', ' : null}{possibleConflicts}
			</span>
		{/each}
	</div>
{/if}

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { ButtonSize, ButtonVariant } from '$lib/components/ui/button/button.svelte';
	import { tooltip } from '$lib/utils';

	import { BadgeHelp, Minus, ThumbsDown, ThumbsUp } from 'lucide-svelte';

	interface Props {
		value?: 'oui' | 'non' | 'peut-être' | '';
		onChange?: (value: 'oui' | 'non' | 'peut-être' | '') => void;
		size?: ButtonSize;
		variant?: ButtonVariant;
	}

	let { value, onChange, size = 'icon_md', variant = 'icon' }: Props = $props();

	const getActiveVariant = (buttonValue: string) => {
		if (value === buttonValue) {
			switch (buttonValue) {
				case 'oui':
					return 'bg-green-500/20';
				case 'peut-être':
					return 'bg-amber-500/20';
				case 'non':
					return 'bg-destructive/20';
				default:
					return variant;
			}
		}
		return variant;
	};
</script>

<div class="bg-background inline-flex items-center rounded-md border">
	<div use:tooltip={{ content: 'Je serais présent·e' }}>
		<Button
			{size}
			variant="icon"
			onclick={() => {
				value = 'oui';
				onChange?.(value);
			}}
			aria-label="Oui"
			class="rounded-e-none border-e {getActiveVariant('oui')}"
		>
			<ThumbsUp />
		</Button>
	</div>

	<div use:tooltip={{ content: 'Je ne serais pas présent·e' }}>
		<Button
			{size}
			variant="icon"
			onclick={() => {
				value = 'non';
				onChange?.(value);
			}}
			aria-label="Non"
			class="rounded-e-none border-e {getActiveVariant('non')}"
		>
			<ThumbsDown />
		</Button>
	</div>

	<div use:tooltip={{ content: "Je ne suis pas certain·e d'être présent·e" }}>
		<Button
			{size}
			variant="icon"
			onclick={() => {
				value = 'peut-être';
				onChange?.(value);
			}}
			aria-label="Peut-être"
			class="rounded-none border-e {getActiveVariant('peut-être')}"
		>
			<BadgeHelp />
		</Button>
	</div>

	{#if value}
		<div use:tooltip={{ content: 'Supprimer ma réponse' }}>
			<Button
				{size}
				{variant}
				onclick={() => {
					value = '';
					onChange?.(value);
				}}
				aria-label="Supprimer ma réponse"
				class="rounded-s-none"
			>
				<Minus class="h-4 w-4" />
			</Button>
		</div>
	{/if}
</div>

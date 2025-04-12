<script lang="ts">
	import { cn } from '$lib/utils';
	import { type VariantProps, tv } from 'tailwind-variants';

	import type { Snippet } from 'svelte';

	import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-svelte';

	const infoVariants = tv({
		base: 'relative mb-4 flex items-center gap-4 rounded-md border p-2 md:px-4 align-baseline',
		variants: {
			variant: {
				info: 'bg-info/20 border-info/70',
				warning: 'bg-warning/20 border-warning/70',
				danger: 'bg-error/20 border-error/70',
				success: 'bg-success/20 border-success/70',
				outline: 'border-neutral'
			}
		},
		defaultVariants: {
			variant: 'info'
		}
	});

	type InfoVariant = VariantProps<typeof infoVariants>['variant'];

	interface Props {
		variant?: InfoVariant;
		hideIcon?: boolean;
		class?: string;
		children: Snippet;
	}

	let { variant = 'info', hideIcon = false, class: className, children }: Props = $props();

	const getIcon = () => {
		if (hideIcon) return null;

		switch (variant) {
			case 'warning':
				return AlertTriangle;
			case 'danger':
				return AlertOctagon;
			case 'success':
				return CheckCircle2;
			case 'outline':
				return null;
			default:
				return Info;
		}
	};

	const getIconColor = () => {
		switch (variant) {
			case 'warning':
				return 'text-warning';
			case 'danger':
				return 'text-error';
			case 'success':
				return 'text-succes';
			case 'outline':
				return 'text-neutral';
			default:
				return 'text-info';
		}
	};

	const Icon = getIcon();
</script>

<div class={cn(infoVariants({ variant }), className)}>
	{#if Icon}
		<div class="align-top {cn('', getIconColor())}">
			{#if variant === 'warning'}
				<AlertTriangle size={24} />
			{:else if variant === 'danger'}
				<AlertOctagon size={24} />
			{:else if variant === 'success'}
				<CheckCircle2 size={24} />
			{:else}
				<Info size={24} />
			{/if}
		</div>
		<div class="w-full">
			{@render children()}
		</div>
	{:else}
		<div class="w-full">
			{@render children()}
		</div>
	{/if}
</div>

<script lang="ts">
	import { cn } from '$lib/utils';
	import { type VariantProps, tv } from 'tailwind-variants';

	import type { Snippet } from 'svelte';

	import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-svelte';

	const infoVariants = tv({
		base: 'relative mb-4 flex items-center gap-4 rounded-md border p-2 md:px-4 align-baseline',
		variants: {
			variant: {
				info: 'bg-blue-100 border-blue-300 text-gray-700',
				warning: 'bg-amber-100 border-amber-300 text-gray-700',
				danger: 'bg-red-100 border-red-300 text-gray-700',
				success: 'bg-green-100 border-green-300 text-gray-700',
				outline: 'border-gray-300 text-gray-700'
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
				return 'text-amber-800';
			case 'danger':
				return 'text-red-800';
			case 'success':
				return 'text-green-800';
			case 'outline':
				return 'text-gray-800';
			default:
				return 'text-blue-800';
		}
	};

	const Icon = getIcon();
</script>

<div class={cn(infoVariants({ variant }), className)}>
	{#if Icon}
		<div class={cn('absolute top-0 left-0 ms-3 mt-4', getIconColor())}>
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
		<div class="w-full ps-10">
			{@render children()}
		</div>
	{:else}
		<div class="w-full">
			{@render children()}
		</div>
	{/if}
</div>

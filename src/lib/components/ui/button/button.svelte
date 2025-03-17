<script lang="ts" module>
	import type { WithElementRef } from 'bits-ui';
	import { type VariantProps, tv } from 'tailwind-variants';

	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export const buttonVariants = tv({
		base: 'cursor-pointer ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-fluid-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline: 'border-input bg-background hover:bg-accent hover:text-accent-foreground border',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
				icon: '[&_svg]:size-5 [&_svg]:shrink-0 ',
				success: 'bg-green-600 text-white hover:bg-green-700',
				slate: 'text-slate-800 hover:text-slate-900 bg-slate-200 hover:bg-slate-300',
				gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
				warning: 'text-white bg-amber-500 hover:bg-amber-600'
			},
			size: {
				default: 'h-10 px-4 py-2',
				badge: 'h-6 md:h-5 px-1.5 py-0.5 text-fluid-sm rounded-full',
				xxs: 'h-7 rounded-md px-1.5',
				xs: 'h-8 rounded-md px-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
				icon_sm: 'h-8 w-8',
				icon_md: 'h-9 w-9',
				icon_xs: 'h-7 w-7'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a bind:this={ref} class={cn(buttonVariants({ variant, size, className }))} {href} {...restProps}>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		class={cn(buttonVariants({ variant, size, className }))}
		{type}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}

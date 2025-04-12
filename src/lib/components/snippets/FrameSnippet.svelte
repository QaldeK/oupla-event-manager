// TODO : To USE ?

{#snippet FrameSnippet(
	title = '',
	class_frame = '',
	class_title = 'bg-gray-100 text-fluid-sm',
	children
)}
	<div
		id="info"
		class="relative my-2 rounded-xl border border-gray-300 p-6 shadow {class_frame
			? class_frame
			: ''}"
	>
		{#if title}
			<p
				class="{class_title
					? class_title
					: ''} absolute -top-3 left-2.5 px-2 font-semibold text-gray-700"
			>
				{title}
			</p>
		{/if}
		{@render children?.()}
	</div>
{/snippet}

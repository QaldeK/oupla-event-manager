// TODO : To USE ?

{#snippet FrameSnippet(title = '', class_frame = '', class_title = 'bg-gray-100 text-fluid-sm', children)}
	<div
		id="info"
		class="relative rounded-xl border border-gray-300 shadow p-6 my-2 {class_frame
			? class_frame
			: ''}"
	>
		{#if title}
			<p
				class="{class_title
					? class_title
					: ''} px-2 absolute left-2.5 -top-3 font-semibold text-gray-700"
			>
				{title}
			</p>
		{/if}
		{@render children?.()}
	</div>
{/snippet}

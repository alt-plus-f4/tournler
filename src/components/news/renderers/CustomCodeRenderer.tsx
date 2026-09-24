'use client';

interface CustomCodeRendererProps {
	data: { code?: string };
}

function CustomCodeRenderer({ data }: CustomCodeRendererProps) {
	return (
		<pre className='not-prose my-6 overflow-x-auto rounded-md border border-border bg-black p-4'>
			<code className='font-mono text-sm leading-relaxed text-neutral-100'>{data.code}</code>
		</pre>
	);
}

export default CustomCodeRenderer;

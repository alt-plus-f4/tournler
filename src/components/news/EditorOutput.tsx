'use client';

import CustomCodeRenderer from '@/components/news/renderers/CustomCodeRenderer';
import CustomImageRenderer from '@/components/news/renderers/CustomImageRenderer';
import CustomEmbedRenderer from '@/components/news/renderers/CustomEmbedRenderer';
import CustomLinkRenderer from '@/components/news/renderers/CustomLinkRenderer';
import { FC } from 'react';
import dynamic from 'next/dynamic';

const Output = dynamic(async () => (await import('editorjs-react-renderer')).default, { ssr: false });

interface EditorOutputProps {
	content: unknown;
}

// Keys are EditorJS block types, lowercased (the renderer matches on type.toLowerCase()).
const renderers = {
	image: CustomImageRenderer,
	code: CustomCodeRenderer,
	embed: CustomEmbedRenderer,
	linktool: CustomLinkRenderer,
};

// The renderer ships inline styles for some blocks; blank them so the prose column sets the type.
const style = {
	paragraph: {},
	header: {},
	list: { container: {}, listItem: {} },
	table: { table: {}, tr: {}, th: {}, td: {} },
};

const EditorOutput: FC<EditorOutputProps> = ({ content }) => {
	return (
		<Output style={style} renderers={renderers as any} data={content as any} />
	);
};

export default EditorOutput;

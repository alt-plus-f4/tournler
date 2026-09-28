import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = [
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: { '@next/next': nextPlugin },
		rules: { ...nextPlugin.configs.recommended.rules },
	},
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	eslintConfigPrettier,
];

export default eslintConfig;

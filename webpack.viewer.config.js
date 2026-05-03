const path = require('path');

module.exports = {
	mode: 'production',
	target: 'web',
	stats: 'errors-only',
	entry: './src/viewer.ts',
	output: {
		filename: 'viewer.js',
		path: path.resolve(__dirname, 'dist'),
	},
	resolve: {
		extensions: ['.js', '.ts', '.tsx'],
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
};

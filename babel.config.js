// JSX is the only syntax that needs compiling: everything else in src/ already
// runs in the browsers WordPress supports, and consumers' wp-scripts builds do
// not transpile node_modules. `cjs` is for consumers' Jest, which does; `test`
// is this repo's own Jest.
module.exports = ( api ) => ( {
	presets: [ [ '@babel/preset-react', { runtime: 'automatic' } ] ],
	plugins: api.env( [ 'cjs', 'test' ] )
		? [ '@babel/plugin-transform-modules-commonjs' ]
		: [],
} );

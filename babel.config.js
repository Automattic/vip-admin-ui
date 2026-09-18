// JSX is the only syntax that needs compiling: everything else in src/ already
// runs in the browsers WordPress supports, and consumers' wp-scripts builds do
// not transpile node_modules. `cjs` is for consumers' Jest, which does.
module.exports = ( api ) => ( {
	presets: [ [ '@babel/preset-react', { runtime: 'automatic' } ] ],
	plugins: api.env( 'cjs' )
		? [ '@babel/plugin-transform-modules-commonjs' ]
		: [],
} );

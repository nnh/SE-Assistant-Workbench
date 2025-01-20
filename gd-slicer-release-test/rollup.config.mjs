import cleanup from 'rollup-plugin-cleanup';
import license from 'rollup-plugin-license';
import prettier from 'rollup-plugin-prettier';
import typescript from 'rollup-plugin-typescript2';
import { fileURLToPath } from 'url';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    cleanup({ comments: 'none', extensions: ['.ts'] }),
    license({
      banner: {
        content: {
          file: fileURLToPath(new URL('license-header.txt', import.meta.url)),
        },
      },
    }),
    typescript(),
    prettier({ parser: 'typescript' }),
  ],
  context: 'this',
};

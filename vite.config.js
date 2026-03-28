/**
 * Vite Configuration
 * Production-ready build setup with optimization
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import compression from 'vite-plugin-compression';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        compression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'gzip',
            ext: '.gz',
        }),
        compression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'brotliCompress',
            ext: '.br',
        }),
    ],

    server: {
        host: '127.0.0.1',
        port: 3000,
        open: false,
        strictPort: true,
        compress: true,
        cors: true,
        hmr: {
            protocol: 'ws',
            host: '127.0.0.1',
            port: 3000,
        },
    },

    build: {
        outDir: 'dist',
        assetsDir: 'assets',

        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                booking: resolve(__dirname, 'booking.html'),
                adminLogin: resolve(__dirname, 'admin-login.html'),
                adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
                userDashboard: resolve(__dirname, 'user-dashboard.html'),
            },
        },

        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
            mangle: {
                toplevel: true,
                properties: {
                    regex: /^_/,
                },
            },
        },

        // Optimize CSS
        cssCodeSplit: true,

        // Optimize assets
        assetsInlineLimit: 4096,

        // Generate source maps for production debugging
        sourcemap: 'hidden',

        // Reporting
        reportCompressedSize: true,
        chunkSizeWarningLimit: 500,

        // Performance
        target: 'es2020',
        modulePreload: {
            polyfill: true,
        },
    },

    // CSS Optimization
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `
          @import "variables.scss";
        `,
            },
        },
        postcss: {
            plugins: [
                {
                    postcssPlugin: 'inline-svg',
                    Once(root) {
                        root.walkDecls((decl) => {
                            if (decl.value.includes('svg(')) {
                                // Handle inline SVGs
                            }
                        });
                    },
                },
            ],
        },
    },

    // Optimization
    optimizeDeps: {
        include: [],
        exclude: ['node_modules'],
    },

    // Environment variables
    define: {
        __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
        __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
    },

    // Resolve
    resolve: {
        alias: {
            '@': '/src',
            '@components': '/src/components',
            '@utils': '/src/utils',
            '@styles': '/src/styles',
            '@assets': '/src/assets',
        },
        extensions: ['.js', '.json', '.ts'],
    },

    // Preview server (serve build locally)
    preview: {
        host: '127.0.0.1',
        port: 3001,
        strictPort: false,
    },
});

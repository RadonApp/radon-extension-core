var fs = require('fs');
var path = require('path');
var uuid = require('uuid');
var webpack = require('webpack');


module.exports = function(config) {
    var phantomStoragePath = path.resolve('.phantomjs/' + uuid.v4());

    config.set({
        basePath: './',
        frameworks: ['jasmine'],

        files: [
            'node_modules/@babel/polyfill/dist/polyfill.js',
            'node_modules/jasmine-promises/dist/jasmine-promises.js',

            'tests/init.js',

            {pattern: 'tests/*_tests.js', watched: false},
            {pattern: 'tests/**/*_tests.js', watched: false}
        ],

        preprocessors: {
            'tests/init.js': ['webpack', 'sourcemap'],

            'tests/*_tests.js': ['webpack', 'sourcemap'],
            'tests/**/*_tests.js': ['webpack', 'sourcemap']
        },

        reporters: [
            'progress',

            'coverage',
            'html'
        ],

        coverageReporter: {
            dir: 'build/coverage',

            reporters: [
                { type: 'html', subdir: '.' },
                { type: 'lcovonly', subdir: '.' },
            ]
        },

        htmlReporter: {
            outputDir: 'build/test',

            focusOnFailures: true,
            preserveDescribeNesting: true,
        },

        customLaunchers: {
            'PhantomJS_D2': {
                base: 'PhantomJS',

                flags: [
                    '--local-storage-path=' + phantomStoragePath,
                    '--local-storage-quota=32768',

                    '--offline-storage-path=' + phantomStoragePath,
                    '--offline-storage-quota=32768'
                ],

                options: {
                    settings: {
                        webSecurityEnabled: false
                    }
                }
            }
        },

        webpack: {
            devtool: 'inline-source-map',

            module: {
                rules: [
                    {
                        test: /\.js$/,
                        include: path.resolve('src/'),

                        use: {
                            loader: 'babel-loader',
                            options: {
                                plugins: ["istanbul"]
                            }
                        }
                    },
                    {
                        test: /\.js$/,
                        include: [
                            fs.realpathSync(path.resolve(__dirname, 'node_modules/neon-extension-framework/src')),
                            fs.realpathSync(path.resolve(__dirname, 'node_modules/foundation-sites')),
                            fs.realpathSync(path.resolve(__dirname, 'node_modules/lodash-es')),
                            fs.realpathSync(path.resolve('tests/'))
                        ],

                        use: {
                            loader: 'babel-loader',
                        }
                    },
                    {
                        test: /\.s?css$/,
                        use: ['file-loader']
                    }
                ]
            },

            resolve: {
                alias: {
                    'neon-extension-framework': fs.realpathSync(path.resolve(__dirname, 'node_modules/neon-extension-framework/src')),
                    'neon-extension-core': fs.realpathSync(path.resolve(__dirname, 'src/'))
                },

                modules: [
                    fs.realpathSync(path.resolve(__dirname, 'node_modules')),
                    'node_modules'
                ]
            },

            plugins: [
                new webpack.DefinePlugin({
                    'neon.browser': '{}',
                    'neon.manifests': '{}',

                    'process.env': {
                        'NODE_ENV': '"development"',
                        'TEST': 'true'
                    }
                }),
            ]
        },

        webpackMiddleware: {
            stats: 'errors-only'
        }
    });
};

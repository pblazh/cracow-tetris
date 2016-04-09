'use strict';

module.exports = function (grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);
    grunt.initConfig({
        // configurable paths
        app: {
            src: 'src',
            dst: 'dst'
        },
        watch: {
            scss: {
                files: ['<%= app.src %>/sass/{,*/}*.scss'],
                tasks: ['sass']
            },
            css: {
                files: ['<%= app.src %>/css/{,*/}*.css'],
                tasks: ['copy:css', 'autoprefixer']
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: [
                    '<%= app.src %>/*.html',
                    '.tmp/css/{,*/}*.css',
                    '{.tmp,<%= app.src %>}/js/{,*/}*.js',
                    '<%= app.src %>/assets/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
                ]
            },
        },
        connect: {
            options: {
                port: 9000,
                livereload: 35729,
                // change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    open: true,
                    base: [
                        '.tmp',
                        '<%= app.src %>'
                    ]
                }
            },
            dist: {
                options: {
                    open: true,
                    base: '<%= app.dst %>',
                    livereload: false
                }
            }
        },
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= app.dst %>/*',
                        '!<%= app.dst %>/.git*'
                    ]
                }]
            },
            server: '.tmp'
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                'Gruntfile.js',
                '<%= app.src %>/js/{,*/}*.js',
                '!<%= app.src %>/js/vendor/*',
                'test/spec/{,*/}*.js'
            ]
        },
        autoprefixer: {
            options: {
                browsers: ['last 1 version']
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '.tmp/css/',
                    src: '{,*/}*.css',
                    dest: '.tmp/css/'
                }]
            }
        },
        requirejs: {
            compile: {
                options: {
                    optimize: "none",
                    baseUrl: '<%= app.src %>/js/',
                    mainConfigFile: '<%= app.src %>/js/config.js',
                    name: '../bower_components/almond/almond',
                    //name: '<%= app.src %>/../bower_components/requirejs/require.js',

                    include: [ 'main.js' ],
                    out: '<%= app.dst %>/js/main.js'
                }
            }
        },
        'string-replace': {
            inline: {
                files: {
                    '<%= app.dst %>/index.html': '<%= app.dst %>/index.html',
                },
                options: {
                    replacements: [{
                        pattern: "<script data-main='js/main' src='bower_components/requirejs/require.js'></script>",
                        replacement: "<script src='js/main.js'></script>",
                    }]
                }
            }
        },
        sass: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    '<%= app.src %>/css/main.css': '<%= app.src %>/sass/main.scss'
                }
            }
        },
        // Put files not handled in other tasks here
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= app.src %>',
                    dest: '<%= app.dst %>',
                    src: [
                        '*.html',
                        '*.{ico,png,txt}',
                        'assets/*.{png,jpg,webp,gif}',
                        'css/*.css',
                    ]
                }]
            },
            css: {
                expand: true,
                dot: true,
                cwd: '.tmp/css/',
                dest: '<%= app.dst %>/css',
                src: '{,*/}*.css'
            }
        },
        concurrent: {
            server: [
                'copy:css'
            ],
            test: [
                'copy:css'
            ],
            dist: [
                'copy:css',
            ]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-string-replace');

    grunt.registerTask('server', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'concurrent:server',
            'autoprefixer',
            'connect:livereload',
            'watch'
        ]);
    });

    grunt.registerTask('build', [
        'clean:dist',
        'requirejs',
        'concurrent:dist',
        'sass',
        'autoprefixer',
        'copy:dist',
        'string-replace',
    ]);

    grunt.registerTask('default', [
        //'jshint',
        'build'
    ]);
};

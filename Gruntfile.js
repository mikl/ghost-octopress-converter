/*
 * ghost-octopress-converter
 * https://github.com/mikl/ghost-octopress-converter
 *
 * Copyright (c) 2014 Mikkel Hoegh
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    ghost_octopress_converter: {
      options: {

        // This is the standard address if you run npm start. Change it,
        // if you want to post to a different Ghost installation.
        url: 'http://127.0.0.1:2368/',

        // The path where to send the posts for creation, will normally
        // not need modification.
        apiPath: 'ghost/api/v0.1/posts',

        // If you want, you can define your Ghost credentials here. If not
        // defined, you will be prompted to enter them before the import
        // can proceed.
        //username: 'ghostadmin',
        //password: 'changeme',

      }
    }
  });

  grunt.loadTasks('tasks');
};

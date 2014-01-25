/*
 * ghost-octopress-converter
 * https://github.com/mikl/ghost-octopress-converter
 *
 * Copyright (c) 2013 Mikkel Hoegh
 * Licensed under the MIT license.
 */

'use strict';

var async = require('async');
var fs = require('fs');
var path = require('path');
var util = require('util');
var uuid = require('uuid');
var yamlFront = require('yaml-front-matter');

// Used to strip the date from the file name, in case there's not a slug
// in the metadata, and we're falling back on the file name.
var fileNameDateMatcher = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-/;
// And the same for the file extention.
var fileNameExtensionMatcher = /\.[\w]+$/;

// Clean the string up, since the YAML might have contained unwanted whitespace.
function cleanString(inputString) {
  if (!inputString) {
    return '';
  }

  // String.trim() is not multiline, so we need do our own to get rid
  // of extra linebreaks.
  return inputString.replace(/^\s+|\s+$/gm, '');
}

// Expand homedir and resolve the path.
function expandPath(inputPath) {
  var outputPath = inputPath.replace('~', process.env.HOME);

  outputPath = path.resolve(outputPath);

  return outputPath;
}

module.exports = function(grunt) {

  grunt.registerTask('ghost_octopress_converter', 'For converting your Octopress blog to Ghost.', function (octoPath, outFile) {
    var options = this.options();

    // Expand homedirs, etc.
    if (octoPath) {
      octoPath = expandPath(octoPath);
    }

    // Default export file.
    if (!outFile) {
      outFile = 'GhostData.json';
    }
    else {
      outFile = expandPath(outFile);
    }

    // We need valid paths for Ghost and Octopress to run this.
    if (!(octoPath && grunt.file.isDir(octoPath))) {
      grunt.log.error('You must specify paths to your Octopress installation, like this: grunt ghost_octopress_converter:/path/to/octopress');

      return false;
    }

    var postsDir = path.join(octoPath, 'source', '_posts');

    if (!grunt.file.isDir(postsDir)) {
      grunt.log.error('Posts dir not found: ' + postsDir);

      return false;
    }

    // Find all the Octopress posts. They should all end in .markdown
    // for this to work properly.
    var postFiles = grunt.file.expand(path.join(postsDir, '**/*.markdown'));

    if (postFiles.length < 1) {
      grunt.log.error('No post found in dir: ' + postsDir);

      return false;
    }

    grunt.log.writeln(postFiles.length + ' Octopress blog posts found. Importing...');

    // Force task into async mode and grab a handle to the "done"
    // function.
    var done = this.async();

    // Incremented to create the sequential post IDs Ghost seems to want
    // at the moment, in addition to the UUID.
    var postId = 1;

    async.mapSeries(postFiles, function (filePath, callback) {
      var postFilePath = filePath.replace(postsDir, '').slice(1);

      grunt.log.writeln('Processing file ' + postFilePath);

      async.waterfall([

        // Read the blog data into a buffer.
        function (callback) {
          fs.readFile(filePath, {encoding: 'utf8'}, callback);
        },

        // Parse the YAML front matter for metadata.
        function (fileContents, callback) {
          var parsed = yamlFront.parse(fileContents);

          // Store file name for later reference.
          parsed.fileName = filePath.split('/').pop();

          callback(null, parsed);
        },

        // Prepare the post for saving into Ghost's database.
        function (meta, callback) {
          var creationDate = meta.date || meta.created || meta.fileName.slice(0, 10);

          var created_at = Date.parse(creationDate);
          var updated_at = Date.parse(meta.changed || creationDate);

          var post = {
            id: postId,
            uuid: uuid.v4(),
            author_id: 1,
            created_by: 1,
            published_by: 1,
            updated_by: 1,
            title: meta.title,
            created_at: created_at,
            published_at: created_at,
            updated_at: updated_at,
            markdown: cleanString(meta.__content),
            slug: cleanString(meta.slug),
            status: 'published',
            // tags: []
          };

          postId += 1;

          // Fall back on the filename, sans date and extention, if a
          // slug was not specified in the metadata.
          if (!post.slug) {
            post.slug = meta.fileName.replace(fileNameDateMatcher, '').replace(fileNameExtensionMatcher, '');

            grunt.log.writeln('File ' + meta.fileName + ' did not have a slug value in its metadata. Falling back to ' + post.slug + ' as extracted from the file name.');
          }

          // // Categories might be an array of tags.
          // if (util.isArray(meta.categories)) {
          //   meta.categories.forEach(function (tag) {
          //     post.tags.push({id: null, name: tag});
          //   });
          // }
          // // Or it might be a single string.
          // else if (meta.categories && meta.categories.length > 1) {
          //   post.tags.push({id: null, name: meta.categories});
          // }

          // // Tags might be an array of tags.
          // if (util.isArray(meta.tags)) {
          //   meta.tags.forEach(function (tag) {
          //     post.tags.push({id: null, name: tag});
          //   });
          // }
          // // Or it might be a single string.
          // else if (meta.tags && meta.tags.length > 1) {
          //   post.tags.push({id: null, name: meta.tags});
          // }

          callback(null, post);
        },
      ], callback);
    }, function (err, posts) {
      if (err) {
        grunt.log.error(err);
      }

      fs.writeFile(outFile, JSON.stringify({
        meta: {
          exported_on: Date.now(),
          vendor: 'ghost_octopress_converter',
          version: "002"
        },
        data: {
          posts: posts
        }
      }), function (err) {
        if (err) {
          grunt.log.error('Failed to write export file ' + outFile);
          grunt.log.error(err);
        }
        else {
          grunt.log.ok('Export file created: ' + outFile);
        }

        done();
      });
    });
  });
};

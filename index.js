/* jshint node: true */
'use strict';

var BasePlugin = require('ember-cli-deploy-plugin'),
    SSHAdapter = require('./lib/ssh'),
    Client     = require('ssh2').Client,
    Promise    = require('ember-cli/lib/ext/promise');

module.exports = {
  name: 'ember-cli-deploy-ssh',

  createDeployPlugin: function(options) {
    var DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: {
        port: '22',
        filePattern: 'index.html',

        distDir: function(context) {
          return context.distDir;
        },

        revisionKey: function(context) {
          return context.commandOptions.revision || (context.revisionData && context.revisionData.revisionKey);
        },

        client: function(context) {
          return new Client();
        }
      },

      requiredConfig: ['host', 'userName', 'remoteDir'],

      setup: function(context) {
        return {
          adapter: new SSHAdapter()
        };
      },

      upload: function(context) {
        return context.adapter.upload.call(this, context)
          .catch(this.errorMessage.bind(this));
      },

      fetchRevisions: function(context) {
        return context.adapter.fetchRevisions.call(this, context)
          .catch(this.errorMessage.bind(this));
      },

      displayRevisions: function(context) {
        return context.adapter.displayRevisions.call(this, context);
      },

      activate: function(context) {
        return context.adapter.activate.call(this, context)
          .catch(this.errorMessage.bind(this));
      },

      // private functions

      errorMessage: function(error) {
        this.log(error, { color: 'red' });
        return Promise.reject(error);
      }
    });

    return new DeployPlugin();
  }
};

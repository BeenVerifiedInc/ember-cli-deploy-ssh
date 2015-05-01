/* jshint node: true */
'use strict';
var SSHAdapter = require('./lib/ssh-adapter');

module.exports = {
  name: 'ember-cli-deploy-ssh',
  type: 'ember-deploy-addon',
  adapters: {
    index: {
      'ssh': SSHAdapter
    }
  }
};

/* jshint node: true */
'use strict';

var CoreObject = require('core-object'),
    Promise    = require('ember-cli/lib/ext/promise'),
    fs         = require('fs'),
    path       = require('path');

function upload(context) {
  var self            = this,
      conn            = this.readConfig('client'),
      remoteDir       = this.readConfig('remoteDir'),
      filePattern     = this.readConfig('filePattern'),
      distDir         = this.readConfig('distDir'),
      filePath        = path.join(distDir, filePattern);

  this.log('+- Uploading `' + filePath + '`');

  return new Promise(function(resolve, reject) {
    var syncExec          = self.syncExec || require('sync-exec'),
        commandResult     = syncExec("git log -n 1 --pretty=format:'{%n  \"commit\": \"%H\",%n  \"author\": \"%an <%ae>\",%n  \"date\": \"%ad\",%n  \"message\": \"%f\"%n},'     $@ |     perl -pe 'BEGIN{print \"[\"}; END{print \"]\n\"}' |     perl -pe 's/},]/}]/'").stdout,
        commandResultJSON = JSON.parse(commandResult),
        shortCommitId     = commandResultJSON[0].commit.slice(0, 7),
        commitMessage     = commandResultJSON[0].message,
        revisionDir       = path.join(remoteDir, shortCommitId);

    conn.on('ready', function() {
      self.log('+- Connected.');

      var creatingDir = createDirectory(conn, revisionDir);

      creatingDir.then(function() {

        self.log('+- Created directory at ' + revisionDir + '.');

        var buffer = fs.readFileSync(filePath, 'utf8');

        var uploadingFiles = uploadRevisionFiles.call(self, conn, shortCommitId, buffer, commandResult);

        uploadingFiles.then(function(){
          self.log('+- Uploaded revision ' + shortCommitId + ': "' + commitMessage.replace(/-/g, ' ') + '".\n');
          resolve();
        });

        uploadingFiles.catch(function(err) {
          self.log('x- Uploaded nothing - error: ', err + '\n');
          reject(err);
        });
      });

      creatingDir.catch(reject);
    });

    conn.on('error', reject);

    conn.connect(readConfigFile(self));
  });
}

function fetchRevisions(context) {
  var self      = this,
      conn      = this.readConfig('client'),
      remoteDir = this.readConfig('remoteDir');

  return new Promise(function(resolve, reject) {
    conn.on('ready', function () {
      self.log('+- Connected.');

      conn.sftp(function(error, sftp) {
        if (error) { return reject(error); }

        var finding = findRevisions(sftp, remoteDir);

        finding.then(function(fileList) {

          var gathering = gatherRevisionData(fileList, remoteDir, sftp);

          gathering.then(function(revisionData) {
            resolve({
              revisions: revisionData
            });
          });

          gathering.catch(reject);
        });

        finding.catch(reject);
      });
    });

    conn.on('error', function (error) {
      self.log('+- Connection error.');
      reject(error);
    });

    conn.connect(readConfigFile(self));
  });
}

function displayRevisions(context) {
  var revisionData = context.revisions,
      self         = this;

  this.log('+- Found ' + revisionData.length + ' revision(s).');

  revisionData.forEach(function (info) {
    var data = JSON.parse(info.data)[0];
    self.log('\n');
    self.log('\t Revision: \t' + info.revisionId);
    self.log('\t Commit:   \t' + data.commit);
    self.log('\t Author:   \t' + data.author);
    self.log('\t Date:     \t' + data.date);
    self.log('\t Message:  \t' + data.message);
    self.log('\t Filepath: \t' + info.filename);
    self.log('\n');
  });
}

function activate(context) {
  var self              = this,
      conn              = this.readConfig('client'),
      revisionKey       = this.readConfig('revisionKey'),
      remoteDir         = this.readConfig('remoteDir'),
      filePattern       = this.readConfig('filePattern'),
      revisionIndexFile = path.join(remoteDir, revisionKey, filePattern),
      indexFile         = path.join(remoteDir, filePattern);

  this.log('+- Activating revision `' + revisionKey + '`');

  return new Promise(function(resolve, reject) {
    conn.on('ready', function () {
      self.log('+- Connected.');

      conn.sftp(function(err, sftp) {
        sftp.unlink(indexFile, function() {
          sftp.symlink(revisionIndexFile, indexFile, function(err) {
            if (err) { return reject(err); }

            resolve({ revisionData: { activatedRevisionKey: revisionKey } });

          });
        });
      });
    });

    conn.on('error', function (error) {
      self.log('+- Connection error.');
      reject(error);
    });

    conn.connect(readConfigFile(self));
  });
}

// private functions

function readConfigFile(self) {
  var sshConfig = {
    host: self.readConfig('host'),
    username: self.readConfig('userName'),
    port: self.readConfig('port'),
    agent: self.readConfig('agent'),
    passphrase: self.readConfig('passphrase'),
    password: self.readConfig('password')
  };

  var privateKeyFile = self.readConfig('privateKeyFile');

  if (privateKeyFile) {
    sshConfig.privateKey = fs.readFileSync(privateKeyFile);
  }

  return sshConfig;
}

function readFile(metaPath, revisionId, sftp, options) {
  return new Promise(function(resolve, reject) {
    sftp.readFile(metaPath, options, function(error, data) {
      if (error) {
        reject(error);
      } else {
        resolve({filename: metaPath, data: data, revisionId: revisionId});
      }
    });
  });
}

function excludeIndexFile(list) {
  return list.filter(function (item) {
    return item.filename !== 'index.html';
  });
}

function findRevisions(sftp, remoteDir) {
  return new Promise(function (resolve, reject) {
    sftp.readdir(remoteDir, function(err, list) {
      if (err) {
        reject(err);
      } else {
        resolve(excludeIndexFile(list));
      }
    });
  });
}

function gatherRevisionData(fileList, remoteDir, sftp) {
  var filePromises = [];
  return new Promise(function(resolve, reject) {

    fileList.forEach(function(file) {
      var revisionId = file.filename,
          metaPath = path.join(remoteDir, revisionId, "meta.json");
      filePromises.push(readFile(metaPath, revisionId, sftp));
    });

    Promise.all(filePromises).then(resolve, reject);
  });
}

function createDirectory(conn, revisionDir) {
  return new Promise(function(resolve, reject) {
    conn.exec('mkdir -p ' + revisionDir, function(error, mkdirStream) {

      if (error) {
        reject(error);
        return;
      }

      mkdirStream.on('error', reject);
      mkdirStream.on('close', resolve);
    });
  });
}

function uploadIndex(sftp, indexPath, indexBuffer) {
  return new Promise(function(resolve, reject) {
    var stream = sftp.createWriteStream(indexPath);
    stream.on('error', reject);
    stream.on('end', reject);
    stream.on('close', resolve);

    stream.write(indexBuffer);
    stream.end();
  });
}

function uploadMeta(sftp, metaPath, metaBuffer) {
  return new Promise(function(resolve, reject){
    var stream = sftp.createWriteStream(metaPath);
    stream.on('error', reject);
    stream.on('end', reject);
    stream.on('close', resolve);

    stream.write(metaBuffer);
    stream.end();
  });
}

function uploadRevisionFiles(conn, revisionId, indexContents, metaContents) {
  var self        = this,
      revisionDir = path.join(this.readConfig('remoteDir'), revisionId),
      indexPath   = path.join(revisionDir, 'index.html'),
      metaPath    = path.join(revisionDir, 'meta.json');

  return new Promise(function(resolve, reject) {
    conn.sftp(function(err, sftp) {
      if (err) { return reject(err); }

      Promise.all([
        uploadIndex(sftp, indexPath, indexContents),
        uploadMeta(sftp,  metaPath, metaContents)
      ])
      .then(resolve, reject);
    });
  });
}

module.exports = CoreObject.extend({
  upload: upload,
  fetchRevisions: fetchRevisions,
  activate: activate,
  displayRevisions: displayRevisions
});

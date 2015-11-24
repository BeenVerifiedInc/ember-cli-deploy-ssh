# ember-cli-deploy-ssh #

> WARNING: This plugin is only compatible with ember-cli-deploy versions >= 0.5.0

###Install

You should already have `ember-cli-deploy` installed but if you don't:

```sh
$ ember install ember-cli-deploy
```

You will also need `ember-cli-deploy-build`, to build your project on deploy.

```sh
$ ember install ember-cli-deploy-build
```

and  `ember-cli-deploy-revision-data`

```sh
$ ember install ember-cli-deploy-revision-data
```

And finally install `ember-cli-deploy-ssh`

```sh
$ ember install ember-cli-deploy-ssh
```

Add the required configurations to  `deploy.js `:

```js
// An example of deploy.js.

module.exports = function(deployTarget) {
  var ENV = {
    build: {}
    // include other plugin configuration that applies to all deploy targets here
  };

  if (deployTarget === 'development') {
    ENV.build.environment = 'development';

    ENV.plugins = ['build', 'ssh', 'revision-data'];

    ENV.ssh = {
      remoteDir: process.env.REMOTE_DIR_PATH,
      userName: process.env.REMOTE_USERNAME,
      host: process.env.REMOTE_HOST_IP,
      password: process.env.REMOTE_PASSWORD,
      port: process.env.REMOTE_HOST_PORT
    };
  }

  if (deployTarget === 'staging') {
    ENV.build.environment = 'production';
  }

  if (deployTarget === 'production') {
    ENV.build.environment = 'production';
  }

  return ENV;
};
```

Make sure you specify all your plugins in each of your environments.

```sh
  ENV.plugins = ['build', 'ssh', 'revision-data'];
```

## dotENV Support

`ember-cli-deploy` supports `.env` files out of the box. In order to employ this functionality, simply create the following files and add your variables to them.

* `.env.deploy.development`
* `.env.deploy.production`
* `.env.deploy.staging`

## Configurations

The following parameters are available to correctly setup ssh:

* **host** - Hostname or IP address of the server (**required**)
* **username** - Username for authentication (**required**)
* **remoteDir** - Remote directory to upload to (**required**)
* **filePattern** - Name of the file to upload, defaults to `index.html` (**optional**)
* **distDir** - Directory of the filePattern, default gets from `ember-cli-deploy-build` (**optional**)
* **password** - Password for authentication (**optional**)
* **port** - Port of the server, defaults to 22 (**optional**)
* **privateKeyFile** - String that contains a private key for either key-based or hostbased user authentication (**optional**)
* **passphrase** - Passphrase used to decrypt private key, if needed (**optional**)
* **agent** - Path to ssh-agent's UNIX socket for ssh-agent-based user authentication (**optional**)


## Directory Structure

The following directory structure is created on your server. The basic gist is that your revisions will be stored inside of their own directory along with meta data about the revision (date of commit, commit message, author of the commit, and commit hash). Information about your revisions is viewable via the following command `ember deploy:list <your environment>`.

### List revisions

```sh
$ ember deploy:list staging
```

```sh

The following revisions were found:

   Revision:  516d6e2
   Commit:    516d6e26bcb7e75c2620eae87eeb37ce1e481f8f
   Author:    Eddie Flores <eddflrs@gmail.com>
   Date:      Mon May 11 23:23:53 2015 -0400
   Message:   Hello-added
   Filepath:  /home/eddie/html/516d6e2/meta.json


   Revision:  d821149
   Commit:    d8211495be55c3e8b839ab963d9fec1910a44b05
   Author:    Eddie Flores <eddflrs@gmail.com>
   Date:      Fri May 1 08:17:40 2015 -0400
   Message:   Update-comments-in-Brocfile-for-better-documentation
   Filepath:  /home/eddie/html/d821149/meta.json

```

### Deploy revision

```sh
$ ember deploy staging
```
You can also add these optional flags:

  * `--activate` triggers the activation passing the revision that just got uploaded.
  * `--summary` adds a summary message to the deployMetaData (used in slack).

```
# In your server's file directory...

abc123/
    index.html           # The index file
    meta.json            # Meta data about this revision

def456/
    ...

index.html --> abc123/index.html  # Active symlink

```

### Activate revision

```sh
$ ember deploy:activate staging --revision=<revisionId>
```

> This project was adapted from these repos:
 * https://github.com/treyhunner/ember-deploy-ssh-index
 * https://github.com/eddflrs/ember-cli-deploy-ssh

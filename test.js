//
// var Client = require('ssh2').Client;
//
//
// var conn = new Client();
// conn.on('ready', function() {
//   console.log('wtf?');
// })
// .on('end', function() {
//   console.log('Client disconnected');
// })
// .on('error', function() {
//   console.log('errored out!');
// })
// .connect({
//   host: '192.168.99.100',
//   port: 2200,
//   username: 'user',
//   password: 'xrdNpC3ntcqF62Af6w4Z'
// });
//
// docker run --name ssh -d -p 2200:22 fedora/ssh
// docker logs ssh | grep 'ssh user password'
// ssh -p 2200 user@192.168.99.100

var buffer = require('fs').readFileSync('./index.js');

console.log(buffer);

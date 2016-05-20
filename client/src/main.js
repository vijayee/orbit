'use strict';

const fs           = require('fs');
const path         = require('path');
const EventEmitter = require('events').EventEmitter;
const Logger       = require('logplease');
const logger       = Logger.create("Orbit.Main", { color: Logger.Colors.Yellow });
// const ipfsd        = require('ipfsd-ctl');
// const SocketApi    = require('../../src/api/SocketApi');
// const HttpApi      = require('./api/HttpApi');
const utils        = require('../../src/utils');
const Orbit        = require('../../src/Orbit');
// const IPFS         = require('ipfs');
const IPFS = require('exports?Ipfs!ipfs/dist/index.js')

var ENV = process.env["ENV"] || "release";
logger.debug("Running in '" + ENV + "' mode");
// process.env.PATH += ":/usr/local/bin" // fix for Electron app release bug (PATH doesn't get carried over)

// Create data directory
const dataPath = path.join(utils.getAppPath(), "/data");
// if(!fs.existsSync(dataPath))
//   fs.mkdirSync(dataPath);

/* MAIN */
const events = new EventEmitter();
let ipfs, orbit;

const start = exports.start = () => {
  const startTime = new Date().getTime();
  logger.info("Starting IPFS...");

  return utils.ipfsDaemon(IPFS, '/ip4/127.0.0.1/tcp/4002/ws')
    .then((res) => {
      ipfs = res;
      orbit = new Orbit(ipfs, events, { dataPath: dataPath });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        ipfs.id((err, id) => {
          if (err) return reject(err);
          resolve(id);
        });
      });
    })
    .then((id) => {
      logger.info(`IPFS Node started: ${id.Addresses[1]}/ipfs/${id.ID}`);
      return;
    })
    .then(() => new Promise((resolve, reject) => {
      // TODO: make dynamic
      ipfs.libp2p.swarm.connect(
        '/ip4/127.0.0.1/tcp/6002/ws/ipfs/QmS7FBUDnBKvd2HEBPLDyJPzTFPSGk5rvpZxSsBn9ac5Wz',
        // '/ip4/127.0.0.1/tcp/5002/ws/ipfs/QmRU7qzc4nqxLECPFYWRr9yveUmKJjYQKLayQ6q3n6ntFm',
        (err) => {
          if (err) return reject(err);
          resolve();
        });
    }))
    // .then(() => HttpApi(ipfs, events))
    // .then((httpApi) => SocketApi(httpApi.socketServer, httpApi.server, events, orbit))
    // .then(() => SocketApi(null, null, events, orbit))
    .then(() => {
      events.on('socket.connected', (s) => orbit.onSocketConnected(s));
      events.on('shutdown', () => orbit.disconnect()); // From index-native (electron)
      return;
    })
    .then(() => {
      // auto-login if there's a user.json file
      // var userFile = path.join(path.resolve(utils.getAppPath(), "user.json"));
      // if(fs.existsSync(userFile)) {
      //   const user = JSON.parse(fs.readFileSync(userFile));
      //   logger.debug(`Using credentials from '${userFile}'`);
      //   logger.debug(`Registering as '${user.username}'`);
      //   const network = 'QmRB8x6aErtKTFHDNRiViixSKYwW1DbfcvJHaZy1hnRzLM';
      //   return orbit.connect(network, user.username, user.password);
      // }
      return;
    })
    .then(() => {
      const endTime = new Date().getTime();
      logger.debug('Startup time: ' + (endTime - startTime) + "ms");
      return orbit;
    })
};
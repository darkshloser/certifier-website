const config = require('config');
const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient(config.get('redis'));

function errorHandler (err) {
  if (err && err.code === 'ECONNREFUSED') {
    return console.error(err.message);
  }

  console.error('Redis error', err);
  process.exit(1);
}

client.on('error', (err) => errorHandler(err));

// Promisfy & export required Redis commands
for (const func of [
  // Transactions
  'multi', 'exec', 'discard',
  // Plain keys
  'keys', 'del', 'get', 'set', 'incr',
  // Hashes
  'hget', 'hgetall', 'hset', 'hdel', 'hscan', 'hlen', 'hexists', 'hvals',
  // Sets
  'sadd', 'spop', 'smembers', 'sscan', 'srem', 'sismember', 'scard', 'psetex',
  // Pubsub
  'publish', 'subscribe',
  // Keys
  'exists',
  // Expires
  'pexpire'
]) {
  exports[func] = promisify(client[func].bind(client));
}

exports.client = client;
exports.errorHandler = errorHandler;

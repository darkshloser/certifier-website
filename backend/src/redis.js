const config = require('config');
const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient(config.get('redis'));

client.on('error', function (err) {
  console.error('Redis error', err);
});

// Promisfy & export required Redis commands
for (const func of [
  // Transactions
  'multi', 'exec', 'discard',
  // Plain keys
  'get', 'set',
  // Hashes
  'hget', 'hset', 'hdel', 'hscan',
  // Sets
  'sadd', 'spop', 'smembers', 'sscan', 'srem',
  // Pubsub
  'publish', 'subscribe'
]) {
  exports[func] = promisify(client[func].bind(client));
}

exports.client = client;

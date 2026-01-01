const { createClient } = require("redis");

const isCloudRedis = !!process.env.REDIS_URL;

const redisUrl = isCloudRedis
  ? process.env.REDIS_URL
  : "redis://127.0.0.1:6379";

const client = createClient({ url: redisUrl });

client.on("connect", () => {
  console.log(
    `🔄 Connecting to Redis (${
      isCloudRedis ? "Redis Cloud" : "Local Redis"
    })...`
  );
});

client.on("ready", () => {
  console.log(
    `✅ Redis ready (${isCloudRedis ? "Redis Cloud" : "Local Redis"})`
  );
});

client.on("error", (err) => {
  console.error(
    `❌ Redis error (${isCloudRedis ? "Redis Cloud" : "Local Redis"}):`,
    err
  );
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error(
      `❌ Redis connection failed (${
        isCloudRedis ? "Redis Cloud" : "Local Redis"
      }):`,
      err
    );
  }
})();

module.exports = client;

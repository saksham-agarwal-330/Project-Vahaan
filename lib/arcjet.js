import arcjet, { tokenBucket } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["ip.src"], // Track requests by IP
  rules: [
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, // Refill 10 tokens per interval
      interval: 3600, // per hour
      capacity: 10, // Bucket capacity of 10 tokens
    }),
  ],
});

export default aj;

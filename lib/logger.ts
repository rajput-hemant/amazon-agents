/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Logger } from "pino";

import { env } from "./env";

let logger: Logger;

/**
 * @name getLogger
 */
export function getLogger() {
  if (logger) {
    return logger;
  }

  /* eslint-disable @typescript-eslint/no-require-imports */
  const pino = require("pino");

  logger = pino({
    browser: {
      asObject: true,
      disabled: env.NODE_ENV === "production",
    },
    level: "debug",
  });

  return logger;
}

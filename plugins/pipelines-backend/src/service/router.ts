import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';

export interface RouterOptions {
  logger: Logger;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger } = options;

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/history/:entityMeta/:entityRef', (_, response) => {
    response.json({
      commits: [{
        currentStage: { name: "pre merge", type: "jenkins", status: "failed" },
        changeId: "12345",
        subject: "make change to this code",
        status: "new",
      }, {
        currentStage: { name: "post merge", type: "jenkins", status: "queued" },
        changeId: "54321",
        subject: "make change to this code",
        status: "new",
      }, {
        currentStage: { name: "integration", type: "spinnaker", status: "queued" },
        changeId: "22222",
        subject: "make change to this code",
        status: "new",
      }],
    })
  })
  router.use(errorHandler());
  return router;
}

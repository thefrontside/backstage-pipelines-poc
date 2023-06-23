import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import type { CatalogClient } from "@backstage/catalog-client";
import type { Entity } from '@backstage/catalog-model';

export interface RouterOptions {
  logger: Logger;
  catalog: CatalogClient;
}

export interface Stage {
  name: string;
  type: string;
  host: string;
}

export interface ChangeInfo {
  number: number;
  subject: string;
  status: "NEW" | "MERGED" | "ABANDONED";
  branch: string;
  projectName: string;
  owner: {
    name: string;
  }
}

export type ChangeStatus = {
  type: "un-entered";
} | {
  type: "enqueued";
} | {
  type: "running";
} | {
  type: "passed";
} | {
  type: "failed";
}

interface PipelineClient {
  getChangeInfoFromEntity(entity: Entity): Promise<ChangeInfo>;
  getStatusForChange(stage: Stage, change: ChangeInfo): Promise<ChangeStatus>;
  getStatusesForChange(stages: Stage, change: ChangeInfo): Promise<ChangeStatus[]>;
}


function createPipelineClient(gerritURL: string): PipelineClient {

}


async function getChangeInfoFromEntity(entity: Entity): Promise<ChangeInfo[]> {
  const annotations = entity.metadata.annotations ?? {};
  const project = annotations["backstage.io/gerrit-project"];
  if (!project) {
    return [];
  }
  return await getChangInfoFromGerrit(project);
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, catalog } = options;

  let client = createPipelineClient("url");

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/history/:kn/:name', async (request, response) => {

    // 1. get an reference to the entity (project)

    const { kn, name } = request.params;

    const entity = await catalog.getEntityByRef(`${kn}/${name}`);

    if (!entity) {
      response.sendStatus(422);
      return;
    }

    async function getStatusForChange(stage: Stage, change: ChangeInfo): Promise<ChangeStatus> {

    }

    async function getStageStatusesForChange(change: ChangeInfo, stages: Stage[]) {
      return await Promise.all(stages.map(stage => getStatusForChange(stage, change)));
    }

    const changes = await getChangeInfoFromEntity(entity);

    const stages: Stage = entity.spec.stages ?? [];

    const status = Promise.all(changes.map(change => getStageStatusesForChange(change, stages)));



    console.dir({ entity });

    // 2. get the list of change ids for this project (we can handle paging
    // 3. backwards to deeper history later)
    // 4. dig out the shape of the expected stages for this entity
    // query the stages individually

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

async function getChangInfoFromGerrit(project): Promise<ChangeInfo[]> {
  return [
    {
      "id": "demo~master~Idaf5e098d70898b7119f6f4af5a6c13343d64b57",
      "project": "demo",
      "branch": "master",
      "attention_set": {
        "1000096": {
          "account": {
            "_account_id": 1000096,
            "name": "John Doe",
            "email": "john.doe@example.com"
          },
          "last_update": "2012-07-17 07:19:27.766000000",
          "reason": "reviewer or cc replied"
        }
      },
      "change_id": "Idaf5e098d70898b7119f6f4af5a6c13343d64b57",
      "subject": "One change",
      "status": "NEW",
      "created": "2012-07-17 07:18:30.854000000",
      "updated": "2012-07-17 07:19:27.766000000",
      "mergeable": true,
      "insertions": 26,
      "deletions": 10,
      "_number": 1756,
      "owner": {
        "name": "John Doe"
      },
    },
    {
      "id": "demo~master~I09c8041b5867d5b33170316e2abc34b79bbb8501",
      "project": "demo",
      "branch": "master",
      "change_id": "I09c8041b5867d5b33170316e2abc34b79bbb8501",
      "subject": "Another change",
      "status": "NEW",
      "created": "2012-07-17 07:18:30.884000000",
      "updated": "2012-07-17 07:18:30.885000000",
      "mergeable": true,
      "insertions": 12,
      "deletions": 18,
      "_number": 1757,
      "owner": {
        "name": "John Doe"
      },
      "_more_changes": true
    }
  ]
}

import { PluginDatabaseManager, errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import type { CatalogClient } from "@backstage/catalog-client";
import type { Entity } from '@backstage/catalog-model';
import type { Stage, StageType, StageStatus, ChangeInfo, ChangePipelineStatus } from "backstage-plugin-pipelines-common";

export interface RouterOptions {
  logger: Logger;
  catalog: CatalogClient;
  database: PluginDatabaseManager;
}

interface PipelineClient {
  getChangeInfoFromEntity(entity: Entity): Promise<ChangeInfo[]>;
  getStatusForChange(stage: Stage, change: ChangeInfo): Promise<StageStatus>;
}

export interface PipelineResolver {
  (change: ChangeInfo, stage: Stage): Promise<StageStatus>;
}


function createPipelineClient(_gerritURL: string, resolvers: Record<StageType, PipelineResolver>): PipelineClient {

  return {
    async getChangeInfoFromEntity(entity) {
      const annotations = entity.metadata.annotations ?? {};
      const project = annotations["backstage.io/gerrit-project"];
      if (!project) {
        return [];
      }
      return await getChangInfoFromGerrit(project);
    },
    async getStatusForChange(stage, change) {
      const resolver = resolvers[stage.type];
      return await resolver(change, stage);
    }
  }
}

async function getChangeInfoFromEntity(entity: Entity): Promise<ChangeInfo[]> {
  const annotations = entity.metadata.annotations ?? {};
  const project = annotations["backstage.io/gerrit-project"];
  if (!project) {
    return [];
  }
  return await getChangInfoFromGerrit(project);
}

import { faker } from '@faker-js/faker';
import { applyDatabaseMigrations } from '../migrations';

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, catalog } = options;

  const knex = await options.database.getClient();

  await applyDatabaseMigrations(knex);

  function randomStatusName() {
    return faker.helpers.arrayElement<StageStatus["type"]>(["un-entered", "enqueued", "running", "passed", "failed"]);
  }

  const client = createPipelineClient("url", {
    async jenkins() {
      return { type: randomStatusName() };
    },
    async gerrit() {
      return { type: randomStatusName() };
    },
    async spinnaker() {
      return { type: randomStatusName() };
    }
  });

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

    async function getStageStatusesForChange(change: ChangeInfo, stages: Stage[]): Promise<ChangePipelineStatus> {
      const statuses = await Promise.all(stages.map(stage => client.getStatusForChange(stage, change)));
      const stageStatuses = statuses.map((status, i) => ({ stage: stages[i], status }));
      let current = stageStatuses[0];
      for (let i = 1; i < stageStatuses.length; i++) {
        const next = stageStatuses[i];
        if (next.status.type === "un-entered") {
          break;
        }
        current = next;
      }
      return {
        change,
        current,
        stages: stageStatuses,
      }
    }

    const changes = await getChangeInfoFromEntity(entity);

    const stages: Stage[] = (entity.spec?.stages ?? []) as unknown as Stage[];

    const statuses = await Promise.all(changes.map(change => getStageStatusesForChange(change, stages)));

    response.json(statuses);
  })
  router.use(errorHandler());
  return router;
}

async function getChangInfoFromGerrit(project: string): Promise<ChangeInfo[]> {
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
      "number": 1756,
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
      "number": 1757,
      "owner": {
        "name": "John Doe"
      },
      "_more_changes": true
    }
  ]
}

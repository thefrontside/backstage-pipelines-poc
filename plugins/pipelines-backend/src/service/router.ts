import { PluginDatabaseManager, errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { CATALOG_FILTER_EXISTS, type CatalogClient } from "@backstage/catalog-client";
import type { Entity } from '@backstage/catalog-model';
import type { Stage, StageType, StageStatus, ChangeInfo, ChangePipelineStatus } from "backstage-plugin-pipelines-common";
import type { PluginTaskScheduler } from '@backstage/backend-tasks';
import { v4 } from 'uuid';

export interface RouterOptions {
  logger: Logger;
  catalog: CatalogClient;
  database: PluginDatabaseManager;
  scheduler: PluginTaskScheduler;
}

interface PipelineStageStatus {
  stage: Stage;
  status: StageStatus;
}

interface PipelineClient {
  getChangeInfoFromEntity(entity: Entity): Promise<ChangeInfo[]>;
  getStatusForChange(stage: Stage, change: ChangeInfo): Promise<StageStatus>;
  getStageStatusesForChange(change: ChangeInfo, stages: Stage[]): Promise<PipelineStageStatus[]>;
}

export interface PipelineResolver {
  (change: ChangeInfo, stage: Stage): Promise<StageStatus>;
}


function getGerritProjectFromEntity(entity: Entity): string | undefined {
  const annotations = entity.metadata.annotations ?? {};
  const project = annotations["backstage.io/gerrit-project"];
  return project;
}

function createPipelineClient(_gerritURL: string, resolvers: Record<StageType, PipelineResolver>): PipelineClient {

  const client: PipelineClient = {
    async getChangeInfoFromEntity(entity) {
      const project = getGerritProjectFromEntity(entity);
      if (!project) {
        return [];
      }
      const upstream = await getChangeInfoFromGerrit(project);
      return upstream.map(info => ({
        ...info,
        projectName: project,
        ownerName: info.owner.name,
      }));
    },
    async getStatusForChange(stage, change) {
      const resolver = resolvers[stage.type];
      return await resolver(change, stage);
    },
    async getStageStatusesForChange(change, stages) {
      const statuses = await Promise.all(stages.map(stage => client.getStatusForChange(stage, change)));
      const stageStatuses = statuses.map((status, i) => ({ stage: stages[i], status }));
      return stageStatuses;
    }
  }
  return client;
}

import { faker } from '@faker-js/faker';
import { applyDatabaseMigrations } from '../migrations';

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, catalog } = options;

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

  const knex = await options.database.getClient();

  await applyDatabaseMigrations(knex);

  await options.scheduler.scheduleTask({
    id: 'update-pipelines',
    frequency: { seconds: 10 },
    timeout: { hours: 24 },
    async fn() {
      logger.info("querying changes!");
      // TODO: this should be paginated
      const entities = await catalog.getEntities({
        filter: [
          { kind: 'component' },
          { "spec.stages": CATALOG_FILTER_EXISTS },
        ]
      })

      for (const entity of entities.items) {
        const changes = await client.getChangeInfoFromEntity(entity);
        for (const change of changes) {
          const { projectName, ownerName, number, subject, status } = change;
          const existing = await knex.select().from('changes').where({ projectName, number }).first();
          const stages: Stage[] = (entity.spec?.stages ?? []) as unknown as Stage[];
          const statuses = await client.getStageStatusesForChange(change, stages);
          const attrs = { ownerName, subject, status, statuses: JSON.stringify(statuses) };
          if (existing) {
            await knex('changes').update(attrs);
          } else {
            const id = v4();
            await knex('changes').insert({
              ...attrs,
              id,
              projectName,
              number,
            })
          }
        }
      }
    }
  })

  function randomStatusName() {
    return faker.helpers.arrayElement<StageStatus["type"]>(["un-entered", "enqueued", "running", "passed", "failed"]);
  }

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

    const projectName = getGerritProjectFromEntity(entity);

    if (projectName) {
      const rows = await knex('changes').where({ projectName });
      response.json(rows.map(row => ({
        change: row,
        current: (() => {
          let current = void 0;
          for (const status of row.statuses) {
            if (status.status.type === "un-entered") {
              break;
            }
            current = status;
          }
          return current;
        })(),
        stages: row.statuses,
      })));
    } else {
      response.json([]);
    }
  })

  router.use(errorHandler());
  return router;
}

async function getChangeInfoFromGerrit(_project: string) {
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
  ] as const;
}

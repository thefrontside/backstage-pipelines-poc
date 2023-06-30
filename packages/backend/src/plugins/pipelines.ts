import { createRouter } from 'backstage-plugin-pipelines-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    catalog: env.catalog,
    database: env.database,
  });
}

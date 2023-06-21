import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const pipelinesPlugin = createPlugin({
  id: 'pipelines',
  routes: {
    root: rootRouteRef,
  },
});

export const PipelinesPage = pipelinesPlugin.provide(
  createRoutableExtension({
    name: 'PipelinesPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);

import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { pipelinesPlugin, PipelinesPage } from '../src/plugin';

createDevApp()
  .registerPlugin(pipelinesPlugin)
  .addPage({
    element: <PipelinesPage />,
    title: 'Root Page',
    path: '/pipelines'
  })
  .render();

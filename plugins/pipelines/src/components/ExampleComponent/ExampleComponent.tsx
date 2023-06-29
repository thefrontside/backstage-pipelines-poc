import React from 'react';
import { Typography, Grid } from '@material-ui/core';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  SupportButton,
} from '@backstage/core-components';
import { useState, useEffect } from "react";

import { useApi, discoveryApiRef, fetchApiRef, type DiscoveryApi, type FetchApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { ChangePipelineStatus } from 'backstage-plugin-pipelines-common';

export function ExampleComponent() {
  const history = useChangePipelineStatues();

  if (history.type === "pending") {
    return "Loading...";
  } else if (history.type === "rejected") {
    return String(history.error);
  }

  return (
    <InfoCard title="Gerrit Commit IDs">
      <ol>
      {history.value.map((status => (
        <li key={status.change.number}>{status.change.number}: {status.current.stage.name} ({status.current.stage.type}) - {status.current.status.type}</li>
      )))}
      </ol>
    </InfoCard>
  );
}

function useEntityRef() {
  const entity = useEntity();
  return stringifyEntityRef(entity.entity);
}

interface FetchHistoryOptions {
  discovery: DiscoveryApi;
  fetch: FetchApi;
  entityRef: string;
}
async function fetchHistory(options: FetchHistoryOptions): Promise<ChangePipelineStatus[]> {
  const { discovery, fetch, entityRef } = options;
  const base = await discovery.getBaseUrl("pipelines");
  const response = await fetch.fetch(`${base}/history/${entityRef}`);
  if (response.ok) {
    return await response.json();
  }
  throw new Error(`${response.status}: ${response.statusText}`);
}

export function useChangePipelineStatues(): Async<ChangePipelineStatus[]> {
  const entityRef = useEntityRef();
  const discovery = useApi(discoveryApiRef);
  const fetch = useApi(fetchApiRef);
  const [state, setState] = useState<Async<ChangePipelineStatus[]>>({ type: "pending" });

  useEffect(() => {
    fetchHistory({ discovery, fetch, entityRef })
    .then(value => setState({ type: "resolved", value }))
    .catch(error => setState({ type: "rejected", error }))
  }, [discovery, fetch, entityRef]);

  return state;

  /* return {
   *   type: "resolved",
   *   value: {
   *     commits: [{
   *       currentStage: { name: "pre merge", type: "jenkins", status: "failed" },
   *       changeId: "12345",
   *       subject: "make change to this code",
   *       status: "new",
   *     }, {
   *       currentStage: { name: "post merge", type: "jenkins", status: "queued" },
   *       changeId: "54321",
   *       subject: "make change to this code",
   *       status: "new",
   *     }, {
   *       currentStage: { name: "integration", type: "spinnaker", status: "queued" },
   *       changeId: "22222",
   *       subject: "make change to this code",
   *       status: "new",
   *     }],
   *   }
   * }; */
}

export interface GerritCommitStage {
  name: string;
  type: string;
  status: "passed" | "failed" | "queued";
}

export type Async<T> = {
  type: "pending";
} | {
  type: "resolved";
  value: T;
} | {
  type: "rejected";
  error: Error;
}

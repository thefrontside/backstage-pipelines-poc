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

import { useEntity } from '@backstage/plugin-catalog-react';

export function ExampleComponent() {
  const { value: history} = useGerritCommitHistory();

  return (
    <InfoCard title="Gerrit Commit IDs">
      <ol>
      {history.commits.map((commit => (
        <li key={commit.changeId}>{commit.changeId}: {commit.currentStage.name} ({commit.currentStage.type}) - {commit.currentStage.status}</li>
      )))}
      </ol>
    </InfoCard>
  );
}

export interface GerritCommitHistory {
  commits: GerritCommitStatus;
}

export interface GerritCommitStatus {
  currentStage: GerritCommitStage;
  changeId: string;
  subject: string;
  status: "new" | "merged" | "aborted";
}

export function useGerritCommitHistory(): Async<GerritCommitHistory> {
  return {
    type: "resolved",
    value: {
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
    }
  };
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

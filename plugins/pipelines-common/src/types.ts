export type StageType = "jenkins" | "gerrit" | "spinnaker";

export interface Stage {
  type: StageType;
  name: string;
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

/**
 * The status of a single change in a single stage of a pipeline
 */
export type StageStatus = {
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

export interface ChangePipelineStatus {
  change: ChangeInfo;
  current: {
    stage: Stage;
    status: StageStatus;
  };
  stages: {
    stage: Stage;
    status: StageStatus;
  }[];
}

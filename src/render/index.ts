import type { SessionSummary } from '../types.ts';
import type { Milestone } from '../git.ts';
export { renderSession } from './session.ts';
export { renderLegal } from './legal.ts';
export { renderOverallIndex, renderProjectIndex, renderProjectsPage, renderUsage, renderCloudSession } from './indexes.ts';

import type { PullRequest, CloudSession, AuthorCommit } from '../types.ts';
export interface ProjectPage { name: string; slug: string; repoPath?: string; sessions: SessionSummary[]; milestones: Milestone[]; webUrl?: string; prs?: PullRequest[]; cloud?: CloudSession[]; authors?: AuthorCommit[] }
export interface SiteInfo {
  generatedAt: string;
  emptyProjects: string[];
  unreadable: { file: string; reason: string }[];
  pro?: boolean;
  theme?: 'auto' | 'light' | 'dark';
  /** "alias=person" pairs from settings */
}

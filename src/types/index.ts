export type ScreenId =
  | 'signin'
  | 'dashboard'
  | 'employees'
  | 'employee_profile'
  | 'projects'
  | 'project_detail'
  | 'knowledge'
  | 'risk'
  | 'handovers'
  | 'handover_detail'
  | 'connections'
  | 'settings';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type SourceType = 'github' | 'googledrive' | 'notion' | 'jira';

export interface AdminUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  avatar?: string;
}

export interface ConnectedResource {
  id: string;
  sourceType: SourceType;
  name: string;
  url?: string;
  employeeId: string;
  employeeName: string;
  projectName?: string;
  status: 'connected' | 'syncing' | 'error' | 'READY' | 'SYNCING' | 'SYNCED' | 'NEEDS_AUTH' | 'FAILED' | 'DISABLED' | 'PENDING' | string;
  lastSynced: string;
  lastSuccessfulSync?: string;
  error?: string;
  details?: string; // e.g. "Public repository", "Folder: Payment Project", "12 assigned tasks"
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  avatar: string;
  initials: string;
  projectsCount: number;
  projects: string[];
  connectedSourcesCount: number;
  knowledgeScore: number; // e.g. 82%
  risk: RiskLevel;
  status: 'Active' | 'Departing' | 'On Leave';
  skills: string[];
  departureDate?: string;
  assignedDeputy?: string;
}

export interface ProjectContributor {
  employeeId: string;
  name: string;
  contributionPercent: number;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  team: string;
  tier: number; // e.g. 2
  status: 'Active' | 'Maintenance' | 'Deprecated';
  busFactor: number; // e.g. 1
  risk: RiskLevel;
  knowledgeCoverage: number; // e.g. 68%
  lastSync: string;
  members: ProjectContributor[];
  riskReasons: string[];
  connectedSources: {
    github: string[];
    googledrive: string[];
    notion: string[];
    jira: string;
  };
  recentActivity: {
    id: string;
    action: string;
    timestamp: string;
  }[];
}

export interface Handover {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  employeeTeam: string;
  employeeAvatar: string;
  projectNames: string[];
  risk: RiskLevel;
  progress: number; // e.g. 62%
  status: 'Draft' | 'Generated' | 'In Progress' | 'Email Sent';
  createdAt: string;
  targetDate: string;
  summary: string;
  majorContributions: string[];
  githubWork: string[];
  jiraTasks: string[];
  driveNotionKnowledge: string[];
  importantKnowledge: string[];
  knowledgeGaps: string[];
  recommendedSuccessor: {
    employeeId: string;
    name: string;
    role: string;
    email: string;
    relevancePercent: number;
    reasons: string[];
  };
  sentAt?: string;
  sentToEmail?: string;
}

export interface SemanticSearchResult {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  employeeTeam: string;
  employeeAvatar: string;
  relevancePercent: number;
  topicTitle: string;
  explanation: string;
  evidence: {
    githubCommitsCount: number;
    jiraTasksCount: number;
    notionDocsCount: number;
    driveDocsCount: number;
    repositories: string[];
  };
  relevantSnippet: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'risk' | 'sync' | 'handover' | 'auth';
}

export interface ConnectionProvider {
  type: SourceType;
  name: string;
  status: 'connected' | 'disconnected' | 'syncing';
  connectedCount: number;
  connectedCountLabel: string;
  lastSync: string;
  description: string;
  scopeNotice: string;
}

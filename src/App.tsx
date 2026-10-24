import React, { useState, useEffect } from 'react';
import {
  ScreenId,
  Employee,
  Project,
  ConnectedResource,
  Handover,
  NotificationItem,
  AdminUser,
  RiskLevel,
} from './types';

// Layout components
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';

// Screens
import { SignInScreen } from './components/screens/SignInScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { EmployeesScreen } from './components/screens/EmployeesScreen';
import { EmployeeProfileScreen } from './components/screens/EmployeeProfileScreen';
import { ProjectsScreen } from './components/screens/ProjectsScreen';
import { KnowledgeSearchScreen } from './components/screens/KnowledgeSearchScreen';
import { RiskScreen } from './components/screens/RiskScreen';
import { HandoversScreen } from './components/screens/HandoversScreen';
import { ConnectionsScreen } from './components/screens/ConnectionsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

// Modals
import { AddEmployeeModal } from './components/modals/AddEmployeeModal';
import { AddProjectModal } from './components/modals/AddProjectModal';
import { EditEmployeeModal } from './components/modals/EditEmployeeModal';
import { EditProjectModal } from './components/modals/EditProjectModal';
import { ConnectResourceModal } from './components/modals/ConnectResourceModal';
import { CreateHandoverModal } from './components/modals/CreateHandoverModal';
import { CommandPalette } from './components/modals/CommandPalette';

import { supabase } from './lib/supabase';
import {
  getCurrentAdmin,
  getEmployees,
  getProjects,
  getSources,
  getHandovers,
  getNotifications,
  revertHandover,
  updateEmployee,
  deleteEmployee,
  updateProject,
  deleteProject,
  RegisteredSource,
} from './lib/api';

// Data Mappers to translate Backend API schemas to Frontend state
function mapBackendEmployee(b: any): Employee {
  const initials = (b.name || '')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'EM';

  return {
    id: b.id,
    name: b.name,
    email: b.email,
    role: b.role,
    team: b.team || 'Engineering',
    avatar: b.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
    initials,
    projectsCount: (b.projects || []).length,
    // Display names only — for UI rendering
    projects: (b.projects || []).map((p: any) => p.name || p),
    // Stable IDs — used for filtering the project dropdown
    projectIds: (b.projects || []).map((p: any) => p.id).filter(Boolean),
    connectedSourcesCount: b.connected_resources_count || 0,
    knowledgeScore: Math.round(b.knowledge_score || 0),
    risk: (b.risk_level?.toLowerCase() || 'low') as RiskLevel,
    status: b.status === 'LEAVING' ? 'Departing' : b.status === 'INACTIVE' ? 'On Leave' : 'Active',
    skills: b.skills || [],
    departureDate: b.departure_date ? new Date(b.departure_date).toLocaleDateString() : undefined,
  };
}

function mapBackendProject(p: any): Project {
  const code = (p.name || 'PRJ')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 4)
    .join('')
    .toUpperCase();

  return {
    id: p.id,
    name: p.name,
    code: code || 'PRJ',
    team: p.description || 'Engineering',
    tier: 1,
    status: p.status === 'COMPLETED' ? 'Maintenance' : p.status === 'ARCHIVED' ? 'Deprecated' : 'Active',
    busFactor: p.bus_factor || (p.members?.length === 1 ? 1 : Math.max(1, p.members?.length || 1)),
    risk: (p.risk_level?.toLowerCase() || 'low') as RiskLevel,
    knowledgeCoverage: Math.round(100 - (p.continuity_risk || 0)),
    lastSync: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'Pending sync',
    members: (p.members || []).map((m: any) => ({
      employeeId: m.id || m.employee_id,
      name: m.name,
      contributionPercent: m.contribution_percent || 0,
      role: m.role || 'Contributor',
    })),
    riskReasons: p.risk_reasons || [],
    connectedSources: {
      github: [],
      googledrive: [],
      notion: [],
      jira: '',
    },
    recentActivity: [],
  };
}

function mapBackendSource(s: RegisteredSource): ConnectedResource {
  return {
    id: s.id,
    sourceType: s.source_type as any,
    name: s.name,
    url: s.url,
    employeeId: s.employee_id || '',
    employeeName: s.employee_name || 'Unassigned',
    projectName: s.project_name || '',
    status: (s.status === 'READY' || s.status === 'SYNCED') ? 'connected' : (s.status.toLowerCase() as any),
    lastSynced: s.last_synced_at ? new Date(s.last_synced_at).toLocaleDateString() : 'Pending sync',
    details: s.last_sync_error ? `Error: ${s.last_sync_error}` : `Status: ${s.status}`,
  };
}

function mapBackendHandover(h: any): Handover {
  const kp = h.knowledge_package || {};
  return {
    id: h.id,
    employeeId: h.employee_id,
    employeeName: h.employee_name || 'Outgoing Employee',
    employeeRole: 'Team Member',
    employeeTeam: 'Engineering',
    employeeAvatar: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250`,
    projectNames: h.project_name ? [h.project_name] : (kp.projects || []),
    risk: (h.risk_summary?.risk_level?.toLowerCase() || 'medium') as RiskLevel,
    progress: h.status === 'SENT' ? 100 : h.status === 'READY_FOR_REVIEW' ? 80 : 30,
    status: h.status === 'SENT' ? 'Email Sent' : h.status === 'READY_FOR_REVIEW' ? 'Generated' : h.status === 'REVERSED' ? 'Reversed' : 'Draft',
    createdAt: h.created_at ? new Date(h.created_at).toLocaleDateString() : 'Recently',
    targetDate: 'Pending',
    summary: h.generated_summary || kp.summary || 'Knowledge handover package.',
    majorContributions: kp.contributions || [],
    githubWork: kp.github_work || [],
    jiraTasks: kp.jira_responsibilities || [],
    driveNotionKnowledge: [...(kp.drive_knowledge || []), ...(kp.notion_knowledge || [])],
    importantKnowledge: kp.critical_knowledge || [],
    knowledgeGaps: kp.knowledge_gaps || [],
    recommendedSuccessor: h.recommended_successor ? {
      employeeId: h.recommended_successor.employee_id || h.recommended_successor_id || '',
      name: h.recommended_successor.name || 'Designated Successor',
      role: 'Engineer',
      email: h.recommended_successor.email || '',
      relevancePercent: Math.round((h.recommended_successor.confidence_score || 0.8) * 100),
      reasons: h.recommended_successor.reason ? [h.recommended_successor.reason] : [],
    } : {
      employeeId: '',
      name: 'Unassigned',
      role: '',
      email: '',
      relevancePercent: 0,
      reasons: [],
    },
    sentAt: h.sent_at ? new Date(h.sent_at).toLocaleDateString() : undefined,
    sentToEmail: h.recipient_email || undefined,
    reversedAt: h.reversed_at ? new Date(h.reversed_at).toLocaleDateString() : undefined,
    reversalReason: h.reversal_reason || undefined,
  };
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('signin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Authenticated Admin Profile State
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(() => {
    const saved = localStorage.getItem('continuum_admin_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignore JSON error
      }
    }
    return {
      name: '',
      email: '',
      role: 'Company Administrator',
      organization: '',
    };
  });

  // Core domain data state - Initialized with ZERO fake data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connectedResources, setConnectedResources] = useState<ConnectedResource[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Selected item states for detail views
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);

  // Modal open states
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isConnectResourceOpen, setIsConnectResourceOpen] = useState(false);
  const [preselectedEmpForResource, setPreselectedEmpForResource] = useState<Employee | null>(null);
  const [isCreateHandoverOpen, setIsCreateHandoverOpen] = useState(false);
  const [preselectedEmpForHandover, setPreselectedEmpForHandover] = useState<Employee | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Supabase Auth Session Initialization & Synchronization
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          if (currentScreen === 'signin') {
            setCurrentScreen('dashboard');
          }
        }
      } catch {
        const localToken = localStorage.getItem('continuum_auth_token');
        if (localToken) {
          setIsAuthenticated(true);
          if (currentScreen === 'signin') {
            setCurrentScreen('dashboard');
          }
        }
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        const localToken = localStorage.getItem('continuum_auth_token');
        if (!localToken) {
          setIsAuthenticated(false);
          setCurrentScreen('signin');
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Continue cleanup
    }
    localStorage.removeItem('continuum_auth_token');
    setIsAuthenticated(false);
    setCurrentScreen('signin');
  };

  // Synchronize Administrator Profile & Domain Data from Backend API when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    async function syncAllData() {
      // 1. Fetch authenticated admin profile
      try {
        const adminProfile = await getCurrentAdmin();
        if (adminProfile && isMounted) {
          setCurrentAdmin((prev) => {
            const rawDomain = adminProfile.email.includes('@')
              ? adminProfile.email.split('@')[1].split('.')[0]
              : '';
            const domainOrg = rawDomain
              ? rawDomain.charAt(0).toUpperCase() + rawDomain.slice(1) + ' Corp'
              : 'Continuum Platform';

            const updated: AdminUser = {
              id: adminProfile.id,
              name: adminProfile.name || prev.name || 'Administrator',
              email: adminProfile.email || prev.email,
              role: adminProfile.role || 'Company Administrator',
              organization: prev.organization || domainOrg,
            };
            localStorage.setItem('continuum_admin_profile', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.warn('Failed to sync admin profile:', err);
      }

      // 2. Fetch employees
      try {
        const empData = await getEmployees();
        if (isMounted && Array.isArray(empData)) {
          setEmployees(empData.map(mapBackendEmployee));
        }
      } catch (err) {
        console.warn('Failed to sync employees:', err);
      }

      // 3. Fetch projects
      try {
        const projData = await getProjects();
        if (isMounted && Array.isArray(projData)) {
          setProjects(projData.map(mapBackendProject));
        }
      } catch (err) {
        console.warn('Failed to sync projects:', err);
      }

      // 4. Fetch sources
      try {
        const srcData = await getSources();
        if (isMounted && Array.isArray(srcData)) {
          setConnectedResources(srcData.map(mapBackendSource));
        }
      } catch (err) {
        console.warn('Failed to sync sources:', err);
      }

      // 5. Fetch handovers
      try {
        const hndData = await getHandovers();
        if (isMounted && Array.isArray(hndData)) {
          setHandovers(hndData.map(mapBackendHandover));
        }
      } catch (err) {
        console.warn('Failed to sync handovers:', err);
      }

      // 6. Fetch notifications
      try {
        const notifData = await getNotifications();
        if (isMounted && Array.isArray(notifData)) {
          setNotifications(
            notifData.map((n: any) => ({
              id: n.id,
              title: n.title,
              description: n.message,
              timestamp: n.created_at ? new Date(n.created_at).toLocaleTimeString() : 'Recently',
              read: n.read || false,
              type: (n.type?.toLowerCase() || 'sync') as any,
            }))
          );
        }
      } catch (err) {
        console.warn('Failed to sync notifications:', err);
      }
    }

    syncAllData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleUpdateAdminUser = (updated: Partial<AdminUser>) => {
    setCurrentAdmin((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('continuum_admin_profile', JSON.stringify(next));
      return next;
    });
  };

  // Global keyboard shortcut for Command Palette (⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Add Employee
  const handleCreateEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
    setSelectedEmployee(newEmp);
    setCurrentScreen('employee_profile');

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Employee added: ${newEmp.name}`,
      description: `${newEmp.role} associated with ${newEmp.team}. Ready for resource connection.`,
      timestamp: 'Just now',
      read: false,
      type: 'auth',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handlers for Edit Employee
  const handleOpenEditEmployee = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsEditEmployeeOpen(true);
  };

  const handleUpdateEmployee = (updated: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    // Keep the profile view in sync if it's open
    if (selectedEmployee?.id === updated.id) {
      setSelectedEmployee(updated);
    }
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Employee updated: ${updated.name}`,
      description: `${updated.role} · ${updated.team} — record saved.`,
      timestamp: 'Just now',
      read: false,
      type: 'auth',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handlers for Delete Employee
  const handleOpenDeleteEmployee = (emp: Employee) => {
    setDeleteError('');
    setEmployeeToDelete(emp);
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeletingEmployee(true);
    setDeleteError('');
    try {
      await deleteEmployee(employeeToDelete.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      // Navigate away from the deleted employee's profile
      if (selectedEmployee?.id === employeeToDelete.id) {
        setSelectedEmployee(null);
        setCurrentScreen('employees');
      }
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Employee removed: ${employeeToDelete.name}`,
        description: `Employee record and related resources have been deleted.`,
        timestamp: 'Just now',
        read: false,
        type: 'auth',
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setEmployeeToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete employee. Please try again.');
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  // Handlers for Add Project
  const handleProjectCreated = (newProj: Project) => {
    setProjects((prev) => [newProj, ...prev]);
    setSelectedProject(newProj);
    setCurrentScreen('project_detail');

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Project registered: ${newProj.name}`,
      description: `${newProj.team} project created. Bus factor analysis initiated.`,
      timestamp: 'Just now',
      read: false,
      type: 'sync',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handlers for Edit Project
  const handleOpenEditProject = (proj: Project) => {
    setProjectToEdit(proj);
    setIsEditProjectOpen(true);
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedProject?.id === updated.id) {
      setSelectedProject(updated);
    }
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Project updated: ${updated.name}`,
      description: `${updated.team} — changes saved.`,
      timestamp: 'Just now',
      read: false,
      type: 'sync',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handlers for Delete Project
  const handleOpenDeleteProject = (proj: Project) => {
    setDeleteError('');
    setProjectToDelete(proj);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    setDeleteError('');
    try {
      await deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
        setCurrentScreen('projects');
      }
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Project removed: ${projectToDelete.name}`,
        description: `Project record, risk scores, and related resources have been deleted.`,
        timestamp: 'Just now',
        read: false,
        type: 'sync',
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setProjectToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete project. Please try again.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Handlers for Connect Resource
  const handleResourceConnected = (newRes: ConnectedResource) => {
    setConnectedResources((prev) => [newRes, ...prev]);

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === newRes.employeeId
          ? { ...e, connectedSourcesCount: e.connectedSourcesCount + 1 }
          : e
      )
    );

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `${newRes.name} connected`,
      description: `Mapped to ${newRes.employeeName} (${newRes.sourceType.toUpperCase()}).`,
      timestamp: 'Just now',
      read: false,
      type: 'sync',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleDisconnectResource = (resId: string) => {
    const res = connectedResources.find((r) => r.id === resId);
    if (res) {
      setConnectedResources((prev) => prev.filter((r) => r.id !== resId));
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === res.employeeId
            ? { ...e, connectedSourcesCount: Math.max(0, e.connectedSourcesCount - 1) }
            : e
        )
      );
    }
  };

  // Handlers for Handover creation & updates
  const handleHandoverCreated = (newHnd: Handover) => {
    setHandovers((prev) => [newHnd, ...prev]);
    setSelectedHandover(newHnd);
    setCurrentScreen('handover_detail');

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Handover package synthesized`,
      description: `${newHnd.employeeName} -> ${newHnd.projectNames.join(', ')}. Successor match ready.`,
      timestamp: 'Just now',
      read: false,
      type: 'handover',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleUpdateHandover = (updated: Handover) => {
    setHandovers((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    if (selectedHandover?.id === updated.id) {
      setSelectedHandover(updated);
    }

    if (updated.status === 'Email Sent') {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Handover email dispatched`,
        description: `Delivered to ${updated.sentToEmail} for ${updated.employeeName}.`,
        timestamp: 'Just now',
        read: false,
        type: 'handover',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  // Handler for Take Back Handover
  const handleRevertHandover = async (handover: Handover, reason: string): Promise<Handover> => {
    const raw = await revertHandover(handover.id, reason);
    const updated = mapBackendHandover(raw);
    handleUpdateHandover(updated);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Handover taken back`,
      description: `${updated.employeeName}'s handover was reversed. Reason: ${reason}`,
      timestamp: 'Just now',
      read: false,
      type: 'handover',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return updated;
  };

  // Navigation helpers
  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setCurrentScreen('employee_profile');
  };

  const handleSelectProject = (proj: Project | null) => {
    setSelectedProject(proj);
    if (proj) {
      setCurrentScreen('project_detail');
    } else {
      setCurrentScreen('projects');
    }
  };

  const handleSelectHandover = (hnd: Handover | null) => {
    setSelectedHandover(hnd);
    if (hnd) {
      setCurrentScreen('handover_detail');
    } else {
      setCurrentScreen('handovers');
    }
  };

  const handleSelectEmployeeById = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (emp) handleSelectEmployee(emp);
  };

  const handleStartHandoverForEmployee = (emp: Employee) => {
    setPreselectedEmpForHandover(emp);
    setIsCreateHandoverOpen(true);
  };

  const handleOpenConnectResourceForEmployee = (emp: Employee) => {
    setPreselectedEmpForResource(emp);
    setIsConnectResourceOpen(true);
  };

  // Breadcrumb subtitle calculator
  const getBreadcrumbSubtitle = () => {
    if (currentScreen === 'employee_profile' && selectedEmployee) {
      return selectedEmployee.name;
    }
    if (currentScreen === 'project_detail' && selectedProject) {
      return selectedProject.name;
    }
    if (currentScreen === 'handover_detail' && selectedHandover) {
      return `${selectedHandover.employeeName}`;
    }
    return undefined;
  };

  const activeHandoversCount = handovers.filter((h) => h.status !== 'Email Sent').length;
  const criticalProjectsCount = projects.filter(
    (p) => p.risk === 'critical' || p.busFactor === 1
  ).length;

  const overallRiskLevel =
    criticalProjectsCount > 0
      ? 'CRITICAL'
      : employees.some((e) => e.status === 'Departing' || e.risk === 'critical')
      ? 'HIGH'
      : projects.length > 0
      ? 'LOW'
      : 'NONE';

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* If on Sign In screen, render full-screen login */}
      {currentScreen === 'signin' ? (
        <SignInScreen
          onSignInSuccess={() => {
            setIsAuthenticated(true);
            setCurrentScreen('dashboard');
          }}
        />
      ) : (
        <>
          {/* Top Bar */}
          {currentScreen !== 'dashboard' && (
            <AppHeader
              currentScreen={currentScreen}
              onNavigate={(screenId) => {
                if (screenId === 'employees') setSelectedEmployee(null);
                if (screenId === 'projects') setSelectedProject(null);
                if (screenId === 'handovers') setSelectedHandover(null);
                setCurrentScreen(screenId);
              }}
              breadcrumbSubtitle={getBreadcrumbSubtitle()}
              onSignOut={handleSignOut}
              onQuickSearch={() => setIsCommandPaletteOpen(true)}
              onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
              notifications={notifications}
              onMarkAllNotificationsRead={() =>
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
              }
              adminUser={currentAdmin}
            />
          )}

          {/* Main Operational Layout with Persistent Left Sidebar */}
          <div className="flex-1 max-w-[1536px] w-full mx-auto flex">
            {/* Sidebar */}
            <Sidebar
              currentScreen={currentScreen}
              onNavigate={(screenId) => {
                if (screenId === 'employees') setSelectedEmployee(null);
                if (screenId === 'projects') setSelectedProject(null);
                if (screenId === 'handovers') setSelectedHandover(null);
                setCurrentScreen(screenId);
              }}
              activeHandoversCount={activeHandoversCount}
              criticalProjectsCount={criticalProjectsCount}
              isOpenMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              adminUser={currentAdmin}
              overallRiskLevel={overallRiskLevel}
            />

            {/* Screen Content Viewport */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
              {currentScreen === 'dashboard' && (
                <DashboardScreen
                  onNavigate={(s) => setCurrentScreen(s)}
                  employees={employees}
                  projects={projects}
                  handovers={handovers}
                  connectedResources={connectedResources}
                  adminUser={currentAdmin}
                  onSelectEmployee={handleSelectEmployee}
                  onSelectProject={handleSelectProject}
                  onSelectHandover={handleSelectHandover}
                  onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
                  onOpenConnectResource={() => {
                    setPreselectedEmpForResource(null);
                    setIsConnectResourceOpen(true);
                  }}
                  onOpenCreateHandover={() => {
                    setPreselectedEmpForHandover(null);
                    setIsCreateHandoverOpen(true);
                  }}
                  onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
                />
              )}

              {currentScreen === 'employees' && (
                <EmployeesScreen
                  employees={employees}
                  onSelectEmployee={handleSelectEmployee}
                  onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
                  onEditEmployee={handleOpenEditEmployee}
                  onDeleteEmployee={handleOpenDeleteEmployee}
                />
              )}

              {currentScreen === 'employee_profile' && selectedEmployee && (
                <EmployeeProfileScreen
                  employee={selectedEmployee}
                  allProjects={projects}
                  connectedResources={connectedResources}
                  onBackToEmployees={() => {
                    setSelectedEmployee(null);
                    setCurrentScreen('employees');
                  }}
                  onOpenConnectResource={handleOpenConnectResourceForEmployee}
                  onStartHandoverForEmployee={handleStartHandoverForEmployee}
                  onSelectProject={handleSelectProject}
                  onDisconnectResource={handleDisconnectResource}
                  onEditEmployee={handleOpenEditEmployee}
                  onDeleteEmployee={handleOpenDeleteEmployee}
                />
              )}

              {(currentScreen === 'projects' || currentScreen === 'project_detail') && (
                <ProjectsScreen
                  projects={projects}
                  selectedProject={selectedProject}
                  onSelectProject={handleSelectProject}
                  onSelectEmployeeById={handleSelectEmployeeById}
                  onOpenCreateHandover={() => {
                    setPreselectedEmpForHandover(null);
                    setIsCreateHandoverOpen(true);
                  }}
                  onOpenAddProject={() => setIsAddProjectOpen(true)}
                  onEditProject={handleOpenEditProject}
                  onDeleteProject={handleOpenDeleteProject}
                />
              )}

              {currentScreen === 'knowledge' && (
                <KnowledgeSearchScreen
                  onSelectEmployeeById={handleSelectEmployeeById}
                />
              )}

              {currentScreen === 'risk' && (
                <RiskScreen
                  projects={projects}
                  employees={employees}
                  onSelectProject={handleSelectProject}
                  onSelectEmployee={handleSelectEmployee}
                />
              )}

              {(currentScreen === 'handovers' || currentScreen === 'handover_detail') && (
                <HandoversScreen
                  handovers={handovers}
                  selectedHandover={selectedHandover}
                  onSelectHandover={handleSelectHandover}
                  onOpenCreateHandover={() => {
                    setPreselectedEmpForHandover(null);
                    setIsCreateHandoverOpen(true);
                  }}
                  onUpdateHandover={handleUpdateHandover}
                  onRevertHandover={handleRevertHandover}
                  adminUser={currentAdmin}
                />
              )}

              {currentScreen === 'connections' && (
                <ConnectionsScreen
                  connectedResources={connectedResources}
                  onOpenConnectResource={() => {
                    setPreselectedEmpForResource(null);
                    setIsConnectResourceOpen(true);
                  }}
                  onDisconnectResource={handleDisconnectResource}
                />
              )}

              {currentScreen === 'settings' && (
                <SettingsScreen
                  onNavigate={(s) => setCurrentScreen(s)}
                  adminUser={currentAdmin}
                  onUpdateAdminUser={handleUpdateAdminUser}
                  connectedResources={connectedResources}
                />
              )}
            </main>
          </div>
        </>
      )}

      {/* Global Modals */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onCreateEmployee={handleCreateEmployee}
      />

      {employeeToEdit && (
        <EditEmployeeModal
          isOpen={isEditEmployeeOpen}
          onClose={() => { setIsEditEmployeeOpen(false); setEmployeeToEdit(null); }}
          employee={employeeToEdit}
          onUpdateEmployee={(updated) => {
            handleUpdateEmployee(updated);
          }}
        />
      )}

      {projectToEdit && (
        <EditProjectModal
          isOpen={isEditProjectOpen}
          onClose={() => { setIsEditProjectOpen(false); setProjectToEdit(null); }}
          project={projectToEdit}
          onUpdateProject={(updated) => {
            handleUpdateProject(updated);
          }}
        />
      )}

      {/* Delete Employee Confirmation Dialog */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-rose-50">
              <h2 className="text-sm font-bold text-slate-900">Delete Employee</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{employeeToDelete.name} · {employeeToDelete.role}</p>
            </div>
            <div className="p-6 space-y-4 text-xs">
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">{deleteError}</div>
              )}
              <p className="text-slate-700 leading-relaxed">
                Are you sure you want to permanently delete <strong>{employeeToDelete.name}</strong>? This will also remove their connected knowledge resources and handover records. <strong className="text-rose-700">This action cannot be undone.</strong>
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setEmployeeToDelete(null); setDeleteError(''); }}
                  disabled={isDeletingEmployee}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteEmployee}
                  disabled={isDeletingEmployee}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isDeletingEmployee ? 'Deleting...' : 'Yes, Delete Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Dialog */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-rose-50">
              <h2 className="text-sm font-bold text-slate-900">Delete Project</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{projectToDelete.name} · {projectToDelete.code}</p>
            </div>
            <div className="p-6 space-y-4 text-xs">
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700">{deleteError}</div>
              )}
              <p className="text-slate-700 leading-relaxed">
                Are you sure you want to permanently delete project <strong>{projectToDelete.name}</strong>? This will also remove connected knowledge sources, risk scores, and any associated handover records. <strong className="text-rose-700">This action cannot be undone.</strong>
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setProjectToDelete(null); setDeleteError(''); }}
                  disabled={isDeletingProject}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProject}
                  disabled={isDeletingProject}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isDeletingProject ? 'Deleting...' : 'Yes, Delete Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        employees={employees}
        onProjectCreated={handleProjectCreated}
      />

      <ConnectResourceModal
        isOpen={isConnectResourceOpen}
        onClose={() => {
          setIsConnectResourceOpen(false);
          setPreselectedEmpForResource(null);
        }}
        employees={employees}
        projects={projects}
        preselectedEmployee={preselectedEmpForResource}
        onResourceConnected={handleResourceConnected}
      />

      <CreateHandoverModal
        isOpen={isCreateHandoverOpen}
        onClose={() => {
          setIsCreateHandoverOpen(false);
          setPreselectedEmpForHandover(null);
        }}
        employees={employees}
        projects={projects}
        preselectedEmployee={preselectedEmpForHandover}
        onHandoverCreated={handleHandoverCreated}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(screenId) => {
          if (screenId === 'employees') setSelectedEmployee(null);
          if (screenId === 'projects') setSelectedProject(null);
          if (screenId === 'handovers') setSelectedHandover(null);
          setCurrentScreen(screenId);
        }}
        projects={projects}
        employees={employees}
        handovers={handovers}
        onSelectProject={handleSelectProject}
        onSelectEmployee={handleSelectEmployee}
        onSelectHandover={handleSelectHandover}
      />
    </div>
  );
}

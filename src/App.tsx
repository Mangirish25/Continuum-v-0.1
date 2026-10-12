import React, { useState, useEffect } from 'react';
import {
  ScreenId,
  Employee,
  Project,
  ConnectedResource,
  Handover,
  NotificationItem,
} from './types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_PROJECTS,
  INITIAL_CONNECTED_RESOURCES,
  INITIAL_HANDOVERS,
  INITIAL_NOTIFICATIONS,
} from './data/mockData';

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
import { ConnectResourceModal } from './components/modals/ConnectResourceModal';
import { CreateHandoverModal } from './components/modals/CreateHandoverModal';
import { CommandPalette } from './components/modals/CommandPalette';

import { supabase } from './lib/supabase';
import { getSources } from './lib/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('signin');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Core domain data state
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [connectedResources, setConnectedResources] = useState<ConnectedResource[]>(
    INITIAL_CONNECTED_RESOURCES
  );
  const [handovers, setHandovers] = useState<Handover[]>(INITIAL_HANDOVERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Selected item states for detail views
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);

  // Modal open states
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
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
        // Fallback to local dev token check
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

  // Synchronize sources from Supabase / Backend API when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getSources()
        .then((sources) => {
          if (sources && sources.length > 0) {
            const mappedSources: ConnectedResource[] = sources.map((s) => ({
              id: s.id,
              sourceType: s.source_type as any,
              name: s.name,
              url: s.url,
              employeeId: s.employee_id || '',
              employeeName: s.employee_name || 'Unassigned',
              projectName: s.project_name || '',
              status: (s.status === 'READY' || s.status === 'SYNCED') ? 'connected' : (s.status.toLowerCase() as any),
              lastSynced: s.last_synced_at ? new Date(s.last_synced_at).toLocaleDateString() : 'Pending initial sync',
              details: s.last_sync_error ? `Error: ${s.last_sync_error}` : `Status: ${s.status}`,
            }));
            setConnectedResources((prev) => {
              const existingIds = new Set(mappedSources.map((m) => m.id));
              const nonOverlapping = prev.filter((p) => !existingIds.has(p.id));
              return [...mappedSources, ...nonOverlapping];
            });
          }
        })
        .catch(() => {
          // Offline/mock fallback
        });
    }
  }, [isAuthenticated]);

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

  // Handlers for Add Employee (Section 10)
  const handleCreateEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
    setSelectedEmployee(newEmp);
    // After creation, immediately take the admin to the employee profile!
    setCurrentScreen('employee_profile');

    // Add notification
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

  // Handlers for Connect Resource (Section 12)
  const handleResourceConnected = (newRes: ConnectedResource) => {
    setConnectedResources((prev) => [newRes, ...prev]);

    // Update employee's connectedSourcesCount
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === newRes.employeeId
          ? { ...e, connectedSourcesCount: e.connectedSourcesCount + 1 }
          : e
      )
    );

    // Add notification
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

  // Handlers for Handover creation & updates (Section 20 & 21)
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
          {/* Top Bar (Section 6) - Removed from the first 2 screens (Sign In & Dashboard) as requested */}
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
            />
          )}

          {/* Main Operational Layout with Persistent Left Sidebar */}
          <div className="flex-1 max-w-[1536px] w-full mx-auto flex">
            {/* Sidebar (Section 5 & 35) */}
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
            />

            {/* Screen Content Viewport */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
              {currentScreen === 'dashboard' && (
                <DashboardScreen
                  onNavigate={(s) => setCurrentScreen(s)}
                  employees={employees}
                  projects={projects}
                  handovers={handovers}
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
                <SettingsScreen onNavigate={(s) => setCurrentScreen(s)} />
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

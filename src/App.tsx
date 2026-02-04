import { TaskProvider, FilterProvider, UIProvider, TeamProvider, AuthProvider, useAuth } from './context';
import { Header, Sidebar, MainContent } from './components/layout';
import { TaskModal } from './components/task';
import { LoginPage } from './components/auth';
import './index.css';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-white)',
    }}>
      <div style={{
        padding: 'var(--space-lg)',
        background: 'var(--color-white)',
        border: 'var(--nb-border)',
        borderRadius: 'var(--nb-radius)',
        boxShadow: 'var(--nb-shadow)',
        fontFamily: 'var(--font-primary)',
        fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        Loading...
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <Header />
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <Sidebar />
        <MainContent />
      </div>
      <TaskModal />
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <TeamProvider>
      <TaskProvider>
        <FilterProvider>
          <AppLayout />
        </FilterProvider>
      </TaskProvider>
    </TeamProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AuthenticatedApp />
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

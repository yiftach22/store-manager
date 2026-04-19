import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { homePathFor } from './lib/roles';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrdersPage } from './pages/OrdersPage';
import { TasksPage } from './pages/TasksPage';
import { TaskStatusPage } from './pages/TaskStatusPage';
import { WorkerTasksPage } from './pages/WorkerTasksPage';
import { UsersPage } from './pages/UsersPage';

// Sends the user to their role-specific home. Used for the catch-all * route so
// deep-links / bad URLs bounce to the right place instead of always landing on /my-tasks.
function HomeRedirect() {
  const { user, token, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(user.role)} replace />;
}

// / is shared by MANAGER and ORDERS — managers go to /tasks/status, ORDERS stay on orders board.
function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'MANAGER') return <Navigate to="/tasks/status" replace />;
  return <OrdersPage />;
}

export function Router() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/my-tasks"
            element={
              <ProtectedRoute allow={['WORKER']}>
                <WorkerTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute allow={['MANAGER', 'ORDERS']}>
                <RootRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allow={['MANAGER', 'ORDERS']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute allow={['MANAGER']}>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/status"
            element={
              <ProtectedRoute allow={['MANAGER']}>
                <TaskStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allow={['MANAGER']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

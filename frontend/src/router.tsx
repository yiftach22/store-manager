import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrdersPage } from './pages/OrdersPage';
import { TasksPage } from './pages/TasksPage';
import { TaskStatusPage } from './pages/TaskStatusPage';
import { WorkerTasksPage } from './pages/WorkerTasksPage';
import { UsersPage } from './pages/UsersPage';

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
              <ProtectedRoute>
                <WorkerTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute managerOnly>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute managerOnly>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/status"
            element={
              <ProtectedRoute managerOnly>
                <TaskStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute managerOnly>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/my-tasks" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

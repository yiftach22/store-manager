import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  managerOnly?: boolean;
}

export function ProtectedRoute({ children, managerOnly }: Props) {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-400">טוען...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (managerOnly && user?.role !== 'MANAGER') return <Navigate to="/my-tasks" replace />;
  return <>{children}</>;
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-400">טוען...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

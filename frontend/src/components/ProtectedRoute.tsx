import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homePathFor } from '../lib/roles';
import type { Role } from '../lib/roles';

interface Props {
  children: React.ReactNode;
  /**
   * If provided, only users whose role is included here can access the route.
   * Omitted = any authenticated user is allowed.
   * Users with a mismatched role are redirected to their own home path.
   */
  allow?: Role[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-400">טוען...</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return <>{children}</>;
}

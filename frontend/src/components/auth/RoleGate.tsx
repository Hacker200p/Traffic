import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

interface Props {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only if the current user has one of the allowed roles.
 */
export default function RoleGate({ roles, children, fallback = null }: Props) {
  const { hasRole } = useAuth();
  return hasRole(...roles) ? <>{children}</> : <>{fallback}</>;
}

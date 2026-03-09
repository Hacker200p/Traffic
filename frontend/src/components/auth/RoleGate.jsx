import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useAuth } from '@/hooks/useAuth';
/**
 * Renders children only if the current user has one of the allowed roles.
 */
export default function RoleGate({ roles, children, fallback = null }) {
    const { hasRole } = useAuth();
    return hasRole(...roles) ? _jsx(_Fragment, { children: children }) : _jsx(_Fragment, { children: fallback });
}

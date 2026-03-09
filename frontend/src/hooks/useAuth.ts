import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { login, logout, fetchMe } from '@/store/slices/authSlice';
import type { LoginPayload, Role } from '@/types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, tokens, loading, error } = useAppSelector((s) => s.auth);

  const isAuthenticated = !!tokens?.accessToken && !!user;

  const handleLogin = useCallback(
    (payload: LoginPayload) => dispatch(login(payload)),
    [dispatch],
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const refreshUser = useCallback(() => dispatch(fetchMe()), [dispatch]);

  const hasRole = useCallback(
    (...roles: Role[]) => !!user && roles.includes(user.role),
    [user],
  );

  return {
    user,
    tokens,
    loading,
    error,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    refreshUser,
    hasRole,
  };
}

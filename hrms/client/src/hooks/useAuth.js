import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import useAuthStore from '../store/authStore';

export default function useAuth() {
  const { logout: storeLogout, user, isAuthenticated } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();

  const logout = useCallback(() => {
    storeLogout();
    enqueueSnackbar('已退出登录', { variant: 'info' });
  }, [storeLogout, enqueueSnackbar]);

  return { user, isAuthenticated, logout };
}

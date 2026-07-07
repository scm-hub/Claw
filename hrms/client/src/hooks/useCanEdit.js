import useAuthStore from '../store/authStore';

/**
 * 判断当前用户是否有数据编辑权限（增删改）。
 * - SUPER_ADMIN / HR_ADMIN / MANAGER → 可编辑
 * - EMPLOYEE → 仅查看
 */
export default function useCanEdit() {
  const user = useAuthStore((s) => s.user);
  return user && user.role !== 'EMPLOYEE';
}

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import TabBar from './TabBar';
import useLayoutStore from '../store/layoutStore';
import useAuthStore from '../store/authStore';

/**
 * 统一布局壳
 * - 底部 TabBar（根据角色动态配置）
 * - 内容区域（子路由渲染）
 */
export default function UnifiedLayout() {
  const tabs = useLayoutStore((s) => s.tabs);
  const loadLayout = useLayoutStore((s) => s.loadLayout);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) {
      const role = user.systemRoles?.hrms || user.role;
      loadLayout(role);
    }
  }, [user, loadLayout]);

  return (
    <Box sx={{ pb: 7, minHeight: '100vh' }}>
      <Outlet />
      <TabBar tabs={tabs} />
    </Box>
  );
}

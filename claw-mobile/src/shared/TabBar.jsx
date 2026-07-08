import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
  Home as HomeIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

const ICON_MAP = {
  home: <HomeIcon />,
  inventory: <InventoryIcon />,
  people: <PeopleIcon />,
  smart_toy: <AIIcon />,
  person: <PersonIcon />,
};

const ROUTE_MAP = {
  workbench: '/workbench',
  scm: '/scm',
  hrms: '/hrms',
  ai: '/ai',
  profile: '/profile',
};

export default function TabBar({ tabs }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据当前路径确定激活的 tab
  const currentTab = Object.keys(ROUTE_MAP).find((key) =>
    location.pathname.startsWith(ROUTE_MAP[key])
  ) || 'workbench';

  if (!tabs || tabs.length === 0) return null;

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
      elevation={3}
    >
      <BottomNavigation
        value={currentTab}
        onChange={(_, newValue) => navigate(ROUTE_MAP[newValue])}
        showLabels
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.key}
            value={tab.key}
            label={tab.label}
            icon={ICON_MAP[tab.icon] || <HomeIcon />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

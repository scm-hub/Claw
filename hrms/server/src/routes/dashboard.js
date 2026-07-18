import { Router } from 'express';
import * as dashboardService from '../services/dashboard.service.js';
import { authenticate } from '../middleware/auth.js';
import { getDepartmentIdsWithChildren } from '../middleware/departmentScope.js';

const router = Router();

router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const deptIds = await getDepartmentIdsWithChildren(req);
    const result = await dashboardService.getDashboardStats(deptIds);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;

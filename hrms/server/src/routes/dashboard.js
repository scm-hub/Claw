import { Router } from 'express';
import * as dashboardService from '../services/dashboard.service.js';
import { authenticate } from '../middleware/auth.js';
import { getDepartmentFilter } from '../middleware/departmentScope.js';

const router = Router();

router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const result = await dashboardService.getDashboardStats(departmentFilter);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;

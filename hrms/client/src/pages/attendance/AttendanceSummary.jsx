import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button,
  Collapse, IconButton, CircularProgress, Stack, Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';

const statusMap = {
  NORMAL: { label: '正常', color: 'success' },
  LATE: { label: '迟到', color: 'warning' },
  EARLY_LEAVE: { label: '早退', color: 'warning' },
  LATE_EARLY: { label: '迟到+早退', color: 'error' },
  ABSENT: { label: '缺勤', color: 'error' },
};

export default function AttendanceSummary() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [workDays, setWorkDays] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // 加载部门列表
  useEffect(() => {
    api.get('/departments').then((res) => {
      setDepartments(res.data || []);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month, page, pageSize };
      if (departmentId) params.departmentId = departmentId;
      const res = await api.get('/attendance/summary', { params });
      setSummaryData(res.data.data || []);
      setWorkDays(res.data.workDays || 0);
      setTotalEmployees(res.data.total || 0);
    } catch (err) {
      console.error('获取汇总数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [month, departmentId, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleRow = (employeeId) => {
    setExpandedRows((prev) => ({ ...prev, [employeeId]: !prev[employeeId] }));
  };

  const totalPages = Math.ceil(totalEmployees / pageSize);

  return (
    <Box>
      <PageHeader title="考勤汇总" breadcrumbs={['考勤管理', '考勤汇总']} />

      {/* 顶部统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">当月应出勤天数</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">{workDays}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">员工总数</Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">{totalEmployees}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">查询月份</Typography>
            <Typography variant="h4" fontWeight="bold">{month}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 筛选条件 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          type="month" size="small" value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); setExpandedRows({}); }}
          label="选择月份" InputLabelProps={{ shrink: true }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>部门筛选</InputLabel>
          <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); setExpandedRows({}); }} label="部门筛选">
            <MenuItem value="">全部部门</MenuItem>
            {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          共 {totalEmployees} 人 | 第 {page}/{totalPages} 页
        </Typography>
      </Box>

      {/* 汇总表格 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : summaryData.length === 0 ? (
        <Alert severity="warning">当月无考勤数据</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold', width: 40 }} />
                <TableCell sx={{ fontWeight: 'bold' }}>工号</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>姓名</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">应出勤</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">出勤天数</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">正常</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">迟到</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">早退</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">缺卡</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">缺勤</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">出勤率</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaryData.map((emp) => (
                <SummaryRow
                  key={emp.employeeId}
                  employee={emp}
                  expanded={expandedRows[emp.employeeId]}
                  onToggle={() => toggleRow(emp.employeeId)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <Typography sx={{ px: 3, py: 1 }}>第 {page} 页 / 共 {totalPages} 页</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
        </Box>
      )}
    </Box>
  );
}

/* ========= 汇总行 + 明细展开 ========= */
function SummaryRow({ employee, expanded, onToggle }) {
  const emp = employee;
  const details = emp.details || [];

  // 出勤率颜色
  const rate = parseFloat(emp.attendanceRate || 0);
  const rateColor = rate >= 95 ? 'success' : rate >= 80 ? 'warning' : 'error';

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={onToggle}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{emp.employeeNo}</TableCell>
        <TableCell sx={{ fontWeight: 'bold' }}>{emp.employeeName}</TableCell>
        <TableCell>{emp.departmentName}</TableCell>
        <TableCell align="center">{emp.workDays}</TableCell>
        <TableCell align="center">
          <Chip label={emp.presentDays} size="small" color={emp.presentDays >= emp.workDays ? 'success' : 'primary'} variant="outlined" />
        </TableCell>
        <TableCell align="center">
          <Chip label={emp.normalDays} size="small" color="success" variant="outlined" />
        </TableCell>
        <TableCell align="center">
          <Chip label={emp.lateCount} size="small" color={emp.lateCount > 0 ? 'warning' : 'default'} variant="outlined" />
        </TableCell>
        <TableCell align="center">
          <Chip label={emp.earlyLeaveCount} size="small" color={emp.earlyLeaveCount > 0 ? 'warning' : 'default'} variant="outlined" />
        </TableCell>
        <TableCell align="center">
          <Chip label={emp.missingPunchCount} size="small" color={emp.missingPunchCount > 0 ? 'warning' : 'default'} variant="outlined" />
        </TableCell>
        <TableCell align="center">
          <Chip label={emp.absentCount} size="small" color={emp.absentCount > 0 ? 'error' : 'default'} variant="outlined" />
        </TableCell>
        <TableCell align="center">
          <Chip label={`${emp.attendanceRate}%`} size="small" color={rateColor} />
        </TableCell>
      </TableRow>

      {/* 打卡明细展开 */}
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={12}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3 }}>
              {details.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                  当月无打卡记录（全部缺勤）
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>日期</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>上班时间</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>下班时间</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">打卡次数</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">状态</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">缺卡</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>打卡明细</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.map((d) => {
                      const isMissingPunch = d.punchCount === 1;
                      // 如果 punchCount == 1，clockIn === clockOut（同一次打卡既是上班也是下班）
                      const isSameInOut = d.punchCount === 1 && d.clockIn && d.clockOut
                        && new Date(d.clockIn).getTime() === new Date(d.clockOut).getTime();
                      const clockInStr = d.clockIn
                        ? new Date(d.clockIn).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                        : '-';
                      const clockOutStr = d.clockOut
                        ? new Date(d.clockOut).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                        : '-';
                      const s = statusMap[d.status] || { label: d.status, color: 'default' };

                      return (
                        <TableRow key={String(d.date)} hover>
                          <TableCell>{new Date(d.date).toLocaleDateString('zh-CN')}</TableCell>
                          <TableCell>{isSameInOut ? '-' : clockInStr}</TableCell>
                          <TableCell>{isSameInOut ? '-' : clockOutStr}</TableCell>
                          <TableCell align="center">{d.punchCount || 0}</TableCell>
                          <TableCell align="center">
                            <Chip label={s.label} color={s.color} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            {isMissingPunch ? (
                              <Chip label="缺卡" color="warning" size="small" />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {d.clockRecords && d.clockRecords.length > 0 ? (
                              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                {d.clockRecords.map((cr, idx) => (
                                  <Typography key={cr.id} variant="caption" sx={{
                                    bgcolor: idx === 0 ? 'success.light'
                                      : idx === d.clockRecords.length - 1 && d.clockRecords.length > 1 ? 'info.light'
                                      : 'grey.100',
                                    px: 1, py: 0.25, borderRadius: 1,
                                  }}>
                                    {new Date(cr.clockTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
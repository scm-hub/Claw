import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableRow, Paper } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';

export default function SalarySlip() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get('/salary/my').then((data) => setRecords(data.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <PageHeader title="我的薪资条" breadcrumbs={['薪资管理', '我的薪资']} />
      {records.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary" align="center" sx={{ py: 4 }}>暂无薪资记录</Typography></CardContent></Card>
      ) : (
        records.map((r) => (
          <Card key={r.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{r.month} 月薪资明细</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow><TableCell>基本工资</TableCell><TableCell align="right">¥{r.baseSalary?.toLocaleString()}</TableCell><TableCell>津贴</TableCell><TableCell align="right">¥{r.allowance?.toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell>加班费</TableCell><TableCell align="right">¥{r.overtime?.toLocaleString()}</TableCell><TableCell>奖金</TableCell><TableCell align="right">¥{r.bonus?.toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell>社保扣款</TableCell><TableCell align="right" sx={{ color: 'error.main' }}>-¥{r.socialIns?.toLocaleString()}</TableCell><TableCell>个税</TableCell><TableCell align="right" sx={{ color: 'error.main' }}>-¥{r.tax?.toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={2} /><TableCell sx={{ fontWeight: 'bold' }}>实发工资</TableCell><TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: 18 }}>¥{r.netSalary?.toLocaleString()}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}

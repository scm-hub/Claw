import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Accordion,
  AccordionSummary, AccordionDetails, Chip,
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, Warehouse, LocationOn } from '@mui/icons-material';
import api from '../../lib/api';

export default function ZoneLocationList() {
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState({});
  const [locations, setLocations] = useState({});
  const [zoneDialog, setZoneDialog] = useState({ open: false, warehouseId: null, data: null });
  const [locDialog, setLocDialog] = useState({ open: false, zoneId: null, warehouseId: null, data: null });
  const [zoneForm, setZoneForm] = useState({});
  const [locForm, setLocForm] = useState({});

  const loadWarehouses = async () => {
    try {
      const res = await api.get('/master/warehouses');
      const whs = res.data || [];
      setWarehouses(whs);
      // 加载每个仓库的库区
      const zonesMap = {};
      for (const wh of whs) {
        const zRes = await api.get(`/master/warehouses/${wh.id}/zones`);
        zonesMap[wh.id] = zRes.data || [];
      }
      setZones(zonesMap);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadWarehouses(); }, []);

  const loadLocations = async (zoneId) => {
    try {
      const res = await api.get(`/master/zones/${zoneId}/locations`);
      setLocations((prev) => ({ ...prev, [zoneId]: res.data || [] }));
    } catch (err) { console.error(err); }
  };

  const handleZoneSave = async () => {
    try {
      const payload = { ...zoneForm, sortOrder: zoneForm.sortOrder === '' || zoneForm.sortOrder === undefined ? 0 : Number(zoneForm.sortOrder) };
      if (zoneDialog.data) {
        await api.put(`/master/warehouses/${zoneDialog.warehouseId}/zones`, payload);
      } else {
        await api.post(`/master/warehouses/${zoneDialog.warehouseId}/zones`, payload);
      }
      setZoneDialog({ open: false, warehouseId: null, data: null });
      loadWarehouses();
    } catch (err) { alert(err.message); }
  };

  const handleLocSave = async () => {
    try {
      const payload = { ...locForm, capacity: locForm.capacity === '' || locForm.capacity === undefined ? 0 : Number(locForm.capacity) };
      if (locDialog.data) {
        await api.put(`/master/zones/${locDialog.zoneId}/locations`, payload);
      } else {
        await api.post(`/master/zones/${locDialog.zoneId}/locations`, payload);
      }
      setLocDialog({ open: false, zoneId: null, warehouseId: null, data: null });
      loadLocations(locDialog.zoneId);
    } catch (err) { alert(err.message); }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>库区库位管理</Typography>

      {warehouses.map((wh) => (
        <Accordion key={wh.id} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warehouse fontSize="small" />
              <Typography><strong>{wh.name}</strong> ({wh.code})</Typography>
              {wh.isColdStorage && <Chip size="small" label="冷链" color="info" />}
              <Chip size="small" label={`${(zones[wh.id] || []).length} 个库区`} variant="outlined" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 1 }}>
              <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => {
                setZoneForm({ name: '', code: '', zoneType: 'STORAGE', sortOrder: '', status: 'ACTIVE' });
                setZoneDialog({ open: true, warehouseId: wh.id, data: null });
              }}>新增库区</Button>
            </Box>

            {(zones[wh.id] || []).map((zone) => (
              <Accordion key={zone.id} sx={{ ml: 2 }} onChange={() => loadLocations(zone.id)}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" />
                    <Typography>{zone.name} ({zone.code})</Typography>
                    <Chip size="small" label={zone.zoneType} variant="outlined" />
                    <Chip size="small" label={`${zone._count?.locations || 0} 个库位`} color="primary" variant="outlined" />
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setZoneForm({ ...zone }); setZoneDialog({ open: true, warehouseId: wh.id, data: zone }); }}><Edit fontSize="small" /></IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => {
                      setLocForm({ name: '', code: '', barcode: '', locationType: 'STANDARD', capacity: '', status: 'ACTIVE', warehouseId: wh.id });
                      setLocDialog({ open: true, zoneId: zone.id, warehouseId: wh.id, data: null });
                    }}>新增库位</Button>
                  </Box>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>编码</TableCell><TableCell>名称</TableCell><TableCell>条码</TableCell>
                      <TableCell>类型</TableCell><TableCell>容量</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {(locations[zone.id] || []).map((loc) => (
                        <TableRow key={loc.id}>
                          <TableCell>{loc.code}</TableCell><TableCell>{loc.name}</TableCell>
                          <TableCell>{loc.barcode || '-'}</TableCell><TableCell>{loc.locationType}</TableCell>
                          <TableCell>{loc.capacity}</TableCell><TableCell>{loc.status}</TableCell>
                          <TableCell><IconButton size="small" onClick={() => { setLocForm({ ...loc }); setLocDialog({ open: true, zoneId: zone.id, warehouseId: wh.id, data: loc }); }}><Edit fontSize="small" /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {(!locations[zone.id] || locations[zone.id].length === 0) && <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary">暂无库位</Typography></TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* 库区弹窗 */}
      <Dialog open={zoneDialog.open} onClose={() => setZoneDialog({ open: false, warehouseId: null, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{zoneDialog.data ? '编辑库区' : '新增库区'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="库区名称" value={zoneForm.name || ''} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="库区编码" value={zoneForm.code || ''} onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="库区类型" value={zoneForm.zoneType || 'STORAGE'} onChange={(e) => setZoneForm({ ...zoneForm, zoneType: e.target.value })}>
                <MenuItem value="STORAGE">存储区</MenuItem><MenuItem value="RECEIPT">收货区</MenuItem>
                <MenuItem value="SHIPPING">发货区</MenuItem><MenuItem value="COLD">冷链区</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="排序" value={zoneForm.sortOrder ?? ''} onChange={(e) => setZoneForm({ ...zoneForm, sortOrder: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" onFocus={(e) => e.target.select()} inputProps={{ min: 0 }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoneDialog({ open: false, warehouseId: null, data: null })}>取消</Button>
          <Button variant="contained" onClick={handleZoneSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 库位弹窗 */}
      <Dialog open={locDialog.open} onClose={() => setLocDialog({ open: false, zoneId: null, warehouseId: null, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{locDialog.data ? '编辑库位' : '新增库位'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="库位名称" value={locForm.name || ''} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="库位编码" value={locForm.code || ''} onChange={(e) => setLocForm({ ...locForm, code: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="条码" value={locForm.barcode || ''} onChange={(e) => setLocForm({ ...locForm, barcode: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="库位类型" value={locForm.locationType || 'STANDARD'} onChange={(e) => setLocForm({ ...locForm, locationType: e.target.value })}>
                <MenuItem value="STANDARD">标准</MenuItem><MenuItem value="BULK">散货</MenuItem><MenuItem value="COLD">冷链</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="容量" value={locForm.capacity ?? ''} onChange={(e) => setLocForm({ ...locForm, capacity: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" onFocus={(e) => e.target.select()} inputProps={{ min: 0 }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocDialog({ open: false, zoneId: null, warehouseId: null, data: null })}>取消</Button>
          <Button variant="contained" onClick={handleLocSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// 流程模板管理页面 — 三级级联：子系统 → 模块 → 业务类型

import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, IconButton, Tooltip, ToggleButton, ToggleButtonGroup,
  Switch, FormControlLabel, MenuItem, Select, InputLabel, FormControl,
  Autocomplete,
} from '@mui/material';
import { ViewList, AccountTree } from '@mui/icons-material';
import FlowCanvas from './FlowCanvas';
import { Add, Edit, Delete } from '@mui/icons-material';
import wfApi from '../../api/workflow';
import axios from 'axios';

const SYSTEM_LABEL = {
  scm: '供应链管理',
  hrms: '人事管理',
  portal: '综合平台',
  mdm: '主数据管理',
};

// 条件分支运算符
const OPERATORS = [
  { label: '≥', value: '>=' },
  { label: '≤', value: '<=' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '=', value: '==' },
  { label: '≠', value: '!=' },
];

// 条件分支字段变量（按业务类型）
const CONDITION_VARIABLES = {
  sales_order: [
    { label: '订单编号', field: 'orderNo', type: 'text' },
    { label: '客户名称', field: 'customerName', type: 'text' },
    { label: '业务员', field: 'salesRepName', type: 'text' },
    { label: '订单日期', field: 'orderDate', type: 'text' },
    { label: '总金额', field: 'totalAmount', type: 'number' },
    { label: '综合成本毛利率', field: 'marginRate', type: 'number' },
    { label: '最低成本毛利率', field: 'minMarginRate', type: 'number' },
  ],
  purchase_order: [
    { label: '订单金额', field: 'totalAmount', type: 'number' },
    { label: '物料数量', field: 'itemCount', type: 'number' },
    { label: '供应商名称', field: 'supplierName', type: 'text' },
  ],
  purchase_plan: [
    { label: '计划金额', field: 'totalAmount', type: 'number' },
    { label: '物料数量', field: 'itemCount', type: 'number' },
  ],
  purchase_return: [
    { label: '退货金额', field: 'totalAmount', type: 'number' },
    { label: '物料数量', field: 'itemCount', type: 'number' },
  ],
  sales_return: [
    { label: '退货金额', field: 'totalAmount', type: 'number' },
    { label: '物料数量', field: 'itemCount', type: 'number' },
  ],
  sales_plan: [
    { label: '计划金额', field: 'totalAmount', type: 'number' },
    { label: '物料数量', field: 'itemCount', type: 'number' },
  ],
  sales_delivery: [
    { label: '发货金额', field: 'totalAmount', type: 'number' },
    { label: '物料数量', field: 'itemCount', type: 'number' },
  ],
  sales_settlement: [
    { label: '结算金额', field: 'totalAmount', type: 'number' },
  ],
  inbound_order: [
    { label: '入库金额', field: 'totalAmount', type: 'number' },
    { label: '入库数量', field: 'qty', type: 'number' },
  ],
  outbound_order: [
    { label: '出库金额', field: 'totalAmount', type: 'number' },
    { label: '出库数量', field: 'qty', type: 'number' },
  ],
  transfer_order: [
    { label: '调拨金额', field: 'totalAmount', type: 'number' },
    { label: '调拨数量', field: 'qty', type: 'number' },
  ],
  delivery_order: [
    { label: '发货金额', field: 'totalAmount', type: 'number' },
    { label: '发货数量', field: 'qty', type: 'number' },
  ],
  payment_request: [
    { label: '付款金额', field: 'amount', type: 'number' },
  ],
  receipt_request: [
    { label: '收款金额', field: 'amount', type: 'number' },
  ],
  quality_check: [
    { label: '质检数量', field: 'qty', type: 'number' },
    { label: '合格率', field: 'passRate', type: 'number' },
  ],
  contract: [
    { label: '合同金额', field: 'totalAmount', type: 'number' },
    { label: '合同类型', field: 'contractType', type: 'text' },
  ],
  aftersales_request: [
    { label: '售后金额', field: 'totalAmount', type: 'number' },
    { label: '售后类型', field: 'aftersalesType', type: 'text' },
  ],
  entry: [
    { label: '入职日期', field: 'entryDate', type: 'text' },
    { label: '部门', field: 'department', type: 'text' },
  ],
  exit: [
    { label: '离职日期', field: 'exitDate', type: 'text' },
    { label: '部门', field: 'department', type: 'text' },
  ],
  transfer: [
    { label: '调岗日期', field: 'transferDate', type: 'text' },
    { label: '原部门', field: 'fromDept', type: 'text' },
    { label: '目标部门', field: 'toDept', type: 'text' },
  ],
  leave_request: [
    { label: '请假天数', field: 'leaveDays', type: 'number' },
    { label: '请假类型', field: 'leaveType', type: 'text' },
  ],
  overtime_request: [
    { label: '加班小时', field: 'overtimeHours', type: 'number' },
    { label: '加班日期', field: 'overtimeDate', type: 'text' },
  ],
  salary_adjustment: [
    { label: '调薪金额', field: 'adjustAmount', type: 'number' },
    { label: '调薪比例', field: 'adjustPercent', type: 'number' },
  ],
  recruitment_request: [
    { label: '招聘人数', field: 'recruitCount', type: 'number' },
    { label: '薪资范围', field: 'salaryRange', type: 'text' },
  ],
  training_request: [
    { label: '培训人数', field: 'trainingCount', type: 'number' },
    { label: '培训费用', field: 'trainingCost', type: 'number' },
  ],
  performance_review: [
    { label: '绩效分数', field: 'score', type: 'number' },
    { label: '考核等级', field: 'grade', type: 'text' },
  ],
};

/**
 * 解析条件表达式（如 "marginRate >= 25"）
 */
function parseCondition(expr) {
  if (!expr || expr === 'default') return null;
  const match = expr.match(/^([a-zA-Z_]\w*)\s*(>=|<=|>|<|==|!=)\s*(.*)$/);
  if (!match) return null;
  return { fieldName: match[1], operator: match[2], value: match[3] };
}

// 默认级联数据（前端兜底，优先从后端 /system-modules 获取）
const DEFAULT_MODULES = {
  scm: [
    { code: 'purchase', name: '采购管理', businessTypes: [
      { code: 'purchase_order', name: '采购订单审批' },
      { code: 'purchase_return', name: '采购退货审批' },
      { code: 'purchase_plan', name: '采购计划审批' },
    ]},
    { code: 'sales', name: '销售管理', businessTypes: [
      { code: 'sales_order', name: '销售订单审批' },
      { code: 'sales_return', name: '销售退货审批' },
      { code: 'sales_plan', name: '销售计划审批' },
      { code: 'sales_delivery', name: '销售发货审批' },
      { code: 'sales_settlement', name: '销售结算审批' },
    ]},
    { code: 'warehouse', name: '仓库管理', businessTypes: [
      { code: 'inbound_order', name: '入库审批' },
      { code: 'outbound_order', name: '出库审批' },
      { code: 'transfer_order', name: '调拨审批' },
    ]},
    { code: 'finance', name: '财务管理', businessTypes: [
      { code: 'payment_request', name: '付款审批' },
      { code: 'receipt_request', name: '收款审批' },
    ]},
    { code: 'logistics', name: '物流管理', businessTypes: [
      { code: 'delivery_order', name: '发货审批' },
    ]},
    { code: 'quality', name: '质量管理', businessTypes: [
      { code: 'quality_check', name: '质检审批' },
    ]},
    { code: 'contract', name: '合同管理', businessTypes: [
      { code: 'contract', name: '合同审批' },
    ]},
    { code: 'aftersales', name: '售后服务', businessTypes: [
      { code: 'aftersales_request', name: '售后审批' },
    ]},
  ],
  hrms: [
    { code: 'employee', name: '员工管理', businessTypes: [
      { code: 'entry', name: '入职审批' },
      { code: 'exit', name: '离职审批' },
      { code: 'transfer', name: '调岗审批' },
    ]},
    { code: 'attendance', name: '考勤管理', businessTypes: [
      { code: 'leave_request', name: '请假审批' },
      { code: 'overtime_request', name: '加班审批' },
    ]},
    { code: 'salary', name: '薪资管理', businessTypes: [
      { code: 'salary_adjustment', name: '薪资调整审批' },
    ]},
    { code: 'recruitment', name: '招聘管理', businessTypes: [
      { code: 'recruitment_request', name: '招聘审批' },
    ]},
    { code: 'training', name: '培训管理', businessTypes: [
      { code: 'training_request', name: '培训审批' },
    ]},
    { code: 'performance', name: '绩效管理', businessTypes: [
      { code: 'performance_review', name: '绩效审批' },
    ]},
  ],
  mdm: [
    { code: 'department', name: '部门管理', businessTypes: [
      { code: 'department_change', name: '部门变更审批' },
    ]},
    { code: 'employee-sync', name: '人员同步', businessTypes: [
      { code: 'employee_sync', name: '人员同步审批' },
    ]},
    { code: 'material', name: '物料管理', businessTypes: [
      { code: 'material_change', name: '物料变更审批' },
    ]},
    { code: 'customer', name: '客户管理', businessTypes: [
      { code: 'customer_change', name: '客户变更审批' },
    ]},
    { code: 'supplier', name: '供应商管理', businessTypes: [
      { code: 'supplier_change', name: '供应商变更审批' },
    ]},
  ],
  portal: [
    { code: 'access', name: '权限管理', businessTypes: [
      { code: 'access_change', name: '权限变更审批' },
    ]},
    { code: 'workflow', name: '审批工作台', businessTypes: [] },
    { code: 'logs', name: '操作日志', businessTypes: [] },
  ],
};

// businessType → 中文名查找（跨系统全局）
const BUSINESS_TYPE_LABELS = {};
Object.values(DEFAULT_MODULES).forEach(modules => {
  modules.forEach(m => {
    (m.businessTypes || []).forEach(bt => {
      BUSINESS_TYPE_LABELS[bt.code] = bt.name;
    });
  });
});

export default function FlowTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editorMode, setEditorMode] = useState('canvas'); // 'canvas' | 'list'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [moduleMap, setModuleMap] = useState(DEFAULT_MODULES);

  const [form, setForm] = useState({
    name: '',
    businessType: '',
    system: 'scm',
    module: '',
    description: '',
    nodes: [{ id: '1', name: '审批节点1', type: 'role', approverRole: '' }],
    connections: [],
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadTemplates();
    loadModules();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('sso_token');
      const resp = await axios.get('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.data?.success) {
        setUsers(resp.data.data || []);
      }
    } catch {
      // 静默忽略：用户可能无权限或后端不可用，仍允许手填
    }
  };

  const loadModules = async () => {
    try {
      const resp = await wfApi.get('/system-modules');
      if (resp.success && resp.data) {
        const map = {};
        resp.data.forEach(sys => {
          map[sys.code] = sys.modules;
          // 同步全局 businessType labels
          sys.modules.forEach(m => {
            (m.businessTypes || []).forEach(bt => {
              BUSINESS_TYPE_LABELS[bt.code] = bt.name;
            });
          });
        });
        setModuleMap(map);
      }
    } catch {
      // 使用默认兜底数据
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const resp = await wfApi.get('/templates');
      if (resp.success) {
        setTemplates(resp.data || []);
      }
    } catch (err) {
      setError('加载模板失败');
    }
    setLoading(false);
  };

  const handleSave = async (dataOverride) => {
    try {
      // 存储为 { nodes, connections } 新格式
      const useNodes = dataOverride?.nodes || form.nodes;
      const useConns = dataOverride?.connections || (form.connections || []);
      const payload = {
        ...form,
        nodes: {
          nodes: useNodes,
          connections: useConns,
          endPositionX: dataOverride?.endPositionX,
          endPositionY: dataOverride?.endPositionY,
        },
      };
      const resp = await wfApi.post('/templates', payload);
      if (resp.success) {
        setSuccess('模板保存成功');
        setEditDialog(false);
        loadTemplates();
      }
    } catch (err) {
      setError(err.message || '保存失败');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      const resp = await wfApi.put(`/templates/${id}`, { isActive: !isActive });
      if (resp.success) {
        loadTemplates();
      }
    } catch (err) {
      setError(err.message || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      const resp = await wfApi.delete(`/templates/${id}`);
      if (resp.success) {
        setSuccess('模板已停用');
        loadTemplates();
      }
    } catch (err) {
      setError(err.message || '操作失败');
    }
  };

  const openEdit = (template = null) => {
    if (template) {
      // 兼容旧格式
      let rawNodes = template.nodes || [];
      let connections = [];
      let endPositionX, endPositionY;
      if (rawNodes && !Array.isArray(rawNodes) && rawNodes.nodes) {
        connections = rawNodes.connections || [];
        endPositionX = rawNodes.endPositionX;
        endPositionY = rawNodes.endPositionY;
        rawNodes = rawNodes.nodes;
      }
      rawNodes = rawNodes.map(n => ({ ...n, id: n.id || n.nodeId, name: n.name || n.nodeName }));
      setForm({
        id: template.id,
        name: template.name,
        businessType: template.businessType,
        system: template.system,
        module: template.module || '',
        description: template.description,
        nodes: rawNodes.length > 0 ? rawNodes : [{ id: '1', name: '审批节点1', type: 'role', approverRole: '' }],
        connections,
        endPositionX,
        endPositionY,
      });
    } else {
      setForm({
        name: '',
        businessType: '',
        system: 'scm',
        module: '',
        description: '',
        nodes: [{ id: '1', name: '审批节点1', type: 'role', approverRole: '' }],
        connections: [],
      });
    }
    setEditDialog(true);
  };

  // 级联联动：切换子系统 → 清空 module + businessType
  const handleSystemChange = (newSystem) => {
    setForm({ ...form, system: newSystem, module: '', businessType: '' });
  };

  // 级联联动：切换模块 → 清空 businessType
  const handleModuleChange = (newModule) => {
    setForm({ ...form, module: newModule, businessType: '' });
  };

  const addNode = () => {
    const newNodeId = String(form.nodes.length + 1);
    setForm({
      ...form,
      nodes: [...form.nodes, { id: newNodeId, name: `审批节点${newNodeId}`, type: 'role', approverRole: '' }],
    });
  };

  const removeNode = (index) => {
    if (form.nodes.length <= 1) return;
    setForm({
      ...form,
      nodes: form.nodes.filter((_, i) => i !== index).map((n, i) => ({ ...n, nodeId: String(i + 1) })),
    });
  };

  const updateNode = (index, field, value) => {
    const newNodes = [...form.nodes];
    newNodes[index] = { ...newNodes[index], [field]: value };
    // 切换到条件分支类型时，初始化 branches 数组
    if (field === 'type' && value === 'condition' && !newNodes[index].branches) {
      newNodes[index] = { ...newNodes[index], branches: [{ condition: 'default', targetNodeName: '' }] };
    }
    setForm({ ...form, nodes: newNodes });
  };

  // 连线操作
  const addConnection = () => {
    const nodes = (form.nodes || []);
    const fromId = nodes.length > 0 ? (nodes[0].id || nodes[0].nodeId) : '1';
    const toId = nodes.length > 1 ? (nodes[1].id || nodes[1].nodeId) : 'end';
    setForm({
      ...form,
      connections: [...(form.connections || []), { from: fromId, to: toId, condition: 'default' }],
    });
  };
  const updateConnection = (idx, field, value) => {
    const conns = [...(form.connections || [])];
    conns[idx] = { ...conns[idx], [field]: value };
    setForm({ ...form, connections: conns });
  };
  const removeConnection = (idx) => {
    const conns = [...(form.connections || [])];
    conns.splice(idx, 1);
    setForm({ ...form, connections: conns });
  };

  // 获取当前子系统对应的模块列表
  const currentModules = moduleMap[form.system] || [];

  // 获取当前模块对应的业务类型列表
  const currentBusinessTypes = (() => {
    const mod = currentModules.find(m => m.code === form.module);
    return mod ? (mod.businessTypes || []) : [];
  })();

  // 模块 label 查找
  const getModuleLabel = (systemCode, moduleCode) => {
    const mods = moduleMap[systemCode] || [];
    const found = mods.find(m => m.code === moduleCode);
    return found ? found.name : moduleCode;
  };

  // businessType 中文 label
  const getBusinessTypeLabel = (btCode) => {
    return BUSINESS_TYPE_LABELS[btCode] || btCode;
  };

  // 编辑时如果 businessType 不在当前模块的选项中，追加为自定义选项（兼容旧数据）
  const businessTypeOptions = (() => {
    const options = [...currentBusinessTypes];
    if (form.businessType && !options.find(o => o.code === form.businessType)) {
      options.push({ code: form.businessType, name: getBusinessTypeLabel(form.businessType) });
    }
    return options;
  })();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        流程模板管理
      </Typography>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      <Button variant="contained" startIcon={<Add />} onClick={() => openEdit()} sx={{ mb: 3 }}>
        新增模板
      </Button>

      {loading ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : (
        <Stack spacing={2}>
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {t.name}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1} alignItems="center">
                    <Chip label={getBusinessTypeLabel(t.businessType)} size="small" color="primary" variant="outlined" />
                    <Chip label={SYSTEM_LABEL[t.system] || t.system} size="small" />
                    {t.module && <Chip label={getModuleLabel(t.system, t.module)} size="small" color="secondary" />}
                    <Chip label={`${t.nodes?.length || 0} 个节点`} size="small" />
                    <FormControlLabel
                      control={<Switch checked={t.isActive} onChange={() => handleToggleActive(t.id, t.isActive)} />}
                      label={t.isActive ? '启用' : '停用'}
                      sx={{ ml: 1 }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {t.description}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    {(Array.isArray(t.nodes) ? t.nodes : t.nodes?.nodes || []).map((n, i) => (
                      <Chip key={i} label={`${n.name || n.nodeName} (${n.type === 'condition' ? '条件分支' : n.type === 'role' ? n.approverRole : n.type === 'dept_manager' ? '部门主管' : n.type === 'person' ? '固定人员' : n.type === 'countersign' ? '会签' : n.type === 'any_sign' ? '或签' : n.type})`} size="small" variant="outlined" color={n.type === 'condition' ? 'secondary' : 'default'} />
                    ))}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="编辑">
                    <IconButton onClick={() => openEdit(t)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="停用">
                    <IconButton color="error" onClick={() => handleDelete(t.id)}><Delete /></IconButton>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 编辑模板对话框 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {form.id ? '编辑流程模板' : '新增流程模板'}
          <ToggleButtonGroup value={editorMode} exclusive size="small" onChange={(_,v) => v && setEditorMode(v)}>
            <ToggleButton value="canvas"><AccountTree sx={{ fontSize: 18, mr: 0.5 }} />画布</ToggleButton>
            <ToggleButton value="list"><ViewList sx={{ fontSize: 18, mr: 0.5 }} />列表</ToggleButton>
          </ToggleButtonGroup>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="模板名称" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

            {/* 级联第一级：所属系统 */}
            <FormControl fullWidth>
              <InputLabel>所属系统</InputLabel>
              <Select label="所属系统" value={form.system} onChange={(e) => handleSystemChange(e.target.value)}>
                <MenuItem value="scm">供应链管理</MenuItem>
                <MenuItem value="hrms">人事管理</MenuItem>
                <MenuItem value="portal">综合平台</MenuItem>
                <MenuItem value="mdm">主数据管理</MenuItem>
              </Select>
            </FormControl>

            {/* 级联第二级：所属模块（根据系统动态过滤） */}
            <FormControl fullWidth>
              <InputLabel>所属模块</InputLabel>
              <Select label="所属模块" value={form.module} onChange={(e) => handleModuleChange(e.target.value)}>
                <MenuItem value="">请选择模块</MenuItem>
                {currentModules.map((m) => (
                  <MenuItem key={m.code} value={m.code}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 级联第三级：业务类型（根据系统+模块动态过滤） */}
            <FormControl fullWidth>
              <InputLabel>业务类型</InputLabel>
              <Select label="业务类型" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                disabled={!form.module}>
                <MenuItem value="">请选择业务类型</MenuItem>
                {businessTypeOptions.map((bt) => (
                  <MenuItem key={bt.code} value={bt.code}>{bt.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="描述" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            {editorMode === 'list' && (<>
            <Typography variant="subtitle2" fontWeight={600} mt={2}>
              审批节点配置
            </Typography>

            {form.nodes.map((node, i) => (
              <Card key={i} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">节点 {i + 1}（ID: {node.id || node.nodeId}）</Typography>
                  <TextField label="节点名称" size="small" fullWidth value={node.name || node.nodeName || ''} onChange={(e) => updateNode(i, 'name', e.target.value)} required />
                  <FormControl fullWidth size="small">
                    <InputLabel>节点类型</InputLabel>
                    <Select label="节点类型" value={node.type} onChange={(e) => updateNode(i, 'type', e.target.value)}>
                      <MenuItem value="role">角色审批</MenuItem>
                      <MenuItem value="person">固定人员</MenuItem>
                      <MenuItem value="dept_manager">部门主管</MenuItem>
                      <MenuItem value="countersign">会签（全部通过）</MenuItem>
                      <MenuItem value="any_sign">或签（一人通过）</MenuItem>
                      <MenuItem value="condition">条件分支</MenuItem>
                    </Select>
                  </FormControl>
                  {node.type === 'role' && (
                    <TextField label="审批角色（如 PURCHASE_MANAGER、SALES_MANAGER）" size="small" fullWidth value={node.approverRole || ''} onChange={(e) => updateNode(i, 'approverRole', e.target.value)} />
                  )}
                  {node.type === 'person' && (
                    <Autocomplete
                      size="small"
                      options={users}
                      getOptionLabel={(option) => option.name ? `${option.name} (${option.globalId || option.employeeNo || option.id})` : option.globalId || option.employeeNo || option.id || ''}
                      value={users.find(u => u.globalId === node.approverUserId || u.id === node.approverUserId) || null}
                      onChange={(e, newVal) => updateNode(i, 'approverUserId', newVal?.globalId || newVal?.id || '')}
                      renderInput={(params) => (
                        <TextField {...params} label="选择审批人" placeholder="输入姓名、工号或ID搜索" />
                      )}
                      filterOptions={(options, state) => {
                        const kw = state.inputValue.toLowerCase();
                        return options.filter(u =>
                          (u.name && u.name.toLowerCase().includes(kw)) ||
                          (u.employeeNo && u.employeeNo.toLowerCase().includes(kw)) ||
                          (u.globalId && u.globalId.toLowerCase().includes(kw))
                        );
                      }}
                      isOptionEqualToValue={(option, value) => option.globalId === value.globalId || option.id === value.id}
                      noOptionsText="无匹配用户"
                    />
                  )}
                  {node.type === 'condition' && (
                    <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem', py: 0.5 }}>
                      条件分支的路由规则请在下方<strong>「连线配置」</strong>中设置：从该条件节点出发，连接不同的目标节点并配置条件表达式。
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" color="error" onClick={() => removeNode(i)} disabled={form.nodes.length <= 1}>
                      删除节点
                    </Button>
                  </Box>
                </Stack>
              </Card>
            ))}
            <Button variant="outlined" onClick={addNode}>添加审批节点</Button>

            {/* === 连线配置 === */}
            <Typography variant="subtitle2" fontWeight={600} mt={2}>
              连线配置
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                （连线决定流程走向，目标为"结束"则该节点审批完即完成）
              </Typography>
            </Typography>
            {(form.connections || []).map((conn, ci) => {
              const nodesOpts = (form.nodes || []);
              const parsed = parseCondition(conn.condition);
              const isSimple = conn.condition !== 'default' && parsed !== null && !conn.condition?.includes('&&') && !conn.condition?.includes('||');
              const varOptions = CONDITION_VARIABLES[form.businessType] || [];
              return (
                <Stack key={ci} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>起点节点</InputLabel>
                    <Select value={conn.from || ''} label="起点节点" onChange={e => updateConnection(ci, 'from', e.target.value)}>
                      {nodesOpts.map(n => (
                        <MenuItem key={n.id || n.nodeId} value={n.id || n.nodeId}>{n.name || n.nodeName} ({n.type})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2">→</Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>目标节点</InputLabel>
                    <Select value={conn.to || ''} label="目标节点" onChange={e => updateConnection(ci, 'to', e.target.value)}>
                      {nodesOpts.map(n => (
                        <MenuItem key={n.id || n.nodeId} value={n.id || n.nodeId}>{n.name || n.nodeName} ({n.type})</MenuItem>
                      ))}
                      <MenuItem value="end">结束（流程完成）</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary">条件</Typography>
                  {conn.condition === 'default' ? (
                    <Box sx={{ px: 1, py: 0.5, bgcolor: '#e3f2fd', borderRadius: 1, fontSize: '0.8rem', color: '#1976d2', fontWeight: 600, border: '1px solid #bbdefb' }}>默认</Box>
                  ) : isSimple ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select value={parsed.fieldName} onChange={e => {
                          updateConnection(ci, 'condition', `${e.target.value} ${parsed.operator || '>='} ${parsed.value}`);
                        }}>
                          {varOptions.map(v => <MenuItem key={v.field} value={v.field}>{v.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 60 }}>
                        <Select value={parsed.operator || '>='} onChange={e => {
                          updateConnection(ci, 'condition', `${parsed.fieldName} ${e.target.value} ${parsed.value}`);
                        }}>
                          {OPERATORS.map(op => <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField size="small" value={parsed.value} placeholder="值" sx={{ width: 70 }} onChange={e => {
                        updateConnection(ci, 'condition', `${parsed.fieldName} ${parsed.operator || '>='} ${e.target.value}`);
                      }} inputProps={{ style: { textAlign: 'center' } }} />
                    </Stack>
                  ) : (
                    <TextField size="small" value={conn.condition || ''} placeholder="条件表达式，如 marginRate >= 25" onChange={e => updateConnection(ci, 'condition', e.target.value)} sx={{ flex: 1, minWidth: 160 }} InputProps={{ sx: { fontSize: '0.8rem' } }} />
                  )}
                  <Button size="small" color="error" sx={{ minWidth: 32 }} onClick={() => removeConnection(ci)}>✕</Button>
                </Stack>
              );
            })}
            <Button size="small" variant="text" onClick={addConnection} sx={{ fontSize: '0.75rem' }}>
              + 添加连线
            </Button>
          </>)}
          </Stack>
          {editorMode !== 'list' && (
            <FlowCanvas
              initialNodes={form.nodes}
              initialConnections={form.connections || []}
              endPositionX={form.endPositionX}
              endPositionY={form.endPositionY}
              businessType={form.businessType}
              users={users}
              onSave={(data) => {
                handleSave(data);
              }}
              onCancel={() => setEditDialog(false)}
            />
          )}
        </DialogContent>
        {editorMode === 'list' && (
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>取消</Button>
            <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.businessType}>保存模板</Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}

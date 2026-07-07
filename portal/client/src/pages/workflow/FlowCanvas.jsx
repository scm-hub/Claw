import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box, Typography, Stack, Button, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select,
  MenuItem, FormControl, InputLabel, Autocomplete,
} from '@mui/material';
import { CallSplit, Person, Group, Shield, HowToVote, CheckCircle, Close } from '@mui/icons-material';

// ============================================================
// 颜色 & 图标映射
// ============================================================
const NODE_STYLE = {
  condition:    { bg: '#fff3e0', border: '#ff9800', icon: <CallSplit />,     label: '条件分支',  defaultName: '条件判断' },
  role:         { bg: '#e3f2fd', border: '#2196f3', icon: <Shield />,         label: '角色审批',  defaultName: '角色审批' },
  person:       { bg: '#f3e5f5', border: '#9c27b0', icon: <Person />,         label: '固定人员',  defaultName: '固定人员审批' },
  dept_manager: { bg: '#e8f5e9', border: '#4caf50', icon: <Group />,          label: '部门主管',  defaultName: '部门主管审批' },
  countersign:  { bg: '#fff8e1', border: '#ffc107', icon: <HowToVote />,      label: '会签',     defaultName: '会签审批' },
  any_sign:     { bg: '#fce4ec', border: '#e91e63', icon: <CheckCircle />,    label: '或签',     defaultName: '或签审批' },
};
// 结束节点
const END_STYLE = { bg: '#e0e0e0', border: '#9e9e9e' };

// 拖入工具栏节点类型
const TOOLBAR_TYPES = ['condition', 'role', 'person', 'dept_manager', 'countersign', 'any_sign'];

// ============================================================
// 条件变量 & 运算符
// ============================================================
const OPERATORS = [
  { label: '≥', value: '>=' }, { label: '≤', value: '<=' },
  { label: '>', value: '>' },  { label: '<', value: '<' },
  { label: '=', value: '==' }, { label: '≠', value: '!=' },
];

function parseCondition(expr) {
  if (!expr || expr === 'default') return null;
  const match = expr.match(/^([a-zA-Z_]\w*)\s*(>=|<=|>|<|==|!=)\s*(.*)$/);
  if (!match) return null;
  return { fieldName: match[1], operator: match[2], value: match[3] };
}

// ============================================================
// 自定义节点（审批节点）
// ============================================================
function ApproverNode({ data }) {
  const style = NODE_STYLE[data.nodeType] || NODE_STYLE.role;
  return (
    <Box sx={{
      minWidth: 160, px: 1.5, py: 1,
      bgcolor: style.bg, border: `2px solid ${style.border}`,
      borderRadius: 1.5, fontSize: 13, fontWeight: 600,
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Top} />
      <Stack direction="row" spacing={0.5} alignItems="center">
        {style.icon}
        <Typography variant="body2" fontWeight={600} fontSize={13}>{data.label || style.defaultName}</Typography>
      </Stack>
      {data.approver && (
        <Typography variant="caption" color="text.secondary">{data.approver}</Typography>
      )}
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
}

// 条件节点
function ConditionNode({ data }) {
  const style = NODE_STYLE.condition;
  return (
    <Box sx={{
      minWidth: 140, px: 1.5, py: 1,
      bgcolor: style.bg, border: `2px solid ${style.border}`,
      borderRadius: 1.5, fontSize: 13, fontWeight: 600,
      transform: 'skewX(-8deg)',
    }}>
      <Handle type="target" position={Position.Top} />
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ transform: 'skewX(8deg)' }}>
        <CallSplit />
        <Typography variant="body2" fontWeight={600} fontSize={13}>{data.label || '条件判断'}</Typography>
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
}

// 结束节点
function EndNode() {
  return (
    <Box sx={{
      minWidth: 80, px: 2, py: 0.8,
      bgcolor: END_STYLE.bg, border: `2px solid ${END_STYLE.border}`,
      borderRadius: 3, textAlign: 'center',
    }}>
      <Handle type="target" position={Position.Top} />
      <Typography variant="body2" fontWeight={600} color="text.secondary">结束</Typography>
    </Box>
  );
}

const nodeTypes = { approver: ApproverNode, condition: ConditionNode, end: EndNode };

// ============================================================
// 自定义连线（显示条件标签 + 编辑按钮）
// ============================================================
function ConditionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <Box
          component="span"
          onClick={(e) => { e.stopPropagation(); data?.onEdit?.(id); }}
          sx={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            bgcolor: data?.condition === 'default' ? '#e3f2fd' : '#fff',
            px: 0.8, py: 0.3, borderRadius: 1,
            border: '1px solid #ccc', fontSize: 11, cursor: 'pointer',
            whiteSpace: 'nowrap', pointerEvents: 'all',
            color: data?.condition === 'default' ? '#1976d2' : 'inherit',
            fontWeight: data?.condition === 'default' ? 600 : 400,
          }}
        >
          {data?.label || (data?.condition === 'default' ? '默认' : data?.condition || '')}
        </Box>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { conditionEdge: ConditionEdge };

// ============================================================
// 从 form 数据生成 ReactFlow nodes/edges
// ============================================================
function formToFlow(formNodes, formConns, endPositionOverride) {
  const flowNodes = [];
  const flowEdges = [];
  const usedNodeIds = new Set();
  let autoId = 0;

  const nextId = () => { autoId++; const id = `copy_${autoId}`; while (usedNodeIds.has(id)) { autoId++; return `copy_${autoId}`; } return id; };

  // 生成审批节点位置（垂直排列 + 条件分支时水平展开）
  let x = 250, y = 80;
  for (const n of formNodes || []) {
    const nid = n.id || n.nodeId || nextId();
    usedNodeIds.add(nid);
    const style = NODE_STYLE[n.type] || NODE_STYLE.role;
    const isCondition = n.type === 'condition';
    const hasStoredPos = typeof n.positionX === 'number' && typeof n.positionY === 'number';
    const autoPos = isCondition
      ? { x, y: 60 }
      : { x: 100 + (parseInt(n.id || '0', 10) % 3) * 280, y: 160 + Math.floor((parseInt(n.id || '1', 10) - 1) / 3) * 120 };
    flowNodes.push({
      id: nid,
      type: isCondition ? 'condition' : 'approver',
      position: hasStoredPos ? { x: n.positionX, y: n.positionY } : autoPos,
      data: {
        nodeType: n.type,
        label: n.name || n.nodeName || style.defaultName,
        approver: n.type === 'person' ? (n.approverName || n.approverUserId || '') : (n.type === 'role' ? `角色: ${n.approverRole || ''}` : ''),
        approverRole: n.approverRole,
        approverUserId: n.approverUserId,
        approverName: n.approverName,
        approverEmail: n.approverEmail,
        timeout: n.timeout,
        timeoutAction: n.timeoutAction,
      },
    });
  }

  // 结束节点（使用保存的位置，没有则用默认位置）
  const endId = 'end_node';
  const endX = endPositionOverride?.x ?? 250;
  const endY = endPositionOverride?.y ?? 380;
  flowNodes.push({
    id: endId,
    type: 'end',
    position: { x: endX, y: endY },
    data: {},
  });

  // 生成连线
  for (const c of formConns || []) {
    const targetId = c.to === 'end' ? endId : c.to;
    const label = c.condition === 'default' ? '默认' : (c.condition || '');
    flowEdges.push({
      id: `e_${c.from}_${c.to}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: c.from,
      target: targetId,
      type: 'conditionEdge',
      data: { condition: c.condition, label, onEdit: null /* filled later */ },
    });
  }

  return { flowNodes, flowEdges, endId };
}

// 从画布生成 form 数据
function flowToForm(flowNodes, flowEdges, endId) {
  const nodes = [];
  for (const n of flowNodes) {
    if (n.type === 'end') continue;
    nodes.push({
      id: n.id,
      name: n.data?.label || '',
      type: n.data?.nodeType || 'role',
      approverRole: n.data?.approverRole || '',
      approverUserId: n.data?.approverUserId || '',
      approverName: n.data?.approverName || '',
      approverEmail: n.data?.approverEmail || '',
      timeout: n.data?.timeout || 24,
      timeoutAction: n.data?.timeoutAction || 'remind',
      positionX: n.position.x,
      positionY: n.position.y,
    });
  }
  // 保存结束节点位置
  const endNode = flowNodes.find(n => n.type === 'end');
  const endPositionX = endNode ? endNode.position.x : 250;
  const endPositionY = endNode ? endNode.position.y : 380;

  const connections = [];
  for (const e of flowEdges) {
    if (!e.source || !e.target) continue;
    connections.push({
      from: e.source,
      to: e.target === endId ? 'end' : e.target,
      condition: e.data?.condition || 'default',
    });
  }
  return { nodes, connections, endPositionX, endPositionY };
}

// ============================================================
// 主画布组件
// ============================================================
export default function FlowCanvas({ initialNodes, initialConnections, businessType, users, onSave, onCancel, endPositionX, endPositionY }) {
  const { flowNodes: initFNodes, flowEdges: initFEdges, endId: initEndId } = useMemo(
    () => formToFlow(initialNodes || [], initialConnections || [],
      { x: endPositionX, y: endPositionY }),
    [] // only on mount
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initFNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initFEdges);
  const [endId] = useState(initEndId);
  const [selectedEdge, setSelectedEdge] = useState(null); // 正在编辑条件的连线
  const [edgeDialog, setEdgeDialog] = useState(false);
  const [editingCondition, setEditingCondition] = useState('');
  const [editingEdgeId, setEditingEdgeId] = useState(null);

  // 节点属性编辑
  const [nodeEditDialog, setNodeEditDialog] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingNodeData, setEditingNodeData] = useState({});

  const currentIdCounter = useMemo(() => {
    let max = 0;
    for (const n of nodes) {
      const num = parseInt(n.id, 10);
      if (!isNaN(num) && num > max) max = num;
    }
    return max + 1;
  }, [nodes]);

  // 连线创建
  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      type: 'conditionEdge',
      id: `e_${params.source}_${params.target}_${Date.now()}`,
      data: { condition: 'default', label: '默认', onEdit: null },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // 点击连线标签编辑条件
  const onEdgeClick = useCallback((id) => {
    const edge = edges.find(e => e.id === id);
    if (!edge) return;
    setEditingEdgeId(id);
    setEditingCondition(edge.data?.condition || 'default');
    setEdgeDialog(true);
  }, [edges]);

  // 双击节点编辑属性
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'end') return; // 结束节点不可编辑
    setEditingNodeId(node.id);
    setEditingNodeData({ ...node.data });
    setNodeEditDialog(true);
  }, []);

  const saveNodeEdit = () => {
    setNodes((nds) => nds.map(n => {
      if (n.id !== editingNodeId) return n;
      const style = NODE_STYLE[editingNodeData.nodeType] || NODE_STYLE.role;
      let approverStr = '';
      if (editingNodeData.nodeType === 'person') {
        approverStr = editingNodeData.approverName || editingNodeData.approverUserId || '';
      } else if (editingNodeData.nodeType === 'role') {
        approverStr = `角色: ${editingNodeData.approverRole || ''}`;
      }
      return {
        ...n,
        type: editingNodeData.nodeType === 'condition' ? 'condition' : 'approver',
        data: { ...editingNodeData, label: editingNodeData.label || style.defaultName, approver: approverStr },
      };
    }));
    setNodeEditDialog(false);
  };

  // 给已存在的连线重新挂载 onEdit（因为 edges 引用在变）
  const edgesWithEdit = useMemo(() => edges.map(e => ({
    ...e,
    data: { ...e.data, onEdit: onEdgeClick },
  })), [edges, onEdgeClick]);

  // 工具栏拖拽
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = { x: event.clientX - event.currentTarget.getBoundingClientRect().left - 80, y: event.clientY - event.currentTarget.getBoundingClientRect().top - 20 };
    const style = NODE_STYLE[type] || NODE_STYLE.role;
    const newId = String(currentIdCounter + nodes.length);
    setNodes((nds) => [...nds, {
      id: newId,
      type: type === 'condition' ? 'condition' : 'approver',
      position,
      data: { nodeType: type, label: style.defaultName, approver: '' },
    }]);
  }, [currentIdCounter, nodes.length, setNodes]);

  // 保存
  const handleSave = () => {
    const { nodes: newNodes, connections: newConns, endPositionX, endPositionY } = flowToForm(nodes, edges, endId);
    onSave({ nodes: newNodes, connections: newConns, endPositionX, endPositionY });
  };

  // 条件编辑对话框
  const saveEdgeCondition = () => {
    setEdges((eds) => eds.map(e =>
      e.id === editingEdgeId
        ? { ...e, data: { ...e.data, condition: editingCondition, label: editingCondition === 'default' ? '默认' : editingCondition } }
        : e
    ));
    setEdgeDialog(false);
    setSelectedEdge(null);
  };

  // 条件编辑快捷 UI
  const condParsed = parseCondition(editingCondition);
  const isSimple = editingCondition !== 'default' && condParsed !== null && !editingCondition?.includes('&&') && !editingCondition?.includes('||');
  const varOptions = (() => {
    const vars = {
      sales_order: [
        { field: 'orderNo', label: '订单编号' },
        { field: 'customerName', label: '客户名称' },
        { field: 'salesRepName', label: '业务员' },
        { field: 'orderDate', label: '订单日期' },
        { field: 'totalAmount', label: '总金额' },
        { field: 'marginRate', label: '综合成本毛利率' },
        { field: 'minMarginRate', label: '最低成本毛利率' },
      ],
      purchase_order: [{ field: 'totalAmount', label: '采购金额' }, { field: 'itemCount', label: '物料数量' }],
    };
    return vars[businessType] || [{ field: 'marginRate', label: '条件字段' }];
  })();

  return (
    <Box sx={{ height: 520, border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
      {/* 工具栏 */}
      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: '60%' }}>
        {TOOLBAR_TYPES.map(t => {
          const style = NODE_STYLE[t];
          return (
            <Button
              key={t}
              size="small"
              variant="outlined"
              draggable
              onDragStart={(e) => onDragStart(e, t)}
              sx={{
                fontSize: 11, py: 0.3, px: 1,
                bgcolor: style.bg, borderColor: style.border, color: 'text.primary',
                '&:hover': { bgcolor: style.bg, borderColor: style.border },
              }}
              startIcon={style.icon}
            >
              {style.label}
            </Button>
          );
        })}
      </Box>

      {/* 底部按钮 */}
      <Box sx={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, display: 'flex', gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onCancel}>取消</Button>
        <Button variant="contained" size="small" onClick={handleSave}>保存模板</Button>
      </Box>

      <ReactFlow
        nodes={nodes}
        edges={edgesWithEdit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDoubleClick={onNodeDoubleClick}
        deleteKeyCode={['Delete', 'Backspace']}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: 'conditionEdge' }}
      >
        <Controls />
        <Background gap={16} size={1} />
        <MiniMap nodeColor={(n) => {
          const style = NODE_STYLE[n.data?.nodeType];
          return style ? style.border : '#999';
        }} />
      </ReactFlow>

      {/* 条件编辑对话框 */}
      <Dialog open={edgeDialog} onClose={() => setEdgeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑连线条件</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingCondition === 'default' ? (
              <Button variant="outlined" onClick={() => setEditingCondition('marginRate >= 0')}
                sx={{ alignSelf: 'flex-start', fontSize: 13 }}>
                改为具体条件
              </Button>
            ) : isSimple ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>字段</InputLabel>
                  <Select value={condParsed.fieldName} label="字段" onChange={e => setEditingCondition(`${e.target.value} ${condParsed.operator} ${condParsed.value}`)}>
                    {varOptions.map(v => <MenuItem key={v.field} value={v.field}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 70 }}>
                  <InputLabel>运算符</InputLabel>
                  <Select value={condParsed.operator} label="运算符" onChange={e => setEditingCondition(`${condParsed.fieldName} ${e.target.value} ${condParsed.value}`)}>
                    {OPERATORS.map(op => <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="值" value={condParsed.value} sx={{ width: 80 }} onChange={e => setEditingCondition(`${condParsed.fieldName} ${condParsed.operator} ${e.target.value}`)} />
              </Stack>
            ) : (
              <TextField label="条件表达式" fullWidth value={editingCondition} onChange={e => setEditingCondition(e.target.value)}
                helperText="例: marginRate >= 25 或 default（兜底）" />
            )}
            <Button variant="text" size="small" color="warning" sx={{ alignSelf: 'flex-start' }}
              onClick={() => setEditingCondition('default')}>
              改为默认分支
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdgeDialog(false)}>取消</Button>
          <Button variant="contained" onClick={saveEdgeCondition}>确定</Button>
        </DialogActions>
      </Dialog>

      {/* 节点属性编辑对话框 */}
      <Dialog open={nodeEditDialog} onClose={() => setNodeEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑节点属性</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="节点名称" fullWidth value={editingNodeData.label || ''}
              onChange={e => setEditingNodeData(prev => ({ ...prev, label: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>节点类型</InputLabel>
              <Select label="节点类型" value={editingNodeData.nodeType || 'role'}
                onChange={e => setEditingNodeData(prev => ({ ...prev, nodeType: e.target.value }))}>
                <MenuItem value="role">角色审批</MenuItem>
                <MenuItem value="person">固定人员</MenuItem>
                <MenuItem value="dept_manager">部门主管</MenuItem>
                <MenuItem value="countersign">会签（全部通过）</MenuItem>
                <MenuItem value="any_sign">或签（一人通过）</MenuItem>
                <MenuItem value="condition">条件分支</MenuItem>
              </Select>
            </FormControl>
            {editingNodeData.nodeType === 'role' && (
              <TextField label="审批角色（英文code）" fullWidth value={editingNodeData.approverRole || ''}
                onChange={e => setEditingNodeData(prev => ({ ...prev, approverRole: e.target.value }))}
                helperText="如: SALES_MANAGER, PURCHASE_MANAGER" />
            )}
            {editingNodeData.nodeType === 'person' && (
              <Autocomplete
                options={users || []}
                getOptionLabel={(opt) => `${opt.name || ''} (${opt.globalId || opt.id || ''})`}
                value={(users || []).find(u => u.globalId === editingNodeData.approverUserId || u.id === editingNodeData.approverUserId) || null}
                onChange={(_, val) => {
                  setEditingNodeData(prev => ({
                    ...prev,
                    approverUserId: val?.globalId || val?.id || '',
                    approverName: val?.name || '',
                    approverEmail: val?.email || '',
                  }));
                }}
                isOptionEqualToValue={(opt, val) => opt.globalId === val || opt.id === val}
                renderInput={(params) => <TextField {...params} label="审批人" size="small" />}
                noOptionsText="无匹配用户"
                filterOptions={(options, { inputValue }) =>
                  options.filter(o =>
                    (o.name || '').includes(inputValue) ||
                    (o.globalId || '').includes(inputValue) ||
                    (o.email || '').includes(inputValue)
                  )
                }
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={saveNodeEdit}>确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

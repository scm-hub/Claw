import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Select, MenuItem, InputLabel, FormControl, Grid, Divider, Typography, Alert, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tabs, Tab, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, FormControlLabel, Avatar, Tooltip, Stack, Link } from '@mui/material';
import { ArrowBack as BackIcon, SwapHoriz as HandoverIcon, CheckCircle as SuccessIcon, Add as AddIcon, Delete as DeleteIcon, Upload as UploadIcon, PhotoCamera as PhotoIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';
import { useSnackbar } from 'notistack';

// 资源路径补全：DB 存 /uploads/xxx，网关需 /hrms/uploads/xxx
const assetUrl = (p) => {
  if (!p) return undefined;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return p.startsWith('/uploads') ? base + p : p;
};

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEdit = useCanEdit();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(id);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]); // 从岗位管理获取
  const [managedDepts, setManagedDepts] = useState([]); // 该员工管理的部门
  const [activeEmployees, setActiveEmployees] = useState([]); // 在职员工列表（选新负责人用）
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [newManagerId, setNewManagerId] = useState(null);
  const [form, setForm] = useState({
    name: '', gender: 'MALE', idCard: '', birthday: '', ethnicity: '', politicalStatus: '',
    maritalStatus: '', education: '', school: '', major: '',
    phone: '', email: '', emergencyContact: '', emergencyPhone: '',
    positionTitle: '', positionId: '', departmentId: '', hireDate: new Date().toISOString().slice(0, 10),
    baseSalary: 0, status: 'ACTIVE', currentAddress: '', permanentAddress: '',
    leaveDate: '', handoverNote: '',
    accountPassword: '123456', accountRole: 'EMPLOYEE',
    photo: '', hasPrivateCar: false, carPlate: '', jobLevel: '', rank: '',
    isAccommodated: false, accommodationStartDate: '',
    criminalRecordUrl: '', tempContractUrl: '', hasGroupInsurance: false, hasSignedContract: false,
  });
  const [accountResult, setAccountResult] = useState(null); // 创建成功后的账号信息
  const [activeTab, setActiveTab] = useState(0);
  // 子表数据
  const [educations, setEducations] = useState([]);
  const [workExperiences, setWorkExperiences] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [certs, setCerts] = useState([]);
  const [positionRecords, setPositionRecords] = useState([]);
  const photoInputRef = useRef(null);

  const ethnicities = ['汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族', '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族', '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族', '其他'];
  const politicalOptions = ['群众', '共青团员', '中共党员', '中共预备党员', '民主党派', '无党派人士'];
  const maritalOptions = ['未婚', '已婚', '离异', '丧偶'];
  const educationOptions = ['初中', '高中', '中专', '大专', '本科', '硕士', '博士', '其他'];

  // 普通员工不允许进入编辑页面，跳回详情
  useEffect(() => {
    if (!canEdit && id) {
      navigate(`/employees/${id}`, { replace: true });
    } else if (!canEdit && !id) {
      navigate('/employees', { replace: true });
    }
  }, [canEdit, id, navigate]);

  useEffect(() => {
    api.get('/departments/flat').then((res) => setDepartments(res.data || [])).catch(() => {});
    api.get('/positions?isActive=true').then((res) => setPositions(res.data || [])).catch(() => {});
    if (isEdit) {
      api.get(`/employees/${id}`).then((res) => {
        const emp = res.data;
        setManagedDepts(emp.managedDepts || []);
        setForm({
          name: emp.name || '',
          gender: emp.gender || 'MALE',
          idCard: emp.idCard || '',
          birthday: emp.birthday ? new Date(emp.birthday).toISOString().slice(0, 10) : '',
          ethnicity: emp.ethnicity || '',
          politicalStatus: emp.politicalStatus || '',
          maritalStatus: emp.maritalStatus || '',
          education: emp.education || '',
          school: emp.school || '',
          major: emp.major || '',
          phone: emp.phone || '',
          email: emp.email || '',
          emergencyContact: emp.emergencyContact || '',
          emergencyPhone: emp.emergencyPhone || '',
          positionTitle: emp.positionTitle || emp.position?.name || '',
          positionId: emp.positionId || '',
          status: emp.status || 'ACTIVE',
          hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().slice(0, 10) : '',
          baseSalary: emp.baseSalary ?? 0,
          departmentId: emp.departmentId || '',
          currentAddress: emp.currentAddress || '',
          permanentAddress: emp.permanentAddress || '',
          leaveDate: emp.leaveDate ? new Date(emp.leaveDate).toISOString().slice(0, 10) : '',
          handoverNote: emp.handoverNote || '',
          photo: emp.photo || '',
          hasPrivateCar: emp.hasPrivateCar || false,
          carPlate: emp.carPlate || '',
          jobLevel: emp.jobLevel || '',
          rank: emp.rank || '',
          isAccommodated: emp.isAccommodated || false,
          accommodationStartDate: emp.accommodationStartDate ? new Date(emp.accommodationStartDate).toISOString().slice(0, 10) : '',
          criminalRecordUrl: emp.criminalRecordUrl || '',
          tempContractUrl: emp.tempContractUrl || '',
          hasGroupInsurance: emp.hasGroupInsurance || false,
          hasSignedContract: emp.hasSignedContract || false,
        });
        // 加载子表
        setEducations(emp.educations || []);
        setWorkExperiences(emp.workExperiences || []);
        setFamilyMembers(emp.familyMembers || []);
        setEmergencyContacts(emp.emergencyContacts || []);
        setLanguages(emp.languages || []);
        setCerts(emp.certs || []);
        setPositionRecords(emp.positionRecords || []);
      }).catch(() => {});
    }
  }, [id]);

  // 加载在职员工列表（用于选择新负责人）
  useEffect(() => {
    if (form.status === 'RESIGNED' && managedDepts.length > 0) {
      api.get('/employees?pageSize=1000&status=ACTIVE').then((res) => {
        const emps = res.data?.data || res.data || [];
        // 排除当前员工
        setActiveEmployees(emps.filter(e => e.id !== id));
      }).catch(() => {});
    }
  }, [form.status, managedDepts.length, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      enqueueSnackbar('姓名不能为空', { variant: 'error' });
      return;
    }
    if (!form.departmentId) {
      enqueueSnackbar('请选择所属部门', { variant: 'error' });
      return;
    }

    // 离职交接校验
    if (form.status === 'RESIGNED' && managedDepts.length > 0 && !newManagerId) {
      enqueueSnackbar('该员工是部门负责人，请先指定新的负责人', { variant: 'error' });
      setHandoverDialogOpen(true);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        gender: form.gender,
        idCard: form.idCard || '',
        birthday: form.birthday || '',
        ethnicity: form.ethnicity || '',
        politicalStatus: form.politicalStatus || '',
        maritalStatus: form.maritalStatus || '',
        education: form.education || '',
        school: form.school || '',
        major: form.major || '',
        phone: form.phone || '',
        email: form.email || '',
        emergencyContact: form.emergencyContact || '',
        emergencyPhone: form.emergencyPhone || '',
        positionTitle: form.positionId ? (positions.find(p => p.id === form.positionId)?.name || form.positionTitle) : (form.positionTitle || ''),
        positionId: form.positionId || null,
        status: form.status,
        departmentId: form.departmentId,
        hireDate: form.hireDate || new Date().toISOString().slice(0, 10),
        baseSalary: Number(form.baseSalary) || 0,
        currentAddress: form.currentAddress || '',
        permanentAddress: form.permanentAddress || '',
        handoverNote: form.handoverNote || '',
        photo: form.photo || '',
        hasPrivateCar: form.hasPrivateCar,
        carPlate: form.carPlate || '',
        jobLevel: form.jobLevel || '',
        rank: form.rank || '',
        isAccommodated: form.isAccommodated,
        accommodationStartDate: form.accommodationStartDate || '',
        criminalRecordUrl: form.criminalRecordUrl || '',
        tempContractUrl: form.tempContractUrl || '',
        hasGroupInsurance: form.hasGroupInsurance,
        hasSignedContract: form.hasSignedContract,
      };

      // 编辑时携带子表数据
      if (isEdit) {
        payload.educations = educations;
        payload.workExperiences = workExperiences;
        payload.familyMembers = familyMembers;
        payload.emergencyContacts = emergencyContacts;
        payload.languages = languages;
        payload.certs = certs;
        payload.positionRecords = positionRecords;
      }

      // 离职时自动填充离职日期
      if (form.status === 'RESIGNED' && !form.leaveDate) {
        payload.leaveDate = new Date().toISOString().slice(0, 10);
      } else if (form.leaveDate) {
        payload.leaveDate = form.leaveDate;
      }

      // 离职交接：传新负责人ID
      if (form.status === 'RESIGNED' && managedDepts.length > 0 && newManagerId) {
        payload.newManagerId = newManagerId;
      }

      if (isEdit) {
        await api.put(`/employees/${id}`, payload);
        enqueueSnackbar('更新成功', { variant: 'success' });
      } else {
        // 新增时传递账号信息
        payload.accountPassword = form.accountPassword || '123456';
        payload.accountRole = form.accountRole || 'EMPLOYEE';
        const res = await api.post('/employees', payload);
        enqueueSnackbar('创建成功', { variant: 'success' });
        // 显示账号信息
        if (res.data?.account) {
          setAccountResult(res.data.account);
          return; // 不跳转，先展示账号信息
        }
      }
      navigate('/employees');
    } catch (err) {
      enqueueSnackbar(err.message || '操作失败', { variant: 'error' });
    }
  };

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      // 切换部门时，如果当前岗位不属于新部门，则清空岗位选择
      if (field === 'departmentId' && prev.positionId) {
        const stillValid = positions.find((p) => p.id === prev.positionId && (!p.departmentId || p.departmentId === val));
        if (!stillValid) {
          next.positionId = '';
          next.positionTitle = '';
        }
      }
      return next;
    });
    // 选择离职时，弹出交接对话框
    if (field === 'status' && val === 'RESIGNED' && managedDepts.length > 0) {
      setHandoverDialogOpen(true);
    }
  };

  // 身份证号自动解析：出生日期、性别、年龄
  const calcAge = (birthdayStr) => {
    if (!birthdayStr) return '';
    const birth = new Date(birthdayStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : '';
  };

  const [autoAge, setAutoAge] = useState('');

  const handleIdCardChange = (e) => {
    const val = e.target.value.trim();
    setForm((prev) => ({ ...prev, idCard: val }));

    // 18位身份证号校验
    if (/^\d{17}[\dXx]$/.test(val)) {
      // 出生日期：第7-14位 YYYYMMDD
      const year = val.substring(6, 10);
      const month = val.substring(10, 12);
      const day = val.substring(12, 14);
      const birthdayStr = `${year}-${month}-${day}`;

      // 校验日期合法性
      const dateObj = new Date(birthdayStr);
      if (dateObj instanceof Date && !isNaN(dateObj) && dateObj.getFullYear() === parseInt(year)) {
        setForm((prev) => ({ ...prev, birthday: birthdayStr }));
        setAutoAge(calcAge(birthdayStr));
      }

      // 性别：第17位奇数=男，偶数=女
      const genderDigit = parseInt(val.charAt(16));
      if (!isNaN(genderDigit)) {
        setForm((prev) => ({ ...prev, gender: genderDigit % 2 === 1 ? 'MALE' : 'FEMALE' }));
      }

      enqueueSnackbar('已自动识别出生日期、性别、默认密码', { variant: 'info', autoHideDuration: 2000 });

      // 身份证后6位自动填充为默认登录密码
      const defaultPwd = val.slice(-6);
      setForm((prev) => ({ ...prev, accountPassword: defaultPwd }));
    } else {
      setAutoAge('');
    }
  };


  const renderSelect = (label, field, options, required = false) => (
    <FormControl fullWidth margin="normal" required={required}>
      <InputLabel>{label}</InputLabel>
      <Select value={form[field]} onChange={handleChange(field)} label={label}>
        <MenuItem value="" disabled>请选择</MenuItem>
        {options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
      </Select>
    </FormControl>
  );

  // ── 照片上传 ──
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!id) { enqueueSnackbar('请先创建员工后再上传照片', { variant: 'warning' }); return; }
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await api.post(`/employees/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, photo: res.data.url }));
      enqueueSnackbar('照片上传成功', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('照片上传失败', { variant: 'error' });
    }
  };

  // ── 通用附件上传 ──
  const handleAttachmentUpload = async (file, callback) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/employees/upload-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      callback(res.data.url);
    } catch (err) {
      enqueueSnackbar('附件上传失败', { variant: 'error' });
    }
  };

  // ── 子表操作 helpers ──
  const addRow = (setter, emptyRow) => setter(prev => [...prev, { ...emptyRow }]);
  const updateRow = (setter, idx, field, value) => setter(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  const removeRow = (setter, idx) => setter(prev => prev.filter((_, i) => i !== idx));

  return (
    <Box>
      <PageHeader title={isEdit ? '编辑员工' : '新增员工'} breadcrumbs={['员工管理', isEdit ? '编辑' : '新增']} />
      <Button startIcon={<BackIcon />} onClick={() => navigate('/employees')} sx={{ mb: 2 }}>返回列表</Button>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {/* 基本信息 */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: 'primary.main' }}>基本信息</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Avatar src={assetUrl(form.photo)} sx={{ width: 100, height: 100, border: '2px dashed', borderColor: 'divider' }} />
                  <Button size="small" startIcon={<PhotoIcon />} component="label" variant="outlined">
                    上传照片
                    <input type="file" hidden accept="image/*" ref={photoInputRef} onChange={handlePhotoUpload} />
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={10}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="姓名" value={form.name} onChange={handleChange('name')} required margin="normal" />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel>性别</InputLabel>
                      <Select value={form.gender} onChange={handleChange('gender')} label="性别">
                        <MenuItem value="MALE">男</MenuItem>
                        <MenuItem value="FEMALE">女</MenuItem>
                        <MenuItem value="OTHER">其他</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="身份证号" value={form.idCard} onChange={handleIdCardChange} margin="normal" inputProps={{ maxLength: 18 }} placeholder="输入18位身份证号自动识别" helperText={form.idCard && !/^\d{17}[\dXx]$/.test(form.idCard) ? '身份证号格式不正确' : '输入后自动识别出生日期和性别'} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth type="date" label="出生日期" value={form.birthday} onChange={(e) => { handleChange('birthday')(e); setAutoAge(calcAge(e.target.value)); }} margin="normal" InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="年龄" value={autoAge !== '' ? `${autoAge}岁` : (form.birthday ? `${calcAge(form.birthday)}岁` : '')} margin="normal" slotProps={{ input: { readOnly: true } }} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'action.hover' } }} />
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSelect('民族', 'ethnicity', ethnicities)}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSelect('政治面貌', 'politicalStatus', politicalOptions)}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSelect('婚姻状况', 'maritalStatus', maritalOptions)}
              </Grid>
            </Grid>

            {/* 教育信息 */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>教育信息</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                {renderSelect('学历', 'education', educationOptions)}
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="毕业院校" value={form.school} onChange={handleChange('school')} margin="normal" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="专业" value={form.major} onChange={handleChange('major')} margin="normal" />
              </Grid>
            </Grid>

            {/* 联系信息 */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>联系信息</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="手机号" value={form.phone} onChange={handleChange('phone')} margin="normal" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="邮箱" value={form.email} onChange={handleChange('email')} margin="normal" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="现住址" value={form.currentAddress} onChange={handleChange('currentAddress')} margin="normal" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="户籍地址" value={form.permanentAddress} onChange={handleChange('permanentAddress')} margin="normal" />
              </Grid>
            </Grid>

            {/* 工作信息 */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>工作信息</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>部门</InputLabel>
                  <Select value={form.departmentId} onChange={handleChange('departmentId')} label="部门 *">
                    <MenuItem value="" disabled>请选择部门</MenuItem>
                    {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>岗位</InputLabel>
                  <Select value={form.positionId} onChange={handleChange('positionId')} label="岗位" disabled={!form.departmentId}>
                    <MenuItem value="">未指定</MenuItem>
                    {positions
                      .filter((p) => !p.departmentId || p.departmentId === form.departmentId)
                      .map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}{p.level ? ` [${p.level}]` : ''}
                        </MenuItem>
                      ))}
                  </Select>
                  {!form.departmentId && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>请先选择部门</Typography>}
                </FormControl>
              </Grid>              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" label="入职日期" value={form.hireDate} onChange={handleChange('hireDate')} margin="normal" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>状态</InputLabel>
                  <Select value={form.status} onChange={handleChange('status')} label="状态">
                    <MenuItem value="ACTIVE">在职</MenuItem>
                    <MenuItem value="INACTIVE">停职</MenuItem>
                    <MenuItem value="RESIGNED">离职</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="基本工资" value={form.baseSalary} onChange={handleChange('baseSalary')} margin="normal" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="岗位级别" value={form.jobLevel} onChange={handleChange('jobLevel')} margin="normal" placeholder="如：P1、P2、M1" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="职级" value={form.rank} onChange={handleChange('rank')} margin="normal" placeholder="如：初级、中级、高级" />
              </Grid>
            </Grid>

            {/* 私家车 & 住宿信息 */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>其他信息</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={form.hasPrivateCar} onChange={e => setForm(prev => ({ ...prev, hasPrivateCar: e.target.checked }))} />}
                  label="有私家车"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="车牌号" value={form.carPlate} onChange={handleChange('carPlate')} margin="normal" disabled={!form.hasPrivateCar} placeholder="如：鲁A12345" />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={form.isAccommodated} onChange={e => setForm(prev => ({ ...prev, isAccommodated: e.target.checked }))} />}
                  label="是否住宿"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth type="date" label="住宿开始日期" value={form.accommodationStartDate} onChange={handleChange('accommodationStartDate')} margin="normal" InputLabelProps={{ shrink: true }} disabled={!form.isAccommodated} />
              </Grid>
            </Grid>

            {/* 合同 & 保险信息 */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>合同与保险</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={form.hasSignedContract} onChange={e => setForm(prev => ({ ...prev, hasSignedContract: e.target.checked }))} />}
                  label="是否签订合同"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={form.hasGroupInsurance} onChange={e => setForm(prev => ({ ...prev, hasGroupInsurance: e.target.checked }))} />}
                  label="是否缴纳团险"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="outlined" component="label" startIcon={<AttachFileIcon />}
                    disabled={!id}
                  >
                    上传无犯罪记录证明
                    <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (!id) { enqueueSnackbar('请先创建员工后再上传', { variant: 'warning' }); return; }
                      handleAttachmentUpload(file, (url) => {
                        setForm(prev => ({ ...prev, criminalRecordUrl: url }));
                        enqueueSnackbar('无犯罪记录证明上传成功', { variant: 'success' });
                      });
                    }} />
                  </Button>
                  {form.criminalRecordUrl && (
                    <Link href={assetUrl(form.criminalRecordUrl)} target="_blank" rel="noopener" sx={{ fontSize: 13 }}>查看文件</Link>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="outlined" component="label" startIcon={<AttachFileIcon />}
                    disabled={!id}
                  >
                    上传临时合同信息
                    <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (!id) { enqueueSnackbar('请先创建员工后再上传', { variant: 'warning' }); return; }
                      handleAttachmentUpload(file, (url) => {
                        setForm(prev => ({ ...prev, tempContractUrl: url }));
                        enqueueSnackbar('临时合同信息上传成功', { variant: 'success' });
                      });
                    }} />
                  </Button>
                  {form.tempContractUrl && (
                    <Link href={assetUrl(form.tempContractUrl)} target="_blank" rel="noopener" sx={{ fontSize: 13 }}>查看文件</Link>
                  )}
                </Stack>
              </Grid>
            </Grid>

            {/* ── 扩展信息 Tab（仅编辑时显示）── */}
            {isEdit && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4, mb: 1, color: 'primary.main' }}>扩展信息</Typography>
                <Divider sx={{ mb: 2 }} />
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
                  <Tab label="教育经历" />
                  <Tab label="工作经历" />
                  <Tab label="家庭成员" />
                  <Tab label="紧急联系人" />
                  <Tab label="语言能力" />
                  <Tab label="职业资格/证书" />
                  <Tab label="内部任职记录" />
                </Tabs>

                {/* Tab 0: 教育经历 */}
                {activeTab === 0 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setEducations, { schoolName: '', major: '', graduationDate: '', degreeCertNo: '', diplomaCertNo: '', attachment: '' })}>
                      添加教育经历
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>学校名称</TableCell>
                            <TableCell>专业</TableCell>
                            <TableCell>毕业时间</TableCell>
                            <TableCell>学历证书编号</TableCell>
                            <TableCell>学位证书编号</TableCell>
                            <TableCell>附件</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {educations.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {educations.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.schoolName} onChange={e => updateRow(setEducations, idx, 'schoolName', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.major} onChange={e => updateRow(setEducations, idx, 'major', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell><TextField size="small" type="date" value={row.graduationDate ? new Date(row.graduationDate).toISOString().slice(0, 10) : ''} onChange={e => updateRow(setEducations, idx, 'graduationDate', e.target.value)} sx={{ width: 140 }} InputLabelProps={{ shrink: true }} /></TableCell>
                              <TableCell><TextField size="small" value={row.diplomaCertNo} onChange={e => updateRow(setEducations, idx, 'diplomaCertNo', e.target.value)} sx={{ width: 130 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.degreeCertNo} onChange={e => updateRow(setEducations, idx, 'degreeCertNo', e.target.value)} sx={{ width: 130 }} /></TableCell>
                              <TableCell>
                                <Button size="small" component="label" startIcon={<UploadIcon />}>
                                  {row.attachment ? '已上传' : '上传'}
                                  <input type="file" hidden onChange={e => handleAttachmentUpload(e.target.files[0], url => updateRow(setEducations, idx, 'attachment', url))} />
                                </Button>
                              </TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setEducations, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Tab 1: 工作经历 */}
                {activeTab === 1 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setWorkExperiences, { companyName: '', industry: '', position: '', startDate: '', endDate: '', leaveReason: '', leaveCertUrl: '', lastSalary: 0, attachment: '' })}>
                      添加工作经历
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>单位名称</TableCell>
                            <TableCell>行业</TableCell>
                            <TableCell>岗位</TableCell>
                            <TableCell>入职日期</TableCell>
                            <TableCell>离职日期</TableCell>
                            <TableCell>离职原因</TableCell>
                            <TableCell>离职薪资</TableCell>
                            <TableCell>离职证明</TableCell>
                            <TableCell>附件</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {workExperiences.length === 0 && <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {workExperiences.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.companyName} onChange={e => updateRow(setWorkExperiences, idx, 'companyName', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.industry} onChange={e => updateRow(setWorkExperiences, idx, 'industry', e.target.value)} sx={{ width: 80 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.position} onChange={e => updateRow(setWorkExperiences, idx, 'position', e.target.value)} sx={{ width: 80 }} /></TableCell>
                              <TableCell><TextField size="small" type="date" value={row.startDate ? new Date(row.startDate).toISOString().slice(0, 10) : ''} onChange={e => updateRow(setWorkExperiences, idx, 'startDate', e.target.value)} sx={{ width: 130 }} InputLabelProps={{ shrink: true }} /></TableCell>
                              <TableCell><TextField size="small" type="date" value={row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : ''} onChange={e => updateRow(setWorkExperiences, idx, 'endDate', e.target.value)} sx={{ width: 130 }} InputLabelProps={{ shrink: true }} /></TableCell>
                              <TableCell><TextField size="small" value={row.leaveReason} onChange={e => updateRow(setWorkExperiences, idx, 'leaveReason', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell><TextField size="small" type="number" value={row.lastSalary} onChange={e => updateRow(setWorkExperiences, idx, 'lastSalary', e.target.value)} sx={{ width: 80 }} /></TableCell>
                              <TableCell>
                                <Button size="small" component="label" startIcon={<UploadIcon />}>
                                  {row.leaveCertUrl ? '已上传' : '上传'}
                                  <input type="file" hidden onChange={e => handleAttachmentUpload(e.target.files[0], url => updateRow(setWorkExperiences, idx, 'leaveCertUrl', url))} />
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button size="small" component="label" startIcon={<UploadIcon />}>
                                  {row.attachment ? '已上传' : '上传'}
                                  <input type="file" hidden onChange={e => handleAttachmentUpload(e.target.files[0], url => updateRow(setWorkExperiences, idx, 'attachment', url))} />
                                </Button>
                              </TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setWorkExperiences, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Tab 2: 家庭成员 */}
                {activeTab === 2 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setFamilyMembers, { name: '', idCard: '', age: 0, relationship: '', phone: '', workUnit: '', workPosition: '' })}>
                      添加家庭成员
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>姓名</TableCell>
                            <TableCell>身份证号</TableCell>
                            <TableCell>年龄</TableCell>
                            <TableCell>关系</TableCell>
                            <TableCell>电话</TableCell>
                            <TableCell>工作单位</TableCell>
                            <TableCell>工作职务</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {familyMembers.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {familyMembers.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.name} onChange={e => updateRow(setFamilyMembers, idx, 'name', e.target.value)} sx={{ width: 80 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.idCard} onChange={e => updateRow(setFamilyMembers, idx, 'idCard', e.target.value)} sx={{ width: 150 }} /></TableCell>
                              <TableCell><TextField size="small" type="number" value={row.age} onChange={e => updateRow(setFamilyMembers, idx, 'age', e.target.value)} sx={{ width: 60 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.relationship} onChange={e => updateRow(setFamilyMembers, idx, 'relationship', e.target.value)} sx={{ width: 70 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.phone} onChange={e => updateRow(setFamilyMembers, idx, 'phone', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.workUnit} onChange={e => updateRow(setFamilyMembers, idx, 'workUnit', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.workPosition} onChange={e => updateRow(setFamilyMembers, idx, 'workPosition', e.target.value)} sx={{ width: 80 }} /></TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setFamilyMembers, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Tab 3: 紧急联系人 */}
                {activeTab === 3 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setEmergencyContacts, { name: '', relationship: '', phone: '', address: '' })}>
                      添加紧急联系人
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>姓名</TableCell>
                            <TableCell>与本人关系</TableCell>
                            <TableCell>联系电话</TableCell>
                            <TableCell>居住地址</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {emergencyContacts.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {emergencyContacts.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.name} onChange={e => updateRow(setEmergencyContacts, idx, 'name', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.relationship} onChange={e => updateRow(setEmergencyContacts, idx, 'relationship', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.phone} onChange={e => updateRow(setEmergencyContacts, idx, 'phone', e.target.value)} sx={{ width: 130 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.address} onChange={e => updateRow(setEmergencyContacts, idx, 'address', e.target.value)} sx={{ width: 200 }} /></TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setEmergencyContacts, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Tab 4: 语言能力 */}
                {activeTab === 4 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setLanguages, { language: '', listeningSpeaking: '', readingWriting: '', attachment: '' })}>
                      添加语言能力
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>语种</TableCell>
                            <TableCell>听说能力</TableCell>
                            <TableCell>读写能力</TableCell>
                            <TableCell>附件</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {languages.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {languages.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.language} onChange={e => updateRow(setLanguages, idx, 'language', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell>
                                <Select size="small" value={row.listeningSpeaking} onChange={e => updateRow(setLanguages, idx, 'listeningSpeaking', e.target.value)} sx={{ width: 100 }}>
                                  <MenuItem value="">请选择</MenuItem>
                                  <MenuItem value="精通">精通</MenuItem>
                                  <MenuItem value="熟练">熟练</MenuItem>
                                  <MenuItem value="良好">良好</MenuItem>
                                  <MenuItem value="一般">一般</MenuItem>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select size="small" value={row.readingWriting} onChange={e => updateRow(setLanguages, idx, 'readingWriting', e.target.value)} sx={{ width: 100 }}>
                                  <MenuItem value="">请选择</MenuItem>
                                  <MenuItem value="精通">精通</MenuItem>
                                  <MenuItem value="熟练">熟练</MenuItem>
                                  <MenuItem value="良好">良好</MenuItem>
                                  <MenuItem value="一般">一般</MenuItem>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button size="small" component="label" startIcon={<UploadIcon />}>
                                  {row.attachment ? '已上传' : '上传'}
                                  <input type="file" hidden onChange={e => handleAttachmentUpload(e.target.files[0], url => updateRow(setLanguages, idx, 'attachment', url))} />
                                </Button>
                              </TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setLanguages, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Tab 5: 职业资格/证书 */}
                {activeTab === 5 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setCerts, { certName: '', certLevel: '', certNo: '', issuingAuthority: '', obtainDate: '', attachment: '' })}>
                      添加证书
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>证书名称</TableCell>
                            <TableCell>证书等级</TableCell>
                            <TableCell>证书编号</TableCell>
                            <TableCell>发证机关</TableCell>
                            <TableCell>取得日期</TableCell>
                            <TableCell>附件</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {certs.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {certs.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.certName} onChange={e => updateRow(setCerts, idx, 'certName', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.certLevel} onChange={e => updateRow(setCerts, idx, 'certLevel', e.target.value)} sx={{ width: 80 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.certNo} onChange={e => updateRow(setCerts, idx, 'certNo', e.target.value)} sx={{ width: 130 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.issuingAuthority} onChange={e => updateRow(setCerts, idx, 'issuingAuthority', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell><TextField size="small" type="date" value={row.obtainDate ? new Date(row.obtainDate).toISOString().slice(0, 10) : ''} onChange={e => updateRow(setCerts, idx, 'obtainDate', e.target.value)} sx={{ width: 130 }} InputLabelProps={{ shrink: true }} /></TableCell>
                              <TableCell>
                                <Button size="small" component="label" startIcon={<UploadIcon />}>
                                  {row.attachment ? '已上传' : '上传'}
                                  <input type="file" hidden onChange={e => handleAttachmentUpload(e.target.files[0], url => updateRow(setCerts, idx, 'attachment', url))} />
                                </Button>
                              </TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setCerts, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Tab 6: 内部任职记录 */}
                {activeTab === 6 && (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} size="small" sx={{ mb: 1 }}
                      onClick={() => addRow(setPositionRecords, { positionTitle: '', departmentName: '', startDate: '', endDate: '', changeType: '', remark: '' })}>
                      添加任职记录
                    </Button>
                    <TableContainer component={Paper} variant="outlined" size="small">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>岗位名称</TableCell>
                            <TableCell>部门名称</TableCell>
                            <TableCell>开始日期</TableCell>
                            <TableCell>结束日期</TableCell>
                            <TableCell>变动类型</TableCell>
                            <TableCell>备注</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {positionRecords.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>}
                          {positionRecords.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField size="small" value={row.positionTitle} onChange={e => updateRow(setPositionRecords, idx, 'positionTitle', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><TextField size="small" value={row.departmentName} onChange={e => updateRow(setPositionRecords, idx, 'departmentName', e.target.value)} sx={{ width: 100 }} /></TableCell>
                              <TableCell><TextField size="small" type="date" value={row.startDate ? new Date(row.startDate).toISOString().slice(0, 10) : ''} onChange={e => updateRow(setPositionRecords, idx, 'startDate', e.target.value)} sx={{ width: 130 }} InputLabelProps={{ shrink: true }} /></TableCell>
                              <TableCell><TextField size="small" type="date" value={row.endDate ? new Date(row.endDate).toISOString().slice(0, 10) : ''} onChange={e => updateRow(setPositionRecords, idx, 'endDate', e.target.value)} sx={{ width: 130 }} InputLabelProps={{ shrink: true }} /></TableCell>
                              <TableCell>
                                <Select size="small" value={row.changeType} onChange={e => updateRow(setPositionRecords, idx, 'changeType', e.target.value)} sx={{ width: 90 }}>
                                  <MenuItem value="">请选择</MenuItem>
                                  <MenuItem value="入职">入职</MenuItem>
                                  <MenuItem value="调岗">调岗</MenuItem>
                                  <MenuItem value="晋升">晋升</MenuItem>
                                  <MenuItem value="降职">降职</MenuItem>
                                  <MenuItem value="离职">离职</MenuItem>
                                </Select>
                              </TableCell>
                              <TableCell><TextField size="small" value={row.remark} onChange={e => updateRow(setPositionRecords, idx, 'remark', e.target.value)} sx={{ width: 120 }} /></TableCell>
                              <TableCell><IconButton size="small" color="error" onClick={() => removeRow(setPositionRecords, idx)}><DeleteIcon /></IconButton></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}

            {/* 账号信息 - 仅新增时显示 */}
            {!isEdit && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>账号信息</Typography>
                <Divider sx={{ mb: 2 }} />
                <Alert severity="info" sx={{ mb: 2 }}>
                  新增员工后将自动开通系统登录账号，默认密码为身份证号后6位，默认角色为普通员工。账号权限请到平台权限管理中配置。
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="登录密码" margin="normal"
                      value={form.accountPassword}
                      onChange={(e) => setForm({ ...form, accountPassword: e.target.value })}
                      helperText="系统默认密码为身份证后6位，可手动修改"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth margin="normal" disabled>
                      <InputLabel>系统角色</InputLabel>
                      <Select value={form.accountRole} label="系统角色" readOnly>
                        <MenuItem value="EMPLOYEE">普通员工</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth label="登录邮箱（自动生成）" margin="normal"
                      value={form.email || `${form.name || '员工'}工号@hrms.internal`}
                      disabled
                      helperText="优先使用填写的邮箱，未填写则用工号自动生成"
                      sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'action.hover' } }}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {/* 离职交接区域 */}
            {form.status === 'RESIGNED' && (
              <>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, color: 'error.main' }}>
                  <HandoverIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  离职交接
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'error.main' }} />

                {managedDepts.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    该员工是以下部门的负责人：<strong>{managedDepts.map(d => d.name).join('、')}</strong>，
                    离职前必须指定新的负责人！
                  </Alert>
                )}

                <Grid container spacing={2}>
                  {managedDepts.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        options={activeEmployees}
                        getOptionLabel={(emp) => `${emp.name}（${emp.employeeNo}）${emp.positionTitle || emp.position?.name ? ` - ${emp.positionTitle || emp.position?.name}` : ''}${emp.department?.name ? ` [${emp.department.name}]` : ''}`}
                        filterOptions={(options, { inputValue }) => {
                          const lower = inputValue.toLowerCase();
                          return options.filter((emp) =>
                            emp.name.toLowerCase().includes(lower) ||
                            emp.employeeNo.toLowerCase().includes(lower) ||
                            (emp.positionTitle || emp.position?.name || '').toLowerCase().includes(lower)
                          );
                        }}
                        renderOption={(props, emp) => (
                          <li {...props}>
                            <Box>
                              <Typography variant="body1">{emp.name}（{emp.employeeNo}）</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {emp.positionTitle || emp.position?.name || '未设置岗位'} · {emp.department?.name || '未分配部门'}
                              </Typography>
                            </Box>
                          </li>
                        )}
                        value={activeEmployees.find(e => e.id === newManagerId) || null}
                        onChange={(e, val) => setNewManagerId(val?.id || null)}
                        renderInput={(params) => (
                          <TextField {...params} label="指定新负责人 *" placeholder="搜索在职员工" />
                        )}
                        noOptionsText="未找到匹配员工"
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} md={managedDepts.length > 0 ? 6 : 12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="离职日期"
                      value={form.leaveDate || new Date().toISOString().slice(0, 10)}
                      onChange={handleChange('leaveDate')}
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      helperText="默认为今天"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="交接说明"
                      value={form.handoverNote}
                      onChange={handleChange('handoverNote')}
                      margin="normal"
                      placeholder="请填写工作交接说明，包括：未完成工作、交接物品、注意事项等"
                    />
                  </Grid>
                </Grid>
              </>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" color={form.status === 'RESIGNED' ? 'error' : 'primary'}>
                {isEdit ? '保存修改' : '创建员工'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/employees')}>取消</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 部门负责人交接确认对话框 */}
      <Dialog open={handoverDialogOpen} onClose={() => setHandoverDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>⚠️ 部门负责人离职交接</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            该员工是 <strong>{managedDepts.map(d => d.name).join('、')}</strong> 的负责人，
            离职前必须指定新的负责人！
          </Alert>
          <Autocomplete
            options={activeEmployees}
            getOptionLabel={(emp) => `${emp.name}（${emp.employeeNo}）${emp.positionTitle || emp.position?.name ? ` - ${emp.positionTitle || emp.position?.name}` : ''}${emp.department?.name ? ` [${emp.department.name}]` : ''}`}
            filterOptions={(options, { inputValue }) => {
              const lower = inputValue.toLowerCase();
              return options.filter((emp) =>
                emp.name.toLowerCase().includes(lower) ||
                emp.employeeNo.toLowerCase().includes(lower) ||
                (emp.positionTitle || emp.position?.name || '').toLowerCase().includes(lower)
              );
            }}
            renderOption={(props, emp) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1">{emp.name}（{emp.employeeNo}）</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {emp.positionTitle || emp.position?.name || '未设置岗位'} · {emp.department?.name || '未分配部门'}
                  </Typography>
                </Box>
              </li>
            )}
            value={activeEmployees.find(e => e.id === newManagerId) || null}
            onChange={(e, val) => setNewManagerId(val?.id || null)}
            renderInput={(params) => (
              <TextField {...params} label="选择新的部门负责人" placeholder="搜索在职员工" sx={{ mt: 1 }} />
            )}
            noOptionsText="未找到匹配员工"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setHandoverDialogOpen(false); setForm(prev => ({ ...prev, status: 'ACTIVE' })); }}>
            取消离职
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!newManagerId}
            onClick={() => setHandoverDialogOpen(false)}
          >
            确认交接
          </Button>
        </DialogActions>
      </Dialog>

      {/* 账号创建成功弹窗 */}
      <Dialog open={Boolean(accountResult)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" /> 员工创建成功
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            系统已自动为该员工开通登录账号，请将以下信息告知员工：
          </Alert>
          <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">登录邮箱</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                  {accountResult?.email}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">登录密码</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                  {accountResult?.password}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">系统角色</Typography>
                <Chip
                  size="small"
                  label={{
                    EMPLOYEE: '普通员工',
                    MANAGER: '部门经理',
                    HR_ADMIN: 'HR管理员',
                    SUPER_ADMIN: '超级管理员',
                  }[accountResult?.role] || accountResult?.role}
                  color={{
                    EMPLOYEE: 'default',
                    MANAGER: 'info',
                    HR_ADMIN: 'warning',
                    SUPER_ADMIN: 'error',
                  }[accountResult?.role] || 'default'}
                />
              </Grid>
            </Grid>
          </Card>
          <Alert severity="warning" sx={{ mt: 2 }}>
            员工可使用邮箱、工号或手机号登录系统，建议首次登录后修改密码。
          </Alert>
          {/* 可直接全选复制的文本框 */}
          {accountResult && (() => {
            const roleLabel = { EMPLOYEE: '普通员工', MANAGER: '部门经理', HR_ADMIN: 'HR管理员', SUPER_ADMIN: '超级管理员' }[accountResult.role] || accountResult.role;
            const txt = `登录邮箱: ${accountResult.email}\n登录密码: ${accountResult.password}\n系统角色: ${roleLabel}`;
            return (
              <TextField fullWidth multiline minRows={3} margin="dense" size="small"
                value={txt}
                slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem', bgcolor: 'grey.50' } }}}
                onClick={e => e.target.select()}
          helperText="点击上方文本框自动全选 → 按 Ctrl+C 复制"
              />
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => navigate('/employees')}>
            返回员工列表
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

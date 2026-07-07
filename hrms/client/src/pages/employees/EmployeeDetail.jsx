import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Divider, Alert,
  Avatar, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';

// 资源路径补全
const assetUrl = (p) => {
  if (!p) return undefined;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return p.startsWith('/uploads') ? base + p : p;
};

const statusMap = { ACTIVE: '在职', INACTIVE: '停职', RESIGNED: '离职' };
const statusColorMap = { ACTIVE: 'success', INACTIVE: 'warning', RESIGNED: 'error' };
const genderMap = { MALE: '男', FEMALE: '女', OTHER: '其他' };

const calcAge = (birthday) => {
  if (!birthday) return '';
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : '';
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : '-';

const InfoItem = ({ label, value }) => (
  <Grid item xs={6} md={3}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography sx={{ mt: 0.5, wordBreak: 'break-word' }}>{value || '-'}</Typography>
  </Grid>
);

const SectionTitle = ({ title }) => (
  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2.5, mb: 1, color: 'primary.main' }}>{title}</Typography>
);

const EmptyRow = ({ colSpan }) => (
  <TableRow><TableCell colSpan={colSpan} align="center" sx={{ color: 'text.secondary' }}>暂无数据</TableCell></TableRow>
);

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEdit = useCanEdit();
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    api.get(`/employees/${id}`).then((data) => setEmployee(data.data)).catch(() => {});
  }, [id]);

  if (!employee) return <Typography>加载中...</Typography>;

  const edu = employee.educations || [];
  const work = employee.workExperiences || [];
  const family = employee.familyMembers || [];
  const emerg = employee.emergencyContacts || [];
  const langs = employee.languages || [];
  const certs = employee.certs || [];
  const posRecords = employee.positionRecords || [];

  return (
    <Box>
      <PageHeader title="员工详情" breadcrumbs={['员工管理', employee.name]} />
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={assetUrl(employee.photo)} sx={{ width: 80, height: 80 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">{employee.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={statusMap[employee.status] || employee.status} size="small" color={statusColorMap[employee.status] || 'default'} />
                  <Chip label={genderMap[employee.gender] || employee.gender} size="small" variant="outlined" />
                </Box>
              </Box>
            </Box>
            {canEdit && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/employees/${id}/edit`)}>
                编辑
              </Button>
            )}
          </Box>
          <Divider />

          {/* 基本信息 */}
          <SectionTitle title="基本信息" />
          <Grid container spacing={2}>
            <InfoItem label="工号" value={employee.employeeNo} />
            <InfoItem label="姓名" value={employee.name} />
            <InfoItem label="性别" value={genderMap[employee.gender] || employee.gender} />
            <InfoItem label="身份证号" value={employee.idCard} />
            <InfoItem label="出生日期" value={employee.birthday ? fmtDate(employee.birthday) : '-'} />
            <InfoItem label="年龄" value={calcAge(employee.birthday) ? `${calcAge(employee.birthday)}岁` : '-'} />
            <InfoItem label="民族" value={employee.ethnicity} />
            <InfoItem label="政治面貌" value={employee.politicalStatus} />
            <InfoItem label="婚姻状况" value={employee.maritalStatus} />
          </Grid>

          {/* 教育信息 */}
          <SectionTitle title="教育信息" />
          <Grid container spacing={2}>
            <InfoItem label="学历" value={employee.education} />
            <InfoItem label="毕业院校" value={employee.school} />
            <InfoItem label="专业" value={employee.major} />
          </Grid>

          {/* 联系信息 */}
          <SectionTitle title="联系信息" />
          <Grid container spacing={2}>
            <InfoItem label="手机号" value={employee.phone} />
            <InfoItem label="邮箱" value={employee.email} />
            <InfoItem label="现住址" value={employee.currentAddress} />
            <InfoItem label="户籍地址" value={employee.permanentAddress} />
          </Grid>

          {/* 工作信息 */}
          <SectionTitle title="工作信息" />
          <Grid container spacing={2}>
            <InfoItem label="部门" value={employee.department?.name} />
            <InfoItem label="岗位" value={employee.position?.name || employee.positionTitle} />
            <InfoItem label="岗位级别" value={employee.jobLevel} />
            <InfoItem label="职级" value={employee.rank} />
            <InfoItem label="入职日期" value={employee.hireDate ? fmtDate(employee.hireDate) : '-'} />
            <InfoItem label="状态" value={
              <Chip label={statusMap[employee.status] || employee.status} size="small" color={statusColorMap[employee.status] || 'default'} />
            } />
            <InfoItem label="基本工资" value={employee.baseSalary ? `¥${employee.baseSalary.toLocaleString()}` : '-'} />
            {employee.status === 'RESIGNED' && (
              <InfoItem label="离职日期" value={employee.leaveDate ? fmtDate(employee.leaveDate) : '-'} />
            )}
          </Grid>

          {/* 其他信息 */}
          <SectionTitle title="其他信息" />
          <Grid container spacing={2}>
            <InfoItem label="有私家车" value={employee.hasPrivateCar ? '是' : '否'} />
            <InfoItem label="车牌号" value={employee.hasPrivateCar ? employee.carPlate : '-'} />
            <InfoItem label="是否住宿" value={employee.isAccommodated ? '是' : '否'} />
            <InfoItem label="住宿开始日期" value={employee.isAccommodated && employee.accommodationStartDate ? fmtDate(employee.accommodationStartDate) : '-'} />
          </Grid>

          {/* 合同与保险 */}
          <SectionTitle title="合同与保险" />
          <Grid container spacing={2}>
            <InfoItem label="是否签订合同" value={employee.hasSignedContract ? '是' : '否'} />
            <InfoItem label="是否缴纳团险" value={employee.hasGroupInsurance ? '是' : '否'} />
            <InfoItem label="无犯罪记录证明" value={employee.criminalRecordUrl ? '已上传' : '未上传'} />
            {employee.criminalRecordUrl && (
              <Grid item xs={12} md={6}>
                <Link href={assetUrl(employee.criminalRecordUrl)} target="_blank" rel="noopener" sx={{ fontSize: 13 }}>查看无犯罪记录证明</Link>
              </Grid>
            )}
            <InfoItem label="临时合同信息" value={employee.tempContractUrl ? '已上传' : '未上传'} />
            {employee.tempContractUrl && (
              <Grid item xs={12} md={6}>
                <Link href={assetUrl(employee.tempContractUrl)} target="_blank" rel="noopener" sx={{ fontSize: 13 }}>查看临时合同信息</Link>
              </Grid>
            )}
          </Grid>

          {/* 离职交接信息 */}
          {employee.status === 'RESIGNED' && (
            <>
              <SectionTitle title="离职交接" />
              {employee.managedDepts && employee.managedDepts.length > 0 && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  曾任负责人部门：{employee.managedDepts.map(d => d.name).join('、')}
                </Alert>
              )}
              <Grid container spacing={2}>
                <InfoItem label="交接说明" value={employee.handoverNote || '无'} />
              </Grid>
            </>
          )}

          {/* 扩展信息 - Tab 子表 */}
          <SectionTitle title="扩展信息" />
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {edu.length === 0 && <EmptyRow colSpan={6} />}
                  {edu.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.schoolName || '-'}</TableCell>
                      <TableCell>{row.major || '-'}</TableCell>
                      <TableCell>{row.graduationDate ? fmtDate(row.graduationDate) : '-'}</TableCell>
                      <TableCell>{row.diplomaCertNo || '-'}</TableCell>
                      <TableCell>{row.degreeCertNo || '-'}</TableCell>
                      <TableCell>{row.attachment ? <Link href={assetUrl(row.attachment)} target="_blank">查看</Link> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 1: 工作经历 */}
          {activeTab === 1 && (
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {work.length === 0 && <EmptyRow colSpan={9} />}
                  {work.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.companyName || '-'}</TableCell>
                      <TableCell>{row.industry || '-'}</TableCell>
                      <TableCell>{row.position || '-'}</TableCell>
                      <TableCell>{row.startDate ? fmtDate(row.startDate) : '-'}</TableCell>
                      <TableCell>{row.endDate ? fmtDate(row.endDate) : '-'}</TableCell>
                      <TableCell>{row.leaveReason || '-'}</TableCell>
                      <TableCell>{row.lastSalary ? `¥${row.lastSalary}` : '-'}</TableCell>
                      <TableCell>{row.leaveCertUrl ? <Link href={assetUrl(row.leaveCertUrl)} target="_blank">查看</Link> : '-'}</TableCell>
                      <TableCell>{row.attachment ? <Link href={assetUrl(row.attachment)} target="_blank">查看</Link> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 2: 家庭成员 */}
          {activeTab === 2 && (
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {family.length === 0 && <EmptyRow colSpan={7} />}
                  {family.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.name || '-'}</TableCell>
                      <TableCell>{row.idCard || '-'}</TableCell>
                      <TableCell>{row.age || '-'}</TableCell>
                      <TableCell>{row.relationship || '-'}</TableCell>
                      <TableCell>{row.phone || '-'}</TableCell>
                      <TableCell>{row.workUnit || '-'}</TableCell>
                      <TableCell>{row.workPosition || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 3: 紧急联系人 */}
          {activeTab === 3 && (
            <TableContainer component={Paper} variant="outlined" size="small">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>姓名</TableCell>
                    <TableCell>与本人关系</TableCell>
                    <TableCell>联系电话</TableCell>
                    <TableCell>居住地址</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emerg.length === 0 && <EmptyRow colSpan={4} />}
                  {emerg.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.name || '-'}</TableCell>
                      <TableCell>{row.relationship || '-'}</TableCell>
                      <TableCell>{row.phone || '-'}</TableCell>
                      <TableCell>{row.address || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 4: 语言能力 */}
          {activeTab === 4 && (
            <TableContainer component={Paper} variant="outlined" size="small">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>语种</TableCell>
                    <TableCell>听说能力</TableCell>
                    <TableCell>读写能力</TableCell>
                    <TableCell>附件</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {langs.length === 0 && <EmptyRow colSpan={4} />}
                  {langs.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.language || '-'}</TableCell>
                      <TableCell>{row.listeningSpeaking || '-'}</TableCell>
                      <TableCell>{row.readingWriting || '-'}</TableCell>
                      <TableCell>{row.attachment ? <Link href={assetUrl(row.attachment)} target="_blank">查看</Link> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 5: 职业资格/证书 */}
          {activeTab === 5 && (
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certs.length === 0 && <EmptyRow colSpan={6} />}
                  {certs.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.certName || '-'}</TableCell>
                      <TableCell>{row.certLevel || '-'}</TableCell>
                      <TableCell>{row.certNo || '-'}</TableCell>
                      <TableCell>{row.issuingAuthority || '-'}</TableCell>
                      <TableCell>{row.obtainDate ? fmtDate(row.obtainDate) : '-'}</TableCell>
                      <TableCell>{row.attachment ? <Link href={assetUrl(row.attachment)} target="_blank">查看</Link> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 6: 内部任职记录 */}
          {activeTab === 6 && (
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posRecords.length === 0 && <EmptyRow colSpan={6} />}
                  {posRecords.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.positionTitle || '-'}</TableCell>
                      <TableCell>{row.departmentName || '-'}</TableCell>
                      <TableCell>{row.startDate ? fmtDate(row.startDate) : '-'}</TableCell>
                      <TableCell>{row.endDate ? fmtDate(row.endDate) : '-'}</TableCell>
                      <TableCell>{row.changeType || '-'}</TableCell>
                      <TableCell>{row.remark || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

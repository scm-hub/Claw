/**
 * 金蝶云星空 8.2 WebAPI 适配器
 *
 * 金蝶云星空 WebAPI 文档：
 * - 认证：POST /Kingdee.BOS.WebApi.ServicesStub/AuthService/Login
 * - 查看：POST /Kingdee.BOS.WebApi.ServicesStub/DynamicFormService/View
 * - 保存：POST /Kingdee.BOS.WebApi.ServicesStub/DynamicFormService/Save
 * - 批量查看：POST /Kingdee.BOS.WebApi.ServicesStub/DynamicFormService/BatchView
 * - 提交：POST /Kingdee.BOS.WebApi.ServicesStub/DynamicFormService/Submit
 * - 审核：POST /Kingdee.BOS.WebApi.ServicesStub/DynamicFormService/Audit
 *
 * 金蝶云星空 8.2 基础资料 FormId：
 *   BD_Customer     - 客户
 *   BD_Supplier     - 供应商
 *   BD_MATERIAL     - 物料
 *   BD_Empinfo      - 员工
 *   BD_Department   - 部门
 *   BD_UnitGroup    - 计量单位组
 *   BD_Currency     - 币别
 */

function getKingdeeConfig() {
  return {
    baseUrl: process.env.KINGDEE_BASE_URL || 'http://192.168.50.125',
    acctId: process.env.KINGDEE_ACCT_ID || '',
    username: process.env.KINGDEE_USERNAME || '00921',
    password: process.env.KINGDEE_PASSWORD || '',
    appId: process.env.KINGDEE_APP_ID || '',
    appSecret: process.env.KINGDEE_APP_SECRET || '',
    lcid: 2052,
    timeout: 30000,
  };
}

// ========================
// 金蝶 API 客户端
// ========================

class KingdeeClient {
  constructor(config = {}) {
    this.config = { ...getKingdeeConfig(), ...config };
    this.token = null;
    this.tokenExpireTime = 0;
    this.aspSessionId = '';
  }

  /**
   * 获取认证 Cookie/Token
   * 金蝶云星空 8.2 使用 ValidateUser 接口获取 session（不是 Login！）
   * URL 格式: Kingdee.BOS.WebApi.ServicesStub.AuthService.ValidateUser.common.kdsvc（点号分隔）
   */
  async login() {
    const url = `${this.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.AuthService.ValidateUser.common.kdsvc`;
    const body = {
      acctID: this.config.acctId,
      username: this.config.username,
      password: this.config.password,
      lcid: this.config.lcid,
    };

    console.log(`[Kingdee] 登录 URL: ${url}`);
    console.log(
      `[Kingdee] 登录参数: acctID=${this.config.acctId}, username=${this.config.username}`,
    );
    const response = await this._request(url, 'POST', body);
    console.log(
      `[Kingdee] 登录响应: LoginResultType=${response.LoginResultType}, UserName=${response.Context?.UserName}`,
    );

    if (response.LoginResultType === 1) {
      this.token = response.KDSVCSessionId || response.Context?.SessionId;
      this.aspSessionId = response.Context?.SessionId || '';
      this.tokenExpireTime = Date.now() + (response.KDSVCSessionTimeout || 20) * 60 * 1000;
      console.log(
        '[Kingdee] 登录成功, 用户=',
        response.Context?.UserName,
        ', token=',
        this.token?.substring(0, 20) + '...',
      );
      return true;
    }
    throw new Error(`金蝶登录失败: ${response.Message || JSON.stringify(response)}`);
  }

  /**
   * 确保 Token 有效
   */
  async ensureAuth() {
    if (this.token && Date.now() < this.tokenExpireTime) return;
    await this.login();
  }

  /**
   * 查看单据 - 获取单条数据
   * @param {string} formId - 表单标识，如 "BD_Customer"
   * @param {object} data - 查询条件 { Id: xxx } 或 { Number: "xxx" }
   */
  async view(formId, data) {
    await this.ensureAuth();
    const url = `${this.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.View.common.kdsvc`;
    const body = { formid: formId, data: data };
    return this._request(url, 'POST', body);
  }

  async batchView(formId, filter = {}) {
    await this.ensureAuth();
    const url = `${this.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.BatchView.common.kdsvc`;
    const body = { formid: formId, data: filter };
    return this._request(url, 'POST', body);
  }

  async save(formId, data, isAutoSubmitAndAudit = false) {
    await this.ensureAuth();
    const url = `${this.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.Save.common.kdsvc`;
    const body = {
      formid: formId,
      data: { Model: data },
      isautosubmitandaudit: isAutoSubmitAndAudit,
    };
    return this._request(url, 'POST', body);
  }

  async submit(formId, ids) {
    await this.ensureAuth();
    const url = `${this.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.Submit.common.kdsvc`;
    const body = { formid: formId, data: { Ids: ids } };
    return this._request(url, 'POST', body);
  }

  async audit(formId, ids) {
    await this.ensureAuth();
    const url = `${this.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.Audit.common.kdsvc`;
    const body = { formid: formId, data: { Ids: ids } };
    return this._request(url, 'POST', body);
  }

  /**
   * 通用 HTTP 请求
   */
  async _request(url, method, body) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Cookie'] =
        `kdservice-sessionid=${this.token}; ASP.NET_SessionId=${this.aspSessionId || ''}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`金蝶 API 请求失败 [${response.status}]: ${text.substring(0, 500)}`);
      }

      // 金蝶可能返回 JSON 或带前缀的 JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // 尝试去除可能的 BOM 头
        const cleaned = text.replace(/^\uFEFF/, '');
        data = JSON.parse(cleaned);
      }

      // 检查业务错误
      if (data.Result?.ResponseStatus?.IsSuccess === false) {
        const errors = data.Result.ResponseStatus.Errors || [];
        const errMsg = errors.map((e) => e.Message).join('; ');
        throw new Error(`金蝶业务错误: ${errMsg}`);
      }

      return data;
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new Error(`金蝶 API 请求超时 (${this.config.timeout}ms)`);
      }
      throw err;
    }
  }
}

// ========================
// 业务适配器
// ========================

class KingdeeAdapter {
  constructor(config = {}) {
    this.client = new KingdeeClient(config);
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      await this.client.login();
      return { success: true, message: '金蝶云星空连接成功' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // ---- 拉取基础资料（金蝶 → MDM） ----
  // 金蝶 8.2 使用 ExecuteBillQuery 方法批量查询

  /**
   * 执行金蝶 ExecuteBillQuery 查询
   */
  async _executeBillQuery(formId, fieldKeys, filterString = '') {
    await this.client.ensureAuth();
    const url = `${this.client.config.baseUrl}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.ExecuteBillQuery.common.kdsvc`;
    const allRows = [];
    let startRow = 0;
    // 金蝶单次查询上限约 10000，用 5000 确保稳定分页
    const limit = 5000;
    const fields = fieldKeys.split(',');
    let totalFetched = 0;

    while (true) {
      const data = {
        FormId: formId,
        FieldKeys: fieldKeys,
        StartRow: startRow,
        Limit: limit,
      };
      if (filterString) data.FilterString = filterString;

      console.log(`[Kingdee] 查询 ${formId} StartRow=${startRow} Limit=${limit}`);

      const response = await this.client._request(url, 'POST', {
        formid: formId,
        data: data,
      });

      // ExecuteBillQuery 返回 [[row1], [row2], ...]
      const rows = Array.isArray(response) ? response : [];
      if (rows.length === 0) break;

      for (const rowArr of rows) {
        if (!Array.isArray(rowArr)) continue;
        const row = {};
        fields.forEach((f, idx) => {
          row[f.trim()] = rowArr[idx] || '';
        });
        allRows.push(row);
      }

      totalFetched += rows.length;
      // 如果返回数量少于请求数量，说明已到末尾
      if (rows.length < limit) break;
      startRow += limit;
    }

    return allRows;
  }

  /**
   * 从金蝶拉取客户列表
   */
  async pullCustomers(lastSyncTime) {
    console.log('[Kingdee] 拉取客户数据...');
    let filter = '';
    if (lastSyncTime) filter = `FModifyDate >= '${lastSyncTime}'`;
    const records = await this._executeBillQuery(
      'BD_Customer',
      'FNumber,FName,FShortName,FTRADINGCURRID,FTRADINGCURRID.FName,FUseOrgId.FNumber,FUseOrgId.FName',
      filter,
    );
    return { entityType: 'customer', total: records.length, records };
  }

  /**
   * 从金蝶拉取供应商列表
   */
  async pullSuppliers(lastSyncTime) {
    console.log('[Kingdee] 拉取供应商数据...');
    let filter = '';
    if (lastSyncTime) filter = `FModifyDate >= '${lastSyncTime}'`;
    const records = await this._executeBillQuery('BD_Supplier', 'FNumber,FName,FShortName,FUseOrgId.FNumber,FUseOrgId.FName', filter);
    return { entityType: 'supplier', total: records.length, records };
  }

  /**
   * 从金蝶拉取物料/产品列表
   */
  async pullMaterials(lastSyncTime) {
    console.log('[Kingdee] 拉取物料数据（仅 0502 开头）...');
    // 只拉取编码 0502 开头的物料
    let filter = "FNumber like '0502%'";
    if (lastSyncTime) filter = `(${filter}) and (FModifyDate >= '${lastSyncTime}')`;
    // FBaseUnitId=基本单位, FPurchaseUnitId=采购单位, FSaleUnitId=销售单位, FMaterialGroup=物料分组, FAuxPropertyId=辅助属性
    const fields = 'FNumber,FName,FSpecification,FBaseUnitId,FBaseUnitId.FName,FPurchaseUnitId,FPurchaseUnitId.FName,FSaleUnitId,FSaleUnitId.FName,FMaterialGroup,FMaterialGroup.FName,FAuxPropertyId,FAuxPropertyId.FName,FUseOrgId.FNumber,FUseOrgId.FName';
    const records = await this._executeBillQuery(
      'BD_MATERIAL',
      fields,
      filter,
    );
    // 解析金蝶引用字段（数字ID → 字符串，{FNumber: 'xxx'} → 'xxx'）
    const parseRef = (val) => {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val.FNumber) return val.FNumber;
      return '';
    };
    const parsed = records.map(r => ({
      ...r,
      FBaseUnitId: parseRef(r.FBaseUnitId),
      FPurchaseUnitId: parseRef(r.FPurchaseUnitId),
      FSaleUnitId: parseRef(r.FSaleUnitId),
      FMaterialGroup: parseRef(r.FMaterialGroup),
      FAuxPropertyId: parseRef(r.FAuxPropertyId),
    }));
    // 金蝶对同一物料在不同组织下返回多条重复记录，按 FNumber 去重保留第一条
    const seen = new Set();
    const deduped = parsed.filter(r => {
      if (seen.has(r.FNumber)) return false;
      seen.add(r.FNumber);
      return true;
    });
    console.log(`[Kingdee] 物料去重: ${parsed.length} → ${deduped.length} 条（去除组织重复）`);
    return { entityType: 'material', total: deduped.length, records: deduped };
  }

  /**
   * 从金蝶拉取仓库列表
   * @param {string|null} lastSyncTime - 增量同步时间 ISO string
   */
  async pullWarehouses(lastSyncTime) {
    console.log('[Kingdee] 拉取仓库数据（仅已审核，全组织）...');
    // BD_STOCK：仓库基础资料
    // FForbidStatus='A' = 已审核可用（不限制组织，全数据中心拉取）
    const filter = "FForbidStatus='A'";
    // 如果指定了增量同步时间，追加过滤条件
    const fullFilter = lastSyncTime
      ? `(${filter}) and (FModifyDate >= '${lastSyncTime}')`
      : filter;
    const records = await this._executeBillQuery(
      'BD_STOCK',
      'FNumber,FName,FDescription,FGroup.FNumber,FGroup.FName,FAddress,FStockProperty,FTel,FForbidStatus,FUseOrgId.FNumber,FUseOrgId.FName',
      fullFilter,
    );
    console.log(`[Kingdee] 仓库数据: ${records.length} 条`);
    // 解析嵌套引用字段（FGroup 等可能是嵌套对象）
    const parseRef = (val) => {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val.FNumber) return val.FNumber;
      return '';
    };
    const parsed = records.map(r => ({
      ...r,
      FGroupNumber: parseRef(r['FGroup.FNumber']),
      FGroupName: parseRef(r['FGroup.FName']),
    }));
    return { entityType: 'warehouse', total: parsed.length, records: parsed };
  }

  /**
   * 拉取金蝶收发类别（BAS_PreBaseDataOne — 辅助资料，含收发类别）
   * 收发类别用于采购入库、销售出库等单据的 F_VIIH_Base 字段
   * 注意：BAS_PreBaseDataOne 按组织返回多条相同编码/名称的数据，需去重
   */
  async pullReceiveSendTypes(lastSyncTime) {
    console.log('[Kingdee] 拉取收发类别数据...');
    const records = await this._executeBillQuery(
      'BAS_PreBaseDataOne',
      'FNumber,FName,FUseOrgId.FNumber,FUseOrgId.FName',
      "FDocumentStatus='C' and FForbidStatus='A'",
    );
    // 按 FNumber 去重，同一编码的多组织聚合成逗号分隔
    const map = new Map();
    for (const r of records) {
      if (!map.has(r.FNumber)) {
        map.set(r.FNumber, {
          FNumber: r.FNumber,
          FName: r.FName,
          orgNumbers: new Set(),
          orgNames: new Set(),
        });
      }
      const entry = map.get(r.FNumber);
      const orgNo = r['FUseOrgId.FNumber'];
      const orgName = r['FUseOrgId.FName'];
      if (orgNo) entry.orgNumbers.add(orgNo);
      if (orgName) entry.orgNames.add(orgName);
    }
    const deduped = Array.from(map.values()).map(e => ({
      FNumber: e.FNumber,
      FName: e.FName,
      orgNumbers: Array.from(e.orgNumbers).join(','),
      orgNames: Array.from(e.orgNames).join(','),
    }));
    console.log(`[Kingdee] 收发类别数据: ${records.length} 条 → 去重后 ${deduped.length} 条`);
    return { entityType: 'receiveSendType', total: deduped.length, records: deduped };
  }

  /**
   * 拉取金蝶辅助资料 — 物料等级（BOS_ASSISTANTDATA_DETAIL，FID.FNUMBER='DJ'）
   */
  async pullMaterialGrades() {
    console.log('[Kingdee] 拉取物料等级数据...');
    const records = await this._executeBillQuery(
      'BOS_ASSISTANTDATA_DETAIL',
      'FEntryID,FNumber,FDataValue,FID.FNUMBER',
      "FID.FNUMBER='DJ'",
    );
    // 按 FNumber 去重
    const seen = new Set();
    const deduped = [];
    for (const r of records) {
      if (!seen.has(r.FNumber)) {
        seen.add(r.FNumber);
        deduped.push({
          FNumber: r.FNumber,
          FName: r.FDataValue,
        });
      }
    }
    console.log(`[Kingdee] 物料等级数据: ${records.length} 条 → 去重后 ${deduped.length} 条`);
    return { entityType: 'materialGrade', total: deduped.length, records: deduped };
  }

  /**
   * 拉取物料及其关联的辅助属性（等级）
   * 输出格式：每条物料记录包含 grades 数组（[{FNumber, FName}]）
   */
  async pullMaterialsWithGrades(lastSyncTime) {
    console.log('[Kingdee] 拉取物料数据（含等级关联）...');
    const filter = "FNumber like '0502%'";
    const fullFilter = lastSyncTime
      ? `(${filter}) and (FModifyDate >= '${lastSyncTime}')`
      : filter;
    // 拉取物料 + 辅助属性 ID
    const records = await this._executeBillQuery(
      'BD_MATERIAL',
      'FNumber,FName,FSpecification,FBaseUnitId.FName,FBaseUnitId.FNumber,FPurchaseUnitId.FName,FPurchaseUnitId.FNumber,FSaleUnitId.FName,FSaleUnitId.FNumber,FMaterialGroup.FNumber,FMaterialGroup.FName,FUseOrgId.FNumber,FUseOrgId.FName,FForbidStatus,FIDAuxProp',
      fullFilter,
    );
    console.log(`[Kingdee] 物料数据: ${records.length} 条`);

    // 收集所有用到的 FIDAuxProp ID
    const auxPropIds = new Set();
    for (const r of records) {
      const aux = r['FIDAuxProp'];
      if (aux) {
        // FIDAuxProp 可能是对象或数组
        const list = Array.isArray(aux) ? aux : [aux];
        for (const item of list) {
          if (item?.FID) auxPropIds.add(item.FID);
        }
      }
    }
    console.log(`[Kingdee] 涉及的辅助属性组: ${auxPropIds.size} 个`);

    // 拉取每个辅助属性组下的等级
    const gradesByGroup = new Map(); // FID → [{FNumber, FName}]
    for (const fid of auxPropIds) {
      try {
        const gradeRecords = await this._executeBillQuery(
          'BOS_ASSISTANTDATA_DETAIL',
          'FNumber,FDataValue,FID',
          "FID=" + fid,
        );
        // 去重
        const seen = new Set();
        const unique = [];
        for (const g of gradeRecords) {
          if (!seen.has(g.FNumber)) {
            seen.add(g.FNumber);
            unique.push({ FNumber: g.FNumber, FName: g.FDataValue });
          }
        }
        gradesByGroup.set(fid, unique);
      } catch (e) {
        console.log(`[Kingdee] 拉取辅助属性 ${fid} 失败:`, e.message.substring(0, 100));
      }
    }

    // 给每个物料附加 grades
    for (const r of records) {
      const aux = r['FIDAuxProp'];
      const grades = [];
      if (aux) {
        const list = Array.isArray(aux) ? aux : [aux];
        for (const item of list) {
          if (item?.FID && gradesByGroup.has(item.FID)) {
            // 物料可能指定了具体值
            const allowed = Array.isArray(item.FValue) ? item.FValue : (item.FValue ? [item.FValue] : []);
            const allGrades = gradesByGroup.get(item.FID);
            if (allowed.length > 0) {
              for (const a of allowed) {
                const matched = allGrades.find(g => g.FNumber === a.FNumber || g.FNumber === a);
                if (matched) grades.push(matched);
              }
            } else {
              // 没有限制就全部等级可用
              grades.push(...allGrades);
            }
          }
        }
      }
      r.grades = grades;
    }

    return { entityType: 'material', total: records.length, records };
  }

  // ---- 推送数据到金蝶（MDM → 金蝶）【已禁用，只拉取不推送】----

  /**
   * 推送部门数据到金蝶
   * @param {Array} departments - MDM 中的部门数组（已按层级排序）
   * @param {Object} deptFNumberMap - hrmsId → Kingdee FNumber 的映射（由 sync 层提供）
   */
  async pushDepartments(departments, deptFNumberMap = {}) {
    console.log(`[Kingdee] 推送 ${departments.length} 个部门...`);
    const ORG_NUMBER = '10001';
    const results = [];
    const createdFids = []; // 收集成功创建的 FID，用于批量审核

    // 收集已被占用的编码，counter 跳过它们
    const usedNumbers = new Set(Object.values(deptFNumberMap));
    let counter = 1;
    const nextNumber = () => {
      while (usedNumbers.has(`QH_DEPT_${String(counter).padStart(3, '0')}`)) counter++;
      const n = `QH_DEPT_${String(counter).padStart(3, '0')}`;
      usedNumbers.add(n);
      counter++;
      return n;
    };

    for (const dept of departments) {
      const fNumber = deptFNumberMap[dept.hrmsId] || nextNumber();

      // 查找父部门的金蝶编码（从实时更新的 deptFNumberMap 中取）
      let parentKdNumber = null;
      if (dept.parentId && deptFNumberMap[dept.parentId]) {
        parentKdNumber = deptFNumberMap[dept.parentId];
      }

      try {
        const data = {
          FNumber: fNumber,
          FName: dept.name,
          FCreateOrgId: { FNumber: ORG_NUMBER },
          FUseOrgId: { FNumber: ORG_NUMBER },
        };
        if (parentKdNumber) {
          data.FParentID = { FNumber: parentKdNumber };
        }
        // Step 1: Save（不自动审核，等全部创建完再批量审核）
        const result = await this.client.save('BD_Department', data);
        const fid = result.Result?.Id || result.Result?.ResponseStatus?.SuccessEntitys?.[0]?.Id;

        // ✅ 立即写入映射，后续子部门可以引用
        deptFNumberMap[dept.hrmsId] = fNumber;
        if (fid) createdFids.push(fid);
        results.push({
          dept: dept.name, hrmsId: dept.hrmsId, fNumber,
          success: true, result: result.Result?.Number || fNumber,
        });
      } catch (err) {
        results.push({ dept: dept.name, hrmsId: dept.hrmsId, fNumber, success: false, error: err.message });
      }
    }

    // Step 2: 批量提交 + 审核（用逗号分隔的 FID 字符串）
    if (createdFids.length > 0) {
      const idStr = createdFids.join(',');
      try {
        await this.client.submit('BD_Department', idStr);
        console.log(`[Kingdee] Submit 成功 (${createdFids.length} 个部门)`);
      } catch (e) {
        console.log(`[Kingdee] Submit 失败:`, e.message.substring(0, 80));
      }
      try {
        await this.client.audit('BD_Department', idStr);
        console.log(`[Kingdee] Audit 成功 (${createdFids.length} 个部门)`);
      } catch (e) {
        console.log(`[Kingdee] Audit 失败:`, e.message.substring(0, 80));
      }
    }

    return results;
  }

  /**
   * 推送员工数据到金蝶
   * @param {Array} employees - MDM 中的员工数组
   * @param {Object} deptFNumberMap - 部门 hrmsId → Kingdee FNumber 的映射
   */
  async pushEmployees(employees, deptFNumberMap = {}) {
    console.log(`[Kingdee] 推送 ${employees.length} 个员工...`);
    const ORG_NUMBER = '10001'; // 山东七河生物科技股份有限公司
    const results = [];
    const createdFids = []; // 收集 FID，用于批量审核

    for (const emp of employees) {
      // 查找员工所属部门的金蝶编码
      const deptKdNumber = emp.departmentHrmsId
        ? deptFNumberMap[emp.departmentHrmsId] || null
        : null;

      try {
        const data = {
          FStaffNumber: emp.employeeNo,
          FName: emp.name,
          FCreateOrgId: { FNumber: ORG_NUMBER },
          FUseOrgId: { FNumber: ORG_NUMBER },
        };
        if (deptKdNumber) {
          data.FDEPARTMENT = { FNumber: deptKdNumber };
        }
        if (emp.phone) data.FMobile = emp.phone;
        if (emp.email) data.FEmail = emp.email;

        // Step 1: Save
        const result = await this.client.save('BD_Empinfo', data);
        const fid = result.Result?.Id || result.Result?.ResponseStatus?.SuccessEntitys?.[0]?.Id;
        if (fid) createdFids.push(fid);

        results.push({
          emp: emp.name,
          empNo: emp.employeeNo,
          success: true,
          result: result.Result?.Number || emp.employeeNo,
        });
      } catch (err) {
        results.push({ emp: emp.name, empNo: emp.employeeNo, success: false, error: err.message });
      }
    }

    // Step 2: 批量提交 + 审核
    if (createdFids.length > 0) {
      const idStr = createdFids.join(',');
      try {
        await this.client.submit('BD_Empinfo', idStr);
        console.log(`[Kingdee] Submit 成功 (${createdFids.length} 个员工)`);
      } catch (e) {
        console.log(`[Kingdee] Submit 失败:`, e.message.substring(0, 80));
      }
      try {
        await this.client.audit('BD_Empinfo', idStr);
        console.log(`[Kingdee] Audit 成功 (${createdFids.length} 个员工)`);
      } catch (e) {
        console.log(`[Kingdee] Audit 失败:`, e.message.substring(0, 80));
      }
    }

    return results;
  }

  /**
   * 批量查询物料
   */
  async getMaterialsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const result = await this.client.batchView('BD_MATERIAL', { Ids: ids });
    return this._parseResult(result, 'material');
  }

  // ---- 内部工具方法 ----

  _parseResult(apiResult, entityType) {
    // 金蝶 BatchView 返回格式: [{ Id, Number, Name, ... }, ...]
    // 或者 Result.ResponseStatus.Data
    let records = [];

    if (Array.isArray(apiResult)) {
      records = apiResult;
    } else if (apiResult.Result?.ResponseStatus?.Data) {
      records = apiResult.Result.ResponseStatus.Data;
    } else if (apiResult.Data) {
      records = apiResult.Data;
    }

    return {
      entityType,
      total: records.length,
      records: records.map((r) => this._mapRecord(r, entityType)),
    };
  }

  _mapRecord(record, entityType) {
    const base = {
      kingdeeId: record.Id || record.FID,
      code: record.Number || record.FNumber || '',
      name: record.Name || record.FName || '',
      modifyDate: record.FModifyDate || '',
    };

    switch (entityType) {
      case 'customer':
        return {
          ...base,
          shortName: record.FShortName || '',
          currency: record.FTRADINGCURRID?.FNumber || '',
        };
      case 'supplier':
        return {
          ...base,
          shortName: record.FShortName || '',
          contact: record.FContact || '',
          phone: record.FPhone || '',
        };
      case 'material':
        return {
          ...base,
          spec: record.FSpecification || '',
          unit: record.FBaseUnit?.FName || record.FBaseUnitId?.FName || '',
          group: record.FMaterialGroup?.FName || record.FMaterialGroup_FName || '',
          erpClsID: record.FErpClsID || '',
        };
      default:
        return base;
    }
  }

  // ========================
  // 采购入库 → 金蝶采购订单 + 入库单
  // ========================

  /**
   * 创建金蝶采购订单（Save → Submit → Audit）
   * @param {Object} params
   * @param {String} params.supplierCode - 供应商金蝶编码 FNumber
   * @param {String} params.purchaseOrgCode - 采购组织编码，默认 10001
   * @param {String} params.date - 单据日期 YYYY-MM-DD
   * @param {Array}  params.entries - 明细行 [{ materialCode, qty, price, unitCode, warehouseCode, note, deliveryDate }]
   * @returns {{ success: boolean, fid: string, billNo: string, error?: string }}
   */
  async createPurchaseOrder({ supplierCode, purchaseOrgCode = '10001', date, entries }) {
    const orderData = {
      FBillTypeID: { FNumber: 'CGDD01_SYS' },
      FDate: date || new Date().toISOString().slice(0, 10),
      FSupplierId: { FNumber: supplierCode },
      FPurchaseOrgId: { FNumber: purchaseOrgCode },
      FBusinessType: 'CG',
      FSettleId: { FNumber: supplierCode },
      FChargeId: { FNumber: supplierCode },
      FProviderId: { FNumber: supplierCode },
      FPOOrderFinance: {
        FSettleCurrId: { FNumber: 'PRE001' },
        FIsIncludedTax: true,
        FISPRICEEXCLUDETAX: true,
        FExchangeTypeId: { FNumber: 'HLTX01_SYS' },
        FExchangeRate: 1,
      },
      FPOOrderEntry: entries.map((e, i) => ({
        FSeq: i + 1,
        FMaterialId: { FNumber: e.materialCode },        FUnitId: { FNumber: e.unitCode },
        FPriceUnitId: { FNumber: e.unitCode },
        FStockUnitID: { FNumber: e.unitCode },
        FStockId: { FNumber: e.warehouseCode },
        FQty: e.qty,
        FStockQty: e.qty,
        FPriceUnitQty: e.qty,
        FPrice: e.price,
        FTaxPrice: e.price,
        FTaxRate: 0,
        FAmount: +(e.qty * e.price).toFixed(2),
        FAllAmount: +(e.qty * e.price).toFixed(2),
        FDeliveryDate: e.deliveryDate || date,
        FNote: e.note || 'SCM系统推送',
        FGiveAway: false,
        FIsStock: true,
        FProductType: '1',
      })),
    };

    const saveResult = await this.client.save('PUR_PurchaseOrder', orderData);
    const fid = saveResult.Result?.Id || saveResult.Result?.ResponseStatus?.SuccessEntitys?.[0]?.Id;
    const billNo = saveResult.Result?.Number || saveResult.Result?.ResponseStatus?.SuccessEntitys?.[0]?.Number;

    if (!fid) {
      const errs = saveResult.Result?.ResponseStatus?.Errors;
      return { success: false, error: errs?.map(e => e.Message).join('; ') || 'Save失败' };
    }

    await this.client.submit('PUR_PurchaseOrder', String(fid));
    await this.client.audit('PUR_PurchaseOrder', String(fid));

    return { success: true, fid: String(fid), billNo };
  }

  /**
   * 创建金蝶采购入库单（Save → Submit → Audit）
   * 使用 RKD02_SYS 单据类型（不要求关联源单）
   * @param {Object} params
   * @param {String} params.supplierCode - 供应商编码
   * @param {String} params.stockOrgCode - 库存组织编码，默认 10001
   * @param {String} params.date - 日期
   * @param {Array}  params.entries - 明细行 [{ materialCode, qty, price, unitCode, warehouseCode, note }]
   * @param {String} params.sourceBillNo - 来源采购订单号（可选，记录用）
   * @returns {{ success: boolean, fid: string, billNo: string, error?: string }}
   */
  async createInboundReceipt({ supplierCode, stockOrgCode = '10001', date, entries, sourceBillNo }) {
    const inboundData = {
      FBillTypeID: { FNumber: 'RKD02_SYS' },
      FDate: date || new Date().toISOString().slice(0, 10),
      FStockOrgId: { FNumber: stockOrgCode },
      FOwnerTypeIdHead: 'BD_OwnerOrg',
      FOwnerIdHead: { FNumber: stockOrgCode },
      F_VIIH_Base: { FNumber: '004' },
      FSupplierId: { FNumber: supplierCode },
      FInStockEntry: entries.map((e, i) => ({
        FSeq: i + 1,
        FMaterialId: { FNumber: e.materialCode },
        FUnitID: { FNumber: e.unitCode },
        FPriceUnitID: { FNumber: e.unitCode },
        FStockUnitId: { FNumber: e.unitCode },
        FStockId: { FNumber: e.warehouseCode },
        FQty: e.qty,
        FStockQty: e.qty,
        FPriceUnitQty: e.qty,
        FPrice: e.price,
        FTaxPrice: e.price,
        FTaxRate: 0,
        FAmount: +(e.qty * e.price).toFixed(2),
        FAllAmount: +(e.qty * e.price).toFixed(2),
        FNote: e.note || 'SCM系统推送',
        FGiveAway: false,
        FOWNERID: { FNumber: stockOrgCode },
        FOWNERTYPEID: 'BD_OwnerOrg',
        FSTOCKORGID: { FNumber: stockOrgCode },
      })),
    };

    const saveResult = await this.client.save('STK_InStock', inboundData);
    const fid = saveResult.Result?.Id || saveResult.Result?.ResponseStatus?.SuccessEntitys?.[0]?.Id;
    const billNo = saveResult.Result?.Number || saveResult.Result?.ResponseStatus?.SuccessEntitys?.[0]?.Number;

    if (!fid) {
      const errs = saveResult.Result?.ResponseStatus?.Errors;
      return { success: false, error: errs?.map(e => e.Message).join('; ') || 'Save失败' };
    }

    await this.client.submit('STK_InStock', String(fid));
    await this.client.audit('STK_InStock', String(fid));

    return { success: true, fid: String(fid), billNo };
  }
}

// ========================
// 导出
// ========================

let adapterInstance = null;

/**
 * 获取金蝶适配器实例（单例）
 */
export function getKingdeeAdapter(config = {}) {
  if (!adapterInstance) {
    adapterInstance = new KingdeeAdapter(config);
  }
  return adapterInstance;
}

/**
 * 强制重新登录（定时任务调用，解决 session 过期问题）
 */
export async function reLoginKingdee() {
  if (adapterInstance) {
    console.log('[Kingdee] 强制重新登录...');
    await adapterInstance.client.login();
  }
}

export { KingdeeAdapter, KingdeeClient, getKingdeeConfig };

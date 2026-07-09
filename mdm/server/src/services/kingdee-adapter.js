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

const KINGDEE_CONFIG = {
  baseUrl: process.env.KINGDEE_BASE_URL || 'http://192.168.50.125',
  acctId: process.env.KINGDEE_ACCT_ID || '',
  username: process.env.KINGDEE_USERNAME || '00921',
  password: process.env.KINGDEE_PASSWORD || '',
  appId: process.env.KINGDEE_APP_ID || '',
  appSecret: process.env.KINGDEE_APP_SECRET || '',
  lcid: 2052,
  timeout: 30000,
};

// ========================
// 金蝶 API 客户端
// ========================

class KingdeeClient {
  constructor(config = {}) {
    this.config = { ...KINGDEE_CONFIG, ...config };
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
    const limit = 500;

    while (true) {
      const data = {
        FormId: formId,
        FieldKeys: fieldKeys,
        StartRow: startRow,
        Limit: limit,
      };
      if (filterString) data.FilterString = filterString;

      const response = await this.client._request(url, 'POST', {
        formid: formId,
        data: data,
      });

      // ExecuteBillQuery 返回 [[flatArray...]]
      const flat = Array.isArray(response[0])
        ? response[0]
        : Array.isArray(response)
          ? response
          : [];
      const fields = fieldKeys.split(',');
      const fieldCount = fields.length;

      for (let i = 0; i < flat.length; i += fieldCount) {
        const row = {};
        fields.forEach((f, idx) => {
          row[f.trim()] = flat[i + idx] || '';
        });
        allRows.push(row);
      }

      if (flat.length < limit * fieldCount) break;
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
      'FNumber,FName,FShortName,FTRADINGCURRID',
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
    const records = await this._executeBillQuery('BD_Supplier', 'FNumber,FName,FShortName', filter);
    return { entityType: 'supplier', total: records.length, records };
  }

  /**
   * 从金蝶拉取物料/产品列表
   */
  async pullMaterials(lastSyncTime) {
    console.log('[Kingdee] 拉取物料数据...');
    let filter = '';
    if (lastSyncTime) filter = `FModifyDate >= '${lastSyncTime}'`;
    const records = await this._executeBillQuery(
      'BD_MATERIAL',
      'FNumber,FName,FSpecification',
      filter,
    );
    return { entityType: 'material', total: records.length, records };
  }

  // ---- 推送数据到金蝶（MDM → 金蝶）【已禁用，只拉取不推送】----

  /**
   * 推送部门数据到金蝶
   * @param {Array} departments - MDM 中的部门数组
   */
  async pushDepartments(departments) {
    console.log(`[Kingdee] 推送 ${departments.length} 个部门...`);
    const results = [];
    for (const dept of departments) {
      try {
        const data = {
          FNumber: dept.hrmsId || dept.id,
          FName: dept.name,
          FParentID: dept.parentId ? { FNumber: dept.parentId } : undefined,
          FCreateOrgId: { FNumber: '100' }, // 默认组织
          FUseOrgId: { FNumber: '100' },
        };
        const result = await this.client.save('BD_Department', data);
        results.push({ dept: dept.name, success: true, result: result.Result?.Number });
      } catch (err) {
        results.push({ dept: dept.name, success: false, error: err.message });
      }
    }
    return results;
  }

  /**
   * 推送员工数据到金蝶
   * @param {Array} employees - MDM 中的员工数组
   */
  async pushEmployees(employees) {
    console.log(`[Kingdee] 推送 ${employees.length} 个员工...`);
    const results = [];
    for (const emp of employees) {
      try {
        const data = {
          FNumber: emp.employeeNo,
          FName: emp.name,
          FDept: emp.departmentName ? { FNumber: emp.departmentHrmsId } : undefined,
          FMobile: emp.phone || '',
          FEmail: emp.email || '',
          FUseOrgId: { FNumber: '100' },
          FCreateOrgId: { FNumber: '100' },
        };
        const result = await this.client.save('BD_Empinfo', data);
        results.push({
          emp: emp.name,
          empNo: emp.employeeNo,
          success: true,
          result: result.Result?.Number,
        });
      } catch (err) {
        results.push({ emp: emp.name, empNo: emp.employeeNo, success: false, error: err.message });
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

export { KingdeeAdapter, KingdeeClient, KINGDEE_CONFIG };

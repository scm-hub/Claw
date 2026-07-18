/**
 * notify-worker — 企微消息通知发送服务
 * 
 * 功能：
 * 1. 每 30 秒轮询 notification_queue 表的 PENDING 记录
 * 2. 调用企业微信「客户群发」API 单发给供应商个人微信
 * 3. 成功标记 SENT，失败重试最多 3 次后标记 FAILED
 * 
 * 完全独立运行，对 SCM 业务代码零侵入。
 */

const mysql = require('mysql2/promise');
const https = require('https');

// ==========================================
// 配置读取
// ==========================================
const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Scm@2025!',
    database: process.env.DB_NAME || 'xdj_scm_db_test',
  },
  wecom: {
    corpid: process.env.WECOM_CORPID || '',
    secret: process.env.WECOM_SECRET || '',
    senderUserid: process.env.WECOM_SENDER_USERID || '',
  },
  pollInterval: parseInt(process.env.POLL_INTERVAL || '30000', 10),
};

// ==========================================
// 数据库连接池
// ==========================================
let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

// ==========================================
// 企业微信 API 封装
// ==========================================

let accessToken = null;
let tokenExpiresAt = 0;

/**
 * 获取企业微信 access_token（带缓存）
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  const { corpid, secret } = config.wecom;
  if (!corpid || !secret) {
    throw new Error('WECOM_CORPID 或 WECOM_SECRET 未配置');
  }

  return new Promise((resolve, reject) => {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${secret}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode !== 0) {
            reject(new Error(`获取 access_token 失败: ${json.errmsg} (${json.errcode})`));
            return;
          }
          accessToken = json.access_token;
          tokenExpiresAt = Date.now() + (json.expires_in - 300) * 1000;
          console.log(`[${new Date().toISOString()}] access_token 刷新成功`);
          resolve(accessToken);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 调用企微 API
 */
function wecomApi(path, body) {
  return new Promise((resolve, reject) => {
    getAccessToken().then((token) => {
      const postData = JSON.stringify(body);
      const url = new URL(`https://qyapi.weixin.qq.com${path}?access_token=${token}`);
      
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.errcode !== 0) {
              reject(new Error(`企微 API 错误: ${json.errmsg} (errcode=${json.errcode})`));
              return;
            }
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    }).catch(reject);
  });
}

/**
 * 通过客户群发 API 单发给供应商个人微信
 * @param {string} externalUserId — 供应商的企微外部联系人ID 
 * @param {string} content — 消息文本
 */
async function sendToSupplier(externalUserId, content) {
  const { senderUserid } = config.wecom;
  if (!senderUserid) {
    throw new Error('WECOM_SENDER_USERID 未配置');
  }

  return wecomApi('/cgi-bin/externalcontact/add_msg_template', {
    chat_type: 'single',
    external_userid: [externalUserId],
    sender: senderUserid,
    text: { content },
  });
}

// ==========================================
// 消息构建
// ==========================================

function buildMessage(notification) {
  const c = notification.content;
  const items = (c.items || []).slice(0, 10); // 最多显示 10 种物料
  const itemList = items.map((it, i) => 
    `  ${i + 1}. ${it.materialName || '物料'} ×${it.planQty || it.actualQty || 0} ${it.unit || ''}  ￥${Number(it.unitPrice || 0).toFixed(2)}`
  ).join('\n');

  const moreHint = (c.items || []).length > 10 ? `\n  ...等共${c.items.length}种物料` : '';

  return `📋 采购计划确认通知

${c.title || '采购计划'}
计划编号：${c.planNo}
确认时间：${c.confirmedAt}

物料明细：
${itemList}${moreHint}

请登录 SCM 系统查看详情。`;
}

// ==========================================
// 轮询 & 发送逻辑
// ==========================================

async function processOne(p, conn) {
  const content = typeof p.content === 'string' ? JSON.parse(p.content) : p.content;
  const n = { ...p, content };

  try {
    // 检查配置
    if (!config.wecom.corpid || !config.wecom.secret) {
      console.log(`[${new Date().toISOString()}] 跳过 #${n.id}: 企微未配置`);
      await conn.execute(
        `UPDATE notification_queue SET status = 'FAILED', error_msg = '企微未配置', retry_count = 99 WHERE id = ?`,
        [n.id]
      );
      return;
    }

    const msg = buildMessage(n);
    console.log(`[${new Date().toISOString()}] 发送通知 #${n.id} → ${n.receiver}...`);
    
    await sendToSupplier(n.receiver, msg);

    // 标记已发送
    await conn.execute(
      `UPDATE notification_queue SET status = 'SENT', sent_at = NOW() WHERE id = ?`,
      [n.id]
    );
    console.log(`[${new Date().toISOString()}] ✓ #${n.id} 发送成功`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ✗ #${n.id} 发送失败:`, err.message);
    
    const maxRetry = 3;
    const newCount = n.retry_count + 1;
    if (newCount >= maxRetry) {
      await conn.execute(
        `UPDATE notification_queue SET status = 'FAILED', error_msg = ?, retry_count = ? WHERE id = ?`,
        [err.message.substring(0, 500), newCount, n.id]
      );
    } else {
      await conn.execute(
        `UPDATE notification_queue SET retry_count = ?, error_msg = ? WHERE id = ?`,
        [newCount, err.message.substring(0, 500), n.id]
      );
    }
  }
}

async function poll() {
  const conn = await (await getPool()).getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT * FROM notification_queue WHERE status = 'PENDING' AND retry_count < 3 ORDER BY created_at LIMIT 10`
    );

    if (rows.length > 0) {
      console.log(`[${new Date().toISOString()}] 发现 ${rows.length} 条待发送通知`);
      for (const row of rows) {
        await processOne(row, conn);
      }
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 轮询异常:`, err.message);
  } finally {
    conn.release();
  }
}

// ==========================================
// 启动
// ==========================================

async function main() {
  console.log('==============================');
  console.log(' notify-worker 通知发送服务');
  console.log(` 数据库: ${config.db.host}:${config.db.port}/${config.db.database}`);
  console.log(` 企微 corpid: ${config.wecom.corpid ? config.wecom.corpid : '❌ 未配置'}`);
  console.log(` 轮询间隔: ${config.pollInterval / 1000}s`);
  console.log('==============================');

  // 验证数据库连接
  try {
    const p = await getPool();
    await p.execute('SELECT 1');
    console.log('✓ 数据库连接成功');
  } catch (err) {
    console.error('✗ 数据库连接失败:', err.message);
    process.exit(1);
  }

  // 启动轮询
  setInterval(poll, config.pollInterval);
  // 启动后立即执行一次
  setTimeout(poll, 1000);
}

main().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});

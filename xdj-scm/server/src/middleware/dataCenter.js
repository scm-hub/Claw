// 多数据中心切换中间件
// 请求头: X-Data-Center: <center_id>
// 根据 dataCenter 切换数据库连接（初期单数据中心，预留扩展）

export async function dataCenterContext(req, res, next) {
  const dcHeader = req.headers['x-data-center'];

  if (dcHeader) {
    // TODO: 查询 data_centers 表，切换数据库连接
    // 初期单数据中心，直接使用默认连接
    req.dataCenterId = dcHeader;
  }

  // 默认数据中心
  req.dataCenterId = req.dataCenterId || 'default';

  next();
}

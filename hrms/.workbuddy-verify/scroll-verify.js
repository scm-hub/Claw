// 复现 + 验证薪资计算页面横向滚动条
const puppeteer = require('/Users/pukun/.workbuddy/binaries/node/workspace/node_modules/puppeteer');
const path = require('path');

(async () => {
  // 截图输出到当前工程目录
  const outDir = '/Users/pukun/WorkBuddy/Claw/hrms/.workbuddy-screens';
  const fs = require('fs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();

  const log = (...a) => console.log('[verify]', ...a);

  try {
    // 1) 打开登录页(可能未登录会跳到登录)
    log('navigate to /payroll/calc');
    await page.goto('http://localhost:5173/payroll/calc', { waitUntil: 'load', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // 2) 等待 — 可能是登录页,也可能是薪资计算页本身
    await new Promise(r => setTimeout(r, 1500));
    const url1 = page.url();
    log('current url:', url1);

    await page.screenshot({ path: path.join(outDir, '1-loaded.png'), fullPage: false });

    if (url1.includes('/login')) {
      log('need login, trying with default dev creds');
      // 尝试找两个输入框和登录按钮
      const inputs = await page.$$('input');
      log('inputs on login page:', inputs.length);
      if (inputs.length >= 2) {
        await inputs[0].type('admin@qihe.local');
        await inputs[1].type('admin123');
        const buttons = await page.$$('button');
        log('buttons on login page:', buttons.length);
        for (const b of buttons) {
          const text = await page.evaluate(el => el.textContent, b);
          if (text && (text.includes('登录') || text.includes('登 录') || text.includes('Login'))) {
            await b.click();
            break;
          }
        }
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    log('navigated to:', page.url());

    // 3) 跳到薪资计算
    if (!page.url().includes('/payroll/calc')) {
      await page.goto('http://localhost:5173/payroll/calc', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 等 vite 加载完
    await page.waitForSelector('body', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 1500));
    }

    log('final url:', page.url());
    await page.screenshot({ path: path.join(outDir, '2-calc.png'), fullPage: false });

    // 4) 找 SalaryCalc 渲染的"宽表"容器 — 父级 div,scrollX 应当 > 0 时显示横向滚动条
    const probe = await page.evaluate(() => {
      // 找到带 table 元素且父 div 设了 overflowX scroll 的容器
      const tables = Array.from(document.querySelectorAll('table'));
      const result = { tables: tables.length, samples: [] };
      for (const t of tables) {
        const parent = t.parentElement;
        if (!parent) continue;
        const cs = getComputedStyle(parent);
        const rect = parent.getBoundingClientRect();
        result.samples.push({
          tag: t.tagName,
          parentTag: parent.tagName,
          parentClass: parent.className,
          parentOverflowX: cs.overflowX,
          parentOverflowY: cs.overflowY,
          parentClientW: parent.clientWidth,
          parentScrollW: parent.scrollWidth,
          parentClientH: parent.clientHeight,
          parentScrollH: parent.scrollHeight,
          tableWidth: t.getBoundingClientRect().width,
        });
      }

      // 也查最外层 MainLayout 的 Outlet 容器
      const outlet = document.querySelector('main, [class*="MuiBox"]');
      return result;
    });

    log('probe result:', JSON.stringify(probe, null, 2));

    // 5) 关键判断:任意一个父容器 scrollWidth > clientWidth 且 overflowX 是 scroll/auto 但实际没显示滚动条?
    for (const s of probe.samples) {
      log(`  table parent: ${s.parentTag}.${s.parentClass}`);
      log(`    overflowX=${s.parentOverflowX} clientW=${s.parentClientW} scrollW=${s.parentScrollW} diff=${s.parentScrollW - s.parentClientW}`);
    }

    await browser.close();
  } catch (e) {
    log('error:', e.message);
    await browser.close();
    process.exit(1);
  }
})();

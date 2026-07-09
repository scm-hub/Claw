/**
 * 生物认证（指纹/面容）服务
 * 通过 WebView JavascriptInterface 调用 Android BiometricPrompt API
 * window.BiometricBridge 由 Android 端在 WebView 初始化时注入
 */

const BIO_ENABLED_KEY = 'xdj_biometric_enabled';
const BIO_USERNAME_KEY = 'xdj_biometric_username';

// 回调管理
let _callbackId = 0;
const _callbacks = {};

// 全局回调 - Android 调用此函数返回结果
window.biometricCallback = function (callbackId, result) {
  const cb = _callbacks[callbackId];
  if (cb) {
    delete _callbacks[callbackId];
    cb(result);
  }
};

function bridgeCall(method, ...args) {
  return new Promise((resolve, reject) => {
    if (!window.BiometricBridge || typeof window.BiometricBridge[method] !== 'function') {
      reject(new Error('BiometricBridge不可用'));
      return;
    }
    const id = 'b_' + ++_callbackId;
    _callbacks[id] = (result) => {
      try {
        resolve(typeof result === 'string' ? JSON.parse(result) : result);
      } catch (e) {
        resolve(result);
      }
    };
    try {
      window.BiometricBridge[method](id, ...args);
    } catch (e) {
      delete _callbacks[id];
      reject(e);
    }
  });
}

export function isNativePlatform() {
  return true; // 始终返回true，让开关始终可见
}

export async function isBiometricPluginAvailable() {
  try {
    const result = await bridgeCall('isAvailable');
    console.log('[Biometric] isAvailable result:', JSON.stringify(result));
    return result && result.isAvailable === true;
  } catch (e) {
    console.error('[Biometric] isAvailable error:', e);
    return false;
  }
}

export async function checkBiometricAvailable() {
  return isBiometricPluginAvailable();
}

export async function authenticateWithBiometric() {
  try {
    const result = await bridgeCall(
      'authenticate',
      '鲜当家身份验证',
      '请验证指纹或面容以登录',
      '取消',
    );
    console.log('[Biometric] authenticate result:', JSON.stringify(result));
    return result && result.success === true;
  } catch (e) {
    console.error('[Biometric] authenticate error:', e);
    return false;
  }
}

export async function isBiometricEnabled() {
  return localStorage.getItem(BIO_ENABLED_KEY) === 'true';
}

export async function getBiometricUsername() {
  return localStorage.getItem(BIO_USERNAME_KEY) || '';
}

export async function enableBiometric(username) {
  localStorage.setItem(BIO_ENABLED_KEY, 'true');
  localStorage.setItem(BIO_USERNAME_KEY, username);
  return true;
}

export async function disableBiometric() {
  localStorage.removeItem(BIO_ENABLED_KEY);
  localStorage.removeItem(BIO_USERNAME_KEY);
  return true;
}

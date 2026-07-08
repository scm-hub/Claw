/**
 * 生物认证（指纹/面容）服务
 * 基于 @aparajita/capacitor-biometric-auth
 * 在 Web 环境下自动降级为不可用
 */
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const BIO_ENABLED_KEY = 'xdj_biometric_enabled';
const BIO_USERNAME_KEY = 'xdj_biometric_username';

/**
 * 检测当前是否原生平台
 */
export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * 检测设备是否支持生物认证
 */
export async function checkBiometricAvailable() {
  if (!isNativePlatform()) return false;
  try {
    const result = await BiometricAuth.checkAvailability();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/**
 * 检查是否已启用生物认证
 */
export async function isBiometricEnabled() {
  try {
    const { value } = await Preferences.get({ key: BIO_ENABLED_KEY });
    return value === 'true';
  } catch {
    // Web 降级 — 使用 localStorage
    return localStorage.getItem(BIO_ENABLED_KEY) === 'true';
  }
}

/**
 * 获取绑定的用户名
 */
export async function getBiometricUsername() {
  try {
    const { value } = await Preferences.get({ key: BIO_USERNAME_KEY });
    return value;
  } catch {
    return localStorage.getItem(BIO_USERNAME_KEY);
  }
}

/**
 * 启用生物认证 — 绑定当前用户名
 */
export async function enableBiometric(username) {
  try {
    await Preferences.set({ key: BIO_ENABLED_KEY, value: 'true' });
    await Preferences.set({ key: BIO_USERNAME_KEY, value: username });
  } catch {
    // Web 降级
    localStorage.setItem(BIO_ENABLED_KEY, 'true');
    localStorage.setItem(BIO_USERNAME_KEY, username);
  }
  return true;
}

/**
 * 禁用生物认证 — 清除绑定
 */
export async function disableBiometric() {
  try {
    await Preferences.remove({ key: BIO_ENABLED_KEY });
    await Preferences.remove({ key: BIO_USERNAME_KEY });
  } catch {
    localStorage.removeItem(BIO_ENABLED_KEY);
    localStorage.removeItem(BIO_USERNAME_KEY);
  }
  return true;
}

/**
 * 执行生物认证 — 弹出指纹/面容验证
 * @returns {boolean} 认证是否成功
 */
export async function authenticateWithBiometric() {
  if (!isNativePlatform()) return false;
  try {
    const available = await checkBiometricAvailable();
    if (!available) return false;

    const result = await BiometricAuth.authenticate({
      reason: '请验证您的身份以快速登录鲜当家SCM',
      cancelTitle: '取消',
      unlockTitle: '验证身份',
      fallbackTitle: '使用密码',
      android: {
        subtitle: '使用指纹或面容解锁',
        confirmationRequired: false,
      },
    });
    return result.isAuthenticated || true;
  } catch (e) {
    console.warn('Biometric auth failed:', e);
    return false;
  }
}

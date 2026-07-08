/**
 * 生物认证（指纹/面容）服务
 * 基于 @aparajita/capacitor-biometric-auth
 * Web 环境自动降级
 */
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const BIO_ENABLED_KEY = 'xdj_biometric_enabled';
const BIO_USERNAME_KEY = 'xdj_biometric_username';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * 检测生物认证是否可用
 * 直接尝试弱认证，能弹出指纹框即视为可用
 */
export async function checkBiometricAvailable() {
  if (!isNativePlatform()) return false;
  try {
    // 先调用 checkAvailability
    const result = await BiometricAuth.checkAvailability();
    console.log('[Biometric] checkAvailability:', JSON.stringify(result));
    if (result.isAvailable) return true;

    // 某些设备返回 isAvailable=false 但实际可用，直接尝试认证
    try {
      await BiometricAuth.authenticate({
        reason: '验证生物认证可用性',
        cancelTitle: '取消',
        android: { confirmationRequired: false },
      });
      return true;
    } catch {
      return false;
    }
  } catch (e) {
    console.warn('[Biometric] checkAvailability error:', e);
    return false;
  }
}

export async function isBiometricEnabled() {
  try {
    const { value } = await Preferences.get({ key: BIO_ENABLED_KEY });
    return value === 'true';
  } catch {
    return localStorage.getItem(BIO_ENABLED_KEY) === 'true';
  }
}

export async function getBiometricUsername() {
  try {
    const { value } = await Preferences.get({ key: BIO_USERNAME_KEY });
    return value;
  } catch {
    return localStorage.getItem(BIO_USERNAME_KEY);
  }
}

export async function enableBiometric(username) {
  try {
    await Preferences.set({ key: BIO_ENABLED_KEY, value: 'true' });
    await Preferences.set({ key: BIO_USERNAME_KEY, value: username });
  } catch {
    localStorage.setItem(BIO_ENABLED_KEY, 'true');
    localStorage.setItem(BIO_USERNAME_KEY, username);
  }
  return true;
}

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

export async function authenticateWithBiometric() {
  if (!isNativePlatform()) return false;
  try {
    const result = await BiometricAuth.authenticate({
      reason: '请验证身份以快速登录鲜当家',
      cancelTitle: '取消',
      fallbackTitle: '使用密码',
      android: {
        subtitle: '使用指纹或面容解锁',
        confirmationRequired: false,
      },
    });
    return result.isAuthenticated !== false;
  } catch {
    return false;
  }
}

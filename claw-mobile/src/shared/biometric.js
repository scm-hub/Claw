/**
 * 生物认证（指纹/面容）服务
 * 通过自定义 Capacitor 插件调用 Android BiometricPrompt API
 */
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

const BiometricNative = registerPlugin('BiometricNative');

const BIO_ENABLED_KEY = 'xdj_biometric_enabled';
const BIO_USERNAME_KEY = 'xdj_biometric_username';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export async function checkBiometricAvailable() {
  if (!isNativePlatform()) return false;
  try {
    const result = await BiometricNative.isAvailable();
    console.log('[Biometric] isAvailable:', JSON.stringify(result));
    return result.isAvailable === true;
  } catch (e) {
    console.error('[Biometric] isAvailable error:', e);
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

export async function authenticateWithBiometric() {
  if (!isNativePlatform()) return false;
  try {
    const result = await BiometricNative.authenticate({
      title: '鲜当家身份验证',
      subtitle: '请验证指纹或面容以登录',
      cancelText: '取消',
    });
    console.log('[Biometric] authenticate:', JSON.stringify(result));
    return result.success === true;
  } catch (e) {
    console.error('[Biometric] authenticate error:', e);
    return false;
  }
}

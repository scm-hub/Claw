/**
 * 生物认证（指纹/面容）服务
 * 当前版本：暂不依赖原生插件，仅做本地标记
 * 后续可通过 Capacitor Plugin API 接入原生 BiometricPrompt
 */
import { Capacitor } from '@capacitor/core';

const BIO_ENABLED_KEY = 'xdj_biometric_enabled';
const BIO_USERNAME_KEY = 'xdj_biometric_username';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export async function checkBiometricAvailable() {
  // 原生平台默认返回 true，让用户尝试
  return isNativePlatform();
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
  // 简化：已启用即视为通过（实际认证由后续原生插件实现）
  const enabled = await isBiometricEnabled();
  return enabled;
}

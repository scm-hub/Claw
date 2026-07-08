/**
 * 生物认证（指纹/面容）服务
 * 基于 @capgo/capacitor-native-biometric
 */
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const BIO_ENABLED_KEY = 'xdj_biometric_enabled';
const BIO_USERNAME_KEY = 'xdj_biometric_username';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export async function checkBiometricAvailable() {
  if (!isNativePlatform()) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled() {
  try {
    const { value } = await NativeBiometric.getCredential({ server: BIO_ENABLED_KEY });
    return value?.password === 'true';
  } catch {
    return localStorage.getItem(BIO_ENABLED_KEY) === 'true';
  }
}

export async function getBiometricUsername() {
  try {
    const { value } = await NativeBiometric.getCredential({ server: BIO_USERNAME_KEY });
    return value?.password || '';
  } catch {
    return localStorage.getItem(BIO_USERNAME_KEY) || '';
  }
}

export async function enableBiometric(username) {
  // 使用 Android Keystore 安全存储凭证
  try {
    await NativeBiometric.setCredential({
      server: BIO_USERNAME_KEY,
      username: username,
      password: username,
    });
    await NativeBiometric.setCredential({
      server: BIO_ENABLED_KEY,
      username: 'enabled',
      password: 'true',
    });
  } catch {
    localStorage.setItem(BIO_ENABLED_KEY, 'true');
    localStorage.setItem(BIO_USERNAME_KEY, username);
  }
  return true;
}

export async function disableBiometric() {
  try {
    await NativeBiometric.deleteCredential({ server: BIO_ENABLED_KEY });
    await NativeBiometric.deleteCredential({ server: BIO_USERNAME_KEY });
  } catch {
    localStorage.removeItem(BIO_ENABLED_KEY);
    localStorage.removeItem(BIO_USERNAME_KEY);
  }
  return true;
}

export async function authenticateWithBiometric() {
  if (!isNativePlatform()) return false;
  try {
    await NativeBiometric.verifyIdentity({
      reason: '请验证身份以登录鲜当家',
      title: '生物认证',
      subtitle: '使用指纹或面容',
    });
    return true;
  } catch {
    return false;
  }
}

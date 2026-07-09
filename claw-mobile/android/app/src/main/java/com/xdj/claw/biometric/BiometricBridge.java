package com.xdj.claw.biometric;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import java.util.concurrent.Executor;
import org.json.JSONObject;

/**
 * 通过 WebView addJavascriptInterface 注入到 JS 全局 scope
 * JS: window.BiometricBridge.isAvailable(callbackId)
 * JS: window.BiometricBridge.authenticate(callbackId, title, subtitle, cancelText)
 * 结果回调: window.biometricCallback(callbackId, resultJson)
 */
public class BiometricBridge {

    private static final String TAG = "BiometricBridge";
    private final Activity activity;
    private WebView webView;

    public BiometricBridge(Activity activity) {
        this.activity = activity;
    }

    /**
     * 设置 WebView 引用，用于 evaluateJavascript 回调
     */
    public void setWebView(WebView wv) {
        this.webView = wv;
    }

    @JavascriptInterface
    public void isAvailable(final String callbackId) {
        Log.d(TAG, "isAvailable called, callbackId=" + callbackId);
        try {
            Context context = activity;
            BiometricManager biometricManager = BiometricManager.from(context);
            int result = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);

            JSONObject json = new JSONObject();
            switch (result) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    json.put("isAvailable", true);
                    json.put("message", "生物认证可用");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    json.put("isAvailable", false);
                    json.put("message", "设备不支持生物认证");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    json.put("isAvailable", false);
                    json.put("message", "生物认证硬件不可用");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    json.put("isAvailable", false);
                    json.put("message", "未录入指纹或面容，请先在系统设置中添加");
                    break;
                default:
                    json.put("isAvailable", false);
                    json.put("message", "未知错误: " + result);
            }
            Log.d(TAG, "isAvailable result: " + json.toString());
            sendCallback(callbackId, json.toString());
        } catch (Exception e) {
            Log.e(TAG, "isAvailable error: " + e.getMessage(), e);
            sendCallback(callbackId, "{\"isAvailable\":false,\"message\":\"检查异常\"}");
        }
    }

    @JavascriptInterface
    public void authenticate(final String callbackId, final String title, final String subtitle, final String cancelText) {
        Log.d(TAG, "authenticate called, callbackId=" + callbackId);
        if (activity == null) {
            sendCallback(callbackId, "{\"success\":false,\"message\":\"Activity为空\"}");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                Executor executor = ContextCompat.getMainExecutor(activity);

                BiometricPrompt biometricPrompt = new BiometricPrompt((FragmentActivity) activity, executor,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            Log.d(TAG, "Authentication succeeded");
                            sendCallback(callbackId, "{\"success\":true}");
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            Log.d(TAG, "Authentication failed (fingerprint mismatch)");
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            Log.d(TAG, "Authentication error: " + errorCode + " " + errString);
                            try {
                                JSONObject json = new JSONObject();
                                json.put("success", false);
                                json.put("errorCode", errorCode);
                                json.put("message", errString.toString());
                                sendCallback(callbackId, json.toString());
                            } catch (Exception e) {
                                sendCallback(callbackId, "{\"success\":false,\"message\":\"验证错误\"}");
                            }
                        }
                    });

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title != null ? title : "身份验证")
                        .setSubtitle(subtitle != null ? subtitle : "请验证指纹或面容")
                        .setNegativeButtonText(cancelText != null ? cancelText : "取消")
                        .build();

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                Log.e(TAG, "authenticate error: " + e.getMessage(), e);
                sendCallback(callbackId, "{\"success\":false,\"message\":\"启动验证失败\"}");
            }
        });
    }

    private void sendCallback(final String callbackId, final String resultJson) {
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (webView != null) {
                String js = "javascript:if(window.biometricCallback)window.biometricCallback('"
                        + callbackId + "'," + resultJson + ");";
                Log.d(TAG, "Evaluating JS: " + js);
                webView.evaluateJavascript(js, null);
            } else {
                Log.w(TAG, "WebView is null, cannot send callback");
            }
        });
    }
}

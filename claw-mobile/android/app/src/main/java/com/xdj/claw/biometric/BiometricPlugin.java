package com.xdj.claw.biometric;

import android.app.Activity;
import android.content.Context;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricNative")
public class BiometricPlugin extends Plugin {

    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        Context context = getContext();
        BiometricManager biometricManager = BiometricManager.from(context);
        int result = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);

        JSObject ret = new JSObject();
        switch (result) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                ret.put("isAvailable", true);
                ret.put("message", "生物认证可用");
                break;
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                ret.put("isAvailable", false);
                ret.put("message", "设备不支持生物认证");
                break;
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                ret.put("isAvailable", false);
                ret.put("message", "生物认证硬件不可用");
                break;
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                ret.put("isAvailable", false);
                ret.put("message", "未录入指纹或面容，请先在系统设置中添加");
                break;
            default:
                ret.put("isAvailable", false);
                ret.put("message", "未知错误: " + result);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String title = call.getString("title", "身份验证");
        String subtitle = call.getString("subtitle", "请验证指纹或面容");
        String cancelText = call.getString("cancelText", "取消");

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("无法获取 Activity");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(activity);

        biometricPrompt = new BiometricPrompt((FragmentActivity) activity, executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                }

                @Override
                public void onAuthenticationFailed() {
                    // 指纹不匹配，继续重试
                }

                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("errorCode", errorCode);
                    ret.put("message", errString.toString());
                    call.resolve(ret);
                }
            });

        promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setNegativeButtonText(cancelText)
                .build();

        biometricPrompt.authenticate(promptInfo);
    }
}

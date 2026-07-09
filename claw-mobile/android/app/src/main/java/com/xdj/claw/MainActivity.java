package com.xdj.claw;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.xdj.claw.biometric.BiometricBridge;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private BiometricBridge biometricBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        injectBiometricBridge();
    }

    private void injectBiometricBridge() {
        try {
            if (bridge == null) {
                Log.w(TAG, "Bridge is null, retrying on next resume");
                return;
            }
            WebView webView = bridge.getWebView();
            if (webView == null) {
                Log.w(TAG, "WebView is null, retrying on next resume");
                return;
            }
            if (biometricBridge == null) {
                biometricBridge = new BiometricBridge(this);
                biometricBridge.setWebView(webView);
                webView.addJavascriptInterface(biometricBridge, "BiometricBridge");
                Log.i(TAG, "BiometricBridge injected successfully via JavascriptInterface");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to inject BiometricBridge: " + e.getMessage(), e);
        }
    }
}

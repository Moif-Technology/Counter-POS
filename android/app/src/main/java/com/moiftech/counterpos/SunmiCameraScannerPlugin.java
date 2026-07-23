package com.moiftech.counterpos;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Set;

@CapacitorPlugin(name = "SunmiCameraScanner")
public class SunmiCameraScannerPlugin extends Plugin {

    private static final String SUMMI_SCAN_ACTION = "com.summi.scan";
    private static final String SUNMI_QR_SCAN_ACTION = "com.sunmi.scanner.qrscanner";
    private static final String SUNMI_QR_CODE_SCANNER_PACKAGE = "com.sunmi.sunmiqrcodescanner";
    private static final String SUNMI_SCANNER_PACKAGE = "com.sunmi.scanner";

    @PluginMethod
    public void scan(PluginCall call) {
        Intent intent = buildAvailableScannerIntent();
        if (intent == null) {
            call.reject("Sunmi scanner app not available");
            return;
        }

        try {
            startActivityForResult(call, intent, "handleScanResult");
        } catch (Exception e) {
            call.reject("Scanner app not available: " + e.getMessage());
        }
    }

    private Intent buildAvailableScannerIntent() {
        Intent[] candidates = new Intent[] {
            new Intent(SUMMI_SCAN_ACTION).setPackage(SUNMI_QR_CODE_SCANNER_PACKAGE),
            new Intent(SUMMI_SCAN_ACTION).setPackage(SUNMI_SCANNER_PACKAGE),
            new Intent(SUNMI_QR_SCAN_ACTION).setPackage(SUNMI_SCANNER_PACKAGE)
        };

        for (Intent intent : candidates) {
            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                return intent;
            }
        }
        return null;
    }

    @ActivityCallback
    private void handleScanResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            call.reject("No scan data returned");
            return;
        }

        String barcode = extractBarcode(data);
        if (barcode == null || barcode.isEmpty()) {
            call.reject("Empty scan result");
            return;
        }

        JSObject ret = new JSObject();
        ret.put("barcode", barcode);
        call.resolve(ret);
    }

    private String extractBarcode(Intent data) {
        String value = data.getStringExtra("SCAN_RESULT");
        if (value != null && !value.trim().isEmpty()) return value.trim();

        value = data.getStringExtra("data");
        if (value != null && !value.trim().isEmpty()) return value.trim();

        try {
            @SuppressWarnings("unchecked")
            ArrayList<HashMap<String, String>> list =
                (ArrayList<HashMap<String, String>>) data.getSerializableExtra("SCAN_RESULT_LIST");
            value = firstValueFromList(list);
            if (value != null && !value.isEmpty()) return value;
        } catch (Exception ignored) {}

        Bundle extras = data.getExtras();
        if (extras != null) {
            Set<String> keys = extras.keySet();
            for (String key : keys) {
                Object extra = extras.get(key);
                if (extra instanceof String) {
                    value = ((String) extra).trim();
                    if (!value.isEmpty()) return value;
                }
                if (extra instanceof ArrayList) {
                    try {
                        @SuppressWarnings("unchecked")
                        ArrayList<HashMap<String, String>> list = (ArrayList<HashMap<String, String>>) extra;
                        value = firstValueFromList(list);
                        if (value != null && !value.isEmpty()) return value;
                    } catch (Exception ignored) {}
                }
            }
        }

        return null;
    }

    private String firstValueFromList(ArrayList<HashMap<String, String>> list) {
        if (list == null) return null;
        for (HashMap<String, String> item : list) {
            if (item == null) continue;
            String value = item.get("VALUE");
            if (value == null || value.isEmpty()) value = item.get("value");
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return null;
    }
}

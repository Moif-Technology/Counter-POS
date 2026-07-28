package com.moiftech.counterpos;

import android.hardware.display.DisplayManager;
import android.view.Display;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sunmi D3 Mini (and any Android dual-display device) customer-facing screen support.
 *
 * JS usage (after registerPlugin in Capacitor):
 *
 *   import { SunmiCustomerDisplay } from '../lib/sunmiCustomerDisplay'
 *
 *   // Check if second screen is connected
 *   const { available } = await SunmiCustomerDisplay.isAvailable()
 *
 *   // Open customer display WebView on second screen
 *   await SunmiCustomerDisplay.openDisplay({ url: 'https://localhost/customer-display' })
 *
 *   // Push state to customer display (called automatically by customerDisplay.js broadcaster)
 *   await SunmiCustomerDisplay.sendState({ json: JSON.stringify(payload) })
 *
 *   // Close when done
 *   await SunmiCustomerDisplay.closeDisplay()
 */
@CapacitorPlugin(name = "SunmiCustomerDisplay")
public class CustomerDisplayPlugin extends Plugin {

    private CustomerDisplayPresentation presentation = null;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        DisplayManager dm = (DisplayManager) getContext().getSystemService(getContext().DISPLAY_SERVICE);
        Display[] all = dm.getDisplays();
        boolean available = all.length > 1;
        JSObject ret = new JSObject();
        ret.put("available", available);
        // Also report display count for debugging
        ret.put("displayCount", all.length);
        call.resolve(ret);
    }

    @PluginMethod
    public void openDisplay(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        DisplayManager dm = (DisplayManager) getActivity().getSystemService(getActivity().DISPLAY_SERVICE);
        Display[] displays = dm.getDisplays();

        if (displays.length < 2) {
            call.reject("No secondary display detected");
            return;
        }

        // Use the second display (index 1); Sunmi D3 Mini rear screen is always index 1
        Display secondary = displays[1];

        getActivity().runOnUiThread(() -> {
            if (presentation != null) {
                presentation.dismiss();
                presentation = null;
            }
            try {
                presentation = new CustomerDisplayPresentation(getActivity(), secondary);
                presentation.show();
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to open display: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void closeDisplay(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (presentation != null) {
                presentation.dismiss();
                presentation = null;
            }
            call.resolve();
        });
    }

    /**
     * Push JSON state to the customer display WebView.
     * Escapes the JSON string so it's safe to embed in a JS string literal.
     */
    @PluginMethod
    public void sendState(PluginCall call) {
        String json = call.getString("json");
        if (json == null) { call.resolve(); return; }

        // Escape for safe embedding in a single-quoted JS string
        String escaped = json
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r");

        getActivity().runOnUiThread(() -> {
            if (presentation != null) {
                presentation.sendState(escaped);
            }
            call.resolve();
        });
    }
}

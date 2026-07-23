package com.moiftech.counterpos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SunmiCameraScannerPlugin.class);
        registerPlugin(SunmiPrinterPlugin.class);
        registerPlugin(CustomerDisplayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

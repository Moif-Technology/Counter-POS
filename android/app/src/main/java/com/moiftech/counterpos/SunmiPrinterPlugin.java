package com.moiftech.counterpos;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.RemoteException;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import woyou.aidlservice.jiuiv5.IWoyouService;

@CapacitorPlugin(name = "SunmiPrinter")
public class SunmiPrinterPlugin extends Plugin {

    private static final String SERVICE_PACKAGE = "woyou.aidlservice.jiuiv5";
    private static final String SERVICE_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService";
    private static final int BARCODE_CODE128 = 8;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService printerExecutor = Executors.newSingleThreadExecutor();

    private IWoyouService printerService;
    private boolean binding;
    private PluginCall pendingCall;
    private JSArray pendingCommands;
    private PluginCall pendingHtmlCall;
    private String pendingHtml;
    private int pendingHtmlWidth;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            printerService = IWoyouService.Stub.asInterface(service);
            binding = false;
            PluginCall call = pendingCall;
            JSArray commands = pendingCommands;
            pendingCall = null;
            pendingCommands = null;
            PluginCall htmlCall = pendingHtmlCall;
            String html = pendingHtml;
            int htmlWidth = pendingHtmlWidth;
            pendingHtmlCall = null;
            pendingHtml = null;
            pendingHtmlWidth = 0;
            if (call != null && commands != null) {
                executePrint(call, commands);
            }
            if (htmlCall != null && html != null) {
                executePrintHtml(htmlCall, html, htmlWidth);
            }
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            printerService = null;
            binding = false;
        }
    };

    @Override
    public void load() {
        bindPrinterService();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        if (printerService != null) {
            resolveAvailability(call, true);
            return;
        }

        boolean started = bindPrinterService();
        resolveAvailability(call, started);
    }

    @PluginMethod
    public void print(PluginCall call) {
        JSArray commands = call.getArray("commands");
        if (commands == null || commands.length() == 0) {
            call.reject("No print commands supplied");
            return;
        }

        if (printerService == null) {
            pendingCall = call;
            pendingCommands = commands;
            if (!bindPrinterService()) {
                clearPending(call);
                call.reject("Sunmi printer service not available");
                return;
            }

            mainHandler.postDelayed(() -> {
                if (pendingCall == call) {
                    clearPending(call);
                    call.reject("Sunmi printer service did not connect");
                }
            }, 4000);
            return;
        }

        executePrint(call, commands);
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.trim().isEmpty()) {
            call.reject("No receipt HTML supplied");
            return;
        }

        Integer widthArg = call.getInt("width");
        int width = widthArg != null && widthArg > 0 ? widthArg : 576;

        if (printerService == null) {
            pendingHtmlCall = call;
            pendingHtml = html;
            pendingHtmlWidth = width;
            if (!bindPrinterService()) {
                clearPendingHtml(call);
                call.reject("Sunmi printer service not available");
                return;
            }

            mainHandler.postDelayed(() -> {
                if (pendingHtmlCall == call) {
                    clearPendingHtml(call);
                    call.reject("Sunmi printer service did not connect");
                }
            }, 4000);
            return;
        }

        executePrintHtml(call, html, width);
    }

    private boolean bindPrinterService() {
        if (printerService != null) return true;
        if (binding) return true;

        Intent intent = new Intent();
        intent.setPackage(SERVICE_PACKAGE);
        intent.setAction(SERVICE_ACTION);

        try {
            binding = getContext().bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
            return binding;
        } catch (Exception ignored) {
            binding = false;
            return false;
        }
    }

    private void executePrint(PluginCall call, JSArray commands) {
        printerExecutor.execute(() -> {
            try {
                if (printerService == null) {
                    rejectOnMain(call, "Sunmi printer service not connected");
                    return;
                }

                int state = printerService.updatePrinterState();
                if (isHardPrinterError(state)) {
                    rejectOnMain(call, printerStateMessage(state));
                    return;
                }

                printerService.printerInit(null);
                for (int i = 0; i < commands.length(); i++) {
                    JSONObject command = commands.getJSONObject(i);
                    executeCommand(command);
                }

                JSObject ret = new JSObject();
                ret.put("printed", true);
                ret.put("printerState", state);
                resolveOnMain(call, ret);
            } catch (Exception e) {
                rejectOnMain(call, "Print failed: " + e.getMessage());
            }
        });
    }

    private void executePrintHtml(PluginCall call, String html, int width) {
        mainHandler.post(() -> {
            try {
                WebView webView = new WebView(getContext());
                webView.setBackgroundColor(Color.WHITE);
                webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(false);
                settings.setLoadWithOverviewMode(false);
                settings.setUseWideViewPort(false);
                settings.setDefaultTextEncodingName("UTF-8");

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        mainHandler.postDelayed(() -> renderAndPrintHtml(call, view, width), 350);
                    }
                });

                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                call.reject("Receipt render failed: " + e.getMessage());
            }
        });
    }

    private void renderAndPrintHtml(PluginCall call, WebView webView, int width) {
        try {
            int exactWidth = View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY);
            int freeHeight = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED);
            webView.measure(exactWidth, freeHeight);

            int height = webView.getMeasuredHeight();
            if (height <= 0) {
                height = Math.max(1, (int) (webView.getContentHeight() * webView.getScale()));
            }
            height = Math.max(height, 1);

            webView.layout(0, 0, width, height);

            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            canvas.drawColor(Color.WHITE);
            webView.draw(canvas);
            webView.destroy();

            printerExecutor.execute(() -> printBitmap(call, bitmap));
        } catch (Exception e) {
            try {
                webView.destroy();
            } catch (Exception ignored) {}
            call.reject("Receipt render failed: " + e.getMessage());
        }
    }

    private void printBitmap(PluginCall call, Bitmap bitmap) {
        try {
            if (printerService == null) {
                rejectOnMain(call, "Sunmi printer service not connected");
                return;
            }

            int state = printerService.updatePrinterState();
            if (isHardPrinterError(state)) {
                rejectOnMain(call, printerStateMessage(state));
                return;
            }

            printerService.printerInit(null);
            printerService.setAlignment(1, null);
            printerService.printBitmap(bitmap, null);
            printerService.lineWrap(3, null);
            try {
                printerService.sendRAWData(new byte[] { 0x1d, 0x56, 0x42, 0x00 }, null);
            } catch (Exception ignored) {
                printerService.lineWrap(4, null);
            }

            JSObject ret = new JSObject();
            ret.put("printed", true);
            ret.put("printerState", state);
            resolveOnMain(call, ret);
        } catch (Exception e) {
            rejectOnMain(call, "Print failed: " + e.getMessage());
        } finally {
            try {
                bitmap.recycle();
            } catch (Exception ignored) {}
        }
    }

    private void executeCommand(JSONObject command) throws JSONException, RemoteException {
        String type = command.optString("type", "text");

        switch (type) {
            case "align":
                printerService.setAlignment(command.optInt("value", 0), null);
                break;
            case "size":
                printerService.setFontSize((float) command.optDouble("value", 24), null);
                break;
            case "text":
                printerService.setAlignment(command.optInt("align", 0), null);
                printerService.printTextWithFont(
                    command.optString("text", "") + "\n",
                    "",
                    (float) command.optDouble("size", 24),
                    null
                );
                break;
            case "plainText":
                printerService.setAlignment(command.optInt("align", 0), null);
                printerService.setFontSize((float) command.optDouble("size", 20), null);
                printerService.printOriginalText(command.optString("text", ""), null);
                break;
            case "receiptTextBitmap":
                printerService.setAlignment(1, null);
                printerService.printBitmap(renderReceiptTextBitmap(
                    command.optString("text", ""),
                    command.optInt("width", 576),
                    command.optInt("padding", 4),
                    (float) command.optDouble("textSize", 22)
                ), null);
                break;
            case "columns":
                printerService.setFontSize((float) command.optDouble("size", 20), null);
                printerService.printColumnsText(
                    jsonStringArray(command.getJSONArray("texts")),
                    jsonIntArray(command.getJSONArray("widths")),
                    jsonIntArray(command.getJSONArray("aligns")),
                    null
                );
                break;
            case "barcode":
                printerService.setAlignment(1, null);
                printerService.printBarCode(
                    command.optString("text", ""),
                    BARCODE_CODE128,
                    command.optInt("height", 64),
                    command.optInt("width", 2),
                    command.optInt("position", 2),
                    null
                );
                break;
            case "feed":
                printerService.lineWrap(command.optInt("lines", 1), null);
                break;
            case "cut":
                try {
                    printerService.lineWrap(3, null);
                    printerService.sendRAWData(new byte[] { 0x1d, 0x56, 0x42, 0x00 }, null);
                } catch (Exception ignored) {
                    printerService.lineWrap(4, null);
                }
                break;
            default:
                printerService.printText(command.optString("text", "") + "\n", null);
                break;
        }
    }

    private Bitmap renderReceiptTextBitmap(String text, int width, int padding, float requestedTextSize) {
        String[] lines = text == null ? new String[] { "" } : text.split("\\n", -1);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.BLACK);
        paint.setTypeface(Typeface.MONOSPACE);
        paint.setFakeBoldText(true);
        paint.setTextSize(requestedTextSize);

        int printableWidth = Math.max(1, width - (padding * 2));
        String widestLine = "";
        for (String line : lines) {
            if (line == null) continue;
            if (isRuleLine(line)) continue;
            if (line.length() > widestLine.length()) widestLine = line;
        }
        if (widestLine.isEmpty()) widestLine = " ";

        while (paint.measureText(widestLine) > printableWidth && paint.getTextSize() > 14f) {
            paint.setTextSize(paint.getTextSize() - 1f);
        }
        while (paint.measureText(widestLine) < printableWidth * 0.94f && paint.getTextSize() < 28f) {
            paint.setTextSize(paint.getTextSize() + 1f);
        }

        Paint.FontMetrics fm = paint.getFontMetrics();
        int lineHeight = Math.max(18, (int) Math.ceil(fm.descent - fm.ascent) + 4);
        int height = Math.max(lineHeight, (lines.length * lineHeight) + (padding * 2));

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.drawColor(Color.WHITE);

        float y = padding - fm.ascent;
        for (String line : lines) {
            String safeLine = line == null ? "" : line;
            if (isRuleLine(safeLine)) {
                float ruleY = y + fm.ascent + (lineHeight / 2f);
                Paint rulePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                rulePaint.setColor(Color.BLACK);
                rulePaint.setStrokeWidth(safeLine.startsWith("=") ? 4.5f : 3.2f);
                rulePaint.setPathEffect(new DashPathEffect(new float[] { 11f, 7f }, 0));
                canvas.drawLine(0, ruleY, width, ruleY, rulePaint);
            } else {
                drawThermalText(canvas, safeLine, padding, y, paint, isEmphasisLine(safeLine));
            }
            y += lineHeight;
        }

        return bitmap;
    }

    private void drawThermalText(Canvas canvas, String text, float x, float y, Paint paint, boolean emphasis) {
        canvas.drawText(text, x, y, paint);
        canvas.drawText(text, x + 0.45f, y, paint);
        if (emphasis) {
            canvas.drawText(text, x + 0.9f, y, paint);
            canvas.drawText(text, x, y + 0.45f, paint);
        }
    }

    private boolean isEmphasisLine(String line) {
        if (line == null) return false;
        String trimmed = line.trim();
        if (trimmed.isEmpty()) return false;
        String upper = trimmed.toUpperCase();

        if (upper.equals("TAX INVOICE")
            || upper.equals("RETURN INVOICE")
            || upper.equals("HELD BILL")
            || upper.equals("HELD RETURN")
            || upper.equals("DELIVERY NOTE")
            || upper.equals("RECEIPT VOUCHER")
            || upper.equals("TAX DETAILS")
            || upper.equals("CLEARED BILLS")
            || upper.equals("CUSTOMER")
            || upper.equals("TOTAL")
            || upper.equals("STAFF WISE SALES REPORT")
            || upper.endsWith("- REPORT")) {
            return true;
        }

        return upper.startsWith("TOTAL")
            || upper.startsWith("PAID AMOUNT")
            || upper.startsWith("BILL AMOUNT")
            || upper.startsWith("BAL. AMOUNT")
            || upper.startsWith("GRAND TOTAL")
            || upper.startsWith("NET AMOUNT")
            || upper.startsWith("CASH TO BE COLLECTED")
            || upper.startsWith("COLLECTED CASH")
            || upper.startsWith("CASH DIFFERENCE")
            || upper.contains(" THANK YOU")
            || upper.contains("VISIT AGAIN");
    }

    private boolean isRuleLine(String line) {
        if (line == null) return false;
        String trimmed = line.trim();
        if (trimmed.length() < 8) return false;
        return trimmed.matches("[-.=]+");
    }

    private String[] jsonStringArray(org.json.JSONArray array) throws JSONException {
        String[] result = new String[array.length()];
        for (int i = 0; i < array.length(); i++) {
            result[i] = array.optString(i, "");
        }
        return result;
    }

    private int[] jsonIntArray(org.json.JSONArray array) throws JSONException {
        int[] result = new int[array.length()];
        for (int i = 0; i < array.length(); i++) {
            result[i] = array.optInt(i, 0);
        }
        return result;
    }

    private void resolveAvailability(PluginCall call, boolean available) {
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    private void clearPending(PluginCall call) {
        if (pendingCall == call) {
            pendingCall = null;
            pendingCommands = null;
        }
    }

    private void clearPendingHtml(PluginCall call) {
        if (pendingHtmlCall == call) {
            pendingHtmlCall = null;
            pendingHtml = null;
            pendingHtmlWidth = 0;
        }
    }

    private void resolveOnMain(PluginCall call, JSObject ret) {
        mainHandler.post(() -> call.resolve(ret));
    }

    private void rejectOnMain(PluginCall call, String message) {
        mainHandler.post(() -> call.reject(message));
    }

    private boolean isHardPrinterError(int state) {
        return state == 4 || state == 5 || state == 6 || state == 7 || state == 505;
    }

    private String printerStateMessage(int state) {
        switch (state) {
            case 0: return "Printer ready";
            case 1: return "Printer ready";
            case 2: return "Printer preparing";
            case 3: return "Printer communication error";
            case 4: return "Printer out of paper";
            case 5: return "Printer overheated";
            case 6: return "Printer cover open";
            case 7: return "Printer cutter error";
            case 8: return "Printer cutter recovered";
            case 9: return "Printer black mark not found";
            case 505: return "Printer not detected";
            default: return "Printer not ready (" + state + ")";
        }
    }
}

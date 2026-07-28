package com.moiftech.counterpos;

import android.app.Presentation;
import android.content.Context;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;

public class CustomerDisplayPresentation extends Presentation {

    private WebView webView;
    private static final String ASSET_HOST = "appassets.androidplatform.net";

    public CustomerDisplayPresentation(Context context, Display display) {
        super(context, display);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        final Context ctx = getContext();

        // Serve built JS/CSS from android assets, SPA fallback to index.html for any route
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain(ASSET_HOST)
            .addPathHandler("/assets/", path ->
                openAsset(ctx, "public/assets/" + path, getMimeType(path))
            )
            .addPathHandler("/", path -> {
                // Try exact file first (favicon, etc), then fall back to index.html for SPA routes
                try {
                    InputStream is = ctx.getAssets().open("public/" + path);
                    return new WebResourceResponse(getMimeType(path), "utf-8", is);
                } catch (IOException ignored) {
                    try {
                        InputStream is = ctx.getAssets().open("public/index.html");
                        return new WebResourceResponse("text/html", "utf-8", is);
                    } catch (IOException e) {
                        return null;
                    }
                }
            })
            .build();

        FrameLayout root = new FrameLayout(ctx);
        FrameLayout.LayoutParams fullscreen = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );

        webView = new WebView(ctx);
        webView.setLayoutParams(fullscreen);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        root.addView(webView);
        setContentView(root);

        // Load at /customer-display — React Router renders CustomerDisplayPage directly
        webView.loadUrl("https://" + ASSET_HOST + "/customer-display");
    }

    public void sendState(String escapedJson) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(
            "window.__cdReceive && window.__cdReceive('" + escapedJson + "')",
            null
        ));
    }

    @Override
    public void dismiss() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.dismiss();
    }

    private static WebResourceResponse openAsset(Context ctx, String assetPath, String mimeType) {
        try {
            InputStream is = ctx.getAssets().open(assetPath);
            return new WebResourceResponse(mimeType, "utf-8", is);
        } catch (IOException e) {
            return null;
        }
    }

    private static String getMimeType(String path) {
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
        if (path.endsWith(".css"))  return "text/css";
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png"))  return "image/png";
        if (path.endsWith(".svg"))  return "image/svg+xml";
        if (path.endsWith(".ico"))  return "image/x-icon";
        return "application/octet-stream";
    }
}

package com.visitanthub.tv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS   = "tv_prefs";
    private static final String KEY_SLUG = "company_slug";
    private static final String BASE_URL = "https://visitanthub.com";

    private WebView webView;
    private boolean webViewShowing = false;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();

        String slug = getSavedSlug();
        if (slug != null) {
            loadBoard(slug);
        } else {
            showSetup(null);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // MENU button or long-press BACK → return to setup screen
        if (keyCode == KeyEvent.KEYCODE_MENU ||
                (keyCode == KeyEvent.KEYCODE_BACK && event.getRepeatCount() > 0)) {
            resetToSetup();
            return true;
        }
        // Single BACK while showing board → do nothing (don't exit the app)
        if (keyCode == KeyEvent.KEYCODE_BACK && webViewShowing) {
            if (webView != null && webView.canGoBack()) webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void resetToSetup() {
        clearSlug();
        if (webView != null) { webView.destroy(); webView = null; }
        showSetup(null);
    }

    // ── Display Board WebView ─────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private void loadBoard(String slug) {
        webViewShowing = true;
        webView = new WebView(this);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setBackgroundColor(Color.BLACK);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                // Network error: retry after 8 seconds (keeps looping until connectivity returns)
                view.postDelayed(() -> {
                    if (!isFinishing()) view.reload();
                }, 8000);
            }
        });

        webView.loadUrl(BASE_URL + "/display/" + slug);
        setContentView(webView);
    }

    // ── Setup Screen ──────────────────────────────────────────────────────────

    private void showSetup(String errorMsg) {
        webViewShowing = false;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0F172A"));
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(100), dp(60), dp(100), dp(60));

        // ── Title ──────────────────────────────────────────────────────────
        TextView title = new TextView(this);
        title.setText("VisitantHub TV");
        title.setTextSize(38f);
        title.setTextColor(Color.WHITE);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        TextView sub = new TextView(this);
        sub.setText("Enter your company slug to launch the display board");
        sub.setTextSize(17f);
        sub.setTextColor(Color.parseColor("#94A3B8"));
        sub.setGravity(Gravity.CENTER);
        sub.setLayoutParams(margin(0, 12, 0, 40));
        root.addView(sub);

        // ── Input ──────────────────────────────────────────────────────────
        EditText input = new EditText(this);
        input.setHint("company slug  e.g.  my-clinic");
        input.setHintTextColor(Color.parseColor("#475569"));
        input.setTextColor(Color.WHITE);
        input.setTextSize(22f);
        input.setBackgroundColor(Color.parseColor("#1E293B"));
        input.setPadding(dp(24), dp(20), dp(24), dp(20));
        input.setMaxLines(1);
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT
                | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        input.setImeOptions(EditorInfo.IME_ACTION_DONE);
        input.setLayoutParams(margin(0, 0, 0, 20));
        root.addView(input);

        // ── Error ──────────────────────────────────────────────────────────
        if (errorMsg != null) {
            TextView err = new TextView(this);
            err.setText(errorMsg);
            err.setTextSize(14f);
            err.setTextColor(Color.parseColor("#EF4444"));
            err.setGravity(Gravity.CENTER);
            err.setLayoutParams(margin(0, 0, 0, 12));
            root.addView(err);
        }

        // ── Launch button ──────────────────────────────────────────────────
        Button btn = new Button(this);
        btn.setText("Launch Display Board");
        btn.setTextSize(20f);
        btn.setTextColor(Color.WHITE);
        btn.setAllCaps(false);
        btn.setBackgroundColor(Color.parseColor("#4F46E5"));
        btn.setPadding(dp(40), dp(20), dp(40), dp(20));
        btn.setLayoutParams(match());
        root.addView(btn);

        // ── Hint ──────────────────────────────────────────────────────────
        TextView hint = new TextView(this);
        hint.setText("Find your slug in Settings › Company Settings on visitanthub.com\n" +
                     "Tip: press MENU or long-press BACK to return here from the board.");
        hint.setTextSize(13f);
        hint.setTextColor(Color.parseColor("#475569"));
        hint.setGravity(Gravity.CENTER);
        hint.setLayoutParams(margin(0, 32, 0, 0));
        root.addView(hint);

        // ── Listeners ─────────────────────────────────────────────────────
        Runnable launch = () -> {
            String slug = input.getText().toString().trim();
            if (slug.isEmpty()) { input.setError("Please enter a slug"); return; }
            saveSlug(slug);
            loadBoard(slug);
        };

        btn.setOnClickListener(v -> launch.run());
        input.setOnEditorActionListener((v, actionId, ev) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) { launch.run(); return true; }
            return false;
        });

        setContentView(root);
        input.requestFocus();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    private String getSavedSlug() {
        String v = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SLUG, null);
        return (v != null && !v.trim().isEmpty()) ? v.trim() : null;
    }

    private void saveSlug(String slug) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SLUG, slug).apply();
    }

    private void clearSlug() {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_SLUG).apply();
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private LinearLayout.LayoutParams margin(int l, int t, int r, int b) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        p.setMargins(dp(l), dp(t), dp(r), dp(b));
        return p;
    }

    private LinearLayout.LayoutParams match() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    }
}

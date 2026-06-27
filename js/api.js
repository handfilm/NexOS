/* ═══════════════════════════════════════════════════════════════
   NexOS v3 — js/api.js
   Spine Bridge: Google Apps Script → Shopify Core
   ═══════════════════════════════════════════════════════════════ */

window.callSpine = async function(action, payload = null) {
  const SPINE_URL = "https://script.google.com/macros/s/AKfycbyqTLd51rCc37NZeRS5sYpR2ax3VpAOKRpHRSoN9ssDiRuojhifKZwefIWlBWqTWslvaQ/exec";

  try {
    const response = await fetch(SPINE_URL, {
      method: "POST",
      // text/plain avoids CORS preflight on live server
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload })
    });
    return (await response.json()) || [];
  } catch (err) {
    console.error("Spine Bridge Error:", err);
    return { status: "failed", error: err };
  }
};

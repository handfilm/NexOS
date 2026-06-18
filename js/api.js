/* js/api.js - ফাইনাল এবং বুলেটপ্রুফ Spine Bridge */
window.callSpine = async function(action, payload = null) {
  // আপনার Apps Script এর নতুন Deployment URL টি এখানে বসান
  const SPINE_URL = "https://script.google.com/macros/s/AKfycbyqTLd51rCc37NZeRS5sYpR2ax3VpAOKRpHRSoN9ssDiRuojhifKZwefIWlBWqTWslvaQ/exec"; 
  
  try {
    const response = await fetch(SPINE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain ব্যবহারে লাইভ সার্ভারে কোনো CORS ব্লক খাবেন না
      body: JSON.stringify({ action: action, payload: payload })
    });
    
    const data = await response.json();
    return data || []; 
  } catch (err) {
    console.error("Spine Bridge Live Error:", err);
    return { status: "failed", error: err };
  }
};


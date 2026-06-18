/* js/api.js - আলটিমেট এবং এরর-প্রুফ Spine Bridge */
window.callSpine = async function(action, payload = null) {
  const SPINE_URL = "https://script.google.com/macros/s/AKfycbxUq3rIvz60_PzDcTYf2gv3JFcW42Tmwi243BY7P5G4BaaN-VnGV2RioYMSUxlu4vp73g/exec"; 
  
  try {
    const response = await fetch(SPINE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain ব্যবহারে ব্রাউজার কোনো CORS Preflight এরর দেবে না
      body: JSON.stringify({ action: action, payload: payload })
    });
    
    const data = await response.json();
    return data || []; 
  } catch (err) {
    console.error("Spine Bridge Error:", err);
    return [];
  }
};

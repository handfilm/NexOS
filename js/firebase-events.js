/* ═══════════════════════════════════════════════════════════════
   Hands & Head — js/firebase-events.js
   Centralized Event Bus & Reactive Commerce Pipeline
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const listeners = {};

  window.NexEvents = {
    EVENTS: {
      ORDER_CREATED: "order:created",
      ORDER_UPDATED: "order:updated",
      ORDER_PAID: "order:paid",
      ORDER_FULFILLED: "order:fulfilled",
      ORDER_CANCELLED: "order:cancelled",
      PRODUCT_CREATED: "product:created",
      PRODUCT_UPDATED: "product:updated",
      PRODUCT_STOCK_CHANGED: "product:stock_changed",
      CUSTOMER_CREATED: "customer:created",
      ACCOUNTING_SYNC_REQUESTED: "accounting:sync_requested",
      ACCOUNTING_SYNC_COMPLETED: "accounting:sync_completed",
      SOCIAL_POST_CREATED: "social:post_created",
      SOCIAL_POST_PUBLISHED: "social:post_published",
      STORE_SWITCHED: "store:switched",
      AUTH_CHANGED: "auth:changed"
    },

    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      return () => this.off(event, callback);
    },

    off(event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    },

    emit(event, data) {
      if (listeners[event]) {
        listeners[event].forEach(cb => {
          try {
            cb(data);
          } catch (e) {
            console.error(`[NexEvents] Error in listener for event "${event}":`, e);
          }
        });
      }
      // Also dispatch on window for global DOM listeners
      window.dispatchEvent(new CustomEvent("nex:" + event, { detail: data }));
    }
  };

  console.log("⚡ NexEvents Event Bus initialized.");
})();

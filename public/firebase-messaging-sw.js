/* Background messaging is activated after VAPID and trusted sender credentials are connected. */
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCEdkofdgb8-n7cOoGem04NnvmmHpYFY10",
  authDomain: "heartable-voice.firebaseapp.com",
  databaseURL: "https://heartable-voice-default-rtdb.firebaseio.com",
  projectId: "heartable-voice",
  storageBucket: "heartable-voice.firebasestorage.app",
  messagingSenderId: "25885730901",
  appId: "1:25885730901:web:3d068c81bf3dc07ecf4cdc",
});

firebase.messaging().onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Heartable";
  self.registration.showNotification(title, {
    body: payload.notification?.body || "New activity",
    icon: "/favicon.svg",
    data: { url: payload.data?.url || "/notifications" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/notifications"));
});
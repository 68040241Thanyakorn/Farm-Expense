
"use strict";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "./service-worker.js",
        {
          scope: "./",
          updateViaCache: "none"
        }
      );

      console.log(
        "Farm Expense PWA ready:",
        registration.scope
      );

      registration.update().catch(error => {
        console.warn(
          "PWA update check failed:",
          error
        );
      });

    } catch (error) {
      console.warn(
        "PWA registration failed:",
        error
      );
    }
  });
}
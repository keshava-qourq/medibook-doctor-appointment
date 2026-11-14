import { test } from "@playwright/test";

// These are infrastructure/provisioning guarantees about the managed database and the
// deployment size. They are not observable from the running application, so each is a
// single declared test carrying a [KNOWN-LIMIT] reason rather than a silent gap.

test("[NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-database settings that cannot be observed or exercised from the running application in this sandbox",
  );
});

test("[NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients)", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-017 production sizing and capacity targets are infrastructure provisioning concerns that cannot be verified through the application in this sandbox",
  );
});

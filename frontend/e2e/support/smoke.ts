// The one smoke patient every E2E run has, analogous to adminCredentials(): the platform
// sets these two settings for the run. Use it to sign in as a pre-existing patient without
// registering one. A missing setting fails the test: never skip one.
export function smokeCredentials(): { email: string; password: string } {
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD are not set: the platform sets them for every E2E run.",
    );
  }
  return { email, password };
}

import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createApplication } from "../src/server.mjs";
import meta from "../web/meta.json" with { type: "json" };
const app = createApplication();
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  mkdirSync("docs/screenshots", { recursive: true });
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("button", { name: meta.button, exact: true }).click();
    await page.getByRole("status").waitFor();
    assert.equal(await page.locator("[role=alert]").count(), 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    await page.screenshot({
      path: `docs/screenshots/${width === 1440 ? "desktop" : "mobile"}.png`,
      fullPage: false,
    });
    if (width === 1440) {
      const check = await (await page.request.get(base + "/api/state")).json();
      const e = check.state.events[0];
      const rejected = await page.request.post(base + "/api/action", {
        data: {
          kind: "collect",
          events: [{ ...e, token: "do-not-store" }],
          revision: check.revision,
        },
      });
      assert.equal(rejected.status(), 400);
      const after = await (await page.request.get(base + "/api/state")).json();
      assert.equal(after.state.events.length, check.state.events.length);
      const current = await (
        await page.request.get(base + "/api/state")
      ).json();
      assert.ok(current.runs.length > 0);
      const id = current.runs[0].id;
      for (const format of ["json", "csv", "markdown"]) {
        const response = await page.request.get(
          `${base}/api/export?id=${id}&format=${format}`,
        );
        assert.equal(response.status(), 200);
        assert.ok((await response.text()).length > 40);
        assert.ok(
          response.headers()["content-disposition"].includes("attachment"),
        );
      }
      await page
        .getByRole("button", { name: "Run history", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Inspect run", exact: true })
        .first()
        .click();
    }
    await page.reload();
    await page
      .getByRole("button", { name: meta.button, exact: true })
      .waitFor();
    assert.ok(
      (await (await page.request.get(base + "/api/state")).json()).runs.length >
        0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
    assert.deepEqual(errors, []);

    await page.close();
  }
  console.log(
    `${meta.name}: desktop/mobile browser flow, persistent history, exports and runtime checks passed.`,
  );
} finally {
  await browser?.close();
  await app.close();
}

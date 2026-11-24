import { expect, test, type Page } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveFolder, type StaticServer } from "../../scripts/lib/server.ts";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../qa/fixtures/seeded-defects",
);

let server: StaticServer;
test.beforeAll(async () => {
  server = await serveFolder(fixtureDir);
});
test.afterAll(async () => {
  await server.close();
});

async function open(page: Page, file: string, lang = "en") {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${server.url}/${file}?lang=${lang}`);
  await expect(page.locator(".notice")).toBeVisible();
}

// Opens the panel from the keyboard, as a keyboard user would.
async function openPanel(page: Page) {
  await page.focus("#add-shift");
  await page.keyboard.press("Enter");
  await expect(page.locator("#panel")).toBeVisible();
}

const focusInPanel = (page: Page) =>
  page.evaluate(() => Boolean(document.activeElement?.closest("#panel")));
const focusBehind = (page: Page) =>
  page.evaluate(() => Boolean(document.activeElement?.closest("main")));
const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "");

test.describe("clean.html", () => {
  test("opening the panel moves focus into it, onto the first field", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    expect(await focusInPanel(page)).toBe(true);
    expect(await focusedId(page)).toBe("shift-person");
  });

  test("Tab and Shift+Tab never reach a control behind the open panel", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press(key);
        expect(await focusBehind(page), `${key} x${i + 1}`).toBe(false);
      }
    }
  });

  test("Escape closes the panel and returns focus to Add shift", async ({ page }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();
    expect(await focusedId(page)).toBe("add-shift");
  });

  test("the Close button closes the panel and returns focus to Add shift", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.focus("#close-panel");
    await page.keyboard.press("Enter");
    await expect(page.locator("#panel")).toBeHidden();
    expect(await focusedId(page)).toBe("add-shift");
  });

  test("the no-match message lives in a status region present from load", async ({
    page,
  }) => {
    await open(page, "clean.html");
    const region = page.locator('[role="status"]#empty-text');
    await expect(region).toHaveCount(1);
    await expect(region).toHaveText("");
    await page.fill("#filter", "zzz");
    await expect(region).toHaveText("No one matches this filter.");
    await expect(page.locator("#clear-filter")).toBeVisible();
    await page.click("#clear-filter");
    await expect(region).toHaveText("");
  });

  for (const [lang, text] of [
    ["en", "As of 09:41"],
    ["es", "A las 09:41"],
  ]) {
    test(`the list carries its as-of time in ${lang}`, async ({ page }) => {
      await open(page, "clean.html", lang);
      await expect(page.locator("#as-of")).toHaveText(text ?? "");
      await expect(page.locator(".live")).toHaveCount(0);
    });
  }

  test("Save is aria-busy while pending and takes no second press", async ({ page }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.fill("#shift-person", "Avery");
    // Count the simulated requests the page starts.
    await page.evaluate(() => {
      const w = window as unknown as { requests: number };
      w.requests = 0;
      const original = window.setTimeout;
      window.setTimeout = ((
        handler: TimerHandler,
        delay?: number,
        ...rest: unknown[]
      ) => {
        if (delay === 1200) w.requests += 1;
        return original(handler, delay, ...rest);
      }) as typeof window.setTimeout;
    });
    await page.click("#save");
    await expect(page.locator("#save")).toHaveAttribute("aria-busy", "true");
    await page.waitForTimeout(300);
    await page.click("#save");
    await expect(page.locator("#result")).toHaveText("Shift saved.");
    await expect(page.locator("#save")).not.toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#save")).toHaveText("Save");
    expect(
      await page.evaluate(() => (window as unknown as { requests: number }).requests),
    ).toBe(1);
  });
});

test("index.html differs: focus does not move into the panel, nor back on close", async ({
  page,
}) => {
  await open(page, "index.html");
  await openPanel(page);
  expect(await focusInPanel(page)).toBe(false);
  await page.click("#close-panel");
  await expect(page.locator("#panel")).toBeHidden();
  expect(await focusedId(page)).not.toBe("add-shift");
});

test.describe("clean.html, round 3", () => {
  async function saved(page: Page) {
    await open(page, "clean.html");
    await openPanel(page);
    await page.fill("#shift-person", "Avery");
    await page.click("#save");
    await expect(page.locator("#result")).toHaveText("Shift saved.");
  }

  test("the confirmation is cleared when a field changes after the save", async ({
    page,
  }) => {
    await saved(page);
    await page.fill("#shift-person", "Blake");
    await expect(page.locator("#result")).toHaveText("");
  });

  test("the confirmation is cleared when the panel is opened again", async ({ page }) => {
    await saved(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();
    await openPanel(page);
    await expect(page.locator("#result")).toHaveText("");
  });

  test("while the save is pending the panel cannot be closed, and says so", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.fill("#shift-person", "Avery");
    await page.click("#save");
    await expect(page.locator("#save")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#close-panel")).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");
    // From the keyboard: Playwright's click would wait for aria-disabled to go away.
    await page.focus("#close-panel");
    await page.keyboard.press("Enter");
    await expect(page.locator("#panel")).toBeVisible();
    await expect(page.locator("#result")).toHaveText("");
    await expect(page.locator("#result")).toHaveText("Shift saved.");
    await expect(page.locator("#close-panel")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();
  });

  for (const [lang, sentence] of [
    ["en", "Enter the person's name."],
    ["es", "Escribe el nombre de la persona."],
  ] as const) {
    test(`saving with Person empty saves nothing and says why (${lang})`, async ({
      page,
    }) => {
      await open(page, "clean.html", lang);
      await openPanel(page);
      await page.focus("#save");
      await page.keyboard.press("Enter");
      const person = page.locator("#shift-person");
      await expect(person).toHaveAttribute("aria-invalid", "true");
      await expect(person).toBeFocused();
      const describedBy = (await person.getAttribute("aria-describedby")) ?? "";
      await expect(page.locator(`#${describedBy}`)).toHaveText(sentence);
      await page.waitForTimeout(1400);
      await expect(page.locator("#result")).toHaveText("");
      await expect(page.locator("#save")).not.toHaveAttribute("aria-busy", "true");
      await person.fill("Avery");
      await expect(person).not.toHaveAttribute("aria-invalid", "true");
      await expect(page.locator(`#${describedBy}`)).toHaveText("");
      await expect(person).not.toHaveAttribute("aria-describedby", /./);
    });
  }

  for (const [lang, today, next, previous, planned, final] of [
    [
      "en",
      "Crew today",
      "Tuesday, November 24",
      "Sunday, November 22",
      "Planned as of 09:41",
      "Final as of 18:00",
    ],
    [
      "es",
      "Equipo de hoy",
      "martes, 24 de noviembre",
      "domingo, 22 de noviembre",
      "Previsto a las 09:41",
      "Cerrado a las 18:00",
    ],
  ] as const) {
    test(`Previous day and Next day change the day shown (${lang})`, async ({ page }) => {
      await open(page, "clean.html", lang);
      const heading = page.locator("h1");
      const asOf = page.locator("#as-of");
      const nextButton = page.locator(".day-nav button").nth(1);
      const previousButton = page.locator(".day-nav button").nth(0);
      await expect(heading).toHaveText(today);
      await nextButton.focus();
      await page.keyboard.press("Enter");
      await expect(heading).toHaveText(next);
      await expect(asOf).toHaveText(planned);
      await previousButton.focus();
      await page.keyboard.press("Enter");
      await expect(heading).toHaveText(today);
      await page.keyboard.press("Enter");
      await expect(heading).toHaveText(previous);
      await expect(asOf).toHaveText(final);
      await expect(page.locator(".crew li")).toHaveCount(10);
    });
  }
});

test.describe("clean.html, round 4", () => {
  test("A6: typing during the save changes nothing; the confirmation stands beside what was sent", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.keyboard.type("Av");
    await page.keyboard.press("Enter");
    await page.keyboard.type("ery");
    await expect(page.locator("#result")).toHaveText("Shift saved.");
    await expect(page.locator("#shift-person")).toHaveValue("Av");
    // Editable again once the answer has come; the edit then clears the confirmation.
    await page.focus("#shift-person");
    await page.keyboard.type("ery");
    await expect(page.locator("#shift-person")).toHaveValue("Avery");
    await expect(page.locator("#result")).toHaveText("");
  });

  test("A6: the same for Start time", async ({ page }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.keyboard.type("Avery");
    await page.focus("#shift-start");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("9:30");
    await expect(page.locator("#result")).toHaveText("Shift saved.");
    await expect(page.locator("#shift-start")).toHaveValue("07:00");
  });

  for (const [lang, sentence] of [
    ["en", "Enter the person's name."],
    ["es", "Escribe el nombre de la persona."],
  ] as const) {
    test(`A7: a refusal by Enter in the field is announced through an alert present from load (${lang})`, async ({
      page,
    }) => {
      await open(page, "clean.html", lang);
      const alert = page.locator('#person-error[role="alert"]');
      await expect(alert).toHaveCount(1);
      await expect(alert).toHaveText("");
      await openPanel(page);
      await expect(page.locator("#shift-person")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(alert).toHaveText(sentence);
      await expect(page.locator("#shift-person")).toHaveAttribute("aria-invalid", "true");
      await page.keyboard.type("A");
      await expect(alert).toHaveText("");
    });
  }
});

test("clean.html: opening the panel again starts without the refusal", async ({
  page,
}) => {
  await open(page, "clean.html");
  await openPanel(page);
  await page.keyboard.press("Enter");
  const person = page.locator("#shift-person");
  await expect(page.locator("#person-error")).toHaveText("Enter the person's name.");
  await expect(person).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();
  await openPanel(page);
  await expect(page.locator("#person-error")).toHaveText("");
  await expect(person).not.toHaveAttribute("aria-invalid", /./);
  await expect(person).not.toHaveAttribute("aria-describedby", /./);
});

test.describe("clean.html, round 5", () => {
  const SENTENCE = {
    en: "Enter the start time as hours and minutes, for example 07:00.",
    es: "Escribe la hora de inicio en horas y minutos, por ejemplo 07:00.",
  } as const;

  for (const lang of ["en", "es"] as const) {
    for (const [what, value] of [
      ["empty", ""],
      ["malformed", "7 am"],
      ["out of range", "25:00"],
    ] as const) {
      test(`Start time ${what} is refused like Person, tied to the field (${lang})`, async ({
        page,
      }) => {
        await open(page, "clean.html", lang);
        await openPanel(page);
        const requests: string[] = [];
        page.on("request", (request) => {
          if (request.url().endsWith("/save.json")) requests.push(request.method());
        });
        await page.keyboard.type("Avery");
        const start = page.locator("#shift-start");
        await start.fill(value);
        await page.focus("#save");
        await page.keyboard.press("Enter");
        await expect(start).toHaveAttribute("aria-invalid", "true");
        await expect(start).toBeFocused();
        const describedBy = (await start.getAttribute("aria-describedby")) ?? "";
        const sentence = page.locator(`#${describedBy}`);
        await expect(sentence).toHaveText(SENTENCE[lang]);
        await expect(sentence).toHaveAttribute("role", "alert");
        await expect(page.locator("#shift-person")).not.toHaveAttribute(
          "aria-invalid",
          /./,
        );
        await page.waitForTimeout(1400);
        await expect(page.locator("#result")).toHaveText("");
        expect(requests).toEqual([]);
        await start.fill("07:30");
        await expect(start).not.toHaveAttribute("aria-invalid", /./);
        await expect(start).not.toHaveAttribute("aria-describedby", /./);
        await expect(sentence).toHaveText("");
        await page.keyboard.press("Enter");
        await expect(page.locator("#result")).toHaveText(
          lang === "en" ? "Shift saved." : "Turno guardado.",
        );
        expect(requests).toEqual(["POST"]);
      });
    }
  }

  test("with both fields wrong, both are marked and focus goes to Person first", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.locator("#shift-start").fill("");
    await page.focus("#save");
    await page.keyboard.press("Enter");
    await expect(page.locator("#shift-person")).toBeFocused();
    await expect(page.locator("#shift-person")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#shift-start")).toHaveAttribute("aria-invalid", "true");
  });

  test("the refusal of Start time is cleared when the panel is opened again", async ({
    page,
  }) => {
    await open(page, "clean.html");
    await openPanel(page);
    await page.keyboard.type("Avery");
    await page.locator("#shift-start").fill("x");
    await page.keyboard.press("Enter");
    await expect(page.locator("#shift-start")).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();
    await openPanel(page);
    await expect(page.locator("#shift-start")).not.toHaveAttribute("aria-invalid", /./);
    await expect(page.locator("#start-error")).toHaveText("");
  });

  test("a save that cannot reach the server says so and unlocks the form", async ({
    page,
  }) => {
    await page.route("**/save.json", (route) => route.abort("failed"));
    await open(page, "clean.html");
    await openPanel(page);
    await page.keyboard.type("Avery");
    await page.keyboard.press("Enter");
    await expect(page.locator("#result")).toHaveText(
      "The shift was not saved. Try again.",
    );
    await expect(page.locator("#save")).not.toHaveAttribute("aria-busy", /./);
    await expect(page.locator("#shift-person")).not.toHaveAttribute("readonly", /.*/);
  });
});

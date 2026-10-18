import { describe, expect, it } from "vitest";
import { isEventRegistrationOpen } from "@/lib/eventRegistration";

describe("event registration", () => {
  it("allows a published event opened by the admin", () => {
    expect(isEventRegistrationOpen({ status: "published", registration_open: true })).toBe(true);
  });
  it("blocks an event closed by the admin", () => {
    expect(isEventRegistrationOpen({ status: "published", registration_open: false })).toBe(false);
  });
  it.each(["draft", "pending", "completed", "cancelled"])("blocks %s events even when the open switch is set", (status) => {
    expect(isEventRegistrationOpen({ status, registration_open: true })).toBe(false);
  });
});
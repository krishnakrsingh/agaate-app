import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendNotification } from "./notifications";

describe("Notifications & Webhook Dispatcher", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs notification payload cleanly when no webhook URL is configured", async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const success = await sendNotification({
      type: "CLIENT_CREDENTIALS",
      recipientEmail: "owner@farm.com",
      recipientName: "Farm Owner",
      title: "Welcome to Agaate",
      message: "Your farm has been provisioned.",
    });

    expect(success).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  });

  it("dispatches POST request when ALERT_WEBHOOK_URL is set", async () => {
    process.env.ALERT_WEBHOOK_URL = "https://hooks.agaate.ag/test";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const success = await sendNotification({
      type: "EMERGENCY_RX",
      recipientEmail: "officer@farm.com",
      recipientName: "Farm Manager",
      title: "Emergency Spray Required",
      message: "Leaf miner infestation detected in Block 2.",
    });

    expect(success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hooks.agaate.ag/test",
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});

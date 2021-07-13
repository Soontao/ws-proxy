import { ProxyClient, ProxyServer } from "../src";

describe("Demo Test Suite", () => {
  it("should not be exported", () => {
    expect(ProxyClient).not.toBeUndefined();
    expect(ProxyServer).not.toBeUndefined();
  });
});

import request from "supertest";
import app from "../src/server.js";

describe("Test the root path", () => {
  test("Get Method responds with 200", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "Server is running",
    });
  });
});

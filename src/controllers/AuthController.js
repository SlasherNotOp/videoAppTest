import { AuthService } from "../services/AuthService.js";

export class AuthController {
  constructor(ws) {
    this.ws = ws;
    this.authService = new AuthService();
  }

  async handle(type, payload) {
    if (type === "REGISTER") {
      const user = await this.authService.register(payload.email, payload.password);
      this.ws.send(JSON.stringify({ type: "REGISTER_SUCCESS", user }));
    }

    if (type === "LOGIN") {
      const result = await this.authService.login(payload.email, payload.password);
      if (!result) {
        this.ws.send(JSON.stringify({ type: "LOGIN_FAILED" }));
      } else {
        this.ws.send(JSON.stringify({ type: "LOGIN_SUCCESS", token: result.token }));
      }
    }
  }
}

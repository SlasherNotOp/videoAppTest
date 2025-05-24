import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export class JwtUtil {
  sign(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
  }

  verify(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}

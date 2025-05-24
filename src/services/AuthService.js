import { UserModel } from "../models/UserModel.js";
import { JwtUtil } from "../utils/JwtUtil.js";

export class AuthService {
  constructor() {
    this.userModel = new UserModel();
    this.jwt = new JwtUtil();
  }

  async register(email, password) {
    return this.userModel.create(email, password);
  }

  async login(email, password) {
    const user = await this.userModel.findByEmail(email);
    if (!user || !(await this.userModel.comparePasswords(password, user.password))) {
      return null;
    }
    const token = this.jwt.sign({ id: user.id });
    return { user, token };
  }
}

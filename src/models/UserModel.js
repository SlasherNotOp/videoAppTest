import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

export class UserModel {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(email, password) {
    const hash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({ data: { email, password: hash } });
  }

  async findByEmail(email) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async comparePasswords(raw, hash) {
    return bcrypt.compare(raw, hash);
  }
}

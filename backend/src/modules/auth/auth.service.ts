import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./auth.model.js";
import { AppError } from "../../utils/app-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  type TokenPayload,
} from "../../utils/jwt.js";
import { env } from "../../config/env.js";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const createTokens = (userId: string) => {
  const payload: TokenPayload = {
    userId,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

export const register = async (input: RegisterInput) => {
  const email = input.email.toLowerCase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  const user = await User.create({
    name: input.name,
    email,
    password: hashedPassword,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    ...createTokens(user.id),
  };
};

export const login = async (input: LoginInput) => {
  const user = await User.findOne({
    email: input.email.toLowerCase(),
  }).select("+password");

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    ...createTokens(user.id),
  };
};

export const refreshAccessToken = (
  refreshToken: string,
): { accessToken: string } => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET,
    ) as TokenPayload;

    const accessToken = generateAccessToken({
      userId: decoded.userId,
    });

    return { accessToken };
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }
};

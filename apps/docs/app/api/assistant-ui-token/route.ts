import { customAlphabet } from "nanoid";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AssistantCloud } from "@assistant-ui/react";

const generateId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32,
);
const randomUserId = () => {
  const userId = `usr_anon_${generateId()}`;
  return userId;
};

const getJwtForUser = (userId: string) => {
  return jwt.sign(
    {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week
    },
    process.env["JWT_SECRET"]!,
  );
};

const getUserIdFromJwt = (token: string) => {
  const decoded = jwt.verify(token, process.env["JWT_SECRET"]!) as JwtPayload;
  return decoded.sub!;
};

export const POST = async () => {
  const cookieStore = await cookies();
  const jwtCookie = cookieStore.get("jwt");
  let userId;
  if (!jwtCookie) {
    userId = randomUserId();
  } else {
    userId = getUserIdFromJwt(jwtCookie.value);
  }

  cookieStore.set("jwt", getJwtForUser(userId), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  const client = new AssistantCloud({
    apiKey: process.env["ASSISTANT_API_KEY"]!,
    userId,
    workspaceId: userId,
  });
  const { token } = await client.auth.tokens.create();
  return Response.json({ token });
};

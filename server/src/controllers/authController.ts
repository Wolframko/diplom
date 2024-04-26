import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../db";
import jwt from "jsonwebtoken";

interface Token {
  userId: string;
}

export const registerNewUser = async (req: Request, res: Response) => {
  const { display_name, username, authenticationkey, enc_privatekey, publicKey } = req.body;

  if (!display_name || display_name === "")
    return res.status(400).json({ message: "Требуется отображаемое имя" });
  if (!username || username === "")
    return res.status(400).json({ message: "Имя пользователя обязательно" });
  if (!authenticationkey || authenticationkey === "")
    return res.status(400).json({ message: "Требуется пароль" });

  try {
    const hashedPassword = await bcrypt.hash(authenticationkey, 10);
    const user = await db.user.create({
      data: {
        display_name,
        username,
        authenticationkey: hashedPassword,
        enc_privatekey,
        publicKey
      },
    });



    const accessToken = jwt.sign(
      { userId: user.id },
      "testjwttoken",
      { expiresIn: "900000" } // 15 мин
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      "testjwttokenrefr",
      { expiresIn: "7d" }
    );

    await db.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });


    const response = {
      id: user.id,
      display_name: user.display_name,
      username: user.username,
      accessToken,
    };

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(response);
  } catch (err: any) {
    if (err.code === "P2002")
      return res.status(403).json({ message: "Имя пользователя уже используется" });
    res.status(500).json(err);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { username, authenticationkey } = req.body;

  if (!username || username === "")
    return res.status(400).json({ message: "Требуется имя пользователя" });
  if (!authenticationkey || authenticationkey === "")
    return res.status(400).json({ message: "Требуется пароль" });

  try {
    const user = await db.user.findFirst({ where: { username } });
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });

    if (!(await bcrypt.compare(authenticationkey, user.authenticationkey)))
      return res.status(400).json({ message: "Неверный пароль" });

    const accessToken = jwt.sign(
      { userId: user.id },
      "testjwttoken",
      { expiresIn: "900000" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      "testjwttokenrefr",
      { expiresIn: "7d" }
    );

    await db.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });

    const response = {
      id: user.id,
      display_name: user.display_name,
      username: user.username,
      accessToken,
      profile_picture: user?.profile_picture,
    };

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

export const handleRefreshToken = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.status(401).json({ message: "Неавторизован" });

    const refreshToken = cookies.jwt as string;
    const user = await db.user.findFirst({
      where: { refresh_token: refreshToken },
    });
    if (!user) return res.status(403).json({ message: "Запрещено" });

    jwt.verify(
      refreshToken,
      "testjwttokenrefr",
      (err, decoded) => {
        const userId = (decoded as Token).userId;
        if (err || user.id.toString() !== userId.toString())
          return res.status(403).json({ message: "Запрещено" });
        const accessToken = jwt.sign(
          { userId: userId },
          "testjwttoken",
          { expiresIn: "900000" } // 15 мин
        );
        res.status(200).json({ accessToken });
      }
    );
  } catch (err) {
    console.error(err);
  }
};

export const handlePersistentLogin = async (req: Request, res: Response) => {
  try {
    let cookies = req.cookies;
    if (!cookies?.jwt) return res.status(401).json({ message: "Неавторизован" });

    const refreshToken = cookies.jwt as string;
    const user = await db.user.findFirst({
      where: { refresh_token: refreshToken },
    });
    if (!user) return res.status(403).json({ message: "Запрещено" });

    jwt.verify(
      refreshToken,
      "testjwttokenrefr",
      (err, decoded) => {
        const userId = (decoded as Token).userId;
        if (err || user.id.toString() !== userId.toString())
          return res.status(403).json({ message: "Запрещено" });
        const accessToken = jwt.sign(
          { userId: userId },
          "testjwttoken",
          { expiresIn: "900000" } // 15 мин
        );

        const response = {
          id: user.id,
          display_name: user.display_name,
          username: user.username,
          accessToken,
          profile_picture: user?.profile_picture,
        };

        res.status(200).json(response);
      }
    );
  } catch (err) {
    console.error(err);
  }
};

export const handleLogout = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);

    const refreshToken = cookies.jwt;
    const user = await db.user.findFirst({
      where: { refresh_token: refreshToken },
    });
    if (!user) {
      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.status(204);
    }

    // Удалить токен обновления из базы данных
    await db.user.update({
      where: { id: user.id },
      data: { refresh_token: "" },
    });

    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
  }
};
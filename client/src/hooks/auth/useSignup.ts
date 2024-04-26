import { useMutation } from "@tanstack/react-query";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AxiosError, AxiosResponse } from "axios";
import {Kyber768} from "crystals-kyber-js";
import aesjs from "aes-js";
import scrypt from "scrypt-js";

// функция регистрации
const signUp = async ({
                        display_name,
                        username,
                        password,
                        repeatPassword,
                      }: {
  display_name: string;
  username: string;
  password: string;
  repeatPassword: string;
}): Promise<AxiosResponse<User>> => {
  if (password !== repeatPassword) {
    return Promise.reject({
      response: { data: { message: "Пароли не совпадают" } },
    });
  }

  // валидация ввода
  if (!username || !password) {
    return Promise.reject({
      response: { data: { message: "Имя пользователя или пароль должны быть установлены." } },
    });
  }

  const salt = new Uint8Array(16); // предприятие устанавливает сой salt
  const N = 16384, r = 8, p = 1, dkLen = 32;
  const key = await scrypt.scrypt(new TextEncoder().encode(password), salt, N, r, p, dkLen);

  const decryptionkey = key.slice(0, 16);
  const authenticationkey = btoa(String.fromCharCode(...key.slice(16, 32)));

  const recipient = new Kyber768();
  const [publicKey, privateKey] = await recipient.generateKeyPair();
  const publicKeyToString = btoa(String.fromCharCode(...publicKey))
  const aesCbc = new aesjs.ModeOfOperation.cbc(decryptionkey, new Uint8Array(16));
  const enc_privatekey = aesjs.utils.hex.fromBytes(aesCbc.encrypt(aesjs.padding.pkcs7.pad(privateKey)));
  return api.post(
      "http://localhost:3000/api/auth/signup",
      {
        display_name,
        username,
        authenticationkey,
        publicKey: publicKeyToString,
        enc_privatekey
      },
      {withCredentials: true}
  );
};

const useSignup = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  return useMutation(signUp, {
    onSuccess: (data) => {
      setCurrentUser(data.data);
      navigate("/");
    },
    onError: (err: AxiosError<{ message: string }>) => {
      throw err;
    },
  });
};

export default useSignup;

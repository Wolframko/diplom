import { useMutation } from "@tanstack/react-query";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AxiosError, AxiosResponse } from "axios";
import scrypt from "scrypt-js";

const login = async ({
                       username,
                       password,
                     }: {
  username: string;
  password: string;
}): Promise<AxiosResponse<User>> => {

  const salt = new Uint8Array(16); // use a better salt in production
  const N = 16384, r = 8, p = 1, dkLen = 32;
  const key = await scrypt.scrypt(new TextEncoder().encode(password), salt, N, r, p, dkLen);

  const authenticationkey = btoa(String.fromCharCode(...key.slice(16, 32)));
  return api.post(
      "http://localhost:3000/api/auth/login",
      {username, authenticationkey},
      {withCredentials: true}
  );
};

const useLogin = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  return useMutation(login, {
    onSuccess: (data) => {
      setCurrentUser(data.data);
      navigate("/");
    },
    onError: (err: AxiosError<{ message: string }>) => {
      throw err;
    },
  });
};

export default useLogin;

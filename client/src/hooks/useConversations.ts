import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "./useAxiosPrivate";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {Kyber768} from "crystals-kyber-js";
import aesjs from "aes-js";

export const useGetConversations = () => {
  const axiosPrivate = useAxiosPrivate();
  const { currentUser } = useAuth();
  return useQuery<Conversation[]>(
      ["conversations"],
      async () => {
        const res = await axiosPrivate.get(
            `http://localhost:3000/api/conversations/${currentUser?.id}`
        );
        return res.data;
      },
      {
        onError: (err) => {
          console.error(err);
        },
        refetchOnWindowFocus: false,
      }
  );
};

export const useNewConversation = (friends: number[]) => {
  const axiosPrivate = useAxiosPrivate(); 
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentUser, decryptionkey} = useAuth();

  return useMutation<Conversation>(
      async (friends) => {

      const sender = new Kyber768();
      
      const [publicKey] = await sender.generateKeyPair();

      // генерируем симметричный секрет и шифротекст
      const [ct, ssS] = await sender.encap(publicKey);

      const ssSBytes = aesjs.utils.utf8.toBytes(ssS);

      // шифруем симметричный секрет паролем отправителя
      const aesCbc = new aesjs.ModeOfOperation.cbc(decryptionkey, new Uint8Array(ssSBytes.length));
      const symkeyforme = aesCbc.encrypt(aesjs.padding.pkcs7.pad(ssSBytes));

      const res = await axiosPrivate.post("http://localhost:3000/api/conversations/new", {
           participants: friends,
           symkeyforme: symkeyforme, 
           ct: ct
       });
       
       return res.data;
      },
      {
        onSuccess: (data) => {
          const prevConversations = queryClient.getQueryData<Conversation[]>([
            "conversations",
          ]);
          if (!prevConversations?.some((conv) => conv.id === data.id)) {
            queryClient.setQueryData(
                ["conversations"],
                [...prevConversations!, data]
            );
          }
          const conversationWithSelf =
              data.participants.length === 1 &&
              data.participants[0].id === currentUser?.id;
          const recipient = conversationWithSelf
              ? data.participants[0]
              : data.participants.filter(
                  (participant) => participant.id !== currentUser?.id
              )[0];
          const state: ConversationState = {
            recipient: {
              id: recipient.id,
              title: recipient.display_name,
              conversationWithSelf:  recipient.id === currentUser?.id,
            },
          };
          navigate(`/${data.id}`, { state });
        },
        onError: (err) => {
          console.log("ERROR", err);
        },
      }
  );
};

export const useReadConversation = () => {
  const axiosPrivate = useAxiosPrivate();

  return useMutation(
      async (conversationId: number) => {
        const res = await axiosPrivate.put(
            `http://localhost:3000/api/conversations/${conversationId}/read`
        );
        return res.data;
      },
      {
        onSuccess: (data) => {
          console.log("SUCCESS", data);
        },
      }
  );
};

export const useConversationRequests = () => {
  const axiosPrivate = useAxiosPrivate();
  const { currentUser } = useAuth();
  return useQuery<ConversationRequest[]>(
      ["conversationRequests"],
      async () => {
        const res = await axiosPrivate.get(
            `http://localhost:3000/api/conversations/requests/${currentUser?.id}`
        );
        return res.data;
      },
      {
        onError: (err) => {
          console.error(err);
        },
        refetchOnWindowFocus: false,
      }
  );
};

export const useAcceptConversationRequest = () => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { decryptionkey, privatekey } = useAuth();

  return useMutation(
    async (requestId: number) => {
      // Получение данных запроса
      const res = await axiosPrivate.get(
        `http://localhost:3000/api/conversations/request/${requestId}`
      );

      const { ct } = res.data; // Извлечение шифротекста из данных

      // Метод Kyber768 decap для восстановления общего секрета с использованием вашего приватного ключа
      const recipient = new Kyber768();
      const ssR = await recipient.decap(ct, privatekey);

      // Преобразование общего секрета в UInt8Array
      const ssRBytes = aesjs.utils.utf8.toBytes(ssR);

      // Шифрование общего секрета с использованием пароля получателя
      const aesCbc = new aesjs.ModeOfOperation.cbc(decryptionkey, new Uint8Array(ssRBytes.length));
      const AESSymKey = aesCbc.encrypt(aesjs.padding.pkcs7.pad(ssRBytes));

      // Отправка обратно симметричного AES зашифрованного ключа
      const result = await axiosPrivate.put(
        `http://localhost:3000/api/conversations/request/${requestId}/accept`,
        { symkeyforme: AESSymKey } // Отправка симметричного ключа
      );
      
      return result.data;
    },
    {
        onSuccess: () => {
          queryClient.invalidateQueries(["conversations"]);
          queryClient.invalidateQueries(["conversationRequests"]);
        },
        onError: (err) => {
          console.error("ERROR", err);
        },
   }
  );
};

export const useDenyConversationRequest = () => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();

  return useMutation(
      async (requestId: number) => {
        const res = await axiosPrivate.put(
            `http://localhost:3000/api/conversations/request/${requestId}/deny`
        );
        return res.data;
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["conversationRequests"]);
        },
        onError: (err) => {
          console.error("ERROR", err);
        },
      }
  );
};

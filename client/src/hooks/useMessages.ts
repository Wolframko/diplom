import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import useAxiosPrivate from "./useAxiosPrivate";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useEffect, useRef } from "react";

// Хук для получения сообщений из диалога
export const useGetMessages = (conversationId: number) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const { decryptionkey } = getDecryptionKey(conversationId);

  return useQuery<Message[]>(
    ["messages", conversationId],
    async () => {
      const res = await axiosPrivate.get("http://localhost:3000/api/messages", {
        params: { conversationId },
      });
      
      // Предположим, что res.data - это массив зашифрованных сообщений
      const encryptedMessages = res.data;

      // Расшифровать каждое зашифрованное сообщение
      const decryptedMessages = encryptedMessages.map((encryptedMessage: string) => {
        // Преобразовать строку, закодированную в Base64, в Uint8Array для расшифровки AES
        const encryptedBytes = aesjs.utils.utf8.toBytes(encryptedMessage);
        
        const aesCbc = new aesjs.ModeOfOperation.cbc(decryptionkey, new Uint8Array(encryptedBytes.length));
        const decryptedBytes = aesCbc.decrypt(aesjs.padding.pkcs7.unpad(encryptedBytes));
        
        // Преобразовать расшифрованные байты обратно в строку UTF8
        const decryptedMessage = aesjs.utils.utf8.fromBytes(decryptedBytes);
        return decryptedMessage;
      });

      return decryptedMessages;
    },
    {
      onError: (err: any) => {
        // Перенаправить на страницу входа при ошибке 401
        if (err.response?.status === 401) navigate("/");
      },
      retry: (_, error: any) => {
        // Повторить запрос, если код ошибки не 401
        return error?.response?.status !== 401;
      },
      refetchOnWindowFocus: false, // Отключить обновление данных при фокусе окна
    }
  );
};

// Хук для получения сообщений из диалога с бесконечной прокруткой
export const useGetMessagesInfinite = (conversationId: number, limit = 20) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { decryptionkey } = getDecryptionKey(conversationId);

  return useInfiniteQuery<Message[]>(
    ["messages", conversationId],
    async ({ pageParam = 1 }) => {
      const res = await axiosPrivate.get("http://localhost:3000/api/messages", {
        params: {
          conversationId,
          page: pageParam,
          limit: limit,
        },
      });
      // res.data это массив зашифрованных сообщений
      const encryptedMessages = res.data;

      // Расшифровка каждого зашифрованного сообщения
      const decryptedMessages = encryptedMessages.map((encryptedMessage: string) => {
        // Преобразование закодированной в Base64 строки в Uint8Array для расшифровки AES
        const encryptedBytes = aesjs.utils.utf8.toBytes(encryptedMessage);
        
        const aesCbc = new aesjs.ModeOfOperation.cbc(decryptionkey, new Uint8Array(encryptedBytes.length));
        const decryptedBytes = aesCbc.decrypt(aesjs.padding.pkcs7.unpad(encryptedBytes));
        
        // Преобразование расшифрованных байтов обратно в строку UTF8
        const decryptedMessage = aesjs.utils.utf8.fromBytes(decryptedBytes);
        return decryptedMessage;
      });

      return decryptedMessages;
    },
    {
      onSuccess: () => {
        // Обновление статуса прочитанности.
        queryClient.setQueryData<Conversation[]>(["conversations"], (prevConversations) => {
          if (prevConversations) {
            const conversationIndex = prevConversations!.findIndex((conv) => conv.id === conversationId);
            const updatedConversation: Conversation = {
              ...prevConversations![conversationIndex], isRead: true 
            };
            const updatedConversations = [...prevConversations!];
            updatedConversations[conversationIndex] = updatedConversation;
            return updatedConversations;
          }
          return prevConversations;
        });
      },
      onError: (err: any) => {
        // перенаправление на страницу входа при ошибке 401
        if (err.response?.status === 401) navigate("/");
      },
      retry: (_, error: any) => {
        // повторная попытка, если ошибка не 401
        return error?.response?.status !== 401;
      },
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage, allPages) => {
        // Функция для получения следующей страницы
        return lastPage.length ? allPages.length + 1 : undefined;
      },
    }
  );
};

// Хук для отправки нового сообщения
export const useNewMessage = (conversationId: number, recipientId: number, message: string) => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { decryptionkey } = getDecryptionKey(conversationId);

  return useMutation<Message>(
    async () => {
      // Преобразование сообщения в байты
      const messageBytes = aesjs.utils.utf8.toBytes(message);
      // Создание экземпляра AES CBC с вашим ключом дешифрования и новым вектором инициализации
      const aesCbc = new aesjs.ModeOfOperation.cbc(decryptionkey, new Uint8Array(16));
      // Шифрование сообщения
      const encryptedMessage = aesjs.utils.hex.fromBytes(aesCbc.encrypt(aesjs.padding.pkcs7.pad(messageBytes)));
      const res = await axiosPrivate.post("http://localhost:3000/api/messages/new", {
        message: encryptedMessage,
        conversationId: conversationId,
      });
      return res.data;
    },
    {
      onSuccess: (data) => {
        // Обновление кэша сообщений
        queryClient.setQueryData<InfiniteData<Message[]>>(
          ["messages", conversationId],
          (prevData) => {
            const pages = prevData?.pages.map((page) => [...page]) ?? [];
            pages[0].unshift(data);
            return { ...prevData!, pages };
          }
        );

        // Обновление кэша диалогов
        queryClient.setQueryData<Conversation[]>(
          ["conversations"],
          (prevConversations) => {
            const conversationIndex = prevConversations!.findIndex(
              (conv) => conv.id === conversationId
            );
            const updatedConversation: Conversation = {
              ...prevConversations![conversationIndex],
              lastMessageSent: {
                id: data.id,
                message: data.message,
                created_at: data.created_at,
              },
            };
            const updatedConversations = [...prevConversations!];
            updatedConversations[conversationIndex] = updatedConversation;
            return updatedConversations;
          }
        );

        // Инициирование события сокета для отправки сообщения
        socket.emit("send-message", {
          id: data.id,
          authorId: data.authorId,
          recipientId,
          conversationId,
          message: data.message,
          timeSent: data.created_at,
        });
      },
      onError: (err) => {
        console.log("ERROR", err);
      },
    }
  );
};

export const useDeleteMessage = (conversationId: number) => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();

  return useMutation(
    async (messageId: number) => {
      const res = await axiosPrivate.delete(`http://localhost:3000/api/messages/${messageId}`);
      return res.data;
    },
    {
      onSuccess: (data) => {
        // Удаление сообщения из запроса
        queryClient.setQueryData<InfiniteData<Message[]>>(
          ["messages", conversationId],
          (prevData) => {
            if (prevData) {
              const updatedPages = prevData!.pages.map((page) =>
                page.filter((message) => message.id !== data.messageId)
              );
              return { ...prevData, pages: updatedPages };
            }
            return prevData;
          }
        );
        // Обновление последнего отправленного сообщения в запросе диалогов
        queryClient.setQueryData<Conversation[]>(
          ["conversations"],
          (prevConversations) => {
            const conversationIndex = prevConversations!.findIndex(
              (conv) => conv.id === conversationId
            );
            if (
              prevConversations![conversationIndex].lastMessageSent!.id ===
              data.messageId
            ) {
              let newLastMessageSent = null;
              const messagesData = queryClient.getQueryData<
                InfiniteData<Message[]>
              >(["messages", conversationId]);
              if (messagesData && messagesData.pages.length > 0) {
                const firstPage = messagesData.pages[0];
                newLastMessageSent = firstPage[0];
              }

              let lastMessageSent;
              if (newLastMessageSent === undefined) {
                lastMessageSent = undefined;
              } else {
                lastMessageSent = {
                  id: newLastMessageSent!.id,
                  message: newLastMessageSent!.message,
                  created_at: newLastMessageSent!.created_at,
                };
              }
              const updatedConversation: Conversation = {
                ...prevConversations![conversationIndex],
                lastMessageSent: lastMessageSent,
              };
              const updatedConversations = [...prevConversations!];
              updatedConversations[conversationIndex] = updatedConversation;

              return updatedConversations;
            }
            return prevConversations;
          }
        );
      },
    }
  );
};

export const useEditMessage = (conversationId: number) => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();

  return useMutation(
    async (data: { messageId: number; message: string }) => {
      const res = await axiosPrivate.put(`http://localhost:3000/api/messages/${data.messageId}`, {
        message: data.message,
      });
      return res.data;
    },
    {
      onSuccess: (data, variables) => {
        // Обновление сообщения в запросе
        queryClient.setQueryData<InfiniteData<Message[]>>(
          ["messages", conversationId],
          (prevData) => {
            if (prevData) {
              const updatedPages = prevData.pages.map((page) =>
                page.map((message) => {
                  if (message.id === variables.messageId) {
                    return {
                      ...message,
                      message: variables.message,
                      isEdited: true,
                    };
                  }
                  return message;
                })
              );
              return {
                ...prevData,
                pages: updatedPages,
              };
            }
            return prevData;
          }
        );
        // Обновление последнего отправленного сообщения в запросе диалогов
        queryClient.setQueryData<Conversation[]>(
          ["conversations"],
          (prevConversations) => {
            if (prevConversations) {
              const updatedConversations = prevConversations.map(
                (conversation) => {
                  if (conversation.id === conversationId) {
                    return {
                      ...conversation,
                      lastMessageSent: {
                        ...conversation.lastMessageSent!,
                        message: variables.message,
                      },
                    };
                  }
                  return conversation;
                }
              );
              return updatedConversations;
            }
            return prevConversations;
          }
        );
      },
    }
  );
};

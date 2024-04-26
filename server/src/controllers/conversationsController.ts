import { Request, Response } from "express";
import { db } from "../db";

// Отправить новый запрос на разговор
export const sendConversationRequest = async (req: Request, res: Response) => {
  const { recipientId } = req.body;
  const senderId = req.userId;

  try {
    const newRequest = await db.conversationRequest.create({
      data: {
        senderId: parseInt(senderId),
        recipientId: parseInt(recipientId),
        status: 'PENDING',
      },
    });
    res.status(201).json(newRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

// Принять запрос на разговор
export const acceptConversationRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;

  try {
    const request = await db.conversationRequest.update({
      where: { id: parseInt(requestId) },
      data: { status: 'ACCEPTED' },
    });

    if (!request) {
      return res.status(404).json({ message: "Запрос не найден" });
    }

    // Создать новый разговор
    const conversation = await db.conversation.create({
      data: {
        participants: {
          create: [
            { userId: request.senderId },
            { userId: request.recipientId },
          ],
        },
      },
    });

    res.status(200).json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

// Отклонить запрос на разговор
export const denyConversationRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;

  try {
    const request = await db.conversationRequest.update({
      where: { id: parseInt(requestId) },
      data: { status: 'DENIED' },
    });

    if (!request) {
      return res.status(404).json({ message: "Запрос не найден" });
    }

    res.status(200).json({ message: "Запрос отклонен" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

// Получить все запросы на разговор для текущего пользователя
export const getConversationRequests = async (req: Request, res: Response) => {
  const userId = req.userId;

  try {
    const requests = await db.conversationRequest.findMany({
      where: {
        OR: [
          { senderId: parseInt(userId) },
          { recipientId: parseInt(userId) }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            display_name: true,
            username: true,
            profile_picture: true,
          },
        },
        recipient: {
          select: {
            id: true,
            display_name: true,
            username: true,
            profile_picture: true,
          },
        },
      },
    });
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

export const newConversation = async (req: Request, res: Response) => {
  const participantIds: number[] = req.body.participants;

  if (!participantIds || participantIds.length === 0)
    res.status(400).json({ message: "Необходимо предоставить массив участников" });

  const creatorId = req.userId;
  const creatorIdParsed = parseInt(creatorId);

  const participants = [creatorIdParsed, ...participantIds];
  const conversationWithSelf =
      participantIds.length === 1 && participantIds[0] === creatorIdParsed;

  try {
    // Условно написать запрос
    let query;
    if (conversationWithSelf) {
      query = {
        participants: {
          every: {
            userId: { in: participants },
          },
        },
      };
    } else {
      query = {
        AND: participants.map((participantId) => ({
          participants: {
            some: {
              userId: participantId,
            },
          },
        })),
      };
    }
    // Проверить, существует ли разговор
    const existingConversation = await db.conversation.findMany({
      where: query,
      select: {
        id: true,
        title: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                display_name: true,
                profile_picture: true,
              },
            },
          },
        },
      },
    });
    if (existingConversation.length > 0) {
      const response = {
        ...existingConversation[0],
        messages: undefined,
        participants: existingConversation[0].participants.map(
            (participant) => participant.user
        ),
      };
      return res.status(200).json(response);
    }
    // Данные для нового разговора
    let data;
    if (conversationWithSelf) {
      data = [{ user: { connect: { id: creatorIdParsed } } }];
    } else {
      data = participants.map((participantId) => ({
        user: { connect: { id: participantId } },
      }));
    }
    // Создать новый разговор
    const conversation = await db.conversation.create({
      data: {
        participants: {
          create: data,
        },
      },
      select: {
        id: true,
        title: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                display_name: true,
                username: true,
                profile_picture: true,
              },
            },
          },
        },
      },
    });
    const response = {
      ...conversation,
      messages: undefined,
      participants: conversation.participants.map(
          (participant) => participant.user
      ),
    };
    res.status(201).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

export const getAllConversations = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const userIdParsed = parseInt(userId);
  try {
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: { userId: userIdParsed },
        },
        messages: {
          some: {},
        },
      },
      select: {
        id: true,
        title: true,
        messages: {
          select: {
            id: true,
            message: true,
            created_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
        participants: {
          select: {
            isRead: true,
            user: {
              select: {
                id: true,
                display_name: true,
                username: true,
                profile_picture: true,
              },
            },
          },
        },
      },
      orderBy: {
        dateLastMessage: "desc",
      },
    });
    const response = conversations.map((conversation) => {
      let isRead =
          conversation.participants[0].user.id === userIdParsed
              ? conversation.participants[0].isRead
              : conversation.participants[1].isRead;
      return {
        ...conversation,
        lastMessageSent: conversation.messages[0],
        messages: undefined,
        participants: conversation.participants.map(
            (participant) => participant.user
        ),
        isRead: isRead,
      };
    });
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

export const readConversation = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const parsedConversationId = parseInt(conversationId);
  const userId = req.userId;
  const parsedUserId = parseInt(userId);
  try {
    await db.conversationUser.updateMany({
      where: {
        conversationId: parsedConversationId,
        userId: parsedUserId,
      },
      data: {
        isRead: true,
      },
    });
    res
        .status(200)
        .json({ message: "Разговор был успешно прочитан" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err });
  }
};

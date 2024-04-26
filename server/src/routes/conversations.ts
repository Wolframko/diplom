import express, { Router } from "express";
import {
  getAllConversations,
  newConversation,
  readConversation,
  sendConversationRequest,
  acceptConversationRequest,
  denyConversationRequest,
  getConversationRequests,
} from "../controllers/conversationsController";
import { verifyJWT } from "../middleware/verifyJWT";

const conversationsRouter: Router = express.Router();

conversationsRouter.post("/new", verifyJWT, newConversation);

conversationsRouter.get("/:userId", verifyJWT, getAllConversations);

conversationsRouter.put("/:conversationId/read", verifyJWT, readConversation);

conversationsRouter.post("/request", verifyJWT, sendConversationRequest);

conversationsRouter.put("/request/:requestId/accept", verifyJWT, acceptConversationRequest);

conversationsRouter.put("/request/:requestId/deny", verifyJWT, denyConversationRequest);

conversationsRouter.get("/requests/:userId", verifyJWT, getConversationRequests);

export default conversationsRouter;

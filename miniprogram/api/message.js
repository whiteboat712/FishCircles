import http from "../utils/http";

// 获取聊天消息
export const reqMessages = (senderId, receiverId) => {
  return http.post(
    `/privateMessage/get?senderId=${senderId}&receiverId=${receiverId}`
  );
};

// 发送聊天消息
export const sendMessage = (message) => {
  return http.post("/privateMessage/send", message);
};

// 获取用户所有相关消息
export const reqUserMessages = (userId) => {
  return http.get(`/privateMessage/user?userId=${userId}`);
};

// 标记两个用户间的消息为已读
export const reqRead = (senderId, receiverId) => {
  return http.get(
    `/privateMessage/read?senderId=${senderId}&receiverId=${receiverId}`
  );
};

// 获取用户收到的点赞消息
export const reqLikeMessages = (userId) => {
  return http.get(`/message/likes?userId=${userId}`);
};

// 获取用户收到的评论和回复消息
export const reqCommentMessages = (userId) => {
  return http.get(`/message/comments?userId=${userId}`);
};

// 标记消息为已读
export const markMessageRead = (messageId, messageType) => {
  return http.post("/message/read", { messageId, messageType });
};

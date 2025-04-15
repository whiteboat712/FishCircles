import http from "../utils/http";

/**
 * 获取评论列表
 * @returns {Promise} 评论列表
 */
export const reqReviews = (fromId, fromType) => {
  return http.get(`/review/get?fromId=${fromId}&fromType=${fromType}`);
};

export const getReviewsByUser = (userId) => {
  return http.get(`/review/user/${userId}`);
};

/**
 * 获取评论数
 */
export const reqReviewCount = (fromId, fromType) => {
  return http.get(`/review/count?fromId=${fromId}&fromType=${fromType}`);
};

export const review = (fromId, fromType, userId, content, images) => {
  return http.post(
    `/review/add?fromId=${fromId}&fromType=${fromType}&userId=${userId}&content=${content}&images=%5B${images}%5D`
  );
};

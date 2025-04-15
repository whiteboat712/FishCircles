import http from "../utils/http";

/**
 * 获取所有公开帖子列表
 * @returns {Promise<Array>} 包含所有帖子的数组
 */
export const reqAllPosts = () => {
  return http.get("/post/all");
};

/**
 * 发布新动态
 * @param {Object} postData 动态数据
 * @returns {Promise} 发布结果
 */
export const reqPublishPost = (postData) => {
  return http.post("/post/add", postData);
};

/**
 * 获取动态详情
 * @param {Number} postId 动态ID
 * @returns {Promise} 动态详情
 */
export const reqPostDetail = (postId) => {
  return http.get(`/post/${postId}`);
};

export const reqSearchPost = (query) => {
  return http.get(`/post/search?query=${query}`);
};

export const reqUserPost = (userId) => {
  return http.get(`/post/user/${userId}`);
};

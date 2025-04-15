import http from "../utils/http";
const app = getApp();
/**
 * 获取首页数据
 */
const reqPostData = () => {
  // 首页数据获取逻辑
};

export const reqImage = (id) => {
  return `${app.globalData.baseUrl}/file/download/${id}`;
};

export const uploadFile = (url) => {
  return http.upload("/file/upload", url);
  // wx.uploadFile({
  //   filePath: url,
  //   name: 'file',
  //   url: `${app.globalData.baseUrl}/file/upload`,
  //   success(res) {
  //     return res
  //   }
  // })
};

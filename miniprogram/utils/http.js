import WxRequest from "mina-request";
import { toast } from "./extendApi";
const app = getApp();
const instance = new WxRequest({
  baseURL: app.globalData.baseUrl,
  timeout: 15000,
  isLoading: false,
});

instance.interceptors.request = (config) => {
  return config;
};

instance.interceptors.response = (response) => {
  const { isSuccess, data } = response;

  if (!isSuccess) {
    toast({
      title: "网络异常请重试",
      icon: "error",
    });

    return Promise.reject(response);
  }
  return data;
};

export default instance;

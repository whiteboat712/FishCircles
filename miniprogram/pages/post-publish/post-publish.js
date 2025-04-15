// pages/post-publish/post-publish.js
import Toast from "@vant/weapp/toast/toast";
import { reqPublishPost } from "../../api/post";
import { reqImage, uploadFile } from "../../api/index";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    content: "",
    imageList: [],
    imageNum: [],
    visibleScope: "PUBLIC", // PUBLIC 或 PRIVATE
    locationShared: false,
    latitude: null,
    longitude: null,
    locationName: "",
    submitting: false,
    currentUser: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      currentUser: app.globalData.user,
    });

    // 检查用户是否已登录
    if (!this.data.currentUser) {
      Toast.fail({
        duration: 1000,
        message: "请先登录",
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /**
   * 输入内容变化
   */
  onContentChange(e) {
    this.setData({
      content: e.detail,
    });
  },

  /**
   * 切换可见范围
   */
  onVisibleScopeChange(e) {
    this.setData({
      visibleScope: e.detail,
    });
  },

  /**
   * 切换是否分享位置
   */
  onLocationSharedChange(e) {
    const locationShared = e.detail;
    this.setData({ locationShared });

    if (locationShared) {
      this.getLocation();
    } else {
      this.setData({
        latitude: null,
        longitude: null,
        locationName: "",
      });
    }
  },

  /**
   * 获取当前位置
   */
  getLocation() {
    Toast.loading({
      duration: 0,
      message: "获取位置中...",
    });

    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({ latitude, longitude });
        Toast.clear();
      },
      fail: (err) => {
        console.error("获取位置失败", err);
        Toast.clear();
        Toast.fail({
          duration: 2000,
          message: "获取位置失败",
        });
        this.setData({
          locationShared: false,
        });
      },
    });
  },

  /**
   * 上传图片
   */
  async afterRead(event) {
    const { file } = event.detail;
    console.log(file);
    const res = await uploadFile(file.url);
    // 上传完成需要更新 fileList
    const { imageList = [] } = this.data;
    const { imageNum = [] } = this.data;
    imageList.push({ ...res.data, url: file.url });
    imageNum.push(res.data.imageId);
    this.setData({ imageList, imageNum });
  },

  /**
   * 删除图片
   */
  onDelete(e) {
    const { index } = e.detail;
    const { imageList } = this.data;
    const { imageNum } = this.data;

    imageList.splice(index, 1);
    imageNum.splice(index, 1);
    this.setData({ imageList, imageNum });
  },

  /**
   * 发布动态
   */
  async publishPost() {
    // 检查用户是否已登录
    if (!this.data.currentUser) {
      Toast.fail({
        message: "请先登录",
      });
      return;
    }

    // 检查内容是否为空
    if (!this.data.content.trim()) {
      Toast.fail({
        message: "请输入动态内容",
      });
      return;
    }

    // 检查图片是否全部上传完成
    const { imageList } = this.data;

    try {
      this.setData({ submitting: true });

      // 准备发布数据
      const postData = {
        userId: this.data.currentUser.userId,
        content: this.data.content,
        images: "[" + this.data.imageNum.toString() + "]",
        visibleScope: this.data.visibleScope,
        locationShared: this.data.locationShared,
        latitude: this.data.locationShared ? this.data.latitude : null,
        longitude: this.data.locationShared ? this.data.longitude : null,
      };

      await reqPublishPost(postData);
      Toast.success({
        message: "发布成功",
      });

      // 返回上一页并刷新动态列表
      setTimeout(() => {
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];

        // 如果上一页是动态列表页，刷新列表
        if (prevPage && prevPage.route === "pages/posts/posts") {
          prevPage.fetchPosts();
        }

        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error("发布动态失败", error);
      this.setData({ submitting: false });
      Toast.fail({
        message: "发布失败，请重试",
      });
    }
  },
});

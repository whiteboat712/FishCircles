import Toast from "@vant/weapp/toast/toast";
import { reqAddActivity } from "../../api/activity";
import { reqImage, uploadFile } from "../../api/index";
import { reqAllSpots } from "../../api/spot";

// pages/activity-publish/activity-publish.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    locationName: "",
    imageList: [],
    imageNum: [],
    submitting: false,
    currentUser: null,

    // 钓点选择相关
    spotId: null,
    spotsList: [],
    showSpotPicker: false,

    // 时间选择器相关
    showStartPicker: false,
    currentDate: new Date().getTime(),
    minDate: new Date().getTime(),
    startTimeDate: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      currentUser: app.globalData.user || {},
    });

    // 检查用户是否已登录
    if (!this.data.currentUser.userId) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }

    // 获取所有钓点
    this.fetchAllSpots();
  },

  /**
   * 标题变化
   */
  onTitleChange(e) {
    this.setData({
      title: e.detail,
    });
  },

  /**
   * 描述变化
   */
  onDescriptionChange(e) {
    this.setData({
      description: e.detail,
    });
  },

  /**
   * 显示开始时间选择器
   */
  showStartTimePicker() {
    this.setData({
      showStartPicker: true,
    });
  },

  /**
   * 关闭开始时间选择器
   */
  closeStartTimePicker() {
    this.setData({
      showStartPicker: false,
    });
  },

  /**
   * 确认开始时间
   */
  onStartTimeConfirm(e) {
    const date = new Date(e.detail);
    const formattedTime = this.formatDateTime(date);

    this.setData({
      startTime: formattedTime,
      startTimeDate: date.getTime(),
      showStartPicker: false,
    });
  },

  /**
   * 格式化日期时间为标准ISO-8601格式
   */
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}:00`;
  },

  /**
   * 获取所有钓点
   */
  async fetchAllSpots() {
    try {
      const result = await reqAllSpots();
      if (result && result.data) {
        this.setData({
          spotsList: result.data,
        });
      }
    } catch (error) {
      console.error("获取钓点列表失败", error);
      Toast.fail({
        message: "获取钓点列表失败",
      });
    }
  },

  /**
   * 显示钓点选择器
   */
  showSpotPicker() {
    this.setData({
      showSpotPicker: true,
    });
  },

  /**
   * 关闭钓点选择器
   */
  closeSpotPicker() {
    this.setData({
      showSpotPicker: false,
    });
  },

  /**
   * 选择钓点
   */
  onSpotSelect(e) {
    const { spotId } = e.currentTarget.dataset;
    const selectedSpot = this.data.spotsList.find(
      (spot) => spot.spotId === spotId
    );

    if (selectedSpot) {
      this.setData({
        spotId: selectedSpot.spotId,
        locationName: selectedSpot.name,
        showSpotPicker: false,
      });
    }
  },

  /**
   * 上传图片
   */
  async afterRead(event) {
    const { file } = event.detail;
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
   * 发布活动
   */
  async publishActivity() {
    // 检查用户是否已登录
    if (!this.data.currentUser) {
      Toast.fail({
        message: "请先登录",
      });
      return;
    }

    // 检查必填字段
    if (!this.data.title.trim()) {
      Toast.fail({
        message: "请输入活动标题",
      });
      return;
    }

    if (!this.data.startTime) {
      Toast.fail({
        message: "请选择开始时间",
      });
      return;
    }

    if (!this.data.spotId) {
      Toast.fail({
        message: "请选择活动地点",
      });
      return;
    }

    // 检查图片是否全部上传完成
    const { imageList } = this.data;

    try {
      this.setData({ submitting: true });

      // 准备图片ID数组
      const imageIds = imageList.map((img) => img.imageId);

      // 准备发布数据
      await reqAddActivity(
        this.data.title,
        this.data.currentUser.userId,
        this.data.spotId,
        this.data.description,
        this.data.imageNum,
        this.data.startTime
      );
    } catch (error) {
      wx.hideLoading();
      console.error("发布活动失败", error);
      this.setData({ submitting: false });
      this.handlePublishError("发布失败，请重试");
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 处理发布错误
   */
  handlePublishError(message) {
    wx.showToast({
      title: message,
      icon: "none",
      duration: 2000,
    });
  },
});

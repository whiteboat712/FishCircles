// pages/profile-other/profile-other.js
import { reqUserData } from "../../api/profile";
import { reqImage } from "../../api/index";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userId: null,
    user: null,
    activeTab: 0,
    userAvatar: "",
    userPosts: [],
    userActivities: [],
    userFavorites: [],
  },

  /**
   * 发送私信
   */
  sendMessage() {
    if (!app.globalData.user) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${this.data.userId}`,
    });
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    if (!this.data.userId) return;

    wx.showLoading({ title: "加载中..." });

    try {
      const res = await reqUserData(this.data.userId);

      this.setData({
        user: res.data,
      });

      if (this.data.user && this.data.user.avatarUrl) {
        this.setData({
          userAvatar: reqImage(this.data.user.avatarUrl),
        });
      } else {
        this.setData({
          userAvatar: "/assets/images/default_avatar.jpg",
        });
      }

      wx.hideLoading();
    } catch (error) {
      console.error("获取用户数据失败", error);
      wx.hideLoading();
      wx.showToast({
        title: "获取用户数据失败",
        icon: "none",
      });
    }
  },

  /**
   * 标签页切换事件
   */
  onTabChange(event) {
    this.setData({
      activeTab: event.detail.index,
    });

    // 根据标签页加载不同数据
    if (event.detail.index === 0 && this.data.userPosts.length === 0) {
      // 加载用户动态
      this.loadUserPosts();
    } else if (
      event.detail.index === 1 &&
      this.data.userActivities.length === 0
    ) {
      // 加载用户活动
      this.loadUserActivities();
    } else if (
      event.detail.index === 2 &&
      this.data.userFavorites.length === 0
    ) {
      // 加载用户收藏
      this.loadUserFavorites();
    }
  },

  /**
   * 加载用户动态
   */
  loadUserPosts() {
    // 这里应该调用API获取用户动态
    // 模拟API调用
    wx.showLoading({ title: "加载中..." });

    setTimeout(() => {
      // 模拟数据
      // this.setData({ userPosts: [...] })

      wx.hideLoading();
    }, 1000);
  },

  /**
   * 加载用户活动
   */
  loadUserActivities() {
    // 这里应该调用API获取用户活动
    // 模拟API调用
    wx.showLoading({ title: "加载中..." });

    setTimeout(() => {
      // 模拟数据
      // this.setData({ userActivities: [...] })

      wx.hideLoading();
    }, 1000);
  },

  /**
   * 加载用户收藏
   */
  loadUserFavorites() {
    // 这里应该调用API获取用户收藏
    // 模拟API调用
    wx.showLoading({ title: "加载中..." });

    setTimeout(() => {
      // 模拟数据
      // this.setData({ userFavorites: [...] })

      wx.hideLoading();
    }, 1000);
  },

  onPullDownRefresh() {
    this.loadUserData();

    // 根据当前标签页刷新数据
    if (this.data.activeTab === 0) {
      this.loadUserPosts();
    } else if (this.data.activeTab === 1) {
      this.loadUserActivities();
    } else if (this.data.activeTab === 2) {
      this.loadUserFavorites();
    }

    wx.stopPullDownRefresh();
  },

  onLoad(options) {
    if (options.userId) {
      this.setData({
        userId: options.userId,
      });
      this.loadUserData();

      // 根据当前标签页加载数据
      if (this.data.activeTab === 0) {
        this.loadUserPosts();
      } else if (this.data.activeTab === 1) {
        this.loadUserActivities();
      } else if (this.data.activeTab === 2) {
        this.loadUserFavorites();
      }
    } else {
      wx.showToast({
        title: "用户ID不存在",
        icon: "none",
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },
});

// pages/settings/settings.js
import { setStorage, getStorage, removeStorage } from "../../utils/storage";
import { update } from "../../api/profile";
const app = getApp();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    user: null,
    isEditing: false,
  },

  /**
   * 退出登录
   */
  logout() {
    wx.showModal({
      title: "提示",
      content: "确定要退出登录吗？",
      success(res) {
        if (res.confirm) {
          // 清除用户数据
          app.globalData.user = null;

          wx.showToast({
            title: "已退出登录",
            icon: "success",
          });

          wx.switchTab({
            url: "/pages/profile/profile",
          });
        }
      },
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadUserData();
  },

  /**
   * 加载用户数据
   */
  loadUserData() {
    const user = app.globalData.user;
    if (user) {
      this.setData({
        user,
      });
    }
  },

  /**
   * 跳转到登录页面
   */
  goToLogin() {
    wx.navigateTo({
      url: "/pages/login/login",
    });
  },

  /**
   * 切换动态可见范围
   */
  toggleDynamicVisibleScope() {
    const user = this.data.user;
    user.dynamicVisibleScope =
      user.dynamicVisibleScope === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    this.setData({ user, isEditing: true });
    update(this.data.user);
    wx.showToast({
      title:
        user.dynamicVisibleScope === "PUBLIC"
          ? "已设为公开"
          : "已设为仅关注者可见",
      icon: "none",
    });
  },

  /**
   * 切换位置共享
   */
  toggleLocationShare(event) {
    const user = this.data.user;
    user.locationShareEnabled = event.detail;
    this.setData({ user, isEditing: true });
    update(this.data.user);
  },

  /**
   * 保存用户信息
   */
  saveUserInfo() {
    if (!this.data.isEditing) {
      wx.showToast({
        title: "未做任何修改",
        icon: "none",
      });
      return;
    }

    // 这里应该调用API保存用户信息到服务器
    // 模拟API调用
    wx.showLoading({ title: "保存中..." });

    setTimeout(() => {
      // 保存到本地存储
      setStorage("user", this.data.user);

      wx.hideLoading();
      wx.showToast({
        title: "保存成功",
        icon: "success",
      });

      this.setData({ isEditing: false });
    }, 1000);
  },

  /**
   * 跳转到关于我们页面
   */
  goToAbout() {
    wx.navigateTo({
      url: "/pages/about/about",
    });
  },
});

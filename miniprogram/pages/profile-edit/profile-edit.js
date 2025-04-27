// pages/profile-edit/profile-edit.js
import { update } from "../../api/profile";
import { uploadFile, reqImage } from "../../api/index";
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    user: null,
    formattedDate: "",
    userAvatar: "",
    userAvatarUrl: "",
    isEditing: false,
    tempFilePath: "",
  },

  /**
   * 编辑昵称
   */
  editNickname() {
    const that = this;
    wx.showModal({
      title: "修改昵称",
      editable: true,
      placeholderText: "请输入新昵称",
      content: this.data.user.nickname,
      success(res) {
        if (res.confirm && res.content.trim()) {
          const user = that.data.user;
          user.nickname = res.content.trim();
          that.setData({ user, isEditing: true });
        }
      },
    });
  },

  /**
   * 编辑地区
   */
  editRegion() {
    const that = this;
    wx.showModal({
      title: "修改地区",
      editable: true,
      placeholderText: "请输入您所在的地区",
      content: this.data.user.region || '',
      success(res) {
        if (res.confirm && res.content.trim()) {
          const user = that.data.user;
          user.region = res.content.trim();
          that.setData({ user, isEditing: true });
        }
      },
    });
  },

  /**
   * 编辑经验等级
   */
  editExperienceLevel() {
    const that = this;
    wx.showActionSheet({
      itemList: ["新手", "进阶", "专业"],
      success(res) {
        const levelMap = ["BEGINNER", "INTERMEDIATE", "EXPERT"];
        const user = that.data.user;
        user.experienceLevel = levelMap[res.tapIndex];
        that.setData({ user, isEditing: true });
      },
    });
  },
  /**
   * 选择头像
   */
  chooseAvatar() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        // 使用Promise处理异步上传
        uploadFile(tempFilePath)
          .then((uploadRes) => {
            const user = that.data.user;
            user.avatarUrl = uploadRes.data.imageId;
            that.setData({
              userAvatar: reqImage(uploadRes.data.imageId),
              user: user,
              isEditing: true,
            });
          })
          .catch((err) => {
            console.error("上传头像失败:", err);
            wx.showToast({
              title: "上传头像失败",
              icon: "error",
            });
          });
      },
    });
  },

  /**
   * 保存用户信息
   */
  async saveUserInfo() {
    if (!this.data.isEditing) {
      wx.showToast({
        title: "未做任何修改",
        icon: "none",
      });
      return;
    }

    wx.showLoading({ title: "保存中..." });

    try {
      // 更新用户信息
      await update(this.data.user);

      // 更新全局数据
      app.globalData.user = this.data.user;

      wx.hideLoading();
      wx.showToast({
        title: "保存成功",
        icon: "success",
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: "保存失败",
        icon: "error",
      });
      console.error("保存用户信息失败:", error);
    }
  },

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  },

  goToProfile() {
    wx.navigateBack();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const user = app.globalData.user;
    let userAvatar = "";

    if (user && user.avatarUrl) {
      userAvatar = reqImage(user.avatarUrl);
    } else {
      userAvatar = "/assets/images/default_avatar.jpg";
    }

    this.setData({
      user: user,
      userAvatar: userAvatar,
      formattedDate: this.formatDate(user.createdAt),
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},
});

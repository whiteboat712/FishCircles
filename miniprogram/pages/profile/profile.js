// pages/profile/profile.js
import { reqUserActivity } from "../../api/activity";
import { reqUserPost } from "../../api/post";
import { getLikeCount, confirm } from "../../api/like";
import { reqReviewCount } from "../../api/review";
import { reqImage } from "../../api/index";
import { reqUserData } from "../../api/profile";
import { formatTime } from "../../utils/formatTime";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    user: null,
    activeTab: 0,
    loading: false,
    userAvatar: "",
    posts: [],
    activities: [],
    userFavorites: [],
  },

  goToLogin() {
    wx.navigateTo({
      url: "/pages/login/login",
    });
  },

  editProfile() {
    wx.navigateTo({
      url: "/pages/profile-edit/profile-edit",
    });
  },

  /**
   * 加载用户数据
   */
  loadUserData() {
    this.setData({
      user: app.globalData.user,
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
  },

  /**
   * 跳转到设置页面
   */
  goToSettings() {
    wx.navigateTo({
      url: "/pages/settings/settings",
    });
  },
  /**
   * 标签页切换事件
   */
  onTabChange(e) {
    const activeTab = e.detail.index;
    this.setData({ activeTab });

    this.reLoad();
  },

  reLoad() {
    this.loadUserPosts();
    this.loadUserActivities();
  },

  /**
   * 加载用户动态
   */
  async loadUserPosts() {
    try {
      this.setData({ loading: true });
      const res = await reqUserPost(app.globalData.user.userId);

      // 处理动态数据
      const posts = await Promise.all(
        res.data.map(async (post) => {
          // 获取动态用户的头像和用户名
          const user = await reqUserData(post.userId);
          post.user = user.data;

          // 格式化时间
          if (post.createdAt) {
            post.formattedTime = formatTime(new Date(post.createdAt));
          }

          // 处理图片数组
          if (post.images) {
            try {
              const imageIds = JSON.parse(post.images);
              post.imageUrls = imageIds.map((id) => reqImage(id));
            } catch (e) {
              console.error("解析图片数据失败", e);
              post.imageUrls = [];
            }
          } else {
            post.imageUrls = [];
          }

          // 添加用户头像
          post.userAvatar = post.user.avatarUrl
            ? reqImage(post.user.avatarUrl)
            : "/assets/images/default_avatar.jpg";

          // 格式化用户名称
          post.userName = post.user.nickname || `用户${post.userId}`;

          return post;
        })
      );

      this.setData({
        posts,
        loading: false,
      });
    } catch (error) {
      console.error("获取动态列表失败", error);
      this.setData({ loading: false });
      wx.showToast({
        title: "获取动态列表失败",
        icon: "error",
      });
    }
  },

  /**
   * 加载用户活动
   */
  async loadUserActivities() {
    try {
      this.setData({ loading: true });

      // 调用API获取活动列表
      const res = await reqUserActivity(app.globalData.user.userId);
      // 处理活动数据
      const activities = await Promise.all(
        res.data.map(async (activity) => {
          // 获取动态用户的头像和用户名
          const user = await reqUserData(activity.organizerId);
          activity.user = user.data;

          // 格式化时间
          if (activity.createdAt) {
            activity.createdAt = formatTime(new Date(activity.createdAt));
          }
          if (activity.startTime) {
            activity.startTime = formatTime(new Date(activity.startTime));
          }

          // 处理图片数组
          if (activity.images) {
            try {
              const imageIds = JSON.parse(activity.images);
              activity.imageUrls = imageIds.map((id) => reqImage(id));
            } catch (e) {
              console.error("解析图片数据失败", e);
              activity.imageUrls = [];
            }
          } else {
            activity.imageUrls = [];
          }

          // 添加用户头像
          activity.organizerAvatar = activity.user.avatarUrl
            ? reqImage(activity.user.avatarUrl)
            : "/assets/images/default_avatar.jpg";

          // 格式化用户名称
          activity.organizerName =
            activity.user.nickname || `用户${activity.userId}`;

          return activity;
        })
      );

      this.setData({
        activities,
        loading: false,
      });
    } catch (error) {
      console.error("获取活动列表失败", error);
      this.setData({ loading: false });
      wx.showToast({
        title: "获取活动列表失败",
        icon: "none",
      });
    }
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

  /**
   * 跳转到动态详情页
   */
  goToPostDetail(e) {
    const postId = e.currentTarget.dataset.postId;
    console.log(postId);
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`,
    });
  },

  /**
   * 跳转到活动详情页
   */
  goToActivityDetail(e) {
    const activityId = e.currentTarget.dataset.activityId;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${activityId}`,
    });
  },

  /**
   * 跳转到用户资料页
   */
  goToUserProfile(e) {
    e.stopPropagation(); // 阻止冒泡，防止触发父元素的点击事件
    const userId = e.currentTarget.dataset.userId;
    if (userId) {
      wx.navigateTo({
        url: `/pages/profile-other/profile-other?userId=${userId}`,
      });
    }
  },

  onLoad() {
    this.loadUserData();
    if (this.data.user) {
      this.reLoad();
    }
  },
  onShow() {
    this.loadUserData();
    if (this.data.user) {
      this.reLoad();
    }
  },

  onPullDownRefresh() {
    this.loadUserData();
    if (this.data.user) {
      this.reLoad();
    }
    wx.stopPullDownRefresh();
  }
});

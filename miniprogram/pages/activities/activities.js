// pages/activities/activities.js
import { getLikeCount, addLike, deleteLike, confirm } from "../../api/like";
import { reqReviewCount } from "../../api/review";
import { reqAllActivities } from "../../api/activity";
import { reqSpotData } from "../../api/spot";
import { reqImage } from "../../api/index";
import { reqUserData } from "../../api/profile";
import { formatTime } from "../../utils/formatTime";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activities: [],
    currentUser: null,
    showLocationFilter: false,
    isLocationFiltered: false,
    userLocation: null,
    filteredActivities: [],
    activeTab: 0, // 0: 全部, 1: 同城
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.reLoad();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.reLoad();
  },

  onPullDownRefresh() {
    this.reLoad();
    wx.stopPullDownRefresh();
  },

  reLoad() {
    // 每次显示页面时刷新活动列表，以获取最新数据
    this.setData({
      currentUser: app.globalData.user,
    });
    this.fetchActivities();
    // 如果当前是同城标签页，重新筛选
    if (this.data.activeTab === 1) {
      this.filterActivitiesByLocation();
    }
  },

  /**
   * 获取用户位置
   */
  getUserLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({ userLocation: { latitude, longitude } });
      },
      fail: (err) => {
        console.error("获取位置失败", err);
      },
    });
  },

  /**
   * 切换标签页
   */
  onTabChange(e) {
    const activeTab = e.detail.index;
    this.setData({ activeTab });

    if (activeTab === 1) {
      this.filterActivitiesByLocation();
    }
  },

  /**
   * 根据位置筛选活动
   */
  filterActivitiesByLocation() {
    const { activities, userLocation } = this.data;

    if (!userLocation) {
      wx.showToast({
        title: "无法获取位置信息",
        icon: "none",
      });
      return;
    }

    // 筛选共享位置且在同一城市的活动
    // 这里使用简单的距离计算，实际应用中可能需要更复杂的地理编码
    const MAX_DISTANCE = 10; // 10公里范围内视为同城

    const filtered = activities.filter((activity) => {
      if (!activity.spotLatitude || !activity.spotLongitude) return false;

      // 计算距离
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        activity.spotLatitude,
        activity.spotLongitude
      );

      return distance <= MAX_DISTANCE;
    });

    this.setData({
      filteredActivities: filtered,
      isLocationFiltered: true,
    });
  },

  /**
   * 计算两点之间的距离（公里）
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  },

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * 获取活动列表
   */
  async fetchActivities() {
    try {

      // 调用API获取活动列表
      const res = await reqAllActivities();

      // 处理活动数据
      const activities = await Promise.all(
        res.data.map(async (activity) => {
          // 获取组织者用户的头像和用户名
          const user = await reqUserData(activity.organizerId);
          activity.user = user.data;

          // 获取钓点信息
          const spot = await reqSpotData(activity.spotId);
          activity.spot = spot.data;

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

          // 检查当前用户是否已点赞
          if (this.data.currentUser) {
            const isLiked = await confirm(
              activity.activityId,
              2,
              this.data.currentUser.userId
            );
            activity.isLiked = isLiked.data;
          } else {
            activity.isLiked = false;
          }

          // 获取点赞数
          const likeCount = await getLikeCount(activity.activityId, 2);
          activity.likeCount = likeCount.data;

          // 获取评论数
          const reviewCount = await reqReviewCount(activity.activityId, 2);
          activity.reviewCount = reviewCount.data;

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
        activities
      });
    } catch (error) {
      console.error("获取活动列表失败", error);
      wx.showToast({
        title: "获取活动列表失败",
        icon: "none",
      });
    }
  },

  /**
   * 处理点赞
   */
  async handleLike(e) {
    if (!this.data.currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    const { activityId, index } = e.currentTarget.dataset;
    const activities = [...this.data.activities];
    const activity = activities[index];

    try {
      if (activity.isLiked) {
        // 取消点赞
        await deleteLike(activityId, 2, this.data.currentUser.userId);
        activity.isLiked = false;
        activity.likeCount = Math.max(0, activity.likeCount - 1);
      } else {
        // 添加点赞
        await addLike(activityId, 2, this.data.currentUser.userId);
        activity.isLiked = true;
        activity.likeCount = activity.likeCount + 1;
      }

      this.setData({ activities });

      // 如果在同城标签页，也需要更新过滤后的活动列表
      if (this.data.activeTab === 1) {
        this.filterActivitiesByLocation();
      }
    } catch (error) {
      console.error("点赞操作失败", error);
      wx.showToast({
        title: "操作失败，请重试",
        icon: "none",
      });
    }
  },

  /**
   * 跳转到活动详情页
   */
  goToActivityDetail(e) {
    const { activityId } = e.currentTarget.dataset;
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

  goToSearch() {
    console.log("启动搜索页");
    wx.navigateTo({
      url: "/pages/search/search",
    });
  },

  /**
   * 跳转到发布活动页面
   */
  goToPublish() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: "/pages/activity-publish/activity-publish",
    });
  },

  /**
   * 跳转到评论区
   */
  goToComment(e) {
    const { activityId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${activityId}&showComment=true`,
    });
  },

  /**
   * 分享活动
   */
  shareActivity(e) {
    // 分享逻辑在onShareAppMessage中处理
    this.activityId = e.currentTarget.dataset.activityId;
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const activityId = this.activityId;
    if (activityId) {
      const activity = this.data.activities.find(
        (item) => item.activityId === activityId
      );
      if (activity) {
        return {
          title: activity.title,
          path: `/pages/activity-detail/activity-detail?id=${activityId}`,
          imageUrl:
            activity.imageUrls && activity.imageUrls.length > 0
              ? activity.imageUrls[0]
              : "",
        };
      }
    }

    return {
      title: "钓鱼圈 - 发现精彩活动",
      path: "/pages/activities/activities",
    };
  },
});

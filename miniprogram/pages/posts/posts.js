// pages/posts/posts.js
import { reqAllPosts } from "../../api/post";
import { getLikeCount, addLike, deleteLike, confirm } from "../../api/like";
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
    posts: [],
    currentUser: null,
    showLocationFilter: false,
    isLocationFiltered: false,
    userLocation: null,
    filteredPosts: [],
    activeTab: 0, // 0: 全部, 1: 同城
    showLocationMap: false, // 是否显示地图弹出框
    currentLatitude: 0, // 当前显示的位置纬度
    currentLongitude: 0, // 当前显示的位置经度
    currentLocationName: "", // 当前显示的位置名称
    locationMarkers: [], // 地图标记点
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
    // 每次显示页面时刷新动态列表，以获取最新数据
    this.setData({
      currentUser: app.globalData.user,
    });
    this.fetchPosts();
    // 如果当前是同城标签页，重新筛选
    if (this.data.activeTab === 1) {
      this.filterPostsByLocation();
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
      this.filterPostsByLocation();
    }
  },
  /**
   * 根据位置筛选动态
   */
  filterPostsByLocation() {
    const { posts, userLocation } = this.data;

    this.getUserLocation();

    if (!userLocation) {
      wx.showToast({
        title: "无法获取位置信息",
        icon: "none",
      });
      return;
    }

    // 筛选共享位置且在同一城市的动态
    // 这里使用简单的距离计算，实际应用中可能需要更复杂的地理编码
    const MAX_DISTANCE = 10; // 10公里范围内视为同城

    const filteredPosts = posts.filter((post) => {
      if (!post.locationShared || !post.latitude || !post.longitude) {
        return false;
      }

      // 计算两点之间的距离（公里）
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        post.latitude,
        post.longitude
      );

      return distance <= MAX_DISTANCE;
    });

    this.setData({
      filteredPosts,
      isLocationFiltered: true,
    });
  },

  /**
   * 计算两个坐标点之间的距离（公里）
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

  /**
   * 角度转弧度
   */
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * 获取所有动态
   */
  async fetchPosts() {
    try {
      const res = await reqAllPosts();

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

          // 检查当前用户是否已点赞
          if (this.data.currentUser) {
            const isLiked = await confirm(
              post.postId,
              1,
              this.data.currentUser.userId
            );
            post.isLiked = isLiked.data;
          } else {
            post.isLiked = false;
          }

          // 获取点赞数
          const likeCount = await getLikeCount(post.postId, 1);
          post.likeCount = likeCount.data;

          // 获取评论数
          const reviewCount = await reqReviewCount(post.postId, 1);
          post.reviewCount = reviewCount.data;

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
        posts
      });
    } catch (error) {
      console.error("获取动态列表失败", error);
      wx.showToast({
        title: "获取动态列表失败",
        icon: "error",
      });
    }
  },
  /**
   * 处理点赞/取消点赞
   */
  async handleLike(e) {
    if (!this.data.currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }
    const { postId, index } = e.currentTarget.dataset;
    const post = this.data.posts[index];
    try {
      if (this.data.isLiked) {
        // 取消点赞
        await deleteLike(postId, 1, this.data.currentUser.userId);
        this.setData({
          [`posts[${index}].isLiked`]: false,
          [`posts[${index}].likeCount`]: (post.likeCount || 0) - 1,
        });
      } else {
        // 点赞
        await addLike(postId, 1, this.data.currentUser.userId);
        this.setData({
          [`posts[${index}].isLiked`]: true,
          [`posts[${index}].likeCount`]: (post.likeCount || 0) + 1,
        });
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
   * 跳转到动态详情页
   */
  goToPostDetail(e) {
    const { postId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`,
    });
  },

  /**
   * 跳转到用户资料页
   */
  goToUserProfile(e) {
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
   * 显示位置地图
   */
  locationMapShow(e) {
    const { latitude, longitude, locationName, postIndex } =
      e.currentTarget.dataset;

    // 检查是否有有效的坐标
    if (!latitude || !longitude) {
      wx.showToast({
        title: "无法获取位置信息",
        icon: "none",
      });
      return;
    }

    // 设置地图标记点
    const markers = [
      {
        id: 1,
        latitude,
        longitude,
        width: 30,
        height: 40,
      },
    ];

    // 更新数据，显示地图
    this.setData({
      showLocationMap: true,
      currentLatitude: latitude,
      currentLongitude: longitude,
      currentLocationName: locationName || "位置信息",
      locationMarkers: markers,
    });
  },

  /**
   * 关闭位置地图
   */
  closeLocationMap() {
    this.setData({
      showLocationMap: false,
    });
  },

  /**
   * 跳转到发布动态页面
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
      url: "/pages/post-publish/post-publish",
    });
  },

  /**
   * 跳转到评论页面
   */
  goToComment(e) {
    const { postId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}&showReviewInput=true`,
    });
  },

  /**
   * 分享动态
   */
  sharePost(e) {
    // 微信小程序会自动处理分享按钮的点击事件
    // 设置当前要分享的动态ID
    this.currentSharePostId = e.currentTarget.dataset.postId;
  },

  /**
   * 用户点击右上角分享或使用分享按钮时触发
   */
  onShareAppMessage(e) {
    // 如果是通过分享按钮触发的分享
    if (e.from === "button" && this.currentSharePostId) {
      const postId = this.currentSharePostId;
      const post = this.data.posts.find((p) => p.postId === postId);

      if (post) {
        return {
          title:
            post.content.substring(0, 20) +
            (post.content.length > 20 ? "..." : ""),
          path: `/pages/post-detail/post-detail?id=${postId}`,
          imageUrl: post.imageUrls.length > 0 ? post.imageUrls[0] : "",
        };
      }
    }

    // 默认分享信息
    return {
      title: "渔友圈动态",
      path: "/pages/posts/posts",
    };
  },
});

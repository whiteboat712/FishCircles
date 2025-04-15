// pages/search/search.js
import { reqSearchActivity } from "../../api/activity";
import { getLikeCount, addLike, deleteLike, confirm } from "../../api/like";
import { reqReviewCount } from "../../api/review";
import { reqImage } from "../../api/index";
import { reqUserData } from "../../api/profile";
import { formatTime } from "../../utils/formatTime";

Page({
  /**
   * 页面的初始数据
   */
  data: {
    searchValue: "", // 搜索关键词
    activeTab: 0, // 当前激活的标签页，0-动态，1-钓点，2-活动
    loading: false, // 加载状态
    searchFocused: false, // 搜索框是否获取焦点
    posts: [], // 动态搜索结果
    spots: [], // 钓点搜索结果
    activities: [], // 活动搜索结果
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 如果从其他页面带有搜索关键词跳转过来
    if (options.query) {
      this.setData({
        searchValue: options.query,
      });
      // 执行搜索
      this.onSearch();
    }

    // 如果指定了标签页
    if (options.tab) {
      this.setData({
        activeTab: parseInt(options.tab),
      });
    }
  },

  /**
   * 搜索框输入变化事件
   */
  onSearchChange(e) {
    this.setData({
      searchValue: e.detail,
    });
  },

  /**
   * 执行搜索
   */
  onSearch() {
    const { searchValue, activeTab } = this.data;
    if (!searchValue) return;

    this.setData({ loading: true });

    // 根据当前标签页执行对应的搜索
    switch (activeTab) {
      case 0:
        this.searchPosts(searchValue);
        break;
      case 1:
        this.searchSpots(searchValue);
        break;
      case 2:
        this.searchActivities(searchValue);
        break;
    }
  },

  /**
   * 搜索动态
   */
  async searchPosts(query) {
    try {
      this.setData({ loading: true });
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
   * 搜索钓点
   */
  async searchSpots(query) {
    // 显示加载状态
    if (!this.data.refreshing) {
      this.setData({
        loading: true,
      });
    }

    const res = await reqAllSpots();

    const fishingSpots = res.data.map((spot) => {
      // 处理图片数组
      if (spot.images) {
        try {
          const imageIds = JSON.parse(spot.images);
          spot.imageUrls = imageIds.map((id) => reqImage(id));
        } catch (e) {
          console.error("解析图片数据失败", e);
          spot.imageUrls = [];
        }
      } else {
        spot.imageUrls = [];
      }

      return spot;
    });
    this.setData({
      fishingSpots,
      loading: false,
    });
  },

  /**
   * 搜索活动
   */
  async searchActivities(query) {
    try {
      this.setData({ loading: true });

      // 调用API获取活动列表
      const res = await reqSearchActivity(query);
      console.log(res);
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
   * 标签页切换事件
   */
  onTabChange(e) {
    const activeTab = e.detail.index;
    this.setData({ activeTab });

    // 如果已有搜索关键词，切换标签页后自动搜索
    if (this.data.searchValue) {
      this.onSearch();
    }
  },

  /**
   * 取消搜索
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 清空搜索框
   */
  onClear() {
    this.setData({
      searchValue: "",
      posts: [],
      spots: [],
      activities: [],
    });
  },

  /**
   * 搜索框获取焦点
   */
  onSearchFocus() {
    this.setData({
      searchFocused: true,
    });
  },

  /**
   * 搜索框失去焦点
   */
  onSearchBlur() {
    this.setData({
      searchFocused: false,
    });
  },

  /**
   * 下拉刷新
   */
  reLoad() {
    if (this.data.searchValue) {
      this.onSearch();
    } else {
      this.setData({ loading: false });
    }
  },

  /**
   * 跳转到动态详情页
   */
  goToPostDetail(e) {
    const postId = e.currentTarget.dataset.postId;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?postId=${postId}`,
    });
  },

  /**
   * 跳转到钓点详情页
   */
  goToSpotDetail(e) {
    const spotId = e.currentTarget.dataset.spotId;
    // 假设钓点详情页面路径
    wx.navigateTo({
      url: `/pages/spots/spots?spotId=${spotId}`,
    });
  },

  /**
   * 跳转到活动详情页
   */
  goToActivityDetail(e) {
    const activityId = e.currentTarget.dataset.activityId;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?activityId=${activityId}`,
    });
  },
});

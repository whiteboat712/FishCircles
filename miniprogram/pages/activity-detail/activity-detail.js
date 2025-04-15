// pages/activity-detail/activity-detail.js
import { getLikeCount, addLike, deleteLike, confirm } from "../../api/like";
import { reqUserData } from "../../api/profile";
import { reqImage, uploadFile } from "../../api/index";
import { formatTime } from "../../utils/formatTime";
import { reqReviews, review } from "../../api/review";
import {
  reqActivityDetail,
  reqReviewActivity,
  reqJoinActivity,
  reqActivityParticipants,
} from "../../api/activity";
import { reqSpotData } from "../../api/spot";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activityId: null,
    activity: null,
    likeCount: 0,
    reviews: [],
    loading: true,
    reviewLoading: false,
    showReviewInput: false,
    reviewContent: "",
    imageList: [],
    imageNum: [],
    reviewType: 2, // 2表示活动评论
    submitting: false,
    isLiked: false,
    currentUser: null,
    participants: [], // 参与者列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        activityId: parseInt(options.id),
        currentUser: app.globalData.user,
      });
      this.fetchLikeCount();
      this.fetchActivityDetail();
      this.fetchReviews();

      // 如果有showComment参数，自动打开评论框
      if (options.showComment) {
        this.setData({ showReviewInput: true });
      }
    } else {
      wx.showToast({
        title: "参数错误",
        icon: "error",
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /**
   * 打开评论输入框
   */
  openReviewInput() {
    this.setData({ showReviewInput: true });
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

  /**
   * 关闭评论输入框
   */
  onCloseReviewInput() {
    this.setData({ showReviewInput: false });
  },

  /**
   * 评论输入变化
   */
  onReviewInput(event) {
    this.setData({
      reviewContent: event.detail,
    });
  },

  /**
   * 上传图片后处理
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
   * 获取点赞数量
   */
  async fetchLikeCount() {
    try {
      const likeCount = await getLikeCount(this.data.activityId, 2);
      this.setData({
        likeCount: likeCount.data,
      });
      if (this.data.currentUser) {
        const isLiked = await confirm(
          this.data.activityId,
          2,
          this.data.currentUser.userId
        );
        this.setData({
          isLiked: isLiked.data,
        });
      } else {
        this.setData({
          isLiked: false,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  /**
   * 获取活动详情
   */
  async fetchActivityDetail() {
    try {
      this.setData({ loading: true });

      const result = await reqActivityDetail(this.data.activityId);

      // 处理活动数据
      const activity = result.data;

      // 获取钓点信息
      const spot = await reqSpotData(activity.spotId);
      activity.spot = spot.data;

      // 格式化时间
      if (activity.createdAt) {
        activity.formattedTime = formatTime(new Date(activity.createdAt));
      }

      // 格式化开始时间
      if (activity.startTime) {
        activity.formattedStartTime = formatTime(new Date(activity.startTime));
      }

      // 获取组织者信息
      const user = await reqUserData(activity.organizerId);
      activity.organizer = user.data;

      // 添加组织者头像
      activity.organizerAvatar = activity.organizer.avatarUrl
        ? reqImage(activity.organizer.avatarUrl)
        : "/assets/images/default_avatar.jpg";

      // 格式化组织者名称
      activity.organizerName =
        activity.organizer.nickname || `用户${activity.organizerId}`;

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

      // 获取参与者列表
      this.fetchParticipants();

      this.setData({
        activity,
        loading: false,
      });
    } catch (error) {
      console.error("获取活动详情失败", error);
      this.setData({ loading: false });
      wx.showToast({
        title: "获取活动详情失败",
        icon: "none",
      });
    }
  },

  /**
   * 获取评论列表
   */
  async fetchReviews() {
    try {
      this.setData({ reviewLoading: true });

      const result = await reqReviews(this.data.activityId, 2);

      // 格式化评论时间和用户信息
      const reviews = await Promise.all(
        result.data.map(async (review) => {
          // 获取评论用户
          const user = await reqUserData(review.userId);
          review.user = user.data;

          if (review.createdAt) {
            review.formattedTime = formatTime(new Date(review.createdAt));
          }

          // 处理图片数组
          if (review.images) {
            try {
              const imageIds = JSON.parse(review.images);
              review.imageUrls = imageIds.map((id) => reqImage(id));
            } catch (e) {
              console.error("解析图片数据失败", e);
              review.imageUrls = [];
            }
          } else {
            review.imageUrls = [];
          }

          // 添加用户头像
          review.userAvatar = review.user.avatarUrl
            ? reqImage(review.user.avatarUrl)
            : "/assets/images/default_avatar.jpg";

          // 格式化用户名称
          review.userName = review.user.nickname || `用户${review.userId}`;

          return review;
        })
      );

      this.setData({
        reviews,
        reviewLoading: false,
      });
    } catch (error) {
      console.error("获取评论失败", error);
      this.setData({ reviewLoading: false });
    }
  },

  /**
   * 获取活动参与者列表
   */
  async fetchParticipants() {
    try {
      const result = await reqActivityParticipants(this.data.activityId);

      // 处理参与者数据
      const participants = await Promise.all(
        result.data.map(async (participant) => {
          // 获取参与者用户信息
          const user = await reqUserData(participant.userId);
          participant.user = user.data;

          // 添加用户头像
          participant.userAvatar = participant.user.avatarUrl
            ? reqImage(participant.user.avatarUrl)
            : "/assets/images/default_avatar.jpg";

          // 格式化用户名称
          participant.userName =
            participant.user.nickname || `用户${participant.userId}`;

          // 格式化参加时间
          if (participant.joinTime) {
            participant.formattedJoinTime = formatTime(
              new Date(participant.joinTime)
            );
          }

          return participant;
        })
      );

      this.setData({ participants });
    } catch (error) {
      console.error("获取参与者列表失败", error);
    }
  },

  /**
   * 处理点赞
   */
  async handleLike() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    try {
      if (this.data.isLiked) {
        // 取消点赞
        await deleteLike(this.data.activityId, 2, this.data.currentUser.userId);
        this.setData({
          isLiked: false,
          likeCount: Math.max(0, this.data.likeCount - 1),
        });
      } else {
        // 添加点赞
        await addLike(this.data.activityId, 2, this.data.currentUser.userId);
        this.setData({
          isLiked: true,
          likeCount: this.data.likeCount + 1,
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
   * 提交评论
   */
  async submitReview() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    const { reviewContent } = this.data;

    if (!reviewContent.trim()) {
      wx.showToast({
        title: "评论内容不能为空",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 调用评论API
      await review(
        this.data.activityId,
        2,
        this.data.currentUser.userId,
        reviewContent,
        this.data.imageNum
      );

      this.setData({
        reviewContent: "",
        imageList: [],
        imageNum: [],
        showReviewInput: false,
        submitting: false,
      });

      wx.showToast({
        title: "评论成功",
        icon: "success",
      });

      // 重新获取评论列表
      this.fetchReviews();
    } catch (error) {
      console.error("评论失败", error);
      this.setData({ submitting: false });
      wx.showToast({
        title: "评论失败，请重试",
        icon: "none",
      });
    }
  },

  /**
   * 预览活动图片
   */
  previewImage(e) {
    const { current } = e.currentTarget.dataset;
    const urls = this.data.activity.imageUrls;

    wx.previewImage({
      current,
      urls,
    });
  },

  /**
   * 预览评论图片
   */
  previewReviewImage(e) {
    const { current, urls } = e.currentTarget.dataset;

    wx.previewImage({
      current,
      urls,
    });
  },

  /**
   * 参加活动
   */
  joinActivity() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    wx.showModal({
      title: "确认参加",
      content: `确定要参加「${this.data.activity.title}」活动吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            // 检查用户是否已经参加
            const isJoined = this.data.participants.some(
              (p) => p.userId === this.data.currentUser.userId
            );

            if (isJoined) {
              wx.showToast({
                title: "您已经参加了该活动",
                icon: "none",
              });
              return;
            }

            // 调用参加活动API
            await reqJoinActivity(
              this.data.activityId,
              this.data.currentUser.userId
            );

            // 重新获取参与者列表
            this.fetchParticipants();

            wx.showToast({
              title: "参加成功",
              icon: "success",
            });
          } catch (error) {
            console.error("参加活动失败", error);
            wx.showToast({
              title: "参加失败，请重试",
              icon: "none",
            });
          }
        }
      },
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { activity } = this.data;

    return {
      title: activity.title,
      path: `/pages/activity-detail/activity-detail?id=${activity.activityId}`,
      imageUrl:
        activity.imageUrls && activity.imageUrls.length > 0
          ? activity.imageUrls[0]
          : "",
    };
  },
});

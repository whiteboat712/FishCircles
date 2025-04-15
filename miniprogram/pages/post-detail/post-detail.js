// pages/post-detail/post-detail.js
import Toast from "@vant/weapp/toast/toast";
import { reqPostDetail } from "../../api/post";
import { reqUserData } from "../../api/profile";
import { reqImage, uploadFile } from "../../api/index";
import { getLikeCount, addLike, deleteLike, confirm } from "../../api/like";
import { reqReviews, review } from "../../api/review";
import { formatTime } from "../../utils/formatTime";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    postId: null,
    post: null,
    likeCount: 0,
    reviews: [],
    loading: true,
    reviewLoading: false,
    showReviewInput: false,
    reviewContent: "",
    imageList: [],
    imageNum: [],
    reviewType: 1,
    reviewId: 0,
    submitting: false,
    isLiked: false,
    currentUser: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        postId: parseInt(options.id),
        reviewId: parseInt(options.id),
        currentUser: app.globalData.user,
      });
      this.fetchLikeCount();
      this.fetchPostDetail();
      this.fetchReviews();
      if (options.showReviewInput) {
        this.setData({
          showReviewInput: true,
        });
      }
    } else {
      Toast.fail({
        message: "参数错误",
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },
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

  onCloseReviewInput() {
    this.setData({ showReviewInput: false });
  },
  async fetchLikeCount() {
    try {
      const likeCount = await getLikeCount(this.data.postId, 1);
      this.setData({
        likeCount: likeCount.data,
      });
      if (this.data.currentUser) {
        const isLiked = await confirm(
          this.data.postId,
          1,
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
   * 获取动态详情
   */
  async fetchPostDetail() {
    try {
      this.setData({ loading: true });
      const result = await reqPostDetail(this.data.postId);

      // 格式化时间
      const post = result.data;
      if (post.createdAt) {
        post.formattedTime = formatTime(new Date(post.createdAt));
      }

      // 获取动态用户
      const user = await reqUserData(post.userId);
      post.user = user.data;

      // 添加用户头像
      // 这里使用默认头像，实际项目中应该从用户数据中获取
      post.userAvatar = post.user.avatarUrl
        ? reqImage(post.user.avatarUrl)
        : "/assets/images/default_avatar.jpg";

      // 格式化用户名称
      post.userName = post.user.nickname || `用户${post.userId}`;

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

      this.setData({
        post,
        loading: false,
      });
    } catch (error) {
      console.error("获取动态详情失败", error);
      this.setData({ loading: false });
      Toast.fail({
        message: "获取动态详情失败",
      });
    }
  },

  /**
   * 获取评论列表
   */
  async fetchReviews() {
    try {
      this.setData({ reviewLoading: true });
      const result = await reqReviews(this.data.postId, 1);

      // 格式化评论时间
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
          review.nickname = review.user.nickname || `用户${post.userId}`;
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
   * 处理点赞/取消点赞
   */
  async handleLike() {
    if (!this.data.currentUser.userId) {
      Toast.fail({
        message: "请先登录",
      });
      return;
    }

    try {
      if (this.data.isLiked) {
        // 取消点赞
        await deleteLike(this.data.postId, 1, this.data.currentUser.userId);
        this.setData({
          isLiked: false,
          likeCount: (this.data.likeCount || 0) - 1,
        });
      } else {
        // 点赞
        await addLike(this.data.postId, 1, this.data.currentUser.userId);
        this.setData({
          isLiked: true,
          likeCount: (this.data.likeCount || 0) + 1,
        });
      }
    } catch (error) {
      console.error("点赞操作失败", error);
      Toast.fail({
        message: "操作失败，请重试",
      });
    }
  },

  /**
   * 输入评论内容
   */
  onReviewInput(e) {
    this.setData({
      reviewContent: e.detail,
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
   * 提交评论
   */
  async submitReview() {
    if (!this.data.currentUser) {
      Toast.fail({
        message: "请先登录",
      });
      return;
    }

    const { reviewContent } = this.data;

    if (!reviewContent.trim()) {
      Toast.fail({
        message: "评论内容不能为空",
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 调用评论API
      await review(
        this.data.postId,
        1,
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
      Toast.success({
        message: "评论成功",
      });

      // 重新获取评论列表
      this.fetchReviews();
    } catch (error) {
      console.error("评论失败", error);
      this.setData({ submitting: false });
      Toast.fail({
        message: "评论失败，请重试",
      });
    }
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { current } = e.currentTarget.dataset;
    const urls = this.data.post.imageUrls;

    wx.previewImage({
      current,
      urls,
    });
  },

  /**
   * 分享动态
   */
  onShareAppMessage() {
    return {
      title: this.data.post
        ? this.data.post.content.substring(0, 20) + "..."
        : "渔友圈动态",
      path: `/pages/post-detail/post-detail?id=${this.data.postId}`,
      imageUrl:
        this.data.post && this.data.post.imageUrls.length > 0
          ? this.data.post.imageUrls[0]
          : "",
    };
  },
});

// pages/spot-detail/spot-detail.js
import { reqAllSpots } from "../../api/spot";
import { getLikeCount, addLike, deleteLike, confirm } from "../../api/like";
import { reqUserData } from "../../api/profile";
import { reqImage, uploadFile } from "../../api/index";
import { formatTime } from "../../utils/formatTime";
import { reqReviews, review } from "../../api/review";
import { getSpeciesBySpot } from "../../api/species";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    spotId: null,
    spot: null,
    likeCount: 0,
    reviews: [],
    loading: true,
    reviewLoading: false,
    showReviewInput: false,
    reviewContent: "",
    imageList: [],
    imageNum: [],
    reviewType: 3, // 3表示钓点评论
    submitting: false,
    isLiked: false,
    currentUser: null,
    fishSpecies: [],
    speciesLoading: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.spotId) {
      this.setData({
        spotId: parseInt(options.spotId),
        currentUser: app.globalData.user,
      });
      this.fetchLikeCount();
      this.fetchSpotDetail();
      this.fetchReviews();
      this.fetchFishSpecies();

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
      const likeCount = await getLikeCount(this.data.spotId, 3);
      this.setData({
        likeCount: likeCount.data,
      });
      if (this.data.currentUser) {
        const isLiked = await confirm(
          this.data.spotId,
          3,
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
   * 获取钓点详情
   */
  async fetchSpotDetail() {
    try {
      this.setData({ loading: true });

      // 获取所有钓点，然后筛选出当前钓点
      const result = await reqAllSpots();
      const spot = result.data.find((item) => item.spotId === this.data.spotId);

      if (!spot) {
        throw new Error("钓点不存在");
      }

      // 格式化时间
      if (spot.createdAt) {
        spot.formattedTime = formatTime(new Date(spot.createdAt));
      }

      // 获取创建者信息
      if (spot.creatorId) {
        const user = await reqUserData(spot.creatorId);
        spot.creator = user.data;

        // 添加创建者头像
        spot.creatorAvatar = spot.creator.avatarUrl
          ? reqImage(spot.creator.avatarUrl)
          : "/assets/images/default_avatar.jpg";

        // 格式化创建者名称
        spot.creatorName = spot.creator.nickname || `用户${spot.creatorId}`;
      }

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

      this.setData({
        spot,
        loading: false,
      });
    } catch (error) {
      console.error("获取钓点详情失败", error);
      this.setData({ loading: false });
      wx.showToast({
        title: "获取钓点详情失败",
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

      const result = await reqReviews(this.data.spotId, 3); // 3表示钓点评论

      // 处理评论数据
      const reviews = await Promise.all(
        result.data.map(async (item) => {
          // 格式化时间
          if (item.createdAt) {
            item.formattedTime = formatTime(new Date(item.createdAt));
          }

          // 获取用户信息
          const user = await reqUserData(item.userId);
          item.user = user.data;

          // 添加用户头像
          item.userAvatar = item.user.avatarUrl
            ? reqImage(item.user.avatarUrl)
            : "/assets/images/default_avatar.jpg";

          // 格式化用户名称
          item.userName = item.user.nickname || `用户${item.userId}`;

          // 处理图片数组
          if (item.images) {
            try {
              const imageIds = JSON.parse(item.images);
              item.imageUrls = imageIds.map((id) => reqImage(id));
            } catch (e) {
              console.error("解析图片数据失败", e);
              item.imageUrls = [];
            }
          } else {
            item.imageUrls = [];
          }

          return item;
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

    if (!this.data.reviewContent.trim()) {
      wx.showToast({
        title: "评论内容不能为空",
        icon: "none",
      });
      return;
    }

    try {
      this.setData({ submitting: true });

      await review(
        this.data.spotId,
        3,
        this.data.currentUser.userId,
        this.data.reviewContent,
        this.data.imageNum
      );

      // 清空评论内容和图片
      this.setData({
        reviewContent: "",
        imageList: [],
        imageNum: [],
        showReviewInput: false,
        submitting: false,
      });

      // 重新获取评论列表
      this.fetchReviews();

      wx.showToast({
        title: "评论成功",
        icon: "success",
      });
    } catch (error) {
      console.error("评论失败", error);
      this.setData({ submitting: false });
      wx.showToast({
        title: "评论失败",
        icon: "none",
      });
    }
  },

  /**
   * 删除上传的图片
   */
  deleteImage(event) {
    const { index } = event.detail;
    const { imageList, imageNum } = this.data;
    imageList.splice(index, 1);
    imageNum.splice(index, 1);
    this.setData({ imageList, imageNum });
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const current = e.currentTarget.dataset.current;
    const urls = this.data.spot.imageUrls;

    wx.previewImage({
      current,
      urls,
    });
  },

  /**
   * 预览评论图片
   */
  previewReviewImage(e) {
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls;

    wx.previewImage({
      current,
      urls,
    });
  },

  /**
   * 处理点赞/取消点赞
   */
  async handleLike() {
    if (!this.data.currentUser) {
      wx.navigateTo({
        url: "/pages/login/login",
      });
      return;
    }

    try {
      if (this.data.isLiked) {
        // 取消点赞
        await deleteLike(this.data.spotId, 3, this.data.currentUser.userId);
        this.setData({
          isLiked: false,
          likeCount: Math.max(0, this.data.likeCount - 1),
        });
      } else {
        // 点赞
        await addLike(this.data.spotId, 3, this.data.currentUser.userId);
        this.setData({
          isLiked: true,
          likeCount: this.data.likeCount + 1,
        });
      }
    } catch (error) {
      console.error("点赞操作失败", error);
      wx.showToast({
        title: "操作失败",
        icon: "none",
      });
    }
  },

  /**
   * 打开地图导航
   */
  openLocation() {
    const { spot } = this.data;
    if (spot && spot.latitude && spot.longitude) {
      wx.openLocation({
        latitude: parseFloat(spot.latitude),
        longitude: parseFloat(spot.longitude),
        name: spot.name,
        address: spot.address || "",
      });
    } else {
      wx.showToast({
        title: "位置信息不完整",
        icon: "none",
      });
    }
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
  onPullDownRefresh() {
    this.fetchSpotDetail();
    this.fetchReviews();
    this.fetchLikeCount();
    this.fetchFishSpecies();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { spot } = this.data;
    return {
      title: spot ? `${spot.name} - 钓点详情` : "钓点详情",
      path: `/pages/spot-detail/spot-detail?spotId=${this.data.spotId}`,
    };
  },

  /**
   * 获取钓点鱼类信息
   */
  async fetchFishSpecies() {
    try {
      this.setData({ speciesLoading: true });

      const result = await getSpeciesBySpot(this.data.spotId);

      // 处理鱼类数据
      const fishSpecies = result.data.map((species) => {
        // 添加鱼类图片
        if (species.imageId) {
          species.imageUrl = reqImage(species.imageId);
        } else {
          species.imageUrl = "/assets/images/default_fish.jpg";
        }

        return species;
      });

      this.setData({
        fishSpecies,
        speciesLoading: false,
      });
    } catch (error) {
      console.error("获取钓点鱼类信息失败", error);
      this.setData({ speciesLoading: false });
    }
  },
});

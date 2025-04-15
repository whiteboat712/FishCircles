import { reqAllSpots } from "../../api/spot";
import { reqImage } from "../../api/index";
// pages/spots-list/spots-list.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    fishingSpots: [],
    loading: true,
    refreshing: false,
    hasMore: true,
    keyword: "",
    activeFilter: "all",
    page: 1,
    pageSize: 10,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 创建动画实例
    this.animation = wx.createAnimation({
      duration: 500,
      timingFunction: "ease",
    });

    // 加载钓点数据
    this.loadFishingSpots();
  },

  /**
   * 加载钓点数据
   */
  async loadFishingSpots() {
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
   * 根据条件筛选钓点
   */
  filterSpotsByCondition(spots) {
    let filteredSpots = [...spots];

    // 根据关键词筛选
    if (this.data.keyword) {
      filteredSpots = filteredSpots.filter(
        (spot) =>
          spot.name.includes(this.data.keyword) ||
          spot.description.includes(this.data.keyword)
      );
    }

    // 根据筛选类型过滤
    switch (this.data.activeFilter) {
      case "nearby":
        filteredSpots = filteredSpots.filter((spot) => spot.distance < 5);
        break;
      case "popular":
        filteredSpots = filteredSpots.filter((spot) => spot.rating >= 4.5);
        break;
      case "free":
        filteredSpots = filteredSpots.filter((spot) => spot.price === "免费");
        break;
      default:
        // 全部，不需要额外筛选
        break;
    }

    return filteredSpots;
  },

  /**
   * 搜索输入事件
   */
  onSearchInput(e) {
    this.setData({
      keyword: e.detail,
      page: 1, // 重置页码
    });

    // 防抖处理，500ms后执行搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.loadFishingSpots();
    }, 500);
  },

  /**
   * 标签页切换事件
   */
  onTabChange(e) {
    const type = e.detail.name;

    this.setData({
      activeFilter: type,
      page: 1, // 重置页码
    });

    // 重新加载数据
    this.loadFishingSpots();
  },

  /**
   * 搜索事件
   */
  onSearch(e) {
    this.setData({
      keyword: e.detail,
      page: 1, // 重置页码
    });

    this.loadFishingSpots();
  },

  /**
   * 清空搜索事件
   */
  onClear() {
    this.setData({
      keyword: "",
      page: 1, // 重置页码
    });

    this.loadFishingSpots();
  },

  /**
   * 下拉刷新事件
   */
  onRefresh() {
    this.setData({
      refreshing: true,
      page: 1, // 重置页码
    });

    this.loadFishingSpots();
  },

  /**
   * 加载更多事件
   */
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1,
      });

      this.loadFishingSpots();
    }
  },

  /**
   * 查看钓点详情
   */
  viewSpotDetail(e) {
    const spotId = e.currentTarget.dataset.id;

    // 添加点击动画效果
    const index = this.data.fishingSpots.findIndex(
      (item) => item.spotId === spotId
    );
    console.log(index);
    if (index !== -1) {
      const animation = wx.createAnimation({
        duration: 200,
        timingFunction: "ease",
      });
      animation.scale(0.95).step().scale(1).step();

      const key = `fishingSpots[${index}].scaleAnimation`;
      this.setData({
        [key]: animation.export(),
      });
    }

    // 延迟跳转，让动画效果完成
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/spot-detail/spot-detail?spotId=${spotId}`,
      });
    }, 200);
  },

  /**
   * 添加新钓点
   */
  goToAdd() {
    // 添加按钮动画效果
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: "ease",
    });
    animation.scale(0.9).step().scale(1).step();

    this.setData({
      buttonAnimation: animation.export(),
    });

    // 延迟跳转，让动画效果完成
    setTimeout(() => {
      wx.navigateTo({
        url: "/pages/spot-add/spot-add",
      });
    }, 200);
  },

  goToSearch() {
    console.log("启动搜索页");
    wx.navigateTo({
      url: "/pages/search/search",
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
  onPullDownRefresh() {
    this.onRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.onLoadMore();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},
});

// pages/spots/spots.js
import { reqAllSpots } from "../../api/spot";
import { reqImage } from "../../api/index";
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    latitude: 23.099994,
    longitude: 113.32452,
    markers: [],
    fishingSpots: [],
    loading: true,
    distanceRange: [5, 10, 15, 20],
    filterOptions: {
      distance: 10, // 默认10公里范围
      keyword: "", // 默认无关键词
    },
    showSpotPopup: false,
    currentSpot: null,
  },

  onLoad: function (options) {
    // 获取用户位置信息
    this.getUserLocation();
    // 获取钓点数据
    this.reLoad();
  },

  // 获取用户位置
  getUserLocation: function () {
    const that = this;
    wx.getLocation({
      type: "gcj02",
      success: function (res) {
        that.setData({
          latitude: res.latitude,
          longitude: res.longitude,
        });
      },
      fail: function () {
        wx.showToast({
          title: "请授权位置信息",
          icon: "none",
        });
      },
    });
  },

  reLoad() {
    // 每次显示页面时刷新钓点列表，以获取最新数据
    this.setData({
      currentUser: app.globalData.user,
    });
    this.getUserLocation();
    this.fetchSpots();
  },

  // 加载钓点数据
  async fetchSpots() {
    try {
      this.setData({ loading: true });
      const res = await reqAllSpots();

      // 处理钓点数据
      const fishingSpots = await Promise.all(
        res.data.map(async (spot) => {
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

          // 计算与用户当前位置的距离
          if (spot.latitude && spot.longitude) {
            spot.distance = this.calculateDistance(
              this.data.latitude,
              this.data.longitude,
              spot.latitude,
              spot.longitude
            );
          }

          return spot;
        })
      );

      // 转换为地图标记点
      const markers = fishingSpots.map((spot) => ({
        id: spot.spotId,
        latitude: spot.latitude,
        longitude: spot.longitude,
        callout: {
          content: spot.name,
          fontSize: 14,
          borderRadius: 5,
          padding: 3,
          display: "ALWAYS",
        },
        iconPath: "../../assets/icons/标点.png",
        width: 40,
        height: 40,
      }));

      this.setData({
        fishingSpots,
        markers,
        loading: false,
      });
    } catch (e) {
      console.log(e);
    }
  },

  // 筛选标点
  filterSpots(e) {
    const filterOptions = this.data.filterOptions;
    filterOptions.distance = this.data.distanceRange[e.detail.value];

    // 将 markers 转换为 points 数组（提取经纬度）
    const points = this.data.markers
      .map((marker) => ({
        latitude: marker.latitude,
        longitude: marker.longitude,
      }))
      .filter((point) => {
        const distance = this.calculateDistance(
          this.data.latitude,
          this.data.longitude,
          point.latitude,
          point.longitude
        );
        return distance <= filterOptions.distance;
      });

    this.mapCtx.includePoints({
      padding: [60, 60, 60, 60],
      points: points,
    });

    this.setData({
      filterOptions,
    });
  },

  // 显示钓点详情弹窗
  showSpotDetail(e) {
    const markerId = e.markerId;
    // 根据markerId查找对应的钓点信息
    const spot = this.data.fishingSpots.find(
      (item) => item.spotId === markerId
    );

    if (spot) {
      // 设置当前选中的钓点并显示弹窗
      this.setData({
        currentSpot: spot,
        showSpotPopup: true,
      });

      // 将地图中心移动到选中的标记点位置
      this.mapCtx.moveToLocation({
        latitude: spot.latitude,
        longitude: spot.longitude,
      });
    }
  },

  // 关闭钓点详情弹窗
  closeSpotPopup() {
    this.setData({
      showSpotPopup: false,
    });
  },

  // 跳转到钓点详情页
  goToSpotDetail(e) {
    const spotId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/spot-detail/spot-detail?spotId=${spotId}`,
    });
  },

  // 计算距离
  calculateDistance(lat1, lon1, lat2, lon2) {
    // 将经纬度转换为弧度
    const toRadians = (degree) => (degree * Math.PI) / 180;
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    // Haversine 公式
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // 地球平均半径（单位：千米）
    const R = 6371;
    const distance = R * c;

    return Number(distance.toFixed(2)); // 保留两位小数
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    this.mapCtx = wx.createMapContext("map");
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.reLoad();
  },

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

  goToSpotsList() {
    wx.navigateTo({
      url: "/pages/spots-list/spots-list",
    });
  },

  goToSpotAdd() {
    wx.navigateTo({
      url: "/pages/spot-add/spot-add",
    });
  },
});

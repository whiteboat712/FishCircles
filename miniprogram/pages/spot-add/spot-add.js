// pages/spot-add/spot-add.js
import Toast from "@vant/weapp/toast/toast";
import { reqAddSpot } from "../../api/spot";
import { reqImage, uploadFile } from "../../api/index";
import { getAllSpecies, addSpeciesToSpot } from "../../api/species";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    name: "",
    description: "",
    priceType: "FREE", // FREE 或 PAID
    price: "0",
    imageList: [],
    imageNum: [],
    latitude: null,
    longitude: null,
    locationName: "",
    submitting: false,
    currentUser: null,
    // 地图选点相关
    showMapPopup: false,
    // 鱼类选择相关
    fishSpecies: [],
    selectedSpecies: [],
    showSpeciesPopup: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      currentUser: app.globalData.user || {},
    });

    // 检查用户是否已登录
    if (!this.data.currentUser.userId) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 加载鱼类数据
    this.loadFishSpecies();
  },

  /**
   * 加载所有鱼类数据
   */
  async loadFishSpecies() {
    try {
      const res = await getAllSpecies();

      if (res && res.data) {
        const fishData = res.data.map((item) => {
          return {
            ...item,
            selected: false,
          };
        });
        this.setData({
          fishSpecies: fishData,
        });
      }
    } catch (error) {
      console.error("获取鱼类数据失败", error);
      Toast.fail({
        message: "获取鱼类数据失败",
      });
    }
  },

  /**
   * 钓点名称变化
   */
  onNameChange(e) {
    this.setData({
      name: e.detail,
    });
  },

  /**
   * 钓点描述变化
   */
  onDescriptionChange(e) {
    this.setData({
      description: e.detail,
    });
  },

  /**
   * 价格类型变化
   */
  onPriceTypeChange(e) {
    this.setData({
      priceType: e.detail,
    });

    // 如果切换到免费，清空价格
    if (e.detail === "FREE") {
      this.setData({
        price: "0",
      });
    }
  },

  /**
   * 价格变化
   */
  onPriceChange(e) {
    this.setData({
      price: e.detail,
    });
  },

  /**
   * 获取当前位置
   */
  getLocation() {
    Toast.loading({
      duration: 0,
      message: "获取位置中...",
    });

    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({ latitude, longitude });
        Toast.clear();
      },
      fail: (err) => {
        console.error("获取位置失败", err);
        Toast.clear();
        Toast.fail({
          duration: 2000,
          message: "获取位置失败",
        });
      },
    });
  },

  /**
   * 打开地图选点弹窗
   */
  openMapSelector() {
    this.getLocation();
    this.setData({
      showMapPopup: true,
    });
  },

  /**
   * 关闭地图选点弹窗
   */
  closeMapSelector() {
    this.setData({
      showMapPopup: false,
    });
  },

  /**
   * 地图点击事件，获取经纬度
   */
  onMapTap(e) {
    const { latitude, longitude } = e.detail;
    this.setData({
      latitude,
      longitude,
    });
    Toast.success({
      message: "已选择位置",
    });
  },

  /**
   * 确认地图选点
   */
  confirmMapLocation() {
    if (!this.data.latitude || !this.data.longitude) {
      Toast.fail({
        message: "请先在地图上选择位置",
      });
      return;
    }
    this.closeMapSelector();
  },

  /**
   * 打开鱼类选择弹窗
   */
  openSpeciesSelector() {
    this.setData({
      showSpeciesPopup: true,
    });
  },

  /**
   * 关闭鱼类选择弹窗
   */
  closeSpeciesSelector() {
    this.setData({
      showSpeciesPopup: false,
    });
  },

  /**
   * 选择/取消选择鱼类
   */
  toggleSpecies(e) {
    const speciesId = e.currentTarget.dataset.id;
    const { selectedSpecies, fishSpecies } = this.data;

    const index = selectedSpecies.findIndex((id) => id === speciesId);
    const fishIndex = fishSpecies.findIndex(
      (item) => item.fishId === speciesId
    );

    if (index > -1) {
      // 已选中，取消选择
      selectedSpecies.splice(index, 1);
      if (fishIndex > -1) {
        fishSpecies[fishIndex].selected = false;
      }
    } else {
      // 未选中，添加选择
      selectedSpecies.push(speciesId);
      if (fishIndex > -1) {
        fishSpecies[fishIndex].selected = true;
      }
    }

    this.setData({
      selectedSpecies,
      fishSpecies,
    });
  },

  /**
   * 上传图片
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
   * 删除图片
   */
  onDelete(e) {
    const { index } = e.detail;
    const { imageList } = this.data;
    const { imageNum } = this.data;

    imageList.splice(index, 1);
    imageNum.splice(index, 1);
    this.setData({ imageList, imageNum });
  },

  /**
   * 提交钓点
   */
  async submitSpot() {
    // 检查用户是否已登录
    if (!this.data.currentUser) {
      Toast.fail({
        message: "请先登录",
      });
      return;
    }

    // 检查必填字段
    if (!this.data.name.trim()) {
      Toast.fail({
        message: "请输入钓点名称",
      });
      return;
    }

    if (!this.data.latitude) {
      Toast.fail({
        message: "请设置钓点位置",
      });
      return;
    }

    // 检查价格
    if (this.data.priceType === "PAID" && !this.data.price) {
      Toast.fail({
        message: "请输入收费金额",
      });
      return;
    }

    // 检查图片是否全部上传完成
    const { imageList } = this.data;

    try {
      this.setData({ submitting: true });

      // 准备图片ID数组
      const imageIds = imageList.map((img) => img.imageId);

      // 准备提交数据
      const result = await reqAddSpot(
        this.data.name,
        this.data.description,
        this.data.imageNum,
        this.data.latitude,
        this.data.longitude,
        this.data.price,
        this.data.currentUser.userId
      );

      // 如果有选择鱼类，添加鱼类关联
      if (this.data.selectedSpecies.length > 0 && result && result.data) {
        const spotId = result.data.spotId;
        // 为每个选中的鱼类添加关联
        for (const speciesId of this.data.selectedSpecies) {
          try {
            await addSpeciesToSpot(spotId, speciesId);
          } catch (error) {
            console.error("添加鱼类关联失败", error);
          }
        }
      }

      Toast.success({
        message: "发布成功",
      });

      // 返回上一页并刷新钓点列表
      setTimeout(() => {
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];

        // 如果上一页是钓点列表页，刷新列表
        if (prevPage && prevPage.route === "pages/spots-list/spots-list") {
          prevPage.loadFishingSpots();
        }

        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error("提交钓点失败", error);
      this.setData({ submitting: false });
      wx.showToast({
        title: "提交失败，请重试",
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

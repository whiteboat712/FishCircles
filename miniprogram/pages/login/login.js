// pages/login/login.js
import Toast from "@vant/weapp/toast/toast";
import { login, register } from "../../api/profile";
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    // 登录表单数据
    username: "",
    password: "",
    // 注册表单数据
    registerUsername: "",
    registerPassword: "",
    confirmPassword: "",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 如果有redirect参数，保存起来用于登录成功后跳转
    if (options.redirect) {
      this.setData({
        redirect: decodeURIComponent(options.redirect),
      });
    }
  },

  /**
   * Tab切换事件
   */
  onTabChange(event) {
    this.setData({
      activeTab: event.detail.index,
    });
  },

  /**
   * 微信一键登录
   */
  wechatLogin() {
    wx.showLoading({
      title: "登录中...",
    });

    // 获取用户信息
    wx.getUserProfile({
      desc: "用于完善用户资料",
      success: (res) => {
        console.log("getUserProfile success:", res);

        // 获取登录凭证code
        wx.login({
          success: (loginRes) => {
            console.log("wx.login success:", loginRes);

            // 调用后端接口，用code换取openid和session_key
            // 这里模拟登录成功
            setTimeout(() => {
              wx.hideLoading();

              // 保存用户信息
              this.saveUserInfo({
                id: "wx_" + new Date().getTime(),
                username: res.userInfo.nickName,
                avatar: res.userInfo.avatarUrl,
                isWxUser: true,
              });

              wx.showToast({
                title: "登录成功",
                icon: "success",
              });
            }, 1500);
          },
          fail: (err) => {
            console.error("wx.login fail:", err);
            wx.hideLoading();
            wx.showToast({
              title: "登录失败",
              icon: "error",
            });
          },
        });
      },
      fail: (err) => {
        console.log("getUserProfile fail:", err);
        wx.hideLoading();
        wx.showToast({
          title: "已取消",
          icon: "none",
        });
      },
    });
  },

  /**
   * 账号密码登录
   */
  async accountLogin() {
    const { username, password } = this.data;

    // 表单验证
    if (!username || !password) {
      Toast.fail({
        duration: 1000,
        message: "请填写完整",
      });
      return;
    }

    Toast.loading({
      duration: 0,
    });

    // 调用登录接口
    try {
      const user = await login(username, password);
      console.log(`用户${user.data.nickname}登录成功`);
      console.log(user.data);
      app.globalData.user = user.data;
      wx.switchTab({
        url: "/pages/profile/profile",
      });
    } catch (error) {
      console.log(error);
    }
    Toast.clear();
    // 保存用户信息
    this.saveUserInfo({
      id: "account_" + new Date().getTime(),
      username: username,
      isWxUser: false,
    });

    Toast.success("登录成功");
  },
  /**
   * 注册账号
   */
  async register() {
    const { registerUsername, registerPassword, confirmPassword } = this.data;

    // 表单验证
    if (!registerUsername || !registerPassword || !confirmPassword) {
      Toast.fail({
        duration: 1000,
        message: "请填写完整",
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      Toast.fail({
        duration: 1000,
        message: "密码不一致",
      });
      return;
    }
    Toast.loading({
      duration: 0,
    });

    // 调用注册接口
    const res = await register(registerUsername, registerPassword);

    if (res.code === 200) {
      Toast.clear();

      Toast.success("注册成功");

      // 注册成功后切换到登录tab
      this.setData({
        activeTab: 1,
        username: registerUsername,
        password: registerPassword,
      });
    } else {
      Toast.clear();
      Toast.fail(res.message);
    }

    Toast.clear();
  },

  /**
   * 保存用户信息并跳转
   */
  saveUserInfo(userInfo) {
    // 保存用户信息到全局
    if (app.globalData) {
      app.globalData.userInfo = userInfo;
    }

    // 延迟跳转，让用户看到登录成功的提示
    setTimeout(() => {
      // 如果有重定向地址，则跳转到指定页面
      if (this.data.redirect) {
        wx.redirectTo({
          url: this.data.redirect,
        });
      } else {
        // 否则跳转到首页
        wx.switchTab({
          url: "/pages/index/index",
        });
      }
    }, 1500);
  },

  /**
   * 忘记密码
   */
  forgotPassword() {
    Toast.fail("请联系管理员重置密码");
  },

  /**
   * 查看用户协议
   */
  viewUserAgreement() {
    wx.showModal({
      title: "用户协议",
      content:
        "感谢您使用钓鱼圈！本协议是您与钓鱼圈关于使用本软件所订立的契约。使用本软件表示您已阅读并同意本协议的全部条款。",
      showCancel: false,
      confirmText: "我知道了",
    });
  },

  /**
   * 查看隐私政策
   */
  viewPrivacyPolicy() {
    wx.showModal({
      title: "隐私政策",
      content:
        "本应用尊重并保护所有使用服务用户的个人隐私权。为了给您提供更准确、更有个性化的服务，本应用会按照本隐私权政策的规定使用和披露您的个人信息。",
      showCancel: false,
      confirmText: "我知道了",
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

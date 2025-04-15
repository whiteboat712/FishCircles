// pages/messages/messages.js
import { reqUserMessages } from "../../api/message";
import { reqUserData } from "../../api/profile";
import { reqImage } from "../../api/index";
import { getLikeByUser } from "../../api/like";
import { getReviewsByUser, reqReviews } from "../../api/review";
import { reqPostDetail } from "../../api/post";
import { reqSpotData } from "../../api/spot";
import { reqActivityDetail } from "../../api/activity";

const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeType: "likes",
    loading: true,
    likeMessages: [], // 点赞消息列表
    reviewMessages: [], // 评论消息列表
    chatMessages: [], // 私信消息列表
    currentUser: null,
    // 轮询相关
    pollingTimer: null,
    pollingInterval: 10000, // 轮询间隔，单位毫秒
    lastUpdateTime: null, // 最后更新时间
    contactsMap: {}, // 联系人信息缓存
    // 弹出层相关
    showPopup: false, // 是否显示弹出层
    popupType: "likes", // 弹出层类型：likes 或 reviews
    currentPopupMessages: [], // 当前弹出层显示的消息列表
    // 引用消息相关
    quotedMessages: {}, // 存储被引用的消息内容
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      currentUser: app.globalData.user,
    });

    // 如果有指定消息类型参数，则切换到对应类型
    if (options.type) {
      this.setData({
        activeType: options.type,
      });
    }

    this.fetchMessages();

    // 开始轮询获取新消息
    this.startPolling();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.setData({
      currentUser: app.globalData.user,
    });
    // 每次显示页面时刷新消息列表
    this.fetchMessages();

    // 确保轮询已启动
    this.startPolling();
  },

  /**
   * 切换消息类型
   */
  switchType(e) {
    const type = e.currentTarget.dataset.type;

    // 打开对应类型的弹出层
    this.openPopup(type);
  },

  /**
   * 打开消息弹出层
   */
  openPopup(type) {
    let currentPopupMessages = [];

    if (type === "likes") {
      currentPopupMessages = this.data.likeMessages;
    } else if (type === "reviews") {
      currentPopupMessages = this.data.reviewMessages;
    }

    this.setData({
      showPopup: true,
      popupType: type,
      currentPopupMessages,
    });
  },

  /**
   * 关闭消息弹出层
   */
  closePopup() {
    this.setData({
      showPopup: false,
    });
  },

  /**
   * 获取消息数据
   */
  async fetchMessages() {
    if (!this.data.currentUser || !this.data.currentUser.userId) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 获取用户所有私信消息
      const res = await reqUserMessages(this.data.currentUser.userId);

      if (res && res.code === 200 && res.data) {
        // 处理私信消息
        await this.processChatMessages(res.data);
      }

      // 获取点赞消息
      await this.fetchLikeMessages();

      // 获取评论消息
      await this.fetchreviewMessages();

      // 更新最后更新时间
      this.setData({
        lastUpdateTime: Date.now(),
        loading: false,
      });
    } catch (error) {
      console.error("获取消息失败", error);
      this.setData({ loading: false });
      wx.showToast({
        title: "获取消息失败",
        icon: "none",
      });
    }
  },

  /**
   * 处理私信消息，按联系人分组
   */
  async processChatMessages(messages) {
    if (!messages || messages.length === 0) {
      this.setData({ chatMessages: [] });
      return;
    }

    // 按联系人分组消息
    const messagesByContact = {};
    const currentUserId = this.data.currentUser.userId;

    // 遍历所有消息，按联系人分组
    messages.forEach((msg) => {
      // 确定联系人ID（如果当前用户是发送者，则联系人是接收者；反之亦然）
      const contactId =
        msg.senderId === currentUserId ? msg.receiverId : msg.senderId;

      if (!messagesByContact[contactId]) {
        messagesByContact[contactId] = [];
      }

      messagesByContact[contactId].push({
        messageId: msg.messageId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        isRead: msg.isRead,
        sentAt: msg.sentAt,
      });
    });

    // 处理每个联系人的最新消息
    const chatMessages = [];
    const contactsToFetch = [];

    for (const contactId in messagesByContact) {
      // 按时间排序消息（最新的在最后）
      const contactMessages = messagesByContact[contactId].sort((a, b) => {
        return new Date(a.sentAt) - new Date(b.sentAt);
      });

      // 获取最新一条消息
      const latestMessage = contactMessages[contactMessages.length - 1];

      // 计算未读消息数量（当前用户是接收者且消息未读）
      const unreadCount = contactMessages.filter(
        (msg) => msg.receiverId === currentUserId && !msg.isRead
      ).length;

      // 添加到聊天消息列表
      chatMessages.push({
        contactId: parseInt(contactId),
        lastMessage: latestMessage.content,
        sentAt: latestMessage.sentAt,
        formattedTime: formatTime(new Date(latestMessage.sentAt)),
        unreadCount,
        // 以下信息需要从用户API获取
        userName: "",
        userAvatar: "",
      });

      // 如果联系人信息不在缓存中，添加到待获取列表
      if (!this.data.contactsMap[contactId]) {
        contactsToFetch.push(contactId);
      } else {
        // 使用缓存中的联系人信息
        const contact = this.data.contactsMap[contactId];
        const index = chatMessages.findIndex(
          (msg) => msg.contactId === parseInt(contactId)
        );
        if (index !== -1) {
          chatMessages[index].userName = contact.nickname;
          chatMessages[index].userAvatar = contact.avatarUrl;
        }
      }
    }

    // 获取联系人信息
    if (contactsToFetch.length > 0) {
      await this.fetchContactsInfo(contactsToFetch, chatMessages);
    }

    // 按最后消息时间排序（最新的在前面）
    chatMessages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    this.setData({ chatMessages });
  },

  /**
   * 获取联系人信息
   */
  async fetchContactsInfo(contactIds, chatMessages) {
    if (!contactIds || contactIds.length === 0) return;

    const contactsMap = { ...this.data.contactsMap };

    // 获取每个联系人的信息
    for (const contactId of contactIds) {
      try {
        const res = await reqUserData(contactId);
        if (res && res.code === 200 && res.data) {
          // 缓存联系人信息
          contactsMap[contactId] = {
            userId: contactId,
            nickname: res.data.nickname || `用户${contactId}`,
            avatarUrl: res.data.avatarUrl
              ? reqImage(res.data.avatarUrl)
              : "/assets/images/default_avatar.jpg",
          };
        } else {
          console.error(
            `获取用户${contactId}信息失败，返回码:`,
            res ? res.code : "unknown"
          );
          // 使用默认信息
          contactsMap[contactId] = {
            userId: contactId,
            nickname: `用户${contactId}`,
            avatarUrl: "/assets/images/default_avatar.jpg",
          };
        }
      } catch (error) {
        console.error(`获取用户${contactId}信息失败`, error);
        // 使用默认信息
        contactsMap[contactId] = {
          userId: contactId,
          nickname: `用户${contactId}`,
          avatarUrl: "/assets/images/default_avatar.jpg",
        };
      }
    }

    // 更新联系人缓存
    this.setData({ contactsMap });

    // 更新聊天消息中的联系人信息
    chatMessages.forEach((msg) => {
      const contact = contactsMap[msg.contactId];
      if (contact) {
        msg.userName = contact.nickname;
        msg.userAvatar = contact.avatarUrl;
      }
    });
  },

  /**
   * 格式化消息时间
   */
  formatMessageTime(dateStr) {
    // 使用项目中已有的formatTime函数，或自定义格式化逻辑
    return formatTime(new Date(dateStr));
  },

  /**
   * 获取点赞消息
   */
  async fetchLikeMessages(showLoading = true) {
    if (!this.data.currentUser || !this.data.currentUser.userId) return;

    if (showLoading) {
      this.setData({ loading: true });
    }

    try {
      // 调用API获取点赞消息
      const res = await getLikeByUser(this.data.currentUser.userId);

      if (res && res.code === 200 && res.data) {
        // 处理点赞消息数据
        const likeMessages = await Promise.all(
          res.data.map(async (like) => {
            // 获取点赞用户信息
            let userInfo = this.data.contactsMap[like.userId];

            if (!userInfo) {
              try {
                const userRes = await reqUserData(like.userId);
                if (userRes && userRes.code === 200) {
                  userInfo = userRes.data;
                  userInfo.avatarUrl = userInfo.avatarUrl
                    ? reqImage(userInfo.avatarUrl)
                    : "/assets/images/default-avatar.png";
                  // 缓存用户信息
                  const contactsMap = { ...this.data.contactsMap };
                  contactsMap[like.userId] = userInfo;
                  this.setData({ contactsMap });
                }
              } catch (error) {
                console.error("获取用户信息失败", error);
              }
            }
            console.log(like);
            // 根据点赞类型确定内容类型
            let contentType = "动态";
            if (like.targetType === 2) contentType = "活动";
            if (like.targetType === 3) contentType = "钓点";
            if (like.targetType === 4) contentType = "回复";

            // 获取被点赞内容的引用信息
            let quotedContent = "";
            let quotedUserName = this.data.currentUser.nickname || "";

            if (like.targetType === 1) {
              const res = await reqPostDetail(like.targetId);
              quotedContent = res.data.content;
            } else if (like.targetType === 2) {
              const res = await reqActivityDetail(like.targetId);
              quotedContent = res.data.title;
            } else if (like.targetType === 3) {
              const res = await reqSpotData(like.targetId);
              quotedContent = res.data.name;
            } else if (like.targetType === 4) {
              const res = await reqReviews(like.targetId, like.targetType);
              quotedContent = res.data.content;
            }

            return {
              id: like.id,
              userId: like.userId,
              userName: userInfo ? userInfo.nickName : "用户",
              userAvatar: userInfo
                ? userInfo.avatarUrl
                : "/assets/images/default-avatar.png",
              targetId: like.targetId,
              contentType,
              quotedContent,
              quotedUserName,
              formattedTime: formatTime(like.createdAt),
              isRead: like.isRead,
            };
          })
        );

        // 按时间排序（最新的在前面）
        likeMessages.sort(
          (a, b) => new Date(b.createAt || 0) - new Date(a.createAt || 0)
        );

        this.setData({
          likeMessages,
          loading: showLoading ? false : this.data.loading,
        });
      }
    } catch (error) {
      console.error("获取点赞消息失败", error);
      // 使用模拟数据作为备用
      const mockLikeMessages = [
        {
          id: 1,
          userId: 101,
          userName: "Jess",
          userAvatar: "/assets/images/avatar1.png",
          targetId: 201,
          contentType: "回复",
          quotedContent: "通透和free2比怎么样？",
          quotedUserName: "白舟舟舟",
          formattedTime: "1天前",
        },
        {
          id: 2,
          userId: 102,
          userName: "幕后猎手",
          userAvatar: "/assets/images/avatar2.png",
          targetId: 202,
          contentType: "回复",
          quotedContent:
            "暗隐差不多呢，但是改了配置仪，没有空间首页附件的约，音质应该也没x3好，但是价格只有一半确实香",
          quotedUserName: "白舟舟舟",
          formattedTime: "3天前",
        },
      ];

      this.setData({
        likeMessages: mockLikeMessages,
        loading: showLoading ? false : this.data.loading,
      });
    }
  },

  /**
   * 获取评论消息
   */
  async fetchreviewMessages(showLoading = true) {
    if (!this.data.currentUser || !this.data.currentUser.userId) return;

    if (showLoading) {
      this.setData({ loading: true });
    }

    try {
      // 调用API获取评论消息
      const res = await getReviewsByUser(this.data.currentUser.userId);

      if (res && res.code === 200 && res.data) {
        // 处理评论消息数据
        const reviewMessages = await Promise.all(
          res.data.map(async (review) => {
            // 获取评论用户信息
            let userInfo = this.data.contactsMap[review.userId];

            if (!userInfo) {
              try {
                const userRes = await reqUserData(review.userId);
                if (userRes && userRes.code === 200) {
                  userInfo = userRes.data;
                  userInfo.avatarUrl = userInfo.avatarUrl
                    ? reqImage(userInfo.avatarUrl)
                    : "/assets/images/default-avatar.png";
                  // 缓存用户信息
                  const contactsMap = { ...this.data.contactsMap };
                  contactsMap[review.userId] = userInfo;
                  this.setData({ contactsMap });
                }
              } catch (error) {
                console.error("获取用户信息失败", error);
              }
            }
            // 根据评论类型确定内容类型
            let contentType = "回复";
            if (review.fromType === 2) contentType = "活动";
            if (review.fromType === 3) contentType = "钓点";
            if (review.fromType === 4) contentType = "回复";

            // 获取被点赞内容的引用信息
            let quotedContent = "";
            let quotedUserName = this.data.currentUser.nickname || "";

            if (review.fromType === 1) {
              const res = await reqPostDetail(review.fromId);
              quotedContent = res.data.content;
            } else if (review.fromType === 2) {
              const res = await reqActivityDetail(review.fromId);
              quotedContent = res.data.title;
            } else if (review.fromType === 3) {
              const res = await reqSpotData(review.fromId);
              quotedContent = res.data.name;
            } else if (review.fromType === 4) {
              const res = await reqReviews(review.fromId, review.fromType);
              quotedContent = res.data.content;
            }

            return {
              id: review.id,
              userId: review.userId,
              userName: userInfo ? userInfo.nickName : "用户",
              userAvatar: userInfo
                ? userInfo.avatarUrl
                : "/assets/images/default-avatar.png",
              targetId: review.fromId,
              content: review.content,
              quotedContent,
              quotedUserName,
              contentType,
              formattedTime: formatTime(review.createdAt),
            };
          })
        );

        // 按时间排序（最新的在前面）
        reviewMessages.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        this.setData({
          reviewMessages,
          loading: showLoading ? false : this.data.loading,
        });
      }
    } catch (error) {
      console.error("获取评论消息失败", error);
      // 使用模拟数据作为备用
      const mockreviewMessages = [
        {
          id: 1,
          userId: 101,
          userName: "Tiamo1013",
          userAvatar: "/assets/images/avatar3.png",
          postId: 201,
          content: "怎么固件啊？",
          quotedContent: "这个手机拍照效果很棒",
          quotedUserName: "白舟舟舟",
          contentType: "回复",
          formattedTime: "4天前",
        },
        {
          id: 2,
          userId: 102,
          userName: "莫死贫道",
          userAvatar: "/assets/images/avatar4.png",
          postId: 202,
          content:
            "旗舰系统，更新慢，天天崩功能，老机型也是埋个个主题，旗舰机一年后成弃机，小米13",
          quotedContent: "[点评]",
          quotedUserName: "白舟舟舟",
          contentType: "点评",
          formattedTime: "10天前",
        },
      ];

      this.setData({
        reviewMessages: mockreviewMessages,
        loading: showLoading ? false : this.data.loading,
      });
    }
  },

  /**
   * 跳转到详情页
   */
  goToDetail(e) {
    const { type, id } = e.currentTarget.dataset;

    // 根据消息类型跳转到不同的详情页
    if (type === "like") {
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${id}`,
      });
    } else if (type === "review") {
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${id}`,
      });
    }
  },

  /**
   * 跳转到用户主页
   */
  goToUserProfile(e) {
    e.stopPropagation(); // 阻止冒泡，防止触发父元素的点击事件
    const { userId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/profile-other/profile-other?userId=${userId}`,
    });
  },

  /**
   * 跳转到聊天页面
   */
  goToChat(e) {
    const { contactId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${contactId}`,
    });

    // 标记该联系人的消息为已读
    this.markContactMessagesAsRead(contactId);
  },

  /**
   * 标记指定联系人的消息为已读
   */
  markContactMessagesAsRead(contactId) {
    const { chatMessages } = this.data;
    const updatedMessages = chatMessages.map((msg) => {
      if (msg.contactId === parseInt(contactId)) {
        return { ...msg, unreadCount: 0 };
      }
      return msg;
    });

    this.setData({
      chatMessages: updatedMessages,
    });

    // TODO: 调用后端API标记消息为已读
    // http.post('/privateMessage/markAsRead', { senderId: contactId, receiverId: this.data.currentUser.userId })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.fetchMessages();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 删除聊天记录
   */
  deleteChat(e) {
    const { contactId } = e.currentTarget.dataset;

    wx.showModal({
      title: "提示",
      content: "确定要删除此聊天吗？",
      success: (res) => {
        if (res.confirm) {
          // 从列表中移除该聊天
          const { chatMessages } = this.data;
          const updatedMessages = chatMessages.filter(
            (msg) => msg.contactId !== parseInt(contactId)
          );

          this.setData({
            chatMessages: updatedMessages,
          });

          // TODO: 调用后端API删除聊天记录
          // http.post('/privateMessage/deleteChat', { senderId: this.data.currentUser.userId, receiverId: contactId })

          wx.showToast({
            title: "删除成功",
            icon: "success",
          });
        }
      },
    });
  },

  /**
   * 开始轮询获取新消息
   */
  startPolling() {
    // 先清除可能存在的定时器
    this.stopPolling();

    // 设置新的定时器
    this.data.pollingTimer = setInterval(() => {
      this.pollNewMessages();
    }, this.data.pollingInterval);
  },

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
      this.data.pollingTimer = null;
    }
  },

  /**
   * 轮询获取新消息
   */
  async pollNewMessages() {
    // 如果页面正在加载或者没有登录用户，不进行轮询
    if (
      this.data.loading ||
      !this.data.currentUser ||
      !this.data.currentUser.userId
    )
      return;

    try {
      // 调用API获取最新消息
      const res = await reqUserMessages(this.data.currentUser.userId);

      if (res && res.code === 200 && res.data) {
        // 处理私信消息
        await this.processChatMessages(res.data);

        // 获取点赞和评论消息
        await this.fetchLikeMessages(false); // 静默更新，不显示加载状态
        await this.fetchreviewMessages(false); // 静默更新，不显示加载状态

        // 检查是否有新消息
        const hasNewMessages = this.checkForNewMessages(res.data);

        // 如果有新消息，播放提示音
        if (hasNewMessages) {
          this.playMessageSound();
        }

        // 更新最后更新时间
        this.setData({ lastUpdateTime: Date.now() });
      } else {
        console.log("轮询获取消息返回:", res ? res.code : "unknown");
      }
    } catch (error) {
      console.error("轮询获取新消息失败", error);
    }
  },

  /**
   * 检查是否有新消息
   */
  checkForNewMessages(messages) {
    if (!messages || messages.length === 0 || !this.data.lastUpdateTime)
      return false;

    // 检查是否有在上次更新后收到的新消息
    const lastUpdateTime = this.data.lastUpdateTime;
    const currentUserId = this.data.currentUser.userId;

    // 查找是否有新的未读消息（当前用户是接收者且消息未读）
    return messages.some((msg) => {
      const messageTime = new Date(msg.sentAt).getTime();
      return (
        msg.receiverId === currentUserId &&
        !msg.isRead &&
        messageTime > lastUpdateTime
      );
    });
  },

  /**
   * 播放消息提示音
   */
  playMessageSound() {
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = "/assets/sounds/message.mp3";
    innerAudioContext.play();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 停止轮询
    this.stopPolling();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 确保停止轮询
    this.stopPolling();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: "渔友圈消息",
      path: "/pages/messages/messages",
    };
  },
});

/**
 * 格式化ISO-8601时间字符串
 * @param {string} dateStr - 形如2025-03-24T13:47:36的ISO-8601格式时间字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(dateStr) {
  // 检查日期字符串是否有效
  if (!dateStr) {
    return "未知时间";
  }

  try {
    const date = new Date(dateStr);

    // 检查日期对象是否有效
    if (isNaN(date.getTime())) {
      return "未知时间";
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    // 格式化数字，确保两位数显示
    const formatNumber = (n) => {
      n = n.toString();
      return n[1] ? n : `0${n}`;
    };

    return `${[year, month, day].map(formatNumber).join("-")} ${[
      hour,
      minute,
      second,
    ]
      .map(formatNumber)
      .join(":")}`;
  } catch (error) {
    console.error("日期格式化错误:", error);
    return "未知时间";
  }
}

// pages/chat/chat.js
import { formatTime } from "../../utils/formatTime";
import { reqUserData } from "../../api/profile";
import { reqMessages, sendMessage, reqRead } from "../../api/message";
import { reqImage } from "../../api/index";
const app = getApp();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息
    currentUser: null,
    targetUser: null,

    // 消息相关
    messages: [],
    inputMessage: "",
    scrollToMessage: "",
    loading: false,
    page: 1,
    hasMore: true,

    // 输入相关
    showEmojiPanel: false,
    showMorePanel: false,
    recordingStatus: "idle", // idle, recording, cancel

    // 轮询相关
    pollingTimer: null,
    pollingInterval: 3000, // 轮询间隔，单位毫秒
    lastMessageTime: null, // 最后一条消息的时间戳

    // 表情列表
    emojiList: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
      "🤗",
      "🤔",
      "🤭",
      "🤫",
      "🤥",
      "😶",
      "😐",
      "😑",
      "😬",
      "🙄",
      "😯",
      "😦",
      "😧",
      "😮",
      "😲",
      "🥱",
      "😴",
      "🤤",
      "😪",
      "😵",
      "🤐",
      "🥴",
      "🤢",
      "🤮",
      "🤧",
      "😷",
      "🤒",
      "🤕",
      "🤑",
      "🤠",
      "😈",
      "👿",
      "👹",
      "👺",
      "🤡",
      "💩",
      "👻",
      "💀",
      "☠️",
      "👽",
      "👾",
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { targetUserId } = options;

    // 获取当前用户信息
    const currentUser = app.globalData.user;

    // 检查用户是否已登录
    if (!currentUser) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    currentUser.avatar = currentUser.avatarUrl
      ? reqImage(currentUser.avatarUrl)
      : "/assets/images/default_avatar.jpg";
    // 设置初始数据
    this.setData({
      currentUser,
      targetUser: {
        userId: targetUserId,
      },
    });
    // 获取目标用户详细信息
    this.fetchTargetUserInfo(targetUserId);

    // 获取聊天记录
    this.fetchMessages();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 标记消息为已读
    this.markMessagesAsRead();

    // 开始轮询获取新消息
    this.startPolling();
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
   * 获取目标用户信息
   */
  async fetchTargetUserInfo(targetUserId) {
    try {
      this.setData({ loading: true });
      const res = await reqUserData(targetUserId);
      res.data.avatar = res.data.avatarUrl
        ? reqImage(res.data.avatarUrl)
        : "/assets/images/default_avatar.jpg";
      this.setData({ targetUser: res.data, loading: false });
    } catch (error) {
      console.log(error);
    }
  },

  /**
   * 获取聊天记录
   */
  async fetchMessages(isLoadMore = false) {
    if (this.data.isLoading || (!isLoadMore && !this.data.hasMore)) {
      return;
    }

    this.setData({ isLoading: true });

    const res = await reqMessages(
      this.data.currentUser.userId,
      this.data.targetUser.userId
    );

    const newMessages = res.data || [];

    // 处理消息时间显示
    const processedMessages = this.processMessages(newMessages);

    if (isLoadMore) {
      // 加载更多消息
      this.setData({
        messages: [...processedMessages, ...this.data.messages],
        page: this.data.page + 1,
        hasMore: newMessages.length === 20,
      });
    } else {
      // 初次加载消息
      this.setData({
        messages: processedMessages,
        page: 2,
        hasMore: newMessages.length === 20,
      });

      // 更新最后一条消息的时间戳，用于轮询时获取新消息
      if (processedMessages.length > 0) {
        const lastMessage = processedMessages[processedMessages.length - 1];
        this.setData({
          lastMessageTime: new Date(lastMessage.sentAt).getTime(),
        });
      }

      // 滚动到最新消息
      this.scrollToBottom();
    }
    this.setData({ isLoading: false });
  },

  /**
   * 处理消息，添加时间显示
   */
  processMessages(messages) {
    if (!messages || messages.length === 0) {
      return [];
    }

    let lastTimestamp = 0;

    return messages.map((msg, index) => {
      const currentTime = new Date(msg.sentAt).getTime();

      // 判断是否显示时间头部
      // 第一条消息或者与上一条消息间隔超过5分钟
      const showTimeHeader =
        index === 0 || currentTime - lastTimestamp > 5 * 60 * 1000;

      lastTimestamp = currentTime;

      return {
        ...msg,
        showTimeHeader,
        timeHeader: showTimeHeader
          ? formatTime(new Date(currentTime), "MM-DD HH:mm")
          : "",
      };
    });
  },

  /**
   * 标记消息为已读
   */
  async markMessagesAsRead() {
    await reqRead(this.data.targetUser.userId, this.data.currentUser.userId);
  },

  /**
   * 接收新消息
   */
  receiveMessage(messageData) {
    // 如果是自己发送的消息，不处理
    if (messageData.senderId === this.data.currentUser.userId) {
      return;
    }

    // 处理消息时间显示
    const messages = this.data.messages;
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const currentTime = new Date(messageData.timestamp).getTime();
    const lastTime = lastMsg ? new Date(lastMsg.timestamp).getTime() : 0;

    // 判断是否显示时间头部
    const showTimeHeader = !lastMsg || currentTime - lastTime > 5 * 60 * 1000;

    const newMessage = {
      ...messageData,
      showTimeHeader,
      timeHeader: showTimeHeader
        ? formatTime(new Date(currentTime), "MM-DD HH:mm")
        : "",
    };

    // 添加新消息
    this.setData({
      messages: [...this.data.messages, newMessage],
      scrollToMessage: `msg-${newMessage.id}`,
    });

    // 播放提示音
    // this.playMessageSound()
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
   * 更新消息状态
   */
  updateMessageStatus(messageIds, status) {
    const messages = this.data.messages.map((msg) => {
      if (messageIds.includes(msg.id)) {
        return { ...msg, status };
      }
      return msg;
    });

    this.setData({ messages });
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollToMessage: "message-bottom",
      });
    }, 200);
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value,
    });
  },

  /**
   * 输入框获取焦点
   */
  onInputFocus() {
    this.setData({
      showEmojiPanel: false,
      showMorePanel: false,
    });
  },

  /**
   * 切换表情面板
   */
  toggleEmojiPanel() {
    this.setData({
      showEmojiPanel: !this.data.showEmojiPanel,
      showMorePanel: false,
      isVoiceMode: false,
    });
  },

  /**
   * 切换更多功能面板
   */
  toggleMorePanel() {
    this.setData({
      showMorePanel: !this.data.showMorePanel,
      showEmojiPanel: false,
      isVoiceMode: false,
    });
  },

  /**
   * 选择表情
   */
  selectEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({
      inputMessage: this.data.inputMessage + emoji,
    });
  },

  /**
   * 发送文本消息
   */
  async sendTextMessage() {
    const content = this.data.inputMessage.trim();
    if (!content) return;

    // 生成临时消息ID
    const tempId = `temp_${Date.now()}`;

    // 创建消息对象
    const message = {
      messageId: tempId,
      content,
      senderId: this.data.currentUser.userId,
      receiverId: this.data.targetUser.userId,
      timestamp: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      status: "sending",
      showTimeHeader: this.shouldShowTimeHeader(),
      timeHeader: this.shouldShowTimeHeader()
        ? formatTime(new Date(), "MM-DD HH:mm")
        : "",
    };

    // 添加到消息列表
    this.setData({
      messages: [...this.data.messages, message],
      inputMessage: "",
      scrollToMessage: `msg-${tempId}`,
      lastMessageTime: new Date().getTime(), // 更新最后一条消息的时间戳
    });

    // 发送消息到服务器
    try {
      const { sendMessage } = require("../../api/message");
      const messageData = {
        content,
        senderId: this.data.currentUser.userId,
        receiverId: this.data.targetUser.userId,
      };

      const res = await sendMessage(messageData);

      if (res && res.code === 0) {
        // 发送成功，更新消息状态
        this.updateTempMessage(tempId, {
          id: res.data.id || tempId, // 使用服务器返回的ID
          status: "sent",
          sentAt: res.data.sentAt || message.sentAt,
        });
      } else {
        // 发送失败
        this.updateTempMessage(tempId, { status: "failed" });
      }
    } catch (error) {
      console.error("发送消息失败", error);
      // 发送失败，更新消息状态
      this.updateTempMessage(tempId, { status: "failed" });
    }
  },

  /**
   * 判断是否应该显示时间头部
   */
  shouldShowTimeHeader() {
    const messages = this.data.messages;
    if (messages.length === 0) return true;

    const lastMsg = messages[messages.length - 1];
    const lastTime = new Date(lastMsg.timestamp).getTime();
    const currentTime = Date.now();

    // 与上一条消息间隔超过5分钟显示时间
    return currentTime - lastTime > 5 * 60 * 1000;
  },

  /**
   * 更新临时消息
   */
  updateTempMessage(tempId, updates) {
    const messages = this.data.messages.map((msg) => {
      if (msg.messageId === tempId) {
        return { ...msg, ...updates };
      }
      return msg;
    });

    this.setData({ messages });
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
      this.markMessagesAsRead();
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
    // 如果没有最后消息时间戳，不进行轮询
    if (!this.data.lastMessageTime) return;

    try {
      // 调用API获取最新消息
      const res = await reqMessages(
        this.data.currentUser.userId,
        this.data.targetUser.userId
      );

      if (!res.data || res.data.length === 0) return;

      // 筛选出新消息（时间戳大于最后一条消息的时间戳）
      const newMessages = res.data.filter((msg) => {
        const msgTime = new Date(msg.sentAt).getTime();
        return msgTime > this.data.lastMessageTime;
      });

      if (newMessages.length > 0) {
        // 处理新消息
        const processedNewMessages = this.processMessages(newMessages);

        // 更新消息列表和最后消息时间戳
        const lastMessage =
          processedNewMessages[processedNewMessages.length - 1];
        const lastMessageTime = new Date(lastMessage.sentAt).getTime();

        this.setData({
          messages: [...this.data.messages, ...processedNewMessages],
          lastMessageTime,
        });

        // 滚动到最新消息
        this.scrollToBottom();

        // 播放提示音
        // this.playMessageSound()
      }
    } catch (error) {
      console.error("轮询获取新消息失败", error);
    }
  },
});

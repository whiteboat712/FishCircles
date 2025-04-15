/**
 * 显示一个Toast提示框。
 * @param {Object} options - Toast提示框的配置选项。
 * @param {string} [options.title='加载中...'] - 提示的内容。
 * @param {string} [options.icon='none'] - 图标类型，默认为'none'表示无图标。
 * @param {number} [options.duration=2000] - 提示显示的时长，单位为毫秒，默认为2000毫秒。
 * @param {boolean} [options.mask=true] - 是否显示透明蒙层，防止触摸穿透，默认为true。
 */
const toast = ({
  title = "数据加载中...",
  icon = "none",
  duration = 2000,
  mask = true,
} = {}) => {
  wx.showToast({
    title,
    icon,
    duration,
    mask,
  });
};

/**
 * 显示一个模态对话框，并返回一个Promise对象，根据用户的选择（确认或取消）来解析为true或false。
 * @param {Object} options - 模态对话框的配置选项。
 * @param {string} [options.title='提示'] - 对话框的标题。
 * @param {string} [options.content='您确定执行该操作吗？'] - 对话框的内容。
 * @param {string} [options.confirmColor='#1296db'] - 确认按钮的颜色。
 * @returns {Promise<boolean>} - 如果用户点击确认，返回Promise解析为true；如果用户点击取消，返回Promise解析为false。
 */
const modal = (options = {}) => {
  return new Promise((resolve) => {
    const defaultOpt = {
      title: "提示",
      content: "您确定执行该操作吗？",
      confirmColor: "#1296db",
    };

    const opts = Object.assign({}, defaultOpt, options);

    wx.showModal({
      ...opts,
      complete({ confirm, cancel }) {
        confirm && resolve(true);
        cancel && resolve(false);
      },
    });
  });
};

export { toast, modal };

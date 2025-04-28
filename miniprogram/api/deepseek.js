import http from "../utils/http";

/**
 * 调用DeepSeek AI的文本对话API
 * @param {string} content - 用户输入的文本内容
 * @returns {Promise} - 返回API响应的Promise对象
 */
export const getDeepSeekResponse = (content) => {
  // API密钥
  const apiKey = 'sk-xegpmpbmfiuhcygrltnvfvovpjaeqfovjnpfdhmqaclncobn';
  
  // 请求参数
  const requestData = {
    model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    stream: false,
    max_tokens: 512,
    temperature: 0.7,
    top_p: 0.7,
    top_k: 50,
    frequency_penalty: 0.5,
    n: 1,
    stop: [],
    messages: [
      {
        role: "user",
        content: content
      }
    ]
  };

  // 自定义请求选项
  const customConfig = {
    baseURL: "", // 使用完整URL覆盖baseURL
    header: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  // 发送请求到DeepSeek API
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://api.siliconflow.cn/v1/chat/completions',
      method: 'POST',
      data: requestData,
      header: customConfig.header,
      success: (res) => {
        if (res.statusCode === 200) {
          // 提取AI助手的回复内容并去除开头的两个回车
          const assistantMessage = res.data.choices[0].message.content;
          const processedMessage = assistantMessage.replace(/^\n\n/, '');
          resolve(processedMessage);
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};
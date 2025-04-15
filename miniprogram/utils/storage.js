/**
 * 设置本地存储的数据
 * @param {string} key - 存储数据的键名
 * @param {*} value - 需要存储的数据值
 * @description 该函数尝试将指定的键值对存储到本地存储中，如果发生错误，则在控制台输出错误信息。
 */
const setStorage = (key, value) => {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    console.error(`存储指定${key}数据发生了异常`, error);
  }
};

/**
 * 获取本地存储中的数据
 * @param {string} key - 要获取的数据的键名
 * @returns {any} 返回对应键名的值，如果不存在则返回 undefined
 * @throws {Error} 如果读取过程中发生错误，会在控制台输出错误信息
 */
const getStorage = (key) => {
  try {
    const value = wx.getStorageSync(key);

    if (value) {
      return value;
    }
  } catch (error) {
    console.error(`读取指定${key}数据发生了异常`, error);
  }
};

/**
 * 移除本地存储中的指定键值对数据。
 * @param {string} key - 要移除的数据的键名。
 * @throws {Error} 如果移除数据过程中发生错误，将抛出异常并在控制台打印错误信息。
 */
const removeStorage = (key) => {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    console.error(`移除指定${key}数据发生了异常`, error);
  }
};

/**
 * 清空本地存储中的所有数据。
 * 使用 wx.clearStorageSync 方法同步清空存储空间，
 * 并在发生异常时记录错误信息。
 *
 * @returns {void}
 */
const clearStorage = () => {
  try {
    wx.clearStorageSync();
  } catch (error) {
    console.error(`清空数据发生了异常`, error);
  }
};

/**
 * 异步设置存储数据的函数
 * @param {string} key - 要存储的数据的键
 * @param {*} data - 要存储的数据
 * @returns {Promise<Object>} 返回一个 Promise 对象，该对象在存储操作完成时解析为存储结果
 *
 * 此函数使用 wx.setStorage 方法将数据异步存储到本地，并通过 Promise 封装其回调，
 * 以便能够更方便地在基于 Promise 的异步流程中使用。
 */
const asyncSetStorage = (key, data) => {
  return new Promise((resolve) => {
    wx.setStorage({
      key,
      data,
      complete(res) {
        resolve(res);
      },
    });
  });
};

/**
 * 异步获取存储数据的函数
 * @param {string} key - 要获取的数据的键名
 * @returns {Promise<Object>} 返回一个 Promise 对象，解析后得到存储的数据结果
 *
 * 该函数通过 wx.getStorage 方法异步获取指定键名的存储数据，并返回一个 Promise，
 * 以便在调用处可以使用 async/await 或 .then() 方式处理获取到的数据。
 */
const asyncGetStorage = (key) => {
  return new Promise((resolve) => {
    wx.getStorage({
      key,
      complete(res) {
        resolve(res);
      },
    });
  });
};

/**
 * 异步移除本地存储中的指定键值对。
 * @param {string} key - 要移除的存储键。
 * @returns {Promise<Object>} 移除操作完成后的结果对象。
 *
 * 该函数返回一个 Promise 对象，当移除操作完成时，Promise 将被解析为操作结果。
 * 使用 wx.removeStorage 方法执行实际的移除操作，并在操作完成时通过 Promise 的 resolve 方法返回结果。
 */
const asyncRemoveStorage = (key) => {
  return new Promise((resolve) => {
    wx.removeStorage({
      key,
      complete(res) {
        resolve(res);
      },
    });
  });
};

/**
 * 异步清除微信小程序本地存储数据
 * @returns {Promise} 返回一个 Promise 对象，在清除操作完成时 resolve 相应结果
 *
 * 该函数通过调用微信小程序的 wx.clearStorage 方法来清除所有本地存储的数据，
 * 并返回一个 Promise 对象以便于在异步操作完成后进行处理。
 */
const asyncClearStorage = () => {
  return new Promise((resolve) => {
    wx.clearStorage({
      complete(res) {
        resolve(res);
      },
    });
  });
};

export {
  setStorage,
  getStorage,
  removeStorage,
  clearStorage,
  asyncSetStorage,
  asyncGetStorage,
  asyncRemoveStorage,
  asyncClearStorage,
};

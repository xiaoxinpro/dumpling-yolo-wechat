// index.js
Page({
  data: {
    tempFilePath: '',
    result: '',
    loading: false
  },
  chooseImage: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          tempFilePath: res.tempFiles[0].tempFilePath
        },);
        that.detectDumplings(); // 直接调用检测接口
      }
    });
  },
  detectDumplings: function () {
    const that = this;
    that.setData({ result: '', loading: true });
    wx.showLoading({
      title: '正在检测中...',
      mask: true // 防止用户点击其他地方
    });
    wx.uploadFile({
      url: getApp().globalData.config.apiUrl + '/detect/json', // 替换为你的API地址
      filePath: that.data.tempFilePath,
      name: 'image',
      formData: {},
      success: function (res) {
        const data = JSON.parse(res.data);
        console.log(data);
        that.setData({
          result: data.length
        });
      },
      fail: function (err) {
        console.error(err);
        that.setData({
          result: '检测失败，请重试'
        });
      },
      complete: function () {
        wx.hideLoading();
        that.setData({ loading: false });
      }
    });
  }
});
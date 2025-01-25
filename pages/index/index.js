// index.js
Page({
  data: {
    tempFilePath: '',
    result: '',
    error: '',
    version: '',
    loading: false
  },
  onLoad() {
    const accountInfo = wx.getAccountInfoSync();
    const appVersion = accountInfo.miniProgram.version;
    const envVersion = accountInfo.miniProgram.envVersion;
    this.setData({
      version: appVersion ? appVersion : envVersion
    });
  },
  chooseImage: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.detectDumplings(res.tempFiles[0].tempFilePath);
      }
    });
  },
  detectDumplings: function (imageFilePath) {
    const that = this;
    that.setData({ result: '', loading: true });
    wx.showLoading({
      title: '正在检测中...',
      mask: true // 防止用户点击其他地方
    });
    wx.uploadFile({
      url: getApp().globalData.config.apiUrl + '/detect/json', // 替换为你的API地址
      filePath: imageFilePath,
      name: 'image',
      formData: {},
      success: function (res) {
        const data = JSON.parse(res.data);
        console.log(data);
        that.setData({
          tempFilePath: data.length >= 5 ? imageFilePath : '',
          error: data.length > 0 ? '' : '图片中未检测到饺子',
          result: data.length
        });
      },
      fail: function (err) {
        console.error(err);
        that.setData({
          error: '检测失败，请重试',
          result: ''
        });
      },
      complete: function () {
        wx.hideLoading();
        that.setData({ loading: false });
      }
    });
  }
});
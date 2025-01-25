// index.js
Page({
  data: {
    tempFilePath: '',
    result: '',
    error: '',
    version: '',
    loading: false,
    boxes: []
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
    that.setData({ result: '', loading: true, boxes: [] }); // 清空之前的信息
    wx.showLoading({
      title: '正在检测中...',
      mask: true // 防止用户点击其他地方
    });
    wx.uploadFile({
      url: getApp().globalData.config.apiUrl + '/detect/json',
      filePath: imageFilePath,
      name: 'image',
      formData: {},
      success: function (res) {
        const data = JSON.parse(res.data);
        console.log(data);
        that.setData({
          tempFilePath: data.length >= 5 ? imageFilePath : '',
          error: data.length > 0 ? '' : '图片中未检测到饺子',
          result: data.length,
          boxes: data
        }, () => {
          // 获取图片的实际宽度和高度
          wx.getImageInfo({
            src: imageFilePath,
            success: function (imageInfo) {
              that.drawBoxes(imageInfo.width, imageInfo.height);
            },
            fail: function (err) {
              console.error('获取图片信息失败', err);
            }
          });
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
  },
  drawBoxes: function (imageWidth, imageHeight) {
    const that = this;
    const query = wx.createSelectorQuery();
    query.select('.image-container').boundingClientRect(rect => {
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // 使用 wx.createCanvasContext 创建绘图上下文
      const ctx = wx.createCanvasContext('resultCanvas');

      // 清空画布
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      that.data.boxes.forEach(box => {
        // 根据图片实际尺寸和容器尺寸计算缩放比例
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;

        const x1 = box.box.x1 * scaleX;
        const y1 = box.box.y1 * scaleY;
        const x2 = box.box.x2 * scaleX;
        const y2 = box.box.y2 * scaleY;

        // 绘制绿色框
        ctx.setStrokeStyle('#00ff00');
        ctx.setLineWidth(2);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // 显示 confidence 数值
        ctx.setFillStyle('#00ff00');
        ctx.setFontSize(10);
        ctx.fillText(`${box.confidence.toFixed(2)}`, x1 + 5, y1 + 10);
      });

      // 绘制到画布
      ctx.draw();
    }).exec();
  }
});
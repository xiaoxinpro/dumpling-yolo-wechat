// index.js
Page({
  data: {
    tempFilePath: '',
    result: '',
    error: '',
    version: '',
    loading: false,
    showCanvas: false,
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
          that.drawBoxes(); // 绘制边框
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
  drawBoxes: function () {
    const that = this;
    const resultBoxs = that.data.boxes;
    const imageFilePath = that.data.tempFilePath;
    if (!resultBoxs || resultBoxs.length < 1) {
      console.warn('No boxs data');
      return;
    }
    if (!imageFilePath) {
      console.warn('No image file path found');
      return;
    }

    wx.getImageInfo({
      src: imageFilePath,
      success: function (imageInfo) {
        const imageWidth = imageInfo.width;
        const imageHeight = imageInfo.height;

        const query = wx.createSelectorQuery();
        query.select('.image-container').boundingClientRect(async rect => {
          const containerWidth = rect.width;
          const containerHeight = rect.height;

          const canvasQuery = wx.createSelectorQuery();
          canvasQuery.select('#resultCanvas')
            .fields({ node: true, size: true })
            .exec(async res => {
              if (!res[0] || !res[0].node) {
                console.warn('Canvas is hidden or not found');
                return;
              }

              const canvas = res[0].node;
              const ctx = canvas.getContext('2d');

              canvas.width = containerWidth;
              canvas.height = containerHeight;

              const scaleX = containerWidth / imageWidth;
              const scaleY = containerHeight / imageHeight;
              const scale = Math.min(scaleX, scaleY);
              const offsetX = (scale == scaleY) ? (containerWidth - imageWidth * scale) / 2 : 0;
              const offsetY = (scale == scaleX) ? (containerHeight - imageHeight * scale) / 2 : 0;

              ctx.clearRect(0, 0, containerWidth, containerHeight);

              that.data.boxes.forEach(box => {
                const x1 = offsetX + box.box.x1 * scale;
                const y1 = offsetY + box.box.y1 * scale;
                const x2 = offsetX + box.box.x2 * scale;
                const y2 = offsetY + box.box.y2 * scale;

                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                ctx.fillStyle = '#00ff00';
                ctx.font = '10px sans-serif';
                ctx.fillText(`${box.confidence.toFixed(2)}`, x1 + 2, y1 + 10);
              });
            });
        }).exec();
      },
      fail: function (err) {
        console.error('获取图片信息失败', err);
      }
    });
  },
  toggleCanvas: function () {
    const that = this;
    this.setData({
      showCanvas: !this.data.showCanvas
    }, () => {
      if (this.data.showCanvas) {
        that.drawBoxes(); // 重新绘制边框
      }
    });
  }
});
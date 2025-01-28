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
    query.select('.image-container').boundingClientRect(async rect => {
      const containerWidth = rect.width;
      const containerHeight = rect.height;
  
      // 使用 wx.createSelectorQuery 获取 canvas 节点
      const canvasQuery = wx.createSelectorQuery();
      canvasQuery.select('#resultCanvas')
        .fields({ node: true, size: true })
        .exec(async res => {
          // 检查 canvas 是否存在
          if (!res[0] || !res[0].node) {
            console.warn('Canvas is hidden or not found');
            return;
          }
  
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
  
          // 设置 canvas 的宽高
          canvas.width = containerWidth;
          canvas.height = containerHeight;

          // 根据图片实际尺寸和容器尺寸计算缩放比例与偏移量
          const scaleX = containerWidth / imageWidth;
          const scaleY = containerHeight / imageHeight;
          const scale  = Math.min(scaleX, scaleY);
          const offsetX = (scale == scaleY) ? (containerWidth - imageWidth * scale)/2 : 0;
          const offsetY = (scale == scaleX) ? (containerHeight - imageHeight * scale)/2 : 0;

          // 清空画布
          ctx.clearRect(0, 0, containerWidth, containerHeight);
  
          that.data.boxes.forEach(box => {
            // 计算边框坐标
            const x1 = offsetX + box.box.x1 * scale;
            const y1 = offsetY + box.box.y1 * scale;
            const x2 = offsetX + box.box.x2 * scale;
            const y2 = offsetY + box.box.y2 * scale;
  
            // 绘制绿色框
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  
            // 显示 confidence 数值
            ctx.fillStyle = '#00ff00';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${box.confidence.toFixed(2)}`, x1 + 2, y1 + 10);
          });
        });
    }).exec();
  },
  toggleCanvas: function () {
    // 切换 canvas 的显示/隐藏状态
    this.setData({
      showCanvas: !this.data.showCanvas
    });
  }
});
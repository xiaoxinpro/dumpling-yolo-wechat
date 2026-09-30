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
    const requestId = (this._detectionRequestId || 0) + 1;
    this._detectionRequestId = requestId;

    const previousUploadTask = this._uploadTask;
    if (previousUploadTask && typeof previousUploadTask.abort === 'function') {
      previousUploadTask.abort();
    }
    this._uploadTask = null;

    const config = getApp().globalData.config;
    if (!config || typeof config.apiUrl !== 'string' || !config.apiUrl.trim()) {
      if (previousUploadTask) {
        wx.hideLoading();
      }
      this.setDetectionError('检测服务配置无效，请联系管理员', requestId);
      return;
    }

    that.setData({
      tempFilePath: '',
      result: '',
      error: '',
      loading: true,
      showCanvas: false,
      boxes: []
    });
    wx.showLoading({
      title: '正在检测中...',
      mask: true // 防止用户点击其他地方
    });
    this._uploadTask = wx.uploadFile({
      url: config.apiUrl.trim().replace(/\/+$/, '') + '/detect/json',
      filePath: imageFilePath,
      name: 'image',
      formData: {},
      success: function (res) {
        if (requestId !== that._detectionRequestId) {
          return;
        }

        if (!Number.isInteger(res.statusCode)) {
          that.setDetectionError('检测服务返回数据异常，请重试', requestId);
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          that.setDetectionError(`检测服务异常（${res.statusCode}）`, requestId);
          return;
        }

        let data;
        try {
          data = JSON.parse(res.data);
        } catch (error) {
          console.error('检测结果解析失败', error);
          that.setDetectionError('检测服务返回数据异常，请重试', requestId);
          return;
        }

        if (!that.isValidDetectionResults(data)) {
          console.error('检测结果格式无效', data);
          that.setDetectionError('检测服务返回数据异常，请重试', requestId);
          return;
        }

        console.log(data);
        that.setData({
          tempFilePath: data.length >= 5 ? imageFilePath : '',
          error: data.length > 0 ? '' : '图片中未检测到饺子',
          result: data.length,
          boxes: data,
          showCanvas: false
        });
      },
      fail: function (err) {
        if (requestId !== that._detectionRequestId) {
          return;
        }
        console.error(err);
        that.setDetectionError('检测失败，请重试', requestId);
      },
      complete: function () {
        if (requestId !== that._detectionRequestId) {
          return;
        }
        wx.hideLoading();
        that._uploadTask = null;
        that.setData({ loading: false });
      }
    });
  },
  isValidDetectionResults: function (data) {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(item => {
      if (!item || !item.box || typeof item.confidence !== 'number' || !Number.isFinite(item.confidence)) {
        return false;
      }

      const { x1, y1, x2, y2 } = item.box;
      return [x1, y1, x2, y2].every(value => typeof value === 'number' && Number.isFinite(value))
        && x2 >= x1
        && y2 >= y1;
    });
  },
  setDetectionError: function (message, requestId) {
    if (requestId !== this._detectionRequestId) {
      return;
    }

    this.setData({
      tempFilePath: '',
      result: '',
      error: message,
      loading: false,
      showCanvas: false,
      boxes: []
    });
  },
  drawBoxes: function (imageFilePath, boxes, requestId) {
    const that = this;
    const resultBoxes = boxes || that.data.boxes;
    const targetImagePath = imageFilePath || that.data.tempFilePath;
    const targetRequestId = requestId || that._detectionRequestId;
    const isStale = () => targetRequestId !== that._detectionRequestId
      || targetImagePath !== that.data.tempFilePath
      || !that.data.showCanvas;

    if (!resultBoxes || resultBoxes.length < 1) {
      console.warn('No boxes data');
      return;
    }
    if (!targetImagePath) {
      console.warn('No image file path found');
      return;
    }

    wx.getImageInfo({
      src: targetImagePath,
      success: function (imageInfo) {
        if (isStale()) {
          return;
        }

        const imageWidth = imageInfo.width;
        const imageHeight = imageInfo.height;

        const query = wx.createSelectorQuery();
        query.select('.image-container').boundingClientRect(rect => {
          if (isStale() || !rect) {
            return;
          }

          const containerWidth = rect.width;
          const containerHeight = rect.height;

          const canvasQuery = wx.createSelectorQuery();
          canvasQuery.select('#resultCanvas')
            .fields({ node: true, size: true })
            .exec(res => {
              if (isStale()) {
                return;
              }

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

              resultBoxes.forEach(box => {
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
        const imageFilePath = that.data.tempFilePath;
        const boxes = that.data.boxes.slice();
        const requestId = that._detectionRequestId;
        that.drawBoxes(imageFilePath, boxes, requestId);
      }
    });
  }
});
